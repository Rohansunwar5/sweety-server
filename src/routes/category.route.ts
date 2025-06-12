import { Router } from "express";
import { asyncHandler } from "../utils/asynchandler";
import { createCategory } from "../controllers/category.controller";
import isAdminLoggedIn from "../middlewares/isAdminLoggedIn.middleware";

const categoryRouter = Router();

categoryRouter.post('/create', isAdminLoggedIn, asyncHandler(createCategory));


export default categoryRouter;