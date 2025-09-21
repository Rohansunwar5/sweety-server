import wishlistModel, { IWishlist, IWishlistItem } from "../models/wishlist.model";

export interface CreateWishlistParams {
    user: string;
    name?: string;
    isPublic?: boolean;
}

export interface AddWishlistItemParams {
    userId: string;
    productId: string;
    priceWhenAdded?: number;
}

export interface updateWishlistParams {
    name?: string;
    isPublic?: boolean;
}

export class WishlistRepository {
    private _model = wishlistModel;

    async createWishlist(params: CreateWishlistParams) {
        return this._model.create({
            user: params.user,
            name: params.name || 'My wishlist',
            isPublic: params.isPublic || false,
            items: []
        });
    }

    async getWishlistByUserId(userId: string) {
        return this._model.findOne({ user: userId });
    }

    async getWishlistById(wishlistId: string) {
        return this._model.findById(wishlistId);
    }

    async addItemToWishlist(params: AddWishlistItemParams) {
        const existingWishlist = await this._model.findOne({
            user: params.userId,
            "items.product": params.productId
        });

        if (existingWishlist) {
            return existingWishlist;
        }

        const newItem = {
            product: params.productId,
            priceWhenAdded: params.priceWhenAdded,
            addedAt: new Date()
        };

        return this._model.findOneAndUpdate(
            { user: params.userId },
            { $push: { items: newItem }},
            { new: true, upsert: true }
        );
    }

    async removeItemFromWishlist(userId: string, productId: string) {
        return this._model.findOneAndUpdate(
            { user: userId },
            { $pull: { items: { product: productId } } },
            { new: true }
        )
    }

    async updateWishlist(userId: string, params: updateWishlistParams) {
        return this._model.findOneAndUpdate(
            { user: userId },
            params,
            { new: true, runValidators: true }
        )
    }

    async clearWishlist(userId: string) {
        return this._model.findOneAndUpdate(
            { user: userId },
            { $set: { items: [] } },
            { new: true }
        );
    }

    async checkItemExists(userId: string, productId: string) {
        const wishlist = await this._model.findOne({
            user: userId,
            "items.product": productId
        })

        return !!wishlist;
    }

    async getPublicWishlists(page: number = 1, limit: number = 10) {
        const skip = (page -1) * limit;

        const wishlists = await this._model.find({ isPublic: true })
            .skip(skip)
            .limit(limit)
            .sort({ updatedAt: -1 });
        const total = await this._model.countDocuments({ isPublic: true });
        
        return {
            wishlists,
            total,
            page,
            pages: Math.ceil(total / limit)
        }       
    }

    async getWishlistItemCount(userId: string): Promise<number> {
        const wishlist = await this._model.findOne({ user: userId }).select('items');
        return wishlist ? wishlist.items.length : 0;
    }

    async updateItemPrice(userId: string, productId: string, newPrice: number): Promise<IWishlist | null> {
        return this._model.findOneAndUpdate(
            { 
                user: userId,
                "items.product": productId 
            },
            { 
                $set: { 
                    "items.$.priceWhenAdded": newPrice 
                } 
            },
            { new: true }
        );
    }

    async getWishlistWithProducts(userId: string) {
        return this._model.findOne({ user: userId });
    }

    async getWishlistItem(userId: string, productId: string): Promise<IWishlistItem | null> {
        const wishlist = await this._model.findOne({
            user: userId,
            "items.product": productId
        });
        
        if (wishlist) {
            const item = wishlist.items.find(item => item.product.toString() === productId);
            return item || null;
        }
        
        return null;
    }
}