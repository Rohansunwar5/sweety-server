import { Router } from "express";
import isLoggedIn from "../middlewares/isLoggedIn.middleware";
import { asyncHandler } from "../utils/asynchandler";
import {
  initiatePayment,

  handleFailedPayment,
  getPaymentDetails,
  getPaymentByOrderId,
  getPaymentHistory,
} from "../controllers/payment.controller";
import isAdminLoggedIn from "../middlewares/isAdminLoggedIn.middleware";
// import { verifyWebhookSignature } from "../middlewares/verifyWebhookSignature.middleware";
import razorpayService from "../services/razorpay.service";

const paymentRouter = Router();

paymentRouter.post('/initiate', isLoggedIn, asyncHandler(initiatePayment));
// paymentRouter.post('/success', asyncHandler(handleSuccessfulPayment));
paymentRouter.post('/failure', asyncHandler(handleFailedPayment));
paymentRouter.get('/details/:paymentId', isLoggedIn, asyncHandler(getPaymentDetails));
paymentRouter.get('/order/:orderId', isLoggedIn, asyncHandler(getPaymentByOrderId));
paymentRouter.get('/history', isAdminLoggedIn, asyncHandler(getPaymentHistory));
paymentRouter.post('/webhook',
  asyncHandler(async (req, res) => {
    const eventId = req.headers['x-razorpay-event-id'];
    const event = req.headers['x-razorpay-event'] as string; 
    
    if (!eventId || !event) {
      return res.status(400).json({ 
        error: 'Missing required webhook headers' 
      });
    }

    await razorpayService.handleWebhook(event, req.body);
    res.json({ status: 'ok' });
  })
);

export default paymentRouter;