const express = require('express');
const { stmts } = require('../db');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// All routes require auth
router.use(authMiddleware);

// GET /api/progress — load all progress data
router.get('/', (req, res) => {
  try {
    const progress = stmts.getProgress.get(req.userId) || { day_done: '{}', topic_done: '{}' };
    const todos = stmts.getTodos.all(req.userId);
    const pomo = stmts.getPomodoro.get(req.userId) || { sessions: 0, mins_studied: 0, streak: 0, last_date: null };
    res.json({
      dayDone: JSON.parse(progress.day_done || '{}'),
      topicDone: JSON.parse(progress.topic_done || '{}'),
      todos: todos.map(t => ({ ...t, done: t.done === 1 })),
      pomodoro: pomo
    });
  } catch (e) {
    console.error('Get progress error:', e);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/progress/days
router.put('/days', (req, res) => {
  const { dayDone } = req.body;
  if (!dayDone) return res.status(400).json({ error: 'dayDone required' });
  try {
    stmts.updateDays.run(req.userId, JSON.stringify(dayDone));
    res.json({ ok: true });
  } catch (e) {
    console.error('Update days error:', e);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/progress/topics
router.put('/topics', (req, res) => {
  const { topicDone } = req.body;
  if (!topicDone) return res.status(400).json({ error: 'topicDone required' });
  try {
    stmts.updateTopics.run(req.userId, JSON.stringify(topicDone));
    res.json({ ok: true });
  } catch (e) {
    console.error('Update topics error:', e);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/progress/todos
router.get('/todos', (req, res) => {
  try {
    const todos = stmts.getTodos.all(req.userId);
    res.json(todos.map(t => ({ ...t, done: t.done === 1 })));
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/progress/todos
router.post('/todos', (req, res) => {
  const { text, subject } = req.body;
  if (!text) return res.status(400).json({ error: 'text required' });
  try {
    const result = stmts.addTodo.run(req.userId, text.trim(), subject || 'gen');
    res.json({ id: result.lastInsertRowid, text: text.trim(), subject: subject || 'gen', done: false });
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/progress/todos/:id
router.put('/todos/:id', (req, res) => {
  const id = parseInt(req.params.id);
  try {
    stmts.toggleTodo.run(id, req.userId);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/progress/todos/:id
router.delete('/todos/:id', (req, res) => {
  const id = parseInt(req.params.id);
  try {
    stmts.deleteTodo.run(id, req.userId);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/progress/pomodoro
router.put('/pomodoro', (req, res) => {
  const { sessions, mins_studied, streak, last_date } = req.body;
  try {
    stmts.upsertPomodoro.run(req.userId, sessions || 0, mins_studied || 0, streak || 0, last_date || null);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
