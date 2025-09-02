import { NextFunction, Request, Response } from "express";
import categoryService from "../services/category.service";

export const createCategory = async (req: Request, res: Response, next: NextFunction) => {
    const { name , description, image } = req.body;
    const response = await categoryService.createCategory({ name, description, image });

    next(response);
}

export const getAllCategories = async (req: Request, res: Response, next: NextFunction) => {
    const response = await categoryService.getAllCategories();

    next(response);
}

export const deleteCategory = async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const response = await categoryService.deleteCategory(id);

    next(response);
}

export const updateCategory = async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const { name, description, image, isActive } = req.body;
    
    const response = await categoryService.updateCategory(id, {
        name,
        description,
        image,
        isActive
    });

    next(response);
};

export const getCategoryById = async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const response = await categoryService.getCategoryById(id);

    next(response);
};

export const searchCategories = async (req: Request, res: Response, next: NextFunction) => {
    const { q } = req.query;
    const response = await categoryService.searchCategories(q as string);

    next(response);
};

export const getCategoriesWithPagination = async (req: Request, res: Response, next: NextFunction) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    
    const response = await categoryService.getCategoriesWithPagination(page, limit);

    next(response);
};