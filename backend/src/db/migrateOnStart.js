const fs = require('fs')
const path = require('path')
const db = require('./connection')

async function migrateOnStart() {
  try {
    const dir = path.join(__dirname, 'migrations')
    const files = fs
      .readdirSync(dir)
      .filter(f => f.endsWith('.sql'))
      .sort((a, b) => a.localeCompare(b))

    for (const file of files) {
      const full = path.join(dir, file)
      const sql = fs.readFileSync(full, 'utf8')
      try {
        await db.query(sql)
        console.log(`✅ Ran migration: ${file}`)
      } catch (err) {
        console.error(`❌ Migration failed in file: ${file}`)
        if (err && err.position) {
          const pos = Number(err.position)
          const start = Math.max(0, pos - 80)
          const end = Math.min(sql.length, pos + 80)
          console.error('Context around error position:')
          console.error(sql.slice(start, end))
        }
        throw err
      }
    }

    console.log('✅ DB ready (all migrations applied)')
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
