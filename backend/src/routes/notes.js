const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db/connection');

const router = express.Router();

let ensured = false;
async function ensureTable() {
  if (ensured) return;
  await db.query(`
    CREATE TABLE IF NOT EXISTS notes (
      id VARCHAR(255) PRIMARY KEY,
      title VARCHAR(500) NOT NULL,
      content TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `);
  ensured = true;
}

// GET /api/notes - list all notes (simple demo, no auth)
router.get('/', async (req, res) => {
  try {
    await ensureTable();
    const { limit = 100 } = req.query;
    const limitNum = Math.max(1, Math.min(Number(limit), 500));
    const result = await db.query(
      'SELECT id, title, content, created_at FROM notes ORDER BY created_at DESC LIMIT $1',
      [limitNum]
    );
    res.json({ data: result.rows });
  } catch (err) {
    console.error('Error fetching notes:', err);
    res.status(500).json({ error: 'Failed to fetch notes' });
  }
});

// POST /api/notes - create note
router.post('/', async (req, res) => {
  try {
    await ensureTable();
    const { id, title, content = '' } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'title is required' });
    }
    const noteId = id || uuidv4();
    const result = await db.query(
      `INSERT INTO notes (id, title, content) VALUES ($1, $2, $3)
       RETURNING id, title, content, created_at`,
      [noteId, title.trim(), content]
    );
    res.status(201).json({ data: result.rows[0] });
  } catch (err) {
    console.error('Error creating note:', err);
    res.status(500).json({ error: 'Failed to create note' });
  }
});

// PATCH /api/notes/:id - update note
router.patch('/:id', async (req, res) => {
  try {
    await ensureTable();
    const { id } = req.params;
    const { title, content } = req.body;

    const updates = [];
    const params = [];
    let idx = 1;

    if (title !== undefined) { updates.push(`title = $${idx++}`); params.push(String(title).trim()); }
    if (content !== undefined) { updates.push(`content = $${idx++}`); params.push(String(content)); }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    params.push(id);

    const result = await db.query(
      `UPDATE notes SET ${updates.join(', ')} WHERE id = $${idx} RETURNING id`,
      params
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Note not found' });
    }

    res.json({ ok: true });
  } catch (err) {
    console.error('Error updating note:', err);
    res.status(500).json({ error: 'Failed to update note' });
  }
});

// DELETE /api/notes/:id - delete note
router.delete('/:id', async (req, res) => {
  try {
    await ensureTable();
    const { id } = req.params;
    const result = await db.query('DELETE FROM notes WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Note not found' });
    }
    res.json({ ok: true });
  } catch (err) {
    console.error('Error deleting note:', err);
    res.status(500).json({ error: 'Failed to delete note' });
  }
});

module.exports = router;
