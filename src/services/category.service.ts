import { BadRequestError } from "../errors/bad-request.error";
import { NotFoundError } from "../errors/not-found.error";
import { CategoryRepository } from "../repository/category.repository";

class CategoryService {
    constructor(private readonly _categoryRepository: CategoryRepository) {}

    async createCategory (params: {
        name: string;
        description?: string;
        image?: string;
    }) {
        if(!params.name) throw new BadRequestError('Category name is required');

        return this._categoryRepository.createCategory(params);
    }

    async getAllCategories() {
        return this._categoryRepository.getAllCategories();
    }

    async getCateforyById(id: string) {
        const response = await this._categoryRepository.getCategoryById(id);
        if(!response) throw new NotFoundError('category not found');

        return response;
    } 

    async deleteCategory(id: string) {
        if(!id) throw new BadRequestError('Category ID is required');

        const deletedCategory = await this._categoryRepository.deleteCategory(id);
        if(!deletedCategory) throw new NotFoundError('Category not found');

        return deletedCategory;
    }
}

export default new CategoryService(new CategoryRepository());