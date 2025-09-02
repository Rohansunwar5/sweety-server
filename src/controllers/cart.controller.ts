import { NextFunction, Request, Response } from 'express';
import cartService from '../services/cart.service';
import { ApplyDiscountInput, CartItemInput, UpdateCartItemInput } from '../repository/cart.repository';

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

export const updateCartItem = async (req: Request, res: Response, next: NextFunction) => {
  const { _id: userId } = req.user;
  const { itemId } = req.params;
  const updateData: UpdateCartItemInput = req.body;
  const response = await cartService.updateCartItem(userId, itemId, updateData);

  next(response);
};

export const removeItemFromCart = async (req: Request, res: Response, next: NextFunction) => {
  const { _id: userId } = req.user;
  const { itemId } = req.params;
  const response = await cartService.removeItemFromCart(userId, itemId);

  next(response);
};

export const applyDiscount = async (req: Request, res: Response, next: NextFunction) => {
  const { _id: userId } = req.user;
  const discountData: ApplyDiscountInput = req.body;
  const response = await cartService.applyDiscount(userId, discountData);

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

export const mergeGuestCart = async (req: Request, res: Response, next: NextFunction) => {
  const userId = req.user._id;
  const guestCartItems = req.body.guestCart || [];

  const updatedCart = await cartService.mergeCarts(userId, guestCartItems);

  next(updatedCart);
}

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

export const validateCart = async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user?._id;
    const { sessionId } = req.query;
    
    const response = await cartService.validateCartItems(
        userId?.toString(), 
        sessionId as string
    );
    
    next(response);
};
