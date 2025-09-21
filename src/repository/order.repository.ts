import mongoose from "mongoose";
import orderModel, { IOrder, IOrderStatus } from "../models/order.model";

export interface GetAllOrdersParams {
    page: number;
    limit: number;
    status?: IOrderStatus;
    sortBy?: string;
    startDate?: Date;
    endDate?: Date;
    searchTerm?: string;
}

export interface CreateOrderParams {
  orderNumber: string;
  user: string;
  items: Array<{
    product: string;
    productName: string;
    productCode: string;
    productImage: string;
    quantity: number;
    size: string;
    color: {
      colorName: string;
      colorHex: string;
    };
    selectedImage: string;
    priceAtPurchase: number;
    itemTotal: number;
  }>;
  shippingAddress: {
    name: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    pinCode: string;
    country: string;
    phone: string;
  };
  billingAddress: {
    name: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    pinCode: string;
    country: string;
    phone: string;
  };
  subtotal: number;
  appliedCoupon?: {
    code: string;
    discountId: string;
    discountAmount: number;
  };
  appliedVoucher?: {
    code: string;
    discountId: string;
    discountAmount: number;
  };
  totalDiscountAmount: number;
  shippingCharge: number;
  taxAmount: number;
  total: number;
  paymentMethod?: string;
  notes?: string;
}

export interface UpdateOrderParams {
  status?: IOrderStatus;
  paymentMethod?: string;
  paymentStatus?: string;
  trackingNumber?: string;
  estimatedDeliveryDate?: Date;
  actualDeliveryDate?: Date;
  cancelReason?: string;
  returnReason?: string;
  notes?: string;
}

export class OrderRepository {
    private _model = orderModel

    async createOrder(params: CreateOrderParams) {
        try {
            const order = await this._model.create(params);
            return order;
        } catch (error: any) {
            if (error.code === 11000) { 
                throw new Error(`Order number ${params.orderNumber} already exists`);
            }
            throw error;
        }
    }

    async getOrderById(orderId: string) {
        return this._model.findById(orderId);
    }

    async getOrderByOrderNumber(orderNumber: string) {
        return this._model.findOne({ orderNumber });
    }

    async getOrdersByUser( userId: string, page: number =1, limit: number = 10, status?: IOrderStatus ) {
        const skip = ( page -1 ) * limit;
        const filter: any = { user: userId };

        if(status) {
            filter.status = status;
        }

        const [orders, total] = await Promise.all([
        this._model
            .find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit),
        this._model.countDocuments(filter)
        ]);

