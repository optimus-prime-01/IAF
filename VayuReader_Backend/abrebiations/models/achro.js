const mongoose = require("mongoose");

const abbreviationSchema = new mongoose.Schema(
  {
    abbreviation: {
      type: String,
      required: true,
      trim: true,
      unique: true
    },
    fullForm: {
      type: String,
      required: true,
      trim: true
    }
  },
  { timestamps: true }
);

abbreviationSchema.index({ abbreviation: "text", fullForm: "text" });

module.exports = mongoose.model("Abbreviation", abbreviationSchema);