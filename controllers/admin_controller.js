const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs'); // Use bcryptjs instead of bcrypt
const { db } = require('../models/connection_db'); // Import the database connection
require('dotenv').config();
const PDFDocument = require('pdfkit');
const fs = require('fs');

// Function to create the invoice PDF
// Function to create the invoice PDF and return it as a base64 string
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

    if (details.cancelledDetails) {
      generateCancelledRequestsTable(doc, details.cancelledDetails);
    }

    generateFooter(doc);

    doc.end();
  });
}
function generateHeader(doc) {
  doc
    .image("controllers/CEU-Logo.png", 50, 45, { width: 50 })
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

  // Add title for the Approved Requests table
  doc
    .font("Helvetica-Bold")
    .fontSize(14)
    .text("Approved Requests", 50, invoiceTableTop - 30);

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
      item.dateRequested,
      item.timeRequested,
      item.returnTime
    );
    generateHr(doc, position + 20);
  });
}
function generateCancelledRequestsTable(doc, cancelledDetails) {
  const cancelledTableTop = 500; // Adjust the position as needed

  // Add title for the Cancelled Requests table
  doc
    .font("Helvetica-Bold")
    .fontSize(14)
    .text("Cancelled Requests", 50, cancelledTableTop - 30);

  doc.font("Helvetica-Bold");
  generateTableRow(
    doc,
    cancelledTableTop,
    "Category",
    "Quantity",
    "Date Requested",
    "Time Requested",
    "Return Time"
  );
  generateHr(doc, cancelledTableTop + 20);
  doc.font("Helvetica");

  cancelledDetails.equipmentCategories.forEach((item, i) => {
    const position = cancelledTableTop + (i + 1) * 30;
    generateTableRow(
      doc,
      position,
      item.category,
      item.quantity,
      item.dateRequested,
      item.timeRequested,
      item.returnTime
    );
    generateHr(doc, position + 20);
  });
}
function generateCancelledRequestsTable(doc, cancelledDetails) {
  const cancelledTableTop = 500; // Adjust the position as needed

  // Add title for the Cancelled Requests table
  doc
    .font("Helvetica-Bold")
    .fontSize(14)
    .text("Cancelled Requests", 50, cancelledTableTop - 30);

  doc.font("Helvetica-Bold");
  generateTableRow(
    doc,
    cancelledTableTop,
    "Category",
    "Quantity",
    "Date Requested",
    "Time Requested",
    "Return Time"
  );
  generateHr(doc, cancelledTableTop + 20);
  doc.font("Helvetica");

  cancelledDetails.equipmentCategories.forEach((item, i) => {
    const position = cancelledTableTop + (i + 1) * 30;
    generateTableRow(
      doc,
      position,
      item.category,
      item.quantity,
      item.dateRequested,
      item.timeRequested,
      item.returnTime
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

// Secret key for JWT
const JWT_SECRET = process.env.JWT_SECRET;

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
    // Fetch admin details from the database using PostgreSQL syntax
    const results = await db.query('SELECT * FROM admins WHERE email = $1', [email]);
    const admin = results.rows[0]; // PostgreSQL returns { rows: [] }

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

// Function to validate and update request status aligned with PostgreSQL
const updateRequestStatusTwo = async (req, res) => {
  const { request_id, status } = req.body;
  const token = req.cookies.token;

  // Validate token
  if (!token) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  // Validate input data
  if (!request_id || !status) {
    return res.status(400).json({ message: 'Bad Request: Missing request_id or status' });
  }

  // Validate status value
  const validStatuses = ['ongoing', 'returned', 'cancelled'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ message: 'Bad Request: Invalid status value' });
  }

  const client = await db.connect(); // Acquire a client from the pool

  try {
    await client.query('BEGIN'); // Start transaction

    // Check if the request_id exists in the admin_log table and retrieve status
    const checkRequestQuery = `
      SELECT status 
      FROM admin_log 
      WHERE request_id = $1
    `;
    const checkResult = await client.query(checkRequestQuery, [request_id]);
    const existingRequest = checkResult.rows[0];

    if (!existingRequest) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Not Found: Request ID does not exist' });
    }

    const currentStatus = existingRequest.status;

    // Prevent repeated status updates
    if (currentStatus === status) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: `Bad Request: Status is already ${status}` });
    }

    // Prevent changing status if it's already cancelled
    if (currentStatus === 'cancelled') {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'Bad Request: Cannot change status from cancelled' });
    }

    // Retrieve quantity_requested and equipment_category_id from the admin_log table
    const getRequestDetailsQuery = `
      SELECT quantity_requested, equipment_category_id 
      FROM admin_log 
      WHERE request_id = $1
    `;
    const detailsResult = await client.query(getRequestDetailsQuery, [request_id]);
    const requestDetails = detailsResult.rows[0];

    if (!requestDetails) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Not Found: Request details not found' });
    }

    const { quantity_requested, equipment_category_id } = requestDetails;

    // Update quantity_available based on status
    let updateQuantityQuery;
    let updateQuantityValues;

    if (status === 'ongoing') {
      updateQuantityQuery = `
        UPDATE equipment_categories 
        SET quantity_available = quantity_available - $1 
        WHERE category_id = $2
      `;
      updateQuantityValues = [quantity_requested, equipment_category_id];
    } else if (status === 'returned') {
      updateQuantityQuery = `
        UPDATE equipment_categories 
        SET quantity_available = quantity_available + $1 
        WHERE category_id = $2
      `;
      updateQuantityValues = [quantity_requested, equipment_category_id];
    }

    if (updateQuantityQuery) {
      await client.query(updateQuantityQuery, updateQuantityValues);
    }

    // Update the status and status_updated_at of the request in the admin_log table
    const updateStatusQuery = `
      UPDATE admin_log 
      SET status = $1, status_updated_at = NOW() 
      WHERE request_id = $2
    `;
    await client.query(updateStatusQuery, [status, request_id]);

    await client.query('COMMIT'); // Commit transaction
    res.status(200).json({ message: 'Request status updated successfully' });
  } catch (error) {
    await client.query('ROLLBACK'); // Rollback transaction on error
    console.error('Error updating request status:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  } finally {
    client.release(); // Release the client back to the pool
  }
};

