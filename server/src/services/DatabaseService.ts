import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import path from 'path';
import fs from 'fs';

export class DatabaseService {
  private db: Database | null = null;
  private dbPath = path.join(process.cwd(), 'server-data', 'manager.db');

  async initialize(): Promise<void> {
    const dataDir = path.dirname(this.dbPath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    this.db = await open({
      filename: this.dbPath,
      driver: sqlite3.Database
    });

    await this.migrate();
    console.log('Database initialized at ' + this.dbPath);
  }

  private async migrate(): Promise<void> {
    if (!this.db) return;

    // Create settings table
    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT
      )
    `);

    // Create server_events table for history
    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS server_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT,
        message TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  async getSetting(key: string): Promise<string | null> {
    if (!this.db) throw new Error('Database not initialized');
    const result = await this.db.get('SELECT value FROM settings WHERE key = ?', key);
    return result ? result.value : null;
  }

  async setSetting(key: string, value: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    await this.db.run(
      'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
      key,
      value
    );
  }

  async logEvent(type: string, message: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    await this.db.run(
      'INSERT INTO server_events (type, message) VALUES (?, ?)',
      type,
      message
    );
  }

  async getRecentEvents(limit: number = 50): Promise<any[]> {
    if (!this.db) throw new Error('Database not initialized');
    return await this.db.all(
      'SELECT * FROM server_events ORDER BY timestamp DESC LIMIT ?',
      limit
    );
  }
}

export const dbService = new DatabaseService();
