import categoryModel from "../models/category.model";
import subcategoryModel from "../models/subcategory.model";

export interface ICreateSubcategoryParams {
    name: string;
    category: string;
    description?: string;
    image?: string;
    isActive?: boolean;
}

export interface IUpdateSubCategoryParams {
    name?: string;
    category?: string;
    description?: string;
    image?: string;
    isactive?: boolean;
}

export interface IGetSubcategoriesParams { 
    page?: number;
    limit?: number;
    isActive?: boolean;
    searchTerm?: string;
}

export class SubcategoryRepository {
    private _model = subcategoryModel;

    async createSubcategory(params: ICreateSubcategoryParams) {
        return this._model.create(params);
    }

    async getSubcategoryById(id: string) {
        return this._model.findById(id);
    }

    async getSubcategoryByName(name: string, categoryId: string) {
        return this._model.findOne({ name: name.trim(), category: categoryId, isActive: true });
    }

    async getSubcategoriesByCategory(categoryId: string) {
        return this._model.find({ category: categoryId, isActive: true }).sort({ name: 1 });
    }

    async getAllSubcategories() {
        return this._model.find({ isActive: true }).sort({ name: 1 });
    }

    async getSubcategoriesWithPagination(params: IGetSubcategoriesParams) {
        const { page = 1, limit = 10, isActive, searchTerm } = params;
        const skip = (page - 1) * limit;

        const filter: any = {};
        if(typeof isActive === 'boolean') {
            filter.isActive = isActive;
        }

        if(searchTerm) {
            filter.$text = { $search: searchTerm }
        }

        const [subcategories, total] = await Promise.all([
            this._model
                .find(filter)
                .sort(searchTerm ? { score: { $meta: 'textScore' }} : { name: 1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            this._model.countDocuments(filter)
        ]);

        if (subcategories.length === 0) {
            return {
                subcategories: [],
                total,
                totalPages: Math.ceil(total / limit),
                currentPage: page
            };
        }

        const categoryIds = [...new Set(subcategories.map(sc => sc.category.toString()))];
        const categories = await this.fetchCategoriesByIds(categoryIds);

        const categoryMap = new Map();
        categories.forEach(cat => {
            categoryMap.set(cat._id.toString(), cat);
        });

        const subcategoriesWithCategories = subcategories.map(sc => ({
            ...sc,
            category: categoryMap.get(sc.category.toString()) || null
        }));

        return {
            subcategories: subcategoriesWithCategories,
            total,
            totalPages: Math.ceil(total / limit),
            currentPage: page
        };
    }

    private async fetchCategoriesByIds(categoryIds: string[]) {
        return categoryModel
            .find({ 
                _id: { $in: categoryIds },
                isActive: true 
            })
            .select('_id name description image isActive')
            .lean();
    }

    async updateSubcategory(id: string, params: IUpdateSubCategoryParams) {
        return this._model.findByIdAndUpdate(
            id, 
            params,
            { new: true, runValidators: true }
        )
    }

    async deleteSubcategory(id: string) {
        return this._model.findByIdAndDelete(id);
    }

    async searchSubcategories(searchTerm : string) {
        return this._model.find({
            $text: { $search: searchTerm },
            isActive: true
        }).sort({ score: { $meta: 'textScore' }})
    }
}