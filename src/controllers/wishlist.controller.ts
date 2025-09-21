import { Request, Response, NextFunction } from 'express';
import wishlistService from '../services/wishlist.service';

export const createWishlist = async (req: Request, res: Response, next: NextFunction) => {
    const { name, isPublic } = req.body;
    const userId = req.user?._id;
  
    const response = await wishlistService.createWishlist({
        user: userId,
        name,
        isPublic
    });
 
    next(response);
};

export const getWishlist = async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user?._id;
 
    const response = await wishlistService.getWishlistByUserId(userId);
    next(response);
};

export const addItemToWishlist = async (req: Request, res: Response, next: NextFunction) => {
    const { productId, priceWhenAdded } = req.body;
    const userId = req.user?._id;
 
    const response = await wishlistService.addItemToWishlist({
        userId,
        productId,
        priceWhenAdded
    });
 
    next(response);
};

export const removeItemFromWishlist = async (req: Request, res: Response, next: NextFunction) => {
    const { productId } = req.params;
    const userId = req.user?._id;
 
    const response = await wishlistService.removeItemFromWishlist(userId, productId);
    next(response);
};

export const updateWishlist = async (req: Request, res: Response, next: NextFunction) => {
    const { name, isPublic } = req.body;
    const userId = req.user?._id;
 
    const response = await wishlistService.updateWishlist(userId, { name, isPublic });
 
    next(response);
};

export const clearWishlist = async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user?._id;
 
    const response = await wishlistService.clearWishlist(userId);
    next(response);
};

export const getPublicWishlists = async (req: Request, res: Response, next: NextFunction) => {
    const { page = 1, limit = 10 } = req.query;
 
    const response = await wishlistService.getPublicWishlists({
        page: Number(page),
        limit: Number(limit)
    });
 
    next(response);
};

export const getWishlistItemCount = async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user?._id;
 
    const response = await wishlistService.getWishlistItemCount(userId);
    next({ count: response });
};

export const checkItemInWishlist = async (req: Request, res: Response, next: NextFunction) => {
    const { productId } = req.params;
    const userId = req.user?._id;
 
    const response = await wishlistService.checkItemInWishlist(userId, productId);
    next(response);
};

export const toggleWishlistItem = async (req: Request, res: Response, next: NextFunction) => {
    const { productId, priceWhenAdded } = req.body;
    const userId = req.user?._id;
 
    const response = await wishlistService.toggleWishlistItem(userId, productId, priceWhenAdded);
    next(response);
};

export const updateItemPrice = async (req: Request, res: Response, next: NextFunction) => {
    const { productId } = req.params;
    const { newPrice } = req.body;
    const userId = req.user?._id;
 
    const response = await wishlistService.updateItemPrice(userId, productId, Number(newPrice));
    next(response);
};

export const moveItemToCart = async (req: Request, res: Response, next: NextFunction) => {
    const { productId } = req.params;
    const { quantity = 1, size, colorName, colorHex, selectedImage } = req.body;
    const userId = req.user?._id;
        
    const response = await wishlistService.moveItemToCart({
        userId,
        productId,
        colorName,
        colorHex,
        selectedImage,
        size,
        quantity: Number(quantity)
    });
        
    next(response);
};