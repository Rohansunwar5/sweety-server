import { BadRequestError } from "../errors/bad-request.error";
import { NotFoundError } from "../errors/not-found.error";
import { InternalServerError } from "../errors/internal-server.error";
import { CreateOrderParams, OrderRepository, UpdateOrderParams } from "../repository/order.repository";
import { IOrderStatus } from "../models/order.model";
import cartService from "./cart.service";
import productService from "./product.service";
import discountService from "./discount.service";

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

export interface ColorSalesStats {
  _id: string;
  totalQuantity: number;
  totalRevenue: number;
  orderCount: number;
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
    
    // order items with color and selectedImage support
    const orderItems = cartDetails.items.map(item => {
      const colors = (item.product as any).colors || [];
      const colorVariant = colors.find((c: any) => c.colorName === item.color.colorName);
      const productImage = colorVariant?.images?.[0] || item.selectedImage || '';
      
      return {
        product: item.product._id,
        productName: item.product.name,
        productCode: '', 
        productImage: productImage,
        quantity: item.quantity,
        size: item.size,
        color: {
          colorName: item.color.colorName,
          colorHex: item.color.colorHex
        },
        selectedImage: item.selectedImage,
        priceAtPurchase: item.product.price,
        itemTotal: item.itemTotal
      };
    });
    
    for (const orderItem of orderItems) {
      const product = await productService.getProductById(orderItem.product);
      if (product) { orderItem.productCode = product.code }
    }

    // ===== ADD THIS SECTION: Mark discounts as used BEFORE creating order =====
    if (cartDetails.cart.appliedCoupon?.code) {
        await discountService.markDiscountAsUsed(
            cartDetails.cart.appliedCoupon.code, 
            userId
        );
    }

    if (cartDetails.cart.appliedVoucher?.code) {
        await discountService.markDiscountAsUsed(
            cartDetails.cart.appliedVoucher.code, 
            userId
        );
    }
    // ===== END OF NEW SECTION =====
    
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
    await cartService.clearCartItems(userId);
    
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
    if (!order) throw new NotFoundError('Order not found');
  
    return order;
  }

  async getOrderByOrderNumber(orderNumber: string) {
    const order = await this._orderRepository.getOrderByOrderNumber(orderNumber);
    if (!order) throw new NotFoundError('Order not found')

    return order;
  }

  async getUserOrders( userId: string, page: number = 1, limit: number = 10, status?: IOrderStatus ) {
    return this._orderRepository.getOrdersByUser(userId, page, limit, status);
  }

  async updateOrderStatus(orderId: string, status: IOrderStatus) {
    const order = await this.getOrderById(orderId);
    
    this.validateStatusTransition(order.status, status);

    const updatedOrder = await this._orderRepository.updateOrderStatus(orderId, status);
    if (!updatedOrder) {
      throw new InternalServerError('Failed to update order status');
    }

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
    if (!cancelledOrder) throw new InternalServerError('Failed to cancel order')

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

    await this.restoreStock(order.items);

    return returnedOrder;
  }

  async searchOrders(searchTerm: string, userId?: string, page: number = 1, limit: number = 10) {
    return this._orderRepository.searchOrders(searchTerm, userId, page, limit);
  }

  async getOrderStats(userId?: string) {
    return this._orderRepository.getOrderStats(userId);
  }

  async getOrdersByColor(colorName: string, page: number = 1, limit: number = 10) {
    if (!colorName.trim()) {
      throw new BadRequestError('Color name is required');
    }
    return this._orderRepository.getOrdersByColor(colorName, page, limit);
  }

  async getOrdersByProductAndColor( productId: string, colorName?: string, size?: string, page: number = 1, limit: number = 10 ) {
    if (!productId) {
      throw new BadRequestError('Product ID is required');
    }

    const product = await productService.getProductById(productId);
    if (!product) {
      throw new NotFoundError('Product not found');
    }

    return this._orderRepository.getOrdersByProductAndColor(
      productId,
      colorName,
      size,
      page,
      limit
    );
  }

  async getColorSalesStats(startDate?: Date, endDate?: Date): Promise<ColorSalesStats[]> {
    if (startDate && endDate && startDate > endDate) {
      throw new BadRequestError('Start date cannot be after end date');
    }

    return this._orderRepository.getColorSalesStats(startDate, endDate);
  }

  async getTopSellingColors(limit: number = 10, startDate?: Date, endDate?: Date) {
    if (limit < 1 || limit > 100) {
      throw new BadRequestError('Limit must be between 1 and 100');
    }

    const colorStats = await this.getColorSalesStats(startDate, endDate);
    return colorStats.slice(0, limit);
  }

  async getAllOrders(options: GetAllOrdersOptions = {}) {
    const { 
        page = 1, 
        limit = 10, 
        status, 
        sortBy = '-createdAt',
        startDate,
        endDate,
        searchTerm
    } = options;

    if (page < 1) throw new BadRequestError('Page must be greater than 0');
    if (limit < 1 || limit > 100) throw new BadRequestError('Limit must be between 1 and 100');

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

  private async generateOrderNumber(): Promise<string> {
    const timestamp = Date.now().toString();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `ORD${timestamp}${random}`;
  }

  private calculateShippingCharge(subtotal: number): number {
    return 0; 
  }

  private calculateTax(taxableAmount: number): number {
    return 0;
  }

  private async validateStockAvailability(cartItems: any[]) {
    for (const item of cartItems) {
      const product = await productService.getProductById(item.product._id);
      if (!product) {
        throw new NotFoundError(`Product not found: ${item.product.name}`);
      }

      const colorVariant = product.colors.find(c => c.colorName === item.color.colorName);
      if (!colorVariant) {
        throw new NotFoundError(`Color variant not found: ${item.color.colorName} for ${item.product.name}`);
      }

      if (item.size) {
        const sizeStock = colorVariant.sizeStock.find(s => s.size === item.size);
        if (!sizeStock || sizeStock.stock < item.quantity) {
          throw new BadRequestError(
            `Insufficient stock for ${item.product.name} in color ${item.color.colorName}, size ${item.size}. Available: ${sizeStock?.stock || 0}, Required: ${item.quantity}`
          );
        }
      }
    }
  }

  private async reserveStock(cartItems: any[]) {
    const orderItems = cartItems.map(item => ({
        productId: item.product._id,
        colorName: item.color.colorName,
        size: item.size,
        quantity: item.quantity,
        productName: item.product.name
    }));

    try {
        await productService.reduceStockForOrderWithColor(orderItems);
    } catch (error: any) {
        throw new BadRequestError(`Failed to reserve stock: ${error.message}`);
    }
  }

  private async restoreStock(orderItems: any[]) {
    const stockItems = orderItems.map(item => ({
        productId: item.product.toString(),
        colorName: item.color.colorName,
        size: item.size,
        quantity: item.quantity
    }));

    try {
        // Restore stock for color-size combinations
        for (const item of stockItems) {
            await productService.updateProductStockWithColor({
                productId: item.productId,
                colorName: item.colorName,
                size: item.size,
                quantity: item.quantity 
            });
        }
    } catch (error) {
        console.error('Failed to restore stock:', error);
    }
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
        const estimatedDelivery = new Date();
        estimatedDelivery.setDate(estimatedDelivery.getDate() + 7); 
        await this._orderRepository.updateOrder(order._id, {
          estimatedDeliveryDate: estimatedDelivery
        });
        break;
      
      case IOrderStatus.SHIPPED:
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
}

export default new OrderService(new OrderRepository());