import express from 'express';
import Admin from '../models/adminModel.js';
import Category from '../models/categoryModel.js';
import Product from '../models/productModel.js';
import Section from '../models/sectionModel.js';
import asyncHandler from '../utils/asyncHandler.js';

const router = express.Router();

// Initial seed categories
const demoCategories = [
  {
    name: 'Oversized Tees',
    slug: 'oversized',
    description: 'Heavyweight oversized streetwear t-shirts',
    image: '/images/cat_oversized.jpg',
  },
  {
    name: 'Graphic Tees',
    slug: 'graphic',
    description: 'Vintage and modern bold streetwear graphics',
    image: '/images/cat_graphic.jpg',
  },
  {
    name: 'Essentials',
    slug: 'essentials',
    description: 'Minimal solid luxury cotton basics',
    image: '/images/cat_essentials.jpg',
  },
  {
    name: 'New Arrivals',
    slug: 'new-arrivals',
    description: 'Latest drops and limited edition pieces',
    image: '/images/cat_newarrivals.jpg',
  },
];

// 10 Authentic Iconic Streetwear Products
const iconicProducts = [
  {
    name: 'Minimal Logo Tee',
    category: 'essentials',
    categoryLabel: 'Essentials',
    subcategory: 'Solid Essentials',
    theme: 'Minimal',
    fit: 'Oversized Fit',
    material: '100% French Terry (240 GSM)',
    price: 999,
    originalPrice: 1499,
    formattedPrice: '₹999',
    badge: 'BESTSELLER',
    isBestseller: true,
    isFeatured: true,
    isNewArrival: false,
    stock: 50,
    sizes: ['S', 'M', 'L', 'XL'],
    colors: [
      { name: 'Black', hex: '#0a0a0a', image: '/images/prod_minimal.jpg' },
      { name: 'White', hex: '#f5f5f7', image: '/images/prod_metamorphosis.jpg' },
    ],
    image: '/images/prod_minimal.jpg',
    images: ['/images/prod_minimal.jpg', '/images/prod_metamorphosis.jpg'],
    description: 'Crafted from luxury 240 GSM French Terry cotton. Drop-shoulder relaxed streetwear silhouette.',
  },
  {
    name: 'Metamorphosis Tee',
    category: 'graphic',
    categoryLabel: 'Graphic Tees',
    subcategory: 'Front Graphic',
    theme: 'Street',
    fit: 'Oversized Fit',
    material: 'Heavyweight Cotton (260 GSM)',
    price: 1199,
    originalPrice: 1799,
    formattedPrice: '₹1,199',
    badge: 'NEW DROP',
    isBestseller: false,
    isFeatured: true,
    isNewArrival: true,
    stock: 40,
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    colors: [
      { name: 'White', hex: '#f5f5f7', image: '/images/prod_metamorphosis.jpg' },
      { name: 'Black', hex: '#0a0a0a', image: '/images/prod_minimal.jpg' },
    ],
    image: '/images/prod_metamorphosis.jpg',
    images: ['/images/prod_metamorphosis.jpg', '/images/prod_minimal.jpg'],
    description: 'High-density screenprint on ultra-heavyweight 260 GSM organic cotton fabric.',
  },
  {
    name: 'Discipline Tee',
    category: 'oversized',
    categoryLabel: 'Oversized Tees',
    subcategory: 'Back Print',
    theme: 'Typography',
    fit: 'Oversized Fit',
    material: '100% Combed Cotton (220 GSM)',
    price: 999,
    originalPrice: 1499,
    formattedPrice: '₹999',
    badge: 'BESTSELLER',
    isBestseller: true,
    isFeatured: false,
    isNewArrival: false,
    stock: 60,
    sizes: ['M', 'L', 'XL'],
    colors: [
      { name: 'Black', hex: '#0a0a0a', image: '/images/prod_discipline.jpg' },
      { name: 'White', hex: '#f5f5f7', image: '/images/prod_urbandrift.jpg' },
    ],
    image: '/images/prod_discipline.jpg',
    images: ['/images/prod_discipline.jpg', '/images/prod_urbandrift.jpg'],
    description: 'Bold iconic back print statement typography in premium combed breathable cotton.',
  },
  {
    name: 'Urban Drift Tee',
    category: 'graphic',
    categoryLabel: 'Graphic Tees',
    subcategory: 'Vintage Art',
    theme: 'Vintage',
    fit: 'Boxy Fit',
    material: 'Heavyweight Cotton (240 GSM)',
    price: 1199,
    originalPrice: 1699,
    formattedPrice: '₹1,199',
    badge: 'LIMITED',
    isBestseller: false,
    isFeatured: false,
    isNewArrival: true,
    stock: 25,
    sizes: ['S', 'M', 'L', 'XL'],
    colors: [
      { name: 'White', hex: '#f5f5f7', image: '/images/prod_urbandrift.jpg' },
      { name: 'Black', hex: '#0a0a0a', image: '/images/prod_discipline.jpg' },
    ],
    image: '/images/prod_urbandrift.jpg',
    images: ['/images/prod_urbandrift.jpg', '/images/prod_discipline.jpg'],
    description: 'Japanese drift culture inspired vintage artwork with a custom tailored boxy cut.',
  },
  {
    name: 'Lost In Time Tee',
    category: 'oversized',
    categoryLabel: 'Oversized Tees',
    subcategory: 'Abstract Print',
    theme: 'Abstract',
    fit: 'Oversized Fit',
    material: '100% Organic Cotton (220 GSM)',
    price: 1199,
    originalPrice: 1799,
    formattedPrice: '₹1,199',
    badge: 'NEW DROP',
    isBestseller: false,
    isFeatured: true,
    isNewArrival: true,
    stock: 35,
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    colors: [
      { name: 'Black', hex: '#0a0a0a', image: '/images/prod_lostintime.jpg' },
      { name: 'White', hex: '#f5f5f7', image: '/images/prod_metamorphosis.jpg' },
    ],
    image: '/images/prod_lostintime.jpg',
    images: ['/images/prod_lostintime.jpg'],
    description: 'Surrealist artwork drop printed on sustainably sourced 100% organic cotton.',
  },
  {
    name: 'Chaos Anarchy Tee',
    category: 'oversized',
    categoryLabel: 'Oversized Tees',
    subcategory: 'Back Print',
    theme: 'Street',
    fit: 'Oversized Fit',
    material: '100% French Terry (240 GSM)',
    price: 1299,
    originalPrice: 1899,
    formattedPrice: '₹1,299',
    badge: 'HOT',
    isBestseller: true,
    isFeatured: true,
    isNewArrival: false,
    stock: 30,
    sizes: ['M', 'L', 'XL'],
    colors: [
      { name: 'Black', hex: '#0a0a0a', image: '/images/cat_oversized.jpg' },
      { name: 'White', hex: '#f5f5f7', image: '/images/cat_graphic.jpg' },
    ],
    image: '/images/cat_oversized.jpg',
    images: ['/images/cat_oversized.jpg'],
    description: 'Rebellious streetwear aesthetic featuring distressed punk typographic back print.',
  },
  {
    name: 'Gothic Realm Tee',
    category: 'graphic',
    categoryLabel: 'Graphic Tees',
    subcategory: 'Vintage Art',
    theme: 'Vintage',
    fit: 'Oversized Fit',
    material: 'Heavyweight Cotton (240 GSM)',
    price: 1299,
    originalPrice: 1999,
    formattedPrice: '₹1,299',
    badge: 'LIMITED',
    isBestseller: false,
    isFeatured: false,
    isNewArrival: false,
    stock: 15,
    sizes: ['S', 'M', 'L', 'XL'],
    colors: [
      { name: 'Off White', hex: '#f0efe9', image: '/images/cat_graphic.jpg' },
      { name: 'Black', hex: '#0a0a0a', image: '/images/cat_oversized.jpg' },
    ],
    image: '/images/cat_graphic.jpg',
    images: ['/images/cat_graphic.jpg'],
    description: 'Dark gothic cathedral architecture printed with subtle chrome accents.',
  },
  {
    name: 'Rebel Wings Tee',
    category: 'new-arrivals',
    categoryLabel: 'New Arrivals',
    subcategory: 'Front Graphic',
    theme: 'Street',
    fit: 'Oversized Fit',
    material: 'Heavyweight Cotton (260 GSM)',
    price: 1399,
    originalPrice: 2199,
    formattedPrice: '₹1,399',
    badge: 'NEW DROP',
    isBestseller: false,
    isFeatured: true,
    isNewArrival: true,
    stock: 45,
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    colors: [
      { name: 'White', hex: '#f5f5f7', image: '/images/cat_newarrivals.jpg' },
      { name: 'Black', hex: '#0a0a0a', image: '/images/cat_essentials.jpg' },
    ],
    image: '/images/cat_newarrivals.jpg',
    images: ['/images/cat_newarrivals.jpg'],
    description: 'Winged emblem front chest print with signature Iconic branding on sleeve hem.',
  },
  {
    name: 'Night Division Tee',
    category: 'essentials',
    categoryLabel: 'Essentials',
    subcategory: 'Solid Essentials',
    theme: 'Minimal',
    fit: 'Oversized Fit',
    material: 'Compact Cotton (210 GSM)',
    price: 1099,
    originalPrice: 1599,
    formattedPrice: '₹1,099',
    badge: 'BESTSELLER',
    isBestseller: true,
    isFeatured: false,
    isNewArrival: false,
    stock: 50,
    sizes: ['S', 'M', 'L', 'XL'],
    colors: [
      { name: 'Black', hex: '#0a0a0a', image: '/images/cat_essentials.jpg' },
      { name: 'White', hex: '#f5f5f7', image: '/images/cat_newarrivals.jpg' },
    ],
    image: '/images/cat_essentials.jpg',
    images: ['/images/cat_essentials.jpg'],
    description: 'Jet black deep dyed compact cotton tee for everyday luxury minimalist styling.',
  },
  {
    name: 'Shadows Drop Hoodie',
    category: 'new-arrivals',
    categoryLabel: 'New Arrivals',
    subcategory: 'Heavyweight Hoodie',
    theme: 'Street',
    fit: 'Relaxed Fit',
    material: 'Fleece Cotton (380 GSM)',
    price: 2499,
    originalPrice: 3999,
    formattedPrice: '₹2,499',
    badge: 'LIMITED EDITION',
    isBestseller: true,
    isFeatured: true,
    isNewArrival: true,
    stock: 20,
    sizes: ['M', 'L', 'XL'],
    colors: [
      { name: 'Charcoal', hex: '#1a1a1f', image: '/images/story_stairs_model.jpg' },
      { name: 'Black', hex: '#0a0a0a', image: '/images/cat_collections.jpg' },
    ],
    image: '/images/story_stairs_model.jpg',
    images: ['/images/story_stairs_model.jpg', '/images/cat_collections.jpg'],
    description: 'Heavyweight 380 GSM fleece pullover hoodie with double-layer hood and custom metal eyelets.',
  },
];

