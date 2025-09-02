import { NextFunction, Request, Response } from "express";
import subcategoryService from "../services/subcategory.service";

export const createSubcategory = async (req:Request, res: Response, next: NextFunction) => {
    const { name, category, description, image, isActive } = req.body;
    const response = await subcategoryService.createSubcategory({ name, category, description, image, isActive });

    next(response);
}

export const getSubcategoryById = async (req:Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const response = await subcategoryService.getSubcategoryById(id);

    next(response);
}

export const getSubcategoriesByCategory = async (req: Request, res: Response, next: NextFunction) => {
    const { categoryId } = req.params;
    const response = await subcategoryService.getSubcategoriesByCategory(categoryId);

    next(response);
};

export const getAllSubcategories = async (req: Request, res: Response, next: NextFunction) => {
    const response = await subcategoryService.getAllSubcategories();

    next(response);
};

export const getSubcategoriesWithPagination = async (req: Request, res: Response, next: NextFunction) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const isActive = req.query.isActive as string | undefined;
    const searchTerm = req.query.search as string | undefined;

    const response = await subcategoryService.getSubcategoriesWithPagination({
        page,
        limit,
        isActive: isActive ? isActive === 'true' : undefined,
        searchTerm
    });

    next(response);
};

export const updateSubcategory = async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const { name, category, description, image } = req.body;

    const response = await subcategoryService.updateSubcategory(id, {
        name,
        category,
        description,
        image,
    });

    next(response);
};

export const deleteSubcategory = async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const response = await subcategoryService.deleteSubcategory(id);

    next(response);
};


export const searchSubcategories = async (req: Request, res: Response, next: NextFunction) => {
    const { q } = req.query;
    const response = await subcategoryService.searchSubcategories(q as string);

    next(response);
};