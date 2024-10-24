const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs'); // Use bcryptjs instead of bcrypt
const { db } = require('../models/connection_db'); // Import the database connection
require('dotenv').config();

// Set up Nodemailer with Gmail SMTP
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Secret key for JWT
const JWT_SECRET = 'your_jwt_secret_key';

// Send email example
const sendEmail = async (recipientEmail, approvalLink) => {
  try {
    const info = await transporter.sendMail({
      from: `"${process.env.EMAIL_NAME}" <${process.env.EMAIL_USER}>`,
      to: recipientEmail,
      subject: 'Admin Approval Request',
      text: `A new admin account has been requested. Please click the link to approve the admin account: ${approvalLink}. Note: This link will expire in 24 hours.`,
      html: `
        <div style="font-family: Arial, sans-serif; text-align: center; padding: 20px; border: 1px solid #ddd; border-radius: 10px; max-width: 600px; margin: auto; background-color: #f9f9f9;">
          <h1 style="color: #4CAF50; margin-bottom: 20px;">CEU Vault</h1>
          <p style="font-size: 18px; color: #333; margin-bottom: 10px;">A new admin account has been requested.</p>
          <p style="font-size: 16px; color: #555; margin-bottom: 20px;">Please click the button below to approve the admin account creation:</p>
          <a href="${approvalLink}" style="display: inline-block; padding: 10px 20px; font-size: 16px; color: #fff; background-color: #4CAF50; border-radius: 5px; text-decoration: none;">Approve Admin</a>
          <p style="font-size: 14px; color: #999; margin-top: 20px;">Note: This link will expire in 24 hours.</p>
          <p style="font-size: 14px; color: #999; margin-top: 10px;">Before proceeding, please contact the IT admin or the TLTS Facility to verify the request.</p>
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

const createAdmin = async (req, res) => {
  const { email, name, password } = req.body;

  try {
    // Generate a token for approval
    const approvalToken = jwt.sign({ email, name, password }, JWT_SECRET, { expiresIn: '24h' });

    // Use the ngrok URL for the approval link
    const ngrokUrl = process.env.NGROK_URL;
    const approvalLink = `${ngrokUrl}/equipments/approve-admin?token=${approvalToken}`;

    // Retrieve the IT admin email from environment variables
    const itAdminEmail = process.env.IT_ADMIN;

    // Use the IT admin email in the sendEmail function
    await sendEmail(itAdminEmail, approvalLink);

    res.status(200).json({ message: 'Approval email sent to your IT Administrator. Please wait for 24 hours.' });
  } catch (error) {
    console.error('Error creating admin:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const approveAdmin = async (req, res) => {
  const { token } = req.query;

  try {
    // Verify the token
    const decoded = jwt.verify(token, JWT_SECRET);
    const { email, name, password } = decoded;

    // Check if the email already exists in the database
    const [existingAdmin] = await db.query('SELECT * FROM admins WHERE email = ?', [email]);
    if (existingAdmin.length > 0) {
      return res.status(400).json({ message: 'An admin with that email already exists!' });
    }

    // Generate a salt
    const salt = await bcrypt.genSalt(10);
    // Hash the password with the salt
    const hashedPassword = await bcrypt.hash(password, salt);

    // Insert the new admin into the database
    await db.query('INSERT INTO admins (email, name, password_hash) VALUES (?, ?, ?)', [email, name, hashedPassword]);

    res.status(201).json({ message: 'Admin created successfully' });
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token has expired' });
    }
    console.error('Error approving admin:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const updateRequestStatus = async (req, res) => {
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
    let approvedAt = null; // Initialize approvedAt to null

    // Check the current status of the request and get the request details
    const [rows] = await db.query(`
      SELECT r.*, ec.category_name, ec.quantity_available 
      FROM requests r 
      LEFT JOIN equipment_categories ec ON r.equipment_category_id = ec.category_id 
      WHERE r.request_id = ?
    `, [request_id]);

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Request not found' });
    }

    const requestDetails = rows[0];
    const currentStatus = requestDetails.status;
    const requesterEmail = requestDetails.email;

    if (currentStatus === 'returned') {
      return res.status(400).json({ message: 'Cannot change status of a returned request' });
    }

    // Get current system time if status is 'approved'
    if (status === 'approved') {
      approvedAt = new Date();
    }

    // Send an email notification for any status update
    await transporter.sendMail({
      from: `"${process.env.EMAIL_NAME}" <${process.env.EMAIL_USER}>`,
      to: requesterEmail,
      subject: `Request ${status.charAt(0).toUpperCase() + status.slice(1)}`,
      text: `Your request with ID ${request_id} has been ${status}.`,
      html: `
        <div style="font-family: Arial, sans-serif; text-align: left; padding: 35px; border: 1px solid #ddd; border-radius: 10px; max-width: 600px; margin: auto; background-color: #f9f9f9;">
          <h1 style="color: #4CAF50; margin-bottom: 20px; text-align: center;">CEU Vault</h1>
          <p style="font-size: 16px; color: #333; margin-bottom: 10px;">Your request with the request ID ${request_id} has been ${status}.</p>
          <p style="font-size: 14px; color: #555; margin-bottom: 20px;">Request Details:</p>
          <p style="font-size: 12px; color: #555;">Email: ${requestDetails.email}</p>
          <p style="font-size: 12px; color: #555;">First Name: ${requestDetails.first_name}</p>
          <p style="font-size: 12px; color: #555;">Last Name: ${requestDetails.last_name}</p>
          <p style="font-size: 12px; color: #555;">Department: ${requestDetails.department}</p>
          <p style="font-size: 12px; color: #555;">Nature of Service: ${requestDetails.nature_of_service}</p>
          <p style="font-size: 12px; color: #555;">Purpose: ${requestDetails.purpose}</p>
          <p style="font-size: 12px; color: #555;">Venue: ${requestDetails.venue}</p>
          <table style="width: 100%; border-collapse: collapse; margin: 20px auto; text-align: center;">
            <tr>
              <th style="border: 1px solid #ddd; padding: 8px;">Category</th>
              <th style="border: 1px solid #ddd; padding: 8px;">Quantity Requested</th>
              <th style="border: 1px solid #ddd; padding: 8px;">Requested Date</th>
              <th style="border: 1px solid #ddd; padding: 8px;">Time Requested</th>
              <th style="border: 1px solid #ddd; padding: 8px;">Return Time</th>
              <th style="border: 1px solid #ddd; padding: 8px;">Time Borrowed</th>
              <th style="border: 1px solid #ddd; padding: 8px;">Approved at</th>
              <th style="border: 1px solid #ddd; padding: 8px;">Status</th>
            </tr>
            <tr>
              <td style="border: 1px solid #ddd; padding: 8px;">${requestDetails.category_name}</td>
              <td style="border: 1px solid #ddd; padding: 8px;">${requestDetails.quantity_requested}</td>
              <td style="border: 1px solid #ddd; padding: 8px;">${requestDetails.requested}</td>
              <td style="border: 1px solid #ddd; padding: 8px;">${requestDetails.time_requested}</td>
              <td style="border: 1px solid #ddd; padding: 8px;">${requestDetails.return_time}</td>
              <td style="border: 1px solid #ddd; padding: 8px;">${requestDetails.time_borrowed}</td>
              <td style="border: 1px solid #ddd; padding: 8px;">${status === 'approved' ? approvedAt : requestDetails.approved_at}</td>
              <td style="border: 1px solid #ddd; padding: 8px;">${status}</td>
            </tr>
          </table>
          <p style="font-size: 14px; color: #999; margin-top: 20px; text-align: center;">If you have any questions, please contact the IT admin.</p>
        </div>
      `
    });

    // If status is 'ongoing', decrement the quantity_available in equipment_categories
    if (status === 'ongoing') {
      const quantityRequested = requestDetails.quantity_requested;
      const equipmentCategoryId = requestDetails.equipment_category_id;

      await db.query(`
        UPDATE equipment_categories 
        SET quantity_available = quantity_available - ? 
        WHERE category_id = ?
      `, [quantityRequested, equipmentCategoryId]);
    }

    // If status is 'returned', increment the quantity_available in equipment_categories
    if (status === 'returned') {
      const quantityRequested = requestDetails.quantity_requested;
      const equipmentCategoryId = requestDetails.equipment_category_id;

      await db.query(`
        UPDATE equipment_categories 
        SET quantity_available = quantity_available + ? 
        WHERE category_id = ?
      `, [quantityRequested, equipmentCategoryId]);
    }

    // Prepare the update query and values
    let updateQuery = 'UPDATE requests SET admin_id = ?, status = ?, status_updated_at = ?';
    let updateValues = [adminId, status, statusUpdatedAt, request_id];

    if (status === 'approved') {
      updateQuery += ', approved_at = ?';
      updateValues.splice(3, 0, approvedAt); // Insert approvedAt before request_id
    }

    updateQuery += ' WHERE request_id = ?';

    // Update the admin_id, status, status_updated_at, and possibly approved_at in the requests table
    await db.query(updateQuery, updateValues);

    res.status(200).json({ message: 'Request status updated successfully', requestDetails });
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
  updateRequestStatus,
  logout,
  approveAdmin
  // other exports
};
