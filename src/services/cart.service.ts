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
        if(!product.isActive) throw new BadRequestError('Product is not available for sale');

        const sizeStock = product.sizeStock.find(s => s.size === item.size);        
        if (!sizeStock || sizeStock.stock < item.quantity) throw new BadRequestError('Insufficient stock for selected size');
        
        const cart = await this.getCart(userId);
        const existingItem = cart.items.find(i => 
            i.product.toString() === item.product && 
            i.size === item.size
        );

        let updatedCart;

        if (existingItem) {
           const totalQuantity = existingItem.quantity + item.quantity;

           if(sizeStock.stock < totalQuantity) {
            throw new BadRequestError(`Insufficient stock. Available: ${sizeStock.stock}, requested total: ${totalQuantity}`);
           }

           updatedCart = await this.updateCartItem(userId, existingItem._id.toString(), {
            quantity: totalQuantity
           });
        } else {
            updatedCart = await this._cartRepository.addItemToCart(userId, {
                ...item,
            })
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

    async mergeCarts(userId: string, guestCartItems: CartItemInput[]) {
        let userCart = await this._cartRepository.getCartByUserId(userId);
        if (!userCart) {
            userCart = await this._cartRepository.createCart(userId);
        }

        if (!guestCartItems || guestCartItems.length === 0) {
            return userCart;
        }

        // Validate guest cart items before merging
        const validatedItems = [];
        for (const item of guestCartItems) {
            try {
                if (!item.product || !item.quantity || item.quantity <= 0) {
                    console.warn(`Invalid guest cart item structure:`, item);
                    continue;
                }

                const product = await productService.getProductById(item.product);
                if (!product || !product.isActive) {
                    console.warn(`Product not available: ${item.product}`);
                    continue;
                }

                // Validate size requirement
                if (product.sizeStock && product.sizeStock.length > 0 && !item.size) {
                    console.warn(`Size required for product: ${item.product}`);
                    continue;
                }

                const sizeStock = product.sizeStock.find(s => s.size === item.size);
                if (!sizeStock || sizeStock.stock < item.quantity) {
                    // Add with available stock if some is available
                    if (sizeStock && sizeStock.stock > 0) {
                        validatedItems.push({
                            ...item,
                            quantity: sizeStock.stock
                        });
                    }
                    continue;
                }

                validatedItems.push({ ...item });
            } catch (error) {
                console.warn(`Error validating guest cart item ${item.product}:`, error);
            }
        }

        // Merge items logic
        const mergedMap = new Map<string, CartItemInput>();
        const getKey = (item: { product: string, size?: string }) =>
            `${item.product}_${item.size || ''}`;

        // Add user cart items
        for (const item of userCart.items || []) {
            const cartItemData: CartItemInput = {
                product: item.product.toString(),
                quantity: item.quantity,
                size: item.size,
            };
            mergedMap.set(getKey(cartItemData), cartItemData);
        }

        // Merge in validated guest cart items
        for (const item of validatedItems) {
            const key = getKey(item);
            if (mergedMap.has(key)) {
                const existing = mergedMap.get(key)!;
                // Check stock availability for merged quantity
                const product = await productService.getProductById(item.product);
                const sizeStock = product?.sizeStock.find(s => s.size === item.size);
                const maxQuantity = sizeStock?.stock || 0;
                const newQuantity = Math.min(existing.quantity + item.quantity, maxQuantity);
                
                mergedMap.set(key, { ...existing, quantity: newQuantity });
            } else {
                mergedMap.set(key, { ...item });
            }
        }

        const mergedItems = Array.from(mergedMap.values());
        return this._cartRepository.replaceCartItems(userId, mergedItems);
    }


    async getGuestCart(sessionId: string) {
        return this._cartRepository.getOrCreateGuestCart(sessionId);
    }

    async addItemToGuestCart(sessionId: string, item: CartItemInput) {
        const product = await productService.getProductById(item.product);
        if (!product) throw new NotFoundError('Product not found');
        if (!product.isActive) throw new BadRequestError('Product is not available');
        
        // Validate size requirement
        if (product.sizeStock && product.sizeStock.length > 0 && !item.size) {
            throw new BadRequestError('Size selection is required for this product');
        }
        
        const sizeStock = product.sizeStock.find(s => s.size === item.size);
        if (!sizeStock || sizeStock.stock < item.quantity) {
            throw new BadRequestError('Insufficient stock for selected size');
        }

        let cart = await this._cartRepository.getCartBySessionId(sessionId);
        if (!cart) {
            cart = await this._cartRepository.createGuestCart(sessionId);
        }

        const existingItem = cart.items.find(i => 
            i.product.toString() === item.product && 
            i.size === item.size
        );

        if (existingItem) {
            const totalQuantity = existingItem.quantity + item.quantity;
            
            // Validate total quantity
            if (sizeStock.stock < totalQuantity) {
                throw new BadRequestError(`Insufficient stock. Available: ${sizeStock.stock}, requested total: ${totalQuantity}`);
            }
            
            return this._cartRepository.updateCartItemBySessionId(
                sessionId, 
                existingItem._id.toString(), 
                { quantity: totalQuantity }
            );
        } else {
            return this._cartRepository.addItemToCartBySessionId(sessionId, { ...item });
        }
    }

    async validateCartItems(userId?: string, sessionId?: string) {
        const cart = userId 
            ? await this.getCart(userId) 
            : await this.getGuestCart(sessionId!);
        
        if (!cart.items.length) return { valid: true, issues: [] };

        const issues = [];
        const validItems = [];

        for (const item of cart.items) {
            try {
                const product = await productService.getProductById(item.product.toString());
                if (!product || !product.isActive) {
                    issues.push({
                        itemId: item._id,
                        productId: item.product,
                        issue: 'Product no longer available'
                    });
                    continue;
                }

                const sizeStock = product.sizeStock.find(s => s.size === item.size);
                if (!sizeStock) {
                    issues.push({
                        itemId: item._id,
                        productId: item.product,
                        issue: 'Size no longer available'
                    });
                    continue;
                }

                if (sizeStock.stock < item.quantity) {
                    issues.push({
                        itemId: item._id,
                        productId: item.product,
                        issue: `Only ${sizeStock.stock} items available, but ${item.quantity} requested`
                    });
                    // Optionally update quantity to available stock
                    validItems.push({
                        ...item,
                        quantity: Math.min(item.quantity, sizeStock.stock)
                    });
                    continue;
                }

                validItems.push(item);
            } catch (error) {
                issues.push({
                    itemId: item._id,
                    productId: item.product,
                    issue: 'Error validating product'
                });
            }
        }

        return {
            valid: issues.length === 0,
            issues,
            validItems,
            needsUpdate: issues.length > 0
        };
    }

}

export default new CartService(new CartRepository());