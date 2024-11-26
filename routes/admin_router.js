
const express = require('express');
const router = express.Router();
const {
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
} = require('../controllers/admin_actions');

// ...existing code...

router.get('/batch-history/:batchId', authenticateToken, getBatchHistory);

// ...existing code...

module.exports = router;