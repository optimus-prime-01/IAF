const express = require("express");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const path = require("path"); 
const cors = require("cors");

const authRoutes = require("./routes/authRoutes");
const pdfRoutes = require("./routes/pdfRoutes");

dotenv.config();
const app = express();

// Make sure this is BEFORE the routes
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cors());

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
// Routes
app.use("/api/auth", authRoutes);
app.use("/api/pdf", pdfRoutes); // FIXED path

// app.use('/uploads', express.static('uploads'));



mongoose
.connect(process.env.MONGO_URI)
.then(() => {
console.log("MongoDB connected");
app.listen(process.env.PORT || 5000, () =>
console.log(`Server running on port ${process.env.PORT}`)
);
})