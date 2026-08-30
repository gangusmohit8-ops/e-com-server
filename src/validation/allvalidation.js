// Name validation (2-30 characters, letters and spaces only)
export const ValidName = (value) => {
    return /^[A-Za-z\s]{2,30}$/.test(value);
};

// Email validation
export const ValidEmail = (value) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
};

// Password validation (8+ chars, uppercase, lowercase, number, special char)
export const ValidPassword = (value) => {
    return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/.test(value);
};

// Mobile validation (Indian numbers only)
export const ValidMobile = (value) => {
    return /^[6-9]\d{9}$/.test(value.toString());
};

// OTP validation (6 digits)
export const ValidOTP = (value) => {
    return /^\d{6}$/.test(value);
};

// Pincode validation (6 digits)
export const ValidPincode = (value) => {
    return /^\d{6}$/.test(value.toString());
};