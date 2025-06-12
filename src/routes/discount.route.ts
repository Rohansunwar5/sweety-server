import { Router } from 'express';
import { asyncHandler } from '../utils/asynchandler';
import { 
  createDiscount,
  updateDiscount,
  getDiscountByCode,
  applyDiscountToCart
} from '../controllers/discount.controller';
import isLoggedIn from '../middlewares/isLoggedIn.middleware';
import isAdminLoggedIn from '../middlewares/isAdminLoggedIn.middleware';

const discountRouter = Router();

// Admin routes
discountRouter.post('/', isAdminLoggedIn, asyncHandler(createDiscount));
discountRouter.patch('/:id', isAdminLoggedIn, asyncHandler(updateDiscount));

// Public routes
discountRouter.get('/code/:code', asyncHandler(getDiscountByCode));
discountRouter.post('/apply', isLoggedIn,asyncHandler(applyDiscountToCart));

export default discountRouter;