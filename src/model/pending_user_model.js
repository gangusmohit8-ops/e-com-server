import mongoose from "mongoose";
import { ValidName, ValidEmail, ValidPassword, ValidMobile } from "../validation/allvalidation.js";

const pending_user_schema = new mongoose.Schema({
    fname: { type: String, required: [true, 'First Name is Required...'], trim: true, validate: [ValidName, 'Name is not Valid...'] },
    lname: { type: String, required: [true, 'Last name is Required...'], validate: [ValidName, 'Invalid Last Name...'], trim: true },
    gender: { type: String, required: true, enum: ['male', 'female', 'other'], trim: true },
    mobile: { type: Number, required: false, validate: [ValidMobile, 'Invalid Mobile No...'] },
    email: { type: String, required: [true, 'Email is Required'], validate: [ValidEmail, 'Email is not Valid...'], trim: true, lowercase: true, index: true },
    password: { type: String, required: [true, 'Password is Required'], validate: [ValidPassword, 'Password is not Valid...'], trim: true },
    otp: { type: String, required: true },
    otpExpiryTime: { type: Number, required: true },
    otpAtm: { type: Number, default: 3 },
    otpLockUntil: { type: Number, default: null },
    otpLockStage: { type: Number, default: -1 },
    createdAt: { type: Date, default: Date.now, expires: 900 } // Auto-deletes after 15 minutes if not verified
});

export const pending_user_model = mongoose.model('pending_users', pending_user_schema);
