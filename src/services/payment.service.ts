import config from "../config";
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

interface RazorpayPaymentResponse {
  id: string;
  order_id: string;
  status: string;
  amount: number | string;
  currency: string;
  method: string;
  captured: boolean;
  card_id?: string;
  bank?: string;
  wallet?: string;
  vpa?: string;
  email: string;
  contact: string;
  created_at: number;
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
          key: config.RAZORPAY_KEY_ID
        };
    }

   async handleSuccessfulPayment( razorpayOrderId: string, razorpayPaymentId: string,razorpayPayment: RazorpayPaymentResponse ) {
    try {
      const payment = await this._paymentRepository.getPaymentByRazorpayOrderId(razorpayOrderId);
    if (!payment) {
      throw new NotFoundError('Payment not found');
    }

    // Get amount from Razorpay response (could be in paise or rupees)
    let paymentAmount = typeof razorpayPayment.amount === 'string' 
      ? parseFloat(razorpayPayment.amount) 
      : razorpayPayment.amount;

    // Debug logs - very important for troubleshooting
    console.log('Razorpay payment amount:', paymentAmount);
    console.log('Stored payment amount:', payment.amount);
    console.log('Full Razorpay response:', razorpayPayment);

    // Convert both amounts to paise for comparison
    const expectedAmountInPaise = Math.round(payment.amount * 100);
    
    // Check if Razorpay amount is likely in rupees (amount < 100 when it should be 3799)
    if (paymentAmount < 100) {
      paymentAmount = Math.round(paymentAmount * 100); // Convert to paise
    }

    // Verify payment amount matches order amount
    if (paymentAmount !== expectedAmountInPaise) {
      throw new BadRequestError(
        `Payment amount mismatch. Expected ${expectedAmountInPaise} paise (₹${payment.amount}), ` +
        `received ${paymentAmount} paise (₹${(paymentAmount/100).toFixed(2)})`
      );
    }

    // Rest of your method remains the same...
    const updatedPayment = await this._paymentRepository.updatePayment(
      payment._id.toString(),
      {
        razorpayPaymentId,
        status: IPaymentStatus.CAPTURED,
        notes: {
          ...payment.notes,
          razorpayPayment: {
            id: razorpayPayment.id,
            status: razorpayPayment.status,
            method: razorpayPayment.method,
            bank: razorpayPayment.bank,
            wallet: razorpayPayment.wallet,
            vpa: razorpayPayment.vpa,
            captured: razorpayPayment.captured,
            created_at: new Date(razorpayPayment.created_at * 1000)
          }
        }
      }
    );

      // Update order status
      await orderService.updateOrderStatus(
        payment.orderId.toString(),
        IOrderStatus.PROCESSING
      );

      // Get order details
      const orderDetails = await this._orderRepository.getOrderById(
        payment.orderId.toString()
      );
      if (!orderDetails) throw new InternalServerError('Order not found');

      // Get user details
      const user = await this._userRepository.getUserById(
        payment.user.toString()
      );
      if (!user) throw new NotFoundError('User not found');

      // Prepare email data
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
        paymentDetails: {
          method: razorpayPayment.method,
          amount: orderDetails.total,
          transactionId: razorpayPaymentId
        },
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
        }
      };

      // Send confirmation email
      await mailService.sendEmail(
        user.email,
        'order-confirmation-email.ejs',
        emailData,
        `Order Confirmation - ${orderDetails.orderNumber}`
      );

      // Clear cart
      await cartService.clearCartItems(payment.user.toString());

      return updatedPayment;
    } catch (error) {
      console.error('Payment processing error:', error);
      throw error;
    }
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

  

  // async verifyPayment(razorpayOrderId: string, razorpayPaymentId: string, razorpaySignature: string) {
  //       try {
  //           // Verify signature
  //           const isValid = await razorpayService.verifyPaymentSignature(
  //               razorpayOrderId, 
  //               razorpayPaymentId, 
  //               razorpaySignature
  //           );

  //           if (!isValid) {
  //               throw new BadRequestError('Invalid payment signature');
  //           }

  //           // Fetch payment details from Razorpay
  //           const razorpayPayment = await razorpayService.fetchPayment(razorpayPaymentId);
            
  //           // Process successful payment
  //           return await this.handleSuccessfulPayment(
  //               razorpayOrderId,
  //               razorpayPaymentId,
  //               razorpayPayment
  //           );
  //       } catch (error) {
  //           console.error('Payment verification error:', error);
  //           throw error;
  //       }
  //   }
}

export default new PaymentService(new PaymentRepository(), new UserRepository(), new OrderRepository());