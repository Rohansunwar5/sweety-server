import mongoose from "mongoose";

export enum IPaymentStatus {
  CREATED = 'created',
  CAPTURED = 'captured',
  FAILED = 'failed',
  REFUNDED = 'refunded',
  PARTIAL_REFUNDED = 'partial_refunded'
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
    orderNumber: {
        type: String,
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
        amount: {
            type: Number,
            required: true,
            min: 0
        },
        razorpayRefundId: {
            type: String,
            sparse: true
        },
        reason: {
            type: String,
            maxLength: 500
        },
        status: {
            type: String,
            enum: ['pending', 'processed', 'failed'],
            default: 'pending'
        },
        processedAt: Date,
        createdAt: {
            type: Date,
            default: Date.now,
        }
    }],
    failureReason: {
        type: String,
        maxLength: 500
    },
    gatewayResponse: {
        type: Object
    },
    capturedAt: Date,
    failedAt: Date,
    refundedAt: Date
}, { timestamps: true });

paymentSchema.index({ orderId: 1, status: 1 });
paymentSchema.index({ user: 1, status: 1 });
paymentSchema.index({ orderNumber: 1 });
paymentSchema.index({ razorpayOrderId: 1 });
paymentSchema.index({ razorpayPaymentId: 1 });
paymentSchema.index({ createdAt: -1 });


export interface IPaymentRefund {
    amount: number;
    razorpayRefundId?: string;
    reason?: string;
    status: 'pending' | 'processed' | 'failed';
    processedAt?: Date;
    createdAt: Date;
}

export interface IPayment extends mongoose.Document {
    _id: string;
    orderId: mongoose.Types.ObjectId;
    orderNumber: string;
    razorpayOrderId?: string;
    razorpayPaymentId?: string;
    user: mongoose.Types.ObjectId;
    amount: number;
    currency: string;
    method: IPaymentMethod;
    status: IPaymentStatus;
    receipt?: string;
    notes?: any;
    refunds?: IPaymentRefund[];
    failureReason?: string;
    gatewayResponse?: any;
    capturedAt?: Date;
    failedAt?: Date;
    refundedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
    // Virtuals
    totalRefundedAmount: number;
    isFullyRefunded: boolean;
}

export default mongoose.model<IPayment>('Payment', paymentSchema);