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

    // Owner approves a Type 1 pending anomaly
    static async approveType1AnomalyByOwner(anomalyID) {
        try {
            console.log(`Approving Type 1 anomaly by owner: Anomaly ID ${anomalyID}`);
            
            // Check if the anomaly exists and is of Type 1
            const anomalyQuery = 'SELECT anomalyType, anomolousEntID FROM ActiveAnomalies WHERE anomalyID = ? AND anomalyType = ? AND status = ?';
            const anomaly = await queryDatabase(anomalyQuery, [anomalyID, 'Type 1', 'pending']);

            if (anomaly.length === 0) {
                console.log(`Anomaly ID ${anomalyID} not found or not eligible for owner approval.`);
                return { success: false, message: 'Anomaly not found or not eligible for owner approval.' };
            }

            console.log(`Anomaly found: ${JSON.stringify(anomaly[0])}`);
            
            // Update the status to 'pendingDBAApproval'
            const updateAnomalyQuery = 'UPDATE ActiveAnomalies SET status = ? WHERE anomalyID = ?';
            const updateResult = await queryDatabase(updateAnomalyQuery, ['pendingDBAApproval', anomalyID]);

            console.log(`Status update result: ${JSON.stringify(updateResult)}`);

            return { success: true, message: 'Anomaly status updated to pendingDBAApproval.' };
        } catch (err) {
            console.error(`Error during owner approval of anomaly ID ${anomalyID}:`, err);
            throw err;
        }
    }

    // DBA approves the changes for Type 1 or Type 2 anomalies
    static async approveAnomalyByDBA(anomalyID) {
        try {
            console.log(`DBA approving anomaly: Anomaly ID ${anomalyID}`);
            
            // Fetch the anomaly details from ActiveAnomalies
            const anomalyQuery = 'SELECT * FROM ActiveAnomalies WHERE anomalyID = ? AND status = ?';
            const anomaly = await queryDatabase(anomalyQuery, [anomalyID, 'pendingDBAApproval']);

            if (anomaly.length === 0) {
                console.log(`Anomaly ID ${anomalyID} not found or not eligible for DBA approval.`);
                return { success: false, message: 'Anomaly not found or not eligible for DBA approval.' };
            }

            const {
                anomalyType,
                anomolousEntID,
                anomolousPermission,
                incorrectRiskTier,
                correctRiskTier,
                startTime,
                comments
            } = anomaly[0];

            console.log(`Anomaly details: ${JSON.stringify(anomaly[0])}`);
            
            // Move the anomaly to anomalyLog and update status to 'solved'
            const insertAnomalyLogQuery = `
                INSERT INTO AnomalyLog (anomalyID, anomalyType, entID, status, comments, incorrectRiskTier, correctRiskTier, startTime, endTime)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`;
            const insertResult = await queryDatabase(insertAnomalyLogQuery, [
                anomalyID,
                anomalyType,
                anomolousEntID,
                'solved',
                comments,
                incorrectRiskTier,
                correctRiskTier,
                startTime
            ]);

            console.log(`Anomaly moved to AnomalyLog: ${JSON.stringify(insertResult)}`);
            
            // Remove the anomaly from ActiveAnomalies
            const deleteActiveAnomalyQuery = 'DELETE FROM ActiveAnomalies WHERE anomalyID = ?';
            const deleteResult = await queryDatabase(deleteActiveAnomalyQuery, [anomalyID]);

            console.log(`Anomaly removed from ActiveAnomalies: ${JSON.stringify(deleteResult)}`);

            if (anomalyType === 'Type 1') {
                // Update the risk tier of the entitlement in the Entitlement table
                const updateEntitlementQuery = 'UPDATE Entitlement SET riskTier = ? WHERE entID = ?';
                const updateEntitlementResult = await queryDatabase(updateEntitlementQuery, [correctRiskTier, anomolousEntID]);

                console.log(`Entitlement risk tier updated: ${JSON.stringify(updateEntitlementResult)}`);

                // Set the requestable flag to 1 in flagTable
                const updateFlagTableQuery = 'UPDATE flagTable SET requestable = 1 WHERE entID = ?';
                const updateFlagTableResult = await queryDatabase(updateFlagTableQuery, [anomolousEntID]);

                console.log(`FlagTable updated: ${JSON.stringify(updateFlagTableResult)}`);

                return { success: true, message: 'Type 1 anomaly approved and updated successfully.' };
            } else if (anomalyType === 'Type 2') {
                // Update the risk tier of the permission in the RiskReference table
                const updateRiskReferenceQuery = 'UPDATE RiskReference SET riskTier = ? WHERE permission = ?';
                const updateRiskReferenceResult = await queryDatabase(updateRiskReferenceQuery, [correctRiskTier, anomolousPermission]);

                console.log(`RiskReference updated: ${JSON.stringify(updateRiskReferenceResult)}`);

                return { success: true, message: 'Type 2 anomaly approved and updated successfully.' };
            }

            console.log(`Unknown anomaly type for anomaly ID ${anomalyID}.`);
            return { success: false, message: 'Unknown anomaly type.' };
        } catch (err) {
            console.error(`Error during DBA approval of anomaly ID ${anomalyID}:`, err);
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
