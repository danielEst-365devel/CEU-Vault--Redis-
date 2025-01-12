const jwt = require('jsonwebtoken');
const { db } = require('../models/connection_db'); // Import the database connection
require('dotenv').config();
const PDFDocument = require('pdfkit');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const adminPdfGenerator = require('./adminPdfGenerator');
const JWT_SECRET = process.env.JWT_SECRET;
const nodemailer = require('nodemailer');

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

// Common styles as constants
const EMAIL_STYLES = {
    container: `
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
        text-align: left;
        padding: 32px;
        border: 1px solid #e0e0e0;
        border-radius: 12px;
        max-width: 650px;
        margin: auto;
        background-color: #ffffff;
        box-shadow: 0 2px 8px rgba(0,0,0,0.05);
    `,
    header: `
        color: #2E7D32;
        margin-bottom: 24px;
        font-size: 1.5rem;
        font-weight: 600;
        letter-spacing: -0.5px;
    `,
    table: `
        width: 100%;
        border-collapse: separate;
        border-spacing: 0;
        margin: 24px 0;
        font-size: 14px;
        background: #ffffff;
        border-radius: 8px;
        overflow: hidden;
        box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
    `,
    tableHeader: `
        background-color: #f8fafc;
        color: #475569;
        font-weight: 600;
        padding: 16px;
        text-align: left;
        font-size: 13px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        border-bottom: 1px solid #e2e8f0;
    `,
    tableCell: `
        padding: 16px;
        color: #1e293b;
        border-bottom: 1px solid #e2e8f0;
        background-color: #ffffff;
        transition: background-color 0.2s;
    `,
    tableCellLast: `
        padding: 16px;
        color: #1e293b;
        background-color: #ffffff;
    `,
    tableRowEven: `
        background-color: #f8fafc;
    `,
    infoBox: `
        margin-top: 24px;
        padding: 20px 24px;
        background-color: #e8f5e9;
        border-radius: 8px;
        border-left: 4px solid #2E7D32;
        color: #1B5E20;
        line-height: 1.5;
    `
};

