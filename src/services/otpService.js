import { user_model } from '../model/user_model.js';
import { pending_user_model } from '../model/pending_user_model.js';
import { generateOTP, hashOTP, isOTPExpired, getBlockDuration,formatRemainingTime,getOTPExpiryTime,isValidOTP,checkBlockStatus} from '../utils/otplock.js';
import { sendOTPVerificationEmail, sendResetPasswordOTPEmail, sendWelcomeEmail } from '../mail/allmailformate.js';

class OTPService {
    /**
     * Send Email Verification OTP
     */
    static async sendVerificationOTP(userId) {
        try {
            const user = await user_model.findById(userId)
                .select('+verification.user.otp +verification.user.otpExpiryTime +verification.user.otpAtm +verification.user.otpLockUntil +verification.user.otpLockStage +verification.user.otpLastAttempt +verification.user.otpRequestCount +verification.user.lastOtpRequest');
            if (!user) {
                throw new Error('User not found');
            }

            if (user.verification.user.isVerify) {
                throw new Error('Email already verified');
            }

            // Check if blocked
            const blockStatus = checkBlockStatus(user.verification.user.otpLockUntil);
            if (blockStatus.isBlocked) {
                throw new Error(`Too many attempts. Please try again after ${blockStatus.remaining}`);
            }

            // Generate new OTP
            const otp = generateOTP();
            const hashedOTP = hashOTP(otp);
            const otpExpiryTime = getOTPExpiryTime();
            
            // Reset attempts if OTP expired
            if (!user.verification.user.otpExpiryTime || 
                isOTPExpired(user.verification.user.otpExpiryTime)) {
                user.verification.user.otpAtm = 3;
                user.verification.user.otpLockUntil = null;
                user.verification.user.otpLockStage = -1;
            }
            
            user.verification.user.otp = hashedOTP;
            user.verification.user.otpExpiryTime = otpExpiryTime;
            user.verification.user.otpLastAttempt = 0;
            user.verification.user.otpRequestCount = (user.verification.user.otpRequestCount || 0) + 1;
            user.verification.user.lastOtpRequest = Date.now();
            
            await user.save();

            // Send email
            await sendOTPVerificationEmail(user.fname, user.email, otp);

            return {
                success: true,
                message: 'OTP sent successfully',
                expiryTime: otpExpiryTime,
                remainingAttempts: user.verification.user.otpAtm,
                canResend: true
            };
        } catch (error) {
            throw error;
        }
    }

    /**
     * Resend Verification OTP with rate limiting
     */
    static async resendVerificationOTP(userId) {
        try {
            const user = await user_model.findById(userId)
                .select('+verification.user.otp +verification.user.otpExpiryTime +verification.user.otpAtm +verification.user.otpLockUntil +verification.user.otpLockStage +verification.user.otpRequestCount +verification.user.lastOtpRequest');
            if (!user) {
                throw new Error('User not found');
            }

            if (user.verification.user.isVerify) {
                throw new Error('Email already verified');
            }

            // Check if blocked
            const blockStatus = checkBlockStatus(user.verification.user.otpLockUntil);
            if (blockStatus.isBlocked) {
                throw new Error(`Too many attempts. Please try again after ${blockStatus.remaining}`);
            }

            // Rate limiting for resend (max 3 per 5 minutes)
            const lastRequest = user.verification.user.lastOtpRequest || 0;
            const requestCount = user.verification.user.otpRequestCount || 0;
            
            if (requestCount >= 3 && (Date.now() - lastRequest) < 300000) {
                const remaining = Math.ceil((300000 - (Date.now() - lastRequest)) / 60000);
                throw new Error(`Too many OTP requests. Please try again after ${remaining} minute${remaining > 1 ? 's' : ''}`);
            }

            // Check if current OTP is still valid
            if (user.verification.user.otpExpiryTime && 
                !isOTPExpired(user.verification.user.otpExpiryTime)) {
                const remaining = formatRemainingTime(user.verification.user.otpExpiryTime);
                throw new Error(`Current OTP is still valid. Please wait ${remaining}`);
            }

            return await this.sendVerificationOTP(userId);
        } catch (error) {
            throw error;
        }
    }

