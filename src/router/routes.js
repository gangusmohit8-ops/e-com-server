import express from 'express';
import {register,login,sendOTP,resendOTP,verifyOTP,getOTPStatus,forgotPassword,verifyResetOTP,resetPassword,getMe,updateProfile,logout
} from '../controller/user_controller.js';
import { protect, authorize, requireVerified, checkAccountBlocked } from '../middleware/auth.js';

const router = express.Router();

// ==================== PUBLIC ROUTES ====================
// No token needed
router.post('/auth/register', register);
router.post('/auth/login', login);
router.post('/auth/forgot-password', forgotPassword);
router.post('/auth/verify-reset-otp', verifyResetOTP);
router.post('/auth/reset-password', resetPassword);

// ==================== PROTECTED ROUTES ====================
// Everything below needs: Authorization: Bearer <token>
router.use('/auth', protect);
router.use('/auth', checkAccountBlocked);

// OTP Routes (token required — unverified users can access)
router.post('/auth/send-otp', sendOTP);
router.post('/auth/resend-otp', resendOTP);
router.post('/auth/verify-otp', verifyOTP);
router.get('/auth/otp-status', getOTPStatus);

// User Routes (token required)
router.get('/auth/me', getMe);
router.put('/auth/update-profile', updateProfile);
router.post('/auth/logout', logout);

// ==================== VERIFIED ONLY ROUTES ====================
// Token + verified email required
router.get('/profile', protect, checkAccountBlocked, requireVerified, (req, res) => {
    res.json({
        success: true,
        message: 'Welcome to your profile',
        user: req.user
    });
});

// ==================== ADMIN ROUTES ====================
router.get('/admin/dashboard', protect, checkAccountBlocked, authorize('admin'), (req, res) => {
    res.json({
        success: true,
        message: 'Welcome to admin dashboard'
    });
});

// ==================== SELLER ROUTES ====================
router.get('/seller/dashboard', protect, checkAccountBlocked, authorize('seller', 'admin'), (req, res) => {
    res.json({
        success: true,
        message: 'Welcome to seller dashboard'
    });
});

export default router;  