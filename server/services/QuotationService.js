const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

class QuotationService {
  /**
   * Generate quotation number using improved atomic database function
   */
  async generateQuotationNumber(type) {
    const currentYear = new Date().getFullYear();
    const maxRetries = 5;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔢 Generating quotation number (attempt ${attempt}/${maxRetries})`);
        
        // Try to use database function, fallback to manual generation
        let { data, error } = await supabase
          .rpc('get_next_quotation_number', {
            quotation_type: type,
            current_year: currentYear
          });

        // If database function fails, generate manually
        if (error) {
          console.log('Database function not available, generating manually');
          
          // Get highest sequence number
          const { data: maxData, error: queryError } = await supabase
            .from('quotations')
            .select('sequence_number')
            .eq('type', type)
            .eq('year', currentYear)
            .order('sequence_number', { ascending: false })
            .limit(1);
          
          if (queryError) {
            console.error('❌ Database query error:', queryError);
            throw queryError;
          }
          
          const nextSequence = (maxData && maxData[0] ? maxData[0].sequence_number : 0) + 1;
          data = `ST/${type}/${currentYear}/${String(nextSequence).padStart(2, '0')}`;
          error = null; // Clear the error since we handled it
        }

        const quotationNumber = data;
        // Extract sequence number from the quotation number (ST/CUST/2025/01 -> 01)
        const sequenceNumber = parseInt(quotationNumber.split('/').pop());
        
        console.log(`✅ Generated quotation number: ${quotationNumber}`);
        return { quotationNumber, sequenceNumber, year: currentYear };

      } catch (error) {
        console.error(`❌ Attempt ${attempt} failed:`, error.message);
        
        if (attempt === maxRetries) {
          // Enhanced fallback with better uniqueness
          const timestamp = Date.now();
          const randomSuffix = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
          const fallbackNumber = `ST/${type}/${currentYear}/FB${timestamp.toString().slice(-3)}${randomSuffix.slice(-2)}`;
          console.log(`🔄 Using fallback number: ${fallbackNumber}`);
          
          return { 
            quotationNumber: fallbackNumber, 
            sequenceNumber: parseInt(timestamp.toString().slice(-3)), 
            year: currentYear 
          };
        }
        
        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 100));
      }
    }
  }

  /**
   * Create a new quotation with retry mechanism
   */
  async createQuotation(quotationData) {
    const maxRetries = 3;
    let attempt = 0;

    while (attempt < maxRetries) {
      try {
        console.log(`📝 Creating quotation (attempt ${attempt + 1}/${maxRetries})`);
        
        // Generate quotation number
        const { quotationNumber, sequenceNumber, year } = await this.generateQuotationNumber(quotationData.type);
        
        // Prepare quotation data
        const quotation = {
          quotation_number: quotationNumber,
          type: quotationData.type,
          year: year,
          sequence_number: sequenceNumber,
          
          // Customer data
          customer_name: quotationData.customerData?.name || null,
          customer_email: quotationData.customerData?.email || null,
          customer_phone: quotationData.customerData?.phone || null,
          customer_address: quotationData.customerData?.address || null,
          
          // Company data (for vendors)
          company_name: quotationData.customerData?.companyName || null,
          company_gst: quotationData.customerData?.gst || null,
          company_address: quotationData.customerData?.address || null,
          
          // Items and totals
          items: JSON.stringify(quotationData.items || []),
          items_count: quotationData.items?.length || 0,
          subtotal: quotationData.totals?.subtotal || 0,
          total_tax_amount: quotationData.totals?.taxAmount || 0,
          total_amount: quotationData.totals?.total || 0,
          
          // Additional fields
          notes: quotationData.notes || '',
          status: 'DRAFT',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        // Insert quotation
        const { data, error } = await supabase
          .from('quotations')
          .insert([quotation])
          .select()
          .single();

        if (error) {
          // Check if it's a duplicate key error
          if (error.code === '23505' && error.message.includes('quotations_quotation_number_key')) {
            console.log(`🔄 Duplicate quotation number detected: ${quotationNumber}, retrying...`);
            attempt++;
            continue;
          }
          throw error;
        }

        console.log(`✅ Quotation created successfully: ${quotationNumber}`);
        
        return {
          success: true,
          quotation: {
            id: data.id,
            quotationNumber: data.quotation_number,
            type: data.type,
            year: data.year,
            sequenceNumber: data.sequence_number,
            customerData: {
              name: data.customer_name,
              email: data.customer_email,
              phone: data.customer_phone,
              address: data.customer_address,
              companyName: data.company_name,
              gst: data.company_gst
            },
            items: JSON.parse(data.items || '[]'),
            totals: {
              subtotal: data.subtotal,
              taxAmount: data.total_tax_amount,
              total: data.total_amount
            },
            notes: data.notes,
            status: data.status,
            createdAt: data.created_at
          }
        };

      } catch (error) {
        console.error(`❌ Attempt ${attempt + 1} failed:`, error.message);
        
        if (attempt >= maxRetries - 1) {
          console.error('Error creating quotation after all retries:', error);
          return {
            success: false,
            error: error.message
          };
        }
        attempt++;
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
  }

  /**
   * Get quotation by ID
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
          customerData: {
            name: data.customer_name,
            email: data.customer_email,
            phone: data.customer_phone,
            address: data.customer_address,
            companyName: data.company_name,
            gst: data.company_gst
          },
          items: JSON.parse(data.items || '[]'),
          totals: {
            subtotal: data.subtotal,
            taxAmount: data.total_tax_amount,
            total: data.total_amount
          },
          notes: data.notes,
          status: data.status,
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
   * Get all quotations with optional filters
   */
  async getQuotations(filters = {}) {
    try {
      let query = supabase
        .from('quotations')
        .select('*')
        .order('created_at', { ascending: false });

      // Apply filters
      if (filters.type) {
        query = query.eq('type', filters.type);
      }
      if (filters.status) {
        query = query.eq('status', filters.status);
      }
      if (filters.year) {
        query = query.eq('year', filters.year);
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(`Failed to fetch quotations: ${error.message}`);
      }

      const quotations = data.map(item => ({
        id: item.id,
        quotationNumber: item.quotation_number,
        type: item.type,
        year: item.year,
        sequenceNumber: item.sequence_number,
        customerData: {
          name: item.customer_name,
          email: item.customer_email,
          phone: item.customer_phone,
          address: item.customer_address,
          companyName: item.company_name,
          gst: item.company_gst
        },
        items: JSON.parse(item.items || '[]'),
        totals: {
          subtotal: item.subtotal,
          taxAmount: item.total_tax_amount,
          total: item.total_amount
        },
        notes: item.notes,
        status: item.status,
        createdAt: item.created_at,
        updatedAt: item.updated_at
      }));

      return {
        success: true,
        quotations,
        count: quotations.length
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
   */
  async updateQuotationStatus(quotationId, status) {
    try {
      const { data, error } = await supabase
        .from('quotations')
        .update({ 
          status: status,
          updated_at: new Date().toISOString()
        })
        .eq('id', quotationId)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update quotation: ${error.message}`);
      }

      return {
        success: true,
        quotation: data
      };

    } catch (error) {
      console.error('Error updating quotation status:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get current counters for debugging
   */
  async getCurrentCounters() {
    try {
      const { data, error } = await supabase
        .from('quotation_counters')
        .select('*')
        .order('year', { ascending: false })
        .order('type');

      if (error) {
        throw new Error(`Failed to fetch counters: ${error.message}`);
      }

      return {
        success: true,
        counters: data
      };

    } catch (error) {
      console.error('Error fetching counters:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = new QuotationService();
