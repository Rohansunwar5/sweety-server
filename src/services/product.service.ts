import mongoose from "mongoose";
import { BadRequestError } from "../errors/bad-request.error";
import { InternalServerError } from "../errors/internal-server.error";
import { NotFoundError } from "../errors/not-found.error";
import { CreateProductParams, CreateProductWithImagesParams, ListProductsParams, ProductRepository, UpdateProductParams, UpdateProductWithImagesParams, UpdateStockParams } from "../repository/product.repository";
import subcategoryService from "./subcategory.service";
import { uploadToCloudinary } from "../utils/cloudinary.util";
import { throws } from "assert";

interface SearchProductsParams {
  page: number;
  limit: number;
}

class ProductService {
    constructor(private readonly _productRepository: ProductRepository) {}

    async createProduct(params: CreateProductWithImagesParams) {
        if (!params.sizeStock || params.sizeStock.length === 0) throw new BadRequestError('At least one size with stock must be provided')
        if (!params.code) throw new BadRequestError('Product code is required')

        await this.validateCategorySubcategoryRelationship(params.category, params.subcategory);

        const existingProduct = await this._productRepository.getProductByCode(params.code);
        if (existingProduct) throw new BadRequestError('Product with this code already exists')

        const imageUrls = await this.handleImageUploads({ files: params.files, existingImages: params.existingImages });

        const productParams: CreateProductParams = {
            name: params.name,
            code: params.code,
            category: params.category,
            subcategory: params.subcategory,
            sizeStock: params.sizeStock,
            price: params.price,
            originalPrice: params.originalPrice,
            description: params.description,
            images: imageUrls,
            sizeChart: params.sizeChart,
            isActive: params.isActive ?? true,
            tags: params.tags
        };

        const product = await this._productRepository.createProduct(productParams);
        if (!product) throw new InternalServerError('Failed to create product')

        return product;
    }
    
    async updateProduct(id: string, params: UpdateProductWithImagesParams) {
        const product = await this._productRepository.getProductById(id);
        if (!product) throw new NotFoundError('Product not found');

        if(params.category || params.subcategory) {
            const categoryId = params.category || product.category.toString();
            const subcategoryId = params.subcategory || product.subcategory?.toString();

            await this.validateCategorySubcategoryRelationship(categoryId, subcategoryId);
        }

        if (params.code && params.code !== product.code) {
            const existingProduct = await this._productRepository.getProductByCode(params.code);
            if (existingProduct) throw new BadRequestError('Product with this code already exists');
        }
        
        let imageUrls: string[] = product.images || [];
        
        if (params.files?.length) {
            try {   
                const uploadPromises = params.files.map((file: Express.Multer.File) => uploadToCloudinary(file));
                imageUrls = await Promise.all(uploadPromises);
            } catch (error) {
                throw new BadRequestError('Failed to upload product images');
            }
        }


        const updateParams: UpdateProductParams = {
            name: params.name,
            code: params.code,
            category: params.category,
            subcategory: params.subcategory,
            sizeStock: params.sizeStock,
            price: params.price,
            originalPrice: params.originalPrice,
            description: params.description,
            images: imageUrls,
            sizeChart: params.sizeChart,
            isActive: params.isActive,
            tags: params.tags
        };

        Object.keys(updateParams).forEach(key => 
            updateParams[key as keyof UpdateProductParams] === undefined 
                && delete updateParams[key as keyof UpdateProductParams]
        );

        const updatedProduct = await this._productRepository.updateProduct(id, updateParams);
        if (!updatedProduct) {
            throw new InternalServerError('Failed to update product');
        }

        return updatedProduct;
    }

    async updateProductStock(params: UpdateStockParams) {
        const { productId, size, quantity } = params;
        
        if (!productId || !size || quantity === undefined) {
            throw new BadRequestError('Missing required fields for stock update');
        }

        const updatedProduct = await this._productRepository.updateProductStock(params);
        if (!updatedProduct) throw new NotFoundError('Product or size not found')

        return updatedProduct;
    }

    private async handleImageUploads(params: { files?: Express.Multer.File[], existingImages?: string[] }): Promise<string[]> {
        let imageUrls: string[] = [];

        if (params.existingImages) {
            imageUrls = Array.isArray(params.existingImages) ? params.existingImages : [params.existingImages];
        }

        if (params.files && params.files.length > 0) {
            const uploadPromises = params.files.map(file => uploadToCloudinary(file));
            const newImageUrls = await Promise.all(uploadPromises);
            imageUrls = [...imageUrls, ...newImageUrls];
        }

        if (imageUrls.length === 0) throw new BadRequestError('At least one product image is required');

        return imageUrls;
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

        if (!query.trim()) throw new BadRequestError('Search query cannot be empty')

        return this._productRepository.searchProducts(query, { page, limit});
    }

    async getAvailableSizes(productId: string) {
        return this._productRepository.getAvailableSizes(productId);
    }

