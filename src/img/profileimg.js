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
 * Upload and optimize a profile image to Cloudinary
 * @param {Buffer} imgBuffer - Raw image buffer from multer
 * @returns {Object} Cloudinary upload result with secure_url, public_id, etc.
 */
export const profile_img = async (imgBuffer) => {
  try {
    const optimizedBuffer = await sharp(imgBuffer)
      .resize(500, 500, { fit: 'cover', withoutEnlargement: true })
      .jpeg({ quality: 80, mozjpeg: true })
      .toBuffer();

    const uploadResult = await cloudinary.uploader.upload(
      `data:image/jpeg;base64,${optimizedBuffer.toString('base64')}`,
      {
        resource_type: 'auto',
        quality: 'auto',
        folder: 'User Profile Images',
        transformation: [{ width: 500, height: 500, crop: 'fill' }]
      }
    );

    return {
      public_id: uploadResult.public_id,
      secure_url: uploadResult.secure_url,
      url: uploadResult.url
    };
  } catch (err) {
    throw new Error(`Profile image upload failed: ${err.message}`);
  }
};

/**
 * Delete a profile image from Cloudinary
 * @param {string} publicId - The public_id of the image to delete
 */
export const delete_profile_img = async (publicId) => {
  try {
    if (publicId) {
      await cloudinary.uploader.destroy(publicId);
    }
  } catch (err) {
    console.error('Failed to delete profile image:', err.message);
  }
};
