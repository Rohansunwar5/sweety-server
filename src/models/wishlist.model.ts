import mongoose from 'mongoose';

const wishlistItemSchema = new mongoose.Schema(
    {
        product: {
            type: mongoose.Types.ObjectId,
            required: true,
        },
        addedAt: {
            type: Date,
            default: Date.now,
        },
        priceWhenAdded: {
            type: Number,
        }
    }
)

const wishlistSchema = new mongoose.Schema (
    {
        user: {
            type: mongoose.Types.ObjectId,
            required: true,
        },
        items: [ wishlistItemSchema ],
        isPublic: {
            type: Boolean,
            default: false,
        },
        name: {
            type: String,
            default: "My Wishlist",
        },
    }, { timestamps: true }
)

wishlistSchema.index({ user: 1 });

export interface IWishlistItem {
    _id: string;
    product: mongoose.Types.ObjectId;
    addedAt: Date;
    priceWhenAdded?: number;
}

export interface IWishlist extends mongoose.Schema {
    _id: string;
    user: mongoose.Types.ObjectId;
    items: IWishlistItem[];
    isPublic: boolean;
    name: string;
    createdAt: Date;
    updatedAt: Date;
}

export default mongoose.model<IWishlist>('Wishlist', wishlistSchema);