import { Request, Response, NextFunction } from "express";
import { UnauthorizedError } from "../../../errors/unauthorized.error";

const requireAdminAuth = (req: Request, res: Response, next: NextFunction) => {
    if(!req.admin) {
        throw new UnauthorizedError('Admin access is required');
    }
    next();
}

export default requireAdminAuth;