import { BadRequestError } from "../errors/bad-request.error";
import { NotFoundError } from "../errors/not-found.error";
import { CategoryRepository } from "../repository/category.repository";

class CategoryService {
    constructor(private readonly _categoryRepository: CategoryRepository) {}

    async createCategory (params: { name: string; description?: string; image?: string }) {
        const existingCategory = await this._categoryRepository.getCategoryByName(params.name);
        if (existingCategory) {
            throw new BadRequestError('Category with this name already exists');
        }

        const category = await this._categoryRepository.createCategory({
            ...params,
            name: params.name.trim()
        });

        return category;
    }

    async getAllCategories() {
        return this._categoryRepository.getAllCategories();
    }

    async getCategoryById(id: string) {
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

    async updateCategory(id: string, params: {
        name?: string;
        description?: string;
        image?: string;
        isActive?: boolean;
    }) {
        if (!id) throw new BadRequestError('Category ID is required');

        const existingCategory = await this._categoryRepository.getCategoryById(id);
        if (!existingCategory) throw new NotFoundError('Category not found');

        // Check if name already exists (if name is being updated)
        if (params.name && params.name !== existingCategory.name) {
            const duplicateCategory = await this._categoryRepository.getCategoryByName(params.name);
            if (duplicateCategory) {
                throw new BadRequestError('Category with this name already exists');
            }
        }

        const updatedCategory = await this._categoryRepository.updateCategory(id, params);
        if (!updatedCategory) throw new NotFoundError('Failed to update category');

        return updatedCategory;
    }

    async getCategoryByName(name: string) {
        if (!name) throw new BadRequestError('Category name is required');

        const category = await this._categoryRepository.getCategoryByName(name);
        if (!category) throw new NotFoundError('Category not found');

        return category;
    }

    async searchCategories(searchTerm: string) {
        if (!searchTerm?.trim()) throw new BadRequestError('Search term is required');

        return this._categoryRepository.searchCategories(searchTerm.trim());
    }

    async getCategoriesWithPagination(page: number = 1, limit: number = 10) {
        if (page < 1) throw new BadRequestError('Page must be greater than 0');
        if (limit < 1 || limit > 50) throw new BadRequestError('Limit must be between 1 and 50');

        return this._categoryRepository.getCategoriesWithPagination(page, limit);
    }
}

export default new CategoryService(new CategoryRepository());