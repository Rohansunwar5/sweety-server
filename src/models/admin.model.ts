import mongoose from "mongoose";

const PASSWORD_MIN_LENGTH = 8;

const adminSchema = new mongoose.Schema(
    {
        firstName: {
            type: String,
            required: true,
            trim: true,
            maxLength: 40,
        },
        lastName: {
            type: String,
            trim: true,
            maxLength: 40,
        },
        email: {
            type: String,
            required: true,
            minLength: 2, 
        },
        password: {
            type: String,
            required: true,
            minLength: PASSWORD_MIN_LENGTH
        },
        verificationCode: {
            type: String,
            required: true,
            minLength: 2,
        },
        phoneNumber: {
            type: String,
            minLength: 5,
            maxLength: 10,
        },
    },
    { timestamps: true }
);

adminSchema.index({ email: 1 });

export interface IAdmin extends mongoose.Schema {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    phoneNumber: string;
    password: string;
    verificationCode: string;
}

export default mongoose.model<IAdmin>('Admin', adminSchema);