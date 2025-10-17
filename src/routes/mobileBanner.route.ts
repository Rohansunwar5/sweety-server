import { Router } from "express";
import { asyncHandler } from "../utils/asynchandler";
import isAdminLoggedIn from "../middlewares/isAdminLoggedIn.middleware";
import { createBanner, deleteBanner, getAllBanners, getBannerById, updateBanner } from "../controllers/mobileBanner.controller";


const mobileBannerRouter = Router();

mobileBannerRouter.post('/', isAdminLoggedIn, asyncHandler(createBanner));
mobileBannerRouter.get('/:id', asyncHandler(getBannerById));
mobileBannerRouter.get('/', asyncHandler(getAllBanners));
mobileBannerRouter.patch('/', isAdminLoggedIn,asyncHandler(updateBanner));
mobileBannerRouter.delete('/:id', isAdminLoggedIn, asyncHandler(deleteBanner));

export default mobileBannerRouter;
