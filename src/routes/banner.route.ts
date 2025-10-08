import { Router } from 'express';
import { asyncHandler } from '../utils/asynchandler';
import {
  createBanner,
  getBannerById,
  getAllBanners,
  updateBanner,
  deleteBanner
} from '../controllers/banner.controller';
import isAdminLoggedIn from '../middlewares/isAdminLoggedIn.middleware';

const bannerRouter = Router();

bannerRouter.post('/', isAdminLoggedIn, asyncHandler(createBanner));
bannerRouter.get('/:id', asyncHandler(getBannerById));
bannerRouter.get('/', asyncHandler(getAllBanners));
bannerRouter.patch('/', isAdminLoggedIn,asyncHandler(updateBanner));
bannerRouter.delete('/:id', isAdminLoggedIn, asyncHandler(deleteBanner));

export default bannerRouter;
