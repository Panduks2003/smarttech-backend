import ProductService from '../services/ProductService.js';

class ProductController {
  // Get all products
  static async getAllProducts(req, res) {
    try {
      const products = await ProductService.getAllProducts();
      res.json(products);
    } catch (error) {
      console.error('Error fetching products:', error);
      res.status(500).json({ error: 'Failed to fetch products' });
    }
  }

  // Get products by category
  static async getByCategory(req, res) {
    try {
      const { category } = req.params;
      const products = await ProductService.getProductsByCategory(category);
      res.json(products);
    } catch (error) {
      console.error('Error fetching products by category:', error);
      res.status(500).json({ error: 'Failed to fetch products by category' });
    }
  }

  // Search products
  static async search(req, res) {
    try {
      const { query } = req.query;
      if (!query) {
        return res.status(400).json({ error: 'Search query is required' });
      }
      const products = await ProductService.searchProducts(query);
      res.json(products);
    } catch (error) {
      console.error('Error searching products:', error);
      res.status(500).json({ error: 'Failed to search products' });
    }
  }

  // Get single product
  static async getProduct(req, res) {
    try {
      const { id } = req.params;
      const product = await ProductService.getProductById(id);
      if (!product) {
        return res.status(404).json({ error: 'Product not found' });
      }
      res.json(product);
    } catch (error) {
      console.error('Error fetching product:', error);
      res.status(500).json({ error: 'Failed to fetch product' });
    }
  }

  // Create product (Admin only)
  static async createProduct(req, res) {
    try {
      // TODO: Add admin authentication check
      const product = await ProductService.createProduct(req.body);
      res.status(201).json(product);
    } catch (error) {
      console.error('Error creating product:', error);
      res.status(500).json({ error: 'Failed to create product' });
    }
  }

  // Update product (Admin only)
  static async updateProduct(req, res) {
    try {
      // TODO: Add admin authentication check
      const { id } = req.params;
      const product = await ProductService.updateProduct(id, req.body);
      res.json(product);
    } catch (error) {
      console.error('Error updating product:', error);
      res.status(500).json({ error: 'Failed to update product' });
    }
  }

  // Delete product (Admin only)
  static async deleteProduct(req, res) {
    try {
      // TODO: Add admin authentication check
      const { id } = req.params;
      await ProductService.deleteProduct(id);
      res.status(204).send();
    } catch (error) {
      console.error('Error deleting product:', error);
      res.status(500).json({ error: 'Failed to delete product' });
    }
  }
}

export default ProductController;
