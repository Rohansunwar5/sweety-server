import { BadRequestError } from "../errors/bad-request.error";
import { NotFoundError } from "../errors/not-found.error";
import { ICart } from "../models/cart.model";
import { ApplyDiscountInput, CartItemInput, CartRepository, UpdateCartItemInput } from "../repository/cart.repository";
import discountService from "./discount.service";
import productService from "./product.service";

class CartService {
    constructor(private readonly _cartRepository: CartRepository) {}

    async getCartWithDetails(userId: string) {
        const cart = await this.getCart(userId);
        if (!cart.items.length) {
            return { cart, items: [], totals: { subtotal: 0, discountAmount: 0, total: 0, itemCount: 0 }}
        }

        const productIds = cart.items.map(item => item.product.toString());
        const products = await Promise.all(productIds.map(productId => productService.getProductById(productId)));
        const productMap = products.reduce((acc, product) => {
            if (product) { acc[product._id.toString()] = product }
            return acc;
        }, {} as Record<string, any>);

        const itemsWithDetails = cart.items.map(item => {
            const productId = item.product.toString();
            const product = productMap[productId];
            if (!product) throw new NotFoundError(`Product not found for ID: ${productId}`)
            const itemTotal = product.price * item.quantity;
            return {
                _id: item._id,
                product: {
                    _id: product._id,
                    name: product.name,
                    price: product.price,
                    images: product.images,
                },
                quantity: item.quantity,
                size: item.size,
                addedAt: item.addedAt,
                itemTotal: itemTotal
            };
        });

        const totals = await this.calculateCartTotal(cart);

        return {
            cart: { _id: cart._id, user: cart.user, appliedCoupon: cart.appliedCoupon, appliedVoucher: cart.appliedVoucher },
            items: itemsWithDetails,
            totals: { subtotal: totals.subtotal, discountAmount: totals.discountAmount, total: totals.total, itemCount: totals.items }
        };
    }

    async getCart(userId: string) {
        let cart = await this._cartRepository.getCartByUserId(userId);
        if (!cart) cart = await this._cartRepository.createCart(userId)

        return cart;
    }

    async addItemToCart(userId: string, item: CartItemInput) {
        if (!item.product)  throw new BadRequestError('Product ID is required')
        const product = await productService.getProductById(item.product);
        
        if (!product) throw new NotFoundError('Product not found');
        const sizeStock = product.sizeStock.find(s => s.size === item.size);
        
        if (!sizeStock || sizeStock.stock < item.quantity) throw new BadRequestError('Insufficient stock for selected size');
        const cart = await this.getCart(userId);
        const existingItem = cart.items.find(i => 
            i.product.toString() === item.product && 
            i.size === item.size
        );

        let updatedCart;
        if (existingItem) {
            updatedCart = await this.updateCartItem(userId, existingItem._id.toString(), { quantity: existingItem.quantity + item.quantity });
        } else {
            updatedCart = await this._cartRepository.addItemToCart(userId, { ...item, priceAtAddition: product.price });
        }
        
        if (!updatedCart) throw new NotFoundError('Failed to update cart');
        
        // Only reapply discount if one was already applied
        if (updatedCart.appliedCoupon) {
            return this.safeReapplyDiscount(userId, {
                code: updatedCart.appliedCoupon.code,
                type: 'coupon'
            });
        } else if (updatedCart.appliedVoucher) {
            return this.safeReapplyDiscount(userId, {
                code: updatedCart.appliedVoucher.code,
                type: 'voucher'
            });
        }

        return updatedCart;
    }


    async updateCartItem(userId: string, itemId: string, updateData: UpdateCartItemInput) {
        const cart = await this.getCart(userId);
        const item = cart.items.find(i => i._id.toString() === itemId);
        if (!item) throw new NotFoundError('Item not found in cart');
        if (!item.product) throw new BadRequestError('Cart item is missing product reference');

        if (updateData.quantity) {
            const product = await productService.getProductById(item.product.toString());
            if (!product) throw new NotFoundError('Product not found');

            const sizeStock = product.sizeStock.find(s => s.size === item.size);
            if (!sizeStock || sizeStock.stock < updateData.quantity) throw new BadRequestError('Insufficient stock for selected size')
        }

        const updatedCart = await this._cartRepository.updateCartItem(userId, itemId, { ...updateData });

        if (!updatedCart) throw new NotFoundError('Failed to update cart item');
        
        // Only reapply discount if one was already applied
        if (updatedCart.appliedCoupon) {
            return this.safeReapplyDiscount(userId, {
                code: updatedCart.appliedCoupon.code,
                type: 'coupon'
            });
        } else if (updatedCart.appliedVoucher) {
            return this.safeReapplyDiscount(userId, {
                code: updatedCart.appliedVoucher.code,
                type: 'voucher'
            });
        }

        return updatedCart;
    }


