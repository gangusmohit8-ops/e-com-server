import crypto from 'crypto';

/**
 * Generate 6-digit OTP
 * @returns {string} 6-digit OTP
 */
export const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Hash OTP for secure storage
 * @param {string} otp - OTP to hash
 * @returns {string} Hashed OTP
 */
export const hashOTP = (otp) => {
    return crypto.createHash('sha256').update(otp).digest('hex');
};

/**
 * Get block duration based on attempt stage
 * Progressive blocking: 1m → 5m → 10m → 30m
 * @param {number} stage - Lock stage
 * @returns {number} Block duration in milliseconds
 */
export const getBlockDuration = (stage) => {
    const durations = {
        0: 1 * 60 * 1000,    // 1 minute (3rd attempt)
        1: 5 * 60 * 1000,    // 5 minutes (4th attempt)
        2: 10 * 60 * 1000,   // 10 minutes (5th attempt)
        3: 30 * 60 * 1000    // 30 minutes (6th attempt or more)
    };
    return durations[stage] || 30 * 60 * 1000;
};

/**
 * Check if OTP is expired
 * @param {number} expiryTime - Expiry timestamp in milliseconds
 * @returns {boolean} True if expired
 */
export const isOTPExpired = (expiryTime) => {
    return Date.now() > expiryTime;
};

/**
 * Format remaining time for response
 * @param {number} timestamp - Future timestamp in milliseconds
 * @returns {string|null} Formatted time string or null
 */
export const formatRemainingTime = (timestamp) => {
    if (!timestamp) return null;
    const remaining = Math.max(0, timestamp - Date.now());
    if (remaining <= 0) return null;
    
    const minutes = Math.floor(remaining / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);
    
    if (minutes > 0) {
        return `${minutes} minute${minutes > 1 ? 's' : ''}`;
    }
    return `${seconds} second${seconds > 1 ? 's' : ''}`;
};

/**
 * Check if user is blocked
 * @param {number} lockUntil - Lock until timestamp
 * @returns {object} Block status
 */
export const checkBlockStatus = (lockUntil) => {
    if (!lockUntil || lockUntil <= Date.now()) {
        return { isBlocked: false, remaining: null };
    }
    return { 
        isBlocked: true, 
        remaining: formatRemainingTime(lockUntil) 
    };
};

/**
 * Get OTP expiry time (5 minutes from now)
 * @returns {number} Expiry timestamp
 */
export const getOTPExpiryTime = () => {
    return Date.now() + 5 * 60 * 1000; // 5 minutes
};

/**
 * Validate OTP format (6 digits)
 * @param {string} otp - OTP to validate
 * @returns {boolean} True if valid
 */
export const isValidOTP = (otp) => {
    return /^\d{6}$/.test(otp);
};

/**
 * Get remaining attempts message
 * @param {number} attempts - Remaining attempts
 * @returns {string} Message
 */
export const getAttemptsMessage = (attempts) => {
    if (attempts <= 0) return 'No attempts remaining';
    return `${attempts} attempt${attempts > 1 ? 's' : ''} remaining`;
};

/**
 * Get OTP status for response
 * @param {object} user - User object
 * @param {string} type - 'verification' or 'reset'
 * @returns {object} OTP status
 */
export const getOTPStatus = (user, type = 'verification') => {
    const otpData = type === 'verification' 
        ? user.verification.user 
        : user.resetPassword;
    
    const isExpired = otpData.otpExpiryTime 
        ? isOTPExpired(otpData.otpExpiryTime) 
        : true;
    
    const blockStatus = checkBlockStatus(otpData.otpLockUntil);
    
    return {
        hasOTP: !!otpData.otp && !isExpired,
        isExpired: isExpired,
        remainingAttempts: otpData.otpAtm || 0,
        isBlocked: blockStatus.isBlocked,
        blockRemaining: blockStatus.remaining,
        expiryTime: otpData.otpExpiryTime
    };
};