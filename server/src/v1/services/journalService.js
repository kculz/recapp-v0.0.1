const { Journal } = require('../../models');

/**
 * Find all journal entries belonging to a user
 * @param {number} userId
 * @returns {Array<Journal>}
 */
exports.findEntriesByUser = async (userId) => {
  return await Journal.findAll({
    where: { userId },
    order: [['entryDate', 'DESC']]
  });
};

/**
 * Synchronize offline client entries with the database
 * @param {number} userId
 * @param {Array<object>} clientEntries
 * @returns {Array<object>} syncResults
 */
exports.syncJournals = async (userId, clientEntries) => {
  const syncResults = [];

  for (const entry of clientEntries) {
    const { id: clientId, server_id: serverId, title, content, mood, isPrivate, entryDate, syncStatus } = entry;

    try {
      if (syncStatus === 'pending_delete') {
        if (serverId) {
          // Delete from PostgreSQL
          await Journal.destroy({ where: { id: serverId, userId } });
        }
        syncResults.push({
          client_id: clientId,
          server_id: serverId,
          status: 'deleted'
        });
      } 
      
      else if (syncStatus === 'pending_create') {
        // Deduplicate using clientId
        let record = await Journal.findOne({ where: { userId, clientId } });
        
        if (!record) {
          record = await Journal.create({
            userId,
            clientId,
            title,
            content,
            mood,
            isPrivate: isPrivate === true || isPrivate === 1,
            entryDate: entryDate || new Date()
          });
        } else {
          // Update existing duplicate
          record.title = title;
          record.content = content;
          record.mood = mood;
          record.isPrivate = isPrivate === true || isPrivate === 1;
          record.entryDate = entryDate || record.entryDate;
          await record.save();
        }

        syncResults.push({
          client_id: clientId,
          server_id: record.id,
          status: 'synced',
          updatedAt: record.updatedAt
        });
      } 
      
      else if (syncStatus === 'pending_update') {
        if (serverId) {
          await Journal.update({
            title,
            content,
            mood,
            isPrivate: isPrivate === true || isPrivate === 1,
            entryDate: entryDate || new Date()
          }, {
            where: { id: serverId, userId }
          });

          syncResults.push({
            client_id: clientId,
            server_id: serverId,
            status: 'synced'
          });
        } else {
          // Fallback: if server_id is missing but it's pending_update, treat as create
          const record = await Journal.create({
            userId,
            clientId,
            title,
            content,
            mood,
            isPrivate: isPrivate === true || isPrivate === 1,
            entryDate: entryDate || new Date()
          });
          
          syncResults.push({
            client_id: clientId,
            server_id: record.id,
            status: 'synced',
            updatedAt: record.updatedAt
          });
        }
      }
    } catch (err) {
      console.error(`[JournalService] Failed syncing entry: ${clientId}. Error:`, err);
      syncResults.push({
        client_id: clientId,
        server_id: serverId,
        status: 'error',
        error: err.message
      });
    }
  }

  return syncResults;
};