// Helper function to format time to 'HH:MM:SS'
const formatTime = (timeInput) => {
  try {
    let date;

    if (!timeInput) {
      throw new Error(`Invalid time: ${timeInput}`);
    }

    if (typeof timeInput === 'string') {
      // If it's a full ISO date-time string, parse it
      if (timeInput.includes('T')) {
        date = new Date(timeInput);
      } else {
        // Assume it's 'HH:MM:SS' or 'HH:MM'
        if (/^\d{2}:\d{2}$/.test(timeInput)) {
          timeInput += ':00';
        }
        date = new Date(`1970-01-01T${timeInput}Z`);
      }
    } else if (timeInput instanceof Date) {
      date = timeInput;
    } else {
      throw new Error(`Invalid time input type: ${typeof timeInput}`);
    }

    if (isNaN(date.getTime())) {
      throw new Error(`Invalid time: ${timeInput}`);
    }

    const hours = String(date.getHours()).padStart(2, '0');     // Local hours
    const minutes = String(date.getMinutes()).padStart(2, '0'); // Local minutes
    const seconds = String(date.getSeconds()).padStart(2, '0'); // Local seconds

    return `${hours}:${minutes}:${seconds}`; // 'HH:MM:SS'
  } catch (error) {
    console.error(error.message);
    return null; // or handle as needed
  }
};

