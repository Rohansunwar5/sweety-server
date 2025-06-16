import { BadRequestError } from "../errors/bad-request.error";
import { InternalServerError } from "../errors/internal-server.error";
import { NotFoundError } from "../errors/not-found.error";
import { IOrderStatus } from "../models/order.model";
import { IPaymentStatus } from "../models/payment.model";
import { OrderRepository } from "../repository/order.repository";
import { PaymentRepository } from "../repository/payment.repository";
import { UserRepository } from "../repository/user.repository";
import cartService from "./cart.service";
import mailService from "./mail.service";
import orderService from "./order.service";
import razorpayService from "./razorpay.service";

export interface InitiatePaymentParams {
  orderId: string;
  user: string;
  method: string;
  notes?: any;
}

export interface PaymentResult {
  payment: any;
  order?: any;
}

class PaymentService {
    constructor(private readonly _paymentRepository: PaymentRepository, private readonly _userRepository: UserRepository, private readonly _orderRepository: OrderRepository) {}

    async initiatePayment(params: InitiatePaymentParams) {
        const { orderId, user, method, notes } = params;

        const order = await orderService.getOrderById(orderId);
        if(!order) throw new NotFoundError('Order not found');

        if(order.user.toString() !== user) throw new BadRequestError('Order does not belong to user');

        const existingPayment = await this._paymentRepository.getPaymentByOrderId(orderId);
        if(existingPayment) throw new BadRequestError('Payment already initiated for this order');

        if(method === 'cod'){
            const payment = await this._paymentRepository.createPayment({
                orderId,
                user,
                amount: order.total,
                currency: 'INR',
                method: 'cod',
                notes
            })

            await orderService.updateOrderStatus(orderId, IOrderStatus.PROCESSING);

            return { payment };
        }

        const amountInPaise = Math.round(order.total * 100);

        const razorpayOrder = await razorpayService.createOrder(
            orderId,
            amountInPaise, 
            'INR',
            { ...notes, orderId, userId: user }
        )

        const payment = await this._paymentRepository.createPayment({
            orderId,
            user,
            amount: order.total,
            currency: 'INR',
            method: 'razorpay',
            receipt: razorpayOrder.receipt,
            notes: { ...notes, razorpayOrder }
        });

        await this._paymentRepository.updatePayment(payment._id.toString(), {
            razorpayOrderId: razorpayOrder.id
        });

        return { 
          payment, 
          order: razorpayOrder,
          testCards: {
              success: '4111 1111 1111 1111',
              failure: '4111 1111 1111 1112',
              authentication: '4012 0010 3714 1112'
          },
          testInstructions: 'Use these test cards for payment simulation in test mode'
        };
    }

    async handleSuccessfulPayment( razorpayOrderId: string, razorpayPaymentId: string, razorpayPayment: any ) {
        const payment = await this._paymentRepository.getPaymentByRazorpayOrderId(razorpayOrderId);
        if (!payment) {
        throw new NotFoundError('Payment not found');
        }

        // Update payment status
        const updatedPayment = await this._paymentRepository.updatePayment(payment._id.toString(), {
        razorpayPaymentId,
        status: IPaymentStatus.CAPTURED,
        notes: { ...payment.notes, razorpayPayment }
        });

        // Update order status
        await orderService.updateOrderStatus(payment.orderId.toString(), IOrderStatus.PROCESSING);
        const orderDetails = await this._orderRepository.getOrderById(payment.orderId.toString());
        if(!orderDetails) throw new InternalServerError();

        const user =  await this._userRepository.getUserById(payment.user.toString());
        if(!user) throw new NotFoundError('user not found');

        const emailData = {
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          orderNumber: orderDetails.orderNumber,
          orderDate: new Date(orderDetails.createdAt).toLocaleDateString('en-IN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          }),
          items: orderDetails.items.map(item => ({
            productName: item.productName,
            productCode: item.productCode,
            quantity: item.quantity,
            size: item.size?.toUpperCase() || 'N/A',
            priceAtPurchase: item.priceAtPurchase,
            itemTotal: item.itemTotal
          })),
           pricing: {
            subtotal: orderDetails.subtotal,
            totalDiscountAmount: orderDetails.totalDiscountAmount || 0,
            shippingCharge: orderDetails.shippingCharge,
            taxAmount: orderDetails.taxAmount,
            total: orderDetails.total
          },
        }

        await mailService.sendEmail(
            user.email,
            'order-confirmation-email.ejs',
            emailData,
            `Order Confirmation - ${orderDetails.orderNumber}`
        )

        await cartService.clearCartItems(payment.user.toString());

        return updatedPayment;
    }

    async handleFailedPayment(razorpayOrderId: string, razorpayPaymentId: string) {
        const payment = await this._paymentRepository.getPaymentByRazorpayOrderId(razorpayOrderId);
        if (!payment) throw new NotFoundError('Payment not found')

        // Update payment status
        const updatedPayment = await this._paymentRepository.updatePayment(payment._id.toString(), {
        razorpayPaymentId,
        status: IPaymentStatus.FAILED
        });

        // Update order status
        await orderService.updateOrderStatus(payment.orderId.toString(), IOrderStatus.FAILED);

        return updatedPayment;
    }

    // async initiateRefund(params: RefundPaymentParams) {
    //     const { paymentId, amount, reason } = params;
        
    //     const payment = await this._paymentRepository.getPaymentById(paymentId);
    //     if (!payment) throw new NotFoundError('Payment not found');

    //     if (payment.status !== IPaymentStatus.CAPTURED) throw new BadRequestError('Only captured payments can be refunded');

    //     if (!payment.razorpayPaymentId) throw new BadRequestError('Razorpay payment ID not found');
        

    //     if (amount > payment.amount) throw new BadRequestError('Refund amount cannot exceed payment amount');
        

    //     // Initiate refund with Razorpay
    //     const refund = await razorpayService.initiateRefund(
    //     payment.razorpayPaymentId,
    //     amount,
    //     reason
    //     );

    //     return refund;
    // }

    async getPaymentDetails(paymentId: string, userId: string) {
    const payment = await this._paymentRepository.getPaymentById(paymentId);
    if (!payment) {
      throw new NotFoundError('Payment not found');
    }

    if (payment.user.toString() !== userId) {
      throw new BadRequestError('Payment does not belong to user');
    }

    return payment;
  }

  async getPaymentByOrderId(orderId: string, userId: string) {
    const payment = await this._paymentRepository.getPaymentByOrderId(orderId);
    if (!payment) {
      throw new NotFoundError('Payment not found');
    }

    if (payment.user.toString() !== userId) {
      throw new BadRequestError('Payment does not belong to user');
    }

    return payment;
  }

  async getPaymentHistory(userId: string, page: number = 1, limit: number = 10) {
    return this._paymentRepository.getPaymentsByUser(userId, page, limit);
  }
}

export default new PaymentService(new PaymentRepository(), new UserRepository(), new OrderRepository());