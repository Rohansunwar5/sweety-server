import { NextFunction, Request, Response } from 'express';
import bannerService from '../services/banner.service';

export const createBanner = async (req: Request, res: Response, next: NextFunction) => {
  const { name, link, imageUrl } = req.body;
  try {
    const response = await bannerService.createBanner({ name, link, imageUrl });
    next(response);
  } catch (error) {
    next(error);
  }
};

export const getBannerById = async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  try {
    const response = await bannerService.getBannerById(id);
    next(response);
  } catch (error) {
    next(error);
  }
};

export const getAllBanners = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const response = await bannerService.getAllBanners();
    next(response);
  } catch (error) {
    next(error);
  }
};

export const updateBanner = async (req: Request, res: Response, next: NextFunction) => {
  const { _id, name, link, imageUrl } = req.body;
  try {
    const response = await bannerService.updateBanner({ _id, name, link, imageUrl });
    next(response);
  } catch (error) {
    next(error);
  }
};

export const deleteBanner = async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  try {
    const response = await bannerService.deleteBanner(id);
    next(response);
  } catch (error) {
    next(error);
  }
};
