/**
 * Centralized Error Handler
 * Handles all error types: Mongoose, JWT, custom, and unknown errors
 */

// ==================== CUSTOM ERROR CLASS ====================
export class AppError extends Error {
    constructor(message, statusCode) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = true;
    }
}

// ==================== ERROR HANDLER UTILITY ====================
// Use this inside catch blocks: catch (error) { error_handling(error, res); }
export const error_handling = (error, res) => {

    // Mongoose Validation Error (invalid field values)
    if (error.name === 'ValidationError') {
        const messages = Object.values(error.errors).map(e => e.message);
        return res.status(400).json({
            success: false,
            type: 'Validation Error',
            message: messages.join(', ')
        });
    }

    // Mongoose Duplicate Key Error (unique constraint)
    if (error.code === 11000) {
        const field = Object.keys(error.keyValue)[0];
        const value = error.keyValue[field];
        return res.status(400).json({
            success: false,
            type: 'Duplicate Entry',
            message: `Already exists: ${field} "${value}"`
        });
    }

    // Mongoose Cast Error (invalid ObjectId etc.)
    if (error.name === 'CastError') {
        return res.status(400).json({
            success: false,
            type: 'Invalid Data',
            message: `Invalid ${error.path}: ${error.value}`
        });
    }

    // JWT Errors
    if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({
            success: false,
            type: 'Auth Error',
            message: 'Invalid token. Please login again'
        });
    }

    if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
            success: false,
            type: 'Auth Error',
            message: 'Token expired. Please login again'
        });
    }

    // Custom AppError (thrown intentionally with status code)
    if (error.isOperational) {
        return res.status(error.statusCode).json({
            success: false,
            message: error.message
        });
    }

    // Plain Error — business logic errors from services (OTP, auth, etc.)
    // These are intentional throws like: throw new Error('OTP expired')
    if (error instanceof Error && !error.statusCode) {
        const isServerError = ['TypeError', 'ReferenceError', 'SyntaxError', 'RangeError'].includes(error.name);
        
        if (isServerError) {
            console.error('❌ Unexpected Error:', error);
            return res.status(500).json({
                success: false,
                type: 'Server Error',
                message: 'Internal Server Error'
            });
        }

        return res.status(400).json({
            success: false,
            message: error.message
        });
    }

    // Unknown / catch-all
    console.error('❌ Unexpected Error:', error);
    return res.status(500).json({
        success: false,
        type: 'Server Error',
        message: 'Internal Server Error'
    });
};

// ==================== EXPRESS GLOBAL ERROR MIDDLEWARE ====================
// Use in index.js: app.use(globalErrorHandler);
export const globalErrorHandler = (err, req, res, next) => {
    console.error('❌ Error:', err);
    error_handling(err, res);
};