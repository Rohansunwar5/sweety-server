import { Router } from "express";
import { asyncHandler } from "../utils/asynchandler";
import { 
  createProduct, 
  getAvailableSizes, 
  getProductById, 
  getProductsByCategory, 
  getProductsBySubcategory,
  getProductsBySubcategories, 
  listProducts, 
  searchProducts, 
  updateProduct, 
  uploadColorImage,
  addSubcategoryToProduct, 
  removeSubcategoryFromProduct, 
  deleteProduct
} from "../controllers/product.controllers";
import isAdminLoggedIn from "../middlewares/isAdminLoggedIn.middleware";
import { searchProductValidator, updateProductStockValidator } from "../middlewares/validators/auth.validator";
import { uploadProductImage } from "../middlewares/multer.middleware";

const productRouter = Router();

productRouter.post('/create', isAdminLoggedIn, uploadProductImage, asyncHandler(createProduct));
productRouter.get('/search', searchProductValidator, asyncHandler(searchProducts));
productRouter.patch('/update/:id', isAdminLoggedIn, asyncHandler(updateProduct));
productRouter.get('/products', asyncHandler(listProducts));
productRouter.get('/:id', asyncHandler(getProductById));
productRouter.post('/upload-color-image', isAdminLoggedIn, uploadProductImage, uploadColorImage);
productRouter.get('/category/:categoryId', asyncHandler(getProductsByCategory));
productRouter.get('/subcategory/:subcategoryId', asyncHandler(getProductsBySubcategory)); 
productRouter.post('/subcategories/filter', asyncHandler(getProductsBySubcategories)); 
productRouter.post('/:productId/subcategories', isAdminLoggedIn, asyncHandler(addSubcategoryToProduct)); 
productRouter.delete('/:productId/subcategories/:subcategoryId', isAdminLoggedIn, asyncHandler(removeSubcategoryFromProduct)); 
productRouter.get('/:productId/colors/:colorName/sizes', updateProductStockValidator, asyncHandler(getAvailableSizes));

productRouter.delete('/delete/:id', isAdminLoggedIn, asyncHandler(deleteProduct));

export default productRouter;