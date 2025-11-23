// backend/routes/links.js
const express = require('express');
const router = express.Router();
const db = require('../db');
const validUrl = require('valid-url');

const CODE_REGEX = /^[A-Za-z0-9]{6,8}$/;

// POST /api/links - create link
router.post('/', async (req, res) => {
  const { target, code } = req.body || {};

  if (!target) return res.status(400).json({ error: 'target is required' });
  if (!validUrl.isUri(target)) return res.status(400).json({ error: 'target must be a valid URL' });

  let shortCode;
  if (code) {
    if (!CODE_REGEX.test(code)) {
      return res.status(400).json({ error: 'code must match [A-Za-z0-9]{6,8}' });
    }
    shortCode = code;
  } else {
    // generate a random code of 6 chars (alphanumeric)
    shortCode = generateCode(6);
  }

  try {
    // insert, expecting unique constraint violation if exists
    const insert = `INSERT INTO links(code, target) VALUES($1,$2) RETURNING code, target, clicks, last_clicked, created_at`;
    const { rows } = await db.query(insert, [shortCode, target]);
    return res.status(201).json(rows[0]);
  } catch (err) {
    // unique violation -> 409
    if (err.code === '23505') {
      return res.status(409).json({ error: 'code already exists' });
    }
    console.error(err);
    return res.status(500).json({ error: 'server error' });
  }
});

// GET /api/links - list all links
router.get('/', async (req, res) => {
  try {
    const { rows } = await db.query(`SELECT code, target, clicks, last_clicked, created_at FROM links ORDER BY created_at DESC`);
    return res.json(rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'server error' });
  }
});

// GET /api/links/:code - stats for a single code
router.get('/:code', async (req, res) => {
  const code = req.params.code;
  if (!CODE_REGEX.test(code)) {
    return res.status(400).json({ error: 'invalid code format' });
  }
  try {
    const { rows } = await db.query(`SELECT code, target, clicks, last_clicked, created_at FROM links WHERE code = $1`, [code]);
    if (rows.length === 0) return res.status(404).json({ error: 'not found' });
    return res.json(rows[0]);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'server error' });
  }
});

// DELETE /api/links/:code - delete
router.delete('/:code', async (req, res) => {
  const code = req.params.code;
  if (!CODE_REGEX.test(code)) {
    return res.status(400).json({ error: 'invalid code format' });
  }
  try {
    const { rowCount } = await db.query(`DELETE FROM links WHERE code = $1`, [code]);
    if (rowCount === 0) return res.status(404).json({ error: 'not found' });
    return res.status(204).send();
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'server error' });
  }
});

function generateCode(len = 6) {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let out = '';
  for (let i = 0; i < len; i++) out += chars.charAt(Math.floor(Math.random() * chars.length));
  return out;
}

module.exports = router;
