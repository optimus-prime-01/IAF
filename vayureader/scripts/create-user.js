/**
 * User Creation Script
 *
 * Usage: node scripts/create-user.js --name "User Name" --phone 9999988888
 * 
 * Creates a new user in the database.
 */

const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const User = require('../src/models/User');

const args = process.argv.slice(2);

function getArg(name) {
    const index = args.indexOf(`--${name}`);
    return index !== -1 ? args[index + 1] : null;
}

const createUser = async () => {
    const name = getArg('name');
    const phone = getArg('phone');

    if (!name || !phone) {
        console.error('Usage: node scripts/create-user.js --name "User Name" --phone 9999988888');
        process.exit(1);
    }

    // Validate phone number (basic validation)
    if (!/^\d{10}$/.test(phone)) {
        console.error('Error: Phone number must be exactly 10 digits');
        process.exit(1);
    }

    try {
        console.log('Connecting to database...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected.');

        const existing = await User.findOne({ phone_number: phone });
        if (existing) {
            console.log(`\n⚠️ User with phone ${phone} already exists.`);
            console.log(`   Name: ${existing.name}`);
            console.log(`   ID: ${existing._id}`);
            process.exit(0);
        }

        const newUser = new User({
            name,
            phone_number: phone
        });

        await newUser.save();
        console.log('\n✅ User created successfully!');
        console.log(`   Name: ${name}`);
        console.log(`   Phone: ${phone}`);
        console.log(`   ID: ${newUser._id}`);

        process.exit(0);
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
};

createUser();
