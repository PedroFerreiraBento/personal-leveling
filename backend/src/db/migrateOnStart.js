const fs = require('fs')
const path = require('path')
const db = require('./connection')

async function migrateOnStart() {
  try {
    const schemaPath = path.join(__dirname, 'migrations', '001_init.sql')
    const schema = fs.readFileSync(schemaPath, 'utf8')

    // Idempotent DDL because the SQL uses IF NOT EXISTS
    await db.query(schema)
    console.log('✅ DB ready (migrations ensured on start)')
  } catch (err) {
    console.error('❌ Failed to ensure migrations on start:', err)
    // Do not exit the process; let the server start and show explicit DB errors later
  }
}

// Only run when required directly (from scripts)
if (require.main === module) {
  migrateOnStart().then(() => process.exit(0))
}

module.exports = { migrateOnStart }
