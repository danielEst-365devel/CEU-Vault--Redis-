const express = require('express');
const adminController = require('../controllers/admin_controller');
const adminRouter = express.Router();

adminRouter.post('/login', adminController.login);
adminRouter.post('/create-admin', adminController.createAdmin);
adminRouter.get('/approve-admin', adminController.approveAdmin);
adminRouter.post('/update-status', adminController.updateRequestStatus);
adminRouter.post('/logout', adminController.logout);
adminRouter.post('/release', adminController.updateRequestStatusTwo);
adminRouter.get('/get-adminEquipment', adminController.getadminEquipment);
adminRouter.get('/get-all-history', adminController.getAllHistory);
adminRouter.get('/get-all-requests', adminController.getAllBorrowingRequests);
adminRouter.get('/verify-auth', adminController.authenticateToken);
adminRouter.get('/get-receipts', adminController.getReceipts);

module.exports = adminRouter;