    /**
     * Verify OTP
     */
    static async verifyOTP(userId, enteredOTP) {
        try {
            if (!isValidOTP(enteredOTP)) {
                throw new Error('Invalid OTP format. Please enter a 6-digit number');
            }

            const user = await user_model.findById(userId)
                .select('+verification.user.otp +verification.user.otpExpiryTime +verification.user.otpAtm +verification.user.otpLockUntil +verification.user.otpLockStage +verification.user.otpLastAttempt');

            if (!user) {
                throw new Error('User not found');
            }

            if (user.verification.user.isVerify) {
                throw new Error('Email already verified');
            }

            // Check if blocked
            const blockStatus = checkBlockStatus(user.verification.user.otpLockUntil);
            if (blockStatus.isBlocked) {
                throw new Error(`Too many attempts. Please try again after ${blockStatus.remaining}`);
            }

            // Check if OTP exists and not expired
            if (!user.verification.user.otp || !user.verification.user.otpExpiryTime) {
                throw new Error('No OTP found. Please request a new one');
            }

            if (isOTPExpired(user.verification.user.otpExpiryTime)) {
                throw new Error('OTP has expired. Please request a new one');
            }

            // Verify OTP
            const hashedEnteredOTP = hashOTP(enteredOTP);
            const isMatch = user.verification.user.otp === hashedEnteredOTP;

            user.verification.user.otpLastAttempt = Date.now();

            if (!isMatch) {
                user.verification.user.otpAtm -= 1;
                
                if (user.verification.user.otpAtm <= 0) {
                    user.verification.user.otpLockStage += 1;
                    const blockDuration = getBlockDuration(user.verification.user.otpLockStage);
                    user.verification.user.otpLockUntil = Date.now() + blockDuration;
                    user.verification.user.otpAtm = 3; // Reset attempts after block
                    
                    await user.save();
                    
                    const remaining = formatRemainingTime(user.verification.user.otpLockUntil);
                    throw new Error(`Too many failed attempts. You are blocked for ${remaining}`);
                }
                
                await user.save();
                
                throw new Error(`Invalid OTP. You have ${user.verification.user.otpAtm} attempt${user.verification.user.otpAtm > 1 ? 's' : ''} remaining`);
            }

            // OTP is correct - Verify user
            user.verification.user.isVerify = true;
            user.verification.user.verifiedAt = new Date();
            user.verification.user.otp = null;
            user.verification.user.otpExpiryTime = null;
            user.verification.user.otpAtm = 3;
            user.verification.user.otpLastAttempt = 0;
            user.verification.user.otpLockUntil = null;
            user.verification.user.otpLockStage = -1;
            user.verification.user.otpRequestCount = 0;
            user.verification.user.lastOtpRequest = null;
            
            await user.save();

            // Send welcome email
            await sendWelcomeEmail(user.fname, user.email);

            return {
                success: true,
                message: 'Email verified successfully',
                user: {
                    id: user._id,
                    fname: user.fname,
                    email: user.email,
                    isVerify: user.verification.user.isVerify
                }
            };
        } catch (error) {
            throw error;
        }
    }

    /**
     * Send Password Reset OTP
     */
    static async sendPasswordResetOTP(email) {
        try {
            const user = await user_model.findOne({ email })
                .select('+resetPassword.otp +resetPassword.otpExpiryTime +resetPassword.otpAtm +resetPassword.otpLockUntil +resetPassword.otpLockStage +resetPassword.isReset');
            if (!user) {
                // Don't reveal if email exists
                return {
                    success: true,
                    message: 'If your email exists in our system, you will receive an OTP'
                };
            }

            // Check if blocked
            const blockStatus = checkBlockStatus(user.resetPassword.otpLockUntil);
            if (blockStatus.isBlocked) {
                throw new Error(`Too many attempts. Please try again after ${blockStatus.remaining}`);
            }

            // Generate OTP
            const otp = generateOTP();
            const hashedOTP = hashOTP(otp);
            const otpExpiryTime = getOTPExpiryTime();
            
            // Reset attempts if OTP expired
            if (!user.resetPassword.otpExpiryTime || 
                isOTPExpired(user.resetPassword.otpExpiryTime)) {
                user.resetPassword.otpAtm = 3;
                user.resetPassword.otpLockUntil = null;
                user.resetPassword.otpLockStage = -1;
            }
            
            user.resetPassword.otp = hashedOTP;
            user.resetPassword.otpExpiryTime = otpExpiryTime;
            user.resetPassword.resetRequestedAt = new Date();
            user.resetPassword.isReset = false;
            
            await user.save();

            // Send password reset email
            await sendResetPasswordOTPEmail(user.fname, user.email, otp);

            return {
                success: true,
                message: 'Password reset OTP sent successfully',
                expiryTime: otpExpiryTime,
                remainingAttempts: user.resetPassword.otpAtm
            };
        } catch (error) {
            throw error;
        }
    }

