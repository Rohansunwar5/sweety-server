import { Router } from 'express';
import { asyncHandler } from '../utils/asynchandler';
import { 
  addItemToCart,
  addItemToGuestCart,
  addItemToGuestCartByProduct,
  applyDiscount,
  clearCartItems,
  deleteCart,
  getCart,
  getCartWithDetails,
  getGuestCart,
  getGuestCartWithDetails,
  mergeGuestCartOnLogin,
  removeCartItemByProduct,
  removeDiscount,
  removeGuestCartItemByProduct,
  updateCartItemByProduct,
  updateGuestCartItemByProduct,
  validateCart,
  validateDiscountForUser,
} from '../controllers/cart.controller';
import isLoggedIn from '../middlewares/isLoggedIn.middleware';
import { get } from 'http';

const cartRouter = Router();

cartRouter.get('/', isLoggedIn, asyncHandler(getCart));
cartRouter.get('/details', isLoggedIn, asyncHandler(getCartWithDetails));
cartRouter.post('/', isLoggedIn, asyncHandler(addItemToCart));
cartRouter.put('/item/:itemId', isLoggedIn, asyncHandler(updateCartItemByProduct));
cartRouter.delete('/product/:productId', isLoggedIn, asyncHandler(removeCartItemByProduct));
cartRouter.post('/apply-discount', isLoggedIn, asyncHandler(applyDiscount));
cartRouter.delete('/remove-discount', isLoggedIn, asyncHandler(removeDiscount));
cartRouter.post('/validate-discount', isLoggedIn, asyncHandler(validateDiscountForUser));
cartRouter.delete('/clear', isLoggedIn, asyncHandler(clearCartItems));
cartRouter.delete('/', isLoggedIn, asyncHandler(deleteCart));
cartRouter.post('/validate', isLoggedIn, asyncHandler(validateCart));

// ============ GUEST CART ROUTES ============
cartRouter.get('/guest/:sessionId/details', asyncHandler(getGuestCartWithDetails));
cartRouter.get('/guest/:sessionId', asyncHandler(getGuestCart));
cartRouter.post('/guest/:sessionId', asyncHandler(addItemToGuestCart));
cartRouter.post('/guest/:sessionId/product/:productId', asyncHandler(addItemToGuestCartByProduct));
cartRouter.put('/guest/:sessionId/item/:itemId', asyncHandler(updateGuestCartItemByProduct));
cartRouter.delete('/guest/:sessionId/product/:productId', asyncHandler(removeGuestCartItemByProduct));
cartRouter.post('/guest/validate', asyncHandler(validateCart));


// Merge guest cart into user cart upon login

cartRouter.post('/merge', isLoggedIn, asyncHandler(mergeGuestCartOnLogin));

export default cartRouter;