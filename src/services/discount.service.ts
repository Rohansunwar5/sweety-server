import { BadRequestError } from "../errors/bad-request.error";
import { InternalServerError } from "../errors/internal-server.error";
import { ApplyDiscountParams, CreateDiscountParams, DiscountRepository, UpdateDiscountParams } from "../repository/discount.repository";
import { NotFoundError } from "../errors/not-found.error";
import productService from "./product.service";

export interface DiscountCalculationResult {
    discountAmount: number;
    discountedTotal: number;
    appliedDiscount: {
        code: string;
        type: string;
        discountType: string;
        value: number;
        discountId: string;
    };
}

export interface GetAllDiscountsOptions {
    page?: number;
    limit?: number;
    isActive?: boolean;
    discountType?: string;
    searchTerm?: string;
}

class DiscountService {
    constructor(private readonly _discountRepository: DiscountRepository) {}

    // Update createDiscount in discount.service.ts
    async createDiscount(params: CreateDiscountParams) {
        const existingDiscount = await this._discountRepository.getDiscountByCode(params.code);
        if (existingDiscount) throw new BadRequestError('Discount code already exists');

        if (new Date(params.validUntil) <= new Date()) {
            throw new BadRequestError('Valid until date must be in the future');
        }

        // Validate discount type specific fields
        if (params.discountType === 'percentage') {
            if (!params.value || params.value <= 0 || params.value > 100) {
                throw new BadRequestError('Percentage value must be between 0 and 100');
            }
        } else if (params.discountType === 'fixed') {
            if (!params.value || params.value <= 0) {
                throw new BadRequestError('Fixed discount value must be greater than 0');
            }
        } else if (params.discountType === 'buyXgetY') {
            if (!params.buyX || !params.getY || params.buyX <= 0 || params.getY <= 0) {
                throw new BadRequestError('BuyX and GetY values must be greater than 0');
            }
        }

        // Validate min purchase and max discount relationship
        if (params.minPurchase && params.maxDiscount && params.minPurchase < params.maxDiscount) {
            throw new BadRequestError('Minimum purchase amount should be greater than maximum discount');
        }

        const discount = await this._discountRepository.createDiscount(params);
        if (!discount) throw new InternalServerError('Failed to create discount');

        return discount;
    }


    async incrementUsage(code: string, userId: string) {
        const response = await this._discountRepository.incrementUsage(code, userId);
        return response;
    }

    async hasUserUsedDiscount(code: string, userId: string): Promise<boolean> {
        return this._discountRepository.hasUserUsedDiscount(code, userId);
    }

    async updateDiscount(id: string, params: UpdateDiscountParams) {
        const discount = await this._discountRepository.getDiscountById(id);
        if(!discount) throw new NotFoundError('Discount not found');

        if(params.code && params.code !== discount.code) {
            const exisitingDiscount = await this._discountRepository.getDiscountByCode(params.code);
            if(exisitingDiscount) throw new BadRequestError('Discount code already exists'); 
        }

        const updateDiscount = await this._discountRepository.updateDiscount(id, params);
        if(!updateDiscount) throw new InternalServerError('Failed to update discount');

        return updateDiscount;
    }

    async getDiscountByCode(code: string) {
        const discount = await this._discountRepository.getDiscountByCode(code);
        if(!discount) throw new NotFoundError('Discount code not found');

        return discount;
    }

    async markDiscountAsUsed(code: string, userId: string) {
    // Check if user has already used this discount
        const hasUsed = await this._discountRepository.hasUserUsedDiscount(code, userId);
        if (hasUsed) {
            throw new BadRequestError('You have already used this discount code');
        }

        // Get and validate discount
        const discount = await this.getDiscountByCode(code);
        const now = new Date();
        
        if (!discount.isActive) {
            throw new BadRequestError('Discount code is not active');
        }
        
        if (now < discount.validFrom) {
            throw new BadRequestError('Discount code is not yet valid');
        }
        
        if (now > discount.validUntil) {
            throw new BadRequestError('Discount code has expired');
        }
        
        if (discount.usageLimit && discount.usedCount >= discount.usageLimit) {
            throw new BadRequestError('Discount code usage limit reached');
        }

        // Mark as used
        await this._discountRepository.incrementUsage(code, userId);
    }

    // Update applyDiscount in discount.service.ts
    async applyDiscount(params: ApplyDiscountParams): Promise<DiscountCalculationResult> {
    const { code, productIds, quantities, subtotal } = params;
    
    const discount = await this.getDiscountByCode(code);
    this.validateDiscount(discount, subtotal);

    let discountAmount = 0;

    switch(discount.discountType) {
        case 'percentage':
            discountAmount = this.calculatePercentageDiscount(discount, subtotal);
            break;
        case 'fixed':
            discountAmount = this.calculateFixedDiscount(discount, subtotal);
            break;
        case 'buyXgetY':
            discountAmount = await this.calculateBuyXGetYDiscount(discount, productIds, quantities);
            break;
        default:
            throw new BadRequestError(`Unsupported discount type: ${discount.discountType}`);
    }

    const discountedTotal = subtotal - discountAmount;
    
    return { 
        discountAmount: Math.round(discountAmount * 100) / 100,
        discountedTotal: Math.round(discountedTotal * 100) / 100,
        appliedDiscount: {
            code: discount.code,
            type: discount.type,
            discountType: discount.discountType,
            value: discount.value,
            discountId: discount._id,
        }
    };
}

