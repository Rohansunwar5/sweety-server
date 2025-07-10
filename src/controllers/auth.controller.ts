import { NextFunction, Request, Response } from 'express';
import authService from '../services/auth.service';

export const genericLogin = async (req: Request, res: Response, next: NextFunction) => {
  const { email, password } = req.body;
  const response = await authService.login({ email, password });

  next(response);
};

export const signup = async (req: Request, res: Response, next: NextFunction) => {
  const { firstName, lastName, email, password, phone } = req.body;
  const response = await authService.signup({ firstName, lastName, email, password, phone });

  next(response);
};

export const profile = async (req: Request, res: Response, next: NextFunction) => {
  const { _id } = req.user;
  const response = await authService.profile(_id);

  next(response);
};

export const updateProfile = async (req: Request, res: Response, next: NextFunction) => {
  console.log('[AuthController] updateProfile - Request received:', {
    user: req.user, // Log the user from middleware
    body: req.body,
    headers: req.headers,
  });

  try {
    const { _id } = req.user;
    const { firstName, lastName, email, phone,  addresses } = req.body;

    console.log('[AuthController] updateProfile - Calling authService.updateProfile');
    const response = await authService.updateProfile({ 
      firstName, lastName, email, phone, _id, addresses 
    });

    console.log('[AuthController] updateProfile - Service response:', response);
    next(response);
  } catch (error) {
    console.error('[AuthController] updateProfile - Error:', error);
    next(error);
  }
};

export const googleSignIn = async (req: Request, res: Response, next: NextFunction) => {
  const { code } = req.body;
  const response = await authService.googleLogin(code);

  next(response);
}

export const sendInfluencerEmail = async (req: Request, res: Response, next: NextFunction) => {
  const { influencerName, email, youtubePageName, instagramPageName, subscribers, followers } = req.body;

  const response = await authService.sendInfluencerEmail({ influencerName, email, youtubePageName, instagramPageName, subscribers, followers });

  next(response);
};

export const getUserById = async (req:Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const response = await authService.getUserById(id);

  next(response);
}