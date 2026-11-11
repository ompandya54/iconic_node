import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    name: {
      type: String,
      required: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    comment: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Individual Variant Schema (Size, Color, Price, Stock, SKU)
const variantSchema = new mongoose.Schema({
  sku: {
    type: String,
    trim: true,
  },
  size: {
    type: String,
    required: [true, 'Variant size is required'],
    trim: true,
  },
  color: {
    type: String,
    default: '',
    trim: true,
  },
  price: {
    type: Number,
    required: [true, 'Variant price is required'],
  },
  originalPrice: {
    type: Number,
    default: 0,
  },
  discount: {
    type: Number,
    default: 0,
  },
  stock: {
    type: Number,
    required: [true, 'Variant stock is required'],
    default: 0,
  },
  image: {
    type: String,
    default: '',
  },
  isActive: {
    type: Boolean,
    default: true,
  },
});

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide product name'],
      trim: true,
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
      trim: true,
    },
    description: {
      type: String,
      default: '',
    },
    price: {
      type: Number,
      required: [true, 'Please provide product base price'],
      default: 0,
    },
    originalPrice: {
      type: Number,
      default: 0,
    },
    formattedPrice: {
      type: String,
      default: '',
    },
    discount: {
      type: Number,
      default: 0,
    },
    category: {
      type: mongoose.Schema.Types.Mixed,
      default: 'oversized',
    },
    categoryLabel: {
      type: String,
      default: 'Oversized Streetwear',
    },
    categoryName: {
      type: String,
      trim: true,
      default: '',
    },
    subcategory: {
      type: String,
      default: 'Back Print',
    },
    fit: {
      type: String,
      default: 'Oversized Fit',
    },
    theme: {
      type: String,
      default: 'Street',
    },
    material: {
      type: String,
      default: '100% Cotton (240 GSM)',
    },
    badge: {
      type: String,
      default: 'NEW DROP',
    },
    image: {
      type: String,
      default: '',
    },
    images: {
      type: [String],
      default: [],
    },
    // Global sizes & colors (supports strings or objects with name, hex, image)
    sizes: {
      type: [String],
      default: ['S', 'M', 'L', 'XL'],
    },
    colors: {
      type: mongoose.Schema.Types.Mixed,
      default: [
        { name: 'Black', hex: '#0a0a0a' },
        { name: 'White', hex: '#f5f5f7' },
      ],
    },
    stock: {
      type: Number,
      required: [true, 'Please provide total stock count'],
      default: 0,
    },
    // Variant support
    hasVariants: {
      type: Boolean,
      default: false,
    },
    variants: [variantSchema],
    // Status management
    isActive: {
      type: Boolean,
      default: true,
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
    isBestseller: {
      type: Boolean,
      default: false,
    },
    isNewArrival: {
      type: Boolean,
      default: true,
    },
    rating: {
      type: Number,
      default: 0,
    },
    numReviews: {
      type: Number,
      default: 0,
    },
    reviews: [reviewSchema],
  },
  {
    timestamps: true,
  }
);

// Auto-generate slug and sync variant data before saving
productSchema.pre('save', function (next) {
  // Generate slug
  if (this.isModified('name') && !this.slug) {
    this.slug =
      this.name
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '') +
      '-' +
      Math.floor(1000 + Math.random() * 9000);
  }

  // Handle Variants Logic
  if (this.variants && this.variants.length > 0) {
    this.hasVariants = true;

    // Auto-calculate total stock across all variants
    this.stock = this.variants.reduce((sum, v) => sum + (Number(v.stock) || 0), 0);

    // Auto-calculate base starting price (lowest variant price)
    const validPrices = this.variants.map((v) => Number(v.price)).filter((p) => !isNaN(p) && p > 0);
    if (validPrices.length > 0) {
      this.price = Math.min(...validPrices);
    }

    // Auto-sync available sizes & colors from variants
    const uniqueSizes = [...new Set(this.variants.map((v) => v.size).filter(Boolean))];
    const uniqueColors = [...new Set(this.variants.map((v) => v.color).filter(Boolean))];
    if (uniqueSizes.length > 0) this.sizes = uniqueSizes;
    if (uniqueColors.length > 0) this.colors = uniqueColors;

    // Calculate variant discounts
    this.variants.forEach((v) => {
      if (v.originalPrice && v.originalPrice > v.price && (!v.discount || v.discount === 0)) {
        v.discount = Math.round(((v.originalPrice - v.price) / v.originalPrice) * 100);
      }
    });
  }

  // Auto-format formattedPrice string (e.g. ₹999)
  this.formattedPrice = `₹${(Number(this.price) || 0).toLocaleString('en-IN')}`;

  // Ensure default primary image if empty
  if (!this.image) {
    if (this.images && this.images.length > 0) {
      this.image = this.images[0];
    } else if (Array.isArray(this.colors) && this.colors.length > 0 && this.colors[0]?.image) {
      this.image = this.colors[0].image;
    } else {
      this.image = '/images/prod_minimal.jpg';
    }
  }

  // Ensure images array has primary image
  if (this.images.length === 0 && this.image) {
    this.images = [this.image];
  }

  // Auto-calculate product discount percentage
  if (this.originalPrice && this.originalPrice > this.price && (!this.discount || this.discount === 0)) {
    this.discount = Math.round(((this.originalPrice - this.price) / this.originalPrice) * 100);
  }

  next();
});

// ==========================================
// PERFORMANCE INDEXES (INSTANT SUB-10MS QUERIES)
// ==========================================

// 1. Primary Lookups & Catalog Sorts
productSchema.index({ slug: 1 }, { unique: true });
productSchema.index({ isActive: 1, createdAt: -1 });

// 2. High-Frequency Filters
productSchema.index({ category: 1, isActive: 1, createdAt: -1 });
productSchema.index({ subcategory: 1, isActive: 1 });
productSchema.index({ fit: 1, isActive: 1 });
productSchema.index({ theme: 1, isActive: 1 });
productSchema.index({ price: 1, isActive: 1 });
productSchema.index({ price: -1, isActive: 1 });

// 3. Homepage Drops, Sections & Badges
productSchema.index({ isBestseller: 1, isActive: 1, createdAt: -1 });
productSchema.index({ isFeatured: 1, isActive: 1, createdAt: -1 });
productSchema.index({ isNewArrival: 1, isActive: 1, createdAt: -1 });
productSchema.index({ badge: 1, isActive: 1 });

// 4. Inverted Full-Text Search Index (Instant search on Name, Description, Subcategory & Theme)
productSchema.index(
  {
    name: 'text',
    description: 'text',
    subcategory: 'text',
    theme: 'text',
  },
  {
    weights: {
      name: 10,
      subcategory: 5,
      theme: 3,
      description: 1,
    },
    name: 'ProductTextSearchIndex',
  }
);

const Product = mongoose.model('Product', productSchema);

export default Product;
export { Product };