        return {
            orders,
            total,
            totalPages: Math.ceil(total / limit)
        };
    }

    async updateOrder(orderId: string, updateData: UpdateOrderParams) {
        const update: any = {...updateData};
    
        if (updateData.status === IOrderStatus.CANCELLED && updateData.cancelReason) {
            update.cancelledAt = new Date();
        }
            
        if (updateData.status === IOrderStatus.RETURNED && updateData.returnReason) {
            update.returnedAt = new Date();
        }
            
        if (updateData.status === IOrderStatus.DELIVERED) {
            update.actualDeliveryDate = new Date();
        }

        return this._model.findByIdAndUpdate(orderId, update, {new: true });
    }

    async updateOrderStatus(orderId: string, status: IOrderStatus) {
        const update: any = { status };
    
        if (status === IOrderStatus.DELIVERED) {
            update.actualDeliveryDate = new Date();
        }

        return this._model.findByIdAndUpdate(orderId, update, { new: true });
    }

    async updatePaymentStatus(orderId: string, paymentStatus: string): Promise<IOrder | null> {
    return this._model.findByIdAndUpdate(
      orderId,
      { paymentStatus },
      { new: true }
    );
    }

    async getOrdersByDateRange( startDate: Date, endDate: Date, page: number = 1, limit: number = 10 ): Promise<{ orders: IOrder[]; total: number }> 
    {
        const skip = (page - 1) * limit;
        const filter = {
        createdAt: {
            $gte: startDate,
            $lte: endDate
        }
        };

        const [orders, total] = await Promise.all([
        this._model
            .find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit),
        this._model.countDocuments(filter)
        ]);

        return { orders, total };
    }

    async getOrderStats(userId?: string): Promise<any> {
        const matchStage = userId ? { user: new mongoose.Types.ObjectId(userId)} : {};

        return this._model.aggregate([
            { $match: matchStage },
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 },
                    totalAmount: { $sum: '$total' }
                }
            }
        ])
    }

    async searchOrders( searchTerm: string, userId?: string, page: number = 1, limit: number = 10 ): Promise<{ orders: IOrder[]; total: number }> {
        const skip = (page - 1) * limit;
        const filter: any = {
        $or: [
            { orderNumber: { $regex: searchTerm, $options: 'i' } },
            { 'items.productName': { $regex: searchTerm, $options: 'i' } },
            { 'items.productCode': { $regex: searchTerm, $options: 'i' } },
            { 'items.color.colorName': { $regex: searchTerm, $options: 'i' } }
        ]
        };

        if (userId) {
        filter.user = userId;
        }

        const [orders, total] = await Promise.all([
        this._model
            .find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit),
        this._model.countDocuments(filter)
        ]);

        return { orders, total };
    }

    async cancelOrder(orderId: string, reason: string): Promise<IOrder | null> {
        return this._model.findByIdAndUpdate(
        orderId,
        {
            status: IOrderStatus.CANCELLED,
            cancelReason: reason,
            cancelledAt: new Date()
        },
        { new: true }
        );
    }

    async returnOrder(orderId: string, reason: string): Promise<IOrder | null> {
        return this._model.findByIdAndUpdate(
        orderId,
        {
            status: IOrderStatus.RETURNED,
            returnReason: reason,
            returnedAt: new Date()
        },
        { new: true }
        );
    }

    async getAllOrders(params: GetAllOrdersParams) {
        const { 
            page, 
            limit, 
            status, 
            sortBy = '-createdAt',
            startDate,
            endDate,
            searchTerm
        } = params;

        const skip = (page - 1) * limit;
        const filter: any = {};

        if (status) {
            filter.status = status;
        }

        if (startDate || endDate) {
            filter.createdAt = {};
            if (startDate) filter.createdAt.$gte = startDate;
            if (endDate) filter.createdAt.$lte = endDate;
        }

        if (searchTerm) {
            filter.$or = [
                { orderNumber: { $regex: searchTerm, $options: 'i' } },
                { 'items.productName': { $regex: searchTerm, $options: 'i' } },
                { 'items.productCode': { $regex: searchTerm, $options: 'i' } },
                { 'items.color.colorName': { $regex: searchTerm, $options: 'i' } },
                { 'shippingAddress.name': { $regex: searchTerm, $options: 'i' } }
            ];
        }

        const [orders, total] = await Promise.all([
            this._model
                .find(filter)
                .sort(sortBy)
                .skip(skip)
                .limit(limit)
                .populate('user', 'name email'), 
            this._model.countDocuments(filter)
        ]);

        return {
            orders,
            total,
            totalPages: Math.ceil(total / limit),
            currentPage: page,
            limit
        };
    }

    async getOrdersByColor( colorName: string, page: number = 1, limit: number = 10 ): Promise<{ orders: IOrder[]; total: number }> {
        const skip = (page - 1) * limit;
        const filter = {
            'items.color.colorName': { $regex: colorName, $options: 'i' }
        };

        const [orders, total] = await Promise.all([
            this._model
                .find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            this._model.countDocuments(filter)
        ]);

        return { orders, total };
    }
    
    async getOrdersByProductAndColor( productId: string, colorName?: string, size?: string, page: number = 1, limit: number = 10 ): Promise<{ orders: IOrder[]; total: number }> {
        const skip = (page - 1) * limit;
        const filter: any = {
            'items.product': productId
        };

        if (colorName) {
            filter['items.color.colorName'] = colorName;
        }

        if (size) {
            filter['items.size'] = size;
        }

        const [orders, total] = await Promise.all([
            this._model
                .find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            this._model.countDocuments(filter)
        ]);

        return { orders, total };
    }

    async getColorSalesStats(startDate?: Date, endDate?: Date): Promise<any> {
        const matchStage: any = {};

        if (startDate || endDate) {
            matchStage.createdAt = {};
            if (startDate) matchStage.createdAt.$gte = startDate;
            if (endDate) matchStage.createdAt.$lte = endDate;
        }

        return this._model.aggregate([
            { $match: matchStage },
            { $unwind: '$items' },
            {
                $group: {
                    _id: '$items.color.colorName',
                    totalQuantity: { $sum: '$items.quantity' },
                    totalRevenue: { $sum: '$items.itemTotal' },
                    orderCount: { $sum: 1 }
                }
            },
            { $sort: { totalQuantity: -1 } }
        ]);
    }
}