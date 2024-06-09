const express = require('express');
const {
    getAllPendingAnomalies,
    getAnomalyDetails,
    approveAnomaly
} = require('../../controllers/anomalyController');

const router = express.Router();

router.get('/pending', getAllPendingAnomalies);
router.get('/:anomalyID', getAnomalyDetails);
router.post('/:anomalyID/approve', approveAnomaly);

module.exports = router;
