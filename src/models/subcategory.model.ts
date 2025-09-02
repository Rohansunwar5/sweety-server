import mongoose from 'mongoose';

const subcategorySchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
            maxLength: 50,
        },
        category: {
            type: mongoose.Types.ObjectId,
            required: true,

        },
        description: {
            type: String,
            trim: true,
            maxLength: 500,
        },
        image: {
            type: String,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
    }, { timestamps: true }
)

subcategorySchema.index({ category: 1, isActive: 1 });
subcategorySchema.index({ name: 'text', description: 'text' });

export interface ISubcategory extends mongoose.Document {
    _id: string;
    name: string;
    category: mongoose.Types.ObjectId;
    description?: string;
    image?: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export default mongoose.model<ISubcategory>('Subcategory', subcategorySchema);