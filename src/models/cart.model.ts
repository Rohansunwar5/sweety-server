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
            required: true,
        },
        color: {
            colorName: {
                type: String,
                required: true,
                trim: true,
            },
            colorHex: {
                type: String,
                required: true,
            }
        },
        selectedImage: {
            type: String,
            required: true,
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
            required: false,
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
        },
        sessionId: {
            type: String,
            sparse: true,
        },
        expiresAt: {
            type: Date,
            default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
        isActive: {
            type: Boolean,
            default: true,
        }
    }, { timestamps : true }
)

cartItemSchema.index({ product: 1, 'color.colorName': 1, size: 1 });

cartSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
cartSchema.index({ sessionId: 1 });
cartSchema.index({ user: 1, isActive: 1 });

export interface ICartItemColor {
    colorName: string;
    colorHex: string;
}

export interface ICartItem extends mongoose.Schema {
    _id: string;
    product: mongoose.Types.ObjectId,
    quantity: number,
    size: string,
    color: ICartItemColor;
    selectedImage: string;
    addedAt: Date;
}

export interface ICart extends mongoose.Schema {
    user?: mongoose.Types.ObjectId;
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
    sessionId?: string;
    expiresAt: Date;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export default mongoose.model<ICart>('Cart', cartSchema)