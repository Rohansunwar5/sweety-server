import config from '../../../config';
import JWT from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { encodedJWTCacheManager } from '../../../services/cache/entities';
import { decode, encode, encryptionKey } from '../../../services/crypto.service';
import { UnauthorizedError } from '../../../errors/unauthorized.error';
import { BadRequestError } from '../../../errors/bad-request.error';

interface IJWTAdminVerifyPayload {
    _id: string;
}

const getAdminAuthMiddlewareByJWTSecret = (jwtSecret: string) => async(req: Request, res: Response, next: NextFunction) => {
    try {
        const authHeader = req.headers.authorization;
        if(!authHeader) throw new BadRequestError('Authorization header is missing');

        const token = authHeader.split(' ')[1];
        if(!token) throw new BadRequestError('Token is missing or invalid');

        const { _id } = JWT.verify(token, jwtSecret) as IJWTAdminVerifyPayload;

        const key = await encryptionKey(config.ADMIN_JWT_CACHE_ENCRYPTION_KEY);
        const cachedJWT = await encodedJWTCacheManager.get({ userId: _id });
        if(!cachedJWT) {
            const encryptedData = await encode(token, key);
            await encodedJWTCacheManager.set({ userId: _id }, encryptedData);
        } else if (cachedJWT) {
            const decodedJWT = await decode(cachedJWT, key);
            if(decodedJWT !== token) throw new UnauthorizedError('Session expired');
        }

        req.admin = {
            _id
        };

        next();
    } catch (error) {
        next(error);
    }
}

export default getAdminAuthMiddlewareByJWTSecret;