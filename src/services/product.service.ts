import { BadRequestError } from "../errors/bad-request.error";
import { InternalServerError } from "../errors/internal-server.error";
import { NotFoundError } from "../errors/not-found.error";
import { CreateProductParams, CreateProductWithImagesParams, ListProductsParams, ProductRepository, UpdateProductParams, UpdateProductWithImagesParams, UpdateStockParams } from "../repository/product.repository";
import { uploadToCloudinary } from "../utils/cloudinary.util";

interface SearchProductsParams {
  page: number;
  limit: number;
}


class ProductService {
    
    constructor(private readonly _productRepository: ProductRepository) {}

    async createProduct(params: CreateProductWithImagesParams) {
        if (!params.sizeStock || params.sizeStock.length === 0) throw new BadRequestError('At least one size with stock must be provided')
        if (!params.code) throw new BadRequestError('Product code is required')

        const existingProduct = await this._productRepository.getProductByCode(params.code);
        if (existingProduct) throw new BadRequestError('Product with this code already exists')

        const imageUrls = await this.handleImageUploads({ files: params.files, existingImages: params.existingImages });

        const productParams: CreateProductParams = {
            name: params.name,
            code: params.code,
            category: params.category,
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

    async updateProductStock(params: UpdateStockParams) {
        const { productId, size, quantity } = params;
        
        if (!productId || !size || quantity === undefined) {
            throw new BadRequestError('Missing required fields for stock update');
        }

        const updatedProduct = await this._productRepository.updateProductStock(params);
        if (!updatedProduct) throw new NotFoundError('Product or size not found')

        return updatedProduct;
    }


    async updateProduct(id: string, params: UpdateProductWithImagesParams | any) {
         const product = await this._productRepository.getProductById(id);
        if (!product) throw new NotFoundError('Product not found')

        if (params.code && params.code !== product.code) {
            const existingProduct = await this._productRepository.getProductByCode(params.code);
            if (existingProduct) throw new BadRequestError('Product with this code already exists')
        }

        // Handle image uploads
        const imageUrls = params.files || params.existingImages 
            ? await this.handleImageUploads({
                files: params.files,
                existingImages: params.existingImages
            })
            : undefined;

        const updateParams: UpdateProductParams = {
            name: params.name,
            code: params.code,
            category: params.category,
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

     private async handleImageUploads(params: { 
        files?: Express.Multer.File[], 
        existingImages?: string[] 
    }): Promise<string[]> {
        let imageUrls: string[] = [];

        if (params.existingImages) {
            imageUrls = Array.isArray(params.existingImages) 
                ? params.existingImages 
                : [params.existingImages];
        }

        // Handle new image uploads
        if (params.files && params.files.length > 0) {
            const uploadPromises = params.files.map(file => 
                uploadToCloudinary(file)
            );
            const newImageUrls = await Promise.all(uploadPromises);
            imageUrls = [...imageUrls, ...newImageUrls];
        }

        if (imageUrls.length === 0) {
            throw new BadRequestError('At least one product image is required');
        }

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
}

export default new ProductService(new ProductRepository());