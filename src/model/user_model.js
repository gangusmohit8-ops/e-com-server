import mongoose from "mongoose";
import bcrypt from "bcrypt";
import { ValidName, ValidEmail, ValidPassword, ValidMobile } from "../validation/allvalidation.js";

const user_schema = new mongoose.Schema({
    userImg: { type: Object },
    avatar: { type: Object, default: 'https://cdn.example.com/default-avatar.png' },
    fname: { type: String, required: [true, 'First Name is Required...'],  trim: true, validate: [ValidName, 'Name is not Valid...'] },
    lname: { type: String, required: [true, 'Last name is Required...'], validate: [ValidName, 'Invalid Last Name...'], trim: true },
    gender: { type: String, required: true, enum: ['male', 'female', 'other'], trim: true },
    mobile: { type: Number, required: false, validate: [ValidMobile, 'Invalid Mobile No...'] },
    email: { type: String, required: [true, 'Email is Required'], validate: [ValidEmail, 'Email is not Valid...'], trim: true, unique: true, lowercase: true },
    password: { type: String, required: [true, 'Password is Required'], validate: [ValidPassword, 'Password is not Valid...'], trim: true,select: false},
    role: { type: String, enum: ['user', 'admin', 'seller'], default: 'user' },
    addressList: [{pincode: { type: Number, default: null },
        city: { type: String, default: null },
        State: { type: String, enum: ['kaithal'], default: 'kaithal' },
        landmark: { type: String, default: null },
        addressLine: { type: String, default: null },
        isDefault: { type: Boolean, default: false }
    }],
    isAddress: { type: Boolean, default: false },
    
    // OTP Verification System
    verification: {
        logInInfo: [{ info: Object, default: {},
            timestamp: { type: Date, default: Date.now } 
        }],
        user: {
            // OTP fields
            otp: { type: String, default: null, select: false },
            otpExpiryTime: { type: Number, default: null, select: false },
            otpAtm: { type: Number, default: 3, select: false }, // Remaining attempts
            otpLockUntil: { type: Number, default: null, select: false },
            otpLockStage: { type: Number, default: -1, select: false },
            otpLastAttempt: { type: Number, default: null, select: false },
            otpRequestCount: { type: Number, default: 0, select: false },
            lastOtpRequest: { type: Number, default: null, select: false },
            
            // Account status
            isDelete: { type: Boolean, default: false },
            isVerify: { type: Boolean, default: false },
            blockAcc: { type: Boolean, default: false },
            blockReason: { type: String, default: null },
            verifiedAt: { type: Date, default: null }
        },
        admin: {}
    },
    
    // Password Reset System
    resetPassword: {
        otp: { type: String, default: null, select: false },
        otpExpiryTime: { type: Number, default: null, select: false },
        otpAtm: { type: Number, default: 3, select: false },
        otpLockUntil: { type: Number, default: null, select: false },
        otpLockStage: { type: Number, default: -1, select: false },
        isReset: { type: Boolean, default: false, select: false },
        resetRequestedAt: { type: Date, default: null }
    },
    
    // Preferences
    preferences: {
        emailNotifications: { type: Boolean, default: true },
        smsNotifications: { type: Boolean, default: false },
        marketingEmails: { type: Boolean, default: false }
    }
}, { timestamps: true });

// Hash password before saving (Mongoose 9: async hooks don't use next())
user_schema.pre('save', async function() {
    if (this.isModified('password')) {
        this.password = await bcrypt.hash(this.password, 10);
    }
});

// Compare password method
user_schema.methods.comparePassword = async function(enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};



export const user_model = mongoose.model('users', user_schema);