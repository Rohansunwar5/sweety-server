import { Router } from "express";
import { asyncHandler } from "../utils/asynchandler";
import { createProduct, getAvailableSizes, getProductById, getProductsByCategory, listProducts, searchProducts, updateProduct, uploadColorImage } from "../controllers/product.controllers";
import isAdminLoggedIn from "../middlewares/isAdminLoggedIn.middleware";
import { productValidator, searchProductValidator, updateProductStockValidator } from "../middlewares/validators/auth.validator";
import { uploadProductImage } from "../middlewares/multer.middleware";

const productRouter = Router();

productRouter.post('/create', isAdminLoggedIn, uploadProductImage, asyncHandler(createProduct));
productRouter.post('/upload-color-image', isAdminLoggedIn, uploadProductImage, uploadColorImage);
productRouter.get('/search', searchProductValidator, asyncHandler(searchProducts));
productRouter.patch('/update/:id', isAdminLoggedIn, asyncHandler(updateProduct));
productRouter.get('/products', asyncHandler(listProducts));
productRouter.get('/:id', asyncHandler(getProductById));
productRouter.get('/:productId/colors/:colorName/sizes', updateProductStockValidator, asyncHandler(getAvailableSizes));
productRouter.get('/category/:categoryId', asyncHandler(getProductsByCategory));

export default productRouter;