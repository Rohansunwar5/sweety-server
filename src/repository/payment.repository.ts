import { FilterQuery } from "mongoose";
import paymentModel, { IPayment, IPaymentMethod, IPaymentStatus } from "../models/payment.model";

export interface CreatePaymentParams {
  orderId: string;
  orderNumber: string;
  user: string;
  amount: number;
  currency?: string;
  method: IPaymentMethod;
  receipt?: string;
  notes?: any;
}

export interface UpdatePaymentParams {
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  status?: IPaymentStatus;
  notes?: any;
  failureReason?: string;
  gatewayResponse?: any;
  capturedAt?: Date;
  failedAt?: Date;
  refundedAt?: Date;
}

export interface RefundPaymentParams {
  paymentId: string;
  amount: number;
  razorpayRefundId?: string;
  reason?: string;
  status?: 'pending' | 'processed' | 'failed';
}

export interface UpdateRefundParams {
  paymentId: string;
  refundId: string;
  status: 'pending' | 'processed' | 'failed';
  processedAt?: Date;
}

export class PaymentRepository {
    private _model = paymentModel;

    async createPayment(params: CreatePaymentParams) {
      return this._model.create(params);
    }

    async getPaymentById(id: string) {
      return this._model.findById(id);
    }

    async getPaymentByOrderId(orderId: string) {
      return this._model.findOne({ orderId })
    }

     async getPaymentByRazorpayOrderId(razorpayOrderId: string) {
      return this._model.findOne({ razorpayOrderId });
    }

    async getPaymentByRazorpayPaymentId(razorpayPaymentId: string) {
      return this._model.findOne({ razorpayPaymentId });
    }

    async updatePayment(id: string, params: UpdatePaymentParams) {
      return this._model.findByIdAndUpdate(
        id,
        params,
        { new: true },
      );
    }

    async updatePaymentByOrderId(orderId: string, params: UpdatePaymentParams) {
      return this._model.findOneAndUpdate(
        { orderId },
        params,
        { new: true }
      )
    }

    async updatePaymentByOrderNumber(orderNumber: string, params: UpdatePaymentParams) {
      return this._model.findOneAndUpdate(
        { orderNumber },
        params,
        { new: true }
      )
    }

    async addRefund(params: RefundPaymentParams) {
      const payment = await this._model.findById(params.paymentId);
      if (!payment) {
        throw new Error('Payment not found');
      }

      // Calculate total refunded amount including this new refund
      const currentRefundedAmount = payment.refunds?.reduce((total, refund) => {
        return refund.status === 'processed' ? total + refund.amount : total;
      }, 0) || 0;

      const newTotalRefunded = currentRefundedAmount + params.amount;
      
      // Determine new payment status
      let newStatus: IPaymentStatus;
      if (newTotalRefunded >= payment.amount) {
        newStatus = IPaymentStatus.REFUNDED;
      } else {
        newStatus = IPaymentStatus.PARTIAL_REFUNDED;
      }

      return this._model.findByIdAndUpdate(
        params.paymentId,
        {
          $push: {
            refunds: {
              amount: params.amount,
              razorpayRefundId: params.razorpayRefundId,
              reason: params.reason,
              status: params.status || 'pending'
            }
          },
          $set: {
            status: newStatus,
            ...(newStatus === IPaymentStatus.REFUNDED && { refundedAt: new Date() })
          }
        },
        { new: true }
      );
    }

    async updateRefundStatus(params: UpdateRefundParams) {
      const payment = await this._model.findOneAndUpdate(
        { 
          _id: params.paymentId,
          'refunds._id': params.refundId
        },
        {
          $set: {
            'refunds.$.status': params.status,
            'refunds.$.processedAt': params.processedAt || new Date()
          }
        },
        { new: true }
      );

      if (!payment) {
        throw new Error('Payment or refund not found');
      }

      // Recalculate payment status based on processed refunds
      const totalRefundedAmount = payment.refunds?.reduce((total, refund) => {
        return refund.status === 'processed' ? total + refund.amount : total;
      }, 0) || 0;

      let newStatus: IPaymentStatus;
      if (totalRefundedAmount >= payment.amount) {
        newStatus = IPaymentStatus.REFUNDED;
      } else if (totalRefundedAmount > 0) {
        newStatus = IPaymentStatus.PARTIAL_REFUNDED;
      } else {
        newStatus = payment.status; // Keep existing status if no processed refunds
      }

      return this._model.findByIdAndUpdate(
        params.paymentId,
        {
          $set: {
            status: newStatus,
            ...(newStatus === IPaymentStatus.REFUNDED && { refundedAt: new Date() })
          }
        },
        { new: true }
      );
    }

