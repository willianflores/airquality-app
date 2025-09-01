const express = require('express');
const sensorController = require('../controllers/sensors/sensorController').default;
const { requireAuth, requireAdmin } = require('../middleware/authMiddleware');
const router = express.Router();

// Middleware de autenticação para todas as rotas admin
router.use(requireAuth);
router.use(requireAdmin);

// ===== GESTÃO DE SENSORES =====

// GET /api/admin/sensors - Listar todos os sensores
router.get('/sensors', sensorController.listSensors);

// GET /api/admin/sensors/active - Listar apenas sensores ativos  
router.get('/sensors/active', sensorController.listActiveSensors);

// GET /api/admin/sensors/:id - Buscar sensor específico
router.get('/sensors/:id', sensorController.getSensor);

// POST /api/admin/sensors - Criar novo sensor
router.post('/sensors', sensorController.createSensor);

// PUT /api/admin/sensors/:id - Atualizar sensor
router.put('/sensors/:id', sensorController.updateSensor);

// PATCH /api/admin/sensors/:id/deactivate - Desativar sensor
router.patch('/sensors/:id/deactivate', sensorController.deactivateSensor);

// PATCH /api/admin/sensors/:id/activate - Reativar sensor
router.patch('/sensors/:id/activate', sensorController.activateSensor);

// DELETE /api/admin/sensors/:id - Deletar sensor permanentemente
router.delete('/sensors/:id', sensorController.deleteSensor);

module.exports = router;
