import mongoose from 'mongoose'

export interface IBlogImgUrl {
    url: string;
    publicId: string;
}

export interface IBlogContent {
    design: Object;
    markup: string;
}

const blogSchema = new mongoose.Schema(
    {
        blogName: {
            type: String,
            required: true,
        },
        title: {
            type: String,
            required: true,
        },
        blogImgUrl: {
            url: {
                type: String,
                required: true,
            },
            publicId: {
                type: String,
                required: true,
            },
        },
        blogContent: {
            design: {
                type: Object,
                required: true,
            },
            markup: {
                type: String,
                required: true,
            },
        },
    }, { timestamps: true }
);

export interface IBlog extends mongoose.Schema {
    _id: string;
    blogName: string;
    title: string;
    blogImgUrl: IBlogImgUrl;
    blogContent: IBlogContent;
    createdAt?: Date;
    updatedAt?: Date;
}

export default mongoose.model<IBlog>('Blog', blogSchema);