// Helper function to format date to 'YYYY-MM-DD'
const formatDate = (dateString) => {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      throw new Error(`Invalid date: ${dateString}`);
    }
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are zero-based
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`; // 'YYYY-MM-DD'
  } catch (error) {
    console.error(error.message);
    return null; // or handle as needed
  }
};

const updateRequestStatus = async (req, res) => {
  const { request_id, status } = req.body;
  const token = req.cookies.token;

  if (!token) {
    return res.status(401).json({ message: 'Unauthorized: No token provided' });
  }

  const validStatuses = ['approved', 'cancelled'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ message: 'Invalid status' });
  }

  const client = await db.connect();
  try {
    await client.query('BEGIN');

    const decoded = jwt.verify(token, JWT_SECRET);
    const adminId = decoded.id;
    const requestApprovedBy = decoded.email;
    const statusUpdatedAt = new Date();
    let approvedAt = null;

    const requestQuery = `
      SELECT r.*, ec.category_name, ec.quantity_available 
      FROM requests r 
      LEFT JOIN equipment_categories ec ON r.equipment_category_id = ec.category_id 
      WHERE r.request_id = $1
    `;
    const { rows } = await client.query(requestQuery, [request_id]);

    if (rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Request not found' });
    }

    const requestDetails = rows[0];
    const currentStatus = requestDetails.status;
    const requesterEmail = requestDetails.email;
    const batchId = requestDetails.batch_id;

    if (currentStatus === 'returned') {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'Cannot change status of a returned request' });
    }

    if (status === 'approved') {
      approvedAt = new Date();
    }

    let updateQuery = `
      UPDATE requests 
      SET admin_id = $1, status = $2, status_updated_at = $3
    `;
    let updateValues = [adminId, status, statusUpdatedAt];

    if (status === 'approved') {
      updateQuery += ', approved_at = $4';
      updateValues.push(approvedAt);
    }

    updateValues.push(request_id);
    updateQuery += ` WHERE request_id = $${updateValues.length}`;

    await client.query(updateQuery, updateValues);

    const insertAdminLogQuery = `
      INSERT INTO admin_log (
        request_id, email, first_name, last_name, department, nature_of_service, purpose, venue, 
        equipment_category_id, quantity_requested, requested, time_requested, return_time, 
        time_borrowed, approved_at, status, status_updated_at, admin_id, batch_id, 
        request_approved_by, mcl_pass_no, released_by, time_returned, received_by, remarks
      ) VALUES (${Array.from({ length: 25 }, (_, i) => `$${i + 1}`).join(', ')})
    `;

    const insertAdminLogValues = [
      requestDetails.request_id,                                                            // 1
      requestDetails.email,                                                                // 2
      requestDetails.first_name,                                                           // 3
      requestDetails.last_name,                                                            // 4
      requestDetails.department,                                                           // 5
      requestDetails.nature_of_service,                                                    // 6
      requestDetails.purpose,                                                              // 7
      requestDetails.venue,                                                                // 8
      requestDetails.equipment_category_id,                                                // 9
      requestDetails.quantity_requested,                                                   // 10
      requestDetails.requested ? formatDate(requestDetails.requested) : null,             // 11 (DATE)
      requestDetails.time_requested ? formatTime(requestDetails.time_requested) : null,   // 12 (TIME)
      requestDetails.return_time ? formatTime(requestDetails.return_time) : null,         // 13 (TIME)
      requestDetails.time_borrowed ? formatTime(requestDetails.time_borrowed) : null,     // 14 (TIME)
      approvedAt ? approvedAt.toISOString() : null,                                        // 15 (TIMESTAMP)
      status,                                                                              // 16
      statusUpdatedAt ? statusUpdatedAt.toISOString() : null,                              // 17 (TIMESTAMP)
      adminId,                                                                             // 18
      requestDetails.batch_id,                                                             // 19
      requestApprovedBy,                                                                   // 20
      requestDetails.mcl_pass_no,                                                          // 21
      requestDetails.released_by,                                                          // 22
      requestDetails.time_returned ? formatTime(requestDetails.time_returned) : null,     // 23 (TIME)
      requestDetails.received_by,                                                           // 24
      requestDetails.remarks                                                               // 25
    ];

    // Add logging to inspect values
    console.log('Inserting into admin_log with values:', insertAdminLogValues);

    // Check for any null values in mandatory fields
    const mandatoryFields = [
      'request_id',
      'email',
      'first_name',
      'last_name',
      'department',
      'equipment_category_id',
      'quantity_requested',
      'time_borrowed',
      'status',
      'status_updated_at',
      'admin_id',
      'batch_id',
      'request_approved_by',
      'mcl_pass_no',
      'released_by',
      // Add any other mandatory fields as needed
    ];

    mandatoryFields.forEach((field, index) => {
      if (!insertAdminLogValues[index]) {
        console.warn(`Warning: Mandatory field ${field} is missing or null.`);
      }
    });

    await client.query(insertAdminLogQuery, insertAdminLogValues);

    await client.query('DELETE FROM requests WHERE request_id = $1', [request_id]);

    const allRequestsQuery = 'SELECT status FROM requests WHERE batch_id = $1';
    const allRequestsResult = await client.query(allRequestsQuery, [batchId]);
    const allRequests = allRequestsResult.rows;

    const allApproved = allRequests.every(req => req.status === 'approved');

    if (allApproved) {
      const approvedRequestsQuery = `
        SELECT al.*, ec.category_name 
        FROM admin_log al 
        LEFT JOIN equipment_categories ec ON al.equipment_category_id = ec.category_id 
        WHERE al.batch_id = $1 AND al.status = 'approved'
      `;
      const approvedRequestsResult = await client.query(approvedRequestsQuery, [batchId]);
      const approvedRequests = approvedRequestsResult.rows;

      const cancelledRequestsQuery = `
        SELECT al.*, ec.category_name 
        FROM admin_log al 
        LEFT JOIN equipment_categories ec ON al.equipment_category_id = ec.category_id 
        WHERE al.batch_id = $1 AND al.status = 'cancelled'
      `;
      const cancelledRequestsResult = await client.query(cancelledRequestsQuery, [batchId]);
      const cancelledRequests = cancelledRequestsResult.rows;

      // Helper functions
      const formatTimeTo12Hour = (time) => {
        if (!time) return null;
        const [hours, minutes] = time.split(':').map(Number);
        const ampm = hours >= 12 ? 'PM' : 'AM';
        const formattedHours = hours % 12 || 12;
        const formattedMinutes = minutes < 10 ? `0${minutes}` : minutes;
        return `${formattedHours}:${formattedMinutes} ${ampm}`;
      };

      const formatDisplayDate = (date) => {
        if (!date) return null;
        const options = { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' };
        return new Date(date).toLocaleDateString('en-US', options);
      };

      const details = {
        firstName: requestDetails.first_name,
        lastName: requestDetails.last_name,
        departmentName: requestDetails.department,
        email: requestDetails.email,
        natureOfService: requestDetails.nature_of_service,
        purpose: requestDetails.purpose,
        venue: requestDetails.venue,
        equipmentCategories: approvedRequests.map(req => ({
          category: req.category_name,
          quantity: req.quantity_requested,
          dateRequested: formatDisplayDate(req.requested),
          timeRequested: formatTimeTo12Hour(req.time_requested),
          returnTime: formatTimeTo12Hour(req.return_time)
        })),
        cancelledDetails: cancelledRequests.length > 0 ? {
          equipmentCategories: cancelledRequests.map(req => ({
            category: req.category_name,
            quantity: req.quantity_requested,
            dateRequested: formatDisplayDate(req.requested),
            timeRequested: formatTimeTo12Hour(req.time_requested),
            returnTime: formatTimeTo12Hour(req.return_time)
          }))
        } : null
      };

      const pdfData = await createInvoice(details);

      // Convert Base64 string to binary buffer
      const pdfBuffer = Buffer.from(pdfData, 'base64');

      // Store binary buffer in database
      await client.query(`
        UPDATE request_history 
        SET approved_requests_receipt = $1 
        WHERE batch_id = $2
      `, [pdfBuffer, batchId]);

      const htmlContent = `
        <!-- Email Content Here -->
      `;

      try {
        await transporter.sendMail({
          from: `"${process.env.EMAIL_NAME}" <${process.env.EMAIL_USER}>`,
          to: requesterEmail,
          subject: `All Requests Approved`,
          text: `All your requests tied to Request Batch ID ${batchId} have been processed.`,
          html: htmlContent,
          attachments: [
            {
              filename: 'ApprovedRequestsReceipt.pdf',
              content: pdfData,
              encoding: 'base64'
            }
          ]
        });
      } catch (emailError) {
        await client.query('ROLLBACK');
        console.error('Error sending email:', emailError);
        return res.status(500).json({ message: 'Failed to send email. Transaction rolled back.' });
      }
    }

    await client.query('COMMIT');
    res.status(200).json({ message: 'Request status updated successfully', requestDetails });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating request status:', error);
    res.status(500).json({ message: 'Internal server error' });
  } finally {
    client.release();
  }
};

const logout = (req, res) => {
  res.clearCookie('token', { httpOnly: true, secure: true, sameSite: 'None' });
  res.status(200).json({ message: 'Logout successful' });
};

const getadminEquipment = async (req, res) => {
  const query = 'SELECT * FROM equipment_categories';
  try {
    console.log('Executing query:', query);
    const [rows] = await db.execute(query);
    console.log('Query result:', rows);

    // Return a successful response with the equipment data
    return res.status(200).json({
      successful: true,
      equipment: rows
    });
  } catch (error) {
    console.error('Error retrieving equipment:', error);
    return res.status(500).json({
      successful: false,
      message: 'Failed to retrieve equipment.'
    });
  }
};

const getAllHistory = async (req, res) => {
  // Query to get all history with category names
  const query = `
    SELECT admin_log.*, equipment_categories.category_name 
    FROM admin_log 
    JOIN equipment_categories 
    ON admin_log.equipment_category_id = equipment_categories.category_id
  `;

  const countApprovedQuery = `
    SELECT COUNT(*) AS approved_count 
    FROM admin_log 
    WHERE status = 'approved'
  `;

  const countOngoingQuery = `
    SELECT COUNT(*) AS ongoing_count 
    FROM admin_log 
    WHERE status = 'ongoing'
  `;

  const countTotalQuery = `
    SELECT COUNT(*) AS total_count 
    FROM admin_log
  `;

  try {
    console.log('Executing query:', query);
    const historyResult = await db.query(query);
    const rows = historyResult.rows;

    console.log('Executing count query:', countApprovedQuery);
    const approvedResult = await db.query(countApprovedQuery);
    const approvedCount = approvedResult.rows[0].approved_count;

    console.log('Executing count query:', countOngoingQuery);
    const ongoingResult = await db.query(countOngoingQuery);
    const ongoingCount = ongoingResult.rows[0].ongoing_count;

    console.log('Executing count query:', countTotalQuery);
    const totalResult = await db.query(countTotalQuery);
    const totalCount = totalResult.rows[0].total_count;

    return res.status(200).json({
      successful: true,
      history: rows,
      approvedCount: approvedCount,
      ongoingCount: ongoingCount,
      totalCount: totalCount
    });
  } catch (error) {
    console.error('Error retrieving borrowing history:', error);
    return res.status(500).json({
      successful: false,
      message: 'Failed to retrieve borrowing history.'
    });
  }
};

const getAllBorrowingRequests = async (req, res) => {
  try {
    // Query to get all borrowing requests with category names
    const query = `
      SELECT requests.*, equipment_categories.category_name 
      FROM requests 
      JOIN equipment_categories 
      ON requests.equipment_category_id = equipment_categories.category_id
    `;

    // Execute the query using db.query instead of db.execute
    const borrowingResult = await db.query(query);
    const rows = borrowingResult.rows;

    // Get the number of rows
    const numberOfRows = rows.length;

    // Return the results and the number of rows in the response
    return res.json({
      successful: true,
      borrowingRequests: rows,
      numberOfRows: numberOfRows,
    });
  } catch (error) {
    console.error('Error fetching borrowing requests:', error);
    return res.status(500).json({
      successful: false,
      message: 'Error fetching borrowing requests.',
      error: error.message,
    });
  }
};

// Middleware to verify the token
const authenticateToken = (req, res, next) => {
  const token = req.cookies.token || 
                (req.headers.authorization && req.headers.authorization.split(' ')[1]);

  if (!token) {
    return res.status(401).sendFile(path.join(__dirname, '..', 'admin', 'Login Page', 'adminLogin.html'));
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).sendFile(path.join(__dirname, '..', 'admin', 'Login Page', 'adminLogin.html'));
    }
    req.admin = decoded;
    next();
  });
};

const getReceipts = async (req, res) => {
  const query = `
    WITH LatestAdminLog AS (
      SELECT 
        rh.batch_id, 
        al.first_name, 
        al.last_name, 
        al.email, 
        al.time_borrowed, 
        rh.requisitioner_form_receipt,
        rh.approved_requests_receipt,
        ROW_NUMBER() OVER (
          PARTITION BY rh.batch_id 
          ORDER BY al.approved_at DESC
        ) AS rn
      FROM request_history rh
      JOIN admin_log al 
        ON rh.batch_id = al.batch_id
    )
    SELECT 
      batch_id, 
      first_name, 
      last_name, 
      email, 
      time_borrowed, 
      requisitioner_form_receipt,
      approved_requests_receipt
    FROM LatestAdminLog
    WHERE rn = 1;
  `;

  try {
    console.log('Executing query:', query);
    const { rows } = await db.query(query);

    // Convert BYTEA data (buffers) to Base64 strings
    const requestHistory = rows.map(row => ({
      batch_id: row.batch_id,
      first_name: row.first_name,
      last_name: row.last_name,
      email: row.email,
      time_borrowed: row.time_borrowed,
      form_receipt: row.requisitioner_form_receipt
        ? row.requisitioner_form_receipt.toString('base64')
        : null,
      approved_receipt: row.approved_requests_receipt
        ? row.approved_requests_receipt.toString('base64')
        : null
    }));

    return res.status(200).json({
      successful: true,
      requestHistory: requestHistory
    });
  } catch (error) {
    console.error('Error retrieving request history:', error);
    return res.status(500).json({
      successful: false,
      message: 'Failed to retrieve request history.'
    });
  }
};

module.exports = {
  login,
  createAdmin,
  updateRequestStatus,
  logout,
  approveAdmin,
  updateRequestStatusTwo,
  authenticateToken,
  getReceipts,
  //need to check functions below:
  getadminEquipment,
  getAllHistory,
  getAllBorrowingRequests
};
