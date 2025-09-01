const authService = require('../services/auth/authService');

// Middleware para verificar autenticação
async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Token de acesso requerido'
      });
    }

    const token = authHeader.substring(7); // Remove "Bearer "
    
    const result = await authService.verifyToken(token);
    
    if (!result.success) {
      return res.status(401).json({
        success: false,
        error: result.error
      });
    }

    // Adicionar informações do admin na requisição
    req.admin = result.admin;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: 'Erro na verificação de autenticação'
    });
  }
}

// Middleware para verificar role específica
function requireRole(allowedRoles) {
  return (req, res, next) => {
    if (!req.admin) {
      return res.status(401).json({
        success: false,
        error: 'Autenticação requerida'
      });
    }

    if (!allowedRoles.includes(req.admin.role)) {
      return res.status(403).json({
        success: false,
        error: 'Permissão insuficiente'
      });
    }

    next();
  };
}

// Middleware para super admin apenas
function requireSuperAdmin(req, res, next) {
  return requireRole(['super_admin'])(req, res, next);
}

// Middleware para admin ou super admin
function requireAdmin(req, res, next) {
  return requireRole(['admin', 'super_admin'])(req, res, next);
}

module.exports = {
  requireAuth,
  requireRole,
  requireSuperAdmin,
  requireAdmin
};
