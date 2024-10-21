const nodemailer = require('nodemailer');
const { db } = require('../models/connection_db'); // Import the database connection
const redisClient = require('../redisClient');
require('dotenv').config();

// Set up Nodemailer with Gmail SMTP
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});


const sendEmail = async (recipientEmail, otpCode, formData) => {
  try {
    const info = await transporter.sendMail({
      from: `"${process.env.EMAIL_NAME}" <${process.env.EMAIL_USER}>`,
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

    // Store OTP and form data in session
    req.session.otp = otpCode;
    req.session.formData = { firstName, lastName, departmentName, email, natureOfService, purpose, venue, equipmentCategories };

    // Send OTP email with form data
    await sendEmail(email, otpCode, req.session.formData);

    return res.status(200).json({
      successful: true,
      message: "Form submitted successfully. OTP sent to your email. Please verify to proceed.",
      sessionID: sessionID, // Optionally return sessionID if needed on frontend,
      formData: req.session.formData // Optionally return form data if needed on frontend
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


  try {
    // Retrieve OTP and form data from session
    const storedOTP = req.session.otp;
    const formData = req.session.formData;

    if (otp !== storedOTP) {
      console.log('Session ID:', req.sessionID);
      console.log('Session Data:', req.session);
      return res.status(400).json({
        successful: false,
        message: "Invalid OTP. Please try again."
      });
    }

    if (!formData) {
      return res.status(400).json({
        successful: false,
        message: "Form data not found. Please resubmit the form."
      });
    }

    // Insert form data into the database
    const result = await insertFormDataIntoDatabase(formData);

    if (result.successful) {
      // Send an approval email to the requisitioner
      await sendApprovalEmail(formData.email, formData);

      // Respond with success
      return res.status(200).json({
        successful: true,
        message: "OTP verified and form data inserted successfully. Approval email sent to requisitioner."
      });
    } else {
      return res.status(500).json({
        successful: false,
        message: "Failed to insert form data into the database. Please try again."
      });
    }
  } catch (error) {
    console.error("Error verifying OTP or inserting form data:", error);
    return res.status(500).json({
      successful: false,
      message: "Failed to verify OTP or insert form data. Please try again."
    });
  }
};

const sendApprovalEmail = async (recipientEmail, formData) => {
  try {
    const info = await transporter.sendMail({
      from: `"${process.env.EMAIL_NAME}" <${process.env.EMAIL_USER}>`,
      to: recipientEmail,
      subject: 'Your Equipment Borrowing Request Approved',
      html: `
        <div style="font-family: Arial, sans-serif; text-align: center; padding: 20px; border: 1px solid #ddd; border-radius: 10px; max-width: 600px; margin: auto; background-color: #f9f9f9;">
          <h1 style="color: #4CAF50; margin-bottom: 20px;">CEU Vault</h1>
          <p style="font-size: 18px; color: #333; margin-bottom: 10px;">We have recieved your equipment borrowing request. Please await for a request approval from a TLTS Coordinator.</p>
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
    console.log('Approval email sent: %s', info.messageId);
  } catch (error) {
    console.error('Error sending approval email:', error);
  }
};

const getCategoryIDByName = async (categoryName) => {
  const categoryQuery = 'SELECT category_id FROM equipment_categories WHERE category_name = ?';
  const [categoryRows] = await db.execute(categoryQuery, [categoryName]);

  if (categoryRows.length === 0) {
    throw new Error(`Category name ${categoryName} not found in equipment_categories table.`);
  }

  return categoryRows[0].category_id;
};


const insertFormDataIntoDatabase = async (formData) => {
  console.log('Inserting form data into the database...');

  try {
    // Loop through each equipment category and insert a row for each
    for (let item of formData.equipmentCategories) {
      // Get the equipment_category_id based on the category_name
      const equipmentCategoryId = await getCategoryIDByName(item.category);

      const query = `
        INSERT INTO requests (
          email, first_name, last_name, department, nature_of_service, 
          purpose, venue, equipment_category_id, quantity_requested, requested, time_requested, return_time
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      const values = [
        formData.email,
        formData.firstName,
        formData.lastName,
        formData.departmentName,
        formData.natureOfService,
        formData.purpose,
        formData.venue,
        equipmentCategoryId, // Use the retrieved equipment_category_id
        item.quantity, // Quantity requested for each category
        item.dateRequested, // Requested date for the equipment
        item.timeRequested, // Requested time for the equipment
        item.returnTime // Return time for the equipment
      ];
      
      // Check for undefined values and replace with null
      const sanitizedValues = values.map(value => value === undefined ? null : value);

      await db.execute(query, sanitizedValues);
    }

    return {
      successful: true,
      message: "Form submitted successfully."
    };
  } catch (err) {
    console.error("Error inserting form data into the database:", err);
    throw new Error("An unexpected error occurred while inserting form data.");
  }
};

const getEquipmentCategories = async (req, res) => {
  const query = 'SELECT * FROM equipment_categories';
  try {
    console.log('Executing query:', query);
    const [rows] = await db.execute(query);
    console.log('Query result:', rows);
    return res.status(200).json(rows);
  } catch (error) {
    console.error('Error retrieving equipment categories:', error);
    return res.status(500).json({
      successful: false,
      message: 'Failed to retrieve equipment categories.'
    });
  }
};

module.exports = {
  submitForm,
  verifyOTP,
  getEquipmentCategories
};
