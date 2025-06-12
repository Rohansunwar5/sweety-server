import config from "../config";
import requireAdminAuth from "./auth/admin/require-admin-auth.middleware";
import getAdminAuthMiddlewareByJWTSecret from "./auth/admin/verify-admin-token.middleware";

const isAdminLoggedIn = [
    getAdminAuthMiddlewareByJWTSecret(config.ADMIN_JWT_SECRET),
    requireAdminAuth,
]

export default isAdminLoggedIn;