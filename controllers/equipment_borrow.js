const nodemailer = require('nodemailer');
const { db } = require('../models/connection_db'); // Import the database connection
const redisClient = require('../redisClient');
require('dotenv').config();
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const formatDateForEmail = (dateStr) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric'
  });
};

const formatTimeForEmail = (timeStr) => {
  const date = new Date(`1970-01-01T${timeStr}`);
  return date.toLocaleTimeString('en-US', { 
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
};

// Set up Nodemailer with Gmail SMTP
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true, // Use SSL
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
                <td style="border: 1px solid #ddd; padding: 8px;">${formatDateForEmail(item.dateRequested)}</td>
                <td style="border: 1px solid #ddd; padding: 8px;">${formatTimeForEmail(item.timeRequested)}</td>
                <td style="border: 1px solid #ddd; padding: 8px;">${formatTimeForEmail(item.returnTime)}</td>
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

// Function to create the form_receipt PDF
// Function to create the form_receipt PDF and return it as a base64 string
function createInvoice(details) {
  return new Promise((resolve, reject) => {
    let doc = new PDFDocument({ size: "A4", margin: 50 });
    let buffers = [];

    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => {
      let pdfData = Buffer.concat(buffers);
      resolve(pdfData.toString('base64'));
    });

    generateHeader(doc);
    generateCustomerInformation(doc, details);
    generateInvoiceTable(doc, details);
    generateFooter(doc);

    doc.end();
  });
}
function generateHeader(doc) {
  const logoPath = path.join(__dirname, '..', 'Public', 'images', 'CEU-Logo.png');
  doc
    .image(logoPath, 50, 45, { width: 50 })
    .fillColor("#444444")
    .fontSize(20)
    .text("CEU VAULT", 110, 57)
    .fontSize(10)
    .text("CEU VAULT.", 200, 50, { align: "right" })
    .text("Teaching, Learning, and Technology Section", 200, 65, { align: "right" })
    .text("CEU Malolos", 200, 80, { align: "right" })
    .moveDown();
}
function generateCustomerInformation(doc, details) {
  doc
    .fillColor("#444444")
    .fontSize(20)
    .text("Service Request", 50, 160);

  generateHr(doc, 185);

  const customerInformationTop = 200;

  doc
    .fontSize(10)
    .text("Name:", 50, customerInformationTop)
    .font("Helvetica-Bold")
    .text(`${details.firstName} ${details.lastName}`, 150, customerInformationTop)
    .font("Helvetica")
    .text("Department:", 50, customerInformationTop + 15)
    .text(details.departmentName, 150, customerInformationTop + 15)
    .text("Email:", 50, customerInformationTop + 30)
    .text(details.email, 150, customerInformationTop + 30)
    .text("Nature of Service:", 50, customerInformationTop + 45)
    .text(details.natureOfService, 150, customerInformationTop + 45)
    .text("Purpose:", 50, customerInformationTop + 60)
    .text(details.purpose, 150, customerInformationTop + 60)
    .text("Venue:", 50, customerInformationTop + 75)
    .text(details.venue, 150, customerInformationTop + 75)
    .moveDown();

  generateHr(doc, customerInformationTop + 90);
}
function generateInvoiceTable(doc, details) {
  const invoiceTableTop = 330;

  doc.font("Helvetica-Bold");
  generateTableRow(
    doc,
    invoiceTableTop,
    "Category",
    "Quantity",
    "Date Requested",
    "Time Requested",
    "Return Time"
  );
  generateHr(doc, invoiceTableTop + 20);
  doc.font("Helvetica");

  details.equipmentCategories.forEach((item, i) => {
    const position = invoiceTableTop + (i + 1) * 30;
    generateTableRow(
      doc,
      position,
      item.category,
      item.quantity,
      formatDateForEmail(item.dateRequested),
      formatTimeForEmail(item.timeRequested),
      formatTimeForEmail(item.returnTime)
    );
    generateHr(doc, position + 20);
  });
}

function generateFooter(doc) {
  doc
    .fontSize(10)
    .text(
      "Thank you for your request. We will process it as soon as possible. Please wait for request approval.",
      50,
      780,
      { align: "center", width: 500 }
    );
}
function generateTableRow(
  doc,
  y,
  category,
  quantity,
  dateRequested,
  timeRequested,
  returnTime
) {
  doc
    .fontSize(10)
    .text(category, 50, y)
    .text(quantity, 150, y)
    .text(dateRequested, 250, y)
    .text(timeRequested, 350, y)
    .text(returnTime, 450, y);
}
function generateHr(doc, y) {
  doc
    .strokeColor("#aaaaaa")
    .lineWidth(1)
    .moveTo(50, y)
    .lineTo(550, y)
    .stroke();
}

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

    // Generate PDF invoice and convert to base64
    const pdfBase64 = await createInvoice(req.session.formData);

    // Store PDF base64 in session
    req.session.pdfBase64 = pdfBase64;

    // Store form data and PDF in Redis
    const sessionData = {
      formData: req.session.formData,
      pdfBase64: pdfBase64
    };
    await redisClient.set(sessionID, JSON.stringify(sessionData));

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
    const pdfBase64 = req.session.pdfBase64; // Assuming pdfBase64 is stored in the session

    if (otp !== storedOTP) {
      console.log('Session ID:', req.sessionID);
      console.log('Session Data:', req.session);
      return res.status(400).json({
        successful: false,
        message: "Invalid OTP. Please try again."
      });
    }

    if (!formData || !pdfBase64) {
      return res.status(400).json({
        successful: false,
        message: "Form data or PDF not found. Please resubmit the form."
      });
    }

    // Insert form data into the database
    const result = await insertFormDataIntoDatabase(formData, pdfBase64);

    if (result.successful) {
      // Insert the form receipt into the request history
      //await insertInvoiceIntoRequestHistory(pdfBase64);

      // Send an approval email to the requisitioner with the PDF attachment
      await sendApprovalEmail(formData.email, formData, pdfBase64);

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

const sendApprovalEmail = async (recipientEmail, formData, pdfBase64) => {
  try {
    // Convert the base64 string back to a buffer
    const pdfBuffer = Buffer.from(pdfBase64, 'base64');

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    const info = await transporter.sendMail({
      from: `"${process.env.EMAIL_NAME}" <${process.env.EMAIL_USER}>`,
      to: recipientEmail,
      subject: 'Your Equipment Borrowing Request has been received by our system',
      html: `
        <div style="font-family: Arial, sans-serif; text-align: center; padding: 20px; border: 1px solid #ddd; border-radius: 10px; max-width: 600px; margin: auto; background-color: #f9f9f9;">
          <h1 style="color: #4CAF50; margin-bottom: 20px;">CEU Vault</h1>
          <p style="font-size: 18px; color: #333; margin-bottom: 10px;">We have received your equipment borrowing request. Please await for a request approval from a TLTS Coordinator.</p>
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
                <td style="border: 1px solid #ddd; padding: 8px;">${formatDateForEmail(item.dateRequested)}</td>
                <td style="border: 1px solid #ddd; padding: 8px;">${formatTimeForEmail(item.timeRequested)}</td>
                <td style="border: 1px solid #ddd; padding: 8px;">${formatTimeForEmail(item.returnTime)}</td>
              </tr>
            `).join('')}
          </table>
          <p style="font-size: 16px; color: #555;">Thank you for using CEU Vault. If you have any questions, please contact us.</p>
        </div>
      `,
      attachments: [
        {
          filename: 'form_receipt.pdf',
          content: pdfBuffer,
          contentType: 'application/pdf'
        }
      ]
    });

    console.log('Approval email sent: %s', info.messageId);
  } catch (error) {
    console.error('Error sending approval email:', error);
  }
};
const getCategoryIDByName = async (categoryName) => {
  const categoryQuery = 'SELECT category_id FROM equipment_categories WHERE category_name = $1';
  const { rows: categoryRows } = await db.query(categoryQuery, [categoryName]);

  if (categoryRows.length === 0) {
    throw new Error(`Category name ${categoryName} not found in equipment_categories table.`);
  }

  return categoryRows[0].category_id;
};

// Helper function to format date to 'YYYY-MM-DD'
const formatDate = (dateString) => {
  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid date: ${dateString}`);
  }
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are zero-based
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`; // 'YYYY-MM-DD'
};

// Helper function to format time to 'HH:MM:SS'
const formatTime = (timeString) => {
  const date = new Date(`1970-01-01T${timeString}Z`); // 'Z' ensures UTC
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid time: ${timeString}`);
  }
  const hours = String(date.getUTCHours()).padStart(2, '0');
  const minutes = String(date.getUTCMinutes()).padStart(2, '0');
  const seconds = String(date.getUTCSeconds()).padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`; // 'HH:MM:SS'
};

const insertFormDataIntoDatabase = async (formData, pdfBase64) => {
  console.log('Inserting form data into the database...');

  if (!pdfBase64) {
    throw new Error("PDF base64 string is undefined.");
  }

  const client = await db.connect();

  try {
    await client.query('BEGIN');

    // Decode base64 to binary
    const pdfBuffer = Buffer.from(pdfBase64, 'base64');

    // Insert into request_history and get the batch_id
    const insertHistoryQuery = `
      INSERT INTO request_history (requisitioner_form_receipt) 
      VALUES ($1) RETURNING batch_id
    `;
    const { rows: [historyRow] } = await client.query(insertHistoryQuery, [pdfBuffer]);
    const batchId = historyRow.batch_id;

    // Loop through each equipment category and insert a row for each
    for (const item of formData.equipmentCategories) {
      // Get the equipment_category_id based on the category_name
      const equipmentCategoryId = await getCategoryIDByName(item.category);

      // Parse and format date and time values
      const requestedDate = formatDate(item.dateRequested);       // 'YYYY-MM-DD'
      const timeRequested = formatTime(item.timeRequested);       // 'HH:MM:SS'
      const returnTime = formatTime(item.returnTime);             // 'HH:MM:SS'

      const query = `
        INSERT INTO requests (
          email, first_name, last_name, department, nature_of_service, 
          purpose, venue, equipment_category_id, quantity_requested, 
          requested, time_requested, return_time, batch_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      `;
      const values = [
        formData.email,
        formData.firstName,
        formData.lastName,
        formData.departmentName || null,
        formData.natureOfService || null,
        formData.purpose || null,
        formData.venue || null,
        equipmentCategoryId,
        item.quantity,
        requestedDate,
        timeRequested,
        returnTime,
        batchId
      ];

      await client.query(query, values);
    }

    await client.query('COMMIT');

    return {
      successful: true,
      message: "Form submitted successfully."
    };
  } catch (err) {
    await client.query('ROLLBACK');
    console.error("Error inserting form data into the database:", err);
    throw new Error("An unexpected error occurred while inserting form data.");
  } finally {
    client.release();
  }
};

const getEquipmentCategories = async (req, res) => {
  const query = `
    SELECT 
      category_id,
      category_name,
      quantity_available
    FROM equipment_categories
    ORDER BY category_name
  `;
  
  try {
    console.log('Executing query:', query);
    const { rows } = await db.query(query);
    return res.status(200).json({
      successful: true,
      equipmentCategories: rows
    });
  } catch (error) {
    console.error('Error retrieving equipment categories:', error);
    return res.status(500).json({
      successful: false,
      message: 'Failed to retrieve equipment categories.'
    });
  }
};

// Add this new function to get session data
const getSessionData = async (req, res) => {
    try {
        const sessionID = req.sessionID;
        const sessionData = await redisClient.get(sessionID);
        
        if (!sessionData) {
            return res.status(404).json({
                successful: false,
                message: "Session data not found"
            });
        }

        const parsedData = JSON.parse(sessionData);
        return res.status(200).json({
            successful: true,
            formData: parsedData.formData
        });
    } catch (error) {
        console.error("Error retrieving session data:", error);
        return res.status(500).json({
            successful: false,
            message: "Failed to retrieve session data"
        });
    }
};

module.exports = {
    submitForm,
    verifyOTP,
    getEquipmentCategories,
    getSessionData // Add this to exports
};
