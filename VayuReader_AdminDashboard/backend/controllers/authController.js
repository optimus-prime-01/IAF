  const bcrypt = require("bcrypt");
  const jwt = require("jsonwebtoken");
  const Admin = require("../models/Admin");

  exports.loginAdmin = async (req, res) => {
    const { officerId, password } = req.body;

    const admin = await Admin.findOne({ officerId });
    if (!admin) return res.status(401).json({ msg: "Invalid credentials" });

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) return res.status(401).json({ msg: "Invalid credentials" });

    const token = jwt.sign(
      { id: admin._id, officerId: admin.officerId },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({ token });
  };
