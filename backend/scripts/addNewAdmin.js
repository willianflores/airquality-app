const bcrypt = require('bcryptjs');

async function generateNewAdminCredentials() {
  console.log('🔐 CRIADOR DE NOVOS ADMINISTRADORES\n');
  
  // ⚠️ CONFIGURE AQUI OS DADOS DO NOVO ADMINISTRADOR
  const newAdmin = {
    username: 'willian.flores',           // ← Nome de usuário
    email: 'willian.flores@ufac.br',   // ← Email
    password: 'soil7525',     // ← Senha segura
    role: 'super_admin'                       // ← 'admin' ou 'super_admin'
  };

  // Gerar hash da senha
  const passwordHash = await bcrypt.hash(newAdmin.password, 10);
  
  // Próximo número disponível
  const nextNumber = 3; // Ajustar conforme necessário
  
  console.log('📋 ADICIONE ESTAS LINHAS AO ARQUIVO .env:\n');
  console.log(`ADMIN_USERNAME_${nextNumber}="${newAdmin.username}"`);
  console.log(`ADMIN_EMAIL_${nextNumber}="${newAdmin.email}"`);
  console.log(`ADMIN_PASSWORD_HASH_${nextNumber}="${passwordHash}"`);
  
  console.log('\n🔧 PRÓXIMOS PASSOS:');
  console.log('1. Copie as linhas acima para backend/.env');
  console.log('2. Adicione o usuário no AdminSecure.js');
  console.log('3. Reinicie o backend');
  console.log('4. ✅ Novo administrador ativo!\n');
  
  console.log('📝 DADOS DE ACESSO:');
  console.log(`   Usuário: ${newAdmin.username}`);
  console.log(`   Email: ${newAdmin.email}`);
  console.log(`   Senha: ${newAdmin.password}`);
  console.log(`   Nível: ${newAdmin.role}\n`);
  
  console.log('⚠️  LEMBRE-SE:');
  console.log('- Altere os dados no topo deste script');
  console.log('- Use senhas seguras (12+ caracteres)');
  console.log('- Delete este script após uso');
}

generateNewAdminCredentials();
