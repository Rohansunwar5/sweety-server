import adminModel, { IAdmin } from "../models/admin.model";
import { sha1 } from "../utils/hash.util";

export interface IOnBoardAdminParams {
    firstName: string;
    lastName: string;
    email: string;
    password?: string;
    verificationCode: string;
    phoneNumber: string;
}

export class AdminRepository {
    private _model = adminModel;

    async getUserByEmailId(email: string) {
        return this._model.findOne({ email });
    };

    async onBoardAdmin(params: IOnBoardAdminParams) {
        const { firstName, lastName, phoneNumber, email, password, verificationCode } = params;

        return this._model.create({ firstName, lastName, phoneNumber, email, password, verificationCode });
    };

    async getAllAdmins(query: Partial<IAdmin>):Promise<IAdmin[]> {
        return this._model.find(query).select(' _id firstName lastName email phoneNumber  createdAt updatedAt');
    };

    async updateVerificationCode(id: string, verificationCode: string) {
        return this._model.findByIdAndUpdate(
            id, 
            { verificationCode },
            { new: true },
        );
    }  
    
    async updateAdmin(params: { _id: string, firstName?: string, lastName?: string, email?: string, phoneNumber?: string }): Promise <IAdmin | null> {
        const { _id, firstName, lastName, email, phoneNumber } = params;

        return this._model.findByIdAndUpdate(
            _id,
            { firstName, lastName, email, phoneNumber },
            { new: true }
        );
    }

    async getUserId(id: string) {
        return this._model.findById(id).select('_id firstName lastName password email phoneNumber createdAt updatedAt __v');
    };

    async updatedVerificationCode(id: string, verificationCode: string) {
        return this._model.findByIdAndUpdate(
            id,
            { verificationCode },
            { new: true }
        );
    };

    async getUserWithVerificationCode(code: string) {
        return this._model.findOne({ verificationCode: sha1(code) });
    };

    async resetPassword(code: string, hashedPassword: string) {
        return this._model.findOneAndUpdate(
            { verificationCode: sha1(code) },
            { password: hashedPassword },
            { new: true },
        );
    };

    async deleteAccount(driverId: string) {
        return this._model.findByIdAndDelete(driverId);
    };

    async updatePassword(adminId: string, hashedPassword: string) {
        return this._model.findByIdAndUpdate(
            adminId,
            { password: hashedPassword },
            { new: true }
        );
    };
}
