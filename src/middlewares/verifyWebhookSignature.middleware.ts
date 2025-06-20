import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

export const verifyWebhookSignature = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  const signature = req.headers['x-razorpay-signature'];

  if (!signature || !webhookSecret) {
    return res.status(400).json({ error: 'Invalid webhook request' });
  }

  const shasum = crypto.createHmac('sha256', webhookSecret);
  shasum.update(JSON.stringify(req.body));
  const digest = shasum.digest('hex');

  if (signature === digest) {
    next();
  } else {
    res.status(400).json({ error: 'Invalid webhook signature' });
  }
};