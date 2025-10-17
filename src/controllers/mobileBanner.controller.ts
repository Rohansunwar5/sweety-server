import { NextFunction, Request, Response } from 'express';
import mobileBannerService from '../services/mobileBanner.service';

export const createBanner = async (req: Request, res: Response, next: NextFunction) => {
  const { name, link, imageUrl } = req.body;
  try {
    const response = await mobileBannerService.createBanner({ name, link, imageUrl });
    next(response);
  } catch (error) {
    next(error);
  }
};

export const getBannerById = async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  try {
    const response = await mobileBannerService.getBannerById(id);
    next(response);
  } catch (error) {
    next(error);
  }
};

export const getAllBanners = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const response = await mobileBannerService.getAllBanners();
    next(response);
  } catch (error) {
    next(error);
  }
};

export const updateBanner = async (req: Request, res: Response, next: NextFunction) => {
  const { _id, name, link, imageUrl } = req.body;
  try {
    const response = await mobileBannerService.updateBanner({ _id, name, link, imageUrl });
    next(response);
  } catch (error) {
    next(error);
  }
};

export const deleteBanner = async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  try {
    const response = await mobileBannerService.deleteBanner(id);
    next(response);
  } catch (error) {
    next(error);
  }
};
