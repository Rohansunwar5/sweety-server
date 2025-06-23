import { Router } from "express";
import isLoggedIn from "../middlewares/isLoggedIn.middleware";
import { asyncHandler } from "../utils/asynchandler";
import { cancelOrder, createOrder, getOrderStats, getUserOrders, returnOrder, searchOrders, updateOrderStatus } from "../controllers/order.controller";


const orderRouter = Router();

// Customer routes
orderRouter.post('/', isLoggedIn, asyncHandler(createOrder));
// orderRouter.get('/', isLoggedIn, asyncHandler(getUserOrders));
orderRouter.get('/search', isLoggedIn, asyncHandler(searchOrders));
orderRouter.get('/stats', isLoggedIn, asyncHandler(getOrderStats));
orderRouter.get('/orders', isLoggedIn, asyncHandler(getUserOrders));
// orderRouter.get('/:id', isLoggedIn, asyncHandler(getOrderById));
orderRouter.post('/:id/cancel', isLoggedIn, asyncHandler(cancelOrder));
orderRouter.post('/:id/return', isLoggedIn, asyncHandler(returnOrder));

// Admin routes
orderRouter.patch('/:id/status', isLoggedIn, asyncHandler(updateOrderStatus));

export default orderRouter;