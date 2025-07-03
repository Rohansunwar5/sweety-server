import { BadRequestError } from "../errors/bad-request.error";
import { NotFoundError } from "../errors/not-found.error";
import { InternalServerError } from "../errors/internal-server.error";
import { CreateOrderParams, OrderRepository, UpdateOrderParams } from "../repository/order.repository";
import { IOrderStatus } from "../models/order.model";
import cartService from "./cart.service";
import productService from "./product.service";

export interface GetAllOrdersOptions {
    page?: number;
    limit?: number;
    status?: IOrderStatus;
    sortBy?: string;
    startDate?: Date;
    endDate?: Date;
    searchTerm?: string;
}

export interface CreateOrderInput {
  userId: string;
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
  paymentMethod?: string;
  notes?: string;
}

export interface OrderSummary {
  orderId: string;
  orderNumber: string;
  total: number;
  itemCount: number;
  status: string;
}

class OrderService {
  constructor(private readonly _orderRepository: OrderRepository) {}

  async createOrder(input: CreateOrderInput): Promise<OrderSummary> {
    const { userId, shippingAddress, billingAddress, paymentMethod, notes } = input;
    const cartDetails = await cartService.getCartWithDetails(userId);
    if (!cartDetails.items.length) throw new BadRequestError('Cart is empty')

    await this.validateStockAvailability(cartDetails.items);
    const orderNumber = await this.generateOrderNumber();

    // Totals
    const subtotal = cartDetails.totals.subtotal;
    const totalDiscountAmount = cartDetails.totals.discountAmount;
    const shippingCharge = this.calculateShippingCharge(subtotal);
    const taxAmount = this.calculateTax(subtotal - totalDiscountAmount + shippingCharge);

    const total = parseFloat((subtotal - totalDiscountAmount + shippingCharge + taxAmount).toFixed(2));
    
    // order items
    const orderItems = cartDetails.items.map(item => ({
      product: item.product._id,
      productName: item.product.name,
      productCode: '', 
      productImage: item.product.images[0] || '',
      quantity: item.quantity,
      size: item.size,
      priceAtPurchase: item.product.price,
      itemTotal: item.itemTotal
    }));

    for (const orderItem of orderItems) {
      const product = await productService.getProductById(orderItem.product);
      if (product) { orderItem.productCode = product.code }
    }

    const orderParams: CreateOrderParams = {
      orderNumber,
      user: userId,
      items: orderItems,
      shippingAddress,
      billingAddress,
      subtotal,
      appliedCoupon: cartDetails.cart.appliedCoupon?.discountId ? {
        code: cartDetails.cart.appliedCoupon.code,
        discountId: String(cartDetails.cart.appliedCoupon.discountId),
        discountAmount: cartDetails.cart.appliedCoupon.discountAmount
      } : undefined,
      appliedVoucher: cartDetails.cart.appliedVoucher?.discountId ? {
        code: cartDetails.cart.appliedVoucher.code,
        discountId: String(cartDetails.cart.appliedVoucher.discountId),
        discountAmount: cartDetails.cart.appliedVoucher.discountAmount
      } : undefined,
      totalDiscountAmount,
      shippingCharge,
      taxAmount,
      total,
      paymentMethod,
      notes
    };
    
    const order = await this._orderRepository.createOrder(orderParams);
    if (!order) throw new InternalServerError('Failed to create order')
      
    await this.reserveStock(cartDetails.items);

    return {
      orderId: order._id,
      orderNumber: order.orderNumber,
      total: order.total,
      itemCount: order.items.length,
      status: order.status
    };
  }

  async getOrderById(orderId: string) {
    const order = await this._orderRepository.getOrderById(orderId);
    if (!order) {
      throw new NotFoundError('Order not found');
    }
    return order;
  }

  async getOrderByOrderNumber(orderNumber: string) {
    const order = await this._orderRepository.getOrderByOrderNumber(orderNumber);
    if (!order) {
      throw new NotFoundError('Order not found');
    }
    return order;
  }

  async getUserOrders(
    userId: string,
    page: number = 1,
    limit: number = 10,
    status?: IOrderStatus
  ) {
    return this._orderRepository.getOrdersByUser(userId, page, limit, status);
  }

  async updateOrderStatus(orderId: string, status: IOrderStatus) {
    const order = await this.getOrderById(orderId);
    
    // Validate status transition
    this.validateStatusTransition(order.status, status);

    const updatedOrder = await this._orderRepository.updateOrderStatus(orderId, status);
    if (!updatedOrder) {
      throw new InternalServerError('Failed to update order status');
    }

    // Handle post-status update logic
    await this.handleStatusUpdate(updatedOrder, status);

    return updatedOrder;
  }

  async updateOrder(orderId: string, updateData: UpdateOrderParams) {
    const order = await this.getOrderById(orderId);
    
    const updatedOrder = await this._orderRepository.updateOrder(orderId, updateData);
    if (!updatedOrder) {
      throw new InternalServerError('Failed to update order');
    }

    return updatedOrder;
  }

  async cancelOrder(orderId: string, reason: string, userId?: string) {
    const order = await this.getOrderById(orderId);
    
    if (userId && order.user.toString() !== userId) {
      throw new BadRequestError('Order does not belong to user');
    }

    if (!this.canCancelOrder(order.status)) {
      throw new BadRequestError(`Cannot cancel order with status: ${order.status}`);
    }

    const cancelledOrder = await this._orderRepository.cancelOrder(orderId, reason);
    if (!cancelledOrder) {
      throw new InternalServerError('Failed to cancel order');
    }

    // Restore stock
    await this.restoreStock(order.items);

    return cancelledOrder;
  }

