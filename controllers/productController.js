import Product from '../models/productModel.js';
import Category from '../models/categoryModel.js';
import asyncHandler from '../utils/asyncHandler.js';

/**
 * @desc    Fetch all products with search, filters, sorting & pagination
 * @route   GET /api/products
 * @access  Public
 */
const getProducts = asyncHandler(async (req, res) => {
  const {
    keyword,
    search,
    category,
    subcategory,
    theme,
    fit,
    material,
    minPrice,
    maxPrice,
    inStock,
    isFeatured,
    isBestseller,
    isNewArrival,
    size,
    color,
    sort,
    page = 1,
    limit = 12,
  } = req.query;

  const query = {};

  // Text search on name, description, category, or subcategory
  const searchTerm = search || keyword;
  if (searchTerm) {
    query.$or = [
      { name: { $regex: searchTerm, $options: 'i' } },
      { description: { $regex: searchTerm, $options: 'i' } },
      { category: { $regex: searchTerm, $options: 'i' } },
      { categoryName: { $regex: searchTerm, $options: 'i' } },
      { subcategory: { $regex: searchTerm, $options: 'i' } },
    ];
  }

  // Category filter (supports slug 'oversized', 'graphic' or ID)
  if (category && category !== 'all') {
    if (typeof category === 'string' && category.includes(',')) {
      const categories = category.split(',').map((c) => c.trim().toLowerCase());
      query.category = { $in: categories };
    } else if (category.match(/^[0-9a-fA-F]{24}$/)) {
      query.category = category;
    } else {
      query.$or = [
        { category: { $regex: new RegExp(`^${category}$`, 'i') } },
        { categoryName: { $regex: new RegExp(`^${category}$`, 'i') } },
      ];
    }
  }

  // Subcategory filter
  if (subcategory && subcategory !== 'all') {
    const subcategories = subcategory.split(',').map((s) => s.trim().toLowerCase());
    query.subcategory = subcategories.length > 1 ? { $in: subcategories } : { $regex: new RegExp(`^${subcategories[0]}$`, 'i') };
  }

  // Theme filter
  if (theme) {
    const themes = theme.split(',').map((t) => t.trim());
    query.theme = { $in: themes.map((t) => new RegExp(`^${t}$`, 'i')) };
  }

  // Fit filter
  if (fit) {
    const fits = fit.split(',').map((f) => f.trim());
    query.fit = { $in: fits.map((f) => new RegExp(f, 'i')) };
  }

  // Material filter
  if (material) {
    const materials = material.split(',').map((m) => m.trim());
    query.material = { $in: materials.map((m) => new RegExp(m, 'i')) };
  }

  // Price range filter
  if (minPrice || maxPrice) {
    query.price = {};
    if (minPrice) query.price.$gte = Number(minPrice);
    if (maxPrice) query.price.$lte = Number(maxPrice);
  }

  // Stock filter
  if (inStock === 'true' || inStock === true) {
    query.stock = { $gt: 0 };
  }

  // Active/Inactive filter (Public only sees active products)
  if (req.query.status === 'all') {
    // Admin query for all products
  } else if (req.query.status === 'inactive') {
    query.isActive = false;
  } else {
    query.isActive = true;
  }

  // Badges / Flags
  if (req.query.badge) {
    const badges = req.query.badge.split(',').map((b) => b.trim());
    query.badge = { $in: badges.map((b) => new RegExp(`^${b}$`, 'i')) };
  }
  if (isFeatured === 'true') query.isFeatured = true;
  if (isBestseller === 'true') query.isBestseller = true;
  if (isNewArrival === 'true') query.isNewArrival = true;

  // Size filter
  if (size) {
    const sizeList = Array.isArray(size) ? size : size.split(',');
    query.sizes = { $in: sizeList.map((s) => s.trim().toUpperCase()) };
  }

  // Color filter
  if (color) {
    const colorList = Array.isArray(color) ? color : color.split(',');
    query.$or = [
      { 'colors.name': { $in: colorList.map((c) => new RegExp(`^${c}$`, 'i')) } },
      { colors: { $in: colorList.map((c) => new RegExp(`^${c}$`, 'i')) } },
    ];
  }

  // Sorting
  let sortBy = { createdAt: -1 }; // Default: Newest first
  if (sort === 'price-asc' || sort === 'price-low') sortBy = { price: 1 };
  if (sort === 'price-desc' || sort === 'price-high') sortBy = { price: -1 };
  if (sort === 'rating') sortBy = { rating: -1, numReviews: -1 };
  if (sort === 'bestseller' || sort === 'bestsellers') sortBy = { isBestseller: -1, rating: -1 };

  // Pagination
  const pageSize = Number(limit);
  const pageNumber = Number(page);
  const skip = (pageNumber - 1) * pageSize;

  const count = await Product.countDocuments(query);
  const products = await Product.find(query)
    .populate('category', 'name slug')
    .sort(sortBy)
    .skip(skip)
    .limit(pageSize)
    .lean();

  // Format products with id string, formattedPrice, and image for 100% frontend compatibility
  const formatted = products.map((p) => ({
    ...p,
    id: p._id.toString(),
    formattedPrice: p.formattedPrice || `₹${(Number(p.price) || 0).toLocaleString('en-IN')}`,
    image: p.image || p.images?.[0] || p.colors?.[0]?.image || '/images/prod_minimal.jpg',
  }));

  res.json({
    success: true,
    count: count,
    products: formatted,
    data: formatted,
    page: pageNumber,
    pages: Math.ceil(count / pageSize) || 1,
    total: count,
  });
});

