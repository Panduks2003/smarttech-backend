const { supabase } = require('../config/supabase');

class QuotationService {
  /**
   * Create a new quotation with auto-generated quotation number
   * @param {Object} quotationData - The quotation data
   * @returns {Promise<Object>} Created quotation with generated number
   */
  async createQuotation(quotationData) {
    const maxRetries = 3;
    let attempt = 0;

    while (attempt < maxRetries) {
      try {
        const {
          type, // 'CUST' or 'VEND'
          customerData,
          items,
          totals,
          notes,
          validUntil
        } = quotationData;

        // Validate required fields
        if (!type || !['CUST', 'VEND'].includes(type)) {
          throw new Error('Invalid quotation type. Must be CUST or VEND');
        }

        if (!items || !Array.isArray(items) || items.length === 0) {
          throw new Error('Items are required');
        }

        if (!totals || typeof totals.total !== 'number') {
          throw new Error('Total amount is required');
        }

        // Generate quotation number manually to avoid race conditions
        const quotationNumber = await this.generateQuotationNumber(type);
        const currentYear = new Date().getFullYear();
        const sequenceNumber = parseInt(quotationNumber.split('/').pop());

        // Prepare quotation data for insertion
        const quotationRecord = {
          quotation_number: quotationNumber,
          type,
          year: currentYear,
          sequence_number: sequenceNumber,
          items: JSON.stringify(items),
          items_count: items.length,
          subtotal: totals.subtotal || 0,
          total_tax_amount: totals.taxAmount || 0,
          total_amount: totals.total,
          notes: notes || null,
          valid_until: validUntil || null,
          status: 'DRAFT'
        };

        // Add customer/vendor specific data
        if (type === 'CUST') {
          quotationRecord.customer_name = customerData.name;
          quotationRecord.customer_email = customerData.email;
          quotationRecord.customer_phone = customerData.phone;
          quotationRecord.customer_address = customerData.address;
        } else if (type === 'VEND') {
          quotationRecord.company_name = customerData.companyName;
          quotationRecord.company_gst = customerData.gst;
          quotationRecord.company_address = customerData.address;
          quotationRecord.customer_email = customerData.email;
          quotationRecord.customer_phone = customerData.phone;
        }

        // Insert quotation with pre-generated number
        const { data, error } = await supabase
          .from('quotations')
          .insert([quotationRecord])
          .select('*')
          .single();

        if (error) {
          // If it's a duplicate key error, retry with a new number
          if (error.code === '23505' && error.message.includes('quotations_quotation_number_key')) {
            attempt++;
            console.log(`Duplicate quotation number detected, retrying... (attempt ${attempt}/${maxRetries})`);
            
            if (attempt >= maxRetries) {
              throw new Error('Failed to generate unique quotation number after multiple attempts');
            }
            
            // Wait a bit before retrying
            await new Promise(resolve => setTimeout(resolve, 100 * attempt));
            continue;
          }
          
          console.error('Supabase error:', error);
          throw new Error(`Failed to create quotation: ${error.message}`);
        }

        return {
          success: true,
          quotation: {
            id: data.id,
            quotationNumber: data.quotation_number,
            type: data.type,
            year: data.year,
            sequenceNumber: data.sequence_number,
            customerData: this.extractCustomerData(data),
            items: JSON.parse(data.items),
            totals: {
              subtotal: parseFloat(data.subtotal),
              taxAmount: parseFloat(data.total_tax_amount),
              total: parseFloat(data.total_amount)
            },
            status: data.status,
            validUntil: data.valid_until,
            notes: data.notes,
            createdAt: data.created_at,
            updatedAt: data.updated_at
          }
        };

      } catch (error) {
        if (attempt >= maxRetries - 1) {
          console.error('Error creating quotation after all retries:', error);
          return {
            success: false,
            error: error.message
          };
        }
        attempt++;
      }
    }
  }

  /**
   * Generate a unique quotation number
   * @param {string} type - Quotation type (CUST or VEND)
   * @returns {Promise<string>} Generated quotation number
   */
  async generateQuotationNumber(type) {
    const currentYear = new Date().getFullYear();
    
    try {
      // Try to use the RPC function first (if available)
      const { data, error } = await supabase.rpc('increment_quotation_counter', {
        quotation_type: type,
        current_year: currentYear
      });

      if (!error && data) {
        const sequenceNumber = data;
        return `ST/${type}/${currentYear}/${String(sequenceNumber).padStart(2, '0')}`;
      }
    } catch (rpcError) {
      console.log('RPC function not available, using fallback method');
    }

    // Fallback method: Query existing quotations and increment
    try {
      const { data: existingQuotations, error: queryError } = await supabase
        .from('quotations')
        .select('sequence_number')
        .eq('type', type)
        .eq('year', currentYear)
        .order('sequence_number', { ascending: false })
        .limit(1);

      if (queryError) {
        throw queryError;
      }

      const lastSequence = existingQuotations && existingQuotations.length > 0 
        ? existingQuotations[0].sequence_number 
        : 0;
      
      const nextSequence = lastSequence + 1;
      return `ST/${type}/${currentYear}/${String(nextSequence).padStart(2, '0')}`;

    } catch (fallbackError) {
      console.error('Error in fallback quotation number generation:', fallbackError);
      // Ultimate fallback: use timestamp + random
      const timestamp = Date.now().toString().slice(-4);
      const random = Math.floor(Math.random() * 100).toString().padStart(2, '0');
      return `ST/${type}/${currentYear}/${timestamp}${random}`;
    }
  }

