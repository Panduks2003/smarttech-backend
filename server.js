const express = require('express');
const cors = require('cors');
const path = require('path');

// Load environment variables based on NODE_ENV
const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env';
require('dotenv').config({ path: envFile });

const app = express();
const PORT = process.env.PORT || 5001;

// CORS configuration
const corsOptions = {
  origin: [
    'http://localhost:3000',
    'http://localhost:3001', 
    'http://localhost:5001',
    'http://localhost:5002',
    'http://localhost:5003',
    'https://smarttechay.com',
    'https://www.smarttechay.com',
    'https://smarttech.pandushirabur.com',
    'https://smarttech-frontend.onrender.com'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// API Routes
const productsApi = require('./server/api/products');
app.get('/api/products', productsApi.getProducts);
app.get('/api/products/category/:category', productsApi.getProductsByCategory);
app.get('/api/products/search', productsApi.searchProducts);
app.get('/api/products/stats', productsApi.getProductStats);

app.use('/api/quotations', require('./server/api/quotations'));
app.use('/api/send-email', require('./server/api/email'));
app.use('/api/validate-gst', require('./server/api/gst'));
app.use('/api/validate-gst-with-key', require('./server/api/gst')); // Alias for compatibility

// Health check endpoint
app.get('/api/health', (req, res) => {
  const environment = process.env.NODE_ENV || 'development';
  res.json({
    status: 'Server is running',
    timestamp: new Date().toISOString(),
    environment: environment,
    port: PORT,
    features: {
      debug: process.env.DEBUG === 'true',
      corsLogging: process.env.CORS_LOGGING === 'true',
      logLevel: process.env.LOG_LEVEL || 'info'
    },
    config: {
      supabase: !!process.env.SUPABASE_URL,
      email: !!process.env.EMAIL_HOST,
      gstApi: !!process.env.GST_API_KEY,
      corsOrigins: corsOptions.origin.length
    }
  });
});

// Root endpoint for API documentation
app.get('/', (req, res) => {
  res.json({
    message: 'Smart Technologies Backend API',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      products: '/api/products',
      quotations: '/api/quotations',
      email: '/api/send-email',
      gst: '/api/validate-gst'
    },
    documentation: 'https://smarttech-backend.onrender.com/api/health'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Route not found',
    availableRoutes: ['/api/health', '/api/products', '/api/quotations', '/api/send-email', '/api/validate-gst']
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Smart Technologies Backend running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;
