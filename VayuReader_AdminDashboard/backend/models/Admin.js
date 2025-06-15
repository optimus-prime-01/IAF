const mongoose = require("mongoose");

const adminSchema = new mongoose.Schema({
  name: { type: String, required: true },
  officerId: { type: String, required: true, unique: true },
  password: { type: String, required: true }  // hashed
});

module.exports = mongoose.model("Admin", adminSchema);
