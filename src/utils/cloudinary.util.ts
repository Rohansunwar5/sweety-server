import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';
import { InternalServerError } from '../errors/internal-server.error';
import config from '../config';

cloudinary.config({
  cloud_name: config.CLOUDINARY_CLOUD_NAME,
  api_key: config.CLOUDINARY_API_KEY,
  api_secret: config.CLOUDINARY_API_SECRET,
  secure: true
});

export const uploadToCloudinary = (file: Express.Multer.File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: 'sweety',
        resource_type: 'auto'
      },
      (error, result) => {
        if (error) {
          console.error('Cloudinary upload error:', error);
          reject(new InternalServerError('Failed to upload image to Cloudinary'));
        }
        if (result) {
          resolve(result.secure_url);
        }
      }
    );

    const readableStream = new Readable();
    readableStream.push(file.buffer);
    readableStream.push(null);
    readableStream.pipe(uploadStream);
  });
};

export const deleteFromCloudinary = async (url: string): Promise<void> => {
  try {
    const publicId = url.split('/').pop()?.split('.')[0];
    if (publicId) {
      await cloudinary.uploader.destroy(`ecommerce-products/${publicId}`);
    }
  } catch (error) {
    console.error('Cloudinary delete error:', error);
    throw new InternalServerError('Failed to delete image from Cloudinary');
  }
};