  /**
   * Get quotation by ID
   * @param {string} quotationId - The quotation ID
   * @returns {Promise<Object>} Quotation data
   */
  async getQuotation(quotationId) {
    try {
      const { data, error } = await supabase
        .from('quotations')
        .select('*')
        .eq('id', quotationId)
        .single();

      if (error) {
        throw new Error(`Failed to fetch quotation: ${error.message}`);
      }

      if (!data) {
        throw new Error('Quotation not found');
      }

      return {
        success: true,
        quotation: {
          id: data.id,
          quotationNumber: data.quotation_number,
          type: data.type,
          year: data.year,
          sequenceNumber: data.sequence_number,
          customerData: this.extractCustomerData(data),
          items: JSON.parse(data.items),
          totals: {
            subtotal: parseFloat(data.subtotal),
            taxAmount: parseFloat(data.total_tax_amount),
            total: parseFloat(data.total_amount)
          },
          status: data.status,
          validUntil: data.valid_until,
          notes: data.notes,
          createdAt: data.created_at,
          updatedAt: data.updated_at
        }
      };

    } catch (error) {
      console.error('Error fetching quotation:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get quotations with pagination and filters
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Quotations list
   */
  async getQuotations(options = {}) {
    try {
      const {
        type,
        status,
        year,
        page = 1,
        limit = 10,
        sortBy = 'created_at',
        sortOrder = 'desc'
      } = options;

      let query = supabase
        .from('quotations')
        .select('*', { count: 'exact' });

      // Apply filters
      if (type) query = query.eq('type', type);
      if (status) query = query.eq('status', status);
      if (year) query = query.eq('year', year);

      // Apply sorting
      query = query.order(sortBy, { ascending: sortOrder === 'asc' });

      // Apply pagination
      const from = (page - 1) * limit;
      const to = from + limit - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) {
        throw new Error(`Failed to fetch quotations: ${error.message}`);
      }

      return {
        success: true,
        quotations: data.map(item => ({
          id: item.id,
          quotationNumber: item.quotation_number,
          type: item.type,
          year: item.year,
          sequenceNumber: item.sequence_number,
          customerData: this.extractCustomerData(item),
          totalAmount: parseFloat(item.total_amount),
          status: item.status,
          validUntil: item.valid_until,
          createdAt: item.created_at,
          updatedAt: item.updated_at
        })),
        pagination: {
          page,
          limit,
          total: count,
          totalPages: Math.ceil(count / limit)
        }
      };

    } catch (error) {
      console.error('Error fetching quotations:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Update quotation status
   * @param {string} quotationId - The quotation ID
   * @param {string} status - New status
   * @returns {Promise<Object>} Updated quotation
   */
  async updateQuotationStatus(quotationId, status) {
    try {
      const validStatuses = ['DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED'];
      if (!validStatuses.includes(status)) {
        throw new Error('Invalid status');
      }

      const { data, error } = await supabase
        .from('quotations')
        .update({ status })
        .eq('id', quotationId)
        .select('*')
        .single();

      if (error) {
        throw new Error(`Failed to update quotation: ${error.message}`);
      }

      return {
        success: true,
        quotation: data
      };

    } catch (error) {
      console.error('Error updating quotation:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get quotation counters for current year
   * @returns {Promise<Object>} Counter data
   */
  async getCounters() {
    try {
      const currentYear = new Date().getFullYear();
      
      const { data, error } = await supabase
        .from('quotation_counters')
        .select('*')
        .eq('year', currentYear);

      if (error) {
        throw new Error(`Failed to fetch counters: ${error.message}`);
      }

      return {
        success: true,
        counters: data || []
      };

    } catch (error) {
      console.error('Error fetching counters:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Extract customer data from database record
   * @private
   */
  extractCustomerData(record) {
    if (record.type === 'CUST') {
      return {
        name: record.customer_name,
        email: record.customer_email,
        phone: record.customer_phone,
        address: record.customer_address
      };
    } else {
      return {
        companyName: record.company_name,
        gst: record.company_gst,
        address: record.company_address,
        email: record.customer_email,
        phone: record.customer_phone
      };
    }
  }
}

module.exports = new QuotationService();
