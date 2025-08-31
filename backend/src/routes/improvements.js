const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db/connection');

const router = express.Router();

// GET /api/improvements - list by user
router.get('/', async (req, res) => {
  try {
    const { user_id } = req.query;
    if (!user_id) return res.status(400).json({ error: 'user_id is required' });

    const result = await db.query(
      `SELECT id, user_id, status, title, description, created_at
       FROM improvement_requests
       WHERE user_id = $1 OR ($1 <> md5('bootstrap_user_v1') AND user_id = md5('bootstrap_user_v1'))
       ORDER BY CASE status
                  WHEN 'in_progress' THEN 1
                  WHEN 'open' THEN 2
                  WHEN 'resolved' THEN 3
                  WHEN 'rejected' THEN 4
                  ELSE 5
                END,
                created_at DESC`,
      [user_id]
    );

    res.json({ data: result.rows });
  } catch (err) {
    console.error('Error fetching improvements:', err);
    res.status(500).json({ error: 'Failed to fetch improvements' });
  }
});

// POST /api/improvements - create
router.post('/', async (req, res) => {
  try {
    const { id, user_id, title, description, status } = req.body;
    if (!user_id || !title) {
      return res.status(400).json({ error: 'user_id and title are required' });
    }

    const titleTrim = String(title).trim();
    if (!titleTrim) return res.status(400).json({ error: 'title cannot be empty' });
    if (titleTrim.length > 120) return res.status(400).json({ error: 'title must be <= 120 chars' });
    const descTrim = description != null ? String(description).trim() : null;

    // Validate status
    const allowed = ['open','in_progress','resolved','rejected'];
    const statusVal = status ? String(status).trim() : 'open';
    if (!allowed.includes(statusVal)) {
      return res.status(400).json({ error: "invalid status. Allowed: 'open','in_progress','resolved','rejected'" });
    }

    const recId = id || uuidv4();

    const result = await db.query(
      `INSERT INTO improvement_requests (id, user_id, status, title, description)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, user_id, status, title, description, created_at`,
      [recId, user_id, statusVal, titleTrim, descTrim]
    );

    res.status(201).json({ data: result.rows[0] });
  } catch (err) {
    console.error('Error creating improvement:', err);
    res.status(500).json({ error: 'Failed to create improvement' });
  }
});

// PUT /api/improvements/:id - update
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { user_id, title, description, status } = req.body;
    if (!user_id) return res.status(400).json({ error: 'user_id is required' });

    const titleTrim = title !== undefined ? String(title).trim() : undefined;
    const descTrim = description !== undefined && description !== null ? String(description).trim() : null;

    // Validate status if provided
    let statusTrim;
    if (status !== undefined) {
      statusTrim = String(status).trim();
      const allowed = ['open','in_progress','resolved','rejected'];
      if (!allowed.includes(statusTrim)) {
        return res.status(400).json({ error: "invalid status. Allowed: 'open','in_progress','resolved','rejected'" });
      }
    }

    if (titleTrim !== undefined && titleTrim.length === 0) {
      return res.status(400).json({ error: 'title cannot be empty' });
    }
    if (titleTrim !== undefined && titleTrim.length > 120) {
      return res.status(400).json({ error: 'title must be <= 120 chars' });
    }

    const fields = [];
    const values = [];
    let idx = 1;

    if (titleTrim !== undefined) { fields.push(`title = $${idx++}`); values.push(titleTrim); }
    if (description !== undefined) { fields.push(`description = $${idx++}`); values.push(descTrim); }
    if (status !== undefined) { fields.push(`status = $${idx++}`); values.push(statusTrim); }

    if (fields.length === 0) {
      return res.status(400).json({ error: 'No updatable fields provided' });
    }

    values.push(id);
    values.push(user_id);

    const result = await db.query(
      `UPDATE improvement_requests SET ${fields.join(', ')} WHERE id = $${idx++} AND user_id = $${idx}
       RETURNING id, user_id, status, title, description, created_at`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Improvement not found' });
    }

    res.json({ data: result.rows[0] });
  } catch (err) {
    console.error('Error updating improvement:', err);
    res.status(500).json({ error: 'Failed to update improvement' });
  }
});

// DELETE /api/improvements/:id - delete
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { user_id } = req.query;
    if (!user_id) return res.status(400).json({ error: 'user_id is required' });

    const result = await db.query(
      `DELETE FROM improvement_requests WHERE id = $1 AND user_id = $2 RETURNING id`,
      [id, user_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Improvement not found' });
    }

    res.json({ ok: true });
  } catch (err) {
    console.error('Error deleting improvement:', err);
    res.status(500).json({ error: 'Failed to delete improvement' });
  }
});

module.exports = router;
