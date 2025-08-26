const { Pool } = require('pg');

// Allow configuration via environment variables for production/deploys
// Defaults are suitable for local development
const useSSL = (process.env.PGSSL || 'false').toLowerCase() === 'true';

const pool = new Pool({
  host: process.env.PGHOST || 'localhost',
  port: Number(process.env.PGPORT || 5432),
  database: process.env.PGDATABASE || 'personal_leveling',
  user: process.env.PGUSER || 'postgres',
  password: process.env.PGPASSWORD || 'password',
  ssl: useSSL ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Test the connection
pool.on('connect', () => {
  console.log('✅ Connected to PostgreSQL');
});

pool.on('error', (err) => {
  console.error('❌ PostgreSQL connection error:', err);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  getClient: () => pool.connect(),
  pool
};
