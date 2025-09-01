const authService = require('../../services/auth/authService');

class AuthController {
  // POST /api/auth/login
  async login(req, res) {
    try {
      const { username, password } = req.body;

      // Validações básicas
      if (!username || !password) {
        return res.status(400).json({
          success: false,
          error: 'Username e senha são obrigatórios'
        });
      }

      const result = await authService.login(username, password);

      if (!result.success) {
        return res.status(401).json({
          success: false,
          error: result.error
        });
      }

      res.json({
        success: true,
        data: {
          token: result.token,
          admin: result.admin
        },
        message: 'Login realizado com sucesso'
      });
    } catch (error) {
      console.error('Erro no login:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }

  // POST /api/auth/verify
  async verifyToken(req, res) {
    try {
      const { token } = req.body;

      if (!token) {
        return res.status(400).json({
          success: false,
          error: 'Token é obrigatório'
        });
      }

      const result = await authService.verifyToken(token);

      if (!result.success) {
        return res.status(401).json({
          success: false,
          error: result.error
        });
      }

      res.json({
        success: true,
        data: {
          admin: result.admin
        },
        message: 'Token válido'
      });
    } catch (error) {
      console.error('Erro na verificação do token:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }

  // POST /api/auth/refresh
  async refreshToken(req, res) {
    try {
      const { token } = req.body;

      if (!token) {
        return res.status(400).json({
          success: false,
          error: 'Token é obrigatório'
        });
      }

      const result = await authService.refreshToken(token);

      if (!result.success) {
        return res.status(401).json({
          success: false,
          error: result.error
        });
      }

      res.json({
        success: true,
        data: {
          token: result.token
        },
        message: 'Token renovado com sucesso'
      });
    } catch (error) {
      console.error('Erro ao renovar token:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }

  // POST /api/auth/logout
  async logout(req, res) {
    try {
      const result = await authService.logout();

      res.json({
        success: true,
        message: result.message
      });
    } catch (error) {
      console.error('Erro no logout:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }

  // GET /api/auth/me - Informações do admin logado
  async me(req, res) {
    try {
      // req.admin vem do middleware de autenticação
      res.json({
        success: true,
        data: {
          admin: req.admin
        }
      });
    } catch (error) {
      console.error('Erro ao buscar informações do admin:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }
}

module.exports = new AuthController();
