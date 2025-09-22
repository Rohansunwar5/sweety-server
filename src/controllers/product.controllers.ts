import { NextFunction, Request, Response } from "express";
import productService from "../services/product.service";
import { BadRequestError } from "../errors/bad-request.error";
import { uploadToCloudinary } from "../utils/cloudinary.util";

export const createProduct = async (req: Request, res: Response, next: NextFunction) => {
  const {
    name,
    code,
    category,
    colors,
    price,
    originalPrice,
    description,
    sizeChart,
    tags,
    subcategory,
  } = req.body;

  // Only parse if colors is a string; otherwise keep as is
  let parsedColors;
  if (typeof colors === 'string') {
    try {
      parsedColors = JSON.parse(colors);
    } catch (err) {
      return next(new BadRequestError("Invalid JSON format for colors"));
    }
  } else {
    parsedColors = colors;
  }

  // Same for tags
  let parsedTags;
  if (typeof tags === 'string') {
    try {
      parsedTags = JSON.parse(tags);
    } catch (err) {
      return next(new BadRequestError("Invalid JSON format for tags"));
    }
  } else {
    parsedTags = tags;
  }

  const response = await productService.createProduct({
    name,
    code,
    category,
    subcategory,
    colors: parsedColors,
    price: Number(price),
    originalPrice: Number(originalPrice),
    description,
    sizeChart,
    tags: parsedTags,
  });

  next(response);
};


export const updateProduct = async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const {
    name,
    code,
    category,
    subcategory,
    colors, // changed from sizeStock
    sizeChart,
    price,
    originalPrice,
    description,
    isActive,
    tags,
  } = req.body;

  // Parse only if string, else keep as is (handles raw JSON & form data)
  let parsedColors;
  if (typeof colors === 'string') {
    try {
      parsedColors = JSON.parse(colors);
    } catch (err) {
      return next(new BadRequestError("Invalid JSON format for colors"));
    }
  } else {
    parsedColors = colors;
  }

  let parsedTags;
  if (typeof tags === 'string') {
    try {
      parsedTags = JSON.parse(tags);
    } catch (err) {
      return next(new BadRequestError("Invalid JSON format for tags"));
    }
  } else {
    parsedTags = tags;
  }

  let parsedIsActive;
  if (typeof isActive === 'string') {
    try {
      parsedIsActive = JSON.parse(isActive);
    } catch {
      parsedIsActive = undefined;
    }
  } else {
    parsedIsActive = isActive;
  }

  const response = await productService.updateProduct(id, {
    name,
    code,
    category,
    subcategory,
    colors: parsedColors,
    sizeChart,
    price: price !== undefined ? Number(price) : undefined,
    originalPrice: originalPrice !== undefined ? Number(originalPrice) : undefined,
    description,
    isActive: parsedIsActive,
    tags: parsedTags,
  });

  next(response);
};


export const uploadColorImage = async (req: Request, res: Response, next: NextFunction) => {
  if(!req.file) {
    return next(new BadRequestError('Image file is required'));
  }

  try {
    const imageUrls = await productService.handleImageUploads({ files: [req.file] });

    next(imageUrls);
  } catch (error) {
    next(error);
  }
};


export const updateProductStock = async (req: Request, res: Response, next: NextFunction) => {
  const { productId, colorName, size, quantity } = req.body;

  if (!productId || !colorName || !size || quantity === undefined) {
    return next(new BadRequestError("Missing required fields for stock update"));
  }

  const response = await productService.updateProductStock({ productId, colorName, size, quantity });

  next(response);
};

export const getProductById = async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const response = await productService.getProductById(id);

  next(response);
};

export const listProducts = async (req: Request, res: Response, next: NextFunction) => {
  const { page = 1, limit = 10, sort, ...filters } = req.query;
  const response = await productService.listProducts({
    page: Number(page),
    limit: Number(limit),
    sort: sort as string,
    filters,
  });

  next(response);
};

export const getProductsByCategory = async (req: Request, res: Response, next: NextFunction) => {
  const { categoryId } = req.params;
  const { page = 1, limit = 10 } = req.query;
  const response = await productService.getProductsByCategory(categoryId, { page: Number(page), limit: Number(limit) });

  next(response);
};

export const searchProducts = async (req: Request, res: Response, next: NextFunction) => {
  const { q, page = 1, limit = 10 } = req.query;

  if (!q || typeof q !== "string") {
    return next(new BadRequestError("Search query (q) is required"));
  }

  const response = await productService.searchProducts(q, {
    page: Number(page),
    limit: Number(limit),
  });

  next(response);
};

export const getAvailableSizes = async (req: Request, res: Response, next: NextFunction) => {
  const { productId, colorName } = req.params;

  if (!colorName) return next(new BadRequestError("colorName parameter is required"));

  const response = await productService.getAvailableSizes(productId, colorName);

  next(response);
};

export const getProductsBySubcategory = async (req: Request, res: Response, next: NextFunction) => {
    const { subcategoryId } = req.params;
    const { 
        page = 1, 
        limit = 10, 
        sortBy = 'createdAt', 
        sortOrder = 'desc',
        minPrice,
        maxPrice,
        isActive = true
    } = req.query;

    const response = await productService.getProductsBySubcategory(subcategoryId, {
        page: Number(page),
        limit: Number(limit),
        sortBy: sortBy as string,
        sortOrder: sortOrder as 'asc' | 'desc',
        minPrice: minPrice ? Number(minPrice) : undefined,
        maxPrice: maxPrice ? Number(maxPrice) : undefined,
        isActive: isActive === 'true'
    });

    next(response);
};