    /**
     * Verify Password Reset OTP
     */
    static async verifyPasswordResetOTP(email, enteredOTP) {
        try {
            if (!isValidOTP(enteredOTP)) {
                throw new Error('Invalid OTP format. Please enter a 6-digit number');
            }

            const user = await user_model.findOne({ email })
                .select('+resetPassword.otp +resetPassword.otpExpiryTime +resetPassword.otpAtm +resetPassword.otpLockUntil +resetPassword.otpLockStage');

            if (!user) {
                throw new Error('User not found');
            }

            // Check if blocked
            const blockStatus = checkBlockStatus(user.resetPassword.otpLockUntil);
            if (blockStatus.isBlocked) {
                throw new Error(`Too many attempts. Please try again after ${blockStatus.remaining}`);
            }

            // Check if OTP exists and not expired
            if (!user.resetPassword.otp || !user.resetPassword.otpExpiryTime) {
                throw new Error('No OTP found. Please request a new one');
            }

            if (isOTPExpired(user.resetPassword.otpExpiryTime)) {
                throw new Error('OTP has expired. Please request a new one');
            }

            // Verify OTP
            const hashedEnteredOTP = hashOTP(enteredOTP);
            const isMatch = user.resetPassword.otp === hashedEnteredOTP;

            if (!isMatch) {
                user.resetPassword.otpAtm -= 1;
                
                if (user.resetPassword.otpAtm <= 0) {
                    user.resetPassword.otpLockStage += 1;
                    const blockDuration = getBlockDuration(user.resetPassword.otpLockStage);
                    user.resetPassword.otpLockUntil = Date.now() + blockDuration;
                    user.resetPassword.otpAtm = 3;
                    
                    await user.save();
                    
                    const remaining = formatRemainingTime(user.resetPassword.otpLockUntil);
                    throw new Error(`Too many failed attempts. You are blocked for ${remaining}`);
                }
                
                await user.save();
                
                throw new Error(`Invalid OTP. You have ${user.resetPassword.otpAtm} attempt${user.resetPassword.otpAtm > 1 ? 's' : ''} remaining`);
            }

            // OTP is correct
            user.resetPassword.isReset = true;
            user.resetPassword.otp = null;
            user.resetPassword.otpExpiryTime = null;
            user.resetPassword.otpAtm = 3;
            user.resetPassword.otpLockUntil = null;
            user.resetPassword.otpLockStage = -1;
            
            await user.save();

            return {
                success: true,
                message: 'OTP verified successfully. You can now reset your password.',
                userId: user._id
            };
        } catch (error) {
            throw error;
        }
    }

    /**
     * Reset Password
     */
    static async resetPassword(email, newPassword) {
        try {
            const user = await user_model.findOne({ email })
                .select('+resetPassword.isReset');

            if (!user) {
                throw new Error('User not found');
            }

            if (!user.resetPassword.isReset) {
                throw new Error('Please verify OTP first');
            }

            // Update password
            user.password = newPassword;
            user.resetPassword.isReset = false;
            await user.save();

            return {
                success: true,
                message: 'Password reset successfully'
            };
        } catch (error) {
            throw error;
        }
    }

