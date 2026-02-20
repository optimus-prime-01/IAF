/**
 * Super Admin Creation Script
 *
 * Usage: node scripts/create-super-admin.js --name "Admin Name" --contact 9999988888 --password SecurePass123
 * 
 * Creates initial super admin with password for 2FA authentication.
 */

const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const Admin = require('../src/models/Admin');
const { hashPassword } = require('../src/services/password.service');

const args = process.argv.slice(2);

function getArg(name) {
    const index = args.indexOf(`--${name}`);
    return index !== -1 ? args[index + 1] : null;
}

const createSuperAdmin = async () => {
    const name = getArg('name');
    const contact = getArg('contact');
    const password = getArg('password');

    if (!name || !contact || !password) {
        console.error('Usage: node scripts/create-super-admin.js --name "Admin Name" --contact 9999988888 --password SecurePass123');
        process.exit(1);
    }

    if (password.length < 8) {
        console.error('Error: Password must be at least 8 characters');
        process.exit(1);
    }

    try {
        console.log('Connecting to database...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected.');

        // Hash password
        const passwordHash = await hashPassword(password);

        const existing = await Admin.findOne({ contact });
        if (existing) {
            console.log(`Admin with contact ${contact} already exists. Updating...`);
            existing.isSuperAdmin = true;
            existing.passwordHash = passwordHash;
            await existing.save();
            console.log('Updated to Super Admin with new password.');
        } else {
            const newAdmin = new Admin({
                name,
                contact,
                isSuperAdmin: true,
                permissions: [],
                passwordHash
            });

            await newAdmin.save();
            console.log('\n✅ Super Admin created successfully!');
            console.log(`   Name: ${name}`);
            console.log(`   Contact: ${contact}`);
            console.log(`\n   Login with contact + password, then verify OTP.`);
        }

        process.exit(0);
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
};

createSuperAdmin();
