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
    static async getRiskReferencesForAnomaly(anomalyID) {
        try {
            // Query to get the permissions for the given anomalyID
            const anomalyQuery = `
                SELECT e.permissions
                FROM anomalyLog a
                JOIN Entitlement e ON a.entID = e.entID
                WHERE a.anomalyID = ?`;
            const anomalyResult = await queryDatabase(anomalyQuery, [anomalyID]);

            if (anomalyResult.length === 0) {
                return { success: false, message: 'Anomaly not found.' };
            }

            // Get the permissions and split by comma
            const { permissions } = anomalyResult[0];
            const permissionList = permissions.split(',').map(p => p.trim());

            // Construct the query for riskReference table
            const placeholders = permissionList.map(() => '?').join(', ');
            const riskReferenceQuery = `
                SELECT permission, riskTier
                FROM riskReference
                WHERE permission IN (${placeholders})`;

            const riskReferences = await queryDatabase(riskReferenceQuery, permissionList);
            return { success: true, data: riskReferences };
        } catch (err) {
            console.error('Error fetching risk references for anomaly:', err);
            throw err;
        }
    }
}

module.exports = RiskReference;
