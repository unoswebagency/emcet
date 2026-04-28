require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { initDb } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static frontend files
app.use(express.static(path.join(__dirname)));

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/progress', require('./routes/progress'));

// Catch-all: serve main app (but login.html handles auth redirect)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'eapcet-study-app.html'));
});

// 404 for unknown API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: 'API route not found' });
});

// Initialize DB and Start Server (Local only, Vercel uses exported app)
const startServer = async () => {
  try {
    await initDb();
    if (process.env.NODE_ENV !== 'production') {
      app.listen(PORT, () => {
        console.log(`\n🚀 EAPCET server running on http://localhost:${PORT}`);
      });
    }
  } catch (err) {
    console.error("Failed to initialize server:", err);
  }
};

startServer();

module.exports = app;
