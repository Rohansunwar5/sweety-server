import mongoose from 'mongoose';

const sizeStockSchema = new mongoose.Schema({
    size: {
        type: String,
        required: true,
        trim: true,
        maxLength: 20 // Allows for flexible sizing like "37A", "XXL", "32", etc.
    },
    stock: {
        type: Number,
        required: true,
        min: 0
    }
});

const productColorSchema = new mongoose.Schema({
    colorName: {
        type: String,
        required: true,
        trim: true,
        maxLength: 50
    },
    colorHex: {
        type: String,
        required: true,
        match: /^#([0-9A-Fa-f]{6})$/, // Hex color validation
    },
    images: [{
        type: String,
        required: true,
    }],
    sizeStock: [sizeStockSchema]
});

const productSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            maxLength: 100,
        },
        code: {
            type: String,
            required: true,
            unique: true,
            uppercase: true,
            trim: true,
        },
        category: {
            type: mongoose.Types.ObjectId,
            required: true,
        },
        subcategories: [{
            type: mongoose.Types.ObjectId,
        }],
        colors: [productColorSchema],
        sizeChart: {
            type: String,
        },
        price: {
            type: Number,
            required: true,
            min: 0,
        },
        originalPrice: {
            type: Number,
            min: 0,
        },
        description: {
            type: String,
            trim: true,
            maxLength: 2000
        }, 
        offer: {
            type: mongoose.Types.ObjectId,
        },
        ratings: [{
            userId: {
                type: mongoose.Types.ObjectId,
                required: true,
            },
            value: {
                type: Number,
                required: true,
                min: 1,
                max: 5
            },
            review: {
                type: String,
                maxLength: 500
            },
            createdAt: {
                type: Date,
                default: Date.now
            }
        }],
        isActive: {
            type: Boolean,
            default: true,
        },
        tags: [{
            type: String,
            trim: true,
        }],
    }, { timestamps: true }
);

productSchema.index({ name: 'text', description: 'text', tags: 'text' });
productSchema.index({ category: 1 });
productSchema.index({ subcategories: 1 });
productSchema.index({ price: 1 });

export interface ISizeStock {
    size: string;
    stock: number;
}

export interface IProductColor {
    colorName: string;
    colorHex: string;
    images: string[];
    sizeStock: ISizeStock[];
}

export interface IProduct extends mongoose.Schema {
    _id: string;
    name: string;
    code: string;
    category: mongoose.Types.ObjectId;
    subcategories?: mongoose.Types.ObjectId[];
    colors: IProductColor[];
    sizeChart?: string;
    price: number;
    originalPrice?: number;
    description?: string;
    images: string[];
    offer?: mongoose.Types.ObjectId;
    ratings: Array<{
        userId: mongoose.Types.ObjectId;
        value: number;
        review?: string;
        createdAt: Date;
    }>;
    isActive: boolean;
    tags?: string[];
}

export default mongoose.model<IProduct>('Product', productSchema);