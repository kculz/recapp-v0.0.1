import { useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { 
  LocalJournal, 
  getLocalJournals, 
  getPendingSyncJournals, 
  saveJournalOffline, 
  deleteJournalOffline, 
  updateSyncMetadata, 
  purgeDeletedOffline 
} from '../utils/db';

const generateUUID = () => {
  return 'journal_' + Math.random().toString(36).substring(2, 15) + '_' + Date.now().toString(36);
};

export const useJournal = () => {
  const { userToken, apiUrl } = useAuth();
  const [journals, setJournals] = useState<LocalJournal[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  const loadJournals = useCallback(async () => {
    const local = await getLocalJournals();
    setJournals(local);
  }, []);

  const syncWithServer = useCallback(async () => {
    if (!userToken) return;
    setIsSyncing(true);
    setSyncError(null);

    try {
      const pending = await getPendingSyncJournals();

      if (pending.length > 0) {
        // 1. Upload local modifications to backend sync endpoint
        const response = await fetch(`${apiUrl}/journals/sync`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${userToken}`
          },
          body: JSON.stringify({ entries: pending })
        });

        if (!response.ok) {
          throw new Error(`Server sync failed: ${response.statusText}`);
        }

        const resData = await response.json();
        if (resData.success && resData.data?.synced) {
          const syncedItems = resData.data.synced;
          
          for (const item of syncedItems) {
            const { client_id, server_id, status, updatedAt } = item;
            
            if (status === 'deleted') {
              await purgeDeletedOffline(client_id);
            } else if (status === 'synced') {
              await updateSyncMetadata(client_id, server_id, 'synced', updatedAt || new Date().toISOString());
            }
          }
        }
      }

      // 2. Pull down fresh records from server database to reconcile local SQLite
      const responsePull = await fetch(`${apiUrl}/journals`, {
        headers: {
          'Authorization': `Bearer ${userToken}`
        }
      });

      if (responsePull.ok) {
        const pullData = await responsePull.json();
        if (pullData.success && Array.isArray(pullData.data)) {
          const serverEntries = pullData.data;

          for (const sEntry of serverEntries) {
            const localJ: LocalJournal = {
              id: sEntry.clientId || `server_sync_${sEntry.id}`,
              server_id: sEntry.id,
              title: sEntry.title,
              content: sEntry.content,
              mood: sEntry.mood,
              isPrivate: sEntry.isPrivate,
              entryDate: sEntry.entryDate,
              syncStatus: 'synced',
              updatedAt: sEntry.updatedAt
            };
            await saveJournalOffline(localJ);
          }
        }
      }
    } catch (err: any) {
      console.warn('[Sync] Sync failed (offline mode active):', err.message);
      setSyncError(err.message || 'Offline mode active.');
    } finally {
      setIsSyncing(false);
      await loadJournals();
    }
  }, [userToken, apiUrl, loadJournals]);

  const addJournal = async (title: string, content: string, mood: LocalJournal['mood'], isPrivate: boolean) => {
    const now = new Date().toISOString();
    const newJournal: LocalJournal = {
      id: generateUUID(),
      server_id: null,
      title,
      content,
      mood,
      isPrivate,
      entryDate: now,
      syncStatus: 'pending_create',
      updatedAt: now
    };

    await saveJournalOffline(newJournal);
    await loadJournals();
    
    // Attempt background sync
    syncWithServer().catch(err => console.log('Sync failed in background:', err));
  };

  const editJournal = async (id: string, serverId: number | null, title: string, content: string, mood: LocalJournal['mood'], isPrivate: boolean, originalDate: string) => {
    const now = new Date().toISOString();
    
    // Determine sync state
    const currentStatus = journals.find(j => j.id === id)?.syncStatus;
    const syncStatus = currentStatus === 'pending_create' ? 'pending_create' : 'pending_update';

    const updatedJournal: LocalJournal = {
      id,
      server_id: serverId,
      title,
      content,
      mood,
      isPrivate,
      entryDate: originalDate,
      syncStatus,
      updatedAt: now
    };

    await saveJournalOffline(updatedJournal);
    await loadJournals();

    // Attempt background sync
    syncWithServer().catch(err => console.log('Sync failed in background:', err));
  };

  const removeJournal = async (id: string) => {
    await deleteJournalOffline(id);
    await loadJournals();

    // Attempt background sync
    syncWithServer().catch(err => console.log('Sync failed in background:', err));
  };

  return {
    journals,
    isSyncing,
    syncError,
    loadJournals,
    addJournal,
    editJournal,
    removeJournal,
    syncWithServer
  };
};
