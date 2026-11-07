import jwt from 'jsonwebtoken';
import User from '../models/userModel.js';
import Admin from '../models/adminModel.js';
import asyncHandler from '../utils/asyncHandler.js';

/**
 * Protect routes: Checks for JWT token in Authorization header or cookies
 */
const protect = asyncHandler(async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  if (!token) {
    res.status(401);
    throw new Error('Not authorized, no token provided');
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'iconic_secret_jwt_key');

    // First try to find in User model
    let user = await User.findById(decoded.id).select('-password');

    // If not found, check Admin model
    if (!user) {
      user = await Admin.findById(decoded.id).select('-password');
    }

    if (!user) {
      res.status(401);
      throw new Error('User not found with this token');
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401);
    throw new Error('Not authorized, invalid or expired token');
  }
});

/**
 * Restrict access to Admins only
 */
const adminOnly = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403);
    throw new Error('Access denied: Admin resources only');
  }
};

/**
 * Specifically protects Admin routes
 */
const protectAdmin = asyncHandler(async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    res.status(401);
    throw new Error('Not authorized as admin, no token provided');
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'iconic_secret_jwt_key');

    // Check Admin model first
    let admin = await Admin.findById(decoded.id).select('-password');

    // Fallback: check if standard user has role === 'admin'
    if (!admin) {
      const user = await User.findById(decoded.id).select('-password');
      if (user && user.role === 'admin') {
        admin = user;
      }
    }

    if (!admin) {
      res.status(403);
      throw new Error('Not authorized as admin');
    }

    req.admin = admin;
    req.user = admin;
    next();
  } catch (error) {
    res.status(401);
    throw new Error('Not authorized as admin, token verification failed');
  }
});

export {
  protect,
  adminOnly,
  protectAdmin,
};

export default {
  protect,
  adminOnly,
  protectAdmin,
};