    async getPaymentsByUser(userId: string, page: number = 1, limit: number = 10) {
      const skip = (page - 1) * limit;
        
      return this._model.find({ user: userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
    }

    async getPaymentsByStatus(status: IPaymentStatus, page: number = 1, limit: number = 10) {
      const skip = (page - 1) * limit;
      
      return this._model.find({ status })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);
    }

    async getPaymentsByMethod(method: IPaymentMethod, page: number = 1, limit: number = 10) {
      const skip = (page - 1) * limit;
      
      return this._model.find({ method })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);
    }

    async getPaymentByOrderNumber(orderNumber: string) {
      return this._model.findOne({ orderNumber });
    }

    async getPaymentsByDateRange(startDate: Date, endDate: Date, page: number = 1, limit: number = 10) {
      const skip = (page - 1) * limit;
      
      return this._model.find({
        createdAt: {
          $gte: startDate,
          $lte: endDate
        }
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    }

    async getPaymentStats(userId?: string) {
      const match: FilterQuery<IPayment> = {};
      if(userId) match.user = userId;

      return this._model.aggregate([
        { $match: match },
        {
          $group: {
            _id: null,
            totalPayments: { $sum: 1 },
            totalAmount: { $sum: "$amount" },
            successfulPayments: {
              $sum: { $cond: [{ $eq: ["$status", IPaymentStatus.CAPTURED] }, 1, 0] }
            },
            failedPayments: {
              $sum: { $cond: [{ $eq: ["$status", IPaymentStatus.FAILED] }, 1, 0] }
            },
            refundedPayments: {
              $sum: { $cond: [{ $eq: ["$status", IPaymentStatus.REFUNDED] }, 1, 0] }
            },
            partialRefundedPayments: {
              $sum: { $cond: [{ $eq: ["$status", IPaymentStatus.PARTIAL_REFUNDED] }, 1, 0] }
            },
            successfulAmount: {
              $sum: { $cond: [{ $eq: ["$status", IPaymentStatus.CAPTURED] }, "$amount", 0] }
            },
            refundedAmount: {
              $sum: { 
                $cond: [
                  { $in: ["$status", [IPaymentStatus.REFUNDED, IPaymentStatus.PARTIAL_REFUNDED]] },
                  { $sum: "$refunds.amount" },
                  0
                ]
              }
            }
          }
        }
      ]);
    }

    async getPaymentsByMethodStats(userId?: string) {
      const match: FilterQuery<IPayment> = {};
      if(userId) match.user = userId;

      return this._model.aggregate([
        { $match: match },
        {
          $group: {
            _id: "$method",
            count: { $sum: 1 },
            totalAmount: { $sum: "$amount" },
            successfulCount: {
              $sum: { $cond: [{ $eq: ["$status", IPaymentStatus.CAPTURED] }, 1, 0] }
            },
            failedCount: {
              $sum: { $cond: [{ $eq: ["$status", IPaymentStatus.FAILED] }, 1, 0] }
            }
          }
        },
        {
          $sort: { totalAmount: -1 }
        }
      ]);
    }

    async getRefundStats(userId?: string) {
      const match: FilterQuery<IPayment> = {};
      if(userId) match.user = userId;

      return this._model.aggregate([
        { $match: match },
        { $unwind: "$refunds" },
        {
          $group: {
            _id: "$refunds.status",
            count: { $sum: 1 },
            totalAmount: { $sum: "$refunds.amount" }
          }
        }
      ]);
    }

    async markPaymentAsCaptured(paymentId: string, razorpayPaymentId?: string, gatewayResponse?: any) {
      return this._model.findByIdAndUpdate(
        paymentId,
        {
          $set: {
            status: IPaymentStatus.CAPTURED,
            capturedAt: new Date(),
            ...(razorpayPaymentId && { razorpayPaymentId }),
            ...(gatewayResponse && { gatewayResponse })
          }
        },
        { new: true }
      );
    }

    async markPaymentAsFailed(paymentId: string, failureReason?: string, gatewayResponse?: any) {
      return this._model.findByIdAndUpdate(
        paymentId,
        {
          $set: {
            status: IPaymentStatus.FAILED,
            failedAt: new Date(),
            ...(failureReason && { failureReason }),
            ...(gatewayResponse && { gatewayResponse })
          }
        },
        { new: true }
      );
    }

}
