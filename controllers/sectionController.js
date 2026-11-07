const Section = require('../models/sectionModel');
const Product = require('../models/productModel');
const asyncHandler = require('../utils/asyncHandler');

/**
 * @desc    Get all active landing page sections with populated products
 * @route   GET /api/sections/active
 * @access  Public (Landing Page)
 */
const getActiveSectionsWithProducts = asyncHandler(async (req, res) => {
  const sections = await Section.find({ isActive: true }).sort({ displayOrder: 1 });

  const populatedSections = await Promise.all(
    sections.map(async (sec) => {
      const query = { isActive: true };

      if (sec.filterType === 'discount') {
        const minDiscount = Number(sec.filterValue) || 10;
        query.discount = { $gte: minDiscount };
      } else if (sec.filterType === 'underPrice') {
        const maxP = Number(sec.filterValue) || 999;
        query.price = { $lte: maxP };
      } else if (sec.filterType === 'category') {
        query.$or = [
          { category: { $regex: new RegExp(`^${sec.filterValue}$`, 'i') } },
          { categoryName: { $regex: new RegExp(`^${sec.filterValue}$`, 'i') } },
        ];
      } else if (sec.filterType === 'badge') {
        query.badge = { $regex: new RegExp(`^${sec.filterValue}$`, 'i') };
      } else if (sec.filterType === 'fit') {
        query.fit = { $regex: new RegExp(sec.filterValue, 'i') };
      } else if (sec.filterType === 'theme') {
        query.theme = { $regex: new RegExp(sec.filterValue, 'i') };
      } else if (sec.filterType === 'material') {
        query.material = { $regex: new RegExp(sec.filterValue, 'i') };
      }

      const products = await Product.find(query)
        .sort({ discount: -1, isBestseller: -1, createdAt: -1 })
        .limit(sec.limit || 8)
        .lean();

      const formattedProducts = products.map((p) => ({
        ...p,
        id: p._id.toString(),
        formattedPrice: p.formattedPrice || `₹${(Number(p.price) || 0).toLocaleString('en-IN')}`,
        image: p.image || p.images?.[0] || '/images/prod_minimal.jpg',
      }));

      return {
        _id: sec._id,
        id: sec._id.toString(),
        title: sec.title,
        subtitle: sec.subtitle,
        filterType: sec.filterType,
        filterValue: sec.filterValue,
        bannerImage: sec.bannerImage || '',
        badgeText: sec.badgeText || '',
        countdownEndsAt: sec.countdownEndsAt || null,
        isExpired: sec.countdownEndsAt ? new Date() > new Date(sec.countdownEndsAt) : false,
        limit: sec.limit,
        displayOrder: sec.displayOrder,
        productsCount: formattedProducts.length,
        products: formattedProducts,
      };
    })
  );

  // Filter out any sections that currently have 0 matching products
  const activeWithProducts = populatedSections.filter((sec) => sec.productsCount > 0);

  res.json({
    success: true,
    count: activeWithProducts.length,
    sections: activeWithProducts,
    data: activeWithProducts,
  });
});

/**
 * @desc    Get all configured sections (Admin)
 * @route   GET /api/sections
 * @access  Private/Admin
 */
const getAllSections = asyncHandler(async (req, res) => {
  const sections = await Section.find({}).sort({ displayOrder: 1, createdAt: -1 });

  res.json({
    success: true,
    count: sections.length,
    sections,
    data: sections,
  });
});

/**
 * @desc    Create a new dynamic section (Admin)
 * @route   POST /api/sections
 * @access  Private/Admin
 */
const createSection = asyncHandler(async (req, res) => {
  const {
    title,
    subtitle,
    filterType,
    filterValue,
    bannerImage,
    badgeText,
    countdownEndsAt,
    limit,
    displayOrder,
    isActive,
  } = req.body;

  if (!title || !filterType || !filterValue) {
    res.status(400);
    throw new Error('Please provide title, filterType (fit/theme/material/badge/category/discount/underPrice), and filterValue');
  }

  const section = await Section.create({
    title,
    subtitle: subtitle || '',
    filterType,
    filterValue,
    bannerImage: bannerImage || '',
    badgeText: badgeText || '',
    countdownEndsAt: countdownEndsAt ? new Date(countdownEndsAt) : null,
    limit: limit ? Number(limit) : 8,
    displayOrder: displayOrder ? Number(displayOrder) : 0,
    isActive: isActive !== undefined ? Boolean(isActive) : true,
  });

  res.status(201).json({
    success: true,
    section,
    data: section,
    message: 'Section created successfully',
  });
});

/**
 * @desc    Update a section (Admin)
 * @route   PUT /api/sections/:id
 * @access  Private/Admin
 */
const updateSection = asyncHandler(async (req, res) => {
  const section = await Section.findById(req.params.id);

  if (!section) {
    res.status(404);
    throw new Error('Section not found');
  }

  const fields = [
    'title',
    'subtitle',
    'filterType',
    'filterValue',
    'bannerImage',
    'badgeText',
    'countdownEndsAt',
    'limit',
    'displayOrder',
    'isActive',
  ];
  fields.forEach((field) => {
    if (req.body[field] !== undefined) {
      section[field] = req.body[field];
    }
  });

  const updatedSection = await section.save();

  res.json({
    success: true,
    section: updatedSection,
    data: updatedSection,
    message: 'Section updated successfully',
  });
});

/**
 * @desc    Toggle section Active/Inactive status (Admin)
 * @route   PATCH /api/sections/:id/toggle
 * @access  Private/Admin
 */
const toggleSectionStatus = asyncHandler(async (req, res) => {
  const section = await Section.findById(req.params.id);

  if (!section) {
    res.status(404);
    throw new Error('Section not found');
  }

  section.isActive = !section.isActive;
  await section.save();

  res.json({
    success: true,
    section,
    data: section,
    message: `Section "${section.title}" is now ${section.isActive ? 'Active (Visible on Landing Page)' : 'Inactive (Hidden)'}`,
  });
});

/**
 * @desc    Delete a section (Admin)
 * @route   DELETE /api/sections/:id
 * @access  Private/Admin
 */
const deleteSection = asyncHandler(async (req, res) => {
  const section = await Section.findById(req.params.id);

  if (!section) {
    res.status(404);
    throw new Error('Section not found');
  }

  await Section.findByIdAndDelete(req.params.id);

  res.json({
    success: true,
    message: 'Section deleted successfully',
  });
});

module.exports = {
  getActiveSectionsWithProducts,
  getAllSections,
  createSection,
  updateSection,
  toggleSectionStatus,
  deleteSection,
};

