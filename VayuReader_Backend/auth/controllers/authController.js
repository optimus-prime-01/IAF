const User = require('../Models/User');
const { generateToken } = require('../utils/jwt');

const signup = async (req, res) => {
  try {
    const { name, officer_id, phone_number, password } = req.body;

    const existingUser = await User.findOne({
      $or: [{ phone_number }, { officer_id }]
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this phone number or officer ID already exists'
      });
    }

    const user = new User({ name, officer_id, phone_number, password });
    await user.save();

    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        officer_id: user.officer_id,
        phone_number: user.phone_number
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

const login = async (req, res) => {
  try {
    const { phone_number, password } = req.body;

    const user = await User.findOne({ phone_number });
    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid credentials'
      });
    }
    
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Invalid credentials'
      });
    }
    
    const token = generateToken(user._id);

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        officer_id: user.officer_id,
        phone_number: user.phone_number
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

const getProfile = async (req, res) => {
  res.json({
    success: true,
    user: req.user
  });
};

module.exports = { signup, login, getProfile };
