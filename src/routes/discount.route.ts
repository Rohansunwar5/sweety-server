import { Router } from 'express';
import { asyncHandler } from '../utils/asynchandler';
import { 
  createDiscount,
  updateDiscount,
  getDiscountByCode,
  getAllDiscounts,
  getActiveDiscounts,
  getDiscountStats,
  getExpiredDiscounts,
  deleteDiscount
} from '../controllers/discount.controller';
import isAdminLoggedIn from '../middlewares/isAdminLoggedIn.middleware';

const discountRouter = Router();

// Admin routes
discountRouter.post('/', isAdminLoggedIn, asyncHandler(createDiscount));
discountRouter.put('/:id', isAdminLoggedIn, asyncHandler(updateDiscount));
discountRouter.delete('/:id', isAdminLoggedIn, asyncHandler(deleteDiscount));
discountRouter.get('/all', isAdminLoggedIn, asyncHandler(getAllDiscounts));
discountRouter.get('/expired', isAdminLoggedIn, asyncHandler(getExpiredDiscounts));
discountRouter.get('/:id/stats', isAdminLoggedIn, asyncHandler(getDiscountStats));

// Public/User routes
discountRouter.get('/active', asyncHandler(getActiveDiscounts));
discountRouter.get('/code/:code', asyncHandler(getDiscountByCode));
// discountRouter.post('/apply', isLoggedIn, asyncHandler(applyDiscountToCart));


export default discountRouter;