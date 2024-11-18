const express = require('express');
const adminController = require('../controllers/admin_controller');
const adminRouter = express.Router();

adminRouter.post('/login', adminController.login);
adminRouter.post('/create-admin', adminController.createAdmin);
adminRouter.post('/update-status', adminController.updateRequestStatus);
adminRouter.post('/logout', adminController.logout);
adminRouter.post('/release', adminController.updateRequestStatusTwo);

adminRouter.get('/get-adminEquipment', adminController.getadminEquipment);
adminRouter.get('/get-all-history', adminController.getAllHistory);
adminRouter.get('/get-all-requests', adminController.getAllBorrowingRequests);
adminRouter.get('/verify-auth', adminController.authenticateToken);
adminRouter.get('/get-receipts', adminController.getReceipts);
adminRouter.get('/verify-login', adminController.verifyToken);
adminRouter.get('/confirm-admin', adminController.confirmAdmin);
adminRouter.get('/approve-admin', adminController.approveAdmin);

adminRouter.put('/update-equipment/:categoryId', adminController.updateEquipmentCategory);
adminRouter.delete('/equipment-categories/:categoryId', adminController.deleteEquipmentCategory);
adminRouter.post('/equipment-categories', adminController.addEquipmentCategory);
adminRouter.post('/reset-equipment', adminController.resetEquipment);

module.exports = adminRouter;