    private validateDiscount(discount: any, subtotal: number) {
        const now = new Date();
        
        if (!discount.isActive) {
        throw new BadRequestError('Discount code is not active');
        }
        
        if (now < discount.validFrom) {
        throw new BadRequestError('Discount code is not yet valid');
        }
        
        if (now > discount.validUntil) {
        throw new BadRequestError('Discount code has expired');
        }
        
        if (discount.usageLimit && discount.usedCount >= discount.usageLimit) {
        throw new BadRequestError('Discount code usage limit reached');
        }
        
        if (discount.minPurchase && subtotal < discount.minPurchase) {
        throw new BadRequestError(`Minimum purchase of ${discount.minPurchase} required`);
        }
    }

    private calculatePercentageDiscount(discount: any, subtotal: number): number {
        let discountAmount = subtotal * (discount.value / 100);
        
        if (discount.maxDiscount) {
        discountAmount = Math.min(discountAmount, discount.maxDiscount);
        }
        
        return discountAmount;
    }

    private calculateFixedDiscount(discount: any, subtotal: number): number {
        return Math.min(discount.value, subtotal);
    }

    private async calculateBuyXGetYDiscount( discount: any, productIds: string[], quantities: Record<string, number>): Promise<number> {
        if (!discount.buyX || !discount.getY) {
            throw new BadRequestError('Invalid buyXgetY discount configuration');
        }

        const products = await Promise.all(
            productIds.map(id => productService.getProductById(id))
        );

        // Get eligible products with their cart quantities
        const eligibleItems: Array<{product: any, quantity: number}> = [];
        
        for (const product of products) {
            if (!product) continue;

            // Check if product is excluded
            const isExcluded = discount.excludedProducts?.some(
                (excludedId: any) => excludedId.toString() === product._id.toString()
            );
            if (isExcluded) continue;

            // Check if product belongs to applicable categories (if specified)
            if (discount.applicableCategories?.length > 0) {
                const isApplicable = discount.applicableCategories.some(
                    (categoryId: any) => categoryId.toString() === product.category.toString()
                );
                if (!isApplicable) continue;
            }

            const cartQuantity = quantities[product._id.toString()] || 0;
            if (cartQuantity > 0) {
                eligibleItems.push({ product, quantity: cartQuantity });
            }
        }

        if (eligibleItems.length === 0) {
            return 0;
        }

        // Create array of unit prices for all eligible items in cart
        const unitPrices: number[] = [];
        for (const item of eligibleItems) {
            for (let i = 0; i < item.quantity; i++) {
                unitPrices.push(item.product.price);
            }
        }

        // Calculate total eligible items
        const totalEligibleItems = unitPrices.length;
        
        // For Buy X Get Y: customer needs to buy X items to get Y items free
        // Example: Buy 2 Get 1 - customer buys 2, gets 1 free (group of 3)
        const itemsPerGroup = discount.buyX; // Items customer must buy
        const freeItemsPerGroup = discount.getY; // Free items they get
        
        // Calculate how many complete groups we can form
        const completeGroups = Math.floor(totalEligibleItems / (itemsPerGroup + freeItemsPerGroup));
        
        // If no complete groups, check if we have enough items to qualify for free items
        let freeItemsCount = completeGroups * freeItemsPerGroup;
        
        // Handle partial groups - if customer has bought enough items but not a complete group
        const remainingItems = totalEligibleItems - (completeGroups * (itemsPerGroup + freeItemsPerGroup));
        if (remainingItems >= itemsPerGroup) {
            // Customer has bought enough items in the partial group to get some free items
            const additionalFreeItems = Math.min(freeItemsPerGroup, remainingItems - itemsPerGroup);
            freeItemsCount += additionalFreeItems;
        }

        if (freeItemsCount === 0) {
            return 0;
        }

        // Sort prices in ascending order to give discount on cheapest items
        unitPrices.sort((a, b) => a - b);
        
        // Calculate discount amount for the cheapest free items
        const discountAmount = unitPrices
            .slice(0, freeItemsCount)
            .reduce((acc, price) => acc + price, 0);

        return Math.round(discountAmount * 100) / 100; // Round to 2 decimal places
    }


    async getAllDiscounts(options: GetAllDiscountsOptions = {}) {
        const { 
            page = 1, 
            limit = 10, 
            isActive, 
            discountType,
            searchTerm
        } = options;

        // Validate parameters
        if (page < 1) throw new BadRequestError('Page must be greater than 0');
        if (limit < 1 || limit > 100) throw new BadRequestError('Limit must be between 1 and 100');

        return this._discountRepository.getAllDiscounts({
            page,
            limit,
            isActive,
            discountType,
            searchTerm
        });
    }

    async deleteDiscount(id: string) {
        const discount = await this._discountRepository.getDiscountById(id);
        if (!discount) throw new NotFoundError('Discount not found');

        // Check if discount is currently being used
        if (discount.usedCount > 0) {
            throw new BadRequestError('Cannot delete discount that has been used');
        }

        const response = await this._discountRepository.deleteDiscount(id);
        if (!response) throw new InternalServerError('Failed to delete discount');

        return { message: 'Discount deleted successfully' };
    }

    async getActiveDiscounts(type?: string) {
        return this._discountRepository.getActiveDiscounts(type as any);
    }

    async getExpiredDiscounts(page: number = 1, limit: number = 10) {
        return this._discountRepository.getExpiredDiscounts(page, limit);
    }

    async getDiscountUsageStats(id: string) {
        const stats = await this._discountRepository.getDiscountUsageStats(id);
        if (!stats) throw new NotFoundError('Discount not found');
        return stats;
    }

}


export default new DiscountService(new DiscountRepository());