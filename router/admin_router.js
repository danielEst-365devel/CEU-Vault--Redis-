const express = require('express');
const adminController = require('../controllers/admin_controller');
const { authenticateToken } = require('../controllers/admin_controller');
const adminRouter = express.Router();

adminRouter.post('/login', adminController.login);
adminRouter.post('/create-admin', adminController.createAdmin);
adminRouter.get('/verify-login', adminController.verifyToken);
adminRouter.get('/approve-admin', adminController.approveAdmin); 
adminRouter.get('/confirm-admin', adminController.confirmAdmin); 

adminRouter.use((req, res, next) => {
  if (req.path.includes('/sign-in/') || req.path.includes('/assets/')) {
    return next();
  }
  authenticateToken(req, res, next);
});

adminRouter.post('/update-status', adminController.updateRequestStatus);
adminRouter.post('/logout', adminController.logout);
adminRouter.post('/release', adminController.updateRequestStatusTwo);
adminRouter.get('/get-adminEquipment', adminController.getadminEquipment);
adminRouter.get('/get-all-history', adminController.getAllHistory);
adminRouter.get('/get-all-requests', adminController.getAllBorrowingRequests);
adminRouter.get('/verify-auth', adminController.authenticateToken);
adminRouter.get('/get-receipts', adminController.getReceipts);
adminRouter.put('/update-equipment/:categoryId', adminController.updateEquipmentCategory);
adminRouter.delete('/equipment-categories/:categoryId', adminController.deleteEquipmentCategory);
adminRouter.post('/equipment-categories', adminController.addEquipmentCategory);
adminRouter.post('/reset-equipment', adminController.resetEquipment);
adminRouter.post('/generate-inventory-pdf', adminController.generateInventoryPDF);
adminRouter.get('/get-active-requests', adminController.getActiveRequests);
adminRouter.get('/get-status-counts', adminController.getStatusCounts); 


module.exports = adminRouter;