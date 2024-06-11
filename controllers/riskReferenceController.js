// Filename: controllers/riskReferenceController.js

const RiskReference = require('../model/riskReference');

// Controller function to get risk references for an anomaly
const getRiskReferencesForAnomaly = async (req, res) => {
    const { anomalyID } = req.params;
    try {
        const result = await RiskReference.getRiskReferencesForAnomaly(anomalyID);
        if (result.success) {
            res.status(200).json(result.data);
        } else {
            res.status(404).json({ message: result.message });
        }
    } catch (err) {
        res.status(500).json({ message: 'Error fetching risk references for the anomaly.' });
    }
};

module.exports = {
    getRiskReferencesForAnomaly
};
