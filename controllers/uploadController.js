import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import asyncHandler from '../utils/asyncHandler.js';

// Configure Cloudinary if environment variables are present
if (
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

/**
 * Process image with Sharp:
 * - Auto-rotate based on EXIF
 * - Optional crop if coordinates provided and within image bounds
 * - Maximum boundary resize (1200x1600 inside) without enlargement
 * - Compress to clean, lightweight .webp (85% quality)
 */
async function processImageWithSharp(filePath, cropData = {}) {
  let pipeline = sharp(filePath).rotate();

  const left = Number(cropData.cropX ?? cropData.left);
  const top = Number(cropData.cropY ?? cropData.top);
  const width = Number(cropData.cropWidth ?? cropData.width);
  const height = Number(cropData.cropHeight ?? cropData.height);

  try {
    const metadata = await sharp(filePath).metadata();
    if (
      !isNaN(left) &&
      !isNaN(top) &&
      !isNaN(width) &&
      !isNaN(height) &&
      width > 0 &&
      height > 0 &&
      metadata.width &&
      metadata.height &&
      left + width <= metadata.width &&
      top + height <= metadata.height
    ) {
      pipeline = pipeline.extract({
        left: Math.max(0, Math.round(left)),
        top: Math.max(0, Math.round(top)),
        width: Math.round(width),
        height: Math.round(height),
      });
    }
  } catch (extractErr) {
    // If client already cropped the image on canvas or coordinates are outside bounds, skip extract
  }

  pipeline = pipeline
    .resize({
      width: 1200,
      height: 1600,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .webp({ quality: 85, effort: 4 });

  return await pipeline.toBuffer();
}

/**
 * Helper to upload a buffer to Cloudinary using upload_stream
 */
function uploadBufferToCloudinary(buffer, folder = 'iconic_products') {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        format: 'webp',
        resource_type: 'image',
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    stream.end(buffer);
  });
}

/**
 * @desc    Upload single image (Processed with Sharp & Uploaded to Cloudinary)
 * @route   POST /api/upload
 * @access  Private/Admin
 */
const uploadSingleImage = asyncHandler(async (req, res) => {
  if (!req.file) {
    res.status(400);
    throw new Error('Please upload an image file');
  }

  const inputPath = req.file.path;
  let processedBuffer = null;

  try {
    // Process with Sharp (crop, resize, webp compression)
    processedBuffer = await processImageWithSharp(inputPath, req.body);
  } catch (err) {
    console.error('Sharp image processing warning, using original:', err.message);
  }

  // Cleanup local temp file from multer
  if (fs.existsSync(inputPath)) {
    try {
      fs.unlinkSync(inputPath);
    } catch (e) {}
  }

  // 1. Upload to Cloudinary if configured
  if (
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET &&
    process.env.CLOUDINARY_CLOUD_NAME !== 'your_cloud_name'
  ) {
    try {
      let result;
      if (processedBuffer) {
        result = await uploadBufferToCloudinary(processedBuffer, 'iconic_products');
      } else {
        result = await cloudinary.uploader.upload(inputPath, {
          folder: 'iconic_products',
        });
      }

      return res.json({
        success: true,
        url: result.secure_url,
        public_id: result.public_id,
        format: result.format,
        width: result.width,
        height: result.height,
        message: 'Image cropped, optimized with Sharp and uploaded to Cloudinary',
      });
    } catch (err) {
      console.error('Cloudinary upload error:', err.message);
    }
  }

  // 2. High-Performance Fallback: Return Sharp-optimized WebP as Base64 Data URI!
  // This stores permanently in MongoDB, NEVER 404s, and works 100% on Render/Vercel
  if (processedBuffer) {
    const base64Data = `data:image/webp;base64,${processedBuffer.toString('base64')}`;
    return res.json({
      success: true,
      url: base64Data,
      isBase64: true,
      message: 'Image cropped and optimized with Sharp (Persistent DB storage)',
    });
  }

  res.status(500);
  throw new Error('Failed to process and upload image');
});

/**
 * @desc    Upload multiple images (Processed with Sharp & Uploaded to Cloudinary)
 * @route   POST /api/upload/multiple
 * @access  Private/Admin
 */
const uploadMultipleImages = asyncHandler(async (req, res) => {
  if (!req.files || req.files.length === 0) {
    res.status(400);
    throw new Error('Please upload at least one image');
  }

  const urls = [];

  for (const file of req.files) {
    let processedBuffer = null;
    try {
      processedBuffer = await processImageWithSharp(file.path, req.body);
    } catch (err) {
      console.error('Sharp warning:', err.message);
    }

    if (fs.existsSync(file.path)) {
      try {
        fs.unlinkSync(file.path);
      } catch (e) {}
    }

    let uploaded = false;
    if (
      process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET &&
      process.env.CLOUDINARY_CLOUD_NAME !== 'your_cloud_name'
    ) {
      try {
        const result = await uploadBufferToCloudinary(processedBuffer, 'iconic_products');
        urls.push(result.secure_url);
        uploaded = true;
      } catch (err) {
        console.error('Cloudinary upload error:', err.message);
      }
    }

    // Fallback to Base64 data URI
    if (!uploaded && processedBuffer) {
      urls.push(`data:image/webp;base64,${processedBuffer.toString('base64')}`);
    }
  }

  res.json({
    success: true,
    urls,
    count: urls.length,
    message: `${urls.length} images processed with Sharp and saved`,
  });
});

export {
  uploadSingleImage,
  uploadMultipleImages,
};

export default {
  uploadSingleImage,
  uploadMultipleImages,
};

