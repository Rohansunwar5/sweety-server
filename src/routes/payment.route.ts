import { Router } from "express";
import isLoggedIn from "../middlewares/isLoggedIn.middleware";
import { asyncHandler } from "../utils/asynchandler";
import {
  initiatePayment,
  handleSuccessfulPayment,
  handleFailedPayment,
  getPaymentDetails,
  getPaymentByOrderId,
  getPaymentByOrderNumber,
  getPaymentHistory,
  initiateRefund,
  processRefund,
  getPaymentStats,
  getPaymentsByMethod,
  getPaymentsByStatus,
  getPaymentsByDateRange,
  getPaymentMethodStats,
  getRefundStats,
  verifyPayment
} from "../controllers/payment.controller";
import isAdminLoggedIn from "../middlewares/isAdminLoggedIn.middleware";
import razorpayService from "../services/razorpay.service";

const paymentRouter = Router();

// Payment initiation and processing
paymentRouter.post('/initiate', isLoggedIn, asyncHandler(initiatePayment));
paymentRouter.post('/success', asyncHandler(handleSuccessfulPayment));
paymentRouter.post('/failure', asyncHandler(handleFailedPayment));
paymentRouter.post('/verify', asyncHandler(verifyPayment));

// Payment details and history
paymentRouter.get('/details/:paymentId', isLoggedIn, asyncHandler(getPaymentDetails));
paymentRouter.get('/order/:orderId', isLoggedIn, asyncHandler(getPaymentByOrderId));
paymentRouter.get('/order-number/:orderNumber', isLoggedIn, asyncHandler(getPaymentByOrderNumber));
paymentRouter.get('/history', isLoggedIn, asyncHandler(getPaymentHistory));

// Refund management (Admin only)
paymentRouter.post('/refund/initiate', isAdminLoggedIn, asyncHandler(initiateRefund));
paymentRouter.put('/refund/process', isAdminLoggedIn, asyncHandler(processRefund));

// Analytics and reporting (Admin only)
paymentRouter.get('/stats', isAdminLoggedIn, asyncHandler(getPaymentStats));
paymentRouter.get('/stats/methods', isAdminLoggedIn, asyncHandler(getPaymentMethodStats));
paymentRouter.get('/stats/refunds', isAdminLoggedIn, asyncHandler(getRefundStats));

// Payment filtering (Admin only)
paymentRouter.get('/method/:method', isAdminLoggedIn, asyncHandler(getPaymentsByMethod));
paymentRouter.get('/status/:status', isAdminLoggedIn, asyncHandler(getPaymentsByStatus));
paymentRouter.get('/date-range', isAdminLoggedIn, asyncHandler(getPaymentsByDateRange));

// Webhook handling
paymentRouter.post('/webhook',
  asyncHandler(async (req, res) => {
    const eventId = req.headers['x-razorpay-event-id'];
    const event = req.headers['x-razorpay-event'] as string; 
    
    if (!eventId || !event) {
      return res.status(400).json({ 
        error: 'Missing required webhook headers' 
      });
    }

    try {
      await razorpayService.handleWebhook(event, req.body);
      res.json({ 
        status: 'ok',
        message: 'Webhook processed successfully' 
      });
    } catch (error: any) {
      console.error('Webhook processing error:', error);
      res.status(500).json({ 
        error: 'Webhook processing failed',
        message: error.message 
      });
    }
  })
);

export default paymentRouter;