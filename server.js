// backend/server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const db = require('./db');
const linksRouter = require('./routes/links');

const PORT = process.env.PORT || 4000;
const app = express();

app.use(cors());
app.use(express.json());

// Health endpoint required by spec
app.get('/healthz', (req, res) => {
  return res.json({ ok: true, version: "1.0" });
});

// API routes
app.use('/api/links', linksRouter);

// Redirect route: GET /:code
app.get('/:code', async (req, res) => {
  const code = req.params.code;
  // validate format to avoid accidental catches of other routes (dashboard etc.)
  const CODE_REGEX = /^[A-Za-z0-9]{6,8}$/;
  if (!CODE_REGEX.test(code)) {
    return res.status(404).send('Not found');
  }

  try {
    // find target
    const { rows } = await db.query(`SELECT id, target, clicks FROM links WHERE code = $1`, [code]);
    if (!rows[0]) return res.status(404).send('Not found');

    const link = rows[0];
    // update clicks and last_clicked (transactional-ish)
    await db.query(`UPDATE links SET clicks = clicks + 1, last_clicked = now() WHERE id = $1`, [link.id]);

    // Redirect with 302 as required
    return res.redirect(302, link.target);
  } catch (err) {
    console.error(err);
    return res.status(500).send('Server error');
  }
});

// Start
app.listen(PORT, () => {
  console.log(`TinyLink backend listening on port ${PORT}`);
});
