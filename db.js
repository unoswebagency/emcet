const { Pool } = require('pg');
const Database = require('better-sqlite3');
const path = require('path');
require('dotenv').config();

const isPg = !!process.env.DATABASE_URL;
let pgPool = null;
let sqliteDb = null;

if (isPg) {
  console.log("Using PostgreSQL (Cloud Mode)");
  pgPool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
} else {
  console.log("Using SQLite (Local Mode)");
  sqliteDb = new Database(path.join(__dirname, 'eapcet.db'));
  sqliteDb.pragma('journal_mode = WAL');
}

// Unified Async Query Engine
const query = async (text, params = []) => {
  if (isPg) {
    return await pgPool.query(text, params);
  } else {
    // Convert SQLite to PG-style result object
    const sql = text.replace(/\$(\d+)/g, '?'); // Convert $1, $2 to ?
    try {
      if (text.toLowerCase().trim().startsWith('select')) {
        const rows = sqliteDb.prepare(sql).all(...params);
        return { rows };
      } else {
        const info = sqliteDb.prepare(sql).run(...params);
        return { rows: [{ id: info.lastInsertRowid }], rowCount: info.changes };
      }
    } catch (err) {
      console.error("SQLite Error:", err);
      throw err;
    }
  }
};

// Initialize tables
const initDb = async () => {
  const sql = `
    CREATE TABLE IF NOT EXISTS users (
      ${isPg ? 'id SERIAL' : 'id INTEGER'} PRIMARY KEY ${isPg ? '' : 'AUTOINCREMENT'},
      username TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at ${isPg ? 'TIMESTAMP' : 'DATETIME'} DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS progress (
      user_id INTEGER PRIMARY KEY,
      day_done ${isPg ? 'JSONB' : 'TEXT'} NOT NULL DEFAULT '{}',
      topic_done ${isPg ? 'JSONB' : 'TEXT'} NOT NULL DEFAULT '{}',
      updated_at ${isPg ? 'TIMESTAMP' : 'DATETIME'} DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS todos (
      ${isPg ? 'id SERIAL' : 'id INTEGER'} PRIMARY KEY ${isPg ? '' : 'AUTOINCREMENT'},
      user_id INTEGER NOT NULL,
      text TEXT NOT NULL,
      subject TEXT NOT NULL DEFAULT 'gen',
      done INTEGER NOT NULL DEFAULT 0,
      created_at ${isPg ? 'TIMESTAMP' : 'DATETIME'} DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS pomodoro (
      user_id INTEGER PRIMARY KEY,
      sessions INTEGER NOT NULL DEFAULT 0,
      mins_studied INTEGER NOT NULL DEFAULT 0,
      streak INTEGER NOT NULL DEFAULT 0,
      last_date TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `;
  
  if (isPg) {
    await pgPool.query(sql);
  } else {
    sqliteDb.exec(sql);
  }
};

// Helper functions for routes
const stmts = {
  createUser: (name, email, hash) => query('INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING *', [name, email, hash]),
  getUserByEmail: (email) => query('SELECT * FROM users WHERE email = $1', [email]),
  getUserById: (id) => query('SELECT id, username, email, created_at FROM users WHERE id = $1', [id]),
  getProgress: (uid) => query('SELECT * FROM progress WHERE user_id = $1', [uid]),
  upsertProgress: (uid, dd, td) => {
    const d = typeof dd === 'object' ? JSON.stringify(dd) : dd;
    const t = typeof td === 'object' ? JSON.stringify(td) : td;
    return query(`
      INSERT INTO progress (user_id, day_done, topic_done, updated_at) VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
      ON CONFLICT(user_id) DO UPDATE SET day_done = EXCLUDED.day_done, topic_done = EXCLUDED.topic_done, updated_at = CURRENT_TIMESTAMP
    `, [uid, d, t]);
  },
  updateDays: (uid, dd) => {
    const d = typeof dd === 'object' ? JSON.stringify(dd) : dd;
    return query(`
      INSERT INTO progress (user_id, day_done, topic_done, updated_at) VALUES ($1, $2, '{}', CURRENT_TIMESTAMP)
      ON CONFLICT(user_id) DO UPDATE SET day_done = EXCLUDED.day_done, updated_at = CURRENT_TIMESTAMP
    `, [uid, d]);
  },
  updateTopics: (uid, td) => {
    const t = typeof td === 'object' ? JSON.stringify(td) : td;
    return query(`
      INSERT INTO progress (user_id, day_done, topic_done, updated_at) VALUES ($1, '{}', $2, CURRENT_TIMESTAMP)
      ON CONFLICT(user_id) DO UPDATE SET topic_done = EXCLUDED.topic_done, updated_at = CURRENT_TIMESTAMP
    `, [uid, t]);
  },
  getTodos: (uid) => query('SELECT * FROM todos WHERE user_id = $1 ORDER BY created_at ASC', [uid]),
  addTodo: (uid, txt, sub) => query('INSERT INTO todos (user_id, text, subject) VALUES ($1, $2, $3) RETURNING *', [uid, txt, sub]),
  toggleTodo: (id, uid) => query('UPDATE todos SET done = CASE WHEN done = 0 THEN 1 ELSE 0 END WHERE id = $1 AND user_id = $2', [id, uid]),
  deleteTodo: (id, uid) => query('DELETE FROM todos WHERE id = $1 AND user_id = $2', [id, uid]),
  getPomodoro: (uid) => query('SELECT * FROM pomodoro WHERE user_id = $1', [uid]),
  upsertPomodoro: (uid, s, m, str, l) => query(`
    INSERT INTO pomodoro (user_id, sessions, mins_studied, streak, last_date) VALUES ($1, $2, $3, $4, $5)
    ON CONFLICT(user_id) DO UPDATE SET sessions = EXCLUDED.sessions, mins_studied = EXCLUDED.mins_studied, streak = EXCLUDED.streak, last_date = EXCLUDED.last_date
  `, [uid, s, m, str, l])
};

module.exports = { query, stmts, initDb };
