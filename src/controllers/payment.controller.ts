import { Request, Response, NextFunction } from "express";
import paymentService from "../services/payment.service";

export const initiatePayment = async (req: Request, res: Response, next: NextFunction) => {
  const { orderId, method, notes } = req.body;
  const user = req.user._id;
  const response = await paymentService.initiatePayment({ orderId, method, notes, user });
  
  next(response);
};

export const handleSuccessfulPayment = async (req: Request, res: Response, next: NextFunction) => {
  const { razorpayOrderId, razorpayPaymentId, razorpayPayment } = req.body;
  const response = await paymentService.handleSuccessfulPayment( razorpayOrderId, razorpayPaymentId, razorpayPayment);

  next(response);
};

export const handleFailedPayment = async (req: Request, res: Response, next: NextFunction) => {
  const { razorpayOrderId, razorpayPaymentId } = req.body;
  const response = await paymentService.handleFailedPayment(razorpayOrderId, razorpayPaymentId);
  
  next(response);
};

export const getPaymentDetails = async (req: Request, res: Response, next: NextFunction) => {
  const { paymentId } = req.params;
  const user = req.user._id;
  const response = await paymentService.getPaymentDetails(paymentId, user);
  
  next(response);
};

export const getPaymentByOrderId = async (req: Request, res: Response, next: NextFunction) => {
  const { orderId } = req.params;
  const user = req.user._id;
  const response = await paymentService.getPaymentByOrderId(orderId, user);
  
  next(response);
};

export const getPaymentHistory = async (req: Request, res: Response, next: NextFunction) => {
  const user = req.user._id;
  const { page = 1, limit = 10 } = req.query;
  const response = await paymentService.getPaymentHistory(user, Number(page), Number(limit));
  
  next(response);
};
