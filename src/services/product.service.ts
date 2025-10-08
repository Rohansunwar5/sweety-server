import mongoose from "mongoose";
import { BadRequestError } from "../errors/bad-request.error";
import { InternalServerError } from "../errors/internal-server.error";
import { NotFoundError } from "../errors/not-found.error";
import { CreateProductParams, CreateProductWithImagesParams, ListProductsParams, ProductRepository, UpdateProductParams, UpdateProductWithImagesParams, UpdateStockParams } from "../repository/product.repository";
import subcategoryService from "./subcategory.service";
import { uploadToCloudinary } from "../utils/cloudinary.util";

interface SearchProductsParams {
  page: number;
  limit: number;
}

class ProductService {
    constructor(private readonly _productRepository: ProductRepository) {}

    async createProduct(params: CreateProductWithImagesParams) {
        // Check colors instead of sizeStock
        if (!params.colors || params.colors.length === 0)
            throw new BadRequestError("At least one color with size and stock must be provided");
        if (!params.code) throw new BadRequestError("Product code is required");

        // Validate multiple subcategories if provided
        if (params.subcategories && params.subcategories.length > 0) {
            await this.validateCategorySubcategoriesRelationship(params.category, params.subcategories);
        }

        const existingProduct = await this._productRepository.getProductByCode(params.code);
        if (existingProduct) throw new BadRequestError("Product with this code already exists");

        const productParams: CreateProductParams = {
            name: params.name,
            code: params.code,
            category: params.category,
            subcategories: params.subcategories,
            colors: params.colors,
            price: params.price,
            originalPrice: params.originalPrice,
            description: params.description,
            sizeChart: params.sizeChart,
            isActive: params.isActive ?? true,
            tags: params.tags,
        };

        const product = await this._productRepository.createProduct(productParams);
        if (!product) throw new InternalServerError("Failed to create product");

        return product;
    }

    async handleImageUploads(params: { files?: Express.Multer.File[]; existingImages?: string[] }): Promise<string[]> {
        let imageUrls: string[] = [];

        if (params.existingImages) {
            imageUrls = Array.isArray(params.existingImages) ? params.existingImages : [params.existingImages];
        }

        if (params.files && params.files.length > 0) {
            const uploadPromises = params.files.map((file) => uploadToCloudinary(file));
            const newImageUrls = await Promise.all(uploadPromises);
            imageUrls = [...imageUrls, ...newImageUrls];
        }

        if (imageUrls.length === 0) throw new BadRequestError("At least one product image is required");

        return imageUrls;
    }
    
    async updateProduct(id: string, params: UpdateProductWithImagesParams) {
        const product = await this._productRepository.getProductById(id);
        if (!product) throw new NotFoundError('Product not found');

        // Validate category and subcategories relationship
        if (params.category || params.subcategories) {
            const categoryId = params.category || product.category.toString();
            const subcategoryIds = params.subcategories || product.subcategories?.map(s => s.toString());

            if (subcategoryIds && subcategoryIds.length > 0) {
                await this.validateCategorySubcategoriesRelationship(categoryId, subcategoryIds);
            }
        }

        if (params.code && params.code !== product.code) {
            const existingProduct = await this._productRepository.getProductByCode(params.code);
            if (existingProduct) throw new BadRequestError('Product with this code already exists');
        }

        let imageUrls: string[] = [];
        if (params.colors && params.colors.length > 0) {
            // Colors already have images
        } else {
            imageUrls = product.colors?.flatMap(c => c.images) || [];
        }

        if (params.files?.length) {
            try {
                const uploadPromises = params.files.map((file: Express.Multer.File) => uploadToCloudinary(file));
                const newImageUrls = await Promise.all(uploadPromises);
                imageUrls = [...imageUrls, ...newImageUrls];
            } catch {
                throw new BadRequestError('Failed to upload product images');
            }
        }

        const updateParams: UpdateProductParams = {
            name: params.name,
            code: params.code,
            category: params.category,
            subcategories: params.subcategories,
            colors: params.colors,
            price: params.price,
            originalPrice: params.originalPrice,
            description: params.description,
            sizeChart: params.sizeChart,
            isActive: params.isActive,
            tags: params.tags,
        };

        // Remove undefined
        Object.keys(updateParams).forEach(key => {
            if (updateParams[key as keyof UpdateProductParams] === undefined) {
                delete updateParams[key as keyof UpdateProductParams];
            }
        });

        const updatedProduct = await this._productRepository.updateProduct(id, updateParams);
        if (!updatedProduct) throw new InternalServerError('Failed to update product');

        return updatedProduct;
    }

