const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs'); // Use bcryptjs instead of bcrypt
const { db } = require('../models/connection_db'); // Import the database connection
const redisClient = require('../redisClient');

// Set up Nodemailer with Gmail SMTP
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'ceu.otp@gmail.com',
    pass: 'gewj zaqo ppmf aqfx' // Note: Use environment variables for sensitive data
  }
});

// Secret key for JWT
const JWT_SECRET = 'your_jwt_secret_key';

// Send email example
const sendEmail = async (recipientEmail, otpCode, formData) => {
  try {
    const info = await transporter.sendMail({
      from: '"CEU VAULT" <ceu.otp@gmail.com>',
      to: recipientEmail,
      subject: 'Your OTP Code and Equipment Borrowing Details',
      text: `Your OTP Code is ${otpCode}`,
      html: `
        <div style="font-family: Arial, sans-serif; text-align: center; padding: 20px; border: 1px solid #ddd; border-radius: 10px; max-width: 600px; margin: auto; background-color: #f9f9f9;">
          <h1 style="color: #4CAF50; margin-bottom: 20px;">CEU Vault</h1>
          <p style="font-size: 18px; color: #333; margin-bottom: 10px;">Your OTP Code is:</p>
          <p style="font-size: 32px; font-weight: bold; color: #000; margin: 20px 0;">${otpCode}</p>
          <p style="font-size: 16px; color: #555; margin-bottom: 20px;">Please use this code to complete your verification process.</p>
          <p style="font-size: 14px; color: #777;">If you did not request this code, please ignore this email.</p>
          <hr style="margin: 40px 0; border: none; border-top: 1px solid #ddd;">
          <h2 style="color: #4CAF50; margin-bottom: 20px;">Equipment Borrowing Details</h2>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <tr>
              <th style="border: 1px solid #ddd; padding: 8px; background-color: #f2f2f2;">Category</th>
              <th style="border: 1px solid #ddd; padding: 8px; background-color: #f2f2f2;">Quantity</th>
              <th style="border: 1px solid #ddd; padding: 8px; background-color: #f2f2f2;">Date Requested</th>
              <th style="border: 1px solid #ddd; padding: 8px; background-color: #f2f2f2;">Time Requested</th>
              <th style="border: 1px solid #ddd; padding: 8px; background-color: #f2f2f2;">Return Time</th>
            </tr>
            ${formData.equipmentCategories.map(item => `
              <tr>
                <td style="border: 1px solid #ddd; padding: 8px;">${item.category}</td>
                <td style="border: 1px solid #ddd; padding: 8px;">${item.quantity}</td>
                <td style="border: 1px solid #ddd; padding: 8px;">${item.dateRequested}</td>
                <td style="border: 1px solid #ddd; padding: 8px;">${item.timeRequested}</td>
                <td style="border: 1px solid #ddd; padding: 8px;">${item.returnTime}</td>
              </tr>
            `).join('')}
          </table>
          <p style="font-size: 16px; color: #555;">Thank you for using CEU Vault. If you have any questions, please contact us.</p>
        </div>
      `
    });
    console.log('Message sent: %s', info.messageId);
  } catch (error) {
    console.error('Error sending email:', error);
  }
};

const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    // Fetch admin details from the database
    const results = await db.query('SELECT * FROM admins WHERE email = ?', [email]);
    const admin = results[0][0]; // Access the first element of the first array

    // Check if admin exists
    if (!admin) {
      console.error('Admin not found for email:', email);
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    // Check if admin.password_hash is defined
    if (!admin.password_hash) {
      console.error('Admin password_hash is undefined for email:', email);
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Compare password
    const isMatch = await bcrypt.compare(password, admin.password_hash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Generate JWT token
    const token = jwt.sign({ id: admin.admin_id, email: admin.email }, JWT_SECRET, { expiresIn: '1h' });

    // Set token in cookie
    res.cookie('token', token, { httpOnly: true, secure: true, sameSite: 'None' });

    res.status(200).json({ message: 'Login successful' });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Pang add lang ng admin. Hindi na kailangan sa actual app
const createAdmin = async (req, res) => {
  const { email, name, password } = req.body;

  try {
    // Generate a salt
    const salt = await bcrypt.genSalt(10);
    // Hash the password with the salt
    const hashedPassword = await bcrypt.hash(password, salt);

    // Insert the new admin into the database
    await db.query('INSERT INTO admins (email, name, password_hash) VALUES (?, ?, ?)', [email, name, hashedPassword]);

    res.status(201).json({ message: 'Admin created successfully' });
  } catch (error) {
    console.error('Error creating admin:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const updateAdminStatus = async (req, res) => {
  const { request_id, status } = req.body;
  const token = req.cookies.token;

  if (!token) {
    return res.status(401).json({ message: 'Unauthorized: No token provided' });
  }

  // Validate the status
  const validStatuses = ['approved', 'ongoing', 'returned', 'cancelled'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ message: 'Invalid status' });
  }

  try {
    // Verify the token
    const decoded = jwt.verify(token, JWT_SECRET);
    const adminId = decoded.id;

    // Get the current timestamp
    const statusUpdatedAt = new Date();

    // Check the current status of the request
    const [rows] = await db.query('SELECT status FROM requests WHERE request_id = ?', [request_id]);
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Request not found' });
    }

    const currentStatus = rows[0].status;
    if (currentStatus === 'returned') {
      return res.status(400).json({ message: 'Cannot change status of a returned request' });
    }

    // Update the admin_id, status, and status_updated_at in the requests table
    await db.query(
      'UPDATE requests SET admin_id = ?, status = ?, status_updated_at = ? WHERE request_id = ?',
      [adminId, status, statusUpdatedAt, request_id]
    );

    res.status(200).json({ message: 'Request status updated successfully' });
  } catch (error) {
    console.error('Error updating request status:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const logout = (req, res) => {
  res.clearCookie('token', { httpOnly: true, secure: true, sameSite: 'None' });
  res.status(200).json({ message: 'Logout successful' });
};

module.exports = {
  login,
  createAdmin,
  updateAdminStatus,
  logout
  // other exports
};
