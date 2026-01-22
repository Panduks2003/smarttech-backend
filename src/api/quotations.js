import express from 'express';
const router = express.Router();
import quotationService from '../services/quotationService.js';

/**
 * POST /api/quotations
 * Create a new quotation
 */
router.post('/', async (req, res) => {
  try {
    const {
      type, // 'CUST' or 'VEND'
      customerData,
      items,
      totals,
      notes,
      validUntil
    } = req.body;

    // Validate required fields
    if (!type || !customerData || !items || !totals) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: type, customerData, items, totals'
      });
    }

    const result = await quotationService.createQuotation({
      type,
      customerData,
      items,
      totals,
      notes,
      validUntil
    });

    if (result.success) {
      res.status(201).json(result);
    } else {
      res.status(400).json(result);
    }

  } catch (error) {
    console.error('Error in POST /api/quotations:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * GET /api/quotations/:id
 * Get quotation by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Quotation ID is required'
      });
    }

    const result = await quotationService.getQuotation(id);

    if (result.success) {
      res.json(result);
    } else {
      res.status(404).json(result);
    }

  } catch (error) {
    console.error('Error in GET /api/quotations/:id:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * GET /api/quotations
 * Get quotations with pagination and filters
 */
router.get('/', async (req, res) => {
  try {
    const {
      type,
      status,
      year,
      page = 1,
      limit = 10,
      sortBy = 'created_at',
      sortOrder = 'desc'
    } = req.query;

    const result = await quotationService.getQuotations({
      type,
      status,
      year: year ? parseInt(year) : undefined,
      page: parseInt(page),
      limit: parseInt(limit),
      sortBy,
      sortOrder
    });

    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }

  } catch (error) {
    console.error('Error in GET /api/quotations:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * PATCH /api/quotations/:id/status
 * Update quotation status
 */
router.patch('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!id || !status) {
      return res.status(400).json({
        success: false,
        error: 'Quotation ID and status are required'
      });
    }

    const result = await quotationService.updateQuotationStatus(id, status);

    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }

  } catch (error) {
    console.error('Error in PATCH /api/quotations/:id/status:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * GET /api/quotations/counters/current
 * Get current year counters
 */
router.get('/counters/current', async (req, res) => {
  try {
    const result = await quotationService.getCounters();

    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }

  } catch (error) {
    console.error('Error in GET /api/quotations/counters/current:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * POST /api/quotations/test
 * Test endpoint to create sample quotations
 */
router.post('/test', async (req, res) => {
  try {
    // Create a test customer quotation
    const customerQuotation = await quotationService.createQuotation({
      type: 'CUST',
      customerData: {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+91-9876543210',
        address: '123 Main St, Bangalore, Karnataka, 560001'
      },
      items: [
        {
          name: 'Test Product 1',
          qty: 2,
          price: 1000,
          priceWithTax: 1180,
          hsn: '1234',
          category: 'General',
          tax: 18,
          units: 'UNT',
          description: 'Test product description',
          type: 'Product'
        }
      ],
      totals: {
        subtotal: 2000,
        taxAmount: 360,
        total: 2360
      },
      notes: 'Test customer quotation'
    });

    // Create a test vendor quotation
    const vendorQuotation = await quotationService.createQuotation({
      type: 'VEND',
      customerData: {
        companyName: 'Test Vendor Company',
        gst: '29AACCG0527D1Z0',
        address: 'Vendor Address, Bangalore',
        email: 'vendor@example.com',
        phone: '+91-9876543210'
      },
      items: [
        {
          name: 'Test Service 1',
          qty: 1,
          price: 5000,
          priceWithTax: 5900,
          hsn: '9983',
          category: 'Services',
          tax: 18,
          units: 'UNT',
          description: 'Test service description',
          type: 'Service'
        }
      ],
      totals: {
        subtotal: 5000,
        taxAmount: 900,
        total: 5900
      },
      notes: 'Test vendor quotation'
    });

    res.json({
      success: true,
      message: 'Test quotations created successfully',
      customerQuotation,
      vendorQuotation
    });

  } catch (error) {
    console.error('Error in POST /api/quotations/test:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

export default router;
