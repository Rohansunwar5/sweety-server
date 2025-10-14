import discountModel, { IDiscountType, IType } from "../models/discount.model";

export interface CreateDiscountParams {
  code: string;
  type: IType;
  discountType: IDiscountType;
  value?: number;
  minPurchase?: number;
  maxDiscount?: number;
  buyX?: number;
  getY?: number;
  applicableCategories?: string[];
  excludedProducts?: string[];
  validFrom?: Date;
  validUntil: Date;
  usageLimit?: number;
  isActive?: boolean;
}

export interface UpdateDiscountParams {
  code?: string;
  type?: IType;
  discountType?: IDiscountType;
  value?: number;
  minPurchase?: number | null;
  maxDiscount?: number | null;
  buyX?: number | null;
  getY?: number | null;
  applicableCategories?: string[];
  excludedProducts?: string[];
  validFrom?: Date;
  validUntil?: Date;
  usageLimit?: number | null;
  isActive?: boolean;
}

export interface GetAllDiscountsParams {
  page: number;
  limit: number;
  isActive?: boolean;
  discountType?: string;
  searchTerm?: string;
}

export interface ApplyDiscountParams {
  code: string;
  productIds: string[];
  quantities: Record<string, number>;
  subtotal: number;
}

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

export class DiscountRepository {
    private _model = discountModel;

    async createDiscount(params: CreateDiscountParams) {
      return this._model.create(params);
    }   

    async deleteDiscount(id: string) {
      return this._model.findByIdAndDelete(id);
    }

    async updateDiscount(id: string, params: UpdateDiscountParams) {
      return this._model.findByIdAndUpdate(
          id, params, { new: true }
      )
    }

    async getActiveDiscounts(type?: IType) {
      const filter: any = { 
          isActive: true,
          validFrom: { $lte: new Date() },
          validUntil: { $gte: new Date() }
      };
      
      if (type) {
          filter.type = type;
      }

      return this._model.find(filter).sort({ createdAt: -1 });
    }

    async getExpiredDiscounts(page: number = 1, limit: number = 10) {
        const skip = (page - 1) * limit;
        
        const [discounts, total] = await Promise.all([
            this._model
                .find({ validUntil: { $lt: new Date() } })
                .sort({ validUntil: -1 })
                .skip(skip)
                .limit(limit),
            this._model.countDocuments({ validUntil: { $lt: new Date() } })
        ]);

        return {
            discounts,
            total,
            totalPages: Math.ceil(total / limit),
            currentPage: page
        };
    }

    async getDiscountUsageStats(id: string) {
        const discount = await this._model.findById(id);
        if (!discount) return null;

        return {
            code: discount.code,
            usedCount: discount.usedCount,
            usageLimit: discount.usageLimit,
            usagePercentage: discount.usageLimit 
                ? Math.round((discount.usedCount / discount.usageLimit) * 100) 
                : null
        };
    }

    async getDiscountById(id: string) {
      return this._model.findById(id);
    }

    async getDiscountByCode(code: string) {
        const discount = await this._model.findOne({ code });
    if (!discount) return null;
    
    // Convert to plain object and ensure _id is included
    const plainDiscount = discount.toObject();
    return {
        ...plainDiscount,
        _id: plainDiscount._id.toString() // Explicitly convert to string
    };
    }

    async getAllDiscounts(params: GetAllDiscountsParams) {
    const { 
        page, 
        limit, 
        isActive, 
        discountType,
        searchTerm
    } = params;

    const skip = (page - 1) * limit;
    const filter: any = {};

    if (typeof isActive === 'boolean') {
        filter.isActive = isActive;
    }

    if (discountType) {
        filter.discountType = discountType;
    }

    if (searchTerm) {
        filter.$or = [
            { code: { $regex: searchTerm, $options: 'i' } },
            { type: { $regex: searchTerm, $options: 'i' } }
        ];
    }

    const [discounts, total] = await Promise.all([
        this._model
            .find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit),
        this._model.countDocuments(filter)
    ]);

    return {
        discounts,
        total,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        limit
    };
    }
    async incrementUsage(code: string, userId: string) {
        return this._model.findOneAndUpdate(
            { code },
            { 
                $inc: { usedCount: 1 },
                $addToSet: { usedBy: userId }
            },
            { new: true }
        );
    }

    async hasUserUsedDiscount(code: string, userId: string): Promise<boolean> {
        const discount = await this._model.findOne({ 
            code,
            usedBy: userId 
        });
        return discount !== null;
    }
}