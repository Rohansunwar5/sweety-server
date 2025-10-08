import mongoose from "mongoose";
import productModel, { ISizeStock, IProductColor } from "../models/product.model";

export interface CreateProductParams {
    name: string;
    code: string;
    category: string;
    subcategories?: string[]; // Changed to array
    colors: IProductColor[];
    price: number;
    originalPrice?: number;
    description?: string;
    sizeChart?: string;
    isActive?: boolean;
    tags?: string[];
}

interface IGetProductsBySubcategoryParams {
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    minPrice?: number;
    maxPrice?: number;
    isActive?: boolean;
}

export interface CreateProductWithImagesParams extends Omit<CreateProductParams, 'images'> {
    files?: Express.Multer.File[];
    existingImages?: string[];
}

export interface UpdateProductParams {
    name?: string;
    code?: string;
    category?: string;
    subcategories?: string[]; // Changed to array
    colors?: IProductColor[];
    price?: number;
    originalPrice?: number;
    description?: string;
    images?: string[];
    sizeChart?: string;
    isActive?: boolean;
    tags?: string[];
    ratings?: Array<{
        userId: mongoose.Types.ObjectId;
        value: number;
        review?: string;
        createdAt: Date;
    }>;
}

export interface UpdateProductWithImagesParams extends Omit<UpdateProductParams, 'images'> {
    files?: Express.Multer.File[];
    existingImages?: string[];
}

export interface ListProductsParams {
    page: number;
    limit: number;
    sort?: string;
    filters?: Record<string, any>;
}

export interface UpdateStockParams {
    productId: string;
    colorName: string;
    size: string;
    quantity: number;
}

export class ProductRepository {
    private _model = productModel;

    async createProduct(params: CreateProductParams) {
        return this._model.create(params);
    }

    async updateProductStock(params: UpdateStockParams) {
        const { productId, colorName, size, quantity } = params;
        
        return this._model.findOneAndUpdate(
            {
                _id: productId,
                "colors.colorName": colorName,
                "colors.sizeStock.size": size
            },
            { $inc: { "colors.$[color].sizeStock.$[size].stock": quantity } },
            {
                new: true,
                arrayFilters: [
                    { "color.colorName": colorName },
                    { "size.size": size }
                ]
            }
        );
    }

    async updateProduct(id: string, params: UpdateProductParams) {
        return this._model.findByIdAndUpdate(
            id, 
            params, 
            { new: true, runValidators: true }
        );
    }

    async getProductById(id: string) {
        return this._model.findById(id);
    }

    async getProductByCode(code: string) {
        return this._model.findOne({ code });
    }

    async listProducts(params: ListProductsParams) {
        const { page, limit, sort, filters = {} } = params;

        const query: Record<string, any> = { isActive: true };

        if (filters.category) query.category = filters.category;
        
        // Updated to handle array of subcategories
        if (filters.subcategory) {
            query.subcategories = filters.subcategory;
        }
        
        // Support filtering by multiple subcategories
        if (filters.subcategories && Array.isArray(filters.subcategories)) {
            query.subcategories = { $in: filters.subcategories };
        }
        
        if (filters.minPrice || filters.maxPrice) {
            query.price = {};
            if (filters.minPrice) query.price.$gte = Number(filters.minPrice);
            if (filters.maxPrice) query.price.$lte = Number(filters.maxPrice);
        }

        if (filters.size) {
            // Filter products with at least one color that has this size with stock > 0
            query["colors.sizeStock"] = {
                $elemMatch: {
                    size: filters.size,
                    stock: { $gt: 0 }
                }
            };
        }

        if (filters.colorName) {
            query["colors.colorName"] = filters.colorName;
        }

        const [products, total] = await Promise.all([
            this._model.find(query)
                .sort(sort || "-createdAt")
                .skip((page - 1) * limit)
                .limit(limit),
            this._model.countDocuments(query)
        ]);

        return {
            products,
            total,
            page,
            pages: Math.ceil(total / limit)
        };
    }

