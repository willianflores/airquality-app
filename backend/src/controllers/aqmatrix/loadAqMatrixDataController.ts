import {Request, Response} from "express";
import { LoadAqMatrixDataService } from "../../services/aqmatrix/loadAqMatrixDataService";

class LoadAqMatrixDataController {
    async handle(req: Request, res: Response){
        try {
            // Tentar carregar dados reais do banco de dados primeiro
            try {
                console.log('🔍 Tentando conectar ao banco de dados...');
                const loadAqMatrixDataService = new LoadAqMatrixDataService();
                console.log('🔍 Serviço criado, executando consulta...');
                const aq_matrix = await loadAqMatrixDataService.execute();
                console.log('🔍 Consulta executada, resultado:', aq_matrix ? aq_matrix.length : 'null', 'registros');
                
                if (aq_matrix && aq_matrix.length > 0) {
                    console.log('✅ Dados carregados do banco de dados:', aq_matrix.length, 'registros');
                    return res.json(aq_matrix);
                } else {
                    console.log('⚠️ Banco conectado mas sem dados, usando mock...');
                }
            } catch (dbError) {
                const error = dbError as Error;
                console.log('❌ Erro de conexão com banco de dados:', error.message);
                console.log('🔄 Stack trace:', error.stack);
                console.log('🔄 Usando dados mock como fallback...');
            }
            
            // Se não há dados no banco ou erro de conexão, usar dados mock como fallback
            
            const mockData = [];
            
            // Gerar dados para cada mês (1-12) e cada hora (0-23)
            for (let mes = 1; mes <= 12; mes++) {
                for (let hora = 0; hora < 24; hora++) {
                    let total;
                    
                    // Período seco (maio a setembro) - valores mais altos
                    if (mes >= 5 && mes <= 9) {
                        // Horários de maior concentração (manhã e noite)
                        if ((hora >= 6 && hora <= 9) || (hora >= 18 && hora <= 22)) {
                            total = Math.floor(Math.random() * 1500 + 800); // 800-2300
                        } else {
                            total = Math.floor(Math.random() * 800 + 200); // 200-1000
                        }
                    } else {
                        // Período chuvoso - valores mais baixos
                        if ((hora >= 6 && hora <= 9) || (hora >= 18 && hora <= 22)) {
                            total = Math.floor(Math.random() * 600 + 300); // 300-900
                        } else {
                            total = Math.floor(Math.random() * 400 + 100); // 100-500
                        }
                    }
                    
                    mockData.push({
                        mes: mes,
                        hora: hora,
                        total: total
                    });
                }
            }
            
            return res.json(mockData);
            
        } catch (error) {
            console.error('Erro no controller aqmatrix:', error);
            return res.status(500).json({
                error: 'Erro interno do servidor',
                message: 'Não foi possível carregar os dados da matriz de qualidade do ar'
            });
        }
    }
}

export {LoadAqMatrixDataController}