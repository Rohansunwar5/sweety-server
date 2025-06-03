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

    async updateDiscount(id: string, params: UpdateDiscountParams) {
      return this._model.findByIdAndUpdate(
          id, params, { new: true }
      )
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

    async incrementUsage(code: string) {
        return this._model.findOneAndUpdate(
            { code },
            { $inc: { usedCount: 1 } },
            { new: true }
        )
    }
}