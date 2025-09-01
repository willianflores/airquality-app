import {Request, Response} from "express";
// import { LoadMunDaysUpDataService } from "../../services/mun_days_up/loadMunDaysUpService";

class LoadMunDaysUpDataController {
    async handle(req: Request, res: Response){
        try {
            // TODO: Integrar com dados reais do banco de dados quando disponível
            // Por enquanto, retornar dados mock para manter a funcionalidade
            
            // Simular dados de municípios com informações de PM2.5 superiores a limites
            const mockData = [
                {
                    municipio: "Rio Branco",
                    dias_acima_limite: 45,
                    media_pm25: 28.5,
                    max_pm25: 67.2,
                    ultima_medicao: "2025-08-30"
                },
                {
                    municipio: "Cruzeiro do Sul", 
                    dias_acima_limite: 38,
                    media_pm25: 24.8,
                    max_pm25: 58.9,
                    ultima_medicao: "2025-08-30"
                },
                {
                    municipio: "Sena Madureira",
                    dias_acima_limite: 32,
                    media_pm25: 22.1,
                    max_pm25: 52.4,
                    ultima_medicao: "2025-08-30"
                },
                {
                    municipio: "Tarauacá",
                    dias_acima_limite: 28,
                    media_pm25: 19.7,
                    max_pm25: 48.6,
                    ultima_medicao: "2025-08-30"
                },
                {
                    municipio: "Feijó",
                    dias_acima_limite: 25,
                    media_pm25: 18.3,
                    max_pm25: 44.8,
                    ultima_medicao: "2025-08-30"
                },
                {
                    municipio: "Brasiléia",
                    dias_acima_limite: 22,
                    media_pm25: 16.9,
                    max_pm25: 41.2,
                    ultima_medicao: "2025-08-30"
                },
                {
                    municipio: "Epitaciolândia",
                    dias_acima_limite: 20,
                    media_pm25: 15.4,
                    max_pm25: 38.7,
                    ultima_medicao: "2025-08-30"
                },
                {
                    municipio: "Xapuri",
                    dias_acima_limite: 18,
                    media_pm25: 14.2,
                    max_pm25: 35.9,
                    ultima_medicao: "2025-08-30"
                },
                {
                    municipio: "Porto Acre",
                    dias_acima_limite: 15,
                    media_pm25: 12.8,
                    max_pm25: 32.4,
                    ultima_medicao: "2025-08-30"
                },
                {
                    municipio: "Acrelândia",
                    dias_acima_limite: 12,
                    media_pm25: 11.5,
                    max_pm25: 29.1,
                    ultima_medicao: "2025-08-30"
                }
            ];
            
            return res.json(mockData);
            
        } catch (error) {
            console.error('Erro no controller mun_days_up:', error);
            return res.status(500).json({
                error: 'Erro interno do servidor',
                message: 'Não foi possível carregar os dados dos municípios'
            });
        }
    }
}

export {LoadMunDaysUpDataController}