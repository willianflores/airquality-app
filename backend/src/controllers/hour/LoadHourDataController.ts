import { Request, Response } from "express";
import { LoadHourDataService } from "../../services/hour/LoadHourDataService";

class LoadHourDataController {
    async handle(req: Request, res: Response): Promise<Response> {
        try {
            // Obtém a data dos parâmetros da query
            const { date } = req.query;

            // Valida se a data foi fornecida
            if (!date || typeof date !== "string") {
                return res.status(400).json({ error: "A data é obrigatória e deve estar em formato string." });
            }

            const loadHourDataService = new LoadHourDataService();

            // Executa o serviço com o filtro de data
            const data = await loadHourDataService.execute(date);

            return res.json(data);
        } catch (error) {
            console.error("Erro ao carregar dados:", error);
            return res.status(500).json({ error: "Erro ao carregar dados." });
        }
    }
}

export { LoadHourDataController };
