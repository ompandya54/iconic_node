import Order from '../models/orderModel.js';
import Product from '../models/productModel.js';
import asyncHandler from '../utils/asyncHandler.js';

/**
 * @desc    Create new order
 * @route   POST /api/orders
 * @access  Public (Guest) or Private (User)
 */
const createOrder = asyncHandler(async (req, res) => {
  const {
    orderItems,
    shippingAddress,
    paymentMethod,
    itemsPrice,
    shippingPrice,
    taxPrice,
    totalPrice,
    guestInfo,
  } = req.body;

  if (!orderItems || orderItems.length === 0) {
    res.status(400);
    throw new Error('No order items provided');
  }

  if (!shippingAddress || !shippingAddress.fullName || !shippingAddress.address) {
    res.status(400);
    throw new Error('Please provide complete shipping address');
  }

  // Calculate & verify prices
  const calculatedItemsPrice = orderItems.reduce(
    (acc, item) => acc + item.price * (item.quantity || 1),
    0
  );

  const calculatedShippingPrice = shippingPrice !== undefined ? Number(shippingPrice) : 0;
  const calculatedTaxPrice = taxPrice !== undefined ? Number(taxPrice) : 0;
  const calculatedTotalPrice =
    totalPrice !== undefined
      ? Number(totalPrice)
      : calculatedItemsPrice + calculatedShippingPrice + calculatedTaxPrice;

  // Create the order
  const order = new Order({
    user: req.user ? req.user._id : null,
    guestInfo: guestInfo || {
      name: shippingAddress.fullName,
      email: shippingAddress.email,
      phone: shippingAddress.phone,
    },
    orderItems,
    shippingAddress,
    paymentMethod: paymentMethod || 'Cash on Delivery',
    itemsPrice: calculatedItemsPrice,
    shippingPrice: calculatedShippingPrice,
    taxPrice: calculatedTaxPrice,
    totalPrice: calculatedTotalPrice,
    isPaid: paymentMethod === 'Online' || paymentMethod === 'Card' ? false : false,
  });

  const createdOrder = await order.save();

  // Deduct inventory stock for each ordered product and variant
  for (const item of orderItems) {
    if (item.product) {
      const product = await Product.findById(item.product);
      if (product) {
        const qtyToDeduct = Number(item.quantity || 1);

        // If product has variants, update specific variant stock
        if (product.hasVariants && product.variants && product.variants.length > 0) {
          const variantIndex = product.variants.findIndex(
            (v) =>
              v.size &&
              item.size &&
              v.size.trim().toLowerCase() === item.size.trim().toLowerCase() &&
              (!item.color || !v.color || v.color.trim().toLowerCase() === item.color.trim().toLowerCase())
          );

          if (variantIndex !== -1) {
            product.variants[variantIndex].stock = Math.max(
              0,
              product.variants[variantIndex].stock - qtyToDeduct
            );
          }
        }

        // Decrement overall product stock
        product.stock = Math.max(0, product.stock - qtyToDeduct);
        await product.save();
      }
    }
  }

  res.status(201).json({
    success: true,
    data: createdOrder,
    message: 'Order placed successfully',
  });
});

/**
 * @desc    Get order by ID or orderNumber
 * @route   GET /api/orders/:id
 * @access  Public (for order tracking) or Private
 */
const getOrderById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  let order;
  if (id.match(/^[0-9a-fA-F]{24}$/)) {
    order = await Order.findById(id).populate('user', 'name email phone');
  } else {
    order = await Order.findOne({ orderNumber: id }).populate('user', 'name email phone');
  }

  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }

  res.json({
    success: true,
    data: order,
  });
});

/**
 * @desc    Get logged in user orders
 * @route   GET /api/orders/myorders
 * @access  Private
 */
const getMyOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 });

  res.json({
    success: true,
    count: orders.length,
    data: orders,
  });
});

/**
 * @desc    Get all orders (Admin)
 * @route   GET /api/orders
 * @access  Private/Admin
 */
