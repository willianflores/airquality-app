const express = require('express');
const authController = require('../controllers/auth/authController');
const { requireAuth } = require('../middleware/authMiddleware');
const router = express.Router();

// ===== ROTAS DE AUTENTICAÇÃO =====

// POST /api/auth/login - Login do administrador
router.post('/login', authController.login);

// POST /api/auth/verify - Verificar se token é válido
router.post('/verify', authController.verifyToken);

// POST /api/auth/refresh - Renovar token
router.post('/refresh', authController.refreshToken);

// POST /api/auth/logout - Logout
router.post('/logout', authController.logout);

// GET /api/auth/me - Informações do admin logado (protegida)
router.get('/me', requireAuth, authController.me);

module.exports = router;
