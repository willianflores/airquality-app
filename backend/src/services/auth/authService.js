const jwt = require('jsonwebtoken');
const AdminSecure = require('../../models/AdminSecure');

const JWT_SECRET = process.env.JWT_SECRET || 'mpac_sensors_admin_secret_2024';
const JWT_EXPIRES_IN = '24h';

class AuthService {
  // Login do administrador
  async login(username, password) {
    try {
      // Verificar se sistema está configurado
      const isConfigured = await AdminSecure.isConfigured();
      if (!isConfigured) {
        throw new Error('Sistema não configurado. Verifique as variáveis de ambiente.');
      }

      // Buscar admin por username ou email
      let admin = await AdminSecure.findByUsername(username);
      if (!admin) {
        admin = await AdminSecure.findByEmail(username);
      }

      if (!admin) {
        throw new Error('Credenciais inválidas');
      }

      // Validar senha
      const isValidPassword = await AdminSecure.validatePassword(password, admin.passwordHash);
      if (!isValidPassword) {
        throw new Error('Credenciais inválidas');
      }

      // Gerar token JWT
      const token = jwt.sign(
        {
          id: admin.id,
          username: admin.username,
          email: admin.email,
          role: admin.role
        },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
      );

      return {
        success: true,
        token,
        admin: {
          id: admin.id,
          username: admin.username,
          email: admin.email,
          role: admin.role
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Verificar token JWT
  async verifyToken(token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      
      // Verificar se admin ainda existe e está ativo
      const admin = await AdminSecure.findById(decoded.id);
      if (!admin) {
        throw new Error('Admin não encontrado');
      }

      return {
        success: true,
        admin: {
          id: admin.id,
          username: admin.username,
          email: admin.email,
          role: admin.role
        }
      };
    } catch (error) {
      return {
        success: false,
        error: 'Token inválido ou expirado'
      };
    }
  }

  // Refresh token
  async refreshToken(token) {
    try {
      const decoded = jwt.decode(token);
      const admin = await AdminSecure.findById(decoded.id);
      
      if (!admin) {
        throw new Error('Admin não encontrado');
      }

      const newToken = jwt.sign(
        {
          id: admin.id,
          username: admin.username,
          email: admin.email,
          role: admin.role
        },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
      );

      return {
        success: true,
        token: newToken
      };
    } catch (error) {
      return {
        success: false,
        error: 'Erro ao renovar token'
      };
    }
  }

  // Logout (invalidar token - em produção usar blacklist)
  async logout() {
    return {
      success: true,
      message: 'Logout realizado com sucesso'
    };
  }
}

module.exports = new AuthService();
