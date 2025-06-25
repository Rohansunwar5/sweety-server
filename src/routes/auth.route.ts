import { Router } from 'express';
import { asyncHandler } from '../utils/asynchandler';
import { genericLogin, googleSignIn, profile, signup } from '../controllers/auth.controller';
import { loginValidator,signupValidator} from '../middlewares/validators/auth.validator';
import isLoggedIn from '../middlewares/isLoggedIn.middleware';
import { updateProduct } from '../controllers/product.controllers';

const authRouter = Router();

authRouter.post('/login', loginValidator, asyncHandler(genericLogin));
authRouter.post('/signup', signupValidator, asyncHandler(signup));
authRouter.get('/profile', isLoggedIn, asyncHandler(profile));
authRouter.patch('/profile', isLoggedIn, asyncHandler(updateProduct));
authRouter.post('/google', asyncHandler(googleSignIn));

export default authRouter;