const express = require('express');
const equipmentController = require('../controllers/equipment_borrow');
const prodRouter = express.Router();

prodRouter.post('/insert-details', equipmentController.submitForm);
prodRouter.post('/verify-otp', equipmentController.verifyOTP);
prodRouter.get('/get-equipments', equipmentController.getEquipmentCategories);
prodRouter.get('/get-session-data', equipmentController.getSessionData);
module.exports = prodRouter;