const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

class QuotationService {
  /**
   * Generate quotation number with simple fallback approach
   */
  async generateQuotationNumber(type) {
    const currentYear = new Date().getFullYear();
    const maxRetries = 5;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔢 Generating quotation number (attempt ${attempt}/${maxRetries})`);
        
        // Simple approach: Get highest sequence number and add 1
        const { data: maxData, error } = await supabase
          .from('quotations')
          .select('sequence_number')
          .eq('type', type)
          .eq('year', currentYear)
          .order('sequence_number', { ascending: false })
          .limit(1);
        
        if (error) {
          console.error('❌ Database query error:', error);
          // Use timestamp-based fallback if database fails
          const timestamp = Date.now().toString().slice(-4);
          const quotationNumber = `ST/${type}/${currentYear}/${timestamp}`;
          const sequenceNumber = parseInt(timestamp);
          console.log(`⚠️ Using timestamp fallback: ${quotationNumber}`);
          return { quotationNumber, sequenceNumber, year: currentYear };
        }
        
        const nextSequence = (maxData && maxData[0] ? maxData[0].sequence_number : 0) + 1;
        const quotationNumber = `ST/${type}/${currentYear}/${String(nextSequence).padStart(2, '0')}`;
        
        console.log(`✅ Generated quotation number: ${quotationNumber}`);
        return { quotationNumber, sequenceNumber: nextSequence, year: currentYear };

      } catch (error) {
        console.error(`❌ Attempt ${attempt} failed:`, error.message);
        
        if (attempt === maxRetries) {
          // Final fallback: use random number
          const randomNum = Math.floor(Math.random() * 9000) + 1000;
          const quotationNumber = `ST/${type}/${currentYear}/${randomNum}`;
          console.log(`🔄 Final fallback quotation number: ${quotationNumber}`);
          return { quotationNumber, sequenceNumber: randomNum, year: currentYear };
        }
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
  }

  /**
   * Create a new quotation
   */
  async createQuotation(quotationData) {
    try {
      console.log('📝 Creating new quotation...');
      
      // Generate quotation number
      const { quotationNumber, sequenceNumber, year } = await this.generateQuotationNumber(quotationData.type);
      
      // Prepare quotation data
      const quotation = {
        quotation_number: quotationNumber,
        type: quotationData.type,
        year: year,
        sequence_number: sequenceNumber,
        
        // Customer data (for CUST type)
        customer_name: quotationData.customerData?.name || null,
        customer_email: quotationData.customerData?.email || null,
        customer_phone: quotationData.customerData?.phone || null,
        customer_address: quotationData.customerData?.address || null,
        customer_gst: quotationData.customerData?.gst || null,
        
        // Vendor data (for VEND type)
        company_name: quotationData.vendorData?.companyName || null,
        vendor_contact_person: quotationData.vendorData?.contactPerson || null,
        vendor_email: quotationData.vendorData?.email || null,
        vendor_phone: quotationData.vendorData?.phone || null,
        vendor_address: quotationData.vendorData?.address || null,
        vendor_gst: quotationData.vendorData?.gst || null,
        
        // Items and totals
        items: JSON.stringify(quotationData.items || []),
        items_count: quotationData.items?.length || 0,
        subtotal: quotationData.totals?.subtotal || 0,
        total_tax_amount: quotationData.totals?.totalTax || 0,
        total_amount: quotationData.totals?.total || 0,
        
        // Additional fields
        status: 'DRAFT',
        notes: quotationData.notes || '',
        valid_until: quotationData.validUntil || null,
        
        // Timestamps
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      console.log('💾 Inserting quotation into database...');
      
      // Insert into database
      const { data, error } = await supabase
        .from('quotations')
        .insert([quotation])
        .select()
        .single();

      if (error) {
        console.error('❌ Database insertion error:', error);
        throw new Error(`Database error: ${error.message}`);
      }

      console.log('✅ Quotation created successfully:', quotationNumber);
      return {
        success: true,
        quotation: data,
        quotationNumber: quotationNumber
      };

    } catch (error) {
      console.error('❌ Error creating quotation:', error);
      throw error;
    }
  }

  /**
   * Get quotation by ID
   */
  async getQuotation(id) {
    try {
      const { data, error } = await supabase
        .from('quotations')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('❌ Error fetching quotation:', error);
      throw error;
    }
  }

  /**
   * Get all quotations with pagination
   */
  async getAllQuotations(page = 1, limit = 10, type = null) {
    try {
      let query = supabase
        .from('quotations')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false });

      if (type) {
        query = query.eq('type', type);
      }

      const offset = (page - 1) * limit;
      query = query.range(offset, offset + limit - 1);

      const { data, error, count } = await query;

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      return {
        quotations: data,
        total: count,
        page: page,
        limit: limit,
        totalPages: Math.ceil(count / limit)
      };
    } catch (error) {
      console.error('❌ Error fetching quotations:', error);
      throw error;
    }
  }
}

module.exports = new QuotationService();
