const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'eapcet.db'));

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS progress (
    user_id INTEGER PRIMARY KEY,
    day_done TEXT NOT NULL DEFAULT '{}',
    topic_done TEXT NOT NULL DEFAULT '{}',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS todos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    text TEXT NOT NULL,
    subject TEXT NOT NULL DEFAULT 'gen',
    done INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
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
`);

// Prepared statements
const stmts = {
  // Users
  createUser: db.prepare('INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)'),
  getUserByEmail: db.prepare('SELECT * FROM users WHERE email = ?'),
  getUserById: db.prepare('SELECT id, username, email, created_at FROM users WHERE id = ?'),

  // Progress
  getProgress: db.prepare('SELECT * FROM progress WHERE user_id = ?'),
  upsertProgress: db.prepare(`
    INSERT INTO progress (user_id, day_done, topic_done, updated_at)
    VALUES (?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(user_id) DO UPDATE SET
      day_done = excluded.day_done,
      topic_done = excluded.topic_done,
      updated_at = CURRENT_TIMESTAMP
  `),
  updateDays: db.prepare(`
    INSERT INTO progress (user_id, day_done, topic_done, updated_at)
    VALUES (?, ?, '{}', CURRENT_TIMESTAMP)
    ON CONFLICT(user_id) DO UPDATE SET
      day_done = excluded.day_done,
      updated_at = CURRENT_TIMESTAMP
  `),
  updateTopics: db.prepare(`
    INSERT INTO progress (user_id, day_done, topic_done, updated_at)
    VALUES (?, '{}', ?, CURRENT_TIMESTAMP)
    ON CONFLICT(user_id) DO UPDATE SET
      topic_done = excluded.topic_done,
      updated_at = CURRENT_TIMESTAMP
  `),

  // Todos
  getTodos: db.prepare('SELECT * FROM todos WHERE user_id = ? ORDER BY created_at ASC'),
  addTodo: db.prepare('INSERT INTO todos (user_id, text, subject) VALUES (?, ?, ?)'),
  toggleTodo: db.prepare('UPDATE todos SET done = CASE WHEN done = 0 THEN 1 ELSE 0 END WHERE id = ? AND user_id = ?'),
  deleteTodo: db.prepare('DELETE FROM todos WHERE id = ? AND user_id = ?'),

  // Pomodoro
  getPomodoro: db.prepare('SELECT * FROM pomodoro WHERE user_id = ?'),
  upsertPomodoro: db.prepare(`
    INSERT INTO pomodoro (user_id, sessions, mins_studied, streak, last_date)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET
      sessions = excluded.sessions,
      mins_studied = excluded.mins_studied,
      streak = excluded.streak,
      last_date = excluded.last_date
  `)
};

module.exports = { db, stmts };
