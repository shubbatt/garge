require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

// Routes - with /api prefix (for local development)
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/inventory', require('./routes/inventory'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/customers', require('./routes/customers'));
app.use('/api/vehicles', require('./routes/vehicles'));
app.use('/api/services', require('./routes/services'));
app.use('/api/service-categories', require('./routes/serviceCategories'));
app.use('/api/job-cards', require('./routes/jobCards'));
app.use('/api/pos', require('./routes/pos'));
app.use('/api/invoices', require('./routes/invoices'));
app.use('/api/daily-usage', require('./routes/dailyUsage'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api/dashboard', require('./routes/dashboard'));

// Routes - without /api prefix (for DigitalOcean App Platform path stripping)
app.use('/auth', require('./routes/auth'));
app.use('/users', require('./routes/users'));
app.use('/inventory', require('./routes/inventory'));
app.use('/categories', require('./routes/categories'));
app.use('/customers', require('./routes/customers'));
app.use('/vehicles', require('./routes/vehicles'));
app.use('/services', require('./routes/services'));
app.use('/service-categories', require('./routes/serviceCategories'));
app.use('/job-cards', require('./routes/jobCards'));
app.use('/pos', require('./routes/pos'));
app.use('/invoices', require('./routes/invoices'));
app.use('/daily-usage', require('./routes/dailyUsage'));
app.use('/reports', require('./routes/reports'));
app.use('/settings', require('./routes/settings'));
app.use('/dashboard', require('./routes/dashboard'));

// Root route
app.get('/', (req, res) => {
  res.json({
    name: 'Ramboo Engineering API',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: '/api/health',
      auth: '/api/auth',
      docs: 'See API documentation'
    }
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: {
      message: err.message || 'Internal Server Error',
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    }
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: { message: 'Not Found' } });
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`🚀 Ramboo Engineering API running on port ${PORT}`);
});