    /**
     * Get OTP Status
     */
    static async getOTPStatus(userId) {
        try {
            const user = await user_model.findById(userId)
                .select('+verification.user.otp +verification.user.otpExpiryTime +verification.user.otpAtm +verification.user.otpLockUntil');
            if (!user) {
                throw new Error('User not found');
            }

            const status = {
                isVerified: user.verification.user.isVerify,
                otpStatus: {
                    hasOTP: !!user.verification.user.otp,
                    isExpired: user.verification.user.otpExpiryTime ? 
                        isOTPExpired(user.verification.user.otpExpiryTime) : true,
                    remainingAttempts: user.verification.user.otpAtm || 0,
                    isBlocked: user.verification.user.otpLockUntil ? 
                        user.verification.user.otpLockUntil > Date.now() : false,
                    blockRemaining: user.verification.user.otpLockUntil ? 
                        formatRemainingTime(user.verification.user.otpLockUntil) : null,
                    expiryTime: user.verification.user.otpExpiryTime
                }
            };

            return status;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Send OTP for Pending Registration (Account NOT created until verified)
     */
    static async sendRegistrationOTP(userData) {
        try {
            const { fname, lname, email, password, gender, mobile } = userData;

            // Check if account already exists
            const existingUser = await user_model.findOne({ email });
            if (existingUser) {
                throw new Error('User already exists with this email');
            }

            // Check if there is an existing pending registration
            let pending = await pending_user_model.findOne({ email });
            if (pending) {
                const blockStatus = checkBlockStatus(pending.otpLockUntil);
                if (blockStatus.isBlocked) {
                    throw new Error(`Too many attempts. Please try again after ${blockStatus.remaining}`);
                }
            }

            const otp = generateOTP();
            const hashedOTP = hashOTP(otp);
            const otpExpiryTime = getOTPExpiryTime();

            // Save to pending collection
            await pending_user_model.findOneAndUpdate(
                { email },
                {
                    fname,
                    lname,
                    email,
                    password,
                    gender,
                    mobile: mobile || undefined,
                    otp: hashedOTP,
                    otpExpiryTime,
                    otpAtm: 3,
                    otpLockUntil: null,
                    otpLockStage: -1
                },
                { upsert: true, returnDocument: 'after', runValidators: true }
            );

            // Send verification email
            await sendOTPVerificationEmail(fname, email, otp);

            return {
                success: true,
                message: 'Verification OTP sent to your email. Please authenticate to complete account creation.',
                email,
                expiryTime: otpExpiryTime
            };
        } catch (error) {
            throw error;
        }
    }

    /**
     * Verify OTP and CREATE the account
     */
    static async verifyRegistrationOTP(email, enteredOTP) {
        try {
            if (!isValidOTP(enteredOTP)) {
                throw new Error('Invalid OTP format. Please enter a 6-digit number');
            }

            const pending = await pending_user_model.findOne({ email });
            if (!pending) {
                throw new Error('No pending registration found or verification session expired. Please register again.');
            }

            // Check if blocked
            const blockStatus = checkBlockStatus(pending.otpLockUntil);
            if (blockStatus.isBlocked) {
                throw new Error(`Too many attempts. Please try again after ${blockStatus.remaining}`);
            }

            // Check expiration
            if (isOTPExpired(pending.otpExpiryTime)) {
                throw new Error('OTP has expired. Please request a new one');
            }

            // Verify hash
            const hashedEnteredOTP = hashOTP(enteredOTP);
            const isMatch = pending.otp === hashedEnteredOTP;

            if (!isMatch) {
                pending.otpAtm -= 1;

                if (pending.otpAtm <= 0) {
                    pending.otpLockStage += 1;
                    const blockDuration = getBlockDuration(pending.otpLockStage);
                    pending.otpLockUntil = Date.now() + blockDuration;
                    pending.otpAtm = 3;
                    await pending.save();

                    const remaining = formatRemainingTime(pending.otpLockUntil);
                    throw new Error(`Too many failed attempts. You are blocked for ${remaining}`);
                }

                await pending.save();
                throw new Error(`Invalid OTP. You have ${pending.otpAtm} attempt${pending.otpAtm > 1 ? 's' : ''} remaining`);
            }

            // OTP is correct -> NOW CREATE USER ACCOUNT IN DB
            const user = await user_model.create({
                fname: pending.fname,
                lname: pending.lname,
                email: pending.email,
                password: pending.password,
                gender: pending.gender,
                mobile: pending.mobile,
                verification: {
                    user: {
                        isVerify: true,
                        verifiedAt: new Date()
                    }
                }
            });

            // Remove from pending collection
            await pending_user_model.deleteOne({ _id: pending._id });

            // Send welcome email
            try {
                await sendWelcomeEmail(user.fname, user.email);
            } catch (mailErr) {
                console.error('Welcome email error:', mailErr.message);
            }

            return {
                success: true,
                message: 'Royal account created and email verified successfully!',
                user
            };
        } catch (error) {
            throw error;
        }
    }

    /**
     * Resend OTP for Pending Registration
     */
    static async resendRegistrationOTP(email) {
        try {
            const pending = await pending_user_model.findOne({ email });
            if (!pending) {
                throw new Error('No pending registration found. Please register your details first.');
            }

            const blockStatus = checkBlockStatus(pending.otpLockUntil);
            if (blockStatus.isBlocked) {
                throw new Error(`Too many attempts. Please try again after ${blockStatus.remaining}`);
            }

            const otp = generateOTP();
            const hashedOTP = hashOTP(otp);
            const otpExpiryTime = getOTPExpiryTime();

            pending.otp = hashedOTP;
            pending.otpExpiryTime = otpExpiryTime;
            pending.otpAtm = 3;
            await pending.save();

            await sendOTPVerificationEmail(pending.fname, pending.email, otp);

            return {
                success: true,
                message: 'New OTP sent to your registered royal email!',
                expiryTime: otpExpiryTime
            };
        } catch (error) {
            throw error;
        }
    }

    /**
     * Get Pending Registration OTP Status
     */
    static async getRegistrationOTPStatus(email) {
        try {
            const pending = await pending_user_model.findOne({ email });
            if (!pending) {
                return {
                    hasPending: false
                };
            }

            return {
                hasPending: true,
                isVerified: false,
                otpStatus: {
                    hasOTP: !!pending.otp,
                    isExpired: isOTPExpired(pending.otpExpiryTime),
                    remainingAttempts: pending.otpAtm || 0,
                    isBlocked: pending.otpLockUntil ? pending.otpLockUntil > Date.now() : false,
                    blockRemaining: pending.otpLockUntil ? formatRemainingTime(pending.otpLockUntil) : null,
                    expiryTime: pending.otpExpiryTime
                }
            };
        } catch (error) {
            throw error;
        }
    }
}

export default OTPService;