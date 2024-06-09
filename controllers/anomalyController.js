const Anomaly = require('../model/anomaly');

// Fetch all pending anomalies
const getAllPendingAnomalies = async (req, res) => {
    console.log("fetching anomalies");
    try {
        const anomalies = await Anomaly.getAllPending();
        res.status(200).json(anomalies);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching pending anomalies.' });
    }
};

// Get details of a specific anomaly
const getAnomalyDetails = async (req, res) => {
    const { anomalyID } = req.params;
    try {
        const anomaly = await Anomaly.getById(anomalyID);
        if (anomaly) {
            res.status(200).json(anomaly);
        } else {
            res.status(404).json({ message: 'Anomaly not found.' });
        }
    } catch (err) {
        res.status(500).json({ message: 'Error fetching anomaly details.' });
    }
};

// Approve an anomaly
const approveAnomaly = async (req, res) => {
    const { anomalyID } = req.params;
    try {
        const result = await Anomaly.approveAnomaly(anomalyID);
        if (result.success) {
            res.status(200).json(result);
        } else {
            res.status(404).json(result);
        }
    } catch (err) {
        res.status(500).json({ message: 'Error approving the anomaly.' });
    }
};



module.exports = {
    getAllPendingAnomalies,
    getAnomalyDetails,
    approveAnomaly
};
