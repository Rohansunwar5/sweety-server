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

export const googleSignIn = async (req: Request, res: Response, next: NextFunction) => {
  const { code } = req.body;
  const response = await authService.googleLogin(code);

  next(response);
}
