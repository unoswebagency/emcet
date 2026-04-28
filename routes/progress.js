const express = require('express');
const { stmts } = require('../db');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// All routes require auth
router.use(authMiddleware);

// GET /api/progress — load all progress data
router.get('/', async (req, res) => {
  try {
    const progressResult = await stmts.getProgress(req.userId);
    const progress = progressResult.rows[0] || { day_done: {}, topic_done: {} };
    
    const todosResult = await stmts.getTodos(req.userId);
    const todos = todosResult.rows;
    
    const pomoResult = await stmts.getPomodoro(req.userId);
    const pomo = pomoResult.rows[0] || { sessions: 0, mins_studied: 0, streak: 0, last_date: null };
    
    res.json({
      dayDone: typeof progress.day_done === 'string' ? JSON.parse(progress.day_done) : progress.day_done,
      topicDone: typeof progress.topic_done === 'string' ? JSON.parse(progress.topic_done) : progress.topic_done,
      todos: todos.map(t => ({ ...t, done: t.done === 1 })),
      pomodoro: pomo
    });
  } catch (e) {
    console.error('Get progress error:', e);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/progress/days
router.put('/days', async (req, res) => {
  const { dayDone } = req.body;
  if (!dayDone) return res.status(400).json({ error: 'dayDone required' });
  try {
    await stmts.updateDays(req.userId, dayDone);
    res.json({ ok: true });
  } catch (e) {
    console.error('Update days error:', e);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/progress/topics
router.put('/topics', async (req, res) => {
  const { topicDone } = req.body;
  if (!topicDone) return res.status(400).json({ error: 'topicDone required' });
  try {
    await stmts.updateTopics(req.userId, topicDone);
    res.json({ ok: true });
  } catch (e) {
    console.error('Update topics error:', e);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/progress/todos
router.get('/todos', async (req, res) => {
  try {
    const result = await stmts.getTodos(req.userId);
    res.json(result.rows.map(t => ({ ...t, done: t.done === 1 })));
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/progress/todos
router.post('/todos', async (req, res) => {
  const { text, subject } = req.body;
  if (!text) return res.status(400).json({ error: 'text required' });
  try {
    const result = await stmts.addTodo(req.userId, text.trim(), subject || 'gen');
    const newTodo = result.rows[0];
    res.json({ id: newTodo.id, text: newTodo.text, subject: newTodo.subject, done: false });
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/progress/todos/:id
router.put('/todos/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    await stmts.toggleTodo(id, req.userId);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/progress/todos/:id
router.delete('/todos/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    await stmts.deleteTodo(id, req.userId);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/progress/pomodoro
router.put('/pomodoro', async (req, res) => {
  const { sessions, mins_studied, streak, last_date } = req.body;
  try {
    await stmts.upsertPomodoro(req.userId, sessions || 0, mins_studied || 0, streak || 0, last_date || null);
    res.json({ ok: true });
  } catch (e) {
    console.error('Update pomodoro error:', e);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
