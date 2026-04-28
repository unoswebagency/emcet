const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { stmts } = require('../db');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password)
    return res.status(400).json({ error: 'All fields are required' });
  if (password.length < 6)
    return res.status(400).json({ error: 'Password must be at least 6 characters' });

  try {
    const existingResult = await stmts.getUserByEmail(email.trim().toLowerCase());
    if (existingResult.rows.length > 0) return res.status(409).json({ error: 'Email already registered' });

    const hash = await bcrypt.hash(password, 10);
    const result = await stmts.createUser(username.trim(), email.trim().toLowerCase(), hash);
    const userId = result.rows[0].id;

    // Init empty progress & pomodoro rows
    await stmts.upsertProgress(userId, {}, {});
    await stmts.upsertPomodoro(userId, 0, 0, 0, null);

    const token = jwt.sign(
      { id: userId, username: username.trim() },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );
    res.json({ token, user: { id: userId, username: username.trim(), email } });
  } catch (e) {
    console.error('Register error:', e);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: 'Email and password required' });

  try {
    const result = await stmts.getUserByEmail(email.trim().toLowerCase());
    const user = result.rows[0];
    if (!user) return res.status(401).json({ error: 'Invalid email or password' });

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return res.status(401).json({ error: 'Invalid email or password' });

    const token = jwt.sign(
      { id: user.id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );
    res.json({ token, user: { id: user.id, username: user.username, email: user.email } });
  } catch (e) {
    console.error('Login error:', e);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/auth/me
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const result = await stmts.getUserById(req.userId);
    const user = result.rows[0];
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user });
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
