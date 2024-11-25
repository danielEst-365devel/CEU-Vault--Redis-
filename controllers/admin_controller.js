const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { db } = require('../models/connection_db');
require('dotenv').config();
const adminActions = require('./admin_actions');
const JWT_SECRET = process.env.JWT_SECRET;

// Update the transporter configuration
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  // Add additional configuration
  pool: true, // Use pooled connections
  maxConnections: 5,
  maxMessages: 100,
  socketTimeout: 30000, // 30 seconds
  logger: true,
  debug: process.env.NODE_ENV === 'development'
});

// Enhanced email sending function with retries and better error handling
const sendEmailWithRetry = async (recipientEmail, emailType, link, registrationDetails = null, maxRetries = 3) => {
  let attempts = 0;

  while (attempts < maxRetries) {
    try {
      const template = emailTemplates[emailType](link, registrationDetails);

      if (attempts > 0) {
        await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
      }

      const info = await transporter.sendMail({
        from: `"${process.env.EMAIL_NAME}" <${process.env.EMAIL_USER}>`,
        to: recipientEmail,
        subject: template.subject,
        html: template.html,
        priority: 'high',
        headers: {
          'x-attempt': attempts + 1
        }
      });

      console.log('Email sent successfully:', info.messageId);
      return info;

    } catch (error) {
      attempts++;
      console.error(`Email sending attempt ${attempts} failed:`, error);

      if (attempts === maxRetries) {
        throw new Error(`Failed to send email after ${maxRetries} attempts: ${error.message}`);
      }

      if (error.code === 'EAUTH' || error.code === 'ESCHEDULED') {
        throw error;
      }
    }
  }
};

// Verify transporter connection on startup
transporter.verify(function (error, success) {
  if (error) {
    console.error('SMTP connection error:', error);
  } else {
    console.log('SMTP server is ready to send messages');
  }
});

// Email templates
const emailTemplates = {
  approvalRequest: (approvalLink, registrationDetails) => ({
    subject: 'New Admin Account Approval Request',
    html: `
      <div style="font-family: Arial, sans-serif; text-align: center; padding: 20px; border: 1px solid #ddd; border-radius: 10px; max-width: 600px; margin: auto; background-color: #f9f9f9;">
        <h1 style="color: #4CAF50; margin-bottom: 20px;">CEU Vault - New Admin Registration</h1>
        
        <div style="background-color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; text-align: left;">
          <h2 style="color: #333; font-size: 18px; margin-bottom: 15px;">Registration Details:</h2>
          <p style="margin: 8px 0;"><strong>Name:</strong> ${registrationDetails.name}</p>
          <p style="margin: 8px 0;"><strong>Email:</strong> ${registrationDetails.email}</p>
          <p style="margin: 8px 0;"><strong>Registration Time:</strong> ${new Date().toLocaleString()}</p>
        </div>

        <p style="font-size: 16px; color: #555; margin-bottom: 20px;">Please review the registration details and click the button below to approve or deny the admin account creation:</p>
        
        <a href="${approvalLink}" style="display: inline-block; padding: 12px 24px; font-size: 16px; color: #fff; background-color: #4CAF50; border-radius: 5px; text-decoration: none; margin-bottom: 20px;">Review & Approve</a>
        
        <p style="font-size: 14px; color: #666; margin-bottom: 10px;">This approval link will expire in 24 hours.</p>
        <p style="font-size: 14px; color: #666;">Please verify the requester's identity before approval.</p>
      </div>
    `
  }),
  confirmationRequest: (confirmationLink) => ({
    subject: 'Confirm Your Admin Account',
    html: `
      <div style="font-family: Arial, sans-serif; text-align: center; padding: 20px; border: 1px solid #ddd; border-radius: 10px; max-width: 600px; margin: auto; background-color: #f9f9f9;">
        <h1 style="color: #4CAF50; margin-bottom: 20px;">CEU Vault</h1>
        <p style="font-size: 18px; color: #333; margin-bottom: 10px;">Your admin account has been approved!</p>
        <p style="font-size: 16px; color: #555; margin-bottom: 20px;">Please click the button below to complete your registration:</p>
        <a href="${confirmationLink}" style="display: inline-block; padding: 10px 20px; font-size: 16px; color: #fff; background-color: #4CAF50; border-radius: 5px; text-decoration: none;">Confirm Account</a>
        <p style="font-size: 14px; color: #999; margin-top: 20px;">Note: This link will expire in 24 hours.</p>
      </div>
    `
  })
};

