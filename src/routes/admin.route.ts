import { Router } from "express";
import { asyncHandler } from "../utils/asynchandler";
import { adminLogin, adminProfile, adminSignup, generateResetPasswordLink, resetPassword, verifyResetPasswordCode } from "../controllers/admin.controller";
import isAdminLoggedIn from "../middlewares/isAdminLoggedIn.middleware";
import { loginValidator, signupValidator } from "../middlewares/validators/auth.validator";

const adminRouter = Router();

adminRouter.post('/login', loginValidator, asyncHandler(adminLogin));
adminRouter.post('/signup', signupValidator, asyncHandler(adminSignup));
adminRouter.get('/profile', isAdminLoggedIn, asyncHandler(adminProfile));
adminRouter.post('/reset-password', asyncHandler(generateResetPasswordLink));
adminRouter.get('/reset-password/:code', asyncHandler(verifyResetPasswordCode));
adminRouter.patch('/reset-password/:code', asyncHandler(resetPassword));

export default adminRouter;