const database = require('../models/connection_db');
const nodemailer = require('nodemailer');

const user_model = require('../models/user_mod');
const equipment_model = require('../models/equipment_mod');

const db = require('../models/connection_db'); // Import the database connection

// Set up Nodemailer with Gmail SMTP
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'ceu.otp@gmail.com',
    pass: 'gewj zaqo ppmf aqfx' // Note: Use environment variables for sensitive data
  }
});

// Send email example
const sendEmail = async (recipientEmail, otpCode) => {
  try {
    const info = await transporter.sendMail({
      from: '"CEU VAULT" <ceu.otp@gmail.com>',
      to: recipientEmail,
      subject: 'Your OTP Code',
      text: `Your OTP Code is ${otpCode}`,
      html: `<b>Your OTP Code is ${otpCode}</b>`
    });
    console.log('Message sent: %s', info.messageId);
  } catch (error) {
    console.error('Error sending email:', error);
  }
};

// Generate OTP
const generateOTP = (length = 6) => {
  const digits = '0123456789';
  let otp = '';
  for (let i = 0; i < length; i++) {
    otp += digits[Math.floor(Math.random() * 10)];
  }
  return otp;
};

// Send OTP and store it in session
const sendOTP = async (email, req, res) => {
  const generatedOTP = generateOTP();

  try {
    // Send the OTP via email
    await sendEmail(email, generatedOTP);

    // Check if session exists before attempting to set session data
    if (!req.session) {
      return res.status(500).json({
        successful: false,
        message: "Session is not available. Please try again."
      });
    }

    // Store OTP and expiry time in session
    req.session.generatedOTP = generatedOTP; // Store OTP in Redis session
    req.session.otpExpiry = Date.now() + 5 * 60 * 1000; // OTP expiry (5 minutes)

    // Save the session
    req.session.save(err => {
      if (err) {
        return res.status(500).json({
          successful: false,
          message: "Failed to store OTP in session. Please try again."
        });
      }
      
      return res.status(200).json({
        successful: true,
        message: "OTP has been sent and stored successfully."
      });
    });
    
  } catch (error) {
    return res.status(500).json({
      successful: false,
      message: "Failed to send OTP email. Please try again."
    });
  }
};

const submitForm = async (req, res, next) => {
  const { firstName, lastName, departmentName, email, natureOfService, purpose, venue, equipmentCategories } = req.body;

  // Validate required fields
  if (!firstName || !lastName || !departmentName || !email || !natureOfService || !purpose || !venue || !equipmentCategories || equipmentCategories.length === 0) {
    return res.status(400).json({
      successful: false,
      message: "Missing required fields: First name, Last name, Department name, Email, Nature of service, Purpose, Venue, or Equipment categories."
    });
  }

  // Validate email format
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({
      successful: false,
      message: "Invalid email format."
    });
  }

  // Validate email domain
  if (!/@(mls\.ceu\.edu\.ph|ceu\.edu\.ph)$/.test(email)) {
    return res.status(400).json({
      successful: false,
      message: "Email must end with @mls.ceu.edu.ph or @ceu.edu.ph."
    });
  }

  // Validate dates and times
  for (let item of equipmentCategories) {
    if (!item.category || !item.dateRequested || !/^\d{4}-\d{2}-\d{2}$/.test(item.dateRequested) || !item.timeRequested || !/^\d{2}:\d{2}:\d{2}$/.test(item.timeRequested)) {
      return res.status(400).json({
        successful: false,
        message: "Each equipment category must include a valid date (YYYY-MM-DD) and time (HH:MM:SS)."
      });
    }
  }

  // Store form data in session (now stored in Redis)
  req.session.formData = req.body;

  // Generate OTP
  const generatedOTP = generateOTP();

  try {
    // Send the OTP via email
    await sendEmail(email, generatedOTP);

    // Check if session exists before attempting to set session data
    if (!req.session) {
      return res.status(500).json({
        successful: false,
        message: "Session is not available. Please try again."
      });
    }

    // Store OTP and expiry time in session
    req.session.generatedOTP = generatedOTP; // Store OTP in Redis session
    req.session.otpExpiry = Date.now() + 5 * 60 * 1000; // OTP expiry (5 minutes)

    // Save the session
    req.session.save(err => {
      if (err) {
        return res.status(500).json({
          successful: false,
          message: "Failed to store OTP in session. Please try again."
        });
      }

      return res.status(200).json({
        successful: true,
        message: "OTP has been sent and stored successfully. Please verify the OTP to proceed."
      });
    });

  } catch (error) {
    return res.status(500).json({
      successful: false,
      message: "Failed to send OTP email. Please try again."
    });
  }
};

// OTP verification and form submission
const verifyOTP = async (req, res) => {
  const { otp } = req.body;

  console.log('Session Data:', req.session); // Log session data

  // Check if OTP is correct
  if (otp !== req.session.generatedOTP) {
      return res.status(400).json({
          successful: false,
          message: "Invalid OTP. Please try again."
      });
  }

  // Optional: Check if OTP has expired
  if (Date.now() > req.session.otpExpiry) {
      return res.status(400).json({
          successful: false,
          message: "OTP has expired. Please request a new OTP."
      });
  }

  // Retrieve form data from session
  const formData = req.session.formData;

  try {
      // Loop through each equipment category and insert a row for each
      for (let item of formData.equipmentCategories) {
          const query = `
              INSERT INTO requests (
                  email, first_name, last_name, department, nature_of_service, 
                  purpose, venue, equipment_category_id, quantity_requested, requested, time_requested
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `;
          const values = [
              formData.email,
              formData.firstName,
              formData.lastName,
              formData.departmentName,
              formData.natureOfService,
              formData.purpose,
              formData.venue,
              item.categoryId,      // Assuming you are passing the category ID here
              item.quantity,        // Quantity requested for each category
              item.dateRequested,   // Requested date for the equipment
              item.timeRequested    // Requested time for the equipment
          ];

          await db.db.query(query, values);
      }

      // Clear session data after successful submission
      req.session.generatedOTP = null;
      req.session.formData = null;

      return res.status(200).json({
          successful: true,
          message: "Form submitted successfully."
      });
  } catch (err) {
      console.error("Database insertion error:", err); // Log the error for debugging
      return res.status(500).json({
          successful: false,
          message: "An unexpected error occurred.",
          error: err.message // Include the error message for more context
      });
  }
};


const insertDetails = (req, res) => {
    db.db.insert(req.body, (err, result) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        res.status(200).json({ message: 'Details inserted successfully' });
    });
};

module.exports = {
  submitForm,
  verifyOTP,
  insertDetails
};