    async updateProductStock(params: UpdateStockParams & { colorName: string }) {
        const { productId, colorName, size, quantity } = params;

        if (!productId || !colorName || !size || quantity === undefined) {
            throw new BadRequestError("Missing required fields for stock update");
        }

        const updatedProduct = await this._productRepository.updateProductStock({
            productId,
            colorName,
            size,
            quantity,
        });
        if (!updatedProduct) throw new NotFoundError("Product, color or size not found");

        return updatedProduct;
    }

    async getProductById(id: string) {
        const product = await this._productRepository.getProductById(id);
        if (!product) throw new NotFoundError('Product not found')
        
        return product;
    }

    async listProducts(params: ListProductsParams) {
        const { page, limit, sort, filters } = params;
        
        return this._productRepository.listProducts({ page, limit, sort, filters });
    } 

    async getProductsByCategory(categoryId: string, params: SearchProductsParams) {
        const { page, limit } = params;

        return this._productRepository.getProductsByCategory(categoryId, { page, limit });
    }

    async searchProducts(query: string, params: SearchProductsParams) {
        const { page, limit } = params;

        if (!query.trim()) throw new BadRequestError("Search query cannot be empty");

        return this._productRepository.searchProducts(query, { page, limit });
    }

    async getAvailableSizes(productId: string, colorName: string) {
        return this._productRepository.getAvailableSizes(productId, colorName);
    }

    async reduceStockForOrder(
        orderItems: Array<{ productId: string; colorName: string; size: string; quantity: number; productName?: string }>
    ) {
        if (!orderItems || orderItems.length === 0) {
            throw new BadRequestError("No order items provided for stock reduction");
        }

        for (const item of orderItems) {
            if (!item.productId || !item.colorName || !item.size || !item.quantity || item.quantity <= 0) {
                throw new BadRequestError("Invalid order item data for stock reduction");
            }
        }

        await this._validateStockAvailability(orderItems);

        const session = await this._productRepository.startSession();

        try {
            await session.withTransaction(async () => {
                for (const item of orderItems) {
                    const result = await this._productRepository.reduceProductStock(
                        item.productId,
                        item.colorName,
                        item.size,
                        item.quantity,
                        session
                    );

                    if (result.matchedCount === 0) {
                        throw new BadRequestError(
                            `Product not found or insufficient stock: ${item.productName || item.productId} (${item.colorName} - ${item.size})`
                        );
                    }

                    if (result.modifiedCount === 0) {
                        throw new BadRequestError(
                            `Failed to reduce stock for: ${item.productName || item.productId} (${item.colorName} - ${item.size})`
                        );
                    }
                }
            });

            return { success: true, message: "Stock reduced successfully" };
        } catch (error) {
            console.error("Error reducing stock for order:", error);
            throw error;
        } finally {
            await session.endSession();
        }
    }

    async validateStockForOrder(
        orderItems: Array<{ productId: string; colorName: string; size: string; quantity: number; productName?: string }>) 
    {
        if (!orderItems || orderItems.length === 0)
            throw new BadRequestError("No order items provided for stock validation");

        return this._validateStockAvailability(orderItems);
    }

    private async _validateStockAvailability(
        orderItems: Array<{ productId: string; colorName?: string; size: string; quantity: number; productName?: string }>) 
    {
        const insufficientItems: Array<any> = [];

        const stockItems = orderItems.map((item) => ({
            productId: item.productId,
            colorName: item.colorName || "",
            size: item.size,
        }));

        const currentStocks = await this._productRepository.getMultipleProductStocks(stockItems);

        for (let i = 0; i < orderItems.length; i++) {
            const orderItem = orderItems[i];
            const currentStock = currentStocks[i];

            if (currentStock.stock === 0) {
                const exists = await this._productRepository.checkProductSizeExists(
                    orderItem.productId,
                    orderItem.colorName || "",
                    orderItem.size
                );

                if (!exists) {
                    insufficientItems.push({
                        productId: orderItem.productId,
                        productName: orderItem.productName,
                        colorName: orderItem.colorName,
                        size: orderItem.size,
                        requestedQuantity: orderItem.quantity,
                        availableStock: 0,
                        reason: "Product, color or size not found",
                    });
                    continue;
                }
            }

            if (currentStock.stock < orderItem.quantity) {
                insufficientItems.push({
                    productId: orderItem.productId,
                    productName: orderItem.productName,
                    colorName: orderItem.colorName,
                    size: orderItem.size,
                    requestedQuantity: orderItem.quantity,
                    availableStock: currentStock.stock,
                    reason: "Insufficient stock",
                });
            }
        }

        if (insufficientItems.length > 0) {
            const errorMessage = insufficientItems
                .map(
                    (item) =>
                        `${item.productName || item.productId} (${item.colorName} - ${item.size}): ` +
                        `requested ${item.requestedQuantity}, available ${item.availableStock} - ${item.reason}`
                )
                .join("; ");

            throw new BadRequestError(`Stock validation failed: ${errorMessage}`);
        }

        return { success: true, message: "Stock validation passed" };
    }