     async reduceStockForOrder(orderItems: Array<{ productId: string; size: string; quantity: number; productName?: string }>) {
        if (!orderItems || orderItems.length === 0) {
            throw new BadRequestError('No order items provided for stock reduction');
        }

        for (const item of orderItems) {
            if (!item.productId || !item.size || !item.quantity || item.quantity <= 0) {
                throw new BadRequestError('Invalid order item data for stock reduction');
            }
        }

        await this._validateStockAvailability(orderItems);

        const session = await this._productRepository.startSession();
        
        try {
            await session.withTransaction(async () => {
                for (const item of orderItems) {
                    const result = await this._productRepository.reduceProductStock(
                        item.productId,
                        item.size,
                        item.quantity,
                        session
                    );

                    if (result.matchedCount === 0) {
                        throw new BadRequestError(
                            `Product not found or insufficient stock: ${item.productName || item.productId} (${item.size})`
                        );
                    }

                    if (result.modifiedCount === 0) {
                        throw new BadRequestError(
                            `Failed to reduce stock for: ${item.productName || item.productId} (${item.size})`
                        );
                    }
                }
            });
            
            return { success: true, message: 'Stock reduced successfully' };
            
        } catch (error) {
            console.error('Error reducing stock for order:', error);
            throw error;
        } finally {
            await session.endSession();
        }
    }

    async validateStockForOrder(orderItems: Array<{productId: string; size: string; quantity: number; productName?: string }>) {

        if (!orderItems || orderItems.length === 0) throw new BadRequestError('No order items provided for stock validation');

        return this._validateStockAvailability(orderItems);
    }

    private async _validateStockAvailability(orderItems: Array<{ productId: string; size: string; quantity: number; productName?: string }>) {
        const insufficientItems = [];

        const stockItems = orderItems.map(item => ({ productId: item.productId, size: item.size }));
        
        const currentStocks = await this._productRepository.getMultipleProductStocks(stockItems);

        for (let i = 0; i < orderItems.length; i++) {
            const orderItem = orderItems[i];
            const currentStock = currentStocks[i];

            if (currentStock.stock === 0) {
                const exists = await this._productRepository.checkProductSizeExists(
                    orderItem.productId, 
                    orderItem.size
                );
                
                if (!exists) {
                    insufficientItems.push({
                        productId: orderItem.productId,
                        productName: orderItem.productName,
                        size: orderItem.size,
                        requestedQuantity: orderItem.quantity,
                        availableStock: 0,
                        reason: 'Product or size not found'
                    });
                    continue;
                }
            }

            if (currentStock.stock < orderItem.quantity) {
                insufficientItems.push({
                    productId: orderItem.productId,
                    productName: orderItem.productName,
                    size: orderItem.size,
                    requestedQuantity: orderItem.quantity,
                    availableStock: currentStock.stock,
                    reason: 'Insufficient stock'
                });
            }
        }

        if (insufficientItems.length > 0) {
            const errorMessage = insufficientItems.map(item => 
                `${item.productName || item.productId} (${item.size}): ` +
                `requested ${item.requestedQuantity}, available ${item.availableStock} - ${item.reason}`
            ).join('; ');

            throw new BadRequestError(`Stock validation failed: ${errorMessage}`);
        }

        return { success: true, message: 'Stock validation passed' };
    }

    async getProductsBySubcategory(subcategoryId: string, params: SearchProductsParams) {
        const { page, limit } = params;

        return this._productRepository.getProductsBySubcategory(subcategoryId, { page, limit});
    }

    async addProductRating(productId: string, userId: string, rating: number, review?: string) {
        const product = await this._productRepository.getProductById(productId);
        if (!product) throw new NotFoundError('Product not found');

        if (rating < 1 || rating > 5) {
            throw new BadRequestError('Rating must be between 1 and 5');
        }

        // Check if user already rated this product
        const existingRatingIndex = product.ratings.findIndex(
            r => r.userId.toString() === userId
        );

        const ratingData = {
            userId: new mongoose.Types.ObjectId(userId), // ✅ Convert string to ObjectId
            value: rating,
            review: review || '',
            createdAt: new Date()
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
            ratings: updatedRatings 
        });
    }


    async getProductRatings(productId: string, page: number = 1, limit: number = 10) {
        const product = await this._productRepository.getProductById(productId);
        if(!product) throw new NotFoundError('Product not found');

        const startIndex = (page -1) * limit;
        const endIndex = startIndex + limit;
        const paginatedRatings = product.ratings
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(startIndex, endIndex);

        return {
            ratings: paginatedRatings,
            total: product.ratings.length,
            page,
            pages: Math.ceil(product.ratings.length / limit),
            averageRating: product.ratings.length > 0 
                ? product.ratings.reduce((sum, r) => sum + r.value, 0) / product.ratings.length 
                : 0
        };
    }

    private async validateCategorySubcategoryRelationship(categoryId: string, subcategoryId?: string) {
        if(!subcategoryId) return

        try {
            const subcategory = await subcategoryService.getSubcategoryById(subcategoryId);
            if (subcategory.category.toString() !== categoryId) {
                throw new BadRequestError('Subcategory does not belong to the specified category');
            }
        } catch (error) {
            if (error instanceof NotFoundError) {
                throw new BadRequestError('Subcategory not found');
            }
            throw error;
        }
    }
}

export default new ProductService(new ProductRepository());