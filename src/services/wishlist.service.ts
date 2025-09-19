import mongoose from "mongoose";
import { BadRequestError } from "../errors/bad-request.error";
import { InternalServerError } from "../errors/internal-server.error";
import { NotFoundError } from "../errors/not-found.error";
import { AddWishlistItemParams, CreateWishlistParams, UpdateWishlistParams, WishlistRepository } from "../repository/wishlist.repository";
import cartService from "./cart.service";

interface GetWishlistsParams {
    page: number;
    limit: number;
}

class WishlistService {
    constructor(private _wishlistRepository: WishlistRepository) {}
    
    async createWishlist(params: CreateWishlistParams) {
        const exisitingWishlist = await this._wishlistRepository.getWishlistByUserId(params.user);
        if(exisitingWishlist) throw new BadRequestError('User already has a wishlist');

        const wishlist = await this._wishlistRepository.createWishlist(params);
        if(!wishlist) throw new InternalServerError('Failed to create wishlist');

        return wishlist;
    }

    async getWishlistByUserId(userId: string) {
        if (!userId) throw new BadRequestError('User ID is required');

        let wishlist = await this._wishlistRepository.getWishlistByUserId(userId);
        
        if (!wishlist) {
            wishlist = await this._wishlistRepository.createWishlist({
                user: userId,
                name: "My Wishlist",
                isPublic: false
            });
        }

        return wishlist;
    }

    async addItemToWishlist(params: AddWishlistItemParams) {
        const { userId, productId, priceWhenAdded } = params;

        if (!userId || !productId) {
            throw new BadRequestError('User ID and Product ID are required');
        }

        const itemExists = await this._wishlistRepository.checkItemExists(userId, productId);
        if (itemExists) {
            throw new BadRequestError('Product already exists in wishlist');
        }

        const wishlistItem = {
            product: new mongoose.Types.ObjectId(productId),
            addedAt: new Date(),
            priceWhenAdded: priceWhenAdded
        };

        const updatedWishlist = await this._wishlistRepository.addItemToWishlist(userId, wishlistItem);
        if (!updatedWishlist) throw new InternalServerError('Failed to add item to wishlist');

        return updatedWishlist;
    }

    async removeItemFromWishlist(userId: string, productId: string) {
        if (!userId || !productId) {
            throw new BadRequestError('User ID and Product ID are required');
        }

        const itemExists = await this._wishlistRepository.checkItemExists(userId, productId);
        if (!itemExists) {
            throw new NotFoundError('Product not found in wishlist');
        }

        const updatedWishlist = await this._wishlistRepository.removeItemFromWishlist(userId, productId);
        if (!updatedWishlist) throw new InternalServerError('Failed to remove item from wishlist');

        return updatedWishlist;
    }

    async updateWishlist(userId: string, params: UpdateWishlistParams) {
        if (!userId) throw new BadRequestError('User ID is required');

        const existingWishlist = await this._wishlistRepository.getWishlistByUserId(userId);
        if (!existingWishlist) throw new NotFoundError('Wishlist not found');

        const updatedWishlist = await this._wishlistRepository.updateWishlist(userId, params);
        if (!updatedWishlist) throw new InternalServerError('Failed to update wishlist');

        return updatedWishlist;
    }

    async clearWishlist(userId: string ) {
        if(!userId) throw new BadRequestError('User Id is required');

        const existingWishlist = await this._wishlistRepository.getWishlistByUserId(userId);

        if(!existingWishlist) throw new NotFoundError('Wishlist not found');

        if(existingWishlist.items.length === 0) throw new BadRequestError('Wishlist is alreadt empty');

        const clearedWishlist = await this._wishlistRepository.clearWishlist(userId);

        if(!clearedWishlist) throw new InternalServerError('Failed to clear wishlist');

        return clearedWishlist;
    }

    async getPublicWishlists(params: GetWishlistsParams) {
        const { page, limit } = params;
        return this._wishlistRepository.getPublicWishlists(page, limit);
    }

    async getWishlistItemCount(userId: string) {
        if(!userId) throw new BadRequestError('User Id is required');

        return this._wishlistRepository.getWishlistItemCount(userId);
    }

    async checkItemInWishlist(userId: string, productId: string) {
        if (!userId || !productId) {
            throw new BadRequestError('User ID and Product ID are required');
        }

        const exists = await this._wishlistRepository.checkItemExists(userId, productId);
        return { exists };
    }

    async toggleWishlistItem(userId: string, productId: string, priceWhenAdded?: number) {
        if (!userId || !productId) {
            throw new BadRequestError('User ID and Product ID are required');
        }

        const itemExists = await this._wishlistRepository.checkItemExists(userId, productId);

        if (itemExists) {
            await this.removeItemFromWishlist(userId, productId);
            return { action: 'removed', message: 'Item removed from wishlist' };
        } else {
            await this.addItemToWishlist({ userId, productId, priceWhenAdded });
            return { action: 'added', message: 'Item added to wishlist' };
        }
    }

    async updateItemPrice(userId: string, productId: string, newPrice: number) {
        if (!userId || !productId || newPrice === undefined) {
            throw new BadRequestError('User ID, Product ID, and new price are required');
        }

        if (newPrice < 0) {
            throw new BadRequestError('Price cannot be negative');
        }

        const itemExists = await this._wishlistRepository.checkItemExists(userId, productId);
        if (!itemExists) {
            throw new NotFoundError('Product not found in wishlist');
        }

        const updatedWishlist = await this._wishlistRepository.updateItemPrice(userId, productId, newPrice);
        if (!updatedWishlist) throw new InternalServerError('Failed to update item price');

        return updatedWishlist;
    }

    // async moveItemToCart(userId: string, productId: string, quantity: number = 1, size?: string) {
    //     if (!userId || !productId) {
    //         throw new BadRequestError('User ID and Product ID are required');
    //     }

    //     if (!size) {
    //         throw new BadRequestError('Size is required for this product');
    //     }


    //     if (quantity <= 0) {
    //         throw new BadRequestError('Quantity must be greater than 0');
    //     }

    //     const itemExists = await this._wishlistRepository.checkItemExists(userId, productId);
    //     if (!itemExists) {
    //         throw new NotFoundError('Product not found in wishlist');
    //     }

    //     await cartService.addItemToCart(
    //         userId,
    //         {
    //             product: productId,
    //             quantity,
    //             size
    //         }
    //     );

    //     const updatedWishlist = await this._wishlistRepository.removeItemFromWishlist(userId, productId);
    //     if (!updatedWishlist) throw new InternalServerError('Failed to remove item from wishlist');

    //     return {
    //         message: 'Item moved to cart successfully',
    //         wishlist: updatedWishlist
    //     };
    // }

    // async moveAllItemsToCart(userId: string) {
    //     if (!userId) throw new BadRequestError('User ID is required');

    //     const wishlist = await this._wishlistRepository.getWishlistByUserId(userId);
    //     if (!wishlist || wishlist.items.length === 0) {
    //         throw new BadRequestError('Wishlist is empty');
    //     }

    //     for (const item of wishlist.items) {
    //         await cartService.addItemToCart(
    //             userId,
    //             {
    //                 product: item.product.toString(),
    //                 quantity: 1
    //             }
    //         );
    //     }

    //     const clearedWishlist = await this._wishlistRepository.clearWishlist(userId);
    //     if (!clearedWishlist) throw new InternalServerError('Failed to clear wishlist');

    //     return {
    //         message: `${wishlist.items.length} items moved to cart successfully`,
    //         wishlist: clearedWishlist
    //     };
    // }
}

export default new WishlistService(new WishlistRepository());