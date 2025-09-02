import { Router } from 'express'
import { asyncHandler } from '../utils/asynchandler'
import { createSubcategory, deleteSubcategory, getAllSubcategories, getSubcategoriesByCategory, getSubcategoriesWithPagination, getSubcategoryById, searchSubcategories, updateSubcategory } from '../controllers/subcategory.controller';
import isAdminLoggedIn from '../middlewares/isAdminLoggedIn.middleware';

const subcategoryRouter = Router();

subcategoryRouter.get('/', asyncHandler(getAllSubcategories));
subcategoryRouter.get('/paginated', asyncHandler(getSubcategoriesWithPagination));
subcategoryRouter.get('/search', asyncHandler(searchSubcategories));
subcategoryRouter.get('/:id', asyncHandler(getSubcategoryById));
subcategoryRouter.get('/category/:categoryId', asyncHandler(getSubcategoriesByCategory));

subcategoryRouter.post('/', isAdminLoggedIn, asyncHandler(createSubcategory));
subcategoryRouter.put('/:id', isAdminLoggedIn, asyncHandler(updateSubcategory));
subcategoryRouter.delete('/:id', isAdminLoggedIn, asyncHandler(deleteSubcategory));

export default subcategoryRouter;