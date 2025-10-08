import mongoose from "mongoose";

const bannerSchema = new mongoose.Schema (
    {
        name: {
            type: String,
            required: true,
        },
        link: {
            type: String,
            required: true,
        },
        imageUrl: {
            type: String,
            required: true, 
        }
    }, { timestamps: true }
)

export interface IBanner extends mongoose.Schema {
    name: string;
    link: string;
    imageUrl: string;
    createdAt?: Date;
    updatedAt?: Date;
}

export default mongoose.model<IBanner>('Banner', bannerSchema);