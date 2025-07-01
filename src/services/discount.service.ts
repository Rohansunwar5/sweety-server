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

class DiscountService {
    constructor(private readonly _discountRepository: DiscountRepository) {}

    async createDiscount(params: CreateDiscountParams) {
        const exisitingDiscount = await this._discountRepository.getDiscountByCode(params.code);
        if(exisitingDiscount) throw new BadRequestError(`Discount code already exisit`);

        if(new Date(params.validUntil) < new Date()) throw new BadRequestError('Invalid Date')

        const discount = await this._discountRepository.createDiscount(params);
        if(!discount) throw new InternalServerError('Failed to create discount');

        return discount;
    }

    async incrementUsage(code: string) {
        const response = await this._discountRepository.incrementUsage(code);

        return response;
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
        }

        // Increment usage count
        await this._discountRepository.incrementUsage(code);

        return { 
            discountAmount,
            discountedTotal: subtotal - discountAmount,
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

    private async calculateBuyXGetYDiscount(
    discount: any,
    productIds: string[],
    quantities: Record<string, number>
): Promise<number> {
    if (!discount.buyX || !discount.getY) {
        throw new BadRequestError('Invalid buyXgetY discount configuration');
    }

    const products = await Promise.all(
        productIds.map(id => productService.getProductById(id))
    );

    const eligibleProducts = products.filter(product => {
        if (!product) return false;

        const isExcluded = discount.excludedProducts?.some(
            (excludedId: any) => excludedId.toString() === product._id.toString()
        );

        if (isExcluded) return false;

        if (discount.applicableCategories?.length) {
            const isApplicable = discount.applicableCategories.some(
                (categoryId: any) => categoryId.toString() === product.category.toString()
            );
            if (!isApplicable) return false;
        }

        return true;
    });

    // Flatten eligible unit prices
    const unitPrices: number[] = [];
    for (const product of eligibleProducts) {
        const qty = quantities[product._id.toString()] || 0;
        for (let i = 0; i < qty; i++) {
            unitPrices.push(product.price);
        }
    }

    const groupSize = discount.buyX + discount.getY;
    const totalGroups = Math.floor(unitPrices.length / groupSize);
    const freeItemsCount = totalGroups * discount.getY;

    if (freeItemsCount === 0) return 0;

    unitPrices.sort((a, b) => a - b);
    const discountAmount = unitPrices
        .slice(0, freeItemsCount)
        .reduce((acc, price) => acc + price, 0);

    return discountAmount;
    }
}


export default new DiscountService(new DiscountRepository());