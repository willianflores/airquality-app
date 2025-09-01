import {Router, Request, Response} from "express";

import { LoadDayDataController } from "./controllers/day/LoadDayDataController";
import { LoadDayDataByMunController } from "./controllers/day/LoadDayDataByMunController";
import { LoadHourDataController } from "./controllers/hour/LoadHourDataController";
import { LoadAqMatrixDataController } from "./controllers/aqmatrix/loadAqMatrixDataController";
import { LoadMunDaysUpDataController } from "./controllers/mun_days_up/loadMunDaysUDataController";

// Importar rota de sensores PurpleAir
const sensorsRouter = require("./routes/sensors");
// Importar rota de administração
const adminRouter = require("./routes/admin");
// Importar rota de autenticação
const authRouter = require("./routes/auth");

const router = Router();

//-- DAY ROUTES --
router.get("/day", new LoadDayDataController().handle);
router.get("/day/municipio", new LoadDayDataByMunController().handle);

//-- HOUR ROUTES --
router.get("/hour", new LoadHourDataController().handle);

//-- AQMATRIX ROUTES --
router.get("/aqmatrix", new LoadAqMatrixDataController().handle);

//-- MUN DAYS UP ROUTES --
router.get("/mundaysup", new LoadMunDaysUpDataController().handle);

//-- SENSORS ROUTES --
router.use("/sensors", sensorsRouter);

//-- AUTH ROUTES --
router.use("/auth", authRouter);

//-- ADMIN ROUTES --
router.use("/admin", adminRouter);

export { router };