// Update the createAdmin function to use the new email sending function
const createAdmin = async (req, res) => {
  const { email, name, password } = req.body;

  try {
    if (!JWT_SECRET) {
      console.error('JWT_SECRET not configured');
      return res.status(500).send('Server configuration error');
    }

    const approvalToken = jwt.sign(
      { email, name, password },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    const baseUrl = process.env.FRONTEND_URL || 'https://ceu-vault.vercel.app';
    const approvalLink = `${baseUrl}/admin/approve-admin?token=${approvalToken}`;

    console.log('Generated approval link:', approvalLink);
    const itAdminEmail = process.env.IT_ADMIN;

    const registrationDetails = {
      name,
      email
    };

    await sendEmailWithRetry(
      itAdminEmail,
      'approvalRequest',
      approvalLink,
      registrationDetails
    );

    res.status(200).json({
      message: 'Sign up request sent to IT Administrator. Approval may take up to 24 hours. Please wait for confirmation in your email.'
    });

  } catch (error) {
    console.error('Full error details:', error);

    // Send more specific error messages
    if (error.code === 'EAUTH') {
      res.status(500).json({
        message: 'Email authentication failed. Please check email configuration.'
      });
    } else {
      res.status(500).json({
        message: 'Failed to create admin account.'
      });
    }
  }
};

const approveAdmin = async (req, res) => {
  try {
    console.log('Full request URL:', req.url);
    console.log('Query parameters:', req.query);

    // Extract token from query params
    const token = req.query.token;

    if (!token) {
      console.error('Missing token in request:', {
        originalUrl: req.originalUrl,
        path: req.path,
        query: req.query,
        headers: req.headers
      });

      return res.status(400).send(`
        <html>
          <head>
            <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&display=swap" rel="stylesheet">
            <style>
              * { margin: 0; padding: 0; box-sizing: border-box; }
              body {
                font-family: 'Montserrat', sans-serif;
                background-color: #f5f5f5;
                display: flex;
                justify-content: center;
                align-items: center;
                min-height: 100vh;
                padding: 20px;
              }
              .container {
                background-color: white;
                padding: 40px;
                border-radius: 12px;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                max-width: 600px;
                width: 100%;
                text-align: center;
              }
              h1 { color: #f44336; font-weight: 700; font-size: 28px; margin-bottom: 24px; }
              p { color: #333; font-size: 16px; line-height: 1.6; }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>Invalid Approval Link</h1>
              <p>The approval link is invalid or has expired. Please request a new registration.</p>
            </div>
          </body>
        </html>
      `);
    }

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);

    if (!decoded) {
      console.error('Token verification failed');
      return res.status(401).send(`
        <html>
          <body style="text-align: center; font-family: Arial, sans-serif; margin-top: 50px;">
            <h1>Error</h1>
            <p>Invalid or expired approval token.</p>
          </body>
        </html>
      `);
    }

    const { email, name, password } = decoded;

    // Create confirmation token
    const confirmationToken = jwt.sign(
      { email, name, password, approved: true },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    const baseUrl = 'https://ceu-vault.vercel.app';
    const confirmationLink = `${baseUrl}/admin/confirm-admin?token=${confirmationToken}`;

    // Only use sendEmailWithRetry - remove any other email sending
    await sendEmailWithRetry(
      email,
      'confirmationRequest',
      confirmationLink
    );

    res.status(200).send(`
      <html>
        <head>
          <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&display=swap" rel="stylesheet">
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              font-family: 'Montserrat', sans-serif;
              background-color: #f5f5f5;
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
              padding: 20px;
            }
            .container {
              background-color: white;
              padding: 40px;
              border-radius: 12px;
              box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
              max-width: 600px;
              width: 100%;
              text-align: center;
            }
            h1 {
              color: #4CAF50;
              font-weight: 700;
              font-size: 28px;
              margin-bottom: 24px;
            }
            p {
              color: #333;
              font-size: 16px;
              line-height: 1.6;
              margin-bottom: 16px;
            }
            .email {
              color: #4CAF50;
              font-weight: 500;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Approval Successful</h1>
            <p>A confirmation email has been sent to <span class="email">${email}</span>.</p>
            <p>The admin account will only be created after the user clicks the confirmation link.</p>
          </div>
        </body>
      </html>
    `);

  } catch (error) {
    console.error('Full approval error:', error);

    if (error.name === 'TokenExpiredError') {
      return res.status(401).send(`
        <html>
          <head>
            <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&display=swap" rel="stylesheet">
            <style>
              * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
              }
              body {
                font-family: 'Montserrat', sans-serif;
                background-color: #f5f5f5;
                display: flex;
                justify-content: center;
                align-items: center;
                min-height: 100vh;
                padding: 20px;
              }
              .container {
                background-color: white;
                padding: 40px;
                border-radius: 12px;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                max-width: 600px;
                width: 100%;
                text-align: center;
              }
              h1 {
                color: #dc3545;
                font-weight: 700;
                font-size: 28px;
                margin-bottom: 24px;
              }
              p {
                color: #333;
                font-size: 16px;
                line-height: 1.6;
                margin-bottom: 16px;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>Error</h1>
              <p>Approval token has expired. Please request a new registration.</p>
            </div>
          </body>
        </html>
      `);
    }

    res.status(500).send(`
      <html>
        <body style="text-align: center; font-family: Arial, sans-serif; margin-top: 50px;">
          <h1>Error</h1>
          <p>An error occurred during the approval process.</p>
          <p>${process.env.NODE_ENV === 'development' ? error.message : ''}</p>
        </body>
      </html>
    `);
  }
};

const confirmAdmin = async (req, res) => {
  try {
    // Check if token exists in query params
    const { token } = req.query;
    if (!token) {
      return res.status(400).send(`
        <html>
          <head>
            <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&display=swap" rel="stylesheet">
            <style>
              * { margin: 0; padding: 0; box-sizing: border-box; }
              body {
                font-family: 'Montserrat', sans-serif;
                background-color: #f5f5f5;
                display: flex;
                justify-content: center;
                align-items: center;
                min-height: 100vh;
                padding: 20px;
              }
              .container {
                background-color: white;
                padding: 40px;
                border-radius: 12px;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                max-width: 600px;
                width: 100%;
                text-align: center;
              }
              h1 { color: #f44336; font-weight: 700; font-size: 28px; margin-bottom: 24px; }
              p { color: #333; font-size: 16px; line-height: 1.6; }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>Invalid Request</h1>
              <p>No confirmation token provided. Please use the link from your email.</p>
            </div>
          </body>
        </html>
      `);
    }

    // Continue with existing verification logic
    const decoded = jwt.verify(token, JWT_SECRET);
    const { email, name, password, approved } = decoded;

    if (!approved) {
      return res.status(401).json({ message: 'Admin not yet approved by IT Administrator' });
    }

    // Check if admin already exists
    const existingAdmin = await db.query(
      'SELECT * FROM admins WHERE email = $1',
      [email]
    );

    if (existingAdmin.rows.length > 0) {
      // Return styled error page for existing admin
      return res.status(200).send(`
        <html>
          <head>
            <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&display=swap" rel="stylesheet">
            <style>
              * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
              }
              body {
                font-family: 'Montserrat', sans-serif;
                background-color: #f5f5f5;
                display: flex;
                justify-content: center;
                align-items: center;
                min-height: 100vh;
                padding: 20px;
              }
              .container {
                background-color: white;
                padding: 40px;
                border-radius: 12px;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                max-width: 600px;
                width: 100%;
                text-align: center;
              }
              h1 {
                color: #f44336;
                font-weight: 700;
                font-size: 28px;
                margin-bottom: 24px;
              }
              p {
                color: #333;
                font-size: 16px;
                line-height: 1.6;
                margin-bottom: 16px;
              }
              .button {
                display: inline-block;
                padding: 12px 24px;
                background-color: #f44336;
                color: white;
                text-decoration: none;
                border-radius: 6px;
                font-weight: 500;
                transition: background-color 0.3s;
              }
              .button:hover {
                background-color: #e53935;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>Account Already Exists</h1>
              <p>An admin account with this email already exists.</p>
              <a href="/admin/sign-in" class="button">Go to Sign-in Page</a>
            </div>
          </body>
        </html>
      `);
    }

    // Generate a salt and hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Insert the new admin into the database
    await db.query(
      'INSERT INTO admins (email, name, password_hash) VALUES ($1, $2, $3)',
      [email, name, hashedPassword]
    );

    // Render success page
    res.status(200).send(`
      <html>
        <head>
          <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&display=swap" rel="stylesheet">
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              font-family: 'Montserrat', sans-serif;
              background-color: #f5f5f5;
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
              padding: 20px;
            }
            .container {
              background-color: white;
              padding: 40px;
              border-radius: 12px;
              box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
              max-width: 600px;
              width: 100%;
              text-align: center;
            }
            h1 {
              color: #4CAF50;
              font-weight: 700;
              font-size: 28px;
              margin-bottom: 24px;
            }
            p {
              color: #333;
              font-size: 16px;
              line-height: 1.6;
              margin-bottom: 16px;
            }
            .button {
              display: inline-block;
              padding: 12px 24px;
              background-color: #4CAF50;
              color: white;
              text-decoration: none;
              border-radius: 6px;
              font-weight: 500;
              transition: background-color 0.3s;
            }
            .button:hover {
              background-color: #45a049;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Account Created Successfully</h1>
            <p>Your admin account has been created. You can now login.</p>
            <a href="/admin/sign-in" class="button">Go to Sign-in Page</a>
          </div>
        </body>
      </html>
    `);

  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Confirmation token has expired' });
    }
    console.error('Error confirming admin:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = {

  createAdmin,
  approveAdmin,
  confirmAdmin,
  updateRequestStatus: adminActions.updateRequestStatus,
  updateRequestStatusTwo: adminActions.updateRequestStatusTwo,
  logout: adminActions.logout,
  getadminEquipment: adminActions.getadminEquipment,
  getAllHistory: adminActions.getAllHistory,
  getAllBorrowingRequests: adminActions.getAllBorrowingRequests,
  authenticateToken: adminActions.authenticateToken,
  verifyToken: adminActions.verifyToken,
  getReceipts: adminActions.getReceipts,
  login: adminActions.login,
  updateEquipmentCategory: adminActions.updateEquipmentCategory,
  deleteEquipmentCategory: adminActions.deleteEquipmentCategory,
  addEquipmentCategory: adminActions.addEquipmentCategory,
  resetEquipment: adminActions.resetEquipment,
  generateInventoryPDF: adminActions.generateInventoryPDF,
  getActiveRequests: adminActions.getActiveRequests,
  getStatusCounts: adminActions.getStatusCounts

};
