import { NextFunction, Request, Response } from 'express';
import cartService from '../services/cart.service';
import { ApplyDiscountInput, CartItemInput, RemoveDiscountInput, UpdateCartItemInput } from '../repository/cart.repository';

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
    const { productId } = req.params;
    const { quantity, size } = req.body;
    
    const response = await cartService.updateCartItemByProduct(userId, productId, { quantity, size });
    next(response);
};

export const removeCartItemByProduct = async (req: Request, res: Response, next: NextFunction) => {
    const { _id: userId } = req.user;
    const { productId } = req.params;
    const { size } = req.query;
    
    const response = await cartService.removeCartItemByProduct(userId, productId, size as string);
    next(response);
};

export const applyDiscount = async (req: Request, res: Response, next: NextFunction) => {
  const { _id: userId } = req.user;
  const discountData: ApplyDiscountInput = req.body;
  const response = await cartService.applyDiscount(userId, discountData);

  next(response);
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


export const addItemToGuestCartByProduct = async (req: Request, res: Response, next: NextFunction) => {
    const { sessionId, productId } = req.params;
    const { quantity, size } = req.body;
    
    const response = await cartService.addItemToGuestCartByProduct(sessionId, productId, { quantity, size });
    next(response);
};

export const updateGuestCartItemByProduct = async (req: Request, res: Response, next: NextFunction) => {
    const { sessionId, productId } = req.params;
    const { quantity, size } = req.body;
    
    const response = await cartService.updateGuestCartItemByProduct(sessionId, productId, { quantity, size });
    next(response);
};

export const removeGuestCartItemByProduct = async (req: Request, res: Response, next: NextFunction) => {
    const { sessionId, productId } = req.params;
    const { size } = req.query;
    
    const response = await cartService.removeGuestCartItemByProduct(sessionId, productId, size as string);
    next(response);
};

// CART MERGE ON LOGIN - Critical for user experience!
export const mergeGuestCartOnLogin = async (req: Request, res: Response, next: NextFunction) => {
    const { _id: userId } = req.user;
    const { sessionId } = req.body;
    
    const response = await cartService.mergeGuestCartOnLogin(userId, sessionId);
    next(response);
};
