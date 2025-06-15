const Abbreviation = require('../models/Abbreviation');

const addAbbreviation = async (req, res) => {
  try {
    const { abbreviation, meaning } = req.body;

    if (!abbreviation || !meaning) {
      return res.status(400).json({ msg: 'Both fields are required' });
    }

    const newEntry = new Abbreviation({ abbreviation, meaning });
    await newEntry.save();

    res.status(201).json({ msg: 'Abbreviation saved successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: 'Server error' });
  }
};

module.exports = { addAbbreviation };
