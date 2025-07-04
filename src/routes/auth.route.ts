import { Router } from 'express';
import { asyncHandler } from '../utils/asynchandler';
import { genericLogin, googleSignIn, profile, sendInfluencerEmail, signup, updateProfile } from '../controllers/auth.controller';
import { loginValidator,signupValidator} from '../middlewares/validators/auth.validator';
import isLoggedIn from '../middlewares/isLoggedIn.middleware';

const authRouter = Router();

authRouter.post('/login', loginValidator, asyncHandler(genericLogin));
authRouter.post('/signup', signupValidator, asyncHandler(signup));
authRouter.get('/profile', isLoggedIn, asyncHandler(profile));
authRouter.patch('/profile', isLoggedIn, asyncHandler(updateProfile));
authRouter.post('/google', asyncHandler(googleSignIn));
authRouter.post('/send-influencer-email', asyncHandler(sendInfluencerEmail));

export default authRouter;