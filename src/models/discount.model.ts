import mongoose from "mongoose";

export enum IType {
    COUPON = 'coupon',
    VOUCHER = 'voucher'
}

export enum IDiscountType {
    PERCENTAGE = 'percentage',
    FIXED = 'fixed',
    BUYXGETY = 'buyXgetY'
}

const discountSchema = new mongoose.Schema(
    {
        code: {
            type: String,
            required: true,
            unique: true,
            uppercase: true,
            trim: true,
        },
        type: {
            type: String,
            required: true,
            enum: IType
        },
        discountType: {
            type: String,
            required: true,
            enum: IDiscountType,
        },
        value: {
            type: Number,
            min: 0,
        },
        minPurchase: {
            type: Number,
            min: 0,
        },
        maxDiscount: {
            type: Number,
            min: 0,
        },
        buyX: {
            type: Number,
            min: 1,
        },
        getY: {
            type: Number,
            min: 1,
        },
        applicableCategories: [{
            type: mongoose.Types.ObjectId,
        }],
        excludedProducts: [{
            type: mongoose.Types.ObjectId,
        }],
        validFrom: {
            type: Date,
            required: true,
            default: Date.now
        },
        validUntil: {
            type: Date,
            required: true,
        },
        usageLimit: {
            type: Number,
            min: 1,
        },
        usedCount: {
            type: Number,
            default: 0,
            min: 0,
        },
        usedBy: [{
            type: mongoose.Types.ObjectId,
        }],
        isActive: {
            type: Boolean,
            default: true,
        },
        createdBy: {
            type: mongoose.Types.ObjectId,
        },
    }, { timestamps: true }
)

discountSchema.index({ type: 1, isActive: 1 });
discountSchema.index({ validFrom: 1, validUntil: 1, isActive: 1 });

export interface IDiscount extends mongoose.Schema {
  _id: string;
  code: string;
  type: string;
  discountType: string;
  value: number;
  minPurchase?: number;
  maxDiscount?: number;
  buyX?: number;
  getY?: number;
  applicableCategories?: mongoose.Types.ObjectId[];
  excludedProducts?: mongoose.Types.ObjectId[];
  validFrom: Date;
  validUntil: Date;
  usageLimit?: number;
  usedCount: number;
  usedBy: mongoose.Types.ObjectId[];
  isActive: boolean;
  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export default mongoose.model<IDiscount>('Discount', discountSchema);