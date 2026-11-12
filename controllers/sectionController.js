import Section from '../models/sectionModel.js';
import Product from '../models/productModel.js';
import asyncHandler from '../utils/asyncHandler.js';

/**
 * @desc    Get all active landing page sections with populated products
 * @route   GET /api/sections/active
 * @access  Public (Landing Page)
 */
const getActiveSectionsWithProducts = asyncHandler(async (req, res) => {
  const sections = await Section.find({ isActive: true }).sort({ displayOrder: 1 });

  const populatedSections = await Promise.all(
    sections.map(async (sec) => {
      // Build conditions array for multi-variable filtering
      const conditions = [{ isActive: true }];

      // 1. Category Filter (Optional)
      if (sec.category && sec.category.trim() && sec.category !== 'all') {
        const cleanCat = sec.category.trim();
        conditions.push({
          $or: [
            { category: { $regex: new RegExp(`^${cleanCat}$`, 'i') } },
            { categoryName: { $regex: new RegExp(`^${cleanCat}$`, 'i') } },
            { categoryLabel: { $regex: new RegExp(`^${cleanCat}$`, 'i') } },
          ],
        });
      }

      // 2. Fit Style Filter (Optional)
      if (sec.fit && sec.fit.trim() && sec.fit !== 'all') {
        conditions.push({
          fit: { $regex: new RegExp(`^${sec.fit.trim()}$`, 'i') },
        });
      }

      // 3. Theme Filter (Optional)
      if (sec.theme && sec.theme.trim() && sec.theme !== 'all') {
        conditions.push({
          theme: { $regex: new RegExp(`^${sec.theme.trim()}$`, 'i') },
        });
      }

      // 4. Collection Filter (Optional)
      if (sec.collectionName && sec.collectionName.trim() && sec.collectionName !== 'all') {
        const cleanColl = sec.collectionName.trim();
        conditions.push({
          $or: [
            { collectionName: { $regex: new RegExp(`^${cleanColl}$`, 'i') } },
            { subcategory: { $regex: new RegExp(`^${cleanColl}$`, 'i') } },
          ],
        });
      }

      // 5. Legacy single filter fallback if none of the 4 multi-criteria were specified
      if (conditions.length === 1 && sec.filterType && sec.filterValue) {
        if (sec.filterType === 'discount') {
          const minDiscount = Number(sec.filterValue) || 10;
          conditions.push({ discount: { $gte: minDiscount } });
        } else if (sec.filterType === 'underPrice') {
          const maxP = Number(sec.filterValue) || 999;
          conditions.push({ price: { $lte: maxP } });
        } else if (sec.filterType === 'category') {
          conditions.push({
            $or: [
              { category: { $regex: new RegExp(`^${sec.filterValue}$`, 'i') } },
              { categoryName: { $regex: new RegExp(`^${sec.filterValue}$`, 'i') } },
            ],
          });
        } else if (sec.filterType === 'badge') {
          conditions.push({ badge: { $regex: new RegExp(`^${sec.filterValue}$`, 'i') } });
        } else if (sec.filterType === 'fit') {
          conditions.push({ fit: { $regex: new RegExp(sec.filterValue, 'i') } });
        } else if (sec.filterType === 'theme') {
          conditions.push({ theme: { $regex: new RegExp(sec.filterValue, 'i') } });
        } else if (sec.filterType === 'material') {
          conditions.push({ material: { $regex: new RegExp(sec.filterValue, 'i') } });
        }
      }

      const finalQuery = conditions.length === 1 ? conditions[0] : { $and: conditions };

      const products = await Product.find(finalQuery)
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
        category: sec.category || '',
        fit: sec.fit || '',
        theme: sec.theme || '',
        collectionName: sec.collectionName || '',
        filterType: sec.filterType || '',
        filterValue: sec.filterValue || '',
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
    category,
    fit,
    theme,
    collectionName,
    filterType,
    filterValue,
    bannerImage,
    badgeText,
    countdownEndsAt,
    limit,
    displayOrder,
    isActive,
  } = req.body;

  if (!title || !title.trim()) {
    res.status(400);
    throw new Error('Please provide a section title');
  }

  const section = await Section.create({
    title: title.trim(),
    subtitle: subtitle ? subtitle.trim() : '',
    category: category && category !== 'all' ? category.trim() : '',
    fit: fit && fit !== 'all' ? fit.trim() : '',
    theme: theme && theme !== 'all' ? theme.trim() : '',
    collectionName: collectionName && collectionName !== 'all' ? collectionName.trim() : '',
    filterType: filterType || '',
    filterValue: filterValue ? filterValue.trim() : '',
    bannerImage: bannerImage || '',
    badgeText: badgeText ? badgeText.trim() : '',
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
    'category',
    'fit',
    'theme',
    'collectionName',
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
      if (['category', 'fit', 'theme', 'collectionName'].includes(field)) {
        section[field] = req.body[field] === 'all' ? '' : req.body[field];
      } else {
        section[field] = req.body[field];
      }
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
 * @desc    Toggle section active/inactive status (Admin)
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
    isActive: section.isActive,
    message: `Section "${section.title}" is now ${section.isActive ? 'ACTIVE' : 'DRAFT'}`,
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
    message: `Section "${section.title}" deleted successfully`,
  });
});

export {
  getActiveSectionsWithProducts,
  getAllSections,
  createSection,
  updateSection,
  toggleSectionStatus,
  deleteSection,
};
