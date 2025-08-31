const fs = require('fs');
const path = require('path');
const db = require('./connection');

async function runMigrations() {
  try {
    // Minimal output only
    console.log('🔄 Iniciando migrações do banco de dados...');

    const migrationsDir = path.join(__dirname, 'migrations');
    const files = fs
      .readdirSync(migrationsDir)
      .filter((f) => f.toLowerCase().endsWith('.sql'))
      .sort((a, b) => a.localeCompare(b));

    for (const file of files) {
      const fullPath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(fullPath, 'utf8');
      if (sql && sql.trim().length > 0) {
        await db.query(sql);
      }
    }

    console.log('✅ Migrações aplicadas com sucesso!');
  } catch (error) {
    console.error('❌ Erro ao executar migrações:', error);
    process.exit(1);
  } finally {
    await db.pool.end();
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  runMigrations();
}

module.exports = { runMigrations };
