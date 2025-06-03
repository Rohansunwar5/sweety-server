import categoryModel, { ICategory } from "../models/category.model";

export interface ICreateCategoryParams {
    name: string;
    description?: string;
    image?: string;
}

export class CategoryRepository {
    private _model = categoryModel;

    async createCategory(params: ICreateCategoryParams): Promise<ICategory> {
        return this._model.create(params);
    }

    async getAllCategories(): Promise <ICategory[]> {
        return this._model.find({ isActive: true });
    }

    async deleteCategory(id: string): Promise<ICategory | null> {
        return this._model.findByIdAndDelete(id);
    }

    async getCategoryById(id: string) {
        return this._model.findById(id);
    }
}