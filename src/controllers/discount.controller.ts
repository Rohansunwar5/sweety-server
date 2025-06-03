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

export const applyDiscountToCart = async (req: Request, res: Response, next: NextFunction) => {
  const { code, products, subtotal } = req.body;
  
  const params: ApplyDiscountParams = {
    code,
    productIds: products.map((p: any) => p.productId),
    quantities: products.reduce((acc: Record<string, number>, p: any) => {
      acc[p.productId] = p.quantity;
      return acc;
    }, {}),
    subtotal
  };

  const response = await discountService.applyDiscount(params);
  next(response);
};