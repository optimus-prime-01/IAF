const express = require('express');
const cors = require('cors');
require('dotenv').config();
const connectDB = require('./config/database');
const dictionaryRoutes = require('./routes/dictionary');

const app = express();
const PORT = process.env.PORT || 3000;

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' })); // Increased limit for large JSON files
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/dictionary', dictionaryRoutes);

// Health check route
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Dictionary API is running' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});