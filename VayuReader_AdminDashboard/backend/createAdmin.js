const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const Admin = require("./models/Admin");
require("dotenv").config();

const MONGO_URI = process.env.MONGO_URI;

const admins = [
  {
    name: "Admin1",
    officerId: "IAF001",
    password: "admin1234",
  },
  {
    name: "Admin2",
    officerId: "IAF002",
    password: "admin1234",
  },
];

const createAdmins = async () => {
  try {
    await mongoose.connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    for (const admin of admins) {
      const exists = await Admin.findOne({ officerId: admin.officerId });
      if (!exists) {
        const hashedPassword = await bcrypt.hash(admin.password, 10);
        await Admin.create({
          name: admin.name,
          officerId: admin.officerId, 
          password: hashedPassword,
        });
        console.log(`✅ Created admin: ${admin.officerId}`);
      } else {
        console.log(`⚠️ Admin already exists: ${admin.officerId}`);
      }
    }

    mongoose.disconnect();
  } catch (error) {
    console.error("❌ Error creating admins:", error);
    process.exit(1);
  }
};

createAdmins();
