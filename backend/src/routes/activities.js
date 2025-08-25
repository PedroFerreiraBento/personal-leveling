const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db/connection');

const router = express.Router();

// GET /api/activities - List activities by user
router.get('/', async (req, res) => {
  try {
    const { user_id, limit = 100 } = req.query;
    
    if (!user_id) {
      return res.status(400).json({ error: 'user_id is required' });
    }

    const limitNum = Math.max(1, Math.min(Number(limit), 500));

    const result = await db.query(
      `SELECT id, user_id, title, category, duration_minutes, timestamp, created_at
       FROM activities 
       WHERE user_id = $1 
       ORDER BY timestamp DESC 
       LIMIT $2`,
      [user_id, limitNum]
    );

    res.json({ data: result.rows });
  } catch (err) {
    console.error('Error fetching activities:', err);
    res.status(500).json({ error: 'Failed to fetch activities' });
  }
});

// POST /api/activities - Create new activity
router.post('/', async (req, res) => {
  try {
    const { id, user_id, title, category, duration_minutes, timestamp } = req.body;
    
    if (!user_id || !title || !duration_minutes || duration_minutes <= 0) {
      return res.status(400).json({ 
        error: 'user_id, title and positive duration_minutes are required' 
      });
    }

    const activityId = id || uuidv4();
    const activityTimestamp = timestamp || Date.now();

    const result = await db.query(
      `INSERT INTO activities (id, user_id, title, category, duration_minutes, timestamp)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, user_id, title, category, duration_minutes, timestamp, created_at`,
      [activityId, user_id, title.trim(), category || null, duration_minutes, activityTimestamp]
    );

    res.status(201).json({ data: result.rows[0] });
  } catch (err) {
    console.error('Error creating activity:', err);
    res.status(500).json({ error: 'Failed to create activity' });
  }
});

// DELETE /api/activities/:id - Delete activity
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { user_id } = req.query;

    if (!user_id) {
      return res.status(400).json({ error: 'user_id is required' });
    }

    const result = await db.query(
      'DELETE FROM activities WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, user_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Activity not found' });
    }

    res.json({ ok: true });
  } catch (err) {
    console.error('Error deleting activity:', err);
    res.status(500).json({ error: 'Failed to delete activity' });
  }
});

module.exports = router;
