/**
 * Reset Admin Password Script
 * 
 * Usage:
 *   node scripts/reset-admin-password.js --contact +91XXXXXXXXXX --password NewSecurePass123
 * 
 * This script manually resets an admin's password.
 * Use when an admin forgets their password.
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Admin = require('../src/models/Admin');
const { hashPassword } = require('../src/services/password.service');

const args = process.argv.slice(2);

function getArg(name) {
    const index = args.indexOf(`--${name}`);
    return index !== -1 ? args[index + 1] : null;
}

async function resetPassword() {
    const contact = getArg('contact');
    const password = getArg('password');

    if (!contact || !password) {
        console.error('Usage: node scripts/reset-admin-password.js --contact +91XXXXXXXXXX --password NewSecurePass123');
        process.exit(1);
    }

    if (password.length < 8) {
        console.error('Error: Password must be at least 8 characters');
        process.exit(1);
    }

    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // Find admin
        const admin = await Admin.findOne({ contact });

        if (!admin) {
            console.error(`Error: No admin found with contact: ${contact}`);
            process.exit(1);
        }

        // Hash new password
        const passwordHash = await hashPassword(password);

        // Update password
        admin.passwordHash = passwordHash;
        await admin.save();

        console.log(`\n✅ Password reset successfully for:`);
        console.log(`   Name: ${admin.name}`);
        console.log(`   Contact: ${admin.contact}`);
        console.log(`   Type: ${admin.isSuperAdmin ? 'Super Admin' : 'Sub-Admin'}`);
        console.log(`\n   The admin can now login with the new password.`);

    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
    }
}

resetPassword();