// Default Dynamic Sections for Landing Page
const demoSections = [
  {
    title: 'The Oversized Collection',
    subtitle: 'Drop-shoulder heavyweight streetwear silhouettes',
    filterType: 'fit',
    filterValue: 'Oversized Fit',
    limit: 6,
    displayOrder: 1,
    isActive: true,
  },
  {
    title: 'Vintage & Graphic Drops',
    subtitle: 'Limited edition high-density prints',
    filterType: 'theme',
    filterValue: 'Vintage',
    limit: 4,
    displayOrder: 2,
    isActive: true,
  },
  {
    title: 'Signature Bestsellers',
    subtitle: 'Most coveted pieces from the Iconic vault',
    filterType: 'badge',
    filterValue: 'BESTSELLER',
    limit: 4,
    displayOrder: 3,
    isActive: true,
  },
];

/**
 * @desc    Seed database with default admin, categories, 10 iconic products & dynamic sections
 * @route   POST /api/seed
 * @access  Public
 */
router.post(
  '/',
  asyncHandler(async (req, res) => {
    // 1. Seed Default Admin if not exists
    let admin = await Admin.findOne({ email: 'admin@iconic.com' });
    if (!admin) {
      admin = await Admin.create({
        name: 'Admin',
        email: 'admin@iconic.com',
        password: 'admin123',
        role: 'admin',
      });
    }

    // 2. Seed Categories
    const createdCategories = [];
    for (const cat of demoCategories) {
      let existing = await Category.findOne({ slug: cat.slug });
      if (!existing) {
        existing = await Category.create(cat);
      }
      createdCategories.push(existing);
    }

    // 3. Seed Products
    const createdProducts = [];
    for (const prod of iconicProducts) {
      let existing = await Product.findOne({ name: prod.name });
      if (!existing) {
        existing = await Product.create(prod);
      }
      createdProducts.push(existing);
    }

    // 4. Seed Dynamic Sections
    const createdSections = [];
    for (const sec of demoSections) {
      let existing = await Section.findOne({ title: sec.title });
      if (!existing) {
        existing = await Section.create(sec);
      }
      createdSections.push(existing);
    }

    res.json({
      success: true,
      message: 'Database seeded successfully with 10 Iconic Streetwear products, categories, dynamic sections & admin!',
      data: {
        admin: {
          username: 'admin',
          email: 'admin@iconic.com',
          password: 'admin123',
        },
        categoriesCount: createdCategories.length,
        productsCount: createdProducts.length,
        sectionsCount: createdSections.length,
      },
    });
  })
);

export default router;
