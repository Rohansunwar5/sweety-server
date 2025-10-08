import { NextFunction, Request, Response } from "express";
import productService from "../services/product.service";
import { BadRequestError } from "../errors/bad-request.error";

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
    subcategories, 
  } = req.body;

  // Parse colors if string
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

  // Parse tags if string
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

  // Parse subcategories if string (can be array or single value)
  let parsedSubcategories;
  if (typeof subcategories === 'string') {
    try {
      parsedSubcategories = JSON.parse(subcategories);
      // Ensure it's an array
      if (!Array.isArray(parsedSubcategories)) {
        parsedSubcategories = [parsedSubcategories];
      }
    } catch (err) {
      return next(new BadRequestError("Invalid JSON format for subcategories"));
    }
  } else if (subcategories) {
    // If it's already an array or single value
    parsedSubcategories = Array.isArray(subcategories) ? subcategories : [subcategories];
  }

  const response = await productService.createProduct({
    name,
    code,
    category,
    subcategories: parsedSubcategories,
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
    subcategories, // Changed from subcategory to subcategories
    colors,
    sizeChart,
    price,
    originalPrice,
    description,
    isActive,
    tags,
  } = req.body;

  // Parse colors if string
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

  // Parse tags if string
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

  // Parse subcategories if string
  let parsedSubcategories;
  if (typeof subcategories === 'string') {
    try {
      parsedSubcategories = JSON.parse(subcategories);
      // Ensure it's an array
      if (parsedSubcategories && !Array.isArray(parsedSubcategories)) {
        parsedSubcategories = [parsedSubcategories];
      }
    } catch (err) {
      return next(new BadRequestError("Invalid JSON format for subcategories"));
    }
  } else if (subcategories !== undefined) {
    // If it's already an array or single value
    parsedSubcategories = Array.isArray(subcategories) ? subcategories : [subcategories];
  }

  // Parse isActive if string
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
    subcategories: parsedSubcategories,
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
  const response = await productService.getProductsByCategory(categoryId, { 
    page: Number(page), 
    limit: Number(limit) 
  });
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

// UPDATED: Still works with single subcategory
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

// NEW: Get products by multiple subcategories
export const getProductsBySubcategories = async (req: Request, res: Response, next: NextFunction) => {
  const { subcategoryIds } = req.body; // Expecting array in body

  if (!subcategoryIds || !Array.isArray(subcategoryIds) || subcategoryIds.length === 0) {
    return next(new BadRequestError("subcategoryIds array is required"));
  }

  const { 
    page = 1, 
    limit = 10, 
    sortBy = 'createdAt', 
    sortOrder = 'desc',
    minPrice,
    maxPrice,
    isActive = true
  } = req.query;

  const response = await productService.getProductsBySubcategories(subcategoryIds, {
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

// NEW: Add subcategory to product
export const addSubcategoryToProduct = async (req: Request, res: Response, next: NextFunction) => {
  const { productId } = req.params;
  const { subcategoryId } = req.body;

  if (!subcategoryId) return next(new BadRequestError("subcategoryId is required"))
  const response = await productService.addSubcategoryToProduct(productId, subcategoryId);

  next(response);
};

// NEW: Remove subcategory from product
export const removeSubcategoryFromProduct = async (req: Request, res: Response, next: NextFunction) => {
  const { productId, subcategoryId } = req.params;
  const response = await productService.removeSubcategoryFromProduct(productId, subcategoryId);

  next(response);
};

export const deleteProduct = async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const deletedProduct = await productService.deleteProduct(id);

  next(deletedProduct);
};