    async getProductsByCategory(categoryId: string, params: Omit<ListProductsParams, "filters">) {
        const { page, limit } = params;

        const query = {
            category: categoryId,
            isActive: true,
            "colors.sizeStock.stock": { $gt: 0 }
        };

        const [products, total] = await Promise.all([
            this._model.find(query)
                .skip((page - 1) * limit)
                .limit(limit),
            this._model.countDocuments(query)
        ]);

        return {
            products,
            total,
            page,
            pages: Math.ceil(total / limit)
        };
    }

    async getAvailableSizes(productId: string, colorName: string): Promise<ISizeStock[]> {
        const product = await this._model.findOne(
            { _id: productId, "colors.colorName": colorName },
            { "colors.$": 1 }
        );

        const color = product?.colors?.[0];
        return color?.sizeStock.filter(s => s.stock > 0) || [];
    }
    
    async searchProducts(
        query: string, 
        params: Omit<ListProductsParams, "filters"> & { 
            categoryId?: string; 
            subcategoryId?: string;
            subcategoryIds?: string[]; // Added support for multiple subcategories
        }
    ) {
        const { page, limit, categoryId, subcategoryId, subcategoryIds } = params;

        const searchQuery: any = {
            $text: { $search: query },
            isActive: true,
            "colors.sizeStock.stock": { $gt: 0 }
        };

        if (categoryId) searchQuery.category = categoryId;
        
        // Support single or multiple subcategories
        if (subcategoryId) {
            searchQuery.subcategories = subcategoryId;
        } else if (subcategoryIds && subcategoryIds.length > 0) {
            searchQuery.subcategories = { $in: subcategoryIds };
        }

        const [products, total] = await Promise.all([
            this._model.find(searchQuery)
                .sort({ score: { $meta: "textScore" } })
                .skip((page - 1) * limit)
                .limit(limit),
            this._model.countDocuments(searchQuery)
        ]);

        return {
            products,
            total,
            page,
            pages: Math.ceil(total / limit)
        };
    }

    async reduceProductStock(productId: string, colorName: string, size: string, quantity: number, session?: any) {
        return this._model.updateOne(
            {
                _id: productId,
                "colors.colorName": colorName,
                "colors.sizeStock.size": size,
                "colors.sizeStock.stock": { $gte: quantity }
            },
            { $inc: { "colors.$[color].sizeStock.$[size].stock": -quantity } },
            {
                session,
                arrayFilters: [
                    { "color.colorName": colorName },
                    { "size.size": size }
                ]
            }
        );
    }

    async getProductStock(productId: string, colorName: string, size: string) {
        const product = await this._model.findOne(
            {
                _id: productId,
                "colors.colorName": colorName,
                "colors.sizeStock.size": size
            },
            {
                "colors.$": 1
            }
        );

        if (!product?.colors?.length) return 0;

        const color = product.colors[0];
        const sizeStock = color.sizeStock.find(ss => ss.size === size);
        return sizeStock?.stock || 0;
    }

    async getMultipleProductStocks(items: Array<{ productId: string; colorName: string; size: string }>) {
        const stockPromises = items.map(item =>
            this.getProductStock(item.productId, item.colorName, item.size).then(stock => ({
                productId: item.productId,
                colorName: item.colorName,
                size: item.size,
                stock
            }))
        );

        return Promise.all(stockPromises);
    }

    async checkProductSizeExists(productId: string, colorName: string, size: string) {
        const product = await this._model.findOne({
            _id: productId,
            "colors.colorName": colorName,
            "colors.sizeStock.size": size
        });

        return !!product;
    }

    async startSession() {
        return this._model.db.startSession();
    }

    // Updated to handle multiple subcategories
    async getProductsBySubcategory(subcategoryId: string, params: Omit<ListProductsParams, "filters">) {
        const { page, limit } = params;

        const query = {
            subcategories: subcategoryId, // MongoDB will match if subcategoryId is in the array
            isActive: true,
            "colors.sizeStock.stock": { $gt: 0 }
        };

        const [products, total] = await Promise.all([
            this._model.find(query).skip((page - 1) * limit).limit(limit),
            this._model.countDocuments(query)
        ]);

        return { products, total, page, pages: Math.ceil(total / limit) };
    }

