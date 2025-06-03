import { BadRequestError } from "../errors/bad-request.error";
import { InternalServerError } from "../errors/internal-server.error";
import { NotFoundError } from "../errors/not-found.error";
import { CreateProductParams, ListProductsParams, ProductRepository, UpdateProductParams, UpdateStockParams } from "../repository/product.repository";

interface SearchProductsParams {
  page: number;
  limit: number;
}

class ProductService {
    constructor(private readonly _productRepository: ProductRepository) {}

    async createProduct(params: CreateProductParams) {
        if (!params.sizeStock || params.sizeStock.length === 0) {
            throw new BadRequestError('At least one size with stock must be provided');
        }
        const existingProduct = await this._productRepository.getProductByCode(params.code);
        if (existingProduct) throw new BadRequestError('Product with this code already exists')

        const product = await this._productRepository.createProduct(params);
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


    async updateProduct(id: string, params: UpdateProductParams | any) {
        const product = await this._productRepository.getProductById(id);
        if(!product) throw new NotFoundError('Product not found');

        if(params.code && params.code !== product.code) {
            const existingProduct = await this._productRepository.getProductByCode(params.code);
            if (existingProduct) throw new BadRequestError('Product with this code already exists')
        }

        const updatedProduct = await this._productRepository.updateProduct(id, params);
        if(!updatedProduct) throw new InternalServerError('Failed to update product')

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

        if (!query.trim()) throw new BadRequestError('Search query cannot be empty')

        return this._productRepository.searchProducts(query, { page, limit});
    }

    async getAvailableSizes(productId: string) {
        return this._productRepository.getAvailableSizes(productId);
    }
}

export default new ProductService(new ProductRepository());