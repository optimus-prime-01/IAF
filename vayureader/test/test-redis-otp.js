/**
 * Redis OTP Verification Test
 */

require('dotenv').config();
const { connectRedis, redisClient } = require('../src/config/redis');
const { generateOtp, saveOtp, getOtp, verifyOtp, deleteOtp } = require('../src/services/otp.service');

const runTest = async () => {
    try {
        console.log('--- Starting Redis OTP Test ---');

        // Connect to Redis
        await connectRedis();
        console.log('1. Connection check passed');

        const testId = 'test_9876543210';
        const otp = generateOtp();
        console.log(`2. Generated OTP: ${otp}`);

        // Save OTP
        await saveOtp(testId, otp);
        console.log('3. Saved OTP to Redis');

        // Retrieve OTP directly (should be encrypted string)
        const rawRedisValue = await redisClient.get(`vayureader-otp:${testId}`);
        console.log(`4. Direct Redis retrieval (Encrypted): ${rawRedisValue}`);

        if (!rawRedisValue || !rawRedisValue.includes(':')) {
            throw new Error('Stored value is not in expected encrypted format (iv:authTag:cipher)');
        }

        if (rawRedisValue === otp) throw new Error('Stored OTP is NOT encrypted!');

        // Verify OTP
        const verification = await verifyOtp(otp, testId);
        console.log(`5. Verification result: ${JSON.stringify(verification)}`);

        if (!verification.valid) throw new Error('Verification failed!');

        // Delete OTP
        await deleteOtp(testId);
        console.log('6. Deleted OTP from Redis');

        const finalCheck = await redisClient.get(`otp:${testId}`);
        console.log(`7. Post-deletion check (should be null): ${finalCheck}`);

        if (finalCheck !== null) throw new Error('Deletion failed!');

        console.log('\n✅ ALL REDIS TESTS PASSED SUCCESSFULLY!');
        process.exit(0);
    } catch (error) {
        console.error('\n❌ TEST FAILED:', error.message);
        process.exit(1);
    }
};

runTest();