/**
 * @desc    Fetch single product by ID or Slug
 * @route   GET /api/products/:id
 * @access  Public
 */
const getProductById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!id) {
    res.status(400);
    throw new Error('Product identifier is required');
  }

  let product = null;

  // 1. Try by MongoDB ObjectId
  if (id.match(/^[0-9a-fA-F]{24}$/)) {
    try {
      product = await Product.findById(id).lean();
    } catch (e) {
      // Ignore cast errors and proceed to slug/search
    }
  }

  // 2. Try by Exact Slug (Indexed - instant lookup)
  if (!product) {
    product = await Product.findOne({ slug: id.toLowerCase().trim() }).lean();
  }

  // 3. Try by legacy or static shop-item-X ID
  if (!product && id.startsWith('shop-item-')) {
    const itemNum = parseInt(id.replace('shop-item-', ''), 10);
    const shopNames = [
      'Minimal Logo Tee',
      'Fallen Angel Tee',
      'Chaos Tee',
      'Roman Art Tee',
      'Mountain Mood Tee',
      'Dual Logo Tee',
      'Chaos Back Print Tee',
      'Somewhere Better Tee',
    ];
    const targetName = shopNames[itemNum - 1];
    if (targetName) {
      product = await Product.findOne({ name: new RegExp(`^${targetName}$`, 'i') }).lean();
    }

    // Fallback: pick Nth active product
    if (!product) {
      const allActive = await Product.find({ isActive: true }).sort({ createdAt: -1 }).lean();
      if (allActive.length > 0) {
        product = allActive[(itemNum - 1) % allActive.length];
      }
    }
  }

  // 4. Try fuzzy match by name or cleaned slug
  if (!product) {
    const cleanTerm = id.replace(/[-_]/g, ' ').trim();
    product = await Product.findOne({
      $or: [
        { name: { $regex: new RegExp(`^${cleanTerm}$`, 'i') } },
        { name: { $regex: new RegExp(cleanTerm, 'i') } },
        { slug: { $regex: new RegExp(`^${id}$`, 'i') } },
      ],
    }).lean();
  }

  if (product) {
    const formatted = {
      ...product,
      id: product._id.toString(),
      formattedPrice: product.formattedPrice || `₹${(Number(product.price) || 0).toLocaleString('en-IN')}`,
      image: product.image || product.images?.[0] || product.colors?.[0]?.image || '/images/prod_minimal.jpg',
    };

    return res.json({
      success: true,
      product: formatted,
      data: formatted,
    });
  } else {
    res.status(404);
    throw new Error(`Product not found with id or slug: ${id}`);
  }
});

/**
 * @desc    Get product attributes (categories, available sizes, colors, min/max price)
 * @route   GET /api/products/attributes
 * @access  Public
 */
const getProductAttributes = asyncHandler(async (req, res) => {
  const [
    categories,
    subcategories,
    fits,
    themes,
    materials,
    badges,
    sizes,
    colorsRaw,
    priceStats,
  ] = await Promise.all([
    Product.distinct('category'),
    Product.distinct('subcategory'),
    Product.distinct('fit'),
    Product.distinct('theme'),
    Product.distinct('material'),
    Product.distinct('badge'),
    Product.distinct('sizes'),
    Product.distinct('colors.name'),
    Product.aggregate([
      {
        $group: {
          _id: null,
          minPrice: { $min: '$price' },
          maxPrice: { $max: '$price' },
        },
      },
    ]),
  ]);

  // If colors.name is empty, fallback to distinct colors array
  let colors = colorsRaw.filter(Boolean);
  if (colors.length === 0) {
    colors = (await Product.distinct('colors')).filter(Boolean);
  }

  res.json({
    success: true,
    data: {
      categories: categories.filter(Boolean),
      subcategories: subcategories.filter(Boolean),
      fits: fits.filter(Boolean),
      themes: themes.filter(Boolean),
      materials: materials.filter(Boolean),
      badges: badges.filter(Boolean),
      sizes: sizes.filter(Boolean),
      colors,
      minPrice: priceStats[0]?.minPrice || 0,
      maxPrice: priceStats[0]?.maxPrice || 10000,
    },
  });
});

