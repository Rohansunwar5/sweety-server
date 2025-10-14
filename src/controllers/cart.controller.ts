import { NextFunction, Request, Response } from 'express';
import cartService from '../services/cart.service';
import { ApplyDiscountInput, CartItemInput, RemoveDiscountInput, UpdateCartItemInput } from '../repository/cart.repository';
import discountService from '../services/discount.service';

export const getCart = async (req: Request, res: Response, next: NextFunction) => {
  const { _id: userId } = req.user;
  const response = await cartService.getCart(userId);
  
  next(response);
};

export const addItemToCart = async (req: Request, res: Response, next: NextFunction) => {
  const { _id: userId } = req.user;
  const itemData: CartItemInput = req.body;
  const response = await cartService.addItemToCart(userId, itemData);

  next(response);
};

export const updateCartItemByProduct = async (req: Request, res: Response, next: NextFunction) => {
  const { _id: userId } = req.user;
  const { itemId } = req.params; 
  const updateData: UpdateCartItemInput = req.body; 
  
  const response = await cartService.updateCartItemByProduct(userId, itemId, updateData);
  next(response);
};

export const removeCartItemByProduct = async (req: Request, res: Response, next: NextFunction) => {
  const { _id: userId } = req.user;
  const { productId } = req.params;
  const { size, colorName } = req.query;
  
  const response = await cartService.removeCartItemByProduct(
    userId, 
    productId, 
    colorName as string, 
    size as string
  );
  next(response);
};

export const applyDiscount = async (req: Request, res: Response, next: NextFunction) => {
  const { _id: userId } = req.user;
  const discountData: ApplyDiscountInput = req.body;
  const response = await cartService.applyDiscount(userId, discountData);

  next(response);
};

export const validateDiscountForUser = async (req: Request, res: Response, next: NextFunction) => {
  const { _id: userId } = req.user;
  const { code } = req.body;
  
  const hasUsed = await discountService.hasUserUsedDiscount(code, userId);
  
  next({
    success: true,
    data: {
      canUse: !hasUsed,
      message: hasUsed ? 'You have already used this discount code' : 'Discount is available'
    }
  });
};


export const removeDiscount = async (req: Request, res: Response, next: NextFunction) => {
  const { _id: userId } = req.user;
  const discountData: RemoveDiscountInput = req.body;
  const response = await cartService.removeDiscount(userId, discountData);
  next(response);
};

export const clearCartItems = async (req: Request, res: Response, next: NextFunction) => {
  const userId = req.user?._id;
  const cart = await cartService.clearCartItems(userId.toString());
  
  next(cart);
};

export const deleteCart = async (req: Request, res: Response, next: NextFunction) => {
  const userId = req.user?._id;
  const reponse = await cartService.deleteCart(userId.toString());
  
  next(reponse);
};

export const getCartWithDetails = async (req: Request, res: Response, next: NextFunction) => {
  const { _id: userId } = req.user;
  const response = await cartService.getCartWithDetails(userId);
  
  next(response);
};

export const getGuestCartWithDetails = async (req: Request, res: Response, next: NextFunction) => {
  const { sessionId } = req.params;
  const response = await cartService.getGuestCartWithDetails(sessionId);
  next(response);
};

export const getGuestCart = async (req: Request, res: Response, next: NextFunction) => {
  const { sessionId } = req.params;
  const response = await cartService.getGuestCart(sessionId);
  
  next(response);
};

export const addItemToGuestCart = async (req: Request, res: Response, next: NextFunction) => {
  const { sessionId } = req.params;
  const itemData: CartItemInput = req.body;
  const response = await cartService.addItemToGuestCart(sessionId, itemData);

  next(response);
};

export const validateCart: (req: Request, res: Response, next: NextFunction) => Promise<void> = async (req: Request, res: Response, next: NextFunction) => {
  const userId = req.user?._id;
  const { sessionId } = req.query;
  
  const response = await cartService.validateCartItems(
    userId?.toString(), 
    sessionId as string
  );
  
  next(response);
};

export const addItemToGuestCartByProduct = async (req: Request, res: Response, next: NextFunction) => {
  const { sessionId, productId } = req.params;
  const { quantity, size, color, selectedImage } = req.body; 
  
  const response = await cartService.addItemToGuestCartByProduct(sessionId, productId, { 
    quantity, 
    size, 
    color, 
    selectedImage 
  });
  next(response);
};

export const updateGuestCartItemByProduct = async (req: Request, res: Response, next: NextFunction) => {
  const { sessionId, itemId } = req.params; // Use itemId instead of productId
  const { quantity, size, color, selectedImage } = req.body;
  
  const response = await cartService.updateGuestCartItemById(sessionId, itemId, { 
    quantity, 
    size, 
    color, 
    selectedImage 
  });
  next(response);
};

export const removeGuestCartItemByProduct = async (req: Request, res: Response, next: NextFunction) => {
  const { sessionId, productId } = req.params;
  const { size, colorName } = req.query;
  
  const response = await cartService.removeGuestCartItemByProduct(
    sessionId, 
    productId, 
    colorName as string, 
    size as string
  );
  next(response);
};

export const mergeGuestCartOnLogin = async (req: Request, res: Response, next: NextFunction) => {
  const { _id: userId } = req.user;
  const { sessionId } = req.body;
  
  const response = await cartService.mergeGuestCartOnLogin(userId, sessionId);
  next(response);
};