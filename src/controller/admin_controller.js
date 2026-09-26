import { user_model } from '../model/user_model.js';
import { product_model } from '../model/product_model.js';
import { order_model } from '../model/order_model.js';
import { error_handling, AppError } from '../middleware/allerror.js';

/**
 * @desc    Get admin dashboard stats
 * @route   GET /api/v1/admin/stats
 * @access  Admin
 */
export const getDashboardStats = async (req, res) => {
  try {
    const [totalProducts, totalUsers, totalOrders, revenueData, recentOrders, activeProducts, lowStockProducts] = await Promise.all([
      product_model.countDocuments(),
      user_model.countDocuments(),
      order_model.countDocuments(),
      order_model.aggregate([
        { $match: { orderStatus: { $ne: 'cancelled' } } },
        { $group: { _id: null, totalRevenue: { $sum: '$totalAmount' } } }
      ]),
      order_model.find()
        .sort({ createdAt: -1 })
        .limit(10)
        .populate('user', 'fname lname email')
        .lean(),
      product_model.countDocuments({ isActive: true }),
      product_model.countDocuments({ stock: { $lte: 5 }, isActive: true })
    ]);

    // Orders by status
    const ordersByStatus = await order_model.aggregate([
      { $group: { _id: '$orderStatus', count: { $sum: 1 } } }
    ]);

    // Monthly revenue (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const monthlyRevenue = await order_model.aggregate([
      { $match: { createdAt: { $gte: sixMonthsAgo }, orderStatus: { $ne: 'cancelled' } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
          revenue: { $sum: '$totalAmount' },
          orders: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalProducts,
        activeProducts,
        totalUsers,
        totalOrders,
        totalRevenue: revenueData[0]?.totalRevenue || 0,
        lowStockProducts,
        ordersByStatus: ordersByStatus.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        monthlyRevenue,
        recentOrders
      }
    });
  } catch (error) {
    error_handling(error, res);
  }
};

/**
 * @desc    Get all users (Admin)
 * @route   GET /api/v1/admin/users
 * @access  Admin
 */
export const getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 20, search, role } = req.query;
    const filter = {};

    if (role) filter.role = role;
    if (search) {
      filter.$or = [
        { fname: { $regex: search, $options: 'i' } },
        { lname: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [users, total] = await Promise.all([
      user_model.find(filter)
        .select('-password')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      user_model.countDocuments(filter)
    ]);

    res.status(200).json({
      success: true,
      data: users,
      pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)) }
    });
  } catch (error) {
    error_handling(error, res);
  }
};

/**
 * @desc    Update user role (Admin)
 * @route   PUT /api/v1/admin/users/:id/role
 * @access  Admin
 */
export const updateUserRole = async (req, res) => {
  try {
    const { role } = req.body;
    if (!role || !['user', 'admin', 'seller'].includes(role)) {
      throw new AppError('Invalid role. Use: user, admin, seller', 400);
    }

    const user = await user_model.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      throw new AppError('User not found', 404);
    }

    res.status(200).json({
      success: true,
      message: `User role updated to ${role}`,
      data: user
    });
  } catch (error) {
    error_handling(error, res);
  }
};

/**
 * @desc    Block/Unblock user (Admin)
 * @route   PUT /api/v1/admin/users/:id/block
 * @access  Admin
 */
export const toggleBlockUser = async (req, res) => {
  try {
    const { block, reason } = req.body;
    const user = await user_model.findById(req.params.id);

    if (!user) {
      throw new AppError('User not found', 404);
    }

    user.verification.user.blockAcc = block;
    user.verification.user.blockReason = block ? (reason || 'Blocked by admin') : null;
    await user.save();

    res.status(200).json({
      success: true,
      message: block ? 'User blocked successfully' : 'User unblocked successfully',
      data: { id: user._id, blocked: block }
    });
  } catch (error) {
    error_handling(error, res);
  }
};
