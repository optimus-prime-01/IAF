const express = require("express");
const router = express.Router();
const { loginAdmin} = require("../controllers/authController");

router.post("/login", loginAdmin);
// router.post("/register", registerAdmin); // optional

module.exports = router;
