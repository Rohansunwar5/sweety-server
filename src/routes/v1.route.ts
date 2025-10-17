import { Router } from 'express';
import { health, helloWorld } from '../controllers/health.controller';
import { asyncHandler } from '../utils/asynchandler';
import authRouter from './auth.route';
import productRouter from './product.route';
import orderRouter from './order.route';
import cartRouter from './cart.route';
import discountRouter from './discount.route';
import paymentRouter from './payment.route';
import categoryRouter from './category.route';
import adminRouter from './admin.route';
import subcategoryRouter from './subcategory.route';
import wishlistRouter from './wishlist.route';
import blogRouter from './blog.route';
import bannerRouter from './banner.route';
import mobileBannerRouter from './mobileBanner.route';

const v1Router = Router();

v1Router.get('/', asyncHandler(helloWorld));
v1Router.get('/health', asyncHandler(health));
v1Router.use('/admin', adminRouter);
v1Router.use('/auth', authRouter);
v1Router.use('/product', productRouter);
v1Router.use('/cart', cartRouter);
v1Router.use('/order', orderRouter);
v1Router.use('/category', categoryRouter);
v1Router.use('/sub-category', subcategoryRouter);
v1Router.use('/payments', paymentRouter);
v1Router.use('/discount', discountRouter);
v1Router.use('/wishlist', wishlistRouter);
v1Router.use('/blog', blogRouter);
v1Router.use('/banner', bannerRouter);
v1Router.use('/mobile-banner', mobileBannerRouter);

export default v1Router;