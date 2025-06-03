import mongoose from "mongoose";

const cartItemSchema = new mongoose.Schema (
    {
        product: {
            type: mongoose.Types.ObjectId,
            required: true,
        },
        quantity: {
            type: Number,
            required: true,
            min: 1, 
            default: 1,
        },
        size: {
            type: String,
        },
        addedAt: {
            type: Date,
            default: Date.now
        }
    }
)

const cartSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Types.ObjectId,
            required: true,
        },
        items: [
            cartItemSchema
        ],
         appliedCoupon: {
            code: String,
            discountId: mongoose.Types.ObjectId,
            discountAmount: Number
        },
        appliedVoucher: {
            code: String,
            discountId: mongoose.Types.ObjectId,
            discountAmount: Number
        }
    }, { timestamps : true }
)

export interface ICartItem extends mongoose.Schema {
    _id: string;
    product: mongoose.Types.ObjectId,
    quantity: number,
    size?: string,
    addedAt: Date;
}

export interface ICart extends mongoose.Schema {
    user: mongoose.Types.ObjectId;
    items: ICartItem[];
    appliedCoupon?: {
        code: string;
        discountId: mongoose.Types.ObjectId;
        discountAmount: number;
    };
    appliedVoucher?: {
        code: string;
        discountId: mongoose.Types.ObjectId;
        discountAmount: number;
    }
}

export default mongoose.model<ICart>('Cart', cartSchema)