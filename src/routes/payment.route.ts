import { Router } from "express";
import isLoggedIn from "../middlewares/isLoggedIn.middleware";
import { asyncHandler } from "../utils/asynchandler";
import {
  initiatePayment,
  handleSuccessfulPayment,
  handleFailedPayment,
  getPaymentDetails,
  getPaymentByOrderId,
  getPaymentHistory,
} from "../controllers/payment.controller";

const paymentRouter = Router();

paymentRouter.post('/initiate', isLoggedIn, asyncHandler(initiatePayment));
paymentRouter.post('/success', asyncHandler(handleSuccessfulPayment));
paymentRouter.post('/failure', asyncHandler(handleFailedPayment));
paymentRouter.get('/details/:paymentId', isLoggedIn, asyncHandler(getPaymentDetails));
paymentRouter.get('/order/:orderId', isLoggedIn, asyncHandler(getPaymentByOrderId));
paymentRouter.get('/history', isLoggedIn, asyncHandler(getPaymentHistory));

export default paymentRouter;
