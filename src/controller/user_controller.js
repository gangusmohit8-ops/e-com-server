import { user_model } from '../model/user_model.js';
import OTPService from '../services/otpService.js';
import { error_handling, AppError } from '../middleware/allerror.js';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config({ quiet: true });

// Helper Functions
const generateToken = (userId) => {
    return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRE 
    });
};

const sendTokenResponse = (user, statusCode, res) => {
    const token = generateToken(user._id);

    // Remove sensitive data safely using optional chaining
    const userObj = user.toObject();
    delete userObj.password;
    if (userObj.verification?.user) {
        delete userObj.verification.user.otp;
        delete userObj.verification.user.otpExpiryTime;
        delete userObj.verification.user.otpLockUntil;
        delete userObj.verification.user.otpLastAttempt;
        delete userObj.verification.user.otpAtm;
        delete userObj.verification.user.otpLockStage;
        delete userObj.verification.user.otpRequestCount;
        delete userObj.verification.user.lastOtpRequest;
    }
    if (userObj.resetPassword) {
        delete userObj.resetPassword.otp;
        delete userObj.resetPassword.otpExpiryTime;
        delete userObj.resetPassword.otpLockUntil;
        delete userObj.resetPassword.otpAtm;
        delete userObj.resetPassword.otpLockStage;
        delete userObj.resetPassword.isReset;
    }

    res.status(statusCode).json({
        success: true,
        token,
        user: {
            id: user._id,
            fname: user.fname,
            lname: user.lname,
            email: user.email,
            role: user.role,
            gender: user.gender,
            isVerify: user.verification?.user?.isVerify || false,
            avatar: user.avatar
        }
    });
};

// ==================== AUTH CONTROLLERS ====================

/**
 * @desc    Register User
 * @route   POST /api/v1/auth/register
 * @access  Public
 */
export const register = async (req, res) => {
    try {
        const { fname, lname, email, password, gender, mobile } = req.body;

        // Validate required fields
        if (!fname || !lname || !email || !password || !gender) {
            throw new AppError('Please provide all required fields: fname, lname, email, password, gender', 400);
        }

        // Check if user exists
        const existingUser = await user_model.findOne({ email });
        if (existingUser) {
            throw new AppError('User already exists with this email', 400);
        }

        // Create user
        const user = await user_model.create({
            fname,
            lname,
            email,
            password,
            gender,
            mobile: mobile || undefined
        });

        // Send OTP (await to catch errors)
        try {
            await OTPService.sendVerificationOTP(user._id);
        } catch (otpError) {
            console.error('OTP send error (user still created):', otpError.message);
        }

        sendTokenResponse(user, 201, res);
    } catch (error) {
        error_handling(error, res);
    }
};

/**
 * @desc    Login User
 * @route   POST /api/v1/auth/login
 * @access  Public
 */
export const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            throw new AppError('Please provide email and password', 400);
        }

        // Find user with password
        const user = await user_model.findOne({ email }).select('+password');
        if (!user) {
            throw new AppError('Invalid credentials', 401);
        }

        // Check password
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            throw new AppError('Invalid credentials', 401);
        }

        // Check if email is verified
        if (!user.verification.user.isVerify) {
            // Generate a temp token so user can call /verify-otp
            const tempToken = generateToken(user._id);

            // Send OTP for verification
            try {
                await OTPService.sendVerificationOTP(user._id);
            } catch (otpError) {
                console.error('OTP send error on login:', otpError.message);
            }

            return res.status(403).json({
                success: false,
                message: 'Please verify your email first. OTP has been sent.',
                requiresVerification: true,
                token: tempToken,
                user: {
                    id: user._id,
                    fname: user.fname,
                    email: user.email,
                    isVerify: user.verification.user.isVerify
                }
            });
        }

        sendTokenResponse(user, 200, res);
    } catch (error) {
        error_handling(error, res);
    }
};

/**
 * @desc    Send OTP
 * @route   POST /api/v1/auth/send-otp
 * @access  Private
 */
export const sendOTP = async (req, res) => {
    try {
        const result = await OTPService.sendVerificationOTP(req.user._id);
        res.status(200).json({
            success: true,
            data: result
        });
    } catch (error) {
        error_handling(error, res);
    }
};

