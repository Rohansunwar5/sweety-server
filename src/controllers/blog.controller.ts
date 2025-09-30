import { NextFunction, Request, Response } from "express";
import blogService from "../services/blog.service";

export const getAllBlogs = async (req: Request, res: Response, next: NextFunction) => {
  const response = await blogService.getAllBlogs();
  next(response);
};

export const getABlog = async (req: Request, res: Response, next: NextFunction) => {
  const { blogId } = req.params;
  const response = await blogService.getABlog(blogId);
  next(response);
};

export const createABlog = async (req: Request, res: Response, next: NextFunction) => {
  const { blogName, title, designData, markup } = req.body;
  const file = req.file as Express.Multer.File;
  
  const response = await blogService.createBlog({
    blogName,
    title,
    designData: designData ? JSON.parse(designData) : null,
    markup,
    file,
  });
  
  next(response);
};

export const editABlog = async (req: Request, res: Response, next: NextFunction) => {
  const { blogId } = req.params;
  const { blogName, title, designData, markup } = req.body;
  const file = req.file as Express.Multer.File;
  
  const response = await blogService.editBlog({
    blogId,
    blogName,
    title,
    designData: designData ? JSON.parse(designData) : null,
    markup,
    file,
  });
  
  next(response);
};

export const deleteABlog = async (req: Request, res: Response, next: NextFunction) => {
  const { blogId } = req.params;
  const { user } = req;
  const response = await blogService.deleteABlog({ blogId, user });
  next(response);
};