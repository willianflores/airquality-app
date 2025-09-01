import prismaClient from "../../prisma";

export interface SensorData {
  id?: number;
  code: string;
  sensor_index: string;
  name: string;
  municipio: string;
  institution?: string;
  location?: string;
  active?: boolean;
  latitude?: number;
  longitude?: number;
}

class SensorService {
  // Buscar todos os sensores ativos
  async getActiveSensors() {
    return await prismaClient.sensor.findMany({
      where: { active: true },
      orderBy: { municipio: 'asc' }
    });
  }

  // Buscar todos os sensores (ativos e inativos)
  async getAllSensors() {
    return await prismaClient.sensor.findMany({
      orderBy: { municipio: 'asc' }
    });
  }

  // Buscar sensor por código
  async getSensorByCode(code: string) {
    return await prismaClient.sensor.findUnique({
      where: { code: code.toUpperCase() }
    });
  }

  // Buscar sensor por sensor_index (ID PurpleAir)
  async getSensorByIndex(sensor_index: string) {
    return await prismaClient.sensor.findUnique({
      where: { sensor_index }
    });
  }

  // Criar novo sensor
  async createSensor(data: SensorData) {
    return await prismaClient.sensor.create({
      data: {
        code: data.code.toUpperCase(),
        sensor_index: data.sensor_index,
        name: data.name,
        municipio: data.municipio,
        institution: data.institution,
        location: data.location,
        active: data.active ?? true,
        latitude: data.latitude,
        longitude: data.longitude
      }
    });
  }

  // Atualizar sensor
  async updateSensor(id: number, data: Partial<SensorData>) {
    return await prismaClient.sensor.update({
      where: { id },
      data: {
        ...(data.code && { code: data.code.toUpperCase() }),
        ...(data.sensor_index && { sensor_index: data.sensor_index }),
        ...(data.name && { name: data.name }),
        ...(data.municipio && { municipio: data.municipio }),
        ...(data.institution !== undefined && { institution: data.institution }),
        ...(data.location !== undefined && { location: data.location }),
        ...(data.active !== undefined && { active: data.active }),
        ...(data.latitude !== undefined && { latitude: data.latitude }),
        ...(data.longitude !== undefined && { longitude: data.longitude })
      }
    });
  }

  // Desativar sensor (ao invés de deletar)
  async deactivateSensor(id: number) {
    return await prismaClient.sensor.update({
      where: { id },
      data: { active: false }
    });
  }

  // Reativar sensor
  async activateSensor(id: number) {
    return await prismaClient.sensor.update({
      where: { id },
      data: { active: true }
    });
  }

  // Deletar sensor permanentemente
  async deleteSensor(id: number) {
    return await prismaClient.sensor.delete({
      where: { id }
    });
  }

  // Buscar sensores por município
  async getSensorsByMunicipio(municipio: string) {
    return await prismaClient.sensor.findMany({
      where: { 
        municipio: {
          contains: municipio,
          mode: 'insensitive'
        },
        active: true
      }
    });
  }

  // Obter lista de IDs para a API PurpleAir
  async getPurpleAirIds() {
    const sensors = await this.getActiveSensors();
    return sensors.map(sensor => sensor.sensor_index);
  }
}

export default new SensorService();
