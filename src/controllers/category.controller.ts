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