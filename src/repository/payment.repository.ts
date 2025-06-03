import { FilterQuery } from "mongoose";
import paymentModel, { IPayment, IPaymentStatus } from "../models/payment.model";

export interface CreatePaymentParams {
  orderId: string;
  user: string;
  amount: number;
  currency?: string;
  method: string;
  receipt?: string;
  notes?: any;
}

export interface UpdatePaymentParams {
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  status?: IPaymentStatus;
  notes?: any;
}

export interface RefundPaymentParams {
  paymentId: string;
  amount: number;
  razorpayRefundId: string;
  reason?: string;
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

    async addRefund(params: RefundPaymentParams) {
      return this._model.findByIdAndUpdate(
        params.paymentId,
        {
          $push: {
            refunds: {
              amount: params.amount,
              razorpayRefundId: params.razorpayRefundId,
              reason: params.reason
            }
          },
          $set: {
            status: IPaymentStatus.REFUNDED
          }
        },
        { new: true }
      );
    }

    async getPaymentsByUser(userId: string, page: number = 1, limit: number = 10 ) {
      const skip = (page - 1) * limit;
        return this._model.find({ user: userId })
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
    }

    async getPaymentStatus(userId?: string) {
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
            }
          }
        }
      ]);
    }
 
}
