/**
 * Seed Super Admin Script
 * 
 * Usage: node scripts/seedAdmin.js <name> <phone> <password>
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Admin = require('../src/models/Admin');
const { hashPassword } = require('../src/services/password.service');
const { connectDB } = require('../src/config/database');

const seedAdmin = async () => {
    try {
        const args = process.argv.slice(2);

        if (args.length < 3) {
            console.log('Usage: node scripts/seedAdmin.js <name> <phone> <password>');
            console.log('Example: node scripts/seedAdmin.js "John Doe" "+919876543210" "securePASS123"');
            process.exit(1);
        }

        const [name, contact, password] = args;

        console.log('Connecting to database...');
        await connectDB();

        // Check if exists
        const existing = await Admin.findOne({ contact });
        if (existing) {
            console.error('❌ Admin with this contact already exists!');
            process.exit(1);
        }

        console.log('Hashing password...');
        const passwordHash = await hashPassword(password);

        console.log('Creating Super Admin...');
        const admin = new Admin({
            name,
            contact,
            passwordHash,
            isSuperAdmin: true,
            permissions: Admin.PERMISSIONS, // Super admin gets all permissions
            createdBy: 'System Seed'
        });

        await admin.save();

        console.log('');
        console.log('✅ Super Admin Created Successfully!');
        console.log('-----------------------------------');
        console.log(`Name:     ${admin.name}`);
        console.log(`Contact:  ${admin.contact}`);
        console.log(`Password: [HIDDEN]`);
        console.log('-----------------------------------');

        process.exit(0);
    } catch (error) {
        console.error('❌ Failed to seed admin:', error.message);
        process.exit(1);
    }
};

seedAdmin();