// Email templates object
const emailTemplates = {
    requestStatus: (details) => `
    <div style="${EMAIL_STYLES.container}">
      <h1 style="${EMAIL_STYLES.header}">CEU Vault</h1>
      <p style="font-size: 18px; color: #333; margin-bottom: 10px;">Your equipment borrowing requests have been processed.</p>
      
      ${emailTemplates.approvedRequestsTable(details.equipmentCategories)}
      ${details.cancelledDetails ? emailTemplates.cancelledRequestsTable(details.cancelledDetails.equipmentCategories) : ''}
      
      <div style="background-color: #f0f7ff; border-left: 4px solid #0066cc; padding: 15px; margin: 20px 0; border-radius: 4px;">
        <p style="font-size: 16px; color: #0066cc; font-weight: bold; margin: 0 0 8px 0;">Next Steps:</p>
        <p style="font-size: 15px; color: #333; line-height: 1.5; margin: 0;">
          Please proceed to the TLTS facility to collect your approved equipment. 
          Bring a valid ID for verification purposes.
        </p>
      </div>

      ${emailTemplates.borrowerDetails(details)}
      
      <p style="font-size: 16px; color: #555; margin-top: 20px;">A PDF copy of your approved requests is attached to this email.</p>
      <p style="font-size: 14px; color: #777;">Thank you for using CEU Vault. If you have any questions, please contact us.</p>
    </div>
    `,


    // Reusable table component for approved requests
    approvedRequestsTable: (items) => `
    <h2 style="${EMAIL_STYLES.header}">Approved Requests</h2>
    <table style="${EMAIL_STYLES.table}">
      ${emailTemplates.tableHeader()}
      ${items.map((item, index, array) => emailTemplates.tableRow(item, index, array)).join('')}
    </table>
  `,

    // Reusable table component for cancelled requests
    cancelledRequestsTable: (items) => `
    <h2 style="color: #f44336; margin-bottom: 20px;">Cancelled Requests</h2>
    <table style="${EMAIL_STYLES.table}">
      ${emailTemplates.tableHeader()}
      ${items.map((item, index, array) => emailTemplates.tableRow(item, index, array)).join('')}
    </table>
  `,

    // Reusable table header
    tableHeader: () => `
    <tr>
      <th style="${EMAIL_STYLES.tableHeader}">Category</th>
      <th style="${EMAIL_STYLES.tableHeader}">Quantity</th>
      <th style="${EMAIL_STYLES.tableHeader}">Date Requested</th>
      <th style="${EMAIL_STYLES.tableHeader}">Time Requested</th>
      <th style="${EMAIL_STYLES.tableHeader}">Return Time</th>
    </tr>
  `,

    // Reusable table row
    tableRow: (item, index, array) => `
    <tr style="${index % 2 === 1 ? EMAIL_STYLES.tableRowEven : ''}">
      <td style="${index === array.length - 1 ? EMAIL_STYLES.tableCellLast : EMAIL_STYLES.tableCell}">${item.category}</td>
      <td style="${index === array.length - 1 ? EMAIL_STYLES.tableCellLast : EMAIL_STYLES.tableCell}">${item.quantity}</td>
      <td style="${index === array.length - 1 ? EMAIL_STYLES.tableCellLast : EMAIL_STYLES.tableCell}">${item.dateRequested}</td>
      <td style="${index === array.length - 1 ? EMAIL_STYLES.tableCellLast : EMAIL_STYLES.tableCell}">${item.timeRequested}</td>
      <td style="${index === array.length - 1 ? EMAIL_STYLES.tableCellLast : EMAIL_STYLES.tableCell}">${item.returnTime}</td>
    </tr>
  `,

    // Reusable borrower details component
    borrowerDetails: (details) => `
    <div style="${EMAIL_STYLES.infoBox}">
      <p style="font-size: 16px; color: #333; margin-bottom: 10px;"><strong>Borrower Details:</strong></p>
      <p style="font-size: 14px; color: #555; margin: 5px 0;">Name: ${details.firstName} ${details.lastName}</p>
      <p style="font-size: 14px; color: #555; margin: 5px 0;">Department: ${details.departmentName}</p>
      <p style="font-size: 14px; color: #555; margin: 5px 0;">Purpose: ${details.purpose}</p>
      <p style="font-size: 14px; color: #555; margin: 5px 0;">Venue: ${details.venue}</p>
    </div>
  `,
    overdueNotification: (details) => `
    <div style="${EMAIL_STYLES.container}">
        <h1 style="${EMAIL_STYLES.header}">CEU Vault - Overdue Equipment Notice</h1>
        
        <div style="background-color: #ffebee; border-left: 4px solid #c62828; padding: 20px; margin: 20px 0; border-radius: 4px;">
            <h2 style="color: #c62828; margin: 0 0 10px 0;">⚠️ OVERDUE NOTICE</h2>
            <p style="margin: 0; color: #333;">Your borrowed equipment is now overdue.</p>
        </div>

        <table style="${EMAIL_STYLES.table}">
            <tr>
                <th style="${EMAIL_STYLES.tableHeader}">Equipment</th>
                <th style="${EMAIL_STYLES.tableHeader}">Quantity</th>
                <th style="${EMAIL_STYLES.tableHeader}">Due Date</th>
                <th style="${EMAIL_STYLES.tableHeader}">Due Time</th>
                <th style="${EMAIL_STYLES.tableHeader}">Overdue Duration</th>
                <th style="${EMAIL_STYLES.tableHeader}">Current Penalty</th>
            </tr>
            <tr>
                <td style="${EMAIL_STYLES.tableCellLast}">${details.equipment}</td>
                <td style="${EMAIL_STYLES.tableCellLast}">${details.quantity}</td>
                <td style="${EMAIL_STYLES.tableCellLast}">${details.dueDate}</td>
                <td style="${EMAIL_STYLES.tableCellLast}">${details.dueTime}</td>
                <td style="${EMAIL_STYLES.tableCellLast}">${details.overdueDuration}</td>
                <td style="${EMAIL_STYLES.tableCellLast}">₱${details.penalty}</td>
            </tr>
        </table>

        <div style="background-color: #fff3e0; padding: 20px; border-radius: 4px; margin: 20px 0;">
            <p style="color: #e65100; font-weight: bold; margin: 0 0 10px 0;">⏰ Penalty System:</p>
            <ul style="margin: 0; color: #333; padding-left: 20px;">
                <li>Penalties are charged per completed hour of being overdue</li>
                <li>Each hour incurs a ₱100 penalty</li>
                <li>No penalty is charged for the first 59 minutes of being overdue</li>
                <li>Example: 1 hour and 5 minutes overdue = ₱100 penalty</li>
                <li>Example: 2 hours and 30 minutes overdue = ₱200 penalty</li>
            </ul>
        </div>

        <p style="color: #333; margin-top: 20px;">
            For immediate assistance, please contact the TLTS office.
        </p>
    </div>
    `
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

        // Get remaining requests for this batch
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

            const pdfData = await adminPdfGenerator.createInvoice(details);

            // Convert Base64 string to binary buffer
            const pdfBuffer = Buffer.from(pdfData, 'base64');

            // Store binary buffer in database
            await client.query(`
          UPDATE request_history 
          SET approved_requests_receipt = $1 
          WHERE batch_id = $2
        `, [pdfBuffer, batchId]);

            const htmlContent = emailTemplates.requestStatus(details);

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

const updateBatchRequestStatus = async (req, res) => {
    const { request_ids, status } = req.body;
    const token = req.cookies.token;

    // Validate input
    if (!Array.isArray(request_ids) || request_ids.length === 0) {
        return res.status(400).json({ message: 'Invalid request: request_ids must be a non-empty array' });
    }

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
        const approvedAt = status === 'approved' ? new Date() : null;

        // Get all request details in a single query
        const requestQuery = `
            SELECT r.*, ec.category_name, ec.quantity_available 
            FROM requests r 
            LEFT JOIN equipment_categories ec ON r.equipment_category_id = ec.category_id 
            WHERE r.request_id = ANY($1)
        `;
        const { rows: requestDetails } = await client.query(requestQuery, [request_ids]);

        if (requestDetails.length !== request_ids.length) {
            await client.query('ROLLBACK');
            return res.status(404).json({ message: 'Some requests not found' });
        }

        // Check for returned requests
        const hasReturnedRequests = requestDetails.some(req => req.status === 'returned');
        if (hasReturnedRequests) {
            await client.query('ROLLBACK');
            return res.status(400).json({ message: 'Cannot change status of returned requests' });
        }

        // Update all requests in a single query
        const updateQuery = `
            UPDATE requests 
            SET admin_id = $1, 
                status = $2, 
                status_updated_at = $3
                ${status === 'approved' ? ', approved_at = $4' : ''}
            WHERE request_id = ANY($${status === 'approved' ? '5' : '4'})
        `;

        const updateValues = [
            adminId,
            status,
            statusUpdatedAt,
            ...(status === 'approved' ? [approvedAt] : []),
            request_ids
        ];

        await client.query(updateQuery, updateValues);

        // Insert into admin_log for all requests
        const insertAdminLogQuery = `
            INSERT INTO admin_log (
                request_id, email, first_name, last_name, department, 
                nature_of_service, purpose, venue, equipment_category_id, 
                quantity_requested, requested, time_requested, return_time, 
                time_borrowed, approved_at, status, status_updated_at, 
                admin_id, batch_id, request_approved_by
            )
            SELECT 
                r.request_id, r.email, r.first_name, r.last_name, r.department,
                r.nature_of_service, r.purpose, r.venue, r.equipment_category_id,
                r.quantity_requested, r.requested, r.time_requested, r.return_time,
                r.time_borrowed::TIME, $1, $2, $3, $4, r.batch_id, $5
            FROM requests r
            WHERE r.request_id = ANY($6)
        `;

        await client.query(insertAdminLogQuery, [
            approvedAt,
            status,
            statusUpdatedAt,
            adminId,
            requestApprovedBy,
            request_ids
        ]);

        // Delete processed requests
        await client.query('DELETE FROM requests WHERE request_id = ANY($1)', [request_ids]);

        // Process batch notifications
        const batchIds = [...new Set(requestDetails.map(req => req.batch_id))];
        for (const batchId of batchIds) {
            const batchRequests = requestDetails.filter(req => req.batch_id === batchId);
            const requesterEmail = batchRequests[0].email;

            // Check if all requests in this batch are processed
            const remainingRequestsQuery = 'SELECT status FROM requests WHERE batch_id = $1';
            const { rows: remainingRequests } = await client.query(remainingRequestsQuery, [batchId]);

            if (remainingRequests.length === 0) {
                // All requests in batch are processed - generate PDF and send email
                const approvedRequestsQuery = `
                    SELECT al.*, ec.category_name 
                    FROM admin_log al 
                    LEFT JOIN equipment_categories ec ON al.equipment_category_id = ec.category_id 
                    WHERE al.batch_id = $1 AND al.status = 'approved'
                `;
                const cancelledRequestsQuery = `
                    SELECT al.*, ec.category_name 
                    FROM admin_log al 
                    LEFT JOIN equipment_categories ec ON al.equipment_category_id = ec.category_id 
                    WHERE al.batch_id = $1 AND al.status = 'cancelled'
                `;

                const [approvedResults, cancelledResults] = await Promise.all([
                    client.query(approvedRequestsQuery, [batchId]),
                    client.query(cancelledRequestsQuery, [batchId])
                ]);

                const approvedRequests = approvedResults.rows;
                const cancelledRequests = cancelledResults.rows;

                // Helper functions (reused from original function)
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
                    firstName: batchRequests[0].first_name,
                    lastName: batchRequests[0].last_name,
                    departmentName: batchRequests[0].department,
                    email: requesterEmail,
                    natureOfService: batchRequests[0].nature_of_service,
                    purpose: batchRequests[0].purpose,
                    venue: batchRequests[0].venue,
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

                const pdfData = await adminPdfGenerator.createInvoice(details);
                const pdfBuffer = Buffer.from(pdfData, 'base64');

                // Store binary buffer in database
                await client.query(`
                    UPDATE request_history 
                    SET approved_requests_receipt = $1 
                    WHERE batch_id = $2
                `, [pdfBuffer, batchId]);

                const htmlContent = emailTemplates.requestStatus(details);

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
                    return res.status(500).json({
                        message: 'Failed to send email. Transaction rolled back.',
                        batchId: batchId
                    });
                }
            }
        }

        await client.query('COMMIT');
        res.status(200).json({
            message: 'Batch request status updated successfully',
            processed: request_ids.length
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error updating batch request status:', error);
        res.status(500).json({ message: 'Internal server error' });
    } finally {
        client.release();
    }
};

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

    const client = await db.connect();

    try {
        await client.query('BEGIN');

        // Get current request details including equipment info
        const requestQuery = `
            SELECT al.*, ec.quantity_available, ec.category_name
            FROM admin_log al
            JOIN equipment_categories ec ON al.equipment_category_id = ec.category_id
            WHERE al.request_id = $1
        `;
        const requestResult = await client.query(requestQuery, [request_id]);
        const request = requestResult.rows[0];

        if (!request) {
            await client.query('ROLLBACK');
            return res.status(404).json({ message: 'Request not found' });
        }

        // Check if MCL Pass exists before allowing release or return
        if ((status === 'ongoing' || status === 'returned') && !request.mcl_pass_no) {
            await client.query('ROLLBACK');
            return res.status(400).json({
                message: 'MCL Pass Number is required before releasing or returning equipment'
            });
        }

        // Check stock availability when attempting to release equipment
        if (status === 'ongoing') {
            const newQuantityAvailable = request.quantity_available - request.quantity_requested;
            if (newQuantityAvailable < 0) {
                await client.query('ROLLBACK');
                return res.status(400).json({
                    message: `Cannot release equipment: Insufficient stock. Available: ${request.quantity_available}, Requested: ${request.quantity_requested}`,
                    category: request.category_name
                });
            }
        }

        // Decode token to get admin information
        const decoded = jwt.verify(token, JWT_SECRET);
        const adminEmail = decoded.email;

        // Build the update query dynamically
        const updates = [];
        const updateValues = [];
        let paramCounter = 1;

        // Always add status and status_updated_at
        updates.push(`status = $${paramCounter}`);
        updateValues.push(status);
        paramCounter++;

        updates.push(`status_updated_at = NOW()`);

        // Add released_by or received_by based on status
        if (status === 'ongoing' && !request.released_by) {
            updates.push(`released_by = $${paramCounter}`);
            updateValues.push(adminEmail);
            paramCounter++;
        } else if (status === 'returned' && !request.received_by) {
            updates.push(`received_by = $${paramCounter}`);
            updateValues.push(adminEmail);
            paramCounter++;
            updates.push(`time_returned = NOW()::TIME`);
        }

        // Add the request_id as the last parameter
        updates.push(`WHERE request_id = $${paramCounter}`);
        updateValues.push(request_id);

        // Construct the final update query
        const updateQuery = `
            UPDATE admin_log 
            SET ${updates.slice(0, -1).join(', ')}
            ${updates[updates.length - 1]}
        `;

        // Execute the update query
        await client.query(updateQuery, updateValues);

        // Handle equipment quantity updates
        const detailsResult = await client.query(
            'SELECT quantity_requested, equipment_category_id FROM admin_log WHERE request_id = $1',
            [request_id]
        );

        if (detailsResult.rows[0]) {
            const { quantity_requested, equipment_category_id } = detailsResult.rows[0];

            if (status === 'ongoing') {
                await client.query(
                    'UPDATE equipment_categories SET quantity_available = quantity_available - $1 WHERE category_id = $2',
                    [quantity_requested, equipment_category_id]
                );
            } else if (status === 'returned' || status === 'cancelled') {
                await client.query(
                    'UPDATE equipment_categories SET quantity_available = quantity_available + $1 WHERE category_id = $2',
                    [quantity_requested, equipment_category_id]
                );
            }
        }

        await client.query('COMMIT');

        res.status(200).json({
            message: 'Request status updated successfully',
            status: status,
            adminEmail: adminEmail
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error updating request status:', error);
        res.status(500).json({ message: 'Internal Server Error' });
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

const getAllHistory = async (req, res) => {
    const client = await db.connect();

    try {
        await client.query('BEGIN');

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;
        const search = req.query.search || '';
        const searchMode = req.query.searchMode || 'general';
        const dateFilter = req.query.dateFilter; // New date filter parameter

        const queryParams = [];
        let whereConditions = ["admin_log.status IN ('cancelled', 'returned')"];

        // Add search conditions
        if (search) {
            if (searchMode === 'batch') {
                whereConditions.push(`CAST(batch_id AS TEXT) ILIKE $${queryParams.length + 1}`);
                queryParams.push(`%${search}%`);
            } else {
                whereConditions.push(`(
                    LOWER(first_name) ILIKE $${queryParams.length + 1} OR
                    LOWER(last_name) ILIKE $${queryParams.length + 1} OR
                    LOWER(email) ILIKE $${queryParams.length + 1}
                )`);
                queryParams.push(`%${search.toLowerCase()}%`);
            }
        }

        // Add date filter conditions
        if (dateFilter) {
            if (dateFilter.startsWith('month:')) {
                const [year, month] = dateFilter.substring(6).split('-').map(Number);
                whereConditions.push(`
                    EXTRACT(YEAR FROM requested) = $${queryParams.length + 1} AND 
                    EXTRACT(MONTH FROM requested) = $${queryParams.length + 2}
                `);
                queryParams.push(year, month);
            } else {
                whereConditions.push(`DATE(requested) = $${queryParams.length + 1}`);
                queryParams.push(dateFilter);
            }
        }

        const whereClause = whereConditions.length ? 'WHERE ' + whereConditions.join(' AND ') : '';

        // Main query
        const mainQuery = `
            SELECT 
                admin_log.*, 
                equipment_categories.category_name 
            FROM admin_log 
            LEFT JOIN equipment_categories 
                ON admin_log.equipment_category_id = equipment_categories.category_id
            ${whereClause}
            ORDER BY admin_log.status_updated_at DESC
            LIMIT $${queryParams.length + 1} 
            OFFSET $${queryParams.length + 2}
        `;

        // Count query
        const countQuery = `
            SELECT COUNT(*) as total_count
            FROM admin_log 
            ${whereClause}
        `;

        // Add limit and offset to main query params
        const mainQueryParams = [...queryParams, limit, offset];

        const [historyResult, countResult] = await Promise.all([
            client.query(mainQuery, mainQueryParams),
            client.query(countQuery, queryParams)
        ]);

        await client.query('COMMIT');

        const totalItems = parseInt(countResult.rows[0].total_count);
        const totalPages = Math.ceil(totalItems / limit);

        return res.status(200).json({
            successful: true,
            history: historyResult.rows,
            pagination: {
                currentPage: page,
                totalPages: totalPages,
                totalItems: totalItems,
                itemsPerPage: limit
            }
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Database error in getAllHistory:', error);
        return res.status(500).json({
            successful: false,
            message: 'Database error while retrieving history.',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    } finally {
        client.release();
    }
};

const getActiveRequests = async (req, res) => {
    const query = `
        WITH PenaltyCalculation AS (
            SELECT 
                admin_log.*,
                equipment_categories.category_name,
                CASE
                    WHEN status = 'ongoing' AND (
                        requested < CURRENT_DATE OR 
                        (requested = CURRENT_DATE AND CURRENT_TIME > return_time::TIME)
                    ) THEN
                        FLOOR(  -- Changed from CEIL to FLOOR to only count completed hours
                            EXTRACT(EPOCH FROM (
                                CURRENT_TIMESTAMP - 
                                (requested::DATE + return_time::TIME)
                            )) / 3600
                        ) * 100
                    ELSE 0
                END as penalty_amount,
                CASE
                    WHEN status = 'ongoing' AND (
                        requested::DATE < CURRENT_DATE OR 
                        (requested::DATE = CURRENT_DATE AND CURRENT_TIME > return_time::TIME)
                    ) THEN
                        EXTRACT(EPOCH FROM (
                            CURRENT_TIMESTAMP - 
                            (requested::DATE + return_time::TIME)
                        )) / 60
                    ELSE NULL
                END as overdue_minutes,
                CASE
                    WHEN status IN ('approved', 'ongoing') AND (
                        requested::DATE > CURRENT_DATE OR 
                        (requested::DATE = CURRENT_DATE AND return_time::TIME > CURRENT_TIME)
                    ) THEN
                        EXTRACT(EPOCH FROM (
                            (requested::DATE + return_time::TIME) - 
                            CURRENT_TIMESTAMP
                        )) / 60
                    ELSE NULL
                END as minutes_until_overdue
            FROM admin_log 
            JOIN equipment_categories 
            ON admin_log.equipment_category_id = equipment_categories.category_id
            WHERE admin_log.status IN ('approved', 'ongoing')
        )
        SELECT 
            *,
            CASE
                WHEN penalty_amount > 0 THEN true
                ELSE false
            END as has_penalty
        FROM PenaltyCalculation
        ORDER BY 
            CASE 
                WHEN overdue_minutes IS NOT NULL THEN 1
                WHEN minutes_until_overdue IS NOT NULL THEN 2
                ELSE 3
            END,
            overdue_minutes DESC,
            minutes_until_overdue ASC
    `;

    const countQuery = `
        SELECT 
            COUNT(*) FILTER (WHERE status = 'approved') AS approved_count,
            COUNT(*) FILTER (WHERE status = 'ongoing') AS ongoing_count,
            COUNT(*) FILTER (WHERE status IN ('approved', 'ongoing')) AS total_count,
            COUNT(*) FILTER (
                WHERE status = 'ongoing' AND (
                    (requested < CURRENT_DATE) OR 
                    (requested = CURRENT_DATE AND CURRENT_TIME > return_time)
                )
            ) AS overdue_count
        FROM admin_log
    `;

    try {
        const [requestsResult, countResult] = await Promise.all([
            db.query(query),
            db.query(countQuery)
        ]);

        const rows = requestsResult.rows.map(row => ({
            ...row,
            penalty_amount: parseInt(row.penalty_amount) || 0,
            formatted_penalty: row.penalty_amount ?
                `₱${parseInt(row.penalty_amount).toLocaleString()}` :
                '₱0',
            time_status: getTimeStatus(row.overdue_minutes, row.minutes_until_overdue),
            formatted_duration: formatDuration(row.overdue_minutes, row.minutes_until_overdue)
        }));

        const counts = countResult.rows[0];

        return res.status(200).json({
            successful: true,
            history: rows,
            approvedCount: parseInt(counts.approved_count),
            ongoingCount: parseInt(counts.ongoing_count),
            totalCount: parseInt(counts.total_count),
            overdueCount: parseInt(counts.overdue_count)
        });
    } catch (error) {
        console.error('Error retrieving active requests:', error);
        return res.status(500).json({
            successful: false,
            message: 'Failed to retrieve active requests.'
        });
    }
};

// Helper function to determine time status
const getTimeStatus = (overdueMinutes, minutesUntilOverdue) => {
    if (overdueMinutes !== null && overdueMinutes > 0) {
        return 'overdue';
    } else if (minutesUntilOverdue !== null && minutesUntilOverdue > 0) {
        return 'upcoming';
    } else {
        return 'on_time';
    }
};

// Helper function to format duration
const formatDuration = (overdueMinutes, minutesUntilOverdue) => {
    const formatTime = (minutes) => {
        if (minutes === null) return '';

        const days = Math.floor(minutes / (24 * 60));
        const hours = Math.floor((minutes % (24 * 60)) / 60);
        const mins = Math.floor(minutes % 60);

        const parts = [];
        if (days > 0) parts.push(`${days}d`);
        if (hours > 0) parts.push(`${hours}h`);
        if (mins > 0) parts.push(`${mins}m`);

        return parts.join(' ') || '0m';
    };

    if (overdueMinutes !== null && overdueMinutes > 0) {
        return `Overdue by ${formatTime(overdueMinutes)}`;
    } else if (minutesUntilOverdue !== null && minutesUntilOverdue > 0) {
        return `Due in ${formatTime(minutesUntilOverdue)}`;
    } else {
        return 'On time';
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

const authenticateToken = (req, res, next) => {
    const token = req.cookies.token ||
        (req.headers.authorization && req.headers.authorization.split(' ')[1]);

    // If no token and it's an API request, return 401
    if (!token && req.xhr) {
        return res.status(401).json({ message: 'No token provided' });
    }

    // If no token and it's a page request, redirect to sign-in
    if (!token && !req.xhr) {
        // Prevent redirect loops by checking current path
        if (!req.path.includes('/sign-in')) {
            return res.redirect('/admin/sign-in/');
        }
        return next();
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        if (Date.now() >= decoded.exp * 1000) {
            if (req.xhr) {
                return res.status(401).json({ message: 'Token expired' });
            }
            return res.redirect('/admin/sign-in/');
        }

        req.admin = decoded;
        next();
    } catch (err) {
        console.error('Token verification failed:', err.message);
        if (req.xhr) {
            return res.status(403).json({ message: 'Invalid token' });
        }
        return res.redirect('/admin/sign-in/');
    }
};

const verifyToken = (req, res) => {
    const token = req.cookies.token ||
        (req.headers.authorization && req.headers.authorization.split(' ')[1]);

    if (!token) {
        return res.status(401).json({ message: 'No token found' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        if (Date.now() >= decoded.exp * 1000) {
            return res.status(401).json({ message: 'Token expired' });
        }

        return res.status(200).json({
            message: 'Valid token',
            admin: {
                id: decoded.id,
                email: decoded.email
            }
        });
    } catch (err) {
        return res.status(403).json({ message: 'Invalid token' });
    }
};

const getReceipts = async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const search = req.query.search || '';
    const searchMode = req.query.searchMode || 'general';

    let whereClause = 'WHERE rn = 1';
    const queryParams = [limit, offset];
    let paramCount = 3;

    if (search) {
        if (searchMode === 'batch') {
            whereClause += ` AND CAST(batch_id AS TEXT) ILIKE $${paramCount}`;
            queryParams.push(`%${search}%`);
        } else {
            whereClause += ` AND (
                LOWER(first_name) ILIKE $${paramCount} OR
                LOWER(last_name) ILIKE $${paramCount} OR
                LOWER(email) ILIKE $${paramCount}
            )`;
            queryParams.push(`%${search.toLowerCase()}%`);
        }
        paramCount++;
    }

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
      SELECT * FROM LatestAdminLog
      ${whereClause}
      ORDER BY batch_id DESC
      LIMIT $1 OFFSET $2;
    `;

    const countQuery = `
      SELECT COUNT(DISTINCT batch_id) as total_count
      FROM request_history;
    `;

    try {
        const [receiptsResult, countResult] = await Promise.all([
            db.query(query, queryParams),
            db.query(countQuery)
        ]);

        const rows = receiptsResult.rows;
        const totalItems = parseInt(countResult.rows[0].total_count);
        const totalPages = Math.ceil(totalItems / limit);

        // Convert BYTEA data to Base64 strings
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
            requestHistory: requestHistory,
            pagination: {
                currentPage: page,
                totalPages: totalPages,
                totalItems: totalItems,
                itemsPerPage: limit
            }
        });
    } catch (error) {
        console.error('Error retrieving request history:', error);
        return res.status(500).json({
            successful: false,
            message: 'Failed to retrieve request history.'
        });
    }
};

const login = async (req, res) => {
    const { email, password, rememberMe } = req.body;

    try {
        // Fetch admin details from the database using PostgreSQL syntax
        const results = await db.query('SELECT * FROM admins WHERE email = $1', [email]);
        const admin = results.rows[0];

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

        // Set token expiration based on rememberMe
        const expiresIn = rememberMe ? '7d' : '1h';

        // Generate JWT token with dynamic expiration
        const token = jwt.sign(
            { id: admin.admin_id, email: admin.email },
            JWT_SECRET,
            { expiresIn }
        );

        // Set cookie options based on rememberMe
        const cookieOptions = {
            httpOnly: true,
            secure: true,
            sameSite: 'None',
            maxAge: rememberMe ? 7 * 24 * 60 * 60 * 0 : 60 * 60 * 1000 // 7 days or 1 hour
        };

        // Set token in cookie with options
        res.cookie('token', token, cookieOptions);

        res.status(200).json({ message: 'Login successful' });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

const updateEquipmentCategory = async (req, res) => {
    const { categoryId } = req.params;
    const { category_name, quantity_available } = req.body;

    try {
        // Input validation
        if (!categoryId || (!category_name && quantity_available === undefined)) {
            return res.status(400).json({
                successful: false,
                message: 'Missing required fields'
            });
        }

        // Build dynamic query based on provided fields
        let updateQuery = 'UPDATE equipment_categories SET ';
        const updateValues = [];
        const updates = [];
        let paramCount = 1;

        if (category_name) {
            updates.push(`category_name = $${paramCount}`);
            updateValues.push(category_name);
            paramCount++;
        }

        if (quantity_available !== undefined) {
            updates.push(`quantity_available = $${paramCount}`);
            updateValues.push(quantity_available);
            paramCount++;
        }

        updateQuery += updates.join(', ');
        updateQuery += ` WHERE category_id = $${paramCount} RETURNING *`;
        updateValues.push(categoryId);

        // Execute update query
        const result = await db.query(updateQuery, updateValues);

        if (result.rows.length === 0) {
            return res.status(404).json({
                successful: false,
                message: 'Equipment category not found'
            });
        }

        res.status(200).json({
            successful: true,
            message: 'Equipment category updated successfully',
            data: result.rows[0]
        });

    } catch (error) {
        console.error('Error updating equipment category:', error);
        res.status(500).json({
            successful: false,
            message: 'Failed to update equipment category'
        });
    }
};

const deleteEquipmentCategory = async (req, res) => {
    const { categoryId } = req.params;

    try {
        // Check if category exists and can be deleted
        const checkQuery = `
            SELECT COUNT(*) as count 
            FROM admin_log 
            WHERE equipment_category_id = $1
        `;
        const checkResult = await db.query(checkQuery, [categoryId]);

        if (checkResult.rows[0].count > 0) {
            return res.status(400).json({
                successful: false,
                message: 'Cannot delete category: It is referenced in borrowing history'
            });
        }

        // Delete the category
        const deleteQuery = `
            DELETE FROM equipment_categories 
            WHERE category_id = $1 
            RETURNING *
        `;
        const result = await db.query(deleteQuery, [categoryId]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                successful: false,
                message: 'Equipment category not found'
            });
        }

        res.status(200).json({
            successful: true,
            message: 'Equipment category deleted successfully',
            data: result.rows[0]
        });

    } catch (error) {
        console.error('Error deleting equipment category:', error);
        res.status(500).json({
            successful: false,
            message: 'Failed to delete equipment category'
        });
    }
};

const addEquipmentCategory = async (req, res) => {
    const { category_name, quantity_available } = req.body;

    try {
        // Input validation
        if (!category_name || quantity_available === undefined) {
            return res.status(400).json({
                successful: false,
                message: 'Missing required fields'
            });
        }

        // Check if category name already exists
        const checkQuery = 'SELECT * FROM equipment_categories WHERE category_name = $1';
        const checkResult = await db.query(checkQuery, [category_name]);

        if (checkResult.rows.length > 0) {
            return res.status(400).json({
                successful: false,
                message: 'Category name already exists'
            });
        }

        // Insert new category
        const insertQuery = `
            INSERT INTO equipment_categories (category_name, quantity_available) 
            VALUES ($1, $2) 
            RETURNING *
        `;
        const result = await db.query(insertQuery, [category_name, quantity_available]);

        res.status(201).json({
            successful: true,
            message: 'Equipment category added successfully',
            data: result.rows[0]
        });

    } catch (error) {
        console.error('Error adding equipment category:', error);
        res.status(500).json({
            successful: false,
            message: 'Failed to add equipment category'
        });
    }
};

const resetEquipment = async (req, res) => {
    const client = await db.connect();

    try {
        await client.query('BEGIN');

        // Set equipment_category_id to NULL in related tables
        await client.query('UPDATE admin_log SET equipment_category_id = NULL WHERE equipment_category_id IS NOT NULL');
        await client.query('UPDATE requests SET equipment_category_id = NULL WHERE equipment_category_id IS NOT NULL');

        // Delete all records instead of truncate
        await client.query('DELETE FROM equipment_categories');

        // Reset the sequence
        await client.query('ALTER SEQUENCE equipment_categories_category_id_seq RESTART WITH 1');

        // Insert default equipment
        const defaultEquipment = `
            INSERT INTO equipment_categories (category_name, quantity_available) VALUES 
            ('DLP-LCD Projector', 100),
            ('Laptop', 100),
            ('Overhead Projector', 100),
            ('VHS Player', 100),
            ('Sound System', 100),
            ('DVD Player', 100),
            ('VCD Player', 100),
            ('CD Cassette Player', 100),
            ('Karaoke', 100),
            ('Microphone', 100),
            ('Document Camera', 100),
            ('Digital Video Camera', 100),
            ('Digital Still Camera', 100),
            ('Audio Voltage Regulator', 100),
            ('Amplifier', 100),
            ('Audio Mixer', 100),
            ('Stereo Graphic Equalizer', 100),
            ('Globe Map', 100),
            ('Television Set', 100),
            ('Tripod', 100),
            ('Microphone Stand', 100),
            ('Wireless Microphone', 100),
            ('Lapel Microphone', 100),
            ('Radio Cassette', 100),
            ('Projector Screen', 100),
            ('External Hard Drive', 100)
        `;

        await client.query(defaultEquipment);
        await client.query('COMMIT');

        res.status(200).json({
            successful: true,
            message: 'Equipment inventory reset successfully'
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error resetting equipment inventory:', error);
        res.status(500).json({
            successful: false,
            message: 'Failed to reset equipment inventory'
        });
    } finally {
        client.release();
    }
};

const { createInventoryStatus } = require('./inventoryStatusPDF');

const generateInventoryPDF = async (req, res) => {
    try {
        const { inventoryData } = req.body;
        const pdfBuffer = await createInventoryStatus(inventoryData);

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=inventory-status-${new Date().toISOString().split('T')[0]}.pdf`);

        // Convert base64 to buffer and send
        const buffer = Buffer.from(pdfBuffer, 'base64');
        res.send(buffer);
    } catch (error) {
        console.error('Error generating PDF:', error);
        res.status(500).json({
            successful: false,
            message: 'Error generating PDF'
        });
    }
};

const getStatusCounts = async (req, res) => {
    try {
        const query = `
            SELECT 
                COUNT(*) FILTER (WHERE status = 'approved') as approved_count,
                COUNT(*) FILTER (WHERE status = 'ongoing') as ongoing_count,
                COUNT(*) as total_count
            FROM admin_log
        `;

        const result = await db.query(query);
        const counts = result.rows[0];

        return res.status(200).json({
            successful: true,
            counts: {
                approved: parseInt(counts.approved_count),
                ongoing: parseInt(counts.ongoing_count),
                total: parseInt(counts.total_count)
            }
        });
    } catch (error) {
        console.error('Error getting status counts:', error);
        return res.status(500).json({
            successful: false,
            message: 'Failed to retrieve status counts.'
        });
    }
};

const updateRequestDetails = async (req, res) => {
    const { request_id, mcl_pass_no, remarks } = req.body;

    if (!request_id) {
        return res.status(400).json({
            successful: false,
            message: 'Request ID is required'
        });
    }

    const client = await db.connect();

    try {
        await client.query('BEGIN');

        // Build update query dynamically based on provided fields
        const updates = [];
        const values = [];
        let paramCount = 1;

        if (mcl_pass_no !== undefined) {
            updates.push(`mcl_pass_no = $${paramCount}`);
            values.push(mcl_pass_no);
            paramCount++;
        }

        if (remarks !== undefined) {
            updates.push(`remarks = $${paramCount}`);
            values.push(remarks);
            paramCount++;
        }

        if (updates.length === 0) {
            throw new Error('No fields to update');
        }

        values.push(request_id); // Add request_id as the last parameter

        const updateQuery = `
            UPDATE admin_log 
            SET ${updates.join(', ')}
            WHERE request_id = $${paramCount}
            RETURNING *
        `;

        const result = await client.query(updateQuery, values);

        if (result.rows.length === 0) {
            throw new Error('Request not found');
        }

        await client.query('COMMIT');

        res.status(200).json({
            successful: true,
            message: 'Request details updated successfully',
            data: result.rows[0]
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error updating request details:', error);
        res.status(500).json({
            successful: false,
            message: 'Failed to update request details'
        });
    } finally {
        client.release();
    }
};

const checkAndNotifyOverdueItems = async () => {
    const client = await db.connect();
    try {
        await client.query("SET timezone = 'Asia/Manila'");

        const query = `
            WITH OverdueCalculation AS (
                SELECT 
                    al.*,
                    ec.category_name,
                    CASE
                        WHEN status = 'ongoing' AND (
                            requested < CURRENT_DATE OR 
                            (requested = CURRENT_DATE AND CURRENT_TIME > return_time::TIME)
                        ) THEN
                            FLOOR(  -- Only count completed hours
                                EXTRACT(EPOCH FROM (
                                    CURRENT_TIMESTAMP - 
                                    (requested::DATE + return_time::TIME)
                                )) / 3600
                            ) * 100
                        ELSE 0
                    END as penalty_amount,
                    EXTRACT(EPOCH FROM (
                        CURRENT_TIMESTAMP - 
                        (requested::DATE + return_time::TIME)
                    )) / 60 as minutes_overdue
                FROM admin_log al
                JOIN equipment_categories ec ON al.equipment_category_id = ec.category_id
                WHERE 
                    al.status = 'ongoing'
                    AND CURRENT_TIMESTAMP > (al.requested + al.return_time::TIME)
                    AND (
                        al.last_notification_sent IS NULL 
                        OR 
                        CURRENT_TIMESTAMP - al.last_notification_sent >= INTERVAL '1 hour'
                    )
            )
            SELECT *
            FROM OverdueCalculation
            WHERE minutes_overdue > 0
            ORDER BY minutes_overdue DESC
        `;

        const { rows: overdueItems } = await client.query(query);

        for (const item of overdueItems) {
            const minutesOverdue = Math.floor(item.minutes_overdue);
            const hours = Math.floor(minutesOverdue / 60);
            const minutes = minutesOverdue % 60;
            const penalty = item.penalty_amount;

            const dueDateTime = new Date(item.requested);
            const [dueHours, dueMinutes] = item.return_time.split(':');
            dueDateTime.setHours(parseInt(dueHours, 10), parseInt(dueMinutes, 10), 0);

            const overdueDuration = hours > 0
                ? `${hours} hour${hours > 1 ? 's' : ''} ${minutes} minute${minutes !== 1 ? 's' : ''}`
                : `${minutes} minute${minutes !== 1 ? 's' : ''}`;

            const emailDetails = {
                equipment: item.category_name,
                quantity: item.quantity_requested,
                dueDate: dueDateTime.toLocaleDateString('en-US', {
                    weekday: 'short',
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                }),
                dueTime: dueDateTime.toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true
                }),
                overdueDuration: overdueDuration,
                penalty: penalty
            };

            try {
                await transporter.sendMail({
                    from: `"${process.env.EMAIL_NAME}" <${process.env.EMAIL_USER}>`,
                    to: item.email,
                    subject: '🚨 OVERDUE EQUIPMENT NOTICE - Action Required',
                    html: emailTemplates.overdueNotification(emailDetails)
                });

                await client.query(
                    'UPDATE admin_log SET last_notification_sent = CURRENT_TIMESTAMP WHERE log_id = $1',
                    [item.log_id]
                );

                console.log(`Overdue notification sent to ${item.email} for ${item.category_name} (${overdueDuration} overdue)`);
            } catch (emailError) {
                console.error('Failed to send overdue notification:', emailError, {
                    logId: item.log_id,
                    email: item.email,
                    overdueDuration: overdueDuration
                });
            }
        }
    } catch (error) {
        console.error('Error checking overdue items:', error);
    } finally {
        client.release();
    }
};

module.exports = {
    updateRequestStatus,
    updateRequestStatusTwo,
    logout,
    getadminEquipment,
    getAllHistory,
    getActiveRequests,
    getAllBorrowingRequests,
    authenticateToken,
    verifyToken,
    getReceipts,
    login,
    updateEquipmentCategory,
    deleteEquipmentCategory,
    addEquipmentCategory,
    resetEquipment,
    generateInventoryPDF,
    getStatusCounts,
    updateRequestDetails,
    updateBatchRequestStatus,
    checkAndNotifyOverdueItems
};