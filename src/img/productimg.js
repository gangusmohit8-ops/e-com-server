import { v2 as cloudinary } from 'cloudinary';
import sharp from 'sharp';
import dotenv from 'dotenv';

dotenv.config({ quiet: true });

cloudinary.config({
  cloud_name: process.env.cloud_name,
  api_key: process.env.api_key,
  api_secret: process.env.api_secret
});

/**
 * Upload a single product image to Cloudinary (optimized)
 * @param {Buffer} imgBuffer - Raw image buffer from multer
 * @returns {Object} { public_id, secure_url, url }
 */
export const upload_product_img = async (imgBuffer) => {
  try {
    const optimizedBuffer = await sharp(imgBuffer)
      .resize(1080, 1080, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 85, mozjpeg: true })
      .toBuffer();

    const uploadResult = await cloudinary.uploader.upload(
      `data:image/jpeg;base64,${optimizedBuffer.toString('base64')}`,
      {
        resource_type: 'auto',
        quality: 'auto',
        folder: 'Product Images'
      }
    );

    return {
      public_id: uploadResult.public_id,
      secure_url: uploadResult.secure_url,
      url: uploadResult.url
    };
  } catch (err) {
    throw new Error(`Product image upload failed: ${err.message}`);
  }
};

/**
 * Upload multiple product images (up to 5)
 * @param {Array<Buffer>} imgBuffers - Array of raw image buffers
 * @returns {Array<Object>} Array of { public_id, secure_url, url }
 */
export const upload_multiple_product_imgs = async (imgBuffers) => {
  try {
    const uploadPromises = imgBuffers.map(buffer => upload_product_img(buffer));
    return await Promise.all(uploadPromises);
  } catch (err) {
    throw new Error(`Multiple product image upload failed: ${err.message}`);
  }
};

/**
 * Delete a product image from Cloudinary
 * @param {string} publicId
 */
export const delete_product_img = async (publicId) => {
  try {
    if (publicId) {
      await cloudinary.uploader.destroy(publicId);
    }
  } catch (err) {
    console.error('Failed to delete product image:', err.message);
  }
};

/**
 * Delete multiple product images from Cloudinary
 * @param {Array<string>} publicIds
 */
export const delete_multiple_product_imgs = async (publicIds) => {
  try {
    const deletePromises = publicIds.map(id => delete_product_img(id));
    await Promise.all(deletePromises);
  } catch (err) {
    console.error('Failed to delete multiple product images:', err.message);
  }
};
