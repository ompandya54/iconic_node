const cloudinary = require('cloudinary').v2;
const fs = require('fs');
const asyncHandler = require('../utils/asyncHandler');

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
 * @desc    Upload single image
 * @route   POST /api/upload
 * @access  Private/Admin
 */
const uploadSingleImage = asyncHandler(async (req, res) => {
  if (!req.file) {
    res.status(400);
    throw new Error('Please upload an image file');
  }

  // Check if Cloudinary is configured
  if (
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  ) {
    try {
      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: 'iconic_products',
      });

      // Remove local temporary file
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }

      return res.json({
        success: true,
        url: result.secure_url,
        public_id: result.public_id,
        message: 'Image uploaded successfully to Cloudinary',
      });
    } catch (err) {
      console.error('Cloudinary upload error, falling back to local:', err);
    }
  }

  // Fallback: Local file serving URL
  const serverUrl = `${req.protocol}://${req.get('host')}`;
  const fileUrl = `${serverUrl}/uploads/${req.file.filename}`;

  res.json({
    success: true,
    url: fileUrl,
    filename: req.file.filename,
    message: 'Image uploaded successfully',
  });
});

/**
 * @desc    Upload multiple images
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
    if (
      process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
    ) {
      try {
        const result = await cloudinary.uploader.upload(file.path, {
          folder: 'iconic_products',
        });
        if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
        urls.push(result.secure_url);
        continue;
      } catch (err) {
        console.error('Cloudinary upload error:', err);
      }
    }

    const serverUrl = `${req.protocol}://${req.get('host')}`;
    urls.push(`${serverUrl}/uploads/${file.filename}`);
  }

  res.json({
    success: true,
    urls,
    count: urls.length,
    message: 'Images uploaded successfully',
  });
});

module.exports = {
  uploadSingleImage,
  uploadMultipleImages,
};

