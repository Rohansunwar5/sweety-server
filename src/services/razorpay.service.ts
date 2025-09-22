import Razorpay from 'razorpay';
import config from '../config';
import { BadRequestError } from '../errors/bad-request.error';
import { InternalServerError } from '../errors/internal-server.error';

interface RazorpayOrder {
    id: string;
    receipt: string;
}

interface RazorpayWebhookPayload {
  entity: string;
  account_id: string;
  event: string;
  contains: string[];
  payload: {
    payment: {
      entity: {
        id: string;
        order_id: string;
        status: string;
        amount: string | number;
      }
    }
  }
}

const razorpay = new Razorpay({
  key_id: config.RAZORPAY_KEY_ID,
  key_secret: config.RAZORPAY_KEY_SECRET
});

class RazorpayService {

  // private readonly isTestMode = true;
  private readonly isTestMode = process.env.NODE_ENV !== 'production';

  async createOrder(orderId: string, amountInPaise: number, currency: string = 'INR', notes: any = {}) {

    // if (this.isTestMode && amountInPaise < 1) {
    //     throw new BadRequestError('Test mode requires minimum amount of 1 INR');
    //   }

    try {
      if (!Number.isInteger(amountInPaise)) throw new BadRequestError('Amount must be an integer value in paise');
      if (amountInPaise < 100) throw new BadRequestError('Amount must be at least 100 paise (₹1)');

      const options = {
        amount: amountInPaise, 
        currency,
        receipt: `order_${orderId}`,
         notes: {
          ...notes,
          test_mode: config.NODE_ENV 
        },
        payment_capture: 1
      };

      const order = await razorpay.orders.create(options);
      return order;
    } catch (error) {
      console.error('Razorpay createOrder error:', error);
      throw new InternalServerError('Failed to create Razorpay order');
    }
  }

  async verifyPaymentSignature(orderId: string, paymentId: string, signature: string) {
    try {
      const crypto = require('crypto');
      // const webhookSecret =  config.RAZORPAY_WEBHOOK_SECRET;
      
      const expectedSignature = crypto
        .createHmac('sha256', config.RAZORPAY_KEY_SECRET)
        .update(`${orderId}|${paymentId}`)
        .digest('hex');

      return expectedSignature === signature;
    } catch (error) {
      console.error('Razorpay signature verification failed:', error);
      throw new BadRequestError('Invalid payment signature');
    }
  }

   async fetchPayment(paymentId: string) {
    try {
      return await razorpay.payments.fetch(paymentId);
    } catch (error) {
      console.error('Razorpay fetchPayment error:', error);
      throw new InternalServerError('Failed to fetch payment details');
    }
  }

  async capturePayment(paymentId: string, amount: number, currency: string = 'INR') {
    try {
        return await razorpay.payments.capture(paymentId, amount * 100, currency);
    } catch (error) {
        console.error('Razorpay capturePayment error:', error);
        throw new InternalServerError('Failed to capture payment');
    }
  }

  async handleWebhook(event: string, payload: RazorpayWebhookPayload) {
    try {
      const paymentEntity = payload.payload.payment.entity;
      
      switch (event) {
        case 'payment.captured':
          await this.handleCapturedPayment(paymentEntity);
          break;
          
        case 'payment.failed':
          await this.handleFailedPayment(paymentEntity);
          break;
          
        case 'payment.authorized':
          // Handle authorized payment if needed
          break;
          
        default:
          console.log(`Unhandled webhook event: ${event}`);
      }

      return true;
    } catch (error) {
      console.error('Razorpay webhook handling error:', error);
      throw error;
    }
  }

   private async handleCapturedPayment(paymentEntity: any) {
    const { order_id, id: paymentId } = paymentEntity;
    
    // Verify payment with Razorpay
    const payment = await this.fetchPayment(paymentId);
    if (!payment || payment.order_id !== order_id) {
      throw new BadRequestError('Invalid payment');
    }

    // Import paymentService here to avoid circular dependency
    const paymentService = require('./payment.service').default;
    
    // Update payment and order status
    await paymentService.handleSuccessfulPayment(
      order_id,
      paymentId,
      payment
    );
  }

  private async handleFailedPayment(paymentEntity: any) {
    const { order_id, id: paymentId } = paymentEntity;
    
    try {
      // Import paymentService here to avoid circular dependency
      const paymentService = require('./payment.service').default;
      
      await paymentService.handleFailedPayment(order_id, paymentId);
    } catch (error) {
      console.error('Error handling failed payment:', error);
      throw error;
    }
  }
}

export default new RazorpayService();