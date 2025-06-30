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
import productService from "./product.service";
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

    async handleSuccessfulPayment(
        razorpayOrderId: string, 
        razorpayPaymentId: string,
        razorpaySignature: string  // Changed: now expects signature only
    ) {
        try {
            // 1. Get stored payment record
            const payment = await this._paymentRepository.getPaymentByRazorpayOrderId(razorpayOrderId);
            if (!payment) {
                throw new NotFoundError('Payment not found');
            }

            // 2. Verify signature using razorpayService
            const isValidSignature = await razorpayService.verifyPaymentSignature(
                razorpayOrderId,
                razorpayPaymentId,
                razorpaySignature
            );

            if (!isValidSignature) {
                throw new BadRequestError('Invalid payment signature');
            }

            // 3. Fetch payment details from Razorpay using razorpayService
            const razorpayPayment = await razorpayService.fetchPayment(razorpayPaymentId);
            
            console.log('Fetched Razorpay payment details:', razorpayPayment);
            console.log('Stored payment amount:', payment.amount);

            // 4. Verify payment status
            if (razorpayPayment.status !== 'captured') {
                throw new BadRequestError(`Payment not captured. Status: ${razorpayPayment.status}`);
            }

            // 5. Verify payment amount (both should be in paise)
            const paymentAmount = Number(payment.amount);
            if (isNaN(paymentAmount) || paymentAmount <= 0) {
                throw new BadRequestError('Invalid payment amount in stored payment record');
            }
            const expectedAmountInPaise = Math.round(paymentAmount * 100);
            const receivedAmountInPaise = razorpayPayment.amount;

            console.log('Expected amount (paise):', expectedAmountInPaise);
            console.log('Received amount (paise):', receivedAmountInPaise);

            if (receivedAmountInPaise !== expectedAmountInPaise) {
                throw new BadRequestError(
                    `Payment amount mismatch. Expected ${expectedAmountInPaise} paise (₹${payment.amount}), ` +
                    `received ${receivedAmountInPaise} paise (₹)`
                );
            }

            // 6. Update payment record
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
                            amount: razorpayPayment.amount,
                            currency: razorpayPayment.currency,
                            created_at: new Date(razorpayPayment.created_at * 1000)
                        }
                    }
                }
            );

            // 7. Update order status
            await orderService.updateOrderStatus(
                payment.orderId.toString(),
                IOrderStatus.PROCESSING
            );

            // 8. Get order details
            const orderDetails = await this._orderRepository.getOrderById(
                payment.orderId.toString()
            );
            if (!orderDetails) throw new InternalServerError('Order not found');

             try {
            const orderItems = orderDetails.items
                .filter(item => item.size) // Only process items with size
                .map(item => ({
                    productId: item.product.toString(), // Use 'product' field from order schema
                    size: item.size!, // Non-null assertion since we filtered above
                    quantity: item.quantity,
                    productName: item.productName
                }));

            if (orderItems.length > 0) {
                await productService.reduceStockForOrder(orderItems);
            }
        } catch (stockError: any) {
            // Business logic: Handle stock reduction failures after successful payment
            console.error('CRITICAL: Payment confirmed but stock reduction failed:', {
                razorpayOrderId,
                razorpayPaymentId,
                orderId: payment.orderId.toString(),
                error: stockError.message,
                timestamp: new Date().toISOString()
            });

            // You might want to:
            // 1. Send alert to admin
            // 2. Create a manual intervention record
            // 3. Mark order for manual review
            // For now, we'll continue with the process but log the critical error
        }


            // 9. Get user details
            const user = await this._userRepository.getUserById(
                payment.user.toString()
            );
            if (!user) throw new NotFoundError('User not found');

            // 10. Prepare email data
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

            // 11. Send confirmation email
            await mailService.sendEmail(
                user.email,
                'order-confirmation-email.ejs',
                emailData,
                `Order Confirmation - ${orderDetails.orderNumber}`
            );

            // 12. Clear cart
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

  

  async verifyPayment(razorpayOrderId: string, razorpayPaymentId: string, razorpaySignature: string) {
        try {
            // Verify signature
            const isValid = await razorpayService.verifyPaymentSignature(
                razorpayOrderId, 
                razorpayPaymentId, 
                razorpaySignature
            );

            if (!isValid) {
                throw new BadRequestError('Invalid payment signature');
            }

            // Fetch payment details from Razorpay
            const razorpayPayment = await razorpayService.fetchPayment(razorpayPaymentId);
            
            // Process successful payment
            return await this.handleSuccessfulPayment(
                razorpayOrderId,
                razorpayPaymentId,
                razorpaySignature
            );
        } catch (error) {
            console.error('Payment verification error:', error);
            throw error;
        }
    }
}

export default new PaymentService(new PaymentRepository(), new UserRepository(), new OrderRepository());