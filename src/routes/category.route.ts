import { Router } from "express";
import { asyncHandler } from "../utils/asynchandler";
import { createCategory, getAllCategories } from "../controllers/category.controller";
import isAdminLoggedIn from "../middlewares/isAdminLoggedIn.middleware";

const categoryRouter = Router();

categoryRouter.post('/create', isAdminLoggedIn, asyncHandler(createCategory));
categoryRouter.get('/get-all-categories', isAdminLoggedIn, asyncHandler(getAllCategories));


export default categoryRouter;