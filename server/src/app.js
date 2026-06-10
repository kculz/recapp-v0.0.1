const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const v1Router = require('./v1/routes');
const v2Router = require('./v2/routes');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Routes
app.use('/api/v1', v1Router);
app.use('/api/v2', v2Router);

// Base route
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to the RecApp API' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal Server Error'
  });
});

module.exports = app;
