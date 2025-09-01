import { Request, Response } from "express";
import { LoadDayDataByMunService } from "../../services/day/LoadDayDataByMunService";

class LoadDayDataByMunController{
    async handle(req: Request, res: Response){
        const municipio = req.query.municipio as string;
        const listByMun = new LoadDayDataByMunService;
        const munData = await listByMun.execute({
            municipio
        });

        return res.json(munData);
    }
}

export {LoadDayDataByMunController};