    // Updated to handle multiple subcategories
    async getProductsBySubcategoryWithStock(
        subcategoryId: string,
        params: IGetProductsBySubcategoryParams = {}
    ) {
        const {
            page = 1,
            limit = 10,
            sortBy = 'createdAt',
            sortOrder = 'desc',
            minPrice,
            maxPrice,
            isActive = true
        } = params;

        const skip = (page - 1) * limit;

        // Convert string subcategoryId to ObjectId
        const subcategoryObjectId = new mongoose.Types.ObjectId(subcategoryId);

        // Build filter with ObjectId - updated to match array field
        const filter: any = { subcategories: subcategoryObjectId };
        
        if (typeof isActive === 'boolean') {
            filter.isActive = isActive;
        }

        if (minPrice !== undefined || maxPrice !== undefined) {
            filter.price = {};
            if (minPrice !== undefined) filter.price.$gte = minPrice;
            if (maxPrice !== undefined) filter.price.$lte = maxPrice;
        }

        console.log('Filter being used:', JSON.stringify(filter, null, 2));

        // Aggregation pipeline to calculate total stock per product
        const pipeline = [
            { $match: filter },
            {
                $addFields: {
                    totalStock: {
                        $sum: {
                            $map: {
                                input: "$colors",
                                as: "color",
                                in: {
                                    $sum: {
                                        $map: {
                                            input: "$$color.sizeStock",
                                            as: "sizeStock",
                                            in: "$$sizeStock.stock"
                                        }
                                    }
                                }
                            }
                        }
                    },
                    availableColors: { $size: "$colors" },
                    availableSizes: {
                        $size: {
                            $reduce: {
                                input: "$colors",
                                initialValue: [],
                                in: {
                                    $setUnion: [
                                        "$$value",
                                        {
                                            $map: {
                                                input: "$$this.sizeStock",
                                                as: "sizeStock",
                                                in: "$$sizeStock.size"
                                            }
                                        }
                                    ]
                                }
                            }
                        }
                    }
                }
            },
            { $sort: { [sortBy]: (sortOrder === 'asc' ? 1 : -1) as 1 | -1 } },
            {
                $facet: {
                    products: [
                        { $skip: skip },
                        { $limit: limit }
                    ],
                    totalCount: [
                        { $count: "total" }
                    ]
                }
            }
        ];

        console.log('Aggregation pipeline:', JSON.stringify(pipeline[0], null, 2));

        const [result] = await this._model.aggregate(pipeline);
        const products = result.products;
        const total = result.totalCount[0]?.total || 0;

        console.log('Query results - Total:', total, 'Products found:', products.length);

        return {
            products,
            total,
            totalPages: Math.ceil(total / limit),
            currentPage: page
        };
    }

    async getProductsBySubcategories(
        subcategoryIds: string[],
        params: Omit<ListProductsParams, "filters">
    ) {
        const { page, limit } = params;

        const query = {
            subcategories: { $in: subcategoryIds },
            isActive: true,
            "colors.sizeStock.stock": { $gt: 0 }
        };

        const [products, total] = await Promise.all([
            this._model.find(query).skip((page - 1) * limit).limit(limit),
            this._model.countDocuments(query)
        ]);

        return { products, total, page, pages: Math.ceil(total / limit) };
    }

    async addSubcategoryToProduct(productId: string, subcategoryId: string) {
        return this._model.findByIdAndUpdate(
            productId,
            { $addToSet: { subcategories: subcategoryId } },
            { new: true, runValidators: true }
        );
    }

    async removeSubcategoryFromProduct(productId: string, subcategoryId: string) {
        return this._model.findByIdAndUpdate(
            productId,
            { $pull: { subcategories: subcategoryId } },
            { new: true }
        );
    }

    async getLowStockProducts(threshold: number = 5) {
        return this._model.find({
            isActive: true,
            "colors.sizeStock.stock": { $lte: threshold, $gt: 0 }
        }).select("name code colors");
    }

    async getOutOfStockProducts() {
        return this._model.find({
            isActive: true,
            "colors.sizeStock.stock": 0
        }).select("name code colors");
    }
}