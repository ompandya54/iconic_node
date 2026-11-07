const Admin = require('../models/adminModel');
const Order = require('../models/orderModel');
const Product = require('../models/productModel');
const User = require('../models/userModel');
const generateToken = require('../utils/generateToken');
const asyncHandler = require('../utils/asyncHandler');

/**
 * @desc    Admin login
 * @route   POST /api/admin/login
 * @access  Public
 */
const adminLogin = asyncHandler(async (req, res) => {
  const identifier = (req.body.email || req.body.username || '').trim();
  const { password } = req.body;

  if (!identifier || !password) {
    res.status(400);
    throw new Error('Please provide email/username and password');
  }

  // Find admin by email or name 'admin'
  let admin;
  if (identifier.toLowerCase() === 'admin') {
    admin = await Admin.findOne({
      $or: [{ email: 'admin@iconic.com' }, { name: { $regex: /^admin$/i } }],
    }).select('+password');
  } else {
    admin = await Admin.findOne({ email: identifier.toLowerCase() }).select('+password');
  }

  // Fallback: If no admin in DB, auto-create default admin
  if (!admin && identifier.toLowerCase() === 'admin' && (password === 'admin123' || password === 'adminpassword123')) {
    admin = await Admin.create({
      name: 'Admin',
      email: 'admin@iconic.com',
      password: password,
      role: 'admin',
    });
  }

  if (admin && (await admin.matchPassword(password))) {
    const token = generateToken({ id: admin._id, role: admin.role });

    res.json({
      success: true,
      token, // Top level token for frontend localStorage.setItem('iconic_admin_token', data.token)
      user: {
        _id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
      },
      data: {
        _id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        token,
      },
      message: 'Admin logged in successfully',
    });
  } else {
    res.status(401);
    throw new Error('Invalid admin credentials');
  }
});

/**
 * @desc    Get current admin profile
 * @route   GET /api/admin/me
 * @access  Private/Admin
 */
const getAdminProfile = asyncHandler(async (req, res) => {
  const admin = req.admin || req.user;

  if (admin) {
    res.json({
      success: true,
      authenticated: true, // Frontend checkSession expects data.authenticated
      user: {
        _id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
      },
      data: {
        _id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
      },
    });
  } else {
    res.status(401).json({
      success: false,
      authenticated: false,
      message: 'Admin not authenticated',
    });
  }
});

/**
 * @desc    Register a new admin (Protected)
 * @route   POST /api/admin/create
 * @access  Private/Admin
 */
const createAdmin = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    res.status(400);
    throw new Error('Please provide name, email, and password');
  }

  const adminExists = await Admin.findOne({ email });
  if (adminExists) {
    res.status(400);
    throw new Error('Admin with this email already exists');
  }

  const admin = await Admin.create({
    name,
    email,
    password,
    role: 'admin',
  });

  res.status(201).json({
    success: true,
    data: {
      _id: admin._id,
      name: admin.name,
      email: admin.email,
      role: admin.role,
    },
    message: 'Admin account created successfully',
  });
});

/**
 * @desc    Get dashboard metrics & summary
 * @route   GET /api/admin/dashboard
 * @access  Private/Admin
 */
const getDashboardStats = asyncHandler(async (req, res) => {
  const [totalProducts, totalOrders, totalUsers, orders] = await Promise.all([
    Product.countDocuments(),
    Order.countDocuments(),
    User.countDocuments(),
    Order.find({}).sort({ createdAt: -1 }),
  ]);

  // Calculate total revenue from completed / paid orders
  const totalRevenue = orders.reduce((acc, order) => {
    return order.orderStatus !== 'Cancelled' ? acc + (order.totalPrice || 0) : acc;
  }, 0);

  // Status breakdown
  const statusCounts = {
    pending: orders.filter((o) => o.orderStatus === 'Pending').length,
    processing: orders.filter((o) => o.orderStatus === 'Processing').length,
    shipped: orders.filter((o) => o.orderStatus === 'Shipped').length,
    delivered: orders.filter((o) => o.orderStatus === 'Delivered').length,
    cancelled: orders.filter((o) => o.orderStatus === 'Cancelled').length,
  };

  // Recent 5 orders
  const recentOrders = orders.slice(0, 5);

  res.json({
    success: true,
    data: {
      totalRevenue,
      totalOrders,
      totalProducts,
      totalUsers,
      statusCounts,
      recentOrders,
    },
  });
});

module.exports = {
  adminLogin,
  getAdminProfile,
  createAdmin,
  getDashboardStats,
};

