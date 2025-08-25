const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const db = require('../db/connection');

const router = express.Router();

// GET /api/users - List all users (for auth purposes)
router.get('/', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT id, email, password_hash, created_at FROM users ORDER BY created_at DESC'
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// POST /api/users - Create new user
router.post('/', async (req, res) => {
  try {
    const { id, email, password_hash, created_at } = req.body;
    
    if (!email || !password_hash) {
      return res.status(400).json({ error: 'Email and password_hash are required' });
    }

    const userId = id || uuidv4();
    const timestamp = created_at || Date.now();

    const result = await db.query(
      'INSERT INTO users (id, email, password_hash, created_at) VALUES ($1, $2, $3, to_timestamp($4 / 1000.0)) RETURNING id, email, created_at',
      [userId, email.toLowerCase(), password_hash, timestamp]
    );

    res.status(201).json({
      id: result.rows[0].id,
      email: result.rows[0].email,
      createdAt: timestamp
    });
  } catch (err) {
    if (err.code === '23505') { // Unique violation
      return res.status(409).json({ error: 'Email already exists' });
    }
    console.error('Error creating user:', err);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// POST /api/users/login - Login user
router.post('/login', async (req, res) => {
  try {
    const { email, password_hash } = req.body;
    
    if (!email || !password_hash) {
      return res.status(400).json({ error: 'Email and password_hash are required' });
    }

    const result = await db.query(
      'SELECT id, email, password_hash FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];
    
    // For now, we're using the client-side hashed password directly
    // In a real app, you'd verify the password here
    if (user.password_hash !== password_hash) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    res.json({
      id: user.id,
      email: user.email
    });
  } catch (err) {
    console.error('Error during login:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

module.exports = router;