/**
 * @desc    Get best-selling products
 * @route   GET /api/products/bestsellers
 * @access  Public
 */
const getBestsellers = asyncHandler(async (req, res) => {
  const limit = Number(req.query.limit) || 8;
  const products = await Product.find({ isBestseller: true, isActive: true })
    .populate('category', 'name slug')
    .limit(limit)
    .lean();

  // Fallback: If not enough bestsellers marked, fetch highest rated or most recent
  if (products.length < limit) {
    const fallbackProducts = await Product.find({
      isActive: true,
      _id: { $nin: products.map((p) => p._id) },
    })
      .sort({ rating: -1, createdAt: -1 })
      .limit(limit - products.length)
      .lean();
    products.push(...fallbackProducts);
  }

  res.json({
    success: true,
    data: products,
  });
});

/**
 * @desc    Get featured products
 * @route   GET /api/products/featured
 * @access  Public
 */
const getFeaturedProducts = asyncHandler(async (req, res) => {
  const limit = Number(req.query.limit) || 8;
  const products = await Product.find({ isFeatured: true, isActive: true })
    .populate('category', 'name slug')
    .limit(limit)
    .lean();

  res.json({
    success: true,
    data: products,
  });
});

/**
 * @desc    Create a product
 * @route   POST /api/products
 * @access  Private/Admin
 */
const createProduct = asyncHandler(async (req, res) => {
  const {
    name,
    description,
    price,
    originalPrice,
    discount,
    category,
    categoryLabel,
    categoryName,
    subcategory,
    fit,
    theme,
    material,
    badge,
    image,
    images,
    sizes,
    colors,
    stock,
    variants,
    hasVariants,
    isActive,
    isFeatured,
    isBestseller,
    isNewArrival,
  } = req.body;

  if (!name || price === undefined) {
    res.status(400);
    throw new Error('Please provide product name and price');
  }

  // If variants provided, base price can be derived from lowest variant
  let basePrice = Number(price) || 0;
  if (variants && variants.length > 0 && (!price || price === 0)) {
    basePrice = Math.min(...variants.map((v) => Number(v.price) || 0));
  }

  // Determine category string / ID
  const resolvedCategory = category || 'oversized';
  let resolvedCategoryName = categoryName || categoryLabel || (typeof category === 'string' ? category : '');

  const product = new Product({
    name,
    description: description || '',
    price: basePrice,
    originalPrice: originalPrice ? Number(originalPrice) : basePrice,
    discount: discount ? Number(discount) : 0,
    category: resolvedCategory,
    categoryLabel: categoryLabel || 'Oversized Streetwear',
    categoryName: resolvedCategoryName,
    subcategory: subcategory || 'Back Print',
    fit: fit || 'Oversized Fit',
    theme: theme || 'Street',
    material: material || '100% Cotton (240 GSM)',
    badge: badge || 'NEW DROP',
    image: image || (Array.isArray(images) && images[0]) || '/images/prod_minimal.jpg',
    images: Array.isArray(images) ? images : image ? [image] : ['/images/prod_minimal.jpg'],
    sizes: sizes || ['S', 'M', 'L', 'XL'],
    colors: colors || [
      { name: 'Black', hex: '#0a0a0a' },
      { name: 'White', hex: '#f5f5f7' },
    ],
    stock: stock !== undefined ? Number(stock) : 50,
    hasVariants: Boolean(hasVariants || (variants && variants.length > 0)),
    variants: Array.isArray(variants) ? variants : [],
    isActive: isActive !== undefined ? Boolean(isActive) : true,
    isFeatured: Boolean(isFeatured),
    isBestseller: Boolean(isBestseller),
    isNewArrival: isNewArrival !== undefined ? Boolean(isNewArrival) : true,
  });

  const createdProduct = await product.save();

  const formatted = {
    ...createdProduct.toObject(),
    id: createdProduct._id.toString(),
    formattedPrice: createdProduct.formattedPrice || `₹${(Number(createdProduct.price) || 0).toLocaleString('en-IN')}`,
    image: createdProduct.image || createdProduct.images?.[0] || '/images/prod_minimal.jpg',
  };

  res.status(201).json({
    success: true,
    product: formatted,
    data: formatted,
    message: 'Product created successfully',
  });
});

