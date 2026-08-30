import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config({ quiet: true });

const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

// Verify transporter
transporter.verify((error, success) => {
    if (error) {
        console.error("❌ Email transporter error:", error);
    } else {
        console.log("✅ Email server ready");
    }
});

/**
 * Send OTP Verification Email
 */
export const sendOTPVerificationEmail = async (fname, email, otp) => {
    try {
        const info = await transporter.sendMail({
            from: process.env.SMTP_USER,
            to: email,
            subject: "🔐 Verify Your Account - My Cloth Company",
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <style>
                        body { margin:0; padding:0; background:#f4f4f4; font-family: Arial, Helvetica, sans-serif; }
                        .container { max-width:600px; margin:30px auto; background:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 4px 15px rgba(0,0,0,0.1); }
                        .header { background:#111827; color:#ffffff; padding:30px 20px; text-align:center; }
                        .content { padding:40px 30px; color:#374151; }
                        .otp-box { background:#f3f4f6; border:2px dashed #111827; border-radius:10px; padding:20px; text-align:center; margin:30px 0; }
                        .otp-code { font-size:42px; letter-spacing:8px; color:#111827; margin:10px 0 0; }
                        .security-notice { background:#fff3cd; border-left:4px solid #ffc107; padding:12px; margin:20px 0; border-radius:4px; }
                        .footer { background:#f9fafb; padding:20px; text-align:center; color:#6b7280; font-size:13px; }
                        ul { margin:5px 0; padding-left:20px; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1 style="margin:0;font-size:28px;">My Cloth Company</h1>
                            <p style="margin-top:8px;color:#d1d5db;">Fashion That Defines You</p>
                        </div>
                        <div class="content">
                            <h2>Welcome, ${fname}! 👋</h2>
                            <p style="font-size:16px;line-height:1.7;">
                                Thank you for registering with <strong>My Cloth Company</strong>.
                                Please verify your email using the OTP below:
                            </p>
                            
                            <div class="otp-box">
                                <p style="margin:0;font-size:14px;color:#6b7280;">YOUR VERIFICATION CODE</p>
                                <h1 class="otp-code">${otp}</h1>
                            </div>
                            
                            <div class="security-notice">
                                <strong>⚠️ Security Notice:</strong>
                                <ul>
                                    <li>You have 3 attempts to enter the correct OTP</li>
                                    <li>After 3 failed attempts, you'll be blocked for 1 minute</li>
                                    <li>Block duration increases progressively (5m → 10m → 30m)</li>
                                    <li>This OTP expires in <strong>5 minutes</strong></li>
                                    <li>Please do not share this OTP with anyone</li>
                                </ul>
                            </div>
                            
                            <p style="font-size:15px;line-height:1.7;">
                                If you didn't create this account, please ignore this email.
                            </p>
                            
                            <p style="margin-top:30px;">
                                Regards,<br>
                                <strong>My Cloth Company Team</strong>
                            </p>
                        </div>
                        <div class="footer">
                            <p>&copy; 2026 My Cloth Company. All rights reserved.</p>
                        </div>
                    </div>
                </body>
                </html>
            `
        });
        console.log("✅ OTP email sent to:", email);
        return { success: true, messageId: info.messageId };
    } catch (err) {
        console.error("❌ OTP email failed:", err.message);
        throw new Error('Failed to send OTP email');
    }
};

/**
 * Send Password Reset OTP Email
 */
export const sendResetPasswordOTPEmail = async (fname, email, otp) => {
    try {
        const info = await transporter.sendMail({
            from: process.env.SMTP_USER,
            to: email,
            subject: "🔑 Password Reset OTP - My Cloth Company",
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <style>
                        body { margin:0; padding:0; background:#f4f4f4; font-family: Arial, Helvetica, sans-serif; }
                        .container { max-width:600px; margin:30px auto; background:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 4px 15px rgba(0,0,0,0.1); }
                        .header { background:#dc2626; color:#ffffff; padding:30px 20px; text-align:center; }
                        .content { padding:40px 30px; color:#374151; }
                        .otp-box { background:#f3f4f6; border:2px dashed #dc2626; border-radius:10px; padding:20px; text-align:center; margin:30px 0; }
                        .otp-code { font-size:42px; letter-spacing:8px; color:#111827; margin:10px 0 0; }
                        .footer { background:#f9fafb; padding:20px; text-align:center; color:#6b7280; font-size:13px; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1 style="margin:0;font-size:28px;">🔑 Password Reset</h1>
                            <p style="margin-top:8px;color:#fca5a5;">Secure your account</p>
                        </div>
                        <div class="content">
                            <h2>Hello ${fname}!</h2>
                            <p style="font-size:16px;line-height:1.7;">
                                We received a request to reset your password. Use the OTP below:
                            </p>
                            
                            <div class="otp-box">
                                <p style="margin:0;font-size:14px;color:#6b7280;">PASSWORD RESET CODE</p>
                                <h1 class="otp-code">${otp}</h1>
                            </div>
                            
                            <p style="font-size:15px;">
                                ⏳ This OTP expires in <strong>5 minutes</strong>
                            </p>
                            
                            <p style="font-size:15px;line-height:1.7;">
                                If you didn't request this, please ignore this email or 
                                <a href="mailto:${process.env.SMTP_USER}">contact support</a>.
                            </p>
                            
                            <p style="margin-top:30px;">
                                Regards,<br>
                                <strong>My Cloth Company Team</strong>
                            </p>
                        </div>
                        <div class="footer">
                            <p>&copy; 2026 My Cloth Company. All rights reserved.</p>
                        </div>
                    </div>
                </body>
                </html>
            `
        });
        console.log("✅ Reset OTP email sent to:", email);
        return { success: true, messageId: info.messageId };
    } catch (err) {
        console.error("❌ Reset OTP email failed:", err.message);
        throw new Error('Failed to send password reset email');
    }
};

/**
 * Send Welcome Email after verification
 */
export const sendWelcomeEmail = async (fname, email) => {
    try {
        const info = await transporter.sendMail({
            from: process.env.SMTP_USER,
            to: email,
            subject: "🎉 Welcome to My Cloth Company!",
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <style>
                        body { margin:0; padding:0; background:#f4f4f4; font-family: Arial, Helvetica, sans-serif; }
                        .container { max-width:600px; margin:30px auto; background:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 4px 15px rgba(0,0,0,0.1); }
                        .header { background:#111827; color:#ffffff; padding:30px 20px; text-align:center; }
                        .content { padding:40px 30px; color:#374151; }
                        .button { background:#111827; color:white; padding:14px 40px; text-decoration:none; border-radius:8px; display:inline-block; }
                        .footer { background:#f9fafb; padding:20px; text-align:center; color:#6b7280; font-size:13px; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1 style="margin:0;font-size:28px;">🎉 Welcome ${fname}!</h1>
                            <p style="margin-top:8px;color:#d1d5db;">Your journey with us begins now</p>
                        </div>
                        <div class="content">
                            <h2>Your Account is Verified!</h2>
                            <p style="font-size:16px;line-height:1.7;">
                                Thank you for verifying your email. Your account is now active.
                                Start exploring our collection and find your perfect style!
                            </p>
                            <div style="text-align:center;margin:30px 0;">
                                <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}" class="button">
                                    🛍️ Start Shopping
                                </a>
                            </div>
                            <p style="font-size:15px;">
                                You can now:
                            </p>
                            <ul>
                                <li>Browse our latest collections</li>
                                <li>Save items to your wishlist</li>
                                <li>Track your orders</li>
                                <li>Get exclusive offers</li>
                            </ul>
                            <p style="margin-top:30px;">
                                Happy Shopping!<br>
                                <strong>My Cloth Company Team</strong>
                            </p>
                        </div>
                        <div class="footer">
                            <p>&copy; 2026 My Cloth Company. All rights reserved.</p>
                        </div>
                    </div>
                </body>
                </html>
            `
        });
        console.log("✅ Welcome email sent to:", email);
        return { success: true, messageId: info.messageId };
    } catch (err) {
        console.error("❌ Welcome email failed:", err.message);
        throw new Error('Failed to send welcome email');
    }
};