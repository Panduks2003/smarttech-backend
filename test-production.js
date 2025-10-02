#!/usr/bin/env node

// Smart Technologies - Production Environment Tester
const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:5001';
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testEndpoint(name, url, options = {}) {
  try {
    log('blue', `\n🧪 Testing: ${name}`);
    console.log(`   URL: ${url}`);
    
    const response = await fetch(url, options);
    const data = await response.json();
    
    if (response.ok) {
      log('green', `   ✅ SUCCESS (${response.status})`);
      if (name === 'Health Check') {
        console.log(`   Environment: ${data.environment}`);
        console.log(`   GST API: ${data.config?.gstApi ? 'Enabled' : 'Disabled'}`);
        console.log(`   Supabase: ${data.config?.supabase ? 'Connected' : 'Disconnected'}`);
      } else if (name === 'Products API') {
        console.log(`   Products Count: ${data.count || 0}`);
      } else if (name.includes('Quotation')) {
        console.log(`   Quotation Number: ${data.quotation?.quotationNumber || 'N/A'}`);
      } else if (name === 'GST Validation') {
        console.log(`   Verified: ${data.verified ? 'Yes' : 'No'}`);
        console.log(`   API Used: ${data.apiUsed || 'N/A'}`);
      }
      return { success: true, data };
    } else {
      log('red', `   ❌ FAILED (${response.status})`);
      console.log(`   Error: ${data.error || data.message || 'Unknown error'}`);
      return { success: false, error: data };
    }
  } catch (error) {
    log('red', `   ❌ ERROR: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function runTests() {
  log('blue', '🚀 Smart Technologies - Production Environment Tests');
  log('blue', '====================================================');
  
  const results = [];

  // Test 1: Health Check
  const health = await testEndpoint(
    'Health Check',
    `${BASE_URL}/api/health`
  );
  results.push(health);

  // Test 2: Products API
  const products = await testEndpoint(
    'Products API',
    `${BASE_URL}/api/products`
  );
  results.push(products);

  // Test 3: Create Customer Quotation
  const customerQuotation = await testEndpoint(
    'Customer Quotation Creation',
    `${BASE_URL}/api/quotations`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'CUST',
        customerData: {
          name: 'Test Customer Production',
          email: 'test@production.com',
          phone: '+91-9876543210',
          address: 'Production Test Address'
        },
        items: [{
          name: 'LED Bulb 9W',
          qty: 2,
          price: 150,
          priceWithTax: 177,
          hsn: '8539',
          tax: 18,
          units: 'PCS',
          description: 'Energy efficient LED bulb',
          type: 'Product'
        }],
        totals: {
          subtotal: 300,
          taxAmount: 54,
          total: 354
        },
        notes: 'Production environment test quotation'
      })
    }
  );
  results.push(customerQuotation);

  // Test 4: Create Vendor Quotation
  const vendorQuotation = await testEndpoint(
    'Vendor Quotation Creation',
    `${BASE_URL}/api/quotations`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'VEND',
        customerData: {
          companyName: 'Test Vendor Company',
          gst: '29AACCG0527D1Z0',
          address: 'Vendor Production Address',
          email: 'vendor@production.com',
          phone: '+91-9876543210'
        },
        items: [{
          name: 'Installation Service',
          qty: 1,
          price: 500,
          priceWithTax: 590,
          hsn: '9983',
          tax: 18,
          units: 'SRV',
          description: 'Professional installation service',
          type: 'Service'
        }],
        totals: {
          subtotal: 500,
          taxAmount: 90,
          total: 590
        },
        notes: 'Production environment vendor test'
      })
    }
  );
  results.push(vendorQuotation);

  // Test 5: GST Validation
  const gstValidation = await testEndpoint(
    'GST Validation',
    `${BASE_URL}/api/validate-gst`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        gstNumber: '29AACCG0527D1Z0'
      })
    }
  );
  results.push(gstValidation);

  // Test 6: Get Quotations List
  const quotationsList = await testEndpoint(
    'Quotations List',
    `${BASE_URL}/api/quotations`
  );
  results.push(quotationsList);

  // Summary
  log('blue', '\n📊 TEST SUMMARY');
  log('blue', '================');
  
  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  log('green', `✅ Passed: ${passed}`);
  if (failed > 0) {
    log('red', `❌ Failed: ${failed}`);
  }
  
  if (passed === results.length) {
    log('green', '\n🎉 ALL TESTS PASSED! Your production environment is ready!');
    log('green', '🚀 You can now deploy to Render with confidence.');
  } else {
    log('yellow', '\n⚠️  Some tests failed. Please check the errors above.');
  }

  // Check quotation numbers
  if (customerQuotation.success && vendorQuotation.success) {
    const custNum = customerQuotation.data.quotation?.quotationNumber;
    const vendNum = vendorQuotation.data.quotation?.quotationNumber;
    
    log('blue', '\n🔢 QUOTATION NUMBERING TEST:');
    console.log(`   Customer: ${custNum || 'N/A'}`);
    console.log(`   Vendor: ${vendNum || 'N/A'}`);
    
    if (custNum && vendNum && custNum !== vendNum) {
      log('green', '   ✅ Quotation numbers are unique and properly formatted!');
    } else {
      log('red', '   ❌ Quotation numbering issue detected!');
    }
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { runTests, testEndpoint };
