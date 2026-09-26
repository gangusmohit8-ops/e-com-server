import express from 'express';
import {
  register, verifyRegistrationOTP, resendRegistrationOTP, getRegistrationOTPStatus,
  login, sendOTP, resendOTP, verifyOTP, getOTPStatus,
  forgotPassword, verifyResetOTP, resetPassword, getMe, updateProfile, logout, uploadProfileImage
} from '../controller/user_controller.js';
import {
  createProduct, getAllProducts, getProduct, updateProduct, deleteProduct,
  getFeaturedProducts, getProductsByCategory, adminGetAllProducts
} from '../controller/product_controller.js';
import {
  addToCart, getCart, updateCartItem, removeFromCart, clearCart
} from '../controller/cart_controller.js';
import {
  placeOrder, getMyOrders, getOrder, cancelOrder, getAllOrders, updateOrderStatus
} from '../controller/order_controller.js';
import {
  getDashboardStats, getAllUsers, updateUserRole, toggleBlockUser
} from '../controller/admin_controller.js';
import { protect, authorize, requireVerified, checkAccountBlocked } from '../middleware/auth.js';
import { uploadProfileImg, uploadProductImgs } from '../middleware/multer.js';

const router = express.Router();

// ==================== PUBLIC ROUTES ====================
// Auth
router.post('/auth/register', register);
router.post('/auth/verify-registration-otp', verifyRegistrationOTP);
router.post('/auth/resend-registration-otp', resendRegistrationOTP);
router.get('/auth/registration-otp-status', getRegistrationOTPStatus);
router.post('/auth/login', login);
router.post('/auth/forgot-password', forgotPassword);
router.post('/auth/verify-reset-otp', verifyResetOTP);
router.post('/auth/reset-password', resetPassword);

// Products (Public)
router.get('/products/featured', getFeaturedProducts);
router.get('/products/category/:category', getProductsByCategory);
router.get('/products', getAllProducts);
router.get('/products/:id', getProduct);

// ==================== PROTECTED ROUTES ====================
// Auth - Token required
router.use('/auth', protect);
router.use('/auth', checkAccountBlocked);

router.post('/auth/send-otp', sendOTP);
router.post('/auth/resend-otp', resendOTP);
router.post('/auth/verify-otp', verifyOTP);
router.get('/auth/otp-status', getOTPStatus);
router.get('/auth/me', getMe);
router.put('/auth/update-profile', updateProfile);
router.put('/auth/upload-profile-image', uploadProfileImg, uploadProfileImage);
router.post('/auth/logout', logout);

// Cart (Protected)
router.post('/cart', protect, checkAccountBlocked, addToCart);
router.get('/cart', protect, checkAccountBlocked, getCart);
router.put('/cart/:itemId', protect, checkAccountBlocked, updateCartItem);
router.delete('/cart/:itemId', protect, checkAccountBlocked, removeFromCart);
router.delete('/cart', protect, checkAccountBlocked, clearCart);

// Orders (Protected)
router.post('/orders', protect, checkAccountBlocked, placeOrder);
router.get('/orders/my-orders', protect, checkAccountBlocked, getMyOrders);
router.get('/orders/:id', protect, checkAccountBlocked, getOrder);
router.put('/orders/:id/cancel', protect, checkAccountBlocked, cancelOrder);

// ==================== VERIFIED ONLY ROUTES ====================
router.get('/profile', protect, checkAccountBlocked, requireVerified, (req, res) => {
  res.json({
    success: true,
    message: 'Welcome to your profile',
    user: req.user
  });
});

// ==================== ADMIN ROUTES ====================
router.get('/admin/stats', protect, checkAccountBlocked, authorize('admin'), getDashboardStats);
router.get('/admin/users', protect, checkAccountBlocked, authorize('admin'), getAllUsers);
router.put('/admin/users/:id/role', protect, checkAccountBlocked, authorize('admin'), updateUserRole);
router.put('/admin/users/:id/block', protect, checkAccountBlocked, authorize('admin'), toggleBlockUser);
router.get('/admin/products', protect, checkAccountBlocked, authorize('admin'), adminGetAllProducts);
router.get('/admin/orders', protect, checkAccountBlocked, authorize('admin'), getAllOrders);
router.put('/admin/orders/:id/status', protect, checkAccountBlocked, authorize('admin'), updateOrderStatus);

// Admin/Seller Product Management
router.post('/admin/products', protect, checkAccountBlocked, authorize('admin', 'seller'), uploadProductImgs, createProduct);
router.put('/admin/products/:id', protect, checkAccountBlocked, authorize('admin', 'seller'), uploadProductImgs, updateProduct);
router.delete('/admin/products/:id', protect, checkAccountBlocked, authorize('admin'), deleteProduct);

// ==================== SELLER ROUTES ====================
router.get('/seller/dashboard', protect, checkAccountBlocked, authorize('seller', 'admin'), (req, res) => {
  res.json({
    success: true,
    message: 'Welcome to seller dashboard'
  });
});

export default router;