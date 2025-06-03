import { Router } from "express";
import isLoggedIn from "../middlewares/isLoggedIn.middleware";
import { asyncHandler } from "../utils/asynchandler";
import { createCategory } from "../controllers/category.controller";

const categoryRouter = Router();

categoryRouter.post('/create', isLoggedIn, asyncHandler(createCategory));


export default categoryRouter;