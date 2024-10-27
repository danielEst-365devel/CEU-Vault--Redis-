const express = require('express');
const equipmentController = require('../controllers/equipment_borrow');
const adminController = require('../controllers/admin_controller');

const prodRouter = express.Router();

// Add login route
prodRouter.post('/login', adminController.login);
prodRouter.post('/create-admin', adminController.createAdmin);
prodRouter.get('/approve-admin', adminController.approveAdmin);
prodRouter.post('/update-status', adminController.updateRequestStatus);
prodRouter.post('/logout', adminController.logout);
prodRouter.post('/release', adminController.updateRequestStatusTwo);
prodRouter.get('/get-adminEquipment', adminController.getadminEquipment);
prodRouter.get('/get-all-history', adminController.getAllHistory);
prodRouter.get('/get-all-requests', adminController.getAllBorrowingRequests);


// Route to submit form and send OTP
prodRouter.post('/insert-details', equipmentController.submitForm);
// Route to verify OTP and submit form data
prodRouter.post('/verify-otp', equipmentController.verifyOTP);
// Route to verify OTP and submit form data
prodRouter.get('/get-equipments', equipmentController.getEquipmentCategories);

module.exports = prodRouter;