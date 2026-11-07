const Category = require('../models/categoryModel');
const Product = require('../models/productModel');
const asyncHandler = require('../utils/asyncHandler');

/**
 * @desc    Get all categories
 * @route   GET /api/categories
 * @access  Public
 */
const getCategories = asyncHandler(async (req, res) => {
  const categories = await Category.find({ isActive: true }).sort({ name: 1 });

  res.json({
    success: true,
    count: categories.length,
    data: categories,
  });
});

/**
 * @desc    Get single category by id or slug
 * @route   GET /api/categories/:id
 * @access  Public
 */
const getCategoryById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  let category;
  if (id.match(/^[0-9a-fA-F]{24}$/)) {
    category = await Category.findById(id);
  } else {
    category = await Category.findOne({ slug: id });
  }

  if (category) {
    res.json({
      success: true,
      data: category,
    });
  } else {
    res.status(404);
    throw new Error('Category not found');
  }
});

/**
 * @desc    Create a category
 * @route   POST /api/categories
 * @access  Private/Admin
 */
const createCategory = asyncHandler(async (req, res) => {
  const { name, description, image } = req.body;

  if (!name) {
    res.status(400);
    throw new Error('Please provide category name');
  }

  const existingCategory = await Category.findOne({
    name: { $regex: new RegExp(`^${name}$`, 'i') },
  });

  if (existingCategory) {
    res.status(400);
    throw new Error('Category already exists');
  }

  const slug = name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');

  const category = await Category.create({
    name,
    slug,
    description: description || '',
    image: image || '',
  });

  res.status(201).json({
    success: true,
    data: category,
    message: 'Category created successfully',
  });
});

/**
 * @desc    Update a category
 * @route   PUT /api/categories/:id
 * @access  Private/Admin
 */
const updateCategory = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id);

  if (!category) {
    res.status(404);
    throw new Error('Category not found');
  }

  category.name = req.body.name || category.name;
  category.description = req.body.description !== undefined ? req.body.description : category.description;
  category.image = req.body.image !== undefined ? req.body.image : category.image;

  if (req.body.isActive !== undefined) {
    category.isActive = req.body.isActive;
  }

  if (req.body.name) {
    category.slug = req.body.name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  const updatedCategory = await category.save();

  res.json({
    success: true,
    data: updatedCategory,
    message: 'Category updated successfully',
  });
});

/**
 * @desc    Delete a category
 * @route   DELETE /api/categories/:id
 * @access  Private/Admin
 */
const deleteCategory = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id);

  if (!category) {
    res.status(404);
    throw new Error('Category not found');
  }

  // Check if any product is assigned to this category
  const productCount = await Product.countDocuments({ category: category._id });
  if (productCount > 0) {
    res.status(400);
    throw new Error(`Cannot delete category with ${productCount} associated products`);
  }

  await Category.findByIdAndDelete(req.params.id);

  res.json({
    success: true,
    message: 'Category deleted successfully',
  });
});

module.exports = {
  getCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
};