    async removeItemFromCart(userId: string, itemId: string) {
        const cart = await this.getCart(userId);
        const updatedCart = await this._cartRepository.removeItemFromCart(userId, itemId);
        if (!updatedCart) throw new NotFoundError('Failed to remove item from cart');

        // Only reapply discount if one was already applied
        if (updatedCart.appliedCoupon) {
            return this.safeReapplyDiscount(userId, {
                code: updatedCart.appliedCoupon.code,
                type: 'coupon'
            });
        } else if (updatedCart.appliedVoucher) {
            return this.safeReapplyDiscount(userId, {
                code: updatedCart.appliedVoucher.code,
                type: 'voucher'
            });
        }

        return updatedCart;

    }

    private async safeReapplyDiscount(userId: string, { code, type }: ApplyDiscountInput) {
        try {
            return await this.applyDiscount(userId, { code, type });
        } catch (error:any) {
            console.warn(`Failed to reapply ${type} discount "${code}":`, error.message);
            
            // Clear the invalid discount from cart and return the cart without discount
            await this._cartRepository.clearDiscount(userId, type);
            return this.getCart(userId);
        }
    } 

    async applyDiscount(userId: string, { code, type }: ApplyDiscountInput) {
        const cart = await this.getCart(userId);
        if (!cart.items.length) throw new BadRequestError('Cart is empty');

        const productIds = cart.items.map(item => item.product.toString());
        const products = await Promise.all( productIds.map(productId => productService.getProductById(productId)));
        const productMap = products.reduce((acc, product) => {
            if (product) {
                acc[product._id.toString()] = product;
            }
            return acc;
        }, {} as Record<string, any>);

        const quantities = cart.items.reduce((acc, item) => {
            const productId = item.product.toString();
            acc[productId] = (acc[productId] || 0) + item.quantity;
            return acc;
        }, {} as Record<string, number>);

        const subtotal = cart.items.reduce((sum, item) => {
            const productId = item.product.toString();
            const product = productMap[productId];
            if (!product) throw new NotFoundError(`Product not found for ID: ${productId}`)
            return sum + (product.price * item.quantity);
        }, 0);

        const result = await discountService.applyDiscount({ code, productIds, quantities, subtotal });

        return this._cartRepository.applyDiscount(userId, type, result);
    }

    async calculateCartTotal(cart: ICart) {
        if (!cart.items.length) {
            return {
                subtotal: 0,
                discountAmount: 0,
                total: 0,
                items: 0
            };
        }

        const productIds = cart.items.map(item => item.product.toString());
        const products = await Promise.all( productIds.map(productId => productService.getProductById(productId)));
        const productMap = products.reduce((acc, product) => {
            if (product) {
                acc[product._id.toString()] = product;
            }
            return acc;
        }, {} as Record<string, any>);

        const subtotal = cart.items.reduce((sum, item) => {
            const productId = item.product.toString();
            const product = productMap[productId];
            if (!product) return sum; 
            return sum + (product.price * item.quantity);
        }, 0);

        const discountAmount = (cart.appliedCoupon?.discountAmount || 0) + (cart.appliedVoucher?.discountAmount || 0);

        return {
            subtotal,
            discountAmount,
            total: subtotal - discountAmount,
            items: cart.items.length
        };
    }

    async clearCartItems(userId: string) {
        const cart = await this.getCart(userId);
        if (!cart.items.length) return cart
        
        return this._cartRepository.clearCartItems(userId);
    }

    async deleteCart(userId: string) {
        return this._cartRepository.deleteCart(userId);
    }
}

export default new CartService(new CartRepository());