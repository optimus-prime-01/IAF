/**
 * User/Admin Management Script
 * 
 * Helper script to delete or block users/admins from CLI.
 * 
 * Usage: node scripts/manageUsers.js <type> <action> <flag> <value>
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/models/User');
const Admin = require('../src/models/Admin');

const args = process.argv.slice(2);

const printUsage = () => {
    console.log('Usage: node scripts/manageUsers.js <type> <action> <identifier_flag> <value>');
    console.log('  type: user | admin');
    console.log('  action: delete | block | unblock');
    console.log('  identifier: --contact | --id | --device');
    console.log('    --contact: Phone number for users, Contact for admins');
    console.log('    --id: Database _id');
    console.log('    --device: deviceId (only for user)');
    console.log('\nExamples:');
    console.log('  node scripts/manageUsers.js user block --contact 1234567890');
    console.log('  node scripts/manageUsers.js admin delete --id 60d5ecb8b392d7001f3e76a1');
    process.exit(1);
};

if (args.length < 4) printUsage();

const [type, action, flag, value] = args;

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');
    } catch (err) {
        console.error('DB Connection Error:', err);
        process.exit(1);
    }
};

const run = async () => {
    await connectDB();

    let Model;
    if (type === 'user') Model = User;
    else if (type === 'admin') Model = Admin;
    else {
        console.error('Invalid type. Must be "user" or "admin".');
        process.exit(1);
    }

    let query = {};
    if (flag === '--id') query._id = value;
    else if (flag === '--contact') {
        if (type === 'user') query.phone_number = value;
        else query.contact = value;
    } else if (flag === '--device') {
        if (type === 'user') query.deviceId = value;
        else {
            console.error('--device flag is only valid for user type.');
            process.exit(1);
        }
    } else {
        console.error(`Invalid identifier flag: ${flag}`);
        process.exit(1);
    }

    try {
        const doc = await Model.findOne(query);
        if (!doc) {
            console.log(`${type} not found with ${flag} = ${value}`);
            process.exit(0);
        }

        console.log(`Found ${type}: ${doc._id} (${doc.name})`);

        if (action === 'delete') {
            await Model.deleteOne({ _id: doc._id });
            console.log(`${type} deleted successfully.`);
        } else if (action === 'block') {
            if (type === 'user') {
                doc.isBlocked = true;
                await doc.save();
                console.log(`User blocked successfully.`);
            } else {
                console.log('Blocking not supported for admins (use delete).');
            }
        } else if (action === 'unblock') {
            if (type === 'user') {
                doc.isBlocked = false;
                await doc.save();
                console.log(`User unblocked successfully.`);
            } else {
                console.log('Unblocking not supported for admins.');
            }
        } else {
            console.error('Invalid action. Use delete, block, or unblock.');
        }

    } catch (err) {
        console.error('Error executing action:', err.message);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from DB');
        process.exit(0);
    }
};

run();
