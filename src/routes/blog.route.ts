import { Router } from "express";
import isAdminLoggedIn from "../middlewares/isAdminLoggedIn.middleware";
import { asyncHandler } from "../utils/asynchandler";
import { createABlog, deleteABlog, editABlog, getABlog, getAllBlogs } from "../controllers/blog.controller";
import { uploadBlogImages } from "../middlewares/multer.middleware";

const blogRouter = Router();

blogRouter.get('/', asyncHandler(getAllBlogs));
blogRouter.get('/:blogId', asyncHandler(getABlog));
blogRouter.post('/create', isAdminLoggedIn, uploadBlogImages, asyncHandler(createABlog));
blogRouter.put('/edit/:blogId', isAdminLoggedIn, uploadBlogImages, asyncHandler(editABlog));
blogRouter.delete('/delete/:blogId', isAdminLoggedIn, asyncHandler(deleteABlog));

export default blogRouter;