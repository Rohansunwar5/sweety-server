import mongoose from "mongoose";

export enum IPaymentStatus {
  CREATED = 'created',
  CAPTURED = 'captured',
  FAILED = 'failed',
  REFUNDED = 'refunded'
}

export enum IPaymentMethod {
  RAZORPAY = 'razorpay',
  COD = 'cod',
  WALLET = 'wallet'
}

const paymentSchema = new mongoose.Schema({
    orderId: {
        type: mongoose.Types.ObjectId,
        required: true,
    },
    razorpayOrderId: {
        type: String,
        unique: true,
        sparse: true,
    },
    razorpayPaymentId: {
        type: String,
        unique: true,
        sparse: true,
    },
    user: {
        type: mongoose.Types.ObjectId,
        required: true,
    },
    amount: {
        type: Number,
        required: true,
        min: 0,
    },
    currency: {
        type: String,
        default: 'INR',
        required: true,
    },
    method: {
        type: String,
        enum: IPaymentMethod,
        required: true,
    },
    status: {
        type: String,
        enum: IPaymentStatus,
        default: IPaymentStatus.CREATED,
    },
    receipt: {
        type: String,
    },
    notes: {
        type: Object,
    },
    refunds: [{
        amount: Number,
        razorpayRefundId: String,
        reason: String,
        createdAt: {
            type: Date,
            default: Date.now,
        }
    }]
}, { timestamps: true });

paymentSchema.index({ orderId: 1, status: 1 });
paymentSchema.index({ user: 1, status: 1 });

export interface IPayment extends mongoose.Document {
    _id: string;
    orderId: mongoose.Types.ObjectId;
    razorpayOrderId?: string;
    razorpayPaymentId?: string;
    user: mongoose.Types.ObjectId;
    amount: number;
    currency: string;
    method: IPaymentMethod;
    status: IPaymentStatus;
    receipt?: string;
    notes?: any;
    refunds?: Array<{
        amount: number;
        razorpayRefundId: string;
        reason?: string;
        createdAt: Date;
    }>;
    createdAt: Date;
    updatedAt: Date;
}

export default mongoose.model<IPayment>('Payment', paymentSchema);