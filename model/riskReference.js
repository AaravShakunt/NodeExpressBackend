// Filename: models/RiskReference.js

const { queryDatabase } = require('../config/db');

class RiskReference {
    // Fetch all entries from the riskReference table
    static async getAll() {
        try {
            const query = 'SELECT * FROM riskReference';
            const riskReferences = await queryDatabase(query);
            return riskReferences;
        } catch (err) {
            console.error('Error fetching risk references:', err);
            throw err;
        }
    }

    // Update a specific entry in the riskReference table
    static async updateRiskTier(permission, riskTier) {
        try {
            const query = 'UPDATE riskReference SET riskTier = ? WHERE permission = ?';
            const result = await queryDatabase(query, [riskTier, permission]);
            return result.affectedRows > 0 ? 
                { success: true, message: 'Risk tier updated successfully.' } :
                { success: false, message: 'Permission not found.' };
        } catch (err) {
            console.error('Error updating risk tier:', err);
            throw err;
        }
    }
}

module.exports = RiskReference;
