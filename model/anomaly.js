const { queryDatabase } = require('../config/db');

class Anomaly {
    static async getAllPending() {
        try {
            // Select detailed information from anomalyLog and Entitlement tables
            const query = `
                SELECT 
                    a.anomalyID,
                    a.anomalyType,
                    a.incorrectRiskTier,
                    a.correctRiskTier,
                    e.entID,
                    e.entName,
                    e.ownerID,
                    e.permissions,
                    e.riskTier,
                    e.pbl
                FROM anomalyLog a
                JOIN Entitlement e ON a.entID = e.entID
                WHERE a.status = ?`;
            
            const anomalies = await queryDatabase(query, ['Open']);
            return anomalies;
        } catch (err) {
            console.error('Error fetching pending anomalies:', err);
            throw err;
        }
    }
    static async getById(anomalyID) {
        try {
            const query = `
                SELECT 
                    a.anomalyID,
                    a.anomalyType,
                    a.incorrectRiskTier,
                    a.correctRiskTier,
                    e.entID,
                    e.entName,
                    e.ownerID,
                    e.permissions,
                    e.riskTier,
                    e.pbl
                FROM anomalyLog a
                JOIN Entitlement e ON a.entID = e.entID
                WHERE a.anomalyID = ?`;

            const results = await queryDatabase(query, [anomalyID]);
            return results[0]; // Assuming anomalyID is unique and returns a single result
        } catch (err) {
            console.error('Error fetching anomaly details:', err);
            throw err;
        }
    }
    static async approveAnomaly(anomalyID) {
        try {
            // Fetch the anomaly to get the entID and correctRiskTier
            const anomalyQuery = 'SELECT entID, correctRiskTier FROM anomalyLog WHERE anomalyID = ?';
            const anomaly = await queryDatabase(anomalyQuery, [anomalyID]);

            if (anomaly.length === 0) {
                return { success: false, message: 'Anomaly not found.' };
            }

            const { entID, correctRiskTier } = anomaly[0];

            // Update the anomaly status to 'solved'
            const updateAnomalyQuery = 'UPDATE anomalyLog SET status = ? WHERE anomalyID = ?';
            await queryDatabase(updateAnomalyQuery, ['solved', anomalyID]);

            // Update the risk tier in the Entitlements table
            const updateEntitlementQuery = 'UPDATE Entitlement SET riskTier = ? WHERE entID = ?';
            await queryDatabase(updateEntitlementQuery, [correctRiskTier, entID]);

            return { success: true, message: 'Anomaly approved and updated successfully.' };
        } catch (err) {
            console.error('Error approving the anomaly:', err);
            throw err;
        }
    }

    // Search for anomalies by name
    static async searchByName(anomalyName) {
        try {
            const query = 'SELECT * FROM anomalyLog WHERE anomalyName LIKE ?';
            const results = await queryDatabase(query, [`%${anomalyName}%`]); // Using LIKE for partial matching
            return results;
        } catch (err) {
            console.error('Error searching anomalies by name:', err);
            throw err;
        }
    }
    
}

module.exports = Anomaly;
