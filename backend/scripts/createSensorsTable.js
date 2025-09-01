const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createSensorsTable() {
  try {
    console.log('🔧 Criando tabela sensors...');
    
    // Usar raw SQL para criar a tabela de forma segura
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS sensors (
        id SERIAL PRIMARY KEY,
        code VARCHAR UNIQUE,
        sensor_index VARCHAR UNIQUE,
        name VARCHAR,
        municipio VARCHAR,
        institution VARCHAR,
        location VARCHAR,
        active BOOLEAN DEFAULT true,
        latitude FLOAT,
        longitude FLOAT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `;
    
    console.log('✅ Tabela sensors criada com sucesso!');
    
    // Verificar se a tabela foi criada
    const result = await prisma.$queryRaw`
      SELECT tablename FROM pg_tables WHERE tablename = 'sensors';
    `;
    
    if (result.length > 0) {
      console.log('📊 Tabela sensors confirmada no banco de dados');
    } else {
      console.log('❌ Erro: Tabela sensors não foi encontrada');
    }
    
  } catch (error) {
    console.error('💥 Erro ao criar tabela:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  createSensorsTable();
}

module.exports = { createSensorsTable };