/**
 * @desc    Resend OTP
 * @route   POST /api/v1/auth/resend-otp
 * @access  Private
 */
export const resendOTP = async (req, res) => {
    try {
        const result = await OTPService.resendVerificationOTP(req.user._id);
        res.status(200).json({
            success: true,
            data: result
        });
    } catch (error) {
        error_handling(error, res);
    }
};

/**
 * @desc    Verify OTP
 * @route   POST /api/v1/auth/verify-otp
 * @access  Private
 */
export const verifyOTP = async (req, res) => {
    try {
        const { otp } = req.body;
        
        if (!otp) {
            throw new AppError('Please provide OTP', 400);
        }

        const result = await OTPService.verifyOTP(req.user._id, otp);
        res.status(200).json({
            success: true,
            data: result
        });
    } catch (error) {
        error_handling(error, res);
    }
};

/**
 * @desc    Get OTP Status
 * @route   GET /api/v1/auth/otp-status
 * @access  Private
 */
export const getOTPStatus = async (req, res) => {
    try {
        const result = await OTPService.getOTPStatus(req.user._id);
        res.status(200).json({
            success: true,
            data: result
        });
    } catch (error) {
        error_handling(error, res);
    }
};

/**
 * @desc    Forgot Password - Send Reset OTP
 * @route   POST /api/v1/auth/forgot-password
 * @access  Public
 */
export const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        
        if (!email) {
            throw new AppError('Please provide an email', 400);
        }

        const result = await OTPService.sendPasswordResetOTP(email);
        res.status(200).json({
            success: true,
            data: result
        });
    } catch (error) {
        error_handling(error, res);
    }
};

/**
 * @desc    Verify Reset OTP
 * @route   POST /api/v1/auth/verify-reset-otp
 * @access  Public
 */
export const verifyResetOTP = async (req, res) => {
    try {
        const { email, otp } = req.body;

        if (!email || !otp) {
            throw new AppError('Please provide email and OTP', 400);
        }

        const result = await OTPService.verifyPasswordResetOTP(email, otp);
        res.status(200).json({
            success: true,
            data: result
        });
    } catch (error) {
        error_handling(error, res);
    }
};

/**
 * @desc    Reset Password
 * @route   POST /api/v1/auth/reset-password
 * @access  Public
 */
export const resetPassword = async (req, res) => {
    try {
        const { email, newPassword } = req.body;

        if (!email || !newPassword) {
            throw new AppError('Please provide email and new password', 400);
        }

        const result = await OTPService.resetPassword(email, newPassword);
        res.status(200).json({
            success: true,
            data: result
        });
    } catch (error) {
        error_handling(error, res);
    }
};

/**
 * @desc    Get Current User
 * @route   GET /api/v1/auth/me
 * @access  Private
 */
export const getMe = async (req, res) => {
    try {
        const user = await user_model.findById(req.user._id);
        if (!user) {
            throw new AppError('User not found', 404);
        }
        res.status(200).json({
            success: true,
            data: user
        });
    } catch (error) {
        error_handling(error, res);
    }
};

/**
 * @desc    Update User Profile
 * @route   PUT /api/v1/auth/update-profile
 * @access  Private
 */
export const updateProfile = async (req, res) => {
    try {
        const allowedFields = ['fname', 'lname', 'mobile', 'gender', 'avatar', 'userImg'];
        const updateData = {};

        Object.keys(req.body).forEach(key => {
            if (allowedFields.includes(key)) {
                updateData[key] = req.body[key];
            }
        });

        if (Object.keys(updateData).length === 0) {
            throw new AppError('No valid fields to update', 400);
        }

        const user = await user_model.findByIdAndUpdate(
            req.user._id,
            updateData,
            { new: true, runValidators: true }
        );

        res.status(200).json({
            success: true,
            data: user
        });
    } catch (error) {
        error_handling(error, res);
    }
};

/**
 * @desc    Logout
 * @route   POST /api/v1/auth/logout
 * @access  Private
 */
export const logout = async (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Logged out successfully'
    });
};