/**
 * @desc    Update a product
 * @route   PUT /api/products/:id
 * @access  Private/Admin
 */
const updateProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    res.status(404);
    throw new Error('Product not found');
  }

  const fields = [
    'name',
    'description',
    'price',
    'originalPrice',
    'discount',
    'category',
    'categoryLabel',
    'categoryName',
    'subcategory',
    'fit',
    'theme',
    'material',
    'badge',
    'image',
    'images',
    'sizes',
    'colors',
    'stock',
    'variants',
    'hasVariants',
    'isActive',
    'isFeatured',
    'isBestseller',
    'isNewArrival',
  ];

  fields.forEach((field) => {
    if (req.body[field] !== undefined) {
      product[field] = req.body[field];
    }
  });

  if (req.body.name && req.body.name !== product.name) {
    product.slug =
      req.body.name
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-') +
      '-' +
      Math.floor(1000 + Math.random() * 9000);
  }

  const updatedProduct = await product.save();

  const formatted = {
    ...updatedProduct.toObject(),
    id: updatedProduct._id.toString(),
    formattedPrice: updatedProduct.formattedPrice || `₹${(Number(updatedProduct.price) || 0).toLocaleString('en-IN')}`,
    image: updatedProduct.image || updatedProduct.images?.[0] || '/images/prod_minimal.jpg',
  };

  res.json({
    success: true,
    product: formatted,
    data: formatted,
    message: 'Product updated successfully',
  });
});

/**
 * @desc    Toggle product active/inactive status (Admin)
 * @route   PATCH /api/products/:id/toggle-status
 * @access  Private/Admin
 */
const toggleProductStatus = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    res.status(404);
    throw new Error('Product not found');
  }

  product.isActive = !product.isActive;
  const updatedProduct = await product.save();

  res.json({
    success: true,
    product: updatedProduct,
    data: {
      _id: updatedProduct._id,
      name: updatedProduct.name,
      isActive: updatedProduct.isActive,
    },
    message: `Product marked as ${updatedProduct.isActive ? 'Active' : 'Inactive'}`,
  });
});

/**
 * @desc    Delete a product
 * @route   DELETE /api/products/:id
 * @access  Private/Admin
 */
const deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    res.status(404);
    throw new Error('Product not found');
  }

  await Product.findByIdAndDelete(req.params.id);

  res.json({
    success: true,
    message: 'Product deleted successfully',
  });
});

/**
 * @desc    Bulk action on products (delete, activate, deactivate)
 * @route   POST /api/products/bulk-action
 * @access  Private/Admin
 */
const bulkProductAction = asyncHandler(async (req, res) => {
  const { action, ids } = req.body;

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    res.status(400);
    throw new Error('Please provide an array of product IDs');
  }

  if (action === 'delete') {
    const result = await Product.deleteMany({ _id: { $in: ids } });
    return res.json({
      success: true,
      message: `Successfully deleted ${result.deletedCount} products`,
      deletedCount: result.deletedCount,
    });
  }

  if (action === 'activate') {
    const result = await Product.updateMany(
      { _id: { $in: ids } },
      { $set: { isActive: true } }
    );
    return res.json({
      success: true,
      message: `Successfully activated ${result.modifiedCount} products`,
      modifiedCount: result.modifiedCount,
    });
  }

  if (action === 'deactivate') {
    const result = await Product.updateMany(
      { _id: { $in: ids } },
      { $set: { isActive: false } }
    );
    return res.json({
      success: true,
      message: `Successfully deactivated ${result.modifiedCount} products`,
      modifiedCount: result.modifiedCount,
    });
  }

  res.status(400);
  throw new Error('Invalid bulk action. Allowed: delete, activate, deactivate');
});

/**
 * @desc    Get new arrival products (Drops / Latest)
 * @route   GET /api/products/new-arrivals
 * @access  Public
 */
const getNewArrivals = asyncHandler(async (req, res) => {
  const limit = Number(req.query.limit) || 8;
  const products = await Product.find({ isNewArrival: true, isActive: true })
    .populate('category', 'name slug')
    .sort({ createdAt: -1 })
    .limit(limit);

  // Fallback if not enough tagged as new arrivals
  if (products.length < limit) {
    const fallbackProducts = await Product.find({
      isActive: true,
      _id: { $nin: products.map((p) => p._id) },
    })
      .sort({ createdAt: -1 })
      .limit(limit - products.length);
    products.push(...fallbackProducts);
  }

  res.json({
    success: true,
    data: products,
  });
});

