import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Configure __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to the products JSON file
const productsPath = path.join(__dirname, '../data/products.json');

// Cache for products data
let productsCache = null;
let lastModified = null;

// Function to load products from JSON file
function loadProducts() {
  try {
    // Check if file exists
    if (!fs.existsSync(productsPath)) {
      console.error('Products file not found:', productsPath);
      console.log('Expected path:', productsPath);
      console.log('Current working directory:', process.cwd());
      return [];
    }

    // Check if we need to reload (file modified)
    const stats = fs.statSync(productsPath);
    if (!productsCache || !lastModified || stats.mtime > lastModified) {
      console.log('Loading products from file...');
      const data = fs.readFileSync(productsPath, 'utf8');
      
      // Validate JSON before parsing
      if (!data || data.trim() === '') {
        console.error('Products file is empty');
        return [];
      }
      
      productsCache = JSON.parse(data);
      
      // Ensure productsCache is an array
      if (!Array.isArray(productsCache)) {
        console.error('Products data is not an array');
        return [];
      }
      
      lastModified = stats.mtime;
      console.log(`✅ Successfully loaded ${productsCache.length} products`);
    }

    return productsCache || [];
  } catch (error) {
    console.error('❌ Error loading products:', error.message);
    console.error('Stack trace:', error.stack);
    return [];
  }
}

// API endpoint to get all products
const getProducts = (req, res) => {
  try {
    console.log('📦 API Request: GET /api/products');
    const products = loadProducts();
    
    if (!products || products.length === 0) {
      console.log('⚠️ No products found in database');
      return res.json({
        success: true,
        count: 0,
        products: [],
        message: 'No products available'
      });
    }

    // Filter products that should be shown online
    const availableProducts = products.filter(product => {
      // More flexible filtering - show products that exist
      return product && 
             product.Product && 
             product.Product.trim() !== '' &&
             (product['Show Online'] === undefined || product['Show Online'] === 1) &&
             (product['Not For Sale'] === undefined || product['Not For Sale'] !== 1);
    });

    console.log(`📊 Filtered ${availableProducts.length} available products from ${products.length} total`);

    // Transform products to match the expected format
    const transformedProducts = availableProducts.map((product, index) => ({
      id: product.id || index + 1,
      name: product.Product || 'Unnamed Product',
      category: product.Category || 'General',
      hsn: product['HSN/SAC Code'] || '',
      price: parseFloat(product['Unit Price']) || 0,
      priceWithTax: parseFloat(product['Price with Tax']) || 0,
      tax: parseFloat(product.Tax) || 18,
      units: product.Units || 'UNT',
      description: product.Description || '',
      barcode: product.Barcode || '',
      type: product.Type || 'Product',
      discount: parseFloat(product.Discount) || 0,
      discountAmount: parseFloat(product['Discount Amount']) || 0,
      purchasePrice: parseFloat(product['Purchase Price']) || 0,
      qty: parseFloat(product.Qty) || 0
    }));

    console.log(`✅ Returning ${transformedProducts.length} products`);

    res.json({
      success: true,
      count: transformedProducts.length,
      products: transformedProducts
    });

  } catch (error) {
    console.error('❌ Error in getProducts:', error);
    console.error('Stack trace:', error.stack);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch products',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// API endpoint to get products by category
const getProductsByCategory = (req, res) => {
  try {
    const { category } = req.params;
    const products = loadProducts();
    
    const filteredProducts = products.filter(product => 
      product['Show Online'] === 1 && 
      product['Not For Sale'] !== 1 &&
      product.Product && 
      product.Product.trim() !== '' &&
      (product.Category || '').toLowerCase().includes(category.toLowerCase())
    );

    const transformedProducts = filteredProducts.map(product => ({
      id: product.id,
      name: product.Product,
      category: product.Category || 'General',
      hsn: product['HSN/SAC Code'] || '',
      price: parseFloat(product['Unit Price']) || 0,
      priceWithTax: parseFloat(product['Price with Tax']) || 0,
      tax: parseFloat(product.Tax) || 18,
      units: product.Units || 'UNT',
      description: product.Description || '',
      barcode: product.Barcode || '',
      type: product.Type || 'Product'
    }));

    res.json({
      success: true,
      category: category,
      count: transformedProducts.length,
      products: transformedProducts
    });

  } catch (error) {
    console.error('Error in getProductsByCategory:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch products by category',
      message: error.message
    });
  }
};

// API endpoint to search products
const searchProducts = (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q || q.trim() === '') {
      return res.json({
        success: true,
        query: '',
        count: 0,
        products: []
      });
    }

    const products = loadProducts();
    const searchTerm = q.toLowerCase().trim();
    
    const filteredProducts = products.filter(product => 
      product['Show Online'] === 1 && 
      product['Not For Sale'] !== 1 &&
      product.Product && 
      product.Product.trim() !== '' &&
      (
        product.Product.toLowerCase().includes(searchTerm) ||
        (product.Category || '').toLowerCase().includes(searchTerm) ||
        (product.Description || '').toLowerCase().includes(searchTerm) ||
        (product['HSN/SAC Code'] || '').toLowerCase().includes(searchTerm)
      )
    );

    const transformedProducts = filteredProducts.map(product => ({
      id: product.id,
      name: product.Product,
      category: product.Category || 'General',
      hsn: product['HSN/SAC Code'] || '',
      price: parseFloat(product['Unit Price']) || 0,
      priceWithTax: parseFloat(product['Price with Tax']) || 0,
      tax: parseFloat(product.Tax) || 18,
      units: product.Units || 'UNT',
      description: product.Description || '',
      barcode: product.Barcode || '',
      type: product.Type || 'Product'
    }));

    res.json({
      success: true,
      query: q,
      count: transformedProducts.length,
      products: transformedProducts
    });

  } catch (error) {
    console.error('Error in searchProducts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search products',
      message: error.message
    });
  }
};

// API endpoint to get product statistics
const getProductStats = (req, res) => {
  try {
    const products = loadProducts();
    
    const totalProducts = products.length;
    const availableProducts = products.filter(p => p['Show Online'] === 1 && p['Not For Sale'] !== 1).length;
    const categories = [...new Set(products.map(p => p.Category).filter(c => c && c.trim()))];
    
    res.json({
      success: true,
      stats: {
        total: totalProducts,
        available: availableProducts,
        categories: categories.length,
        categoryList: categories
      }
    });

  } catch (error) {
    console.error('Error in getProductStats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get product statistics',
      message: error.message
    });
  }
};

export {
  getProducts,
  getProductsByCategory,
  searchProducts,
  getProductStats
};
