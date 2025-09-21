import { Router } from "express";
import isLoggedIn from "../middlewares/isLoggedIn.middleware";
import { asyncHandler } from "../utils/asynchandler";
import {  
    getAllOrders, 
    getOrderByIdAdmin, 
    getOrderById,
    getOrderStats, 
    getUserOrders, 
    searchOrders, 
    updateOrderStatus,
    createOrder,
    cancelOrder,
    returnOrder,
    getOrdersByColor,
    getOrdersByProductAndColor,
    getColorSalesStats,
    getTopSellingColors,
    updatePaymentStatus,
    addTrackingNumber
} from "../controllers/order.controller";
import isAdminLoggedIn from "../middlewares/isAdminLoggedIn.middleware";

const orderRouter = Router();

orderRouter.post('/', isLoggedIn, asyncHandler(createOrder));
orderRouter.get('/', isLoggedIn, asyncHandler(getUserOrders));
orderRouter.get('/search', isLoggedIn, asyncHandler(searchOrders));
orderRouter.get('/stats', isLoggedIn, asyncHandler(getOrderStats));
orderRouter.get('/:id', isLoggedIn, asyncHandler(getOrderById));
orderRouter.post('/:id/cancel', isLoggedIn, asyncHandler(cancelOrder));
orderRouter.post('/:id/return', isLoggedIn, asyncHandler(returnOrder));

// Admin routes - Order management
orderRouter.get('/admin/all', isAdminLoggedIn, asyncHandler(getAllOrders));
orderRouter.get('/admin/order/:id', isAdminLoggedIn, asyncHandler(getOrderByIdAdmin));
orderRouter.patch('/admin/:id/status', isAdminLoggedIn, asyncHandler(updateOrderStatus));
orderRouter.patch('/admin/:id/payment-status', isAdminLoggedIn, asyncHandler(updatePaymentStatus));
orderRouter.patch('/admin/:id/tracking', isAdminLoggedIn, asyncHandler(addTrackingNumber));

// Admin routes - Analytics and reporting
orderRouter.get('/admin/analytics/color-sales', isAdminLoggedIn, asyncHandler(getColorSalesStats));
orderRouter.get('/admin/analytics/top-colors', isAdminLoggedIn, asyncHandler(getTopSellingColors));

// Admin routes - Color-based filtering
orderRouter.get('/admin/by-color/:colorName', isAdminLoggedIn, asyncHandler(getOrdersByColor));
orderRouter.get('/admin/by-product/:productId', isAdminLoggedIn, asyncHandler(getOrdersByProductAndColor));

export default orderRouter;