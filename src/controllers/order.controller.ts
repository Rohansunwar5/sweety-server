import { NextFunction, Request, Response } from "express";
import orderService from "../services/order.service";
import { BadRequestError } from "../errors/bad-request.error";

export const createOrder = async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user?._id;
    if (!userId) throw new BadRequestError('User not authenticated');
    
    const { shippingAddress, billingAddress, paymentMethod, notes } = req.body;
    const response = await orderService.createOrder({
        userId,
        shippingAddress,
        billingAddress,
        paymentMethod,
        notes
    });

    next(response);
}

// export const getOrderById = async (req: Request, res: Response, next: NextFunction) => {
//     const { id } = req.params;
//     const userId = req.user?._id;
//     const response = await orderService.getOrderByIdAndUser(id, userId);

//     next(response);
// }

// export const getUserOrders = async (req: Request, res: Response, next: NextFunction) => {
//     const userId = req.user?._id;
//     if (!userId) throw new BadRequestError('User not authenticated');
    
//     const page = parseInt(req.query.page as string) || 1;
//     const limit = parseInt(req.query.limit as string) || 10;
//     const status = req.query.status as string || IPaymentStatus.CAPTURED;
    
//     const response = await orderService.getUserOrders(userId, page, limit, status);

//     next(response);
// }

export const cancelOrder = async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const userId = req.user?._id;
    const { reason } = req.body;
    
    const response = await orderService.cancelOrder(id, reason, userId);

    next(response);
}

export const returnOrder = async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const userId = req.user?._id;
    const { reason } = req.body;
    const response = await orderService.returnOrder(id, reason, userId);

    next(response);
}

export const updateOrderStatus = async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const { status } = req.body;
    
    const response = await orderService.updateOrderStatus(id, status);

    next(response);
}

export const searchOrders = async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user?._id;
    const { q } = req.query;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    
    if (!q) throw new BadRequestError('Search query is required');
    
    const response = await orderService.searchOrders(q as string, userId?.toString(), page, limit);

    next(response);
}

export const getOrderStats = async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user?._id;
    const response = await orderService.getOrderStats(userId?.toString());

    next(response);
}