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
    container: `font-family: Arial, sans-serif; text-align: center; padding: 20px; border: 1px solid #ddd; border-radius: 10px; max-width: 600px; margin: auto; background-color: #f9f9f9;`,
    header: `color: #4CAF50; margin-bottom: 20px;`,
    table: `width: 100%; border-collapse: collapse; margin-bottom: 20px;`,
    tableHeader: `border: 1px solid #ddd; padding: 8px; background-color: #f2f2f2;`,
    tableCell: `border: 1px solid #ddd; padding: 8px;`,
    infoBox: `margin-top: 20px; padding: 20px; background-color: #f5f5f5; border-radius: 5px;`
};

// Email templates object
const emailTemplates = {
    // Template for approved/cancelled requests
    requestStatus: (details) => `
    <div style="${EMAIL_STYLES.container}">
      <h1 style="${EMAIL_STYLES.header}">CEU Vault</h1>
      <p style="font-size: 18px; color: #333; margin-bottom: 10px;">Your equipment borrowing requests have been processed.</p>
      
      ${emailTemplates.approvedRequestsTable(details.equipmentCategories)}
      ${details.cancelledDetails ? emailTemplates.cancelledRequestsTable(details.cancelledDetails.equipmentCategories) : ''}
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
      ${items.map(item => emailTemplates.tableRow(item)).join('')}
    </table>
  `,

    // Reusable table component for cancelled requests
    cancelledRequestsTable: (items) => `
    <h2 style="color: #f44336; margin-bottom: 20px;">Cancelled Requests</h2>
    <table style="${EMAIL_STYLES.table}">
      ${emailTemplates.tableHeader()}
      ${items.map(item => emailTemplates.tableRow(item)).join('')}
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
    tableRow: (item) => `
    <tr>
      <td style="${EMAIL_STYLES.tableCell}">${item.category}</td>
      <td style="${EMAIL_STYLES.tableCell}">${item.quantity}</td>
      <td style="${EMAIL_STYLES.tableCell}">${item.dateRequested}</td>
      <td style="${EMAIL_STYLES.tableCell}">${item.timeRequested}</td>
      <td style="${EMAIL_STYLES.tableCell}">${item.returnTime}</td>
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
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const query = `
        SELECT admin_log.*, equipment_categories.category_name 
        FROM admin_log 
        JOIN equipment_categories 
        ON admin_log.equipment_category_id = equipment_categories.category_id
        WHERE admin_log.status IN ('approved', 'ongoing')
        ORDER BY admin_log.status_updated_at DESC
        LIMIT $1 OFFSET $2
    `;

    const countQuery = `
        SELECT 
            COUNT(*) FILTER (WHERE status IN ('approved', 'ongoing')) AS total_count,
            COUNT(*) FILTER (WHERE status = 'approved') AS approved_count,
            COUNT(*) FILTER (WHERE status = 'ongoing') AS ongoing_count
        FROM admin_log
    `;

    try {
        const [requestsResult, countResult] = await Promise.all([
            db.query(query, [limit, offset]),
            db.query(countQuery)
        ]);

        const rows = requestsResult.rows;
        const counts = countResult.rows[0];
        const totalPages = Math.ceil(counts.total_count / limit);

        return res.status(200).json({
            successful: true,
            history: rows,
            pagination: {
                currentPage: page,
                totalPages: totalPages,
                totalItems: parseInt(counts.total_count),
                itemsPerPage: limit
            },
            approvedCount: parseInt(counts.approved_count),
            ongoingCount: parseInt(counts.ongoing_count),
            totalCount: parseInt(counts.total_count)
        });
    } catch (error) {
        console.error('Error retrieving active requests:', error);
        return res.status(500).json({
            successful: false,
            message: 'Failed to retrieve active requests.'
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
            maxAge: rememberMe ? 7 * 24 * 60 * 60 * 1000 : 60 * 60 * 1000 // 7 days or 1 hour
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
    getStatusCounts
};