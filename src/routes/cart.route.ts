import { Router } from 'express';
import { asyncHandler } from '../utils/asynchandler';
import { 
  addItemToCart,
  applyDiscount,
  clearCartItems,
  deleteCart,
  getCart,
  getCartWithDetails,
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

export default cartRouter;