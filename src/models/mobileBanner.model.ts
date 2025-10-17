import mongoose from "mongoose";

const mobileBannerSchema = new mongoose.Schema (
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

export interface IMobileBanner extends mongoose.Schema {
    name: string;
    link: string;
    imageUrl: string;
    createdAt?: Date;
    updatedAt?: Date;
}

export default mongoose.model<IMobileBanner>('MobileBanner', mobileBannerSchema);