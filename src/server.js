import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

// Configure __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Enhanced environment configuration
const NODE_ENV = process.env.NODE_ENV || 'development';
const isDevelopment = NODE_ENV === 'development';
const isProduction = NODE_ENV === 'production';

import dotenv from 'dotenv';
dotenv.config();

// Enhanced logging
const log = (level, message, ...args) => {
  const logLevel = process.env.LOG_LEVEL || 'info';
  const levels = { debug: 0, info: 1, warn: 2, error: 3 };

  if (levels[level] >= levels[logLevel]) {
    const timestamp = new Date().toISOString();
    const prefix = `[${NODE_ENV.toUpperCase()}]`;
    console[level](`${prefix} ${timestamp}:`, message, ...args);
  }
};

import sendEmail from './api/send-email.js';
import testEmail from './api/test-email.js';
import validateGST from './api/gst-validation.js';
import validateRealGST from './api/gst-real-validation.js';
import validateRealWorkingGST from './api/gst-real-working.js';
import validateGSTWithAPIKey from './api/gst-api-working.js';
import { getProducts, getProductsByCategory, searchProducts, getProductStats } from './api/products.js';
import quotationsRouter from './api/quotations.js';

const app = express();
const PORT = process.env.PORT || 5000;

// Increase header size limits to handle large requests
app.use((req, res, next) => {
  res.setHeader('Access-Control-Max-Age', '86400');
  next();
});

// Dynamic CORS Configuration based on environment
const getAllowedOrigins = () => {
  const baseOrigins = [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:5001',
    'http://localhost:5002',
    'http://localhost:5003'
  ];

  const productionOrigins = [
    'https://smarttechay.com',
    'https://www.smarttechay.com'
  ];

  // Add custom origins from environment variable
  const customOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
    : [];

  return [...baseOrigins, ...productionOrigins, ...customOrigins];
};

const corsOptions = {
  origin: getAllowedOrigins(),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'pragma', 'cache-control', 'expires'],
  optionsSuccessStatus: 200 // For legacy browser support
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '50mb' })); // Increase payload limit for PDF attachments
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve static files from React build (only if it exists)
import fs from 'fs';
const buildPath = path.join(__dirname, '../build');
if (fs.existsSync(buildPath)) {
  app.use(express.static(buildPath));
}

// API Routes
app.post('/api/send-email', sendEmail);
app.post('/api/test-email', testEmail);
app.post('/api/validate-gst', validateGST);
app.post('/api/validate-real-gst', validateRealGST);
app.post('/api/validate-real-working-gst', validateRealWorkingGST);
app.post('/api/validate-gst-with-key', validateGSTWithAPIKey);

// Product API Routes
app.get('/api/products', getProducts);
app.get('/api/products/category/:category', getProductsByCategory);
app.get('/api/products/stats', getProductStats);

// Quotation API Routes
app.use('/api/quotations', quotationsRouter);

// Enhanced health check endpoint with environment info
app.get('/api/health', async (req, res) => {
  try {
    const healthData = {
      status: 'Server is running',
      timestamp: new Date().toISOString(),
      environment: NODE_ENV,
      port: PORT,
      features: {
        debug: process.env.DEBUG === 'true',
        corsLogging: process.env.ENABLE_CORS_LOGGING === 'true',
        logLevel: process.env.LOG_LEVEL || 'info'
      },
      config: {
        supabase: !!process.env.SUPABASE_URL,
        email: !!process.env.EMAIL_USER,
        gstApi: !!process.env.GST_API_KEY,
        corsOrigins: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',').length : 0
      }
    };

    // Test Supabase connection in development
    if (isDevelopment && process.env.SUPABASE_URL) {
      try {
        const { createClient } = await import('@supabase/supabase-js');
        const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
        const { data, error } = await supabase.from('quotation_counters').select('count').limit(1);

        healthData.supabase = {
          connected: !error,
          message: error ? error.message : 'Connection successful'
        };
      } catch (err) {
        healthData.supabase = {
          connected: false,
          message: err.message
        };
      }
    }

    log('info', 'Health check requested', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      environment: NODE_ENV
    });

    res.json(healthData);
  } catch (error) {
    log('error', 'Health check failed:', error);
    res.status(500).json({
      status: 'Error',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

// Test Supabase connection
app.get('/api/test-supabase', async (req, res) => {
  try {
    const { supabase } = await import('./config/supabase.js');

    // Try a simple query to test connection
    const { data, error } = await supabase
      .from('quotation_counters')
      .select('count(*)')
      .limit(1);

    if (error) {
      return res.status(400).json({
        success: false,
        error: error.message,
        details: error
      });
    }

    res.json({
      success: true,
      message: 'Supabase connection working',
      data: data
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack
    });
  }
});

// Simple quotation test endpoint
app.post('/api/test-quotation', async (req, res) => {
  try {
    const { supabase } = await import('./config/supabase.js');

    // Test data
    const testQuotation = {
      type: 'CUST',
      customer_name: 'Test Customer',
      customer_email: 'test@example.com',
      items: JSON.stringify([{ name: 'Test Item', price: 100 }]),
      items_count: 1,
      subtotal: 100,
      total_tax_amount: 18,
      total_amount: 118,
      status: 'DRAFT'
    };

    const { data, error } = await supabase
      .from('quotations')
      .insert([testQuotation])
      .select('*')
      .single();

    if (error) {
      return res.status(400).json({
        success: false,
        error: error.message,
        details: error
      });
    }

    res.json({
      success: true,
      message: 'Test quotation created successfully',
      quotation: data
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack
    });
  }
});

// Serve React app for all other routes or provide backend status
app.get('*', (req, res) => {
  const indexPath = path.join(__dirname, '../build', 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.json({
      message: 'Smart Technologies Backend API is running',
      api_health: '/api/health',
      timestamp: new Date().toISOString()
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`API available at http://localhost:${PORT}/api`);
});

export default app;
