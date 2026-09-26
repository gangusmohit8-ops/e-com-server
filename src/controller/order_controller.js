import { order_model } from '../model/order_model.js';
import { cart_model } from '../model/cart_model.js';
import { product_model } from '../model/product_model.js';
import { error_handling, AppError } from '../middleware/allerror.js';

/**
 * @desc    Place order from cart
 * @route   POST /api/v1/orders
 * @access  Private
 */
export const placeOrder = async (req, res) => {
  try {
    const { shippingAddress, paymentMethod = 'cod' } = req.body;

    if (!shippingAddress || !shippingAddress.addressLine || !shippingAddress.city || !shippingAddress.state || !shippingAddress.pincode) {
      throw new AppError('Please provide complete shipping address', 400);
    }

    // Get user's cart
    const cart = await cart_model.findOne({ user: req.user._id }).populate('items.product');

    if (!cart || cart.items.length === 0) {
      throw new AppError('Your cart is empty', 400);
    }

    // Validate stock and build order items
    const orderItems = [];
    for (const item of cart.items) {
      const product = item.product;

      if (!product || !product.isActive) {
        throw new AppError(`Product "${product?.name || 'Unknown'}" is no longer available`, 400);
      }

      if (product.stock < item.quantity) {
        throw new AppError(`Not enough stock for "${product.name}". Available: ${product.stock}`, 400);
      }

      orderItems.push({
        product: product._id,
        name: product.name,
        image: product.images?.[0]?.secure_url || '',
        quantity: item.quantity,
        size: item.size,
        color: item.color,
        price: item.price
      });
    }

    // Calculate total
    const totalAmount = orderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const shippingCharge = totalAmount >= 999 ? 0 : 99;

    // Create order
    const order = await order_model.create({
      user: req.user._id,
      items: orderItems,
      shippingAddress,
      paymentMethod,
      paymentStatus: paymentMethod === 'cod' ? 'pending' : 'pending',
      orderStatus: 'confirmed',
      totalAmount: totalAmount + shippingCharge,
      shippingCharge,
      statusHistory: [{ status: 'confirmed', note: 'Order placed successfully' }]
    });

    // Reduce stock for each product
    for (const item of orderItems) {
      await product_model.findByIdAndUpdate(item.product, {
        $inc: { stock: -item.quantity }
      });
    }

    // Clear cart
    cart.items = [];
    await cart.save();

    res.status(201).json({
      success: true,
      message: 'Order placed successfully',
      data: order
    });
  } catch (error) {
    error_handling(error, res);
  }
};

/**
 * @desc    Get current user's orders
 * @route   GET /api/v1/orders/my-orders
 * @access  Private
 */
export const getMyOrders = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const [orders, total] = await Promise.all([
      order_model.find({ user: req.user._id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      order_model.countDocuments({ user: req.user._id })
    ]);

    res.status(200).json({
      success: true,
      data: orders,
      pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)) }
    });
  } catch (error) {
    error_handling(error, res);
  }
};

/**
 * @desc    Get single order
 * @route   GET /api/v1/orders/:id
 * @access  Private
 */
export const getOrder = async (req, res) => {
  try {
    const order = await order_model.findById(req.params.id).populate('items.product', 'images');

    if (!order) {
      throw new AppError('Order not found', 404);
    }

    // Only allow owner or admin to view
    if (order.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      throw new AppError('Not authorized to view this order', 403);
    }

    res.status(200).json({
      success: true,
      data: order
    });
  } catch (error) {
    error_handling(error, res);
  }
};

/**
 * @desc    Cancel order
 * @route   PUT /api/v1/orders/:id/cancel
 * @access  Private
 */
export const cancelOrder = async (req, res) => {
  try {
    const { reason } = req.body;
    const order = await order_model.findById(req.params.id);

    if (!order) {
      throw new AppError('Order not found', 404);
    }

    if (order.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      throw new AppError('Not authorized', 403);
    }

    if (['shipped', 'delivered', 'cancelled'].includes(order.orderStatus)) {
      throw new AppError(`Cannot cancel order with status "${order.orderStatus}"`, 400);
    }

    order.orderStatus = 'cancelled';
    order.cancelledAt = new Date();
    order.cancelReason = reason || 'Cancelled by user';
    order.statusHistory.push({ status: 'cancelled', note: reason || 'Cancelled by user' });

    // Restore stock
    for (const item of order.items) {
      await product_model.findByIdAndUpdate(item.product, {
        $inc: { stock: item.quantity }
      });
    }

    await order.save();

    res.status(200).json({
      success: true,
      message: 'Order cancelled successfully',
      data: order
    });
  } catch (error) {
    error_handling(error, res);
  }
};

/**
 * @desc    Get all orders (Admin)
 * @route   GET /api/v1/admin/orders
 * @access  Admin
 */
export const getAllOrders = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, search } = req.query;
    const filter = {};

    if (status) filter.orderStatus = status;
    if (search) {
      filter.$or = [
        { orderNumber: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [orders, total] = await Promise.all([
      order_model.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .populate('user', 'fname lname email')
        .lean(),
      order_model.countDocuments(filter)
    ]);

    res.status(200).json({
      success: true,
      data: orders,
      pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)) }
    });
  } catch (error) {
    error_handling(error, res);
  }
};

/**
 * @desc    Update order status (Admin)
 * @route   PUT /api/v1/admin/orders/:id/status
 * @access  Admin
 */
export const updateOrderStatus = async (req, res) => {
  try {
    const { status, note } = req.body;
    const validStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];

    if (!status || !validStatuses.includes(status)) {
      throw new AppError(`Invalid status. Valid: ${validStatuses.join(', ')}`, 400);
    }

    const order = await order_model.findById(req.params.id);
    if (!order) {
      throw new AppError('Order not found', 404);
    }

    order.orderStatus = status;
    order.statusHistory.push({ status, note: note || '' });

    if (status === 'delivered') {
      order.deliveredAt = new Date();
      order.paymentStatus = 'paid';
    }

    if (status === 'cancelled') {
      order.cancelledAt = new Date();
      // Restore stock
      for (const item of order.items) {
        await product_model.findByIdAndUpdate(item.product, {
          $inc: { stock: item.quantity }
        });
      }
    }

    await order.save();

    res.status(200).json({
      success: true,
      message: `Order status updated to "${status}"`,
      data: order
    });
  } catch (error) {
    error_handling(error, res);
  }
};
