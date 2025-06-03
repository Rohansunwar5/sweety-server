import { Router } from "express";
import isLoggedIn from "../middlewares/isLoggedIn.middleware";
import { asyncHandler } from "../utils/asynchandler";
import { createProduct, getAvailableSizes, getProductById, getProductsByCategory, listProducts, searchProducts, updateProduct } from "../controllers/product.controllers";

const productRouter = Router();

productRouter.post('/create', isLoggedIn, asyncHandler(createProduct));
productRouter.get('/search', asyncHandler(searchProducts));
productRouter.patch('/update/:id', isLoggedIn, asyncHandler(updateProduct));
productRouter.get('/', asyncHandler(listProducts));
productRouter.get('/:id', asyncHandler(getProductById));
productRouter.get('/:productId/sizes', asyncHandler(getAvailableSizes));
productRouter.get('/category/:categoryId', asyncHandler(getProductsByCategory));

export default productRouter;