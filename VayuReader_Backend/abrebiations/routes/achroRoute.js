const express = require("express");
const Abbreviation = require("../models/achro");
const router = express.Router();

// POST /api/abbreviations 
router.post("/", async (req, res) => {
  try {
    const { abbreviation, fullForm } = req.body;
    const newAbbreviation = new Abbreviation({ abbreviation, fullForm });
    const savedAbbreviation = await newAbbreviation.save();
    res.status(201).json(savedAbbreviation);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// GET /api/abbreviations/:abbr 
router.get("/:abbr", async (req, res) => {
  try {
    const abbr = req.params.abbr;
    const result = await Abbreviation.findOne({ abbreviation: new RegExp(`^${abbr}$`, "i") });
    if (!result) {
      return res.status(404).json({ error: "Abbreviation not found" });
    }
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
