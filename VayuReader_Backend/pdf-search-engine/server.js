require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const pdfRoutes = require('./routes/pdfRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Routes
app.use('/api/pdfs', pdfRoutes);

// Root route
app.get('/', (req, res) => {
  res.json({ message: 'PDF Search Engine API' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});