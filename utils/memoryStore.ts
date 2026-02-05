import { EnvironmentalEvent } from '../types';

const DB_NAME = 'NeuroSyncDB';
const STORE_NAME = 'events';
const DB_VERSION = 1;

class MemoryStore {
  private db: IDBDatabase | null = null;

  private async getDB(): Promise<IDBDatabase> {
    if (this.db) return this.db;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject("Error opening database");

      request.onsuccess = (event) => {
        this.db = (event.target as IDBOpenDBRequest).result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('timestamp', 'timestamp', { unique: false });
          store.createIndex('type', 'type', { unique: false });
        }
      };
    });
  }

  public async addEvent(event: EnvironmentalEvent): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.add(event);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  public async getRecentEvents(limit: number = 50): Promise<EnvironmentalEvent[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('timestamp');
      const request = index.openCursor(null, 'prev');
      const results: EnvironmentalEvent[] = [];

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result as IDBCursorWithValue;
        if (cursor && results.length < limit) {
          results.push(cursor.value);
          cursor.continue();
        } else {
          resolve(results);
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  // Simulates a semantic search by weighing keywords in description and type
  public async searchMemories(query: string): Promise<EnvironmentalEvent[]> {
    const db = await this.getDB();
    const terms = query.toLowerCase().split(' ').filter(t => t.length > 2);
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.openCursor(null, 'prev'); // Search newest first
      const matches: EnvironmentalEvent[] = [];

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result as IDBCursorWithValue;
        if (cursor) {
          const val = cursor.value as EnvironmentalEvent;
          const text = `${val.type} ${val.description}`.toLowerCase();
          
          // Check if all significant terms appear in the memory
          const isMatch = terms.every(term => text.includes(term));
          
          if (isMatch) {
            matches.push(val);
          }
          
          // Hard limit to prevent massive memory usage on search
          if (matches.length < 20) {
              cursor.continue();
          } else {
              resolve(matches);
          }
        } else {
          resolve(matches);
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  public async clearHistory(): Promise<void> {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
          const transaction = db.transaction([STORE_NAME], 'readwrite');
          const store = transaction.objectStore(STORE_NAME);
          store.clear();
          transaction.oncomplete = () => resolve();
          transaction.onerror = () => reject();
      });
  }
}

export const memoryStore = new MemoryStore();
