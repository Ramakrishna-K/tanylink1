
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

pool.connect()
  .then(() => {
    console.log("✅ PostgreSQL connected successfully!");
  })
  .catch((err) => {
    console.error("❌ PostgreSQL connection failed!");
    console.error("Error Details:", err);
  });

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool
};
