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
 * - Optional crop if coordinates provided (left, top, width, height)
 * - Maximum boundary resize (1600x2000 inside) without enlargement
 * - Compress to clean, lightweight .webp (85% quality)
 */
async function processImageWithSharp(filePath, cropData = {}) {
  const left = Number(cropData.cropX ?? cropData.left);
  const top = Number(cropData.cropY ?? cropData.top);
  const width = Number(cropData.cropWidth ?? cropData.width);
  const height = Number(cropData.cropHeight ?? cropData.height);

  let pipeline = sharp(filePath).rotate();

  if (
    !isNaN(left) &&
    !isNaN(top) &&
    !isNaN(width) &&
    !isNaN(height) &&
    width > 0 &&
    height > 0
  ) {
    pipeline = pipeline.extract({
      left: Math.max(0, Math.round(left)),
      top: Math.max(0, Math.round(top)),
      width: Math.round(width),
      height: Math.round(height),
    });
  }

  pipeline = pipeline
    .resize({
      width: 1600,
      height: 2000,
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

  // Upload to Cloudinary if configured
  if (
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
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

      // Cleanup local temp file
      if (fs.existsSync(inputPath)) {
        fs.unlinkSync(inputPath);
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
      console.error('Cloudinary upload error, falling back to local storage:', err);
    }
  }

  // Fallback: Save processed buffer locally
  const ext = processedBuffer ? '.webp' : path.extname(req.file.originalname);
  const baseName = path.basename(req.file.filename, path.extname(req.file.filename));
  const finalFilename = `${baseName}-opt${ext}`;
  const finalPath = path.join(path.dirname(inputPath), finalFilename);

  if (processedBuffer) {
    fs.writeFileSync(finalPath, processedBuffer);
    if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
  }

  const serverUrl = `${req.protocol}://${req.get('host')}`;
  const fileUrl = `${serverUrl}/uploads/${finalFilename}`;

  res.json({
    success: true,
    url: fileUrl,
    filename: finalFilename,
    message: 'Image cropped & optimized locally',
  });
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

    if (
      process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
    ) {
      try {
        let result;
        if (processedBuffer) {
          result = await uploadBufferToCloudinary(processedBuffer, 'iconic_products');
        } else {
          result = await cloudinary.uploader.upload(file.path, {
            folder: 'iconic_products',
          });
        }
        if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
        urls.push(result.secure_url);
        continue;
      } catch (err) {
        console.error('Cloudinary upload error:', err);
      }
    }

    // Local fallback
    const ext = processedBuffer ? '.webp' : path.extname(file.originalname);
    const baseName = path.basename(file.filename, path.extname(file.filename));
    const finalFilename = `${baseName}-opt${ext}`;
    const finalPath = path.join(path.dirname(file.path), finalFilename);

    if (processedBuffer) {
      fs.writeFileSync(finalPath, processedBuffer);
      if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
    }

    const serverUrl = `${req.protocol}://${req.get('host')}`;
    urls.push(`${serverUrl}/uploads/${finalFilename}`);
  }

  res.json({
    success: true,
    urls,
    count: urls.length,
    message: `${urls.length} images processed with Sharp and uploaded`,
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

