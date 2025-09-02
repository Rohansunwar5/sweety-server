import mongoose from "mongoose";
import productModel, { ISizeStock } from "../models/product.model";

export interface CreateProductParams {
    name: string;
    code: string;
    category: string;
    subcategory?: string;
    sizeStock: ISizeStock[];
    price: number;
    originalPrice?: number;
    description?: string;
    images: string[];
    sizeChart?: string;
    isActive?: boolean;
    tags?: string [];
}

export interface CreateProductWithImagesParams extends Omit<CreateProductParams, 'images'> {
    files?: Express.Multer.File[];
    existingImages?: string[];
}

export interface UpdateProductParams {
    name?: string;
    code?: string;
    category?: string;
    subcategory?: string;
    sizeStock?: ISizeStock[];
    price?: number;
    originalPrice?: number;
    description?: string;
    images?: string [];
    sizeChart?: string;
    isActive?: boolean;
    tags?: string[];
    ratings?: Array< {
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
    filters?: Record<string , any>;
}

export interface UpdateStockParams {
    productId: string;
    size: string;
    quantity: number;
}

export class ProductRepository {
    private _model = productModel;

    async createProduct(params: CreateProductParams) {
        return this._model.create(params);
    }

    async updateProductStock(params: UpdateStockParams) {
        const { productId, size, quantity } = params;
        
        return this._model.findOneAndUpdate(
            { 
                _id: productId,
                "sizeStock.size": size 
            },
            { $inc: { "sizeStock.$.stock": quantity } },
            { new: true }
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
        if (filters.subcategory) query.subcategory = filters.subcategory;
        if (filters.minPrice || filters.maxPrice) {
            query.price = {};
            if (filters.minPrice) query.price.$gte = Number(filters.minPrice);
            if (filters.maxPrice) query.price.$lte = Number(filters.maxPrice);
        }
        if (filters.size) {
            query['sizeStock.size'] = filters.size;
            query['sizeStock.stock'] = { $gt: 0 };
        }
        
        const [products, total] = await Promise.all([
            this._model.find(query)
                .sort(sort || '-createdAt')
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

    async getProductsByCategory(categoryId: string, params: Omit<ListProductsParams, 'filters'>) {
        const { page, limit } = params;

        const query = { 
            category: categoryId, 
            isActive: true,
            'sizeStock.stock': { $gt: 0 }
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

    async getAvailableSizes(productId: string): Promise<ISizeStock[]> {
        const product = await this._model.findById(productId)
            .select('sizeStock');
        return product?.sizeStock.filter(s => s.stock > 0) || [];
    }
    
    async searchProducts(query: string, params: Omit<ListProductsParams, 'filters'> & { categoryId?: string; subcategoryId?: string }) {
        const { page, limit, categoryId, subcategoryId } = params;
        
        const searchQuery: any = { 
            $text: { $search: query }, 
            isActive: true,
            'sizeStock.stock': { $gt: 0 }
        };

        if (categoryId) searchQuery.category = categoryId;
        if (subcategoryId) searchQuery.subcategory = subcategoryId;

        const [products, total] = await Promise.all([
            this._model.find(searchQuery)
                .sort({ score: { $meta: 'textScore' } })
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

    async reduceProductStock(productId: string, size: string, quantity: number, session?: any) {
        return this._model.updateOne(
            { 
                _id: productId,
                "sizeStock.size": size,
                "sizeStock.stock": { $gte: quantity } // Ensure sufficient stock
            },
            { $inc: { "sizeStock.$.stock": -quantity } },
            { session }
        );
    }

    async getProductStock(productId: string, size: string) {
        const product = await this._model.findOne(
            { _id: productId, "sizeStock.size": size },
            { "sizeStock.$": 1 }
        );
        
        return product?.sizeStock[0]?.stock || 0;
    }

    async getMultipleProductStocks(items: Array<{ productId: string; size: string }>) {
        const stockPromises = items.map(item => 
            this.getProductStock(item.productId, item.size)
                .then(stock => ({
                    productId: item.productId,
                    size: item.size,
                    stock
                }))
        );
        
        return Promise.all(stockPromises);
    }

    async checkProductSizeExists(productId: string, size: string) {
        const product = await this._model.findOne({
            _id: productId,
            "sizeStock.size": size
        });
        
        return !!product;
    }

    async startSession() {
        return this._model.db.startSession();
    }

    async getProductsBySubcategory(subcategoryId: string, params: Omit<ListProductsParams, 'filters'>) {
        const { page, limit } = params;

        const query = { subcategory: subcategoryId, isActive: true, 'sizeStock.stock': { $gt: 0 }};

        const [ products, total ] = await Promise.all([
            this._model.find(query).skip((page - 1) * limit).limit(limit),
            this._model.countDocuments(query)
        ]);

        return { products, total, page, pages: Math.ceil(total/limit)};
    }

    async getLowStockProducts(threshold: number = 5) {
        return this._model.find({
        isActive: true,
        'sizeStock.stock': { $lte: threshold, $gt: 0 }
        }).select('name code sizeStock');
    }

    async getOutOfStockProducts() {
        return this._model.find({
            isActive: true,
            'sizeStock.stock': 0
        }).select('name code sizeStock');
    }
}