    async addProductRating(productId: string, userId: string, rating: number, review?: string) {
        const product = await this._productRepository.getProductById(productId);
        if (!product) throw new NotFoundError("Product not found");

        if (rating < 1 || rating > 5) {
            throw new BadRequestError("Rating must be between 1 and 5");
        }

        // Check if user already rated this product
        const existingRatingIndex = product.ratings.findIndex((r) => r.userId.toString() === userId);

        const ratingData = {
            userId: new mongoose.Types.ObjectId(userId),
            value: rating,
            review: review || "",
            createdAt: new Date(),
        };

        let updatedRatings;
        if (existingRatingIndex !== -1) {
            // Update existing rating
            updatedRatings = [...product.ratings];
            updatedRatings[existingRatingIndex] = ratingData;
        } else {
            // Add new rating
            updatedRatings = [...product.ratings, ratingData];
        }

        return this._productRepository.updateProduct(productId, {
            ratings: updatedRatings,
            colors: product.colors,
        });
    }

    async updateProductStockWithColor(params: {
        productId: string;
        colorName: string;
        size: string;
        quantity: number; 
    }) {
        const { productId, colorName, size, quantity } = params;

        if (!productId || !colorName || !size || quantity === undefined) {
            throw new BadRequestError("Missing required fields for stock update");
        }

        // Get current product to validate color and size exist
        const product = await this._productRepository.getProductById(productId);
        if (!product) {
            throw new NotFoundError("Product not found");
        }

        // Find the color variant
        const colorVariant = product.colors.find(c => c.colorName === colorName);
        if (!colorVariant) {
            throw new NotFoundError(`Color variant '${colorName}' not found for product`);
        }

        // Find the size within the color variant
        const sizeStock = colorVariant.sizeStock.find(s => s.size === size);
        if (!sizeStock) {
            throw new NotFoundError(`Size '${size}' not found for color '${colorName}'`);
        }

        // Calculate new stock level
        const newStock = sizeStock.stock + quantity;
        if (newStock < 0) {
            throw new BadRequestError(
                `Cannot reduce stock below 0. Current: ${sizeStock.stock}, Requested change: ${quantity}`
            );
        }

        // Use the existing updateProductStock method
        const updatedProduct = await this.updateProductStock({
            productId,
            colorName,
            size,
            quantity: newStock // Set absolute value, not relative change
        });

        return updatedProduct;
    }

    async getProductRatings(productId: string, page: number = 1, limit: number = 10) {
        const product = await this._productRepository.getProductById(productId);
        if (!product) throw new NotFoundError("Product not found");

        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;
        const paginatedRatings = product.ratings
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .slice(startIndex, endIndex);

        return {
            ratings: paginatedRatings,
            total: product.ratings.length,
            page,
            pages: Math.ceil(product.ratings.length / limit),
            averageRating:
                product.ratings.length > 0 ? product.ratings.reduce((sum, r) => sum + r.value, 0) / product.ratings.length : 0,
        };
    }

    // UPDATED: Now validates multiple subcategories
    private async validateCategorySubcategoriesRelationship(categoryId: string, subcategoryIds: string[]) {
        if (!subcategoryIds || subcategoryIds.length === 0) return;

        const invalidSubcategories: string[] = [];

        for (const subcategoryId of subcategoryIds) {
            try {
                const subcategory = await subcategoryService.getSubcategoryById(subcategoryId);
                if (subcategory.category.toString() !== categoryId) {
                    invalidSubcategories.push(subcategoryId);
                }
            } catch (error) {
                if (error instanceof NotFoundError) {
                    throw new BadRequestError(`Subcategory ${subcategoryId} not found`);
                }
                throw error;
            }
        }

        if (invalidSubcategories.length > 0) {
            throw new BadRequestError(
                `The following subcategories do not belong to the specified category: ${invalidSubcategories.join(', ')}`
            );
        }
    }

    async reduceStockForOrderWithColor(
        orderItems: Array<{ productId: string; colorName: string; size: string; quantity: number; productName?: string }>
    ) {
        return this.reduceStockForOrder(orderItems);
    }

