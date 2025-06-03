import Razorpay from 'razorpay';
import config from '../config';
import { BadRequestError } from '../errors/bad-request.error';
import { InternalServerError } from '../errors/internal-server.error';
import paymentService from './payment.service';


interface RazorpayOrder {
    id: string;
    receipt: string;
}

const razorpay = new Razorpay({
  key_id: 'rzp_test_mu1qpI6gzIHcye',
  key_secret: 'ogYwmhorjvwGkX2ZB7nxzVkv'
});

class RazorpayService {

  private readonly isTestMode = true;

  async createOrder(orderId: string, amountInPaise: number, currency: string = 'INR', notes: any = {}) {

    if (this.isTestMode && amountInPaise < 1) {
        throw new BadRequestError('Test mode requires minimum amount of 1 INR');
      }

    try {

      if (!Number.isInteger(amountInPaise)) {
            throw new BadRequestError('Amount must be an integer value in paise');
      }
      if (amountInPaise < 100) {
            throw new BadRequestError('Amount must be at least 100 paise (₹1)');
      }
      const options = {
        amount: amountInPaise, // Razorpay expects amount in paise
        currency,
        receipt: `order_${orderId}`,
         notes: {
          ...notes,
          test_mode: this.isTestMode // Mark as test payment
        },
        payment_capture: 1 // Auto-capture payment
      };

      const order = await razorpay.orders.create(options);
      return order;
    } catch (error) {
      console.error('Razorpay createOrder error:', error);
      throw new InternalServerError('Failed to create Razorpay order');
    }
  }

   async verifyPaymentSignature(orderId: string, paymentId: string, signature: string) {
        if (this.isTestMode) {
          console.warn('Skipping signature verification in test mode');
          return true;
        }
        try {
            const crypto = require('crypto');
            const expectedSignature = crypto
                .createHmac('sha256', config.RAZORPAY_WEBHOOK_SECRET)
                .update(`${orderId}|${paymentId}`)
                .digest('hex');

            return expectedSignature === signature;
        } catch (error) {
            console.error('Razorpay signature verification failed:', error);
            throw new BadRequestError('Invalid payment signature');
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

//   async initiateRefund(paymentId: string, amount: number, reason?: string) {
//     try {
//       const refund = await razorpay.payments.refund(paymentId, {
//         amount: amount * 100,
//         ...(reason && { notes: { reason } )
//       });
      
//       await paymentService.addRefund({
//         paymentId,
//         amount,
//         razorpayRefundId: refund.id,
//         reason
//       });

//       return refund;
//     } catch (error) {
//       console.error('Razorpay initiateRefund error:', error);
//       throw new InternalServerError('Failed to initiate refund');
//     }
//   }

  async handleWebhook(event: string, payload: any) {
    try {
      if (event === 'payment.captured') {
        const { order_id, id: paymentId } = payload;
        
        // Verify payment with Razorpay
        const payment = await razorpay.payments.fetch(paymentId);
        if (!payment || payment.order_id !== order_id) {
          throw new BadRequestError('Invalid payment');
        }

        // Update payment and order status
        await paymentService.handleSuccessfulPayment(order_id, paymentId, payment);
      } else if (event === 'payment.failed') {
        const { order_id, id: paymentId } = payload;
        await paymentService.handleFailedPayment(order_id, paymentId);
      }

      return true;
    } catch (error) {
      console.error('Razorpay webhook handling error:', error);
      throw error;
    }
  }
}

export default new RazorpayService();