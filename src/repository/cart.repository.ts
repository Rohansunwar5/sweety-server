import mongoose from "mongoose";
import cartModel from "../models/cart.model";
import { DiscountCalculationResult } from "./discount.repository";

export interface CartItemInput {
  product: string;
  quantity: number;
  size?: string;
}

export interface UpdateCartItemInput {
  quantity?: number;
  size?: string;
}

export interface ApplyDiscountInput {
  code: string;
  type: 'coupon' | 'voucher'; 
}

export class CartRepository {
    private _model = cartModel

    async getCartByUserId(userId: string) {
        return this._model.findOne({ user: userId });
        // Removed .populate() calls
    }

    async createCart(userId: string) {
        return this._model.create({ user: userId, items: [] }); // Fixed typo: item -> items
    }

    async addItemToCart(userId: string, item: CartItemInput) {
        return this._model.findOneAndUpdate(
            { user: userId },
            { $push: { items: item } },
            { new: true, upsert: true }
        );
        // Removed .populate()
    }

    async updateCartItem(userId: string, itemId: string, updateData: UpdateCartItemInput) {
    const update: any = { 
        'items.$.updatedAt': new Date() 
    };
    
    if (updateData.quantity !== undefined) {
        update['items.$.quantity'] = updateData.quantity;
    }
    if (updateData.size !== undefined) {
        update['items.$.size'] = updateData.size;
    }

    return this._model.findOneAndUpdate(
        { user: userId, 'items._id': itemId },
        { $set: update },
        { new: true }
    );
}

    async removeItemFromCart(userId: string, itemId: string) {
        return this._model.findOneAndUpdate(
            { user: userId },
            { $pull: { items: { _id: new mongoose.Types.ObjectId(itemId)  } } },
            { new: true }
        );
        // Removed .populate()
    }

    async getCartBySessionId(sessionId: string) {
        return this._model.findOne({ sessionId, isActive: true });
    }

    async createGuestCart(sessionId: string) {
        return this._model.create({ 
            sessionId, 
            items: [], 
            isActive: true,
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
        });
    }

    async getOrCreateGuestCart(sessionId: string) {
        let cart = await this.getCartBySessionId(sessionId);
        if (!cart) {
            cart = await this.createGuestCart(sessionId);
        }
        return cart;
    }

    async applyDiscount(userId: string, type: 'coupon' | 'voucher', result: DiscountCalculationResult) {
        const updateField = type === 'coupon' ? 'appliedCoupon' : 'appliedVoucher';
        
        return this._model.findOneAndUpdate(
            { user: userId },
            { 
                $set: { 
                    [updateField]: {
                        code: result.appliedDiscount.code,
                        discountId: result.appliedDiscount.discountId,
                        discountAmount: result.discountAmount
                    }
                } 
            },
            { new: true }
        );
        // Removed .populate()
    }

    async clearCartItems(userId: string) {
        return this._model.findOneAndUpdate(
            { user: userId },
            { $set: { items: [] } },
            { new: true }
        );
    }

    async deleteCart(userId: string) {
        return this._model.findOneAndDelete({ user: userId });
    }

    // Add this method to your CartRepository class if it doesn't exist

    async clearDiscount(userId: string, type: 'coupon' | 'voucher') {
        const updateField = type === 'coupon' ? 'appliedCoupon' : 'appliedVoucher';
        
        return this._model.findOneAndUpdate(
            { user: userId },
            { $unset: { [updateField]: 1 } },
            { new: true }
        );
    }

    async replaceCartItems(userId: string, items: CartItemInput[]) {
        return cartModel.findOneAndUpdate(
            { user: userId },
            { $set: { items } },
            { new: true, upsert: true }
        );
    }

    async addItemToCartBySessionId(sessionId: string, item: CartItemInput) {
        return this._model.findOneAndUpdate(
            { sessionId, isActive: true },
            { $push: { items: item } },
            { new: true, upsert: true }
        );
    }

    async updateCartItemBySessionId(sessionId: string, itemId: string, updateData: UpdateCartItemInput) {
        const update: any = { 
            'items.$.updatedAt': new Date() 
        };
        
        if (updateData.quantity !== undefined) {
            update['items.$.quantity'] = updateData.quantity;
        }
        if (updateData.size !== undefined) {
            update['items.$.size'] = updateData.size;
        }

        return this._model.findOneAndUpdate(
            { sessionId, 'items._id': itemId, isActive: true },
            { $set: update },
            { new: true }
        );
    }

    async removeItemFromCartBySessionId(sessionId: string, itemId: string) {
        return this._model.findOneAndUpdate(
            { sessionId, isActive: true },
            { $pull: { items: { _id: new mongoose.Types.ObjectId(itemId) } } },
            { new: true }
        );
    }

    async transferGuestCartToUser(sessionId: string, userId: string) {
        return this._model.findOneAndUpdate(
            { sessionId, isActive: true },
            { 
                $set: { user: new mongoose.Types.ObjectId(userId) },
                $unset: { sessionId: 1 }
            },
            { new: true }
        );
    }

    
}