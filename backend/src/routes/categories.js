const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db/connection');

const router = express.Router();

// GET /api/categories - List categories by user, including bootstrap user's shared records
router.get('/', async (req, res) => {
  try {
    const { user_id } = req.query;
    if (!user_id) return res.status(400).json({ error: 'user_id is required' });

    const result = await db.query(
      `SELECT id, user_id, name, short_description, created_at
       FROM categories
       WHERE user_id = $1 OR ($1 <> md5('bootstrap_user_v1') AND user_id = md5('bootstrap_user_v1'))
       ORDER BY name ASC`,
      [user_id]
    );

    res.json({ data: result.rows });
  } catch (err) {
    console.error('Error fetching categories:', err);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// POST /api/categories - Create new category
router.post('/', async (req, res) => {
  try {
    const { id, user_id, name, short_description } = req.body;
    if (!user_id || !name) {
      return res.status(400).json({ error: 'user_id and name are required' });
    }

    const nameTrim = String(name).trim();
    if (!nameTrim) return res.status(400).json({ error: 'name cannot be empty' });
    if (nameTrim.length > 48) return res.status(400).json({ error: 'name must be <= 48 chars' });
    const descTrim = short_description ? String(short_description).trim() : null;
    if (descTrim && descTrim.length > 120) return res.status(400).json({ error: 'short_description must be <= 120 chars' });

    const categoryId = id || uuidv4();

    const result = await db.query(
      `INSERT INTO categories (id, user_id, name, short_description)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, name) DO NOTHING
       RETURNING id, user_id, name, short_description, created_at`,
      [categoryId, user_id, nameTrim, descTrim]
    );

    if (result.rows.length === 0) {
      // Conflict (duplicate per unique (user_id, name)) -> fetch existing and return 200
      const existing = await db.query(
        `SELECT id, user_id, name, short_description, created_at
         FROM categories WHERE user_id = $1 AND name = $2`,
        [user_id, nameTrim]
      );
      return res.status(200).json({ data: existing.rows[0], warning: 'Category already existed' });
    }

    res.status(201).json({ data: result.rows[0] });
  } catch (err) {
    console.error('Error creating category:', err);
    res.status(500).json({ error: 'Failed to create category' });
  }
});

// DELETE /api/categories/:id - Delete category
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { user_id } = req.query;
    if (!user_id) return res.status(400).json({ error: 'user_id is required' });

    const result = await db.query(
      `DELETE FROM categories WHERE id = $1 AND user_id = $2 RETURNING id`,
      [id, user_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }

    res.json({ ok: true });
  } catch (err) {
    console.error('Error deleting category:', err);
    res.status(500).json({ error: 'Failed to delete category' });
  }
});

// PUT /api/categories/:id - Update category
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { user_id, name, short_description } = req.body;
    if (!user_id) return res.status(400).json({ error: 'user_id is required' });

    const nameTrim = name !== undefined ? String(name).trim() : undefined;
    const descTrim = short_description !== undefined && short_description !== null
      ? String(short_description).trim() : null;

    if (nameTrim !== undefined && nameTrim.length === 0) {
      return res.status(400).json({ error: 'name cannot be empty' });
    }
    if (nameTrim !== undefined && nameTrim.length > 48) {
      return res.status(400).json({ error: 'name must be <= 48 chars' });
    }
    if (descTrim !== null && descTrim !== undefined && descTrim.length > 120) {
      return res.status(400).json({ error: 'short_description must be <= 120 chars' });
    }

    // If name is changing, check uniqueness for (user_id, name)
    if (nameTrim !== undefined) {
      const dup = await db.query(
        `SELECT id FROM categories WHERE user_id = $1 AND lower(name) = lower($2) AND id <> $3`,
        [user_id, nameTrim, id]
      );
      if (dup.rows.length > 0) {
        return res.status(409).json({ error: 'Category name already exists for this user' });
      }
    }

    // Build dynamic update
    const fields = [];
    const values = [];
    let idx = 1;

    if (nameTrim !== undefined) { fields.push(`name = $${idx++}`); values.push(nameTrim); }
    if (short_description !== undefined) { fields.push(`short_description = $${idx++}`); values.push(descTrim); }

    if (fields.length === 0) {
      return res.status(400).json({ error: 'No updatable fields provided' });
    }

    values.push(id); // $idx for id
    values.push(user_id); // $idx+1 for user_id

    const result = await db.query(
      `UPDATE categories SET ${fields.join(', ')} WHERE id = $${idx++} AND user_id = $${idx}
       RETURNING id, user_id, name, short_description, created_at`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }

    res.json({ data: result.rows[0] });
  } catch (err) {
    console.error('Error updating category:', err);
    res.status(500).json({ error: 'Failed to update category' });
  }
});

module.exports = router;
