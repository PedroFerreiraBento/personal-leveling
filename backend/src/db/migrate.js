const fs = require('fs');
const path = require('path');
const db = require('./connection');

async function runMigrations() {
  try {
    console.log('🔄 Iniciando migrações do banco de dados...');
    
    // Ler o arquivo de schema
    const schemaPath = path.join(__dirname, 'migrations', '001_init.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    // Executar o schema
    await db.query(schema);
    
    console.log('✅ Migrações aplicadas com sucesso!');
    console.log('📊 Tabelas criadas: users, activities, tasks');
    console.log('🔗 Índices e triggers configurados');
    
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
