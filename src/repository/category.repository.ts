import categoryModel, { ICategory } from "../models/category.model";

export interface ICreateCategoryParams {
    name: string;
    description?: string;
    image?: string;
}

export interface IUpdateCategoryParams {
    name?: string;
    category?: string;
    description?: string;
    image?: string;
    isActive?: boolean;
}

export class CategoryRepository {
    private _model = categoryModel;

    async createCategory(params: ICreateCategoryParams): Promise<ICategory> {
        return this._model.create(params);
    }

    async getAllCategories(): Promise <ICategory[]> {
        return this._model.find({ isActive: true });
    }

    async deleteCategory(id: string) {
        return this._model.findByIdAndDelete(id);
    }

    async getCategoryById(id: string) {
        return this._model.findById(id);
    }

    async updateCategory(id: string, params: IUpdateCategoryParams): Promise<ICategory | null> {
        return this._model.findByIdAndUpdate(
            id, 
            params, 
            { new: true, runValidators: true }
        );
    }

    async getCategoryByName(name: string): Promise<ICategory | null> {
        return this._model.findOne({ name: name.trim(), isActive: true });
    }

    async searchCategories(searchTerm: string): Promise<ICategory[]> {
        return this._model.find({
            $text: { $search: searchTerm },
            isActive: true
        }).sort({ score: { $meta: 'textScore' } });
    }

    async getCategoriesWithPagination(page: number = 1, limit: number = 10) {
        const skip = (page - 1) * limit;
        
        const [categories, total] = await Promise.all([
            this._model
                .find({ isActive: true })
                .sort({ name: 1 })
                .skip(skip)
                .limit(limit),
            this._model.countDocuments({ isActive: true })
        ]);

        return {
            categories,
            total,
            totalPages: Math.ceil(total / limit),
            currentPage: page
        };
    }

    async getCategoriesWithSubcategories() {
        return this._model.aggregate([
            { $match: { isActive: true } },
            {
                $lookup: {
                    from: 'subcategories',
                    localField: '_id',
                    foreignField: 'category',
                    as: 'subcategories'
                }
            },
            { $sort: { name: 1 } }
        ]);
    }
}