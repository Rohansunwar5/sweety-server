import { Router } from 'express';
import { asyncHandler } from '../utils/asynchandler';
import { 
  createDiscount,
  updateDiscount,
  getDiscountByCode,
  applyDiscountToCart
} from '../controllers/discount.controller';
import isLoggedIn from '../middlewares/isLoggedIn.middleware';

const discountRouter = Router();

// Admin routes
discountRouter.post('/', isLoggedIn, asyncHandler(createDiscount));
discountRouter.patch('/:id', isLoggedIn, asyncHandler(updateDiscount));

// Public routes
discountRouter.get('/code/:code', asyncHandler(getDiscountByCode));
discountRouter.post('/apply', isLoggedIn,asyncHandler(applyDiscountToCart));

export default discountRouter;