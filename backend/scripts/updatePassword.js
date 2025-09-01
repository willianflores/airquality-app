const bcrypt = require('bcryptjs');

async function generatePasswordHash(password) {
  const hash = await bcrypt.hash(password, 10);
  console.log(`Senha: ${password}`);
  console.log(`Hash: ${hash}\n`);
  return hash;
}

async function updatePasswords() {
  console.log('🔐 GERADOR DE HASHES PARA SENHAS ADMINISTRATIVAS\n');
  
  // Senhas personalizadas - ALTERE AQUI
  const newPasswords = {
    'admin.mpac': 'NOVA_SENHA_SUPER_ADMIN_AQUI',      // ← Alterar esta senha
    'operador.mpac': 'NOVA_SENHA_ADMIN_AQUI'          // ← Alterar esta senha
  };

  console.log('📝 Novos hashes para atualizar no código:\n');
  
  for (const [username, password] of Object.entries(newPasswords)) {
    console.log(`👤 ${username}:`);
    await generatePasswordHash(password);
  }

  console.log('📋 INSTRUÇÕES:');
  console.log('1. Copie os hashes gerados acima');
  console.log('2. Substitua no arquivo: backend/src/models/Admin.js');
  console.log('3. Reinicie o backend: npm run dev');
  console.log('4. As novas senhas estarão ativas! ✅\n');
}

updatePasswords();
