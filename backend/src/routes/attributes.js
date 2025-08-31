const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db/connection');

const router = express.Router();

// GET /api/attributes - List attributes by user
router.get('/', async (req, res) => {
  try {
    const { user_id } = req.query;
    if (!user_id) return res.status(400).json({ error: 'user_id is required' });

    const result = await db.query(
      `SELECT id, user_id, name, description, created_at
       FROM attributes
       WHERE user_id = $1
       ORDER BY name ASC`,
      [user_id]
    );

    res.json({ data: result.rows });
  } catch (err) {
    console.error('Error fetching attributes:', err);
    res.status(500).json({ error: 'Failed to fetch attributes' });
  }
});

// POST /api/attributes - Create new attribute
router.post('/', async (req, res) => {
  try {
    const { id, user_id, name, description } = req.body;
    if (!user_id || !name) {
      return res.status(400).json({ error: 'user_id and name are required' });
    }

    const nameTrim = String(name).trim();
    if (!nameTrim) return res.status(400).json({ error: 'name cannot be empty' });
    if (nameTrim.length > 48) return res.status(400).json({ error: 'name must be <= 48 chars' });
    const descTrim = description != null ? String(description).trim() : null;

    const attributeId = id || uuidv4();

    const result = await db.query(
      `INSERT INTO attributes (id, user_id, name, description)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, name) DO NOTHING
       RETURNING id, user_id, name, description, created_at`,
      [attributeId, user_id, nameTrim, descTrim]
    );

    if (result.rows.length === 0) {
      // Conflict -> fetch existing and return 200
      const existing = await db.query(
        `SELECT id, user_id, name, description, created_at
         FROM attributes WHERE user_id = $1 AND name = $2`,
        [user_id, nameTrim]
      );
      return res.status(200).json({ data: existing.rows[0], warning: 'Attribute already existed' });
    }

    res.status(201).json({ data: result.rows[0] });
  } catch (err) {
    console.error('Error creating attribute:', err);
    res.status(500).json({ error: 'Failed to create attribute' });
  }
});

// DELETE /api/attributes/:id - Delete attribute
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { user_id } = req.query;
    if (!user_id) return res.status(400).json({ error: 'user_id is required' });

    const result = await db.query(
      `DELETE FROM attributes WHERE id = $1 AND user_id = $2 RETURNING id`,
      [id, user_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Attribute not found' });
    }

    res.json({ ok: true });
  } catch (err) {
    console.error('Error deleting attribute:', err);
    res.status(500).json({ error: 'Failed to delete attribute' });
  }
});

// PUT /api/attributes/:id - Update attribute
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { user_id, name, description } = req.body;
    if (!user_id) return res.status(400).json({ error: 'user_id is required' });

    const nameTrim = name !== undefined ? String(name).trim() : undefined;
    const descTrim = description !== undefined && description !== null
      ? String(description).trim() : null;

    if (nameTrim !== undefined && nameTrim.length === 0) {
      return res.status(400).json({ error: 'name cannot be empty' });
    }
    if (nameTrim !== undefined && nameTrim.length > 48) {
      return res.status(400).json({ error: 'name must be <= 48 chars' });
    }

    // If name is changing, check uniqueness for (user_id, name)
    if (nameTrim !== undefined) {
      const dup = await db.query(
        `SELECT id FROM attributes WHERE user_id = $1 AND lower(name) = lower($2) AND id <> $3`,
        [user_id, nameTrim, id]
      );
      if (dup.rows.length > 0) {
        return res.status(409).json({ error: 'Attribute name already exists for this user' });
      }
    }

    // Build dynamic update
    const fields = [];
    const values = [];
    let idx = 1;

    if (nameTrim !== undefined) { fields.push(`name = $${idx++}`); values.push(nameTrim); }
    if (description !== undefined) { fields.push(`description = $${idx++}`); values.push(descTrim); }

    if (fields.length === 0) {
      return res.status(400).json({ error: 'No updatable fields provided' });
    }

    values.push(id); // $idx for id
    values.push(user_id); // $idx+1 for user_id

    const result = await db.query(
      `UPDATE attributes SET ${fields.join(', ')} WHERE id = $${idx++} AND user_id = $${idx}
       RETURNING id, user_id, name, description, created_at`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Attribute not found' });
    }

    res.json({ data: result.rows[0] });
  } catch (err) {
    console.error('Error updating attribute:', err);
    res.status(500).json({ error: 'Failed to update attribute' });
  }
});

module.exports = router;
