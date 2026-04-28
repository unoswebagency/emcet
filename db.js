const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // Required for Neon
  }
});

// Helper to run queries
const query = (text, params) => pool.query(text, params);

// Initialize tables
const initDb = async () => {
  await query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS progress (
      user_id INTEGER PRIMARY KEY,
      day_done JSONB NOT NULL DEFAULT '{}',
      topic_done JSONB NOT NULL DEFAULT '{}',
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS todos (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      text TEXT NOT NULL,
      subject TEXT NOT NULL DEFAULT 'gen',
      done INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS pomodoro (
      user_id INTEGER PRIMARY KEY,
      sessions INTEGER NOT NULL DEFAULT 0,
      mins_studied INTEGER NOT NULL DEFAULT 0,
      streak INTEGER NOT NULL DEFAULT 0,
      last_date TEXT,
      CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);
  console.log("PostgreSQL tables initialized.");
};

// Functions to replace old synchronous stmts
const stmts = {
  // Users
  createUser: (username, email, hash) => 
    query('INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING *', [username, email, hash]),
  
  getUserByEmail: (email) => 
    query('SELECT * FROM users WHERE email = $1', [email]),
  
  getUserById: (id) => 
    query('SELECT id, username, email, created_at FROM users WHERE id = $1', [id]),

  // Progress
  getProgress: (userId) => 
    query('SELECT * FROM progress WHERE user_id = $1', [userId]),
  
  upsertProgress: (userId, dayDone, topicDone) => 
    query(`
      INSERT INTO progress (user_id, day_done, topic_done, updated_at)
      VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
      ON CONFLICT(user_id) DO UPDATE SET
        day_done = EXCLUDED.day_done,
        topic_done = EXCLUDED.topic_done,
        updated_at = CURRENT_TIMESTAMP
    `, [userId, dayDone, topicDone]),

  updateDays: (userId, dayDone) => 
    query(`
      INSERT INTO progress (user_id, day_done, topic_done, updated_at)
      VALUES ($1, $2, '{}', CURRENT_TIMESTAMP)
      ON CONFLICT(user_id) DO UPDATE SET
        day_done = EXCLUDED.day_done,
        updated_at = CURRENT_TIMESTAMP
    `, [userId, dayDone]),

  updateTopics: (userId, topicDone) => 
    query(`
      INSERT INTO progress (user_id, day_done, topic_done, updated_at)
      VALUES ($1, '{}', $2, CURRENT_TIMESTAMP)
      ON CONFLICT(user_id) DO UPDATE SET
        topic_done = EXCLUDED.topic_done,
        updated_at = CURRENT_TIMESTAMP
    `, [userId, topicDone]),

  // Todos
  getTodos: (userId) => 
    query('SELECT * FROM todos WHERE user_id = $1 ORDER BY created_at ASC', [userId]),
  
  addTodo: (userId, text, subject) => 
    query('INSERT INTO todos (user_id, text, subject) VALUES ($1, $2, $3) RETURNING *', [userId, text, subject]),
  
  toggleTodo: (id, userId) => 
    query('UPDATE todos SET done = CASE WHEN done = 0 THEN 1 ELSE 0 END WHERE id = $1 AND user_id = $2', [id, userId]),
  
  deleteTodo: (id, userId) => 
    query('DELETE FROM todos WHERE id = $1 AND user_id = $2', [id, userId]),

  // Pomodoro
  getPomodoro: (userId) => 
    query('SELECT * FROM pomodoro WHERE user_id = $1', [userId]),
  
  upsertPomodoro: (userId, sessions, mins, streak, lastDate) => 
    query(`
      INSERT INTO pomodoro (user_id, sessions, mins_studied, streak, last_date)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT(user_id) DO UPDATE SET
        sessions = EXCLUDED.sessions,
        mins_studied = EXCLUDED.mins_studied,
        streak = EXCLUDED.streak,
        last_date = EXCLUDED.last_date
    `, [userId, sessions, mins, streak, lastDate])
};

module.exports = { query, stmts, initDb };
