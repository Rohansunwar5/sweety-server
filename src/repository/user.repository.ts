import userModel, { IAuthProvider, IUser } from '../models/user.model';

export interface IOnBoardUserParams {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  password?: string;
  authProvider?: string;
  verified?: boolean;
  img?: string;
}

export class UserRepository {
  private _model = userModel;

  async getUserByEmailId(email: string): Promise<IUser | null> {
    return this._model.findOne({ email });
  }

  async onBoardUser(params: IOnBoardUserParams): Promise<IUser> {
  return this._model.create({
    firstName: params.firstName,
    lastName: params.lastName,
    email: params.email,
    phone: params.phone || '',
    password: params.password,
    authProvider: params.authProvider || IAuthProvider.EMAIL,
    verified: params.verified || false,
    img: params.img
  });
}
  async getUserById(id: string) {
    return this._model.findById(id).select('img _id  firstName lastName email phone createdAt updatedAt wishlist cart __v');
  }

  // async updateUser(params: {
  //   firstName?: string, lastName?: string, isdCode?: string, phoneNumber?: string, _id: string, bio?: string, location?: string, twoFactorSecret?: string, twoFactorEnabled?:boolean, company?: { name?: string, url?: string }, socials?: {
  //     twitter?: string,
  //     github?: string,
  //     facebook?: string,
  //     instagram?: string,
  //     linkedin?: string,
  //   }
  // }) {
  //   const { firstName, lastName, isdCode, phoneNumber, _id, twoFactorEnabled, twoFactorSecret, bio, location, company, socials } = params;

  //   return this._model.findByIdAndUpdate(_id, { firstName, lastName, isdCode, phoneNumber, bio, location, company, socials, twoFactorEnabled, twoFactorSecret }, { new: true });
  // }
  
  async verifyUserId(userId: string) {
    return this._model.findByIdAndUpdate(userId, {
      verified: true
    }, { new: true });
  }

}