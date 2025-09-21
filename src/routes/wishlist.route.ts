import { Router } from "express";
import { asyncHandler } from "../utils/asynchandler";
import isLoggedIn from "../middlewares/isLoggedIn.middleware";
import { 
    addItemToWishlist, 
    checkItemInWishlist, 
    clearWishlist, 
    createWishlist, 
    getWishlist, 
    getWishlistItemCount, 
    removeItemFromWishlist, 
    toggleWishlistItem, 
    updateItemPrice, 
    updateWishlist,
    moveItemToCart,
    getPublicWishlists
} from "../controllers/wishlist.controller";

const wishlistRouter = Router();

wishlistRouter.post('/create', isLoggedIn, asyncHandler(createWishlist));
wishlistRouter.get('/', isLoggedIn, asyncHandler(getWishlist));
wishlistRouter.get('/count', isLoggedIn, asyncHandler(getWishlistItemCount));
wishlistRouter.get('/public', asyncHandler(getPublicWishlists));
wishlistRouter.post('/add', isLoggedIn, asyncHandler(addItemToWishlist));
wishlistRouter.delete('/remove/:productId', isLoggedIn, asyncHandler(removeItemFromWishlist));
wishlistRouter.put('/update', isLoggedIn, asyncHandler(updateWishlist));
wishlistRouter.delete('/clear', isLoggedIn, asyncHandler(clearWishlist));
wishlistRouter.get('/check/:productId', isLoggedIn, asyncHandler(checkItemInWishlist));
wishlistRouter.post('/toggle', isLoggedIn, asyncHandler(toggleWishlistItem));
wishlistRouter.put('/update-price/:productId', isLoggedIn, asyncHandler(updateItemPrice));
wishlistRouter.post('/move-to-cart/:productId', isLoggedIn, asyncHandler(moveItemToCart));

export default wishlistRouter;