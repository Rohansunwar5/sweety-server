import { Router } from 'express';
import { asyncHandler } from '../utils/asynchandler';
import { 
  addItemToCart,
  addItemToGuestCart,
  applyDiscount,
  clearCartItems,
  deleteCart,
  getCart,
  getCartWithDetails,
  getGuestCart,
  removeItemFromCart,
  updateCartItem
} from '../controllers/cart.controller';
import isLoggedIn from '../middlewares/isLoggedIn.middleware';

const cartRouter = Router();

cartRouter.get('/', isLoggedIn, asyncHandler(getCart));
cartRouter.post('/', isLoggedIn, asyncHandler(addItemToCart));
cartRouter.put('/:itemId', isLoggedIn, asyncHandler(updateCartItem));
cartRouter.delete('/:itemId', isLoggedIn, asyncHandler(removeItemFromCart));
cartRouter.post('/apply-discount', isLoggedIn, asyncHandler(applyDiscount));
cartRouter.get('/details', isLoggedIn, asyncHandler(getCartWithDetails));
cartRouter.delete('/clear', isLoggedIn, asyncHandler(clearCartItems));
cartRouter.delete('/', isLoggedIn, asyncHandler(deleteCart));

cartRouter.get('/guest/:sessionId', asyncHandler(getGuestCart));
cartRouter.post('/guest/:sessionId', asyncHandler(addItemToGuestCart));
// cart validation route for guest users
cartRouter.post('/validate', asyncHandler(getGuestCart));

// merge guest cart into user cart upon login
cartRouter.post('/merge', isLoggedIn, asyncHandler(addItemToGuestCart));
// cartRouter.delete('/discount/:type', isLoggedIn, asyncHandler(removeDiscount));

// Get cart summary/count (lightweight endpoint for header cart icon)
// cartRouter.get('/summary', isLoggedIn, asyncHandler(getCartSummary));



export default cartRouter;