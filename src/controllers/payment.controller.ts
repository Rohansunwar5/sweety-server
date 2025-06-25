import { Request, Response, NextFunction } from "express";
import paymentService from "../services/payment.service";

export const initiatePayment = async (req: Request, res: Response, next: NextFunction) => {
  const { orderId, method, notes } = req.body;
  const user = req.user._id;
  const response = await paymentService.initiatePayment({ orderId, method, notes, user });
  
  next(response);
};

export const handleSuccessfulPayment = async (req: Request, res: Response) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    console.log('Payment success request:', {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature: razorpay_signature ? 'present' : 'missing'
    });

    // Validate required parameters
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: 'Missing required payment parameters'
      });
    }

    // Call service with signature verification
    const result = await paymentService.handleSuccessfulPayment(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    );

    res.status(200).json({
      success: true,
      message: 'Payment processed successfully',
      data: result
    });
  } catch (error: any) {
    console.error('Payment processing error:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Payment processing failed'
    });
  }
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