    // UPDATED: Still works with single subcategory, returns products that have this subcategory in their array
    async getProductsBySubcategory(
        subcategoryId: string, 
        params: {
            page?: number;
            limit?: number;
            sortBy?: string;
            sortOrder?: 'asc' | 'desc';
            minPrice?: number;
            maxPrice?: number;
            isActive?: boolean;
        } = {}
    ) {
        // Verify subcategory exists
        const subcategory = await subcategoryService.getSubcategoryById(subcategoryId);
        if (!subcategory) {
            throw new NotFoundError('Subcategory not found');
        }

        // Get products by subcategory (now searches in subcategories array)
        const result = await this._productRepository.getProductsBySubcategoryWithStock(subcategoryId, params);

        return {
            products: result.products,
            pagination: {
                total: result.total,
                totalPages: result.totalPages,
                currentPage: result.currentPage,
                hasNextPage: result.currentPage < result.totalPages,
                hasPrevPage: result.currentPage > 1
            },
            subcategory: {
                _id: subcategory._id,
                name: subcategory.name,
                description: subcategory.description
            }
        };
    }

    // NEW: Get products by multiple subcategories
    async getProductsBySubcategories(
        subcategoryIds: string[],
        params: {
            page?: number;
            limit?: number;
            sortBy?: string;
            sortOrder?: 'asc' | 'desc';
            minPrice?: number;
            maxPrice?: number;
            isActive?: boolean;
        } = {}
    ) {
        if (!subcategoryIds || subcategoryIds.length === 0) {
            throw new BadRequestError('At least one subcategory ID is required');
        }

        // Verify all subcategories exist
        for (const subcategoryId of subcategoryIds) {
            const subcategory = await subcategoryService.getSubcategoryById(subcategoryId);
            if (!subcategory) {
                throw new NotFoundError(`Subcategory ${subcategoryId} not found`);
            }
        }

        const { page = 1, limit = 10 } = params;

        // Get products matching any of the subcategories
        return this._productRepository.getProductsBySubcategories(subcategoryIds, { page, limit });
    }

    // NEW: Add a subcategory to an existing product
    async addSubcategoryToProduct(productId: string, subcategoryId: string) {
        const product = await this._productRepository.getProductById(productId);
        if (!product) {
            throw new NotFoundError('Product not found');
        }

        // Validate that subcategory belongs to the same category
        await this.validateCategorySubcategoriesRelationship(
            product.category.toString(), 
            [subcategoryId]
        );

        // Check if subcategory already exists in the product
        const subcategoryExists = product.subcategories?.some(
            sub => sub.toString() === subcategoryId
        );

        if (subcategoryExists) {
            throw new BadRequestError('Product already has this subcategory');
        }

        return this._productRepository.addSubcategoryToProduct(productId, subcategoryId);
    }

    // NEW: Remove a subcategory from a product
    async removeSubcategoryFromProduct(productId: string, subcategoryId: string) {
        const product = await this._productRepository.getProductById(productId);
        if (!product) {
            throw new NotFoundError('Product not found');
        }

        // Check if subcategory exists in the product
        const subcategoryExists = product.subcategories?.some(
            sub => sub.toString() === subcategoryId
        );

        if (!subcategoryExists) {
            throw new BadRequestError('Product does not have this subcategory');
        }

        return this._productRepository.removeSubcategoryFromProduct(productId, subcategoryId);
    }

    async adjustProductStockWithColor(params: {
        productId: string;
        colorName: string;
        size: string;
        quantityChange: number; // Positive to add, negative to reduce
    }) {
        const { productId, colorName, size, quantityChange } = params;

        if (!productId || !colorName || !size || quantityChange === undefined) {
            throw new BadRequestError("Missing required fields for stock adjustment");
        }

        // Get current stock
        const stockItems = [{
            productId,
            colorName,
            size
        }];

        const currentStocks = await this._productRepository.getMultipleProductStocks(stockItems);
        const currentStock = currentStocks[0];

        if (currentStock.stock === 0 && quantityChange < 0) {
            const exists = await this._productRepository.checkProductSizeExists(
                productId,
                colorName,
                size
            );
            if (!exists) {
                throw new NotFoundError("Product, color, or size combination not found");
            }
        }

        const newStock = currentStock.stock + quantityChange;
        if (newStock < 0) {
            throw new BadRequestError(
                `Cannot reduce stock below 0. Current: ${currentStock.stock}, Requested change: ${quantityChange}`
            );
        }

        // Update with new absolute value
        return this.updateProductStock({
            productId,
            colorName,
            size,
            quantity: newStock
        });
    }
}

export default new ProductService(new ProductRepository());