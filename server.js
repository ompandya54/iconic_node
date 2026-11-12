import express from 'express';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';
import morgan from 'morgan';
import { fileURLToPath } from 'url';

import connectDB from './config/db.js';
import authRoutes from './routes/authRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import productRoutes from './routes/productRoutes.js';
import categoryRoutes from './routes/categoryRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import sectionRoutes from './routes/sectionRoutes.js';
import uploadRoutes from './routes/uploadRoutes.js';
import attributeRoutes from './routes/attributeRoutes.js';
import seedRoutes from './routes/seedRoutes.js';
import { notFound, errorHandler } from './middlewares/errorMiddleware.js';

// Resolve __dirname in ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

// Connect to MongoDB
connectDB();

const app = express();

// HTTP request logger
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// Enable CORS
const allowedOrigins = [
  'https://iconiccloaths.vercel.app',
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:5173',
  process.env.CLIENT_URL,
].filter(Boolean);

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (mobile apps, curl, postman)
      if (!origin) return callback(null, true);

      // Clean origin without trailing slash
      const cleanOrigin = origin.replace(/\/$/, '');
      const isAllowed = allowedOrigins.some((allowed) => allowed.replace(/\/$/, '') === cleanOrigin);

      if (isAllowed || (origin && origin.includes('iconiccloaths.vercel.app')) || process.env.NODE_ENV !== 'production') {
        return callback(null, true);
      }
      return callback(new Error(`Not allowed by CORS: Origin ${origin} is not authorized`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Body parser middlewares
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve uploaded images statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health check and root route
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Welcome to Iconic Clothing Store API',
    version: '1.0.0',
    status: 'Server is healthy & running',
    timestamp: new Date().toISOString(),
  });
});

// Mount API routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/sections', sectionRoutes);
app.use('/api/attributes', attributeRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/seed', seedRoutes);

// Middlewares for 404 and global error handling
app.use(notFound);
app.use(errorHandler);

// Start Server
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`===============================================`);
  console.log(` Iconic Express Server running on port ${PORT}`);
  console.log(` Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(` API URL: http://localhost:${PORT}`);
  console.log(`===============================================`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error(`Unhandled Rejection Error: ${err.message}`);
  // server.close(() => process.exit(1));
});

export default app;
export { app, server };
