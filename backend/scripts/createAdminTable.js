const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createAdminTable() {
  try {
    console.log('🔧 Criando tabela de administradores...');
    
    // Criar tabela admins
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS admins (
        id SERIAL PRIMARY KEY,
        username VARCHAR UNIQUE NOT NULL,
        email VARCHAR UNIQUE NOT NULL,
        password_hash VARCHAR NOT NULL,
        role VARCHAR DEFAULT 'admin',
        active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `;
    
    console.log('✅ Tabela admins criada!');
    
    // Criar administradores padrão
    const defaultAdmins = [
      {
        username: 'admin.mpac',
        email: 'admin@mpac.ac.gov.br',
        password: 'mpac2024',
        role: 'super_admin'
      },
      {
        username: 'operador.mpac', 
        email: 'operador@mpac.ac.gov.br',
        password: 'operador123',
        role: 'admin'
      }
    ];

    for (const admin of defaultAdmins) {
      const passwordHash = await bcrypt.hash(admin.password, 10);
      
      await prisma.$executeRaw`
        INSERT INTO admins (username, email, password_hash, role)
        VALUES (${admin.username}, ${admin.email}, ${passwordHash}, ${admin.role})
        ON CONFLICT (username) DO NOTHING;
      `;
      
      console.log(`👤 Admin ${admin.username} inserido no banco`);
    }

    console.log('\n🎉 Configuração concluída!');
    console.log('📝 Para usar o banco ao invés do arquivo, altere o Admin.js');
    
  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  createAdminTable();
}

module.exports = { createAdminTable };
