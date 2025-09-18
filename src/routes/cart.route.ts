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
  mergeGuestCartOnLogin,
  removeCartItemByProduct,
  removeDiscount,
  removeGuestCartItemByProduct,
  updateCartItemByProduct,
  updateGuestCartItemByProduct,
} from '../controllers/cart.controller';
import isLoggedIn from '../middlewares/isLoggedIn.middleware';

const cartRouter = Router();

cartRouter.put('/product/:productId', isLoggedIn, asyncHandler(updateCartItemByProduct));
cartRouter.delete('/product/:productId', isLoggedIn, asyncHandler(removeCartItemByProduct));

cartRouter.post('/guest/:sessionId/product/:productId', asyncHandler(addItemToGuestCartByProduct));
cartRouter.put('/guest/:sessionId/product/:productId', asyncHandler(updateGuestCartItemByProduct));
cartRouter.delete('/guest/:sessionId/product/:productId', asyncHandler(removeGuestCartItemByProduct));

cartRouter.post('/merge', isLoggedIn, asyncHandler(mergeGuestCartOnLogin));

cartRouter.get('/', isLoggedIn, asyncHandler(getCart));
cartRouter.post('/', isLoggedIn, asyncHandler(addItemToCart));
// cartRouter.put('/:itemId', isLoggedIn, asyncHandler(updateCartItem));
// cartRouter.delete('/:itemId', isLoggedIn, asyncHandler(removeItemFromCart));
cartRouter.post('/apply-discount', isLoggedIn, asyncHandler(applyDiscount));
cartRouter.delete('/remove-discount', isLoggedIn, asyncHandler(removeDiscount));
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