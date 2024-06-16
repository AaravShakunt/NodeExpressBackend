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

    // Owner approves or denies a Type 1 pending anomaly
    static async approveType1AnomalyByOwner(anomalyID, ownerAction) {
        try {
            console.log(`Owner action on Type 1 anomaly: Anomaly ID ${anomalyID}, Action: ${ownerAction}`);
            
            // Check if the anomaly exists and is of Type 1 and pending
            const anomalyQuery = 'SELECT anomalyType, anomolousEntID FROM ActiveAnomalies WHERE anomalyID = ? AND anomalyType = ? AND status = ?';
            const anomaly = await queryDatabase(anomalyQuery, [anomalyID, 'Type 1', 'pending']);

            if (anomaly.length === 0) {
                console.log(`Anomaly ID ${anomalyID} not found or not eligible for owner approval.`);
                return { success: false, message: 'Anomaly not found or not eligible for owner approval.' };
            }

            console.log(`Anomaly found: ${JSON.stringify(anomaly[0])}`);
            
            // Update the status based on owner's action and set anomalyLevel to 1
            let newStatus;
            if (ownerAction === 'accept') {
                newStatus = 'approved'; // Owner has accepted the change
            } else if (ownerAction === 'deny') {
                newStatus = 'denied'; // Owner has denied the change
            } else {
                console.log(`Invalid owner action: ${ownerAction}`);
                return { success: false, message: 'Invalid action provided by the owner.' };
            }

            const updateAnomalyQuery = 'UPDATE ActiveAnomalies SET status = ?, anomalyLevel = 1 WHERE anomalyID = ?';
            const updateResult = await queryDatabase(updateAnomalyQuery, [newStatus, anomalyID]);

            console.log(`Status update result: ${JSON.stringify(updateResult)}`);

            return { success: true, message: `Anomaly status updated to ${newStatus}.` };
        } catch (err) {
            console.error(`Error during owner action on anomaly ID ${anomalyID}:`, err);
            throw err;
        }
    }

    // DBA approves the changes for Type 1 or Type 2 anomalies
    static async approveAnomalyByDBA(anomalyID) {
        try {
            console.log(`DBA approving anomaly: Anomaly ID ${anomalyID}`);
            
            // Fetch the anomaly details from ActiveAnomalies
            const anomalyQuery = 'SELECT * FROM ActiveAnomalies WHERE anomalyID = ?';
            const anomaly = await queryDatabase(anomalyQuery, [anomalyID]);

            if (anomaly.length === 0) {
                console.log(`Anomaly ID ${anomalyID} not found for DBA approval.`);
                return { success: false, message: 'Anomaly not found for DBA approval.' };
            }

            const {
                anomalyType,
                anomolousEntID,
                anomolousPermission,
                incorrectRiskTier,
                correctRiskTier,
                startTime,
                status,
                comments
            } = anomaly[0];

            console.log(`Anomaly details: ${JSON.stringify(anomaly[0])}`);

            // Move the anomaly to anomalyLog and update status to 'solved'
            const insertAnomalyLogQuery = `
                INSERT INTO AnomalyLog (anomalyID, anomalyType, entID, status, comments, incorrectRiskTier, correctRiskTier, startTime, endTime)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`;
            await queryDatabase(insertAnomalyLogQuery, [
                anomalyID,
                anomalyType,
                anomolousEntID,
                'solved',
                comments,
                incorrectRiskTier,
                correctRiskTier,
                startTime
            ]);

            console.log(`Anomaly moved to AnomalyLog.`);

            if (anomalyType === 'Type 1') {
                if (status === 'approved') {
                    // Update the risk tier of the entitlement in the Entitlement table
                    const updateEntitlementQuery = 'UPDATE Entitlement SET riskTier = ? WHERE entID = ?';
                    await queryDatabase(updateEntitlementQuery, [correctRiskTier, anomolousEntID]);

                    console.log(`Entitlement risk tier updated.`);

                    // Set the requestable flag to 1 in flagTable
                    const updateFlagTableQuery = 'UPDATE flagTable SET requestable = 1 WHERE entID = ?';
                    await queryDatabase(updateFlagTableQuery, [anomolousEntID]);

                    console.log(`FlagTable updated.`);

                } else if (status === 'denied') {
                    // If denied by owner, add to ExceptionTable and set requestable in flagTable
                    const insertExceptionQuery = `
                        INSERT INTO ExceptionTable (entID, anomalyID, justification)
                        VALUES (?, ?, ?)`;
                    await queryDatabase(insertExceptionQuery, [anomolousEntID, anomalyID, 'Denied by owner']);

                    console.log(`Anomaly added to ExceptionTable.`);

                    // Set the requestable flag to 1 in flagTable
                    const updateFlagTableQuery = 'UPDATE flagTable SET requestable = 1 WHERE entID = ?';
                    await queryDatabase(updateFlagTableQuery, [anomolousEntID]);

                    console.log(`FlagTable updated.`);
                }

                // Remove the anomaly from ActiveAnomalies
                const deleteActiveAnomalyQuery = 'DELETE FROM ActiveAnomalies WHERE anomalyID = ?';
                await queryDatabase(deleteActiveAnomalyQuery, [anomalyID]);

                console.log(`Anomaly removed from ActiveAnomalies.`);

                return { success: true, message: 'Type 1 anomaly processed and moved appropriately.' };

            } else if (anomalyType === 'Type 2') {
                // Update the risk tier of the permission in the RiskReference table
                const updateRiskReferenceQuery = 'UPDATE RiskReference SET riskTier = ? WHERE permission = ?';
                await queryDatabase(updateRiskReferenceQuery, [correctRiskTier, anomolousPermission]);

                console.log(`RiskReference updated.`);

                // Remove the anomaly from ActiveAnomalies
                const deleteActiveAnomalyQuery = 'DELETE FROM ActiveAnomalies WHERE anomalyID = ?';
                await queryDatabase(deleteActiveAnomalyQuery, [anomalyID]);

                console.log(`Anomaly removed from ActiveAnomalies.`);

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
