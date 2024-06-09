// Filename: routes/api/riskReference.js

const express = require('express');
const router = express.Router();
const RiskReference = require('../../model/riskReference');

// Fetch all entries from the riskReference table
router.get('/', async (req, res) => {
    try {
        const riskReferences = await RiskReference.getAll();
        res.json(riskReferences);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch risk references' });
    }
});

// Update a specific entry in the riskReference table
router.put('/', async (req, res) => {
    const { permission, riskTier } = req.body;
    if (!permission || !riskTier) {
        return res.status(400).json({ error: 'Permission and riskTier are required' });
    }

    try {
        const result = await RiskReference.updateRiskTier(permission, riskTier);
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: 'Failed to update risk tier' });
    }
});

module.exports = router;
