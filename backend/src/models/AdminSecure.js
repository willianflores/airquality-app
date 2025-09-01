const bcrypt = require('bcryptjs');

class AdminSecure {
  // ✅ SEGURO: Senhas vêm das variáveis de ambiente
  static async getAdmins() {
    const admins = [
      {
        id: 1,
        username: process.env.ADMIN_USERNAME_1 || 'admin.mpac',
        email: process.env.ADMIN_EMAIL_1 || 'admin@mpac.ac.gov.br',
        passwordHash: process.env.ADMIN_PASSWORD_HASH_1,
        role: 'super_admin',
        active: true
      },
      {
        id: 2,
        username: process.env.ADMIN_USERNAME_2 || 'operador.mpac',
        email: process.env.ADMIN_EMAIL_2 || 'operador@mpac.ac.gov.br',
        passwordHash: process.env.ADMIN_PASSWORD_HASH_2,
        role: 'admin',
        active: true
      },
      // ADICIONE NOVOS USUÁRIOS AQUI:
      {
        id: 3,
        username: process.env.ADMIN_USERNAME_3 || 'willian.flores',
        email: process.env.ADMIN_EMAIL_3 || 'willian.flores@ufac.br',
        passwordHash: process.env.ADMIN_PASSWORD_HASH_3,
        role: 'super_admin', // Ajustar conforme necessário
        active: true
      }
      // Pode adicionar mais usuários seguindo o mesmo padrão...
    ];

    // Filtrar apenas admins com senhas configuradas
    return admins.filter(admin => admin.passwordHash);
  }

  static async findByUsername(username) {
    const admins = await this.getAdmins();
    return admins.find(admin => 
      admin.username === username && admin.active
    );
  }

  static async findByEmail(email) {
    const admins = await this.getAdmins();
    return admins.find(admin => 
      admin.email === email && admin.active
    );
  }

  static async findById(id) {
    const admins = await this.getAdmins();
    return admins.find(admin => 
      admin.id === id && admin.active
    );
  }

  static async validatePassword(plainPassword, hashedPassword) {
    return await bcrypt.compare(plainPassword, hashedPassword);
  }

  static async hashPassword(plainPassword) {
    return await bcrypt.hash(plainPassword, 10);
  }

  // Verificar se admin está configurado
  static async isConfigured() {
    const admins = await this.getAdmins();
    return admins.length > 0;
  }

  // Gerar hashes para .env
  static async generateEnvHashes(passwords) {
    console.log('🔐 Gerando hashes para .env:\n');
    
    for (const [key, password] of Object.entries(passwords)) {
      const hash = await this.hashPassword(password);
      console.log(`${key}="${hash}"`);
    }
  }
}

module.exports = AdminSecure;
