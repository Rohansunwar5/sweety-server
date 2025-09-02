import { BadRequestError } from "../errors/bad-request.error";
import { InternalServerError } from "../errors/internal-server.error";
import { NotFoundError } from "../errors/not-found.error";
import { IUpdateCategoryParams } from "../repository/category.repository";
import { ICreateSubcategoryParams, IGetSubcategoriesParams, IUpdateSubCategoryParams, SubcategoryRepository } from "../repository/subcategory.repository";
import categoryService from "./category.service";



class SubcategoryService {
    constructor (private readonly _subcategoryRepository: SubcategoryRepository) {}

    async createSubcategory(params: ICreateSubcategoryParams) {
        const category = await categoryService.getCategoryById(params.category);
        if(!category) {
            throw new NotFoundError('Category not found');
        }

        const exisitngSubcategory = await this._subcategoryRepository.getSubcategoryByName(params.name.trim(), params.category);

        if(exisitngSubcategory) throw new BadRequestError('Subcategory with this name already exisits in this category');

        const subcategory = await this._subcategoryRepository.createSubcategory({
            ...params,
            name: params.name.trim()
        });

        if(!subcategory) {
            throw new InternalServerError('Failed to create subcategory');
        }

        return subcategory;
    }

    async getSubcategoryById(id: string) {
        const subcategory = await this._subcategoryRepository.getSubcategoryById(id);
        if(!subcategory) throw new NotFoundError('Subcategory not found');

        return subcategory;
    }

    async getSubcategoriesByCategory(categoryId: string) {
        const category = await categoryService.getCategoryById(categoryId);
        if(!category) throw new NotFoundError('Category not found');

        return this._subcategoryRepository.getSubcategoriesByCategory(categoryId);
    }

    async getAllSubcategories() {
        return this._subcategoryRepository.getAllSubcategories();
    }

    async getSubcategoriesWithPagination(params: IGetSubcategoriesParams) {
        const { page = 1, limit = 10 } = params;

        if(page < 1) throw new BadRequestError('Page must be greater than 0');

        if(limit < 1 || limit > 50) throw new BadRequestError('Limit must be between 1 nad 50');

        return this._subcategoryRepository.getSubcategoriesWithPagination(params);
    }

    async updateSubcategory(id: string, params: IUpdateSubCategoryParams) {
        const existingSubcategory = await this._subcategoryRepository.getSubcategoryById(id);

        if(!existingSubcategory) throw new NotFoundError('Subcategory not found');

        if (params.name && params.name !== existingSubcategory.name) {
            const categoryId = params.category || existingSubcategory.category.toString();
            const duplicateSubcategory = await this._subcategoryRepository.getSubcategoryByName(
                params.name.trim(), 
                categoryId
            );
            if (duplicateSubcategory && duplicateSubcategory._id.toString() !== id) {
                throw new BadRequestError('Subcategory with this name already exists in this category');
            }
        }

        const updatedParams = {
            ...params,
            name: params.name ? params.name.trim() : params.name
        };

        const updatedSubCategory = await this._subcategoryRepository.updateSubcategory(id, updatedParams);
        if(!updatedSubCategory) throw new InternalServerError('Failed to update subcategory');

        return updatedSubCategory;
    }

    async deleteSubcategory(id: string) {
        const subcategory = await this._subcategoryRepository.getSubcategoryById(id);
        if(!subcategory) throw new NotFoundError('Subcategory not found');

        // TODO: Check if subcategory has products before deleting

        const deletedSubcategory = await this._subcategoryRepository.deleteSubcategory(id);
        if(!deletedSubcategory) throw new InternalServerError('Failed to delete subcategory');

        return deletedSubcategory;
    }

    async searchSubcategories(searchTerm: string) {
        if(!searchTerm?.trim()) throw new BadRequestError('Search term is required');

        return this._subcategoryRepository.searchSubcategories(searchTerm.trim());
    }
}

export default new SubcategoryService(new SubcategoryRepository());