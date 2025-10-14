import { Request, Response, NextFunction } from "express";
import discountService from "../services/discount.service";
import { ApplyDiscountParams } from "../repository/discount.repository";

export const createDiscount = async (req: Request, res: Response, next: NextFunction) => {
    const { code, type, discountType, value, minPurchase, maxDiscount, buyX, getY, applicableCategories, excludedProducts, validUntil, usageLimit, isActive } = req.body;

    const response = await discountService.createDiscount({ code, type, discountType, value, minPurchase, maxDiscount,
    buyX, getY, applicableCategories, excludedProducts, validUntil, usageLimit, isActive });

    next(response);
}

export const updateDiscount = async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const updateData = req.body;

  const response = await discountService.updateDiscount(id, updateData);
  next(response);
};

export const getDiscountByCode = async (req: Request, res: Response, next: NextFunction) => {
  const { code } = req.params;
  const response = await discountService.getDiscountByCode(code);
  next(response);
};

// export const applyDiscountToCart = async (req: Request, res: Response, next: NextFunction) => {
//   const { code, products, subtotal } = req.body;
  
//   const params: ApplyDiscountParams = {
//     code,
//     productIds: products.map((p: any) => p.productId),
//     quantities: products.reduce((acc: Record<string, number>, p: any) => {
//       acc[p.productId] = p.quantity;
//       return acc;
//     }, {}),
//     subtotal
//   };

//   const response = await discountService.applyDiscount(params);
//   next(response);
// };

export const getAllDiscounts = async (req: Request, res: Response, next: NextFunction) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const isActive = req.query.isActive as string | undefined;
  const discountType = req.query.discountType as string | undefined;
  const searchTerm = req.query.searchTerm as string | undefined;
  
  const response = await discountService.getAllDiscounts({
      page,
      limit,
      isActive: isActive ? isActive === 'true' : undefined,
      discountType,
      searchTerm
  });

  next(response);
};

// Add to discount.controller.ts
export const deleteDiscount = async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const response = await discountService.deleteDiscount(id);
    next(response);
};

export const getActiveDiscounts = async (req: Request, res: Response, next: NextFunction) => {
    const type = req.query.type as string | undefined;
    const response = await discountService.getActiveDiscounts(type);
    next(response);
};

export const getDiscountStats = async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const response = await discountService.getDiscountUsageStats(id);
    next(response);
};

export const getExpiredDiscounts = async (req: Request, res: Response, next: NextFunction) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    
    const response = await discountService.getExpiredDiscounts(page, limit);
    next(response);
};
