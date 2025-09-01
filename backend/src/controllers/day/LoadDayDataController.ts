import { Request, Response } from "express";
import { LoadDayDataService} from "../../services/day/LoadDayDataService";

class LoadDayDataController{
    async handle(req: Request, res: Response){
        const loadDayDataService = new LoadDayDataService();
        const day = await loadDayDataService.execute();

        return res.json(day);
    }

}

export {LoadDayDataController};