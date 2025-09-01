const bcrypt = require('bcryptjs');

async function generateHashes() {
  try {
    console.log('🔐 Gerando hashes de senhas...\n');
    
    // Senhas padrão
    const passwords = [
      { user: 'admin.mpac', password: 'mpac2024' },
      { user: 'operador.mpac', password: 'operador123' }
    ];

    for (const { user, password } of passwords) {
      const hash = await bcrypt.hash(password, 10);
      console.log(`${user}:`);
      console.log(`  Senha: ${password}`);
      console.log(`  Hash: ${hash}\n`);
    }

    // Testar validação
    console.log('🧪 Testando validação...');
    const testHash = await bcrypt.hash('mpac2024', 10);
    const isValid = await bcrypt.compare('mpac2024', testHash);
    console.log(`Validação funciona: ${isValid ? '✅' : '❌'}`);

  } catch (error) {
    console.error('❌ Erro:', error);
  }
}

generateHashes();
