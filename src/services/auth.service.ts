import config from '../config';
import { BadRequestError } from '../errors/bad-request.error';
import { InternalServerError } from '../errors/internal-server.error';
import { NotFoundError } from '../errors/not-found.error';
import { UnauthorizedError } from '../errors/unauthorized.error';
import { UserRepository } from '../repository/user.repository';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { encode, encryptionKey } from './crypto.service';
import { encodedJWTCacheManager, profileCacheManager } from './cache/entities';
import { OAuth2Client } from 'google-auth-library';
import { IAuthProvider } from '../models/user.model';
import mailService from './mail.service';
import whatsappService from './whatsapp.service';

const googleAuthClient = new OAuth2Client(
  config.GOOGLE_CLIENT_ID,
  config.GOOGLE_CLIENT_SECRET,
);

class AuthService {
  constructor(private readonly _userRepository: UserRepository) {
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async login(params: { email: string, password: string }) {
    const { email, password } = params;
    const user = await this._userRepository.getUserByEmailId(email);
    if (!user) throw new NotFoundError('User not found');
    if (!user.password) throw new BadRequestError('Reset password');

    // password validation;
    const success = await this.verifyHashPassword(password, user.password);
    if (!success) throw new UnauthorizedError('Invalid Email or Password');


    const accessToken = await this.generateJWTToken(user._id);
    if (!accessToken) throw new InternalServerError('Failed to generate accessToken');

    return { accessToken };
  }

  async verifyHashPassword(plainTextPassword: string, hashedPassword: string) {
    return await bcrypt.compare(plainTextPassword, hashedPassword);
  }

  async hashPassword(plainTextPassword: string) {
    return await bcrypt.hash(plainTextPassword, 10);
  }

  async generateJWTToken(userId: string) {
    const user = await this._userRepository.getUserById(userId);
    if (!user) throw new NotFoundError('User not found');

    const token = jwt.sign({
      _id: userId.toString(),
      email: user.email,
      twoFactorVerified: false
    }, config.JWT_SECRET, { expiresIn: '24h' });

    const key = await encryptionKey(config.JWT_CACHE_ENCRYPTION_KEY);
    const encryptedData = await encode(token, key);
    await encodedJWTCacheManager.set({ userId }, encryptedData);

    return token;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any
  async signup(params: any) {
    const { firstName, lastName, email, password, phone } = params;
    const existingUser = await this._userRepository.getUserByEmailId(email);

    if (existingUser) throw new BadRequestError('Email address already exists');

    const hashedPassword = await this.hashPassword(password);
    const user = await this._userRepository.onBoardUser({
      firstName, lastName, email, password: hashedPassword, phone
    });
    
    if (!user) throw new InternalServerError('Failed to Onboard user');

    const accessToken = await this.generateJWTToken(user._id);
    if (!accessToken) throw new InternalServerError('Failed to generate accessToken');

    // await mailService.sendEmail(
    //   email,
    //   'welcome-email.ejs',
    //   {
    //     firstName: firstName,
    //     lastName: lastName,
    //     email: email,
    //     phone: phone
    //   },
    //   "Welcome to Caroal"
    // )

    // await whatsappService.sendWhatsAppTemplate(
    //   phone, 
    //   'welcome-message.ejs',
    //   {
    //     firstName: firstName,
    //     lastName: lastName,
    //     email: email,
    //     phone: phone
    //   }
    // );

    return { accessToken };
  }

  async profile(userId: string) {
    const user = await this._userRepository.getUserById(userId);
    if (!user) throw new NotFoundError('User not found');

    // set cache;
    // await profileCacheManager.set({ userId }, user);
    return user;
  }

  async updateProfile(params: {
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
  const { firstName, lastName, email, phone, _id, addresses,
  } = params;

    const user = await this._userRepository.updateUser({
      firstName,
      lastName,
      email,
      phone,
      _id,
      addresses,
    });

    if (!user) throw new NotFoundError('User not found');

    return user;
  }


  private async verifyGoogleToken(idToken: string) {
    try {
      const ticket = await googleAuthClient.verifyIdToken({
        idToken, 
        audience: config.GOOGLE_CLIENT_ID,
      });

      const payload = ticket.getPayload();
      if(!payload) throw new UnauthorizedError('Invalid Google token');

      if(!payload.email) throw new UnauthorizedError('Google email not provided');
      

      return {
        email: payload.email,
        firstName: payload.given_name || 'User',
        lastName: payload.family_name || '',
        picture: payload.picture || '',
        emailVerified: payload.email_verified === true 
      };

    } catch (error) {
      console.error('Google token verification failed: ', error);
      throw new UnauthorizedError('Goggle authentication failed');
    }
  }

  private async handleGoogleUser(googleData: {
    email: string,
    firstName: string,
    lastName: string,
    picture: string,
  }) {
    let user = await this._userRepository.getUserByEmailId(googleData.email);

    if(!user) {
      user = await this._userRepository.onBoardUser({
        firstName: googleData.firstName,
        lastName: googleData.lastName,
        email: googleData.email,
        phone: '',
        authProvider: IAuthProvider.GOGGLE,
        verified: true,
        password: await this.generateRandomPassword()
      });

      if (!user) throw new InternalServerError('Failed to create user');
      
      return user._id;
    
    } else if (user.authProvider !== IAuthProvider.GOGGLE) {
      throw new BadRequestError('Email already registered with password');
    }

    return user._id;
  }

  async getUserById(id: string) {
    const user = await this._userRepository.getUserById(id);

    return user
  }

  async googleLogin(code: string) {
    const { tokens } = await googleAuthClient.getToken({
      code,
      redirect_uri: 'https://sweetyintimate.netlify.app/auth/google/callback'
    });
    if(!tokens.id_token) throw new BadRequestError('Invalid authorization code');

    const googleProfile = await this.verifyGoogleToken(tokens.id_token);
    if(!googleProfile.emailVerified) throw new UnauthorizedError('Google email not verified');

    const userId = await this.handleGoogleUser({
     email: googleProfile.email,
      firstName: googleProfile.firstName,
      lastName: googleProfile.lastName,
      picture: googleProfile.picture 
    });

    const accessToken = await this.generateJWTToken(userId);
    return { accessToken };
  }


  private async generateRandomPassword() {
    return bcrypt.hash(Math.random().toString(36).slice(2), 10);
  }

  async sendInfluencerEmail(params: {
  influencerName: string;
  email: string;
  youtubePageName: string;
  instagramPageName: string;
  subscribers: number;
  followers: number;
}) {
  try {
    await mailService.sendEmail(
      'caroal.official06@gmail.com',
      'influencer-email.ejs',
      {
        influencerName: params.influencerName,
        email: params.email,
        youtubePageName: params.youtubePageName,
        instagramPageName: params.instagramPageName,
        subscribers: params.subscribers,
        followers: params.followers,
        date: new Date().toLocaleDateString()
      },
      "New Influencer Collaboration Request"
    );

    return { success: true, message: 'Email sent successfully' };
  } catch (error) {
    console.error('Failed to send influencer email:', error);
    throw new InternalServerError('Failed to send email');
  }
}
  
}

export default new AuthService(new UserRepository());