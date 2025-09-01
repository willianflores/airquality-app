const bcrypt = require('bcryptjs');

class Admin {
  // Lista de administradores (em produção, isso viria do banco de dados)
  static ADMINS = [
    {
      id: 1,
      username: 'admin.mpac',
      email: 'admin@mpac.ac.gov.br',
      // Senha: mpac2024 (hasheada)
      passwordHash: '$2b$10$R4NGTGLXKeyIDZ.KQeRZx.jVJ6TgXGJD0iL16EFAdJKkV1hLWxWG6',
      role: 'super_admin',
      active: true
    },
    {
      id: 2,
      username: 'operador.mpac',
      email: 'operador@mpac.ac.gov.br',
      // Senha: operador123 (hasheada)
      passwordHash: '$2b$10$W/KBP0pxPVczLr7NeR1mvej783kv0pRh0XfWq1.xrJMsNJHWNX0eu',
      role: 'admin',
      active: true
    }
  ];

  static async findByUsername(username) {
    return this.ADMINS.find(admin => 
      admin.username === username && admin.active
    );
  }

  static async findByEmail(email) {
    return this.ADMINS.find(admin => 
      admin.email === email && admin.active
    );
  }

  static async findById(id) {
    return this.ADMINS.find(admin => 
      admin.id === id && admin.active
    );
  }

  static async validatePassword(plainPassword, hashedPassword) {
    return await bcrypt.compare(plainPassword, hashedPassword);
  }

  static async hashPassword(plainPassword) {
    return await bcrypt.hash(plainPassword, 10);
  }

  // Método para criar novo admin (uso futuro)
  static async createAdmin(username, email, password, role = 'admin') {
    const hashedPassword = await this.hashPassword(password);
    const newId = Math.max(...this.ADMINS.map(a => a.id)) + 1;
    
    const newAdmin = {
      id: newId,
      username,
      email,
      passwordHash: hashedPassword,
      role,
      active: true
    };

    this.ADMINS.push(newAdmin);
    return newAdmin;
  }
}

module.exports = Admin;
