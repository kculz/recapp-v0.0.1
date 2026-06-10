import * as SQLite from 'expo-sqlite';

export interface LocalJournal {
  id: string; // client-side UUID
  server_id: number | null;
  title: string;
  content: string;
  mood: 'Calm' | 'Happy' | 'Anxious' | 'Sad' | 'Hopeful' | 'Angry';
  isPrivate: boolean;
  entryDate: string;
  syncStatus: 'synced' | 'pending_create' | 'pending_update' | 'pending_delete';
  updatedAt: string;
}

let dbInstance: SQLite.SQLiteDatabase | null = null;

export const getDb = async () => {
  if (!dbInstance) {
    dbInstance = await SQLite.openDatabaseAsync('recapp_offline.db');
  }
  return dbInstance;
};

export const initDatabase = async (): Promise<void> => {
  try {
    const db = await getDb();
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS journals (
        id TEXT PRIMARY KEY,
        server_id INTEGER,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        mood TEXT NOT NULL,
        is_private INTEGER DEFAULT 1,
        entry_date TEXT NOT NULL,
        sync_status TEXT DEFAULT 'synced',
        updated_at TEXT NOT NULL
      );
    `);
    console.log('[SQLite] Database initialized successfully.');
  } catch (error) {
    console.error('[SQLite] Error initializing database:', error);
    throw error;
  }
};

export const getLocalJournals = async (): Promise<LocalJournal[]> => {
  try {
    const db = await getDb();
    const rows = await db.getAllAsync<any>(
      `SELECT * FROM journals WHERE sync_status != 'pending_delete' ORDER BY entry_date DESC`
    );
    
    return rows.map((row) => ({
      id: row.id,
      server_id: row.server_id,
      title: row.title,
      content: row.content,
      mood: row.mood,
      isPrivate: row.is_private === 1,
      entryDate: row.entry_date,
      syncStatus: row.sync_status,
      updatedAt: row.updated_at
    }));
  } catch (error) {
    console.error('[SQLite] Error fetching local journals:', error);
    return [];
  }
};

export const getPendingSyncJournals = async (): Promise<LocalJournal[]> => {
  try {
    const db = await getDb();
    const rows = await db.getAllAsync<any>(
      `SELECT * FROM journals WHERE sync_status IN ('pending_create', 'pending_update', 'pending_delete')`
    );
    
    return rows.map((row) => ({
      id: row.id,
      server_id: row.server_id,
      title: row.title,
      content: row.content,
      mood: row.mood,
      isPrivate: row.is_private === 1,
      entryDate: row.entry_date,
      syncStatus: row.sync_status,
      updatedAt: row.updated_at
    }));
  } catch (error) {
    console.error('[SQLite] Error fetching pending sync journals:', error);
    return [];
  }
};

export const saveJournalOffline = async (journal: LocalJournal): Promise<void> => {
  try {
    const db = await getDb();
    await db.runAsync(
      `INSERT OR REPLACE INTO journals (id, server_id, title, content, mood, is_private, entry_date, sync_status, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        journal.id,
        journal.server_id,
        journal.title,
        journal.content,
        journal.mood,
        journal.isPrivate ? 1 : 0,
        journal.entryDate,
        journal.syncStatus,
        journal.updatedAt
      ]
    );
    console.log(`[SQLite] Saved journal entry offline: ${journal.id} (${journal.syncStatus})`);
  } catch (error) {
    console.error('[SQLite] Error saving journal offline:', error);
    throw error;
  }
};

export const deleteJournalOffline = async (id: string): Promise<void> => {
  try {
    const db = await getDb();
    const row = await db.getFirstAsync<any>(`SELECT server_id FROM journals WHERE id = ?`, [id]);
    
    if (row && row.server_id) {
      // If it exists on the server, soft-delete it locally so we can sync the delete action
      await db.runAsync(`UPDATE journals SET sync_status = 'pending_delete' WHERE id = ?`, [id]);
      console.log(`[SQLite] Marked journal ${id} for pending deletion.`);
    } else {
      // If it was only local, delete it immediately
      await db.runAsync(`DELETE FROM journals WHERE id = ?`, [id]);
      console.log(`[SQLite] Deleted purely local journal ${id} from SQLite.`);
    }
  } catch (error) {
    console.error('[SQLite] Error deleting journal offline:', error);
    throw error;
  }
};

export const updateSyncMetadata = async (id: string, serverId: number, syncStatus: 'synced', updatedAt: string): Promise<void> => {
  try {
    const db = await getDb();
    await db.runAsync(
      `UPDATE journals SET server_id = ?, sync_status = ?, updated_at = ? WHERE id = ?`,
      [serverId, syncStatus, updatedAt, id]
    );
  } catch (error) {
    console.error('[SQLite] Error updating sync metadata:', error);
    throw error;
  }
};

export const purgeDeletedOffline = async (id: string): Promise<void> => {
  try {
    const db = await getDb();
    await db.runAsync(`DELETE FROM journals WHERE id = ?`, [id]);
    console.log(`[SQLite] Purged deleted journal ${id} from SQLite database.`);
  } catch (error) {
    console.error('[SQLite] Error purging deleted journal:', error);
  }
};
