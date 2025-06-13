// server.js - Simple Express server for Acronym Finder API
const express = require('express');
const cors = require('cors');
// const acronymRoutes = require('./route');
const route = require('./routes/pdfRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Welcome route
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to Acronym Finder API',
    endpoints: [
      'GET /api/acronyms - Get all acronyms',
      'GET /api/find/:acronym - Find specific acronym',
      'POST /api/acronyms - Add new acronym'
    ],
    example: 'GET /api/find/IAS'
  });
});

// API Routes
app.use('/api', acronymRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🔍 Acronym Finder API running on http://localhost:${PORT}`);
  console.log(`Try: http://localhost:${PORT}/api/find/IAS`);
});

module.exports = app;