/**
 * @desc    Get related products by category
 * @route   GET /api/products/:id/related
 * @access  Public
 */
const getRelatedProducts = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const limit = Number(req.query.limit) || 4;

  const currentProduct = id.match(/^[0-9a-fA-F]{24}$/)
    ? await Product.findById(id)
    : await Product.findOne({ slug: id });

  if (!currentProduct) {
    res.status(404);
    throw new Error('Product not found');
  }

  // Find products in same category or categoryName, excluding current
  const query = {
    _id: { $ne: currentProduct._id },
  };

  if (currentProduct.category) {
    query.category = currentProduct.category;
  } else if (currentProduct.categoryName) {
    query.categoryName = currentProduct.categoryName;
  }

  let related = await Product.find(query).limit(limit);

  // Fallback if less than limit
  if (related.length < limit) {
    const moreProducts = await Product.find({
      _id: { $nin: [currentProduct._id, ...related.map((p) => p._id)] },
    }).limit(limit - related.length);
    related.push(...moreProducts);
  }

  res.json({
    success: true,
    data: related,
  });
});

/**
 * @desc    Get admin product list with inventory metrics
 * @route   GET /api/products/admin/all
 * @access  Private/Admin
 */
const getAdminProducts = asyncHandler(async (req, res) => {
  const { keyword, category, stockStatus, page = 1, limit = 20 } = req.query;

  const query = {};

  if (keyword) {
    query.$or = [
      { name: { $regex: keyword, $options: 'i' } },
      { categoryName: { $regex: keyword, $options: 'i' } },
    ];
  }

  if (category && category !== 'all') {
    query.categoryName = category;
  }

  if (stockStatus === 'outOfStock') {
    query.stock = { $lte: 0 };
  } else if (stockStatus === 'lowStock') {
    query.stock = { $gt: 0, $lte: 10 };
  } else if (stockStatus === 'inStock') {
    query.stock = { $gt: 10 };
  }

  const pageSize = Number(limit);
  const pageNumber = Number(page);
  const skip = (pageNumber - 1) * pageSize;

  const total = await Product.countDocuments(query);
  const products = await Product.find(query)
    .populate('category', 'name')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(pageSize);

  // Overall counts for admin dashboard
  const [totalCount, outOfStockCount, lowStockCount] = await Promise.all([
    Product.countDocuments(),
    Product.countDocuments({ stock: { $lte: 0 } }),
    Product.countDocuments({ stock: { $gt: 0, $lte: 10 } }),
  ]);

  res.json({
    success: true,
    data: products,
    page: pageNumber,
    pages: Math.ceil(total / pageSize) || 1,
    total,
    meta: {
      totalCount,
      outOfStockCount,
      lowStockCount,
    },
  });
});

/**
 * @desc    Create a new review for a product
 * @route   POST /api/products/:id/reviews
 * @access  Private
 */
const createProductReview = asyncHandler(async (req, res) => {
  const { rating, comment } = req.body;
  const product = await Product.findById(req.params.id);

  if (!product) {
    res.status(404);
    throw new Error('Product not found');
  }

  const alreadyReviewed = product.reviews.find(
    (r) => r.user.toString() === req.user._id.toString()
  );

  if (alreadyReviewed) {
    res.status(400);
    throw new Error('You have already reviewed this product');
  }

  const review = {
    name: req.user.name,
    rating: Number(rating),
    comment,
    user: req.user._id,
  };

  product.reviews.push(review);
  product.numReviews = product.reviews.length;
  product.rating =
    product.reviews.reduce((acc, item) => item.rating + acc, 0) / product.reviews.length;

  await product.save();

  res.status(201).json({
    success: true,
    message: 'Review added successfully',
  });
});

export {
  getProducts,
  getProductById,
  getProductAttributes,
  getBestsellers,
  getFeaturedProducts,
  getNewArrivals,
  getRelatedProducts,
  getAdminProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  bulkProductAction,
  toggleProductStatus,
  createProductReview,
};

export default {
  getProducts,
  getProductById,
  getProductAttributes,
  getBestsellers,
  getFeaturedProducts,
  getNewArrivals,
  getRelatedProducts,
  getAdminProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  bulkProductAction,
  toggleProductStatus,
  createProductReview,
};

