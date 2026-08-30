/**
 * API Test Script — Tests the full auth flow:
 * 1. Health Check
 * 2. Register (create user)
 * 3. Login (unverified — should get 403 + token)  
 * 4. Send OTP (with token)
 * 5. Get OTP Status (with token)
 * 6. Login (after verify — full flow test)
 * 7. Get Me (with token)
 * 8. Logout
 * 9. 404 test
 */

const BASE_URL = 'http://localhost:5000';
const API = `${BASE_URL}/api/v1`;

// Generate unique email for test
const testEmail = `testuser_${Date.now()}@test.com`;
const testPassword = 'Test@1234';

let authToken = null;

async function request(method, url, body = null, token = null) {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const options = { method, headers };
    if (body) options.body = JSON.stringify(body);

    try {
        const res = await fetch(url, options);
        const data = await res.json();
        return { status: res.status, data };
    } catch (err) {
        return { status: 0, error: err.message };
    }
}

function log(testName, result) {
    const icon = result.status >= 200 && result.status < 400 ? '✅' : 
                 result.status === 403 ? '⚠️' : '❌';
    console.log(`\n${icon} ${testName} [${result.status}]`);
    console.log(JSON.stringify(result.data || result.error, null, 2));
}

async function runTests() {
    console.log('=' .repeat(60));
    console.log('🧪 E-Commerce Server API Test Suite');
    console.log('=' .repeat(60));

    // 1. Health Check
    const health = await request('GET', `${BASE_URL}/health`);
    log('1. Health Check', health);

    // 2. 404 Test
    const notFound = await request('GET', `${BASE_URL}/nonexistent`);
    log('2. 404 Handler', notFound);

    // 3. Register — missing fields
    const regMissing = await request('POST', `${API}/auth/register`, {
        email: testEmail
    });
    log('3. Register (missing fields)', regMissing);

    // 4. Register — valid
    const reg = await request('POST', `${API}/auth/register`, {
        fname: 'Test',
        lname: 'User',
        email: testEmail,
        password: testPassword,
        gender: 'male'
    });
    log('4. Register (valid)', reg);
    
    if (reg.data?.token) {
        authToken = reg.data.token;
        console.log(`   📌 Token saved: ${authToken.substring(0, 20)}...`);
    }

    // 5. Register — duplicate email
    const regDup = await request('POST', `${API}/auth/register`, {
        fname: 'Test',
        lname: 'Duplicate',
        email: testEmail,
        password: testPassword,
        gender: 'female'
    });
    log('5. Register (duplicate email)', regDup);

    // 6. Login — unverified user (should get 403 + temp token)
    const loginUnverified = await request('POST', `${API}/auth/login`, {
        email: testEmail,
        password: testPassword
    });
    log('6. Login (unverified user)', loginUnverified);
    
    if (loginUnverified.data?.token) {
        authToken = loginUnverified.data.token;
        console.log(`   📌 Temp token saved: ${authToken.substring(0, 20)}...`);
    }

    // 7. Login — wrong password
    const loginWrong = await request('POST', `${API}/auth/login`, {
        email: testEmail,
        password: 'WrongPass@123'
    });
    log('7. Login (wrong password)', loginWrong);

    // 8. Login — missing fields
    const loginMissing = await request('POST', `${API}/auth/login`, {});
    log('8. Login (missing fields)', loginMissing);

    // 9. Send OTP (with token)
    if (authToken) {
        const sendOtp = await request('POST', `${API}/auth/send-otp`, null, authToken);
        log('9. Send OTP (protected)', sendOtp);
    }

    // 10. Get OTP Status (with token)
    if (authToken) {
        const otpStatus = await request('GET', `${API}/auth/otp-status`, null, authToken);
        log('10. OTP Status (protected)', otpStatus);
    }

    // 11. Verify OTP — invalid format
    if (authToken) {
        const verifyBad = await request('POST', `${API}/auth/verify-otp`, { otp: '123' }, authToken);
        log('11. Verify OTP (invalid format)', verifyBad);
    }

    // 12. Verify OTP — wrong OTP
    if (authToken) {
        const verifyWrong = await request('POST', `${API}/auth/verify-otp`, { otp: '000000' }, authToken);
        log('12. Verify OTP (wrong OTP)', verifyWrong);
    }

    // 13. Get Me (with token)
    if (authToken) {
        const me = await request('GET', `${API}/auth/me`, null, authToken);
        log('13. Get Me (protected)', me);
    }

    // 14. Get Me (no token — should fail)
    const meNoAuth = await request('GET', `${API}/auth/me`);
    log('14. Get Me (no token)', meNoAuth);

    // 15. Forgot Password
    const forgot = await request('POST', `${API}/auth/forgot-password`, { email: testEmail });
    log('15. Forgot Password', forgot);

    // 16. Logout
    if (authToken) {
        const logout = await request('POST', `${API}/auth/logout`, null, authToken);
        log('16. Logout', logout);
    }

    console.log('\n' + '=' .repeat(60));
    console.log('🏁 Test suite complete!');
    console.log('=' .repeat(60));
}

runTests().catch(console.error);
