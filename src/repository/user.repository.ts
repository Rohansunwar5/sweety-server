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
    return this._model.findById(id).select(' _id  firstName lastName email phone addresses createdAt updatedAt __v');
  }

async updateUser(params: {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  _id: string;
  addresses?: Array<{
    name?: string;
    addressLine1?: string;
    addressLine2?: string;
    city?: string;
    state?: string;
    pinCode?: string;
    country?: string;
    isDefault?: boolean;
  }>;
}) {
  const {
    firstName,
    lastName,
    email,
    phone,
    _id,
    addresses,
  } = params;

  return this._model.findByIdAndUpdate(
    _id,
    {
      firstName,
      lastName,
      email,
      phone,
      addresses,
    },
    { new: true }
  );
}
  
  async verifyUserId(userId: string) {
    return this._model.findByIdAndUpdate(userId, {
      verified: true
    }, { new: true });
  }

}