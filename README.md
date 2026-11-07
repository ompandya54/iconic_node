# Iconic Clothing Store - Backend API (Express.js & MongoDB)

A dedicated, scalable REST API server built with **Express.js**, **MongoDB (Mongoose)**, and **JWT Authentication** for the Iconic clothing store.

---

## 📁 Project Architecture

```
iconic_node/
├── config/
│   └── db.js                 # MongoDB connection using Mongoose
├── controllers/
│   ├── adminController.js    # Admin authentication, profile, dashboard metrics
│   ├── authController.js     # User registration, login, user profile & management
│   ├── categoryController.js # Category CRUD operations
│   ├── orderController.js    # Order checkout, tracking, status updates & management
│   ├── productController.js  # Product catalog, filters, search, pagination, attributes
│   └── uploadController.js   # Image upload handling (Local storage & Cloudinary support)
├── middlewares/
│   ├── authMiddleware.js     # JWT token protection, admin authorization guards
│   ├── errorMiddleware.js    # 404 handler and central global error handling
│   └── uploadMiddleware.js   # Multer file upload configuration & file filters
├── models/
│   ├── adminModel.js         # Admin Schema & methods (bcrypt password hashing)
│   ├── categoryModel.js      # Category Schema & slug auto-generation
│   ├── orderModel.js         # Order Schema & auto order-number generation
│   ├── productModel.js       # Product Schema & discount/slug calculation
│   └── userModel.js          # User Schema & methods
├── routes/
│   ├── adminRoutes.js        # /api/admin
│   ├── authRoutes.js         # /api/auth
│   ├── categoryRoutes.js     # /api/categories
│   ├── orderRoutes.js        # /api/orders
│   ├── productRoutes.js      # /api/products
│   ├── seedRoutes.js         # /api/seed
│   └── uploadRoutes.js       # /api/upload
├── scripts/
│   └── seed.js               # CLI script for seeding demo products, categories & admin
├── utils/
│   ├── asyncHandler.js       # Express async route wrapper (no try/catch boilerplate)
│   └── generateToken.js      # JWT token generator
├── uploads/                  # Local folder for uploaded images
├── .env                      # Local environment configuration
├── .env.example              # Environment variables template
├── package.json              # NPM dependencies & scripts
└── server.js                 # Express application initialization & middleware stack
```

---

## 🚀 Quick Setup & Installation

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Edit `.env` file if needed (default points to local MongoDB):
```env
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb://127.0.0.1:27017/iconic_db
JWT_SECRET=your_jwt_secret_key_here
CLIENT_URL=http://localhost:3000
```

### 3. Seed Initial Data (Admin, Categories, Products)
```bash
npm run seed
```
> **Default Admin Account:**
> - Email: `admin@iconic.com`
> - Password: `adminpassword123`

### 4. Start Server
- Development mode (with nodemon):
```bash
npm run dev
```
- Production mode:
```bash
npm start
```

---

## 📡 API Endpoints Reference

### 🔐 Authentication (`/api/auth`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/api/auth/register` | Public | Register new customer account |
| POST | `/api/auth/login` | Public | Customer login & get JWT token |
| GET | `/api/auth/profile` | Private | Get logged-in user profile |
| PUT | `/api/auth/profile` | Private | Update profile / address / password |
| GET | `/api/auth/wishlist` | Private | Get user's saved wishlist products |
| POST | `/api/auth/wishlist/:productId` | Private | Add product to user wishlist |
| DELETE | `/api/auth/wishlist/:productId` | Private | Remove product from user wishlist |
| GET | `/api/auth/users` | Admin | Get list of all users |
| GET | `/api/auth/users/:id` | Admin | Get user by ID |
| DELETE | `/api/auth/users/:id` | Admin | Delete a user |

### 🛡️ Admin Management (`/api/admin`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/api/admin/login` | Public | Admin login & get JWT token |
| GET | `/api/admin/me` | Admin | Get current admin info |
| POST | `/api/admin/create` | Admin | Create an additional admin account |
| GET | `/api/admin/dashboard` | Admin | Get revenue, order count, user count & stats |

### 👕 Products (`/api/products`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/api/products` | Public | List products (supports `keyword`, `category`, `minPrice`, `maxPrice`, `inStock`, `size`, `color`, `sort`, `page`, `limit`) |
| GET | `/api/products/attributes` | Public | Get unique categories, sizes, colors & price range (for shop filters) |
| GET | `/api/products/bestsellers` | Public | Get best-selling products (for Landing page Bestsellers section) |
| GET | `/api/products/featured` | Public | Get featured products (for Landing page Hero / Featured section) |
| GET | `/api/products/new-arrivals` | Public | Get new arrival products (for Landing page Drops / New Arrivals) |
| GET | `/api/products/:id` | Public | Get single product by ID or slug |
| GET | `/api/products/:id/related` | Public | Get related products in same category (for Product details page) |
| GET | `/api/products/admin/all` | Admin | Get all products with inventory stats (low stock, out of stock, pagination) |
| POST | `/api/products` | Admin | Create product (title, desc, price, mrp, category, stock, sizes, colors, variants, badges, images) |
| PUT | `/api/products/:id` | Admin | Update product details / inventory / variants |
| PATCH | `/api/products/:id/toggle-status` | Admin | Toggle product active/inactive status in one click |
| DELETE | `/api/products/:id` | Admin | Delete product |
| POST | `/api/products/:id/reviews` | Private | Add review and rating to product |

### 🏷️ Categories (`/api/categories`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/api/categories` | Public | List all active categories |
| GET | `/api/categories/:id` | Public | Get category by ID or slug |
| POST | `/api/categories` | Admin | Create category |
| PUT | `/api/categories/:id` | Admin | Update category |
| DELETE | `/api/categories/:id` | Admin | Delete category |

### 📦 Orders (`/api/orders`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/api/orders` | Public/User | Place an order (supports Guest checkout & stock deduction) |
| GET | `/api/orders/myorders` | Private | Get user's order history |
| GET | `/api/orders/:id` | Public/User | Get order details by ID or order number |
| GET | `/api/orders` | Admin | Get all orders with pagination & status filter |
| PUT | `/api/orders/:id/status` | Admin | Update order status (`Pending`, `Confirmed`, `Processing`, `Shipped`, `Delivered`, `Cancelled`) |
| PUT | `/api/orders/:id/pay` | Private | Mark order as paid |
| DELETE | `/api/orders/:id` | Admin | Delete an order |

### 🎨 Dynamic Landing Page Sections (`/api/sections`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/api/sections/active` | Public | Get all active landing page sections with populated products |
| GET | `/api/sections` | Admin | Get all configured sections (active & inactive) |
| POST | `/api/sections` | Admin | Create new dynamic section (filter by fit, theme, material, badge, category) |
| PUT | `/api/sections/:id` | Admin | Update section title, subtitle, filter or display order |
| PATCH | `/api/sections/:id/toggle` | Admin | Toggle section visibility ON/OFF for landing page |
| DELETE | `/api/sections/:id` | Admin | Delete a section |

### 🖼️ Media Upload (`/api/upload`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/api/upload` | Admin | Upload single product image (field: `image`) |
| POST | `/api/upload/multiple` | Admin | Upload multiple images up to 10 (field: `images`) |

### 🌱 Seed API (`/api/seed`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/api/seed` | Public | Seed default categories, admin & products via API |

