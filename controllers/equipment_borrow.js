const nodemailer = require('nodemailer');
const db = require('../models/connection_db'); // Import the database connection
const redisClient = require('../redisClient');

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

const submitForm = async (req, res, next) => {
  const { firstName, lastName, departmentName, email, natureOfService, purpose, venue, equipmentCategories } = req.body;

  if (!firstName || !lastName || !departmentName || !email || !natureOfService || !purpose || !venue || !equipmentCategories) {
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

  try {
    const otpCode = generateOTP(); // Generate your OTP code here
    const sessionID = req.sessionID; // Assuming sessionID is available in the request

    // Store OTP and form data in Redis
    const formData = JSON.stringify({ firstName, lastName, departmentName, email, natureOfService, purpose, venue, equipmentCategories });
    await redisClient.set(`otp:${sessionID}`, otpCode, { EX: 600 }); // Set OTP code with 10 minutes expiration
    await redisClient.set(`formData:${sessionID}`, formData, { EX: 600 }); // Set form data with 10 minutes expiration

    // Send OTP email
    await sendEmail(email, otpCode);

    return res.status(200).json({
      successful: true,
      message: "Form submitted successfully. OTP sent to your email. Please verify to proceed.",
      sessionID: sessionID // Optionally return sessionID if needed on frontend
    });
  } catch (error) {
    console.error("Error sending OTP or storing session:", error);
    return res.status(500).json({
      successful: false,
      message: "Failed to send OTP email or store session data. Please try again."
    });
  }
};

// OTP generator function
const generateOTP = (length = 6) => {
  const digits = '0123456789';
  let otp = '';
  for (let i = 0; i < length; i++) {
    otp += digits[Math.floor(Math.random() * 10)];
  }
  return otp;
};

// OTP verification and form submission
const verifyOTP = async (req, res) => {
  const { otp } = req.body;
  const sessionID = req.sessionID; // Assuming sessionID is available in the request

  console.log('Session Data:', req.session); // Log session data

  try {
    // Retrieve OTP from Redis
    const storedOTP = await redisClient.get(`otp:${sessionID}`);
    if (otp !== storedOTP) {
      return res.status(400).json({
        successful: false,
        message: "Invalid OTP. Please try again."
      });
    }

    // Retrieve form data from Redis
    const formDataJSON = await redisClient.get(`formData:${sessionID}`);
    if (!formDataJSON) {
      return res.status(400).json({
        successful: false,
        message: "Form data not found. Please resubmit the form."
      });
    }

    const formData = JSON.parse(formDataJSON);

    // Process the form data as needed
    console.log('Form Data:', formData);

    // Respond with success
    return res.status(200).json({
      successful: true,
      message: "OTP verified and form data retrieved successfully.",
      formData: formData // Optionally return form data if needed on frontend
    });
  } catch (error) {
    console.error("Error verifying OTP or retrieving form data:", error);
    return res.status(500).json({
      successful: false,
      message: "Failed to verify OTP or retrieve form data. Please try again."
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
