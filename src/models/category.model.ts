// category.model.ts
import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      maxLength: 50,
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
  },
  { timestamps: true }
);

categorySchema.index({ name: 'text', description: 'text' });

export interface ICategory extends mongoose.Schema {
  _id: string;
  name: string;
  description?: string;
  image?: string;
  isActive: boolean;
}

export default mongoose.model<ICategory>('Category', categorySchema);