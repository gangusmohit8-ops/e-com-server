import jwt from 'jsonwebtoken';
import { user_model } from '../model/user_model.js';
import dotenv from 'dotenv';

dotenv.config({ quiet: true });

/**
 * Protect routes - Verify JWT
 */
export const protect = async (req, res, next) => {
    let token;

    // Check for token in headers
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'Not authorized to access this route'
        });
    }

    try {
        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = await user_model.findById(decoded.id);
        
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'User not found'
            });
        }

        next();
    } catch (error) {
        return res.status(401).json({
            success: false,
            message: 'Not authorized to access this route'
        });
    }
};

/**
 * Authorize roles
 */
export const authorize = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: `User role ${req.user.role} is not authorized to access this route`
            });
        }
        next();
    };
};

/**
 * Require verified email
 */
export const requireVerified = async (req, res, next) => {
    if (!req.user.verification.user.isVerify) {
        return res.status(403).json({
            success: false,
            message: 'Please verify your email first'
        });
    }
    next();
};

/**
 * Check if account is blocked
 */
export const checkAccountBlocked = async (req, res, next) => {
    if (req.user.verification.user.blockAcc) {
        return res.status(403).json({
            success: false,
            message: req.user.verification.user.blockReason || 'Your account has been blocked'
        });
    }
    next();
};