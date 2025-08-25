const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db/connection');

const router = express.Router();

// GET /api/tasks - List tasks by user with optional filters
router.get('/', async (req, res) => {
  try {
    const { user_id, type, status, limit = 100 } = req.query;
    
    if (!user_id) {
      return res.status(400).json({ error: 'user_id is required' });
    }

    const limitNum = Math.max(1, Math.min(Number(limit), 500));
    const conditions = ['user_id = $1'];
    const params = [user_id];
    let paramIndex = 2;

    if (type) {
      conditions.push(`type = $${paramIndex++}`);
      params.push(type);
    }

    if (status) {
      conditions.push(`status = $${paramIndex++}`);
      params.push(status);
    }

    params.push(limitNum);

    const result = await db.query(
      `SELECT id, user_id, type, title, status, reward_xp, updated_at, created_at
       FROM tasks 
       WHERE ${conditions.join(' AND ')}
       ORDER BY updated_at DESC 
       LIMIT $${paramIndex}`,
      params
    );

    res.json({ data: result.rows });
  } catch (err) {
    console.error('Error fetching tasks:', err);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

// POST /api/tasks - Create new task
router.post('/', async (req, res) => {
  try {
    const { id, user_id, type, title, status = 'open', reward_xp = 0 } = req.body;
    
    if (!user_id || !type || !title) {
      return res.status(400).json({ error: 'user_id, type and title are required' });
    }

    if (!['daily', 'weekly', 'repeatable'].includes(type)) {
      return res.status(400).json({ error: 'type must be daily, weekly, or repeatable' });
    }

    if (!['open', 'done', 'skipped'].includes(status)) {
      return res.status(400).json({ error: 'status must be open, done, or skipped' });
    }

    const taskId = id || uuidv4();

    const result = await db.query(
      `INSERT INTO tasks (id, user_id, type, title, status, reward_xp)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, user_id, type, title, status, reward_xp, updated_at, created_at`,
      [taskId, user_id, type, title.trim(), status, reward_xp]
    );

    res.status(201).json({ data: result.rows[0] });
  } catch (err) {
    console.error('Error creating task:', err);
    res.status(500).json({ error: 'Failed to create task' });
  }
});

// PATCH /api/tasks/:id - Update task
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { user_id, title, status, reward_xp } = req.body;

    if (!user_id) {
      return res.status(400).json({ error: 'user_id is required' });
    }

    const updates = [];
    const params = [];
    let paramIndex = 1;

    if (title !== undefined) {
      updates.push(`title = $${paramIndex++}`);
      params.push(title.trim());
    }

    if (status !== undefined) {
      if (!['open', 'done', 'skipped'].includes(status)) {
        return res.status(400).json({ error: 'status must be open, done, or skipped' });
      }
      updates.push(`status = $${paramIndex++}`);
      params.push(status);
    }

    if (reward_xp !== undefined) {
      updates.push(`reward_xp = $${paramIndex++}`);
      params.push(reward_xp);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    params.push(id, user_id);

    const result = await db.query(
      `UPDATE tasks SET ${updates.join(', ')} WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1} RETURNING id`,
      params
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json({ ok: true });
  } catch (err) {
    console.error('Error updating task:', err);
    res.status(500).json({ error: 'Failed to update task' });
  }
});

// DELETE /api/tasks/:id - Delete task
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { user_id } = req.query;

    if (!user_id) {
      return res.status(400).json({ error: 'user_id is required' });
    }

    const result = await db.query(
      'DELETE FROM tasks WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, user_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json({ ok: true });
  } catch (err) {
    console.error('Error deleting task:', err);
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

module.exports = router;
