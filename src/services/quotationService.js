import { supabase } from '../config/supabase.js';

class QuotationService {
  constructor() {
    // In-memory counters for fallback
    this.counters = {
      CUST: {},
      VEND: {}
    };
  }

  // Generate quotation number using Supabase for persistence
  async generateQuotationNumber(type) {
    const year = new Date().getFullYear();
    const typeKey = type; // CUST or VEND

    try {
      // 1. Try to get user/vendor count from persistent storage (Supabase)
      // We assume a table 'quotation_counters' with columns: year (int), type (text), count (int)
      // PK is (year, type)

      let { data: counterRecord, error: fetchError } = await supabase
        .from('quotation_counters')
        .select('count')
        .eq('year', year)
        .eq('type', typeKey)
        .single();

      let currentCount = 0;

      if (fetchError && fetchError.code === 'PGRST116') {
        // Row doesn't exist yet, insert it starting at 0
        const { error: insertError } = await supabase
          .from('quotation_counters')
          .insert([{ year: year, type: typeKey, count: 0 }]);

        if (insertError) throw insertError;
        currentCount = 0;
      } else if (fetchError) {
        throw fetchError;
      } else {
        currentCount = counterRecord.count;
      }

      // Increment count
      const newCount = currentCount + 1;

      // Update in DB
      const { error: updateError } = await supabase
        .from('quotation_counters')
        .update({ count: newCount })
        .eq('year', year)
        .eq('type', typeKey);

      if (updateError) throw updateError;

      // Format: ST/CUST/2026/001
      return {
        quotationNumber: `ST/${type}/${year}/${String(newCount).padStart(3, '0')}`,
        sequenceNumber: newCount
      };

    } catch (error) {
      console.error('Supabase counter error, falling back to in-memory:', error.message);

      // Fallback: In-memory generation (reset on server restart)
      if (!this.counters[type][year]) {
        this.counters[type][year] = 0;
      }
      this.counters[type][year]++;
      return {
        quotationNumber: `ST/${type}/${year}/${String(this.counters[type][year]).padStart(3, '0')}-LOCAL`,
        sequenceNumber: this.counters[type][year]
      };
    }
  }

  async createQuotation(quotationData) {
    try {
      const { type, customerData, items, totals, notes, validUntil } = quotationData;

      if (!type || !['CUST', 'VEND'].includes(type)) {
        throw new Error('Invalid quotation type. Must be CUST or VEND');
      }

      if (!items || !Array.isArray(items) || items.length === 0) {
        throw new Error('Items are required');
      }

      if (!totals || typeof totals.total !== 'number') {
        throw new Error('Total amount is required');
      }

      // 1. Generate Quotation Number
      const { quotationNumber, sequenceNumber } = await this.generateQuotationNumber(type);

      // 2. Prepare database record
      const currentYear = new Date().getFullYear();
      const newQuotation = {
        quotation_number: quotationNumber,
        sequence_number: sequenceNumber, // Added sequence_number
        type,
        year: currentYear,
        customer_name: type === 'CUST' ? customerData.name : customerData.companyName,
        customer_email: customerData.email,
        customer_phone: customerData.phone,
        customer_address: customerData.address || customerData.shippingAddress || '', // Use shipping address if available
        vendor_gst: type === 'VEND' ? customerData.gst : null,
        items: JSON.stringify(items), // Storing items as JSON for now
        items_count: items.length,
        subtotal: totals.subtotal,
        total_tax_amount: totals.taxAmount,
        total_amount: totals.total,
        notes: notes,
        valid_until: validUntil,
        status: 'DRAFT', // Initial status
        created_at: new Date().toISOString()
      };

      // 3. Save to Supabase
      const { data, error } = await supabase
        .from('quotations')
        .insert([newQuotation])
        .select()
        .single();

      if (error) {
        throw new Error(`Database insert failed: ${error.message}`);
      }

      console.log('✅ Quotation created in Supabase:', data);

      return {
        success: true,
        quotation: data,
        message: 'Quotation created successfully'
      };

    } catch (error) {
      console.error('❌ Error creating quotation:', error);

      // Fallback: Return error so user knows persistence failed
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Retrieve a quotation by ID (UUID or Quotation Number)
  async getQuotation(id) {
    try {
      // Check if id look like a UUID or a quotation number
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-z]{4}-[0-9a-z]{4}-[0-9a-z]{12}$/i.test(id);

      let query = supabase.from('quotations').select('*');

      if (isUUID) {
        query = query.eq('id', id);
      } else {
        query = query.eq('quotation_number', id);
      }

      const { data, error } = await query.single();

      if (error) throw error;

      return {
        success: true,
        quotation: data
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async getQuotations(filters = {}) {
    try {
      let query = supabase.from('quotations').select('*', { count: 'exact' });

      if (filters.type) {
        query = query.eq('type', filters.type);
      }
      if (filters.status) {
        query = query.eq('status', filters.status);
      }

      // Pagination
      const page = filters.page || 1;
      const limit = filters.limit || 10;
      const from = (page - 1) * limit;
      const to = from + limit - 1;

      query = query.range(from, to).order('created_at', { ascending: false });

      const { data, error, count } = await query;

      if (error) throw error;

      return {
        success: true,
        quotations: data,
        total: count,
        page,
        limit
      };

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}

export default new QuotationService();
