import { Request, Response } from "express";
import sensorService, { SensorData } from "../../services/sensors/sensorService";
import prismaClient from "../../prisma";

class SensorController {
  // GET /api/admin/sensors - Listar todos os sensores
  async listSensors(req: Request, res: Response) {
    try {
      const sensors = await sensorService.getAllSensors();
      
      res.json({
        success: true,
        data: sensors,
        total: sensors.length
      });
    } catch (error) {
      console.error('Erro ao listar sensores:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  // GET /api/admin/sensors/active - Listar apenas sensores ativos
  async listActiveSensors(req: Request, res: Response) {
    try {
      const sensors = await sensorService.getActiveSensors();
      
      res.json({
        success: true,
        data: sensors,
        total: sensors.length
      });
    } catch (error) {
      console.error('Erro ao listar sensores ativos:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }

  // GET /api/admin/sensors/:id - Buscar sensor por ID
  async getSensor(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({
          success: false,
          error: 'ID inválido'
        });
      }

      const sensor = await sensorService.getSensorByCode(req.params.id) || 
                    await prismaClient.sensor.findUnique({ where: { id } });

      if (!sensor) {
        return res.status(404).json({
          success: false,
          error: 'Sensor não encontrado'
        });
      }

      res.json({
        success: true,
        data: sensor
      });
    } catch (error) {
      console.error('Erro ao buscar sensor:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }

  // POST /api/admin/sensors - Criar novo sensor
  async createSensor(req: Request, res: Response) {
    try {
      const sensorData: SensorData = req.body;

      // Validações básicas
      if (!sensorData.code || !sensorData.sensor_index || !sensorData.name || !sensorData.municipio) {
        return res.status(400).json({
          success: false,
          error: 'Campos obrigatórios: code, sensor_index, name, municipio'
        });
      }

      // Verificar se já existe sensor com mesmo código ou index
      const existingByCode = await sensorService.getSensorByCode(sensorData.code);
      const existingByIndex = await sensorService.getSensorByIndex(sensorData.sensor_index);

      if (existingByCode) {
        return res.status(400).json({
          success: false,
          error: `Já existe um sensor com o código ${sensorData.code}`
        });
      }

      if (existingByIndex) {
        return res.status(400).json({
          success: false,
          error: `Já existe um sensor com o ID PurpleAir ${sensorData.sensor_index}`
        });
      }

      const newSensor = await sensorService.createSensor(sensorData);

      res.status(201).json({
        success: true,
        data: newSensor,
        message: 'Sensor criado com sucesso'
      });
    } catch (error) {
      console.error('Erro ao criar sensor:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }

  // PUT /api/admin/sensors/:id - Atualizar sensor
  async updateSensor(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      const updateData: Partial<SensorData> = req.body;

      if (isNaN(id)) {
        return res.status(400).json({
          success: false,
          error: 'ID inválido'
        });
      }

      const updatedSensor = await sensorService.updateSensor(id, updateData);

      res.json({
        success: true,
        data: updatedSensor,
        message: 'Sensor atualizado com sucesso'
      });
    } catch (error) {
      console.error('Erro ao atualizar sensor:', error);
      
      if (error.code === 'P2025') {
        return res.status(404).json({
          success: false,
          error: 'Sensor não encontrado'
        });
      }

      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }

  // PATCH /api/admin/sensors/:id/deactivate - Desativar sensor
  async deactivateSensor(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);

      if (isNaN(id)) {
        return res.status(400).json({
          success: false,
          error: 'ID inválido'
        });
      }

      const sensor = await sensorService.deactivateSensor(id);

      res.json({
        success: true,
        data: sensor,
        message: 'Sensor desativado com sucesso'
      });
    } catch (error) {
      console.error('Erro ao desativar sensor:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }

  // PATCH /api/admin/sensors/:id/activate - Reativar sensor
  async activateSensor(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);

      if (isNaN(id)) {
        return res.status(400).json({
          success: false,
          error: 'ID inválido'
        });
      }

      const sensor = await sensorService.activateSensor(id);

      res.json({
        success: true,
        data: sensor,
        message: 'Sensor reativado com sucesso'
      });
    } catch (error) {
      console.error('Erro ao reativar sensor:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }

  // DELETE /api/admin/sensors/:id - Deletar sensor permanentemente
  async deleteSensor(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);

      if (isNaN(id)) {
        return res.status(400).json({
          success: false,
          error: 'ID inválido'
        });
      }

      await sensorService.deleteSensor(id);

      res.json({
        success: true,
        message: 'Sensor deletado permanentemente'
      });
    } catch (error) {
      console.error('Erro ao deletar sensor:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }
}

export default new SensorController();