const getAllOrders = asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 50 } = req.query;

  const query = {};
  if (status && status !== 'all') {
    query.orderStatus = status;
  }

  const pageSize = Number(limit);
  const pageNumber = Number(page);
  const skip = (pageNumber - 1) * pageSize;

  const count = await Order.countDocuments(query);
  const orders = await Order.find(query)
    .populate('user', 'name email')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(pageSize)
    .lean();

  // Format orders for direct frontend admin compatibility
  const formattedOrders = orders.map((o) => ({
    ...o,
    id: o.orderNumber || o._id.toString(),
    mongoId: o._id.toString(),
    customer: o.shippingAddress?.fullName || o.guestInfo?.name || o.user?.name || 'Customer',
    email: o.shippingAddress?.email || o.guestInfo?.email || o.user?.email || 'N/A',
    item: o.orderItems?.map((i) => `${i.name} (x${i.quantity || 1})`).join(', ') || 'Custom Order',
    amount: `₹${(o.totalPrice || 0).toLocaleString('en-IN')}`,
    totalAmount: o.totalPrice || 0,
    status: o.orderStatus || 'Pending',
    paymentStatus: o.isPaid ? 'Paid' : 'Unpaid',
    date: new Date(o.createdAt || Date.now()).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }),
  }));

  res.json({
    success: true,
    count: count,
    orders: formattedOrders,
    data: formattedOrders,
    page: pageNumber,
    pages: Math.ceil(count / pageSize) || 1,
    total: count,
  });
});

/**
 * @desc    Update order status (Admin)
 * @route   PUT /api/orders/:id/status
 * @access  Private/Admin
 */
const updateOrderStatus = asyncHandler(async (req, res) => {
  const { status, trackingNumber } = req.body;
  const order = await Order.findById(req.params.id);

  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }

  const validStatuses = ['Pending', 'Confirmed', 'Processing', 'Shipped', 'Delivered', 'Cancelled'];
  if (status && !validStatuses.includes(status)) {
    res.status(400);
    throw new Error(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
  }

  if (status) {
    order.orderStatus = status;

    if (status === 'Delivered') {
      order.isDelivered = true;
      order.deliveredAt = Date.now();
      // If COD, mark paid on delivery
      if (order.paymentMethod === 'Cash on Delivery') {
        order.isPaid = true;
        order.paidAt = Date.now();
      }
    }
  }

  if (trackingNumber !== undefined) {
    order.trackingNumber = trackingNumber;
  }

  const updatedOrder = await order.save();

  res.json({
    success: true,
    data: updatedOrder,
    message: 'Order status updated successfully',
  });
});

/**
 * @desc    Update order to paid
 * @route   PUT /api/orders/:id/pay
 * @access  Private
 */
const updateOrderToPaid = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);

  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }

  order.isPaid = true;
  order.paidAt = Date.now();
  order.paymentResult = {
    id: req.body.id || 'N/A',
    status: req.body.status || 'COMPLETED',
    update_time: req.body.update_time || new Date().toISOString(),
    email_address: req.body.email_address || (order.user ? order.user.email : ''),
  };

  const updatedOrder = await order.save();

  res.json({
    success: true,
    data: updatedOrder,
    message: 'Order marked as paid',
  });
});

/**
 * @desc    Delete an order (Admin)
 * @route   DELETE /api/orders/:id
 * @access  Private/Admin
 */
const deleteOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);

  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }

  await Order.findByIdAndDelete(req.params.id);

  res.json({
    success: true,
    message: 'Order removed successfully',
  });
});

export {
  createOrder,
  getOrderById,
  getMyOrders,
  getAllOrders,
  updateOrderStatus,
  updateOrderToPaid,
  deleteOrder,
};

export default {
  createOrder,
  getOrderById,
  getMyOrders,
  getAllOrders,
  updateOrderStatus,
  updateOrderToPaid,
  deleteOrder,
};

