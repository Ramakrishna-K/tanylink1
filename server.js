require('dotenv').config();
const express = require('express');
const cors = require('cors');
const db = require('./db');
const linksRouter = require('./routes/links');

const PORT = process.env.PORT || 4000;
const app = express();

// app.use(cors());
// app.use(express.json());
app.use(cors({
  origin: "https://tanylinkfrontend.vercel.app",  
  methods: "GET,POST,PUT,DELETE",
  credentials: true
}));
app.use(express.json());
app.get('/healthz', (req, res) => {
  return res.json({ ok: true, version: "1.0" });
});

app.use('/api/links', linksRouter);

app.get('/:code', async (req, res) => {
  const code = req.params.code;
  const CODE_REGEX = /^[A-Za-z0-9]{6,8}$/;
  if (!CODE_REGEX.test(code)) {
    return res.status(404).send('Not found');
  }

  try {
    const { rows } = await db.query(`SELECT id, target, clicks FROM links WHERE code = $1`, [code]);
    if (!rows[0]) return res.status(404).send('Not found');

    const link = rows[0];
    await db.query(`UPDATE links SET clicks = clicks + 1, last_clicked = now() WHERE id = $1`, [link.id]);

    return res.redirect(302, link.target);
  } catch (err) {
    console.error(err);
    return res.status(500).send('Server error');
  }
});

app.listen(PORT, () => {
  console.log(`TinyLink backend listening on port ${PORT}`);
});