  async returnOrder(orderId: string, reason: string, userId?: string) {
    const order = await this.getOrderById(orderId);
    
    if (userId && order.user.toString() !== userId) {
      throw new BadRequestError('Order does not belong to user');
    }

    if (order.status !== IOrderStatus.DELIVERED) {
      throw new BadRequestError('Only delivered orders can be returned');
    }

    const returnedOrder = await this._orderRepository.returnOrder(orderId, reason);
    if (!returnedOrder) {
      throw new InternalServerError('Failed to return order');
    }

    // Restore stock
    await this.restoreStock(order.items);

    return returnedOrder;
  }

  async searchOrders(searchTerm: string, userId?: string, page: number = 1, limit: number = 10) {
    return this._orderRepository.searchOrders(searchTerm, userId, page, limit);
  }

  async getOrderStats(userId?: string) {
    return this._orderRepository.getOrderStats(userId);
  }

  private async generateOrderNumber(): Promise<string> {
    const timestamp = Date.now().toString();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `ORD${timestamp}${random}`;
  }

  private calculateShippingCharge(subtotal: number): number {
    return subtotal = 10;
  }

  private calculateTax(taxableAmount: number): number {
    // 18% GST
    return Math.round(taxableAmount * 0.18);
  }

  private async validateStockAvailability(cartItems: any[]) {
    for (const item of cartItems) {
      const product = await productService.getProductById(item.product._id);
      if (!product) {
        throw new NotFoundError(`Product not found: ${item.product.name}`);
      }

      if (item.size) {
        const sizeStock = product.sizeStock.find(s => s.size === item.size);
        if (!sizeStock || sizeStock.stock < item.quantity) {
          throw new BadRequestError(
            `Insufficient stock for ${item.product.name} in size ${item.size}`
          );
        }
      }
    }
  }

  private async reserveStock(cartItems: any[]) {
    // This would typically involve updating product stock
    // For now, we'll just log the reservation
    // console.log('Reserving stock for order items:', cartItems.map(item => ({
    //   product: item.product._id,
    //   quantity: item.quantity,
    //   size: item.size
    // })));
  }

  private async restoreStock(orderItems: any[]) {
    // This would typically involve restoring product stock
    // For now, we'll just log the restoration
    // console.log('Restoring stock for order items:', orderItems.map(item => ({
    //   product: item.product,
    //   quantity: item.quantity,
    //   size: item.size
    // })));
  }

  private validateStatusTransition(currentStatus: IOrderStatus, newStatus: IOrderStatus) {
    const validTransitions: Record<IOrderStatus, IOrderStatus[]> = {
      [IOrderStatus.PENDING]: [IOrderStatus.PROCESSING, IOrderStatus.CANCELLED, IOrderStatus.FAILED],
      [IOrderStatus.PROCESSING]: [IOrderStatus.SHIPPED, IOrderStatus.CANCELLED],
      [IOrderStatus.SHIPPED]: [IOrderStatus.DELIVERED, IOrderStatus.CANCELLED],
      [IOrderStatus.DELIVERED]: [IOrderStatus.RETURNED],
      [IOrderStatus.CANCELLED]: [],
      [IOrderStatus.FAILED]: [IOrderStatus.PENDING],
      [IOrderStatus.RETURNED]: []
    };

    if (!validTransitions[currentStatus].includes(newStatus)) {
      throw new BadRequestError(
        `Invalid status transition from ${currentStatus} to ${newStatus}`
      );
    }
  }

  private canCancelOrder(status: IOrderStatus): boolean {
    return [IOrderStatus.PENDING, IOrderStatus.PROCESSING].includes(status);
  }

  private async handleStatusUpdate(order: any, newStatus: IOrderStatus) {
    switch (newStatus) {
      case IOrderStatus.PROCESSING:
        // Set estimated delivery date
        const estimatedDelivery = new Date();
        estimatedDelivery.setDate(estimatedDelivery.getDate() + 7); // 7 days from now
        await this._orderRepository.updateOrder(order._id, {
          estimatedDeliveryDate: estimatedDelivery
        });
        break;
      
      case IOrderStatus.SHIPPED:
        // Generate tracking number if not exists
        if (!order.trackingNumber) {
          const trackingNumber = `TRK${Date.now()}${Math.floor(Math.random() * 1000)}`;
          await this._orderRepository.updateOrder(order._id, {
            trackingNumber
          });
        }
        break;
      
      case IOrderStatus.CANCELLED:
      case IOrderStatus.RETURNED:
        break;
    }
  }

  async getAllOrders(options: GetAllOrdersOptions = {}) {
    // Set defaults if not provided
    const { 
        page = 1, 
        limit = 10, 
        status, 
        sortBy = '-createdAt',
        startDate,
        endDate,
        searchTerm
    } = options;

    // Validate parameters
    if (page < 1) throw new BadRequestError('Page must be greater than 0');
    if (limit < 1 || limit > 100) throw new BadRequestError('Limit must be between 1 and 100');

    // Delegate to repository
    return this._orderRepository.getAllOrders({
        page,
        limit,
        status,
        sortBy,
        startDate,
        endDate,
        searchTerm
    });
}
}

export default new OrderService(new OrderRepository());