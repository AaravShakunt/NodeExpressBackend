// Filename: routes/api/anomaly.js

const express = require('express');
const {
    getAllPendingAnomalies,
    getAnomalyDetails,
    approveAnomaly, // Existing method
    approveType1AnomalyByOwner, // New method
    approveAnomalyByDBA // New method
} = require('../../controllers/anomalyController');

const router = express.Router();

router.get('/pending', getAllPendingAnomalies);
router.get('/:anomalyID', getAnomalyDetails);
router.post('/:anomalyID/approve', approveAnomaly);

// New endpoints for owner and DBA approval
router.post('/:anomalyID/owner-approve', approveType1AnomalyByOwner);
router.post('/:anomalyID/dba-approve', approveAnomalyByDBA);

module.exports = router;
