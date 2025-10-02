const express = require('express');
const router = express.Router();

/**
 * POST /api/validate-gst
 * Validate GST number using configured API key with improved error handling
 */
router.post('/', async (req, res) => {
  try {
    const { gstNumber } = req.body;

    // Validate GST format
    const gstRegex = /^\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z\d]{1}[Z]{1}[A-Z\d]{1}$/;
    if (!gstRegex.test(gstNumber)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid GST number format' 
      });
    }

    // Check if GST API key is configured
    if (!process.env.GST_API_KEY) {
      console.log('GST API key not configured, using demo mode');
      const mockGstData = {
        gstin: gstNumber,
        legalName: 'DEMO TECHNOLOGIES PRIVATE LIMITED',
        tradeName: 'DEMO TECH',
        registrationDate: '01/07/2017',
        status: 'Active',
        taxpayerType: 'Regular',
        address: {
          building: 'Demo Building',
          buildingName: 'Tech Park',
          street: 'MG Road',
          location: 'Commercial Area',
          city: 'Bangalore',
          district: 'Bangalore Urban',
          state: 'Karnataka',
          pincode: '560001'
        }
      };

      return res.status(200).json({
        success: true,
        verified: true,
        apiUsed: 'demo',
        data: mockGstData
      });
    }

    console.log(`🔍 Validating GST: ${gstNumber} with API key: ${process.env.GST_API_KEY.substring(0, 8)}...`);

    // Try multiple GST API providers for better reliability
    const apiProviders = [
      {
        name: 'gstincheck',
        url: `https://sheet.gstincheck.co.in/check/${process.env.GST_API_KEY}/${gstNumber}`,
        method: 'GET'
      },
      {
        name: 'gstincheck-v2',
        url: `https://api.gstincheck.co.in/check/${process.env.GST_API_KEY}/${gstNumber}`,
        method: 'GET'
      }
    ];

    for (const provider of apiProviders) {
      try {
        console.log(`🌐 Trying ${provider.name}: ${provider.url}`);
        
        const fetch = require('node-fetch');
        const response = await fetch(provider.url, {
          method: provider.method,
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'Smart-Technologies-Backend/1.0'
          },
          timeout: 10000 // 10 second timeout
        });

        console.log(`📡 ${provider.name} Response Status: ${response.status}`);
        
        if (response.ok) {
          const data = await response.json();
          console.log(`📊 ${provider.name} Response Data:`, JSON.stringify(data, null, 2));
          
          // Check for successful response (handle both boolean and number flags)
          if ((data.flag === 1 || data.flag === true) && data.data) {
            const gstData = data.data;
            
            const formattedData = {
              gstin: gstData.gstin || gstNumber,
              legalName: gstData.lgnm || gstData.legal_name || 'N/A',
              tradeName: gstData.tradeNam || gstData.trade_name || gstData.lgnm || 'N/A',
              registrationDate: gstData.rgdt || gstData.registration_date || 'N/A',
              status: gstData.sts || gstData.status || 'Active',
              taxpayerType: gstData.ctb || gstData.taxpayer_type || 'Regular',
              address: {
                building: gstData.pradr?.addr?.bno || '',
                buildingName: gstData.pradr?.addr?.bnm || '',
                street: gstData.pradr?.addr?.st || '',
                location: gstData.pradr?.addr?.loc || '',
                city: gstData.pradr?.addr?.city || gstData.pradr?.addr?.dst || '',
                district: gstData.pradr?.addr?.dst || '',
                state: gstData.pradr?.addr?.stcd || '',
                pincode: gstData.pradr?.addr?.pncd || '',
                fullAddress: gstData.pradr?.adr || ''
              }
            };

            console.log(`✅ GST validation successful using ${provider.name}`);
            return res.status(200).json({
              success: true,
              verified: true,
              apiUsed: provider.name,
              data: formattedData
            });
          } else if (data.flag === 0 || data.flag === false) {
            console.log(`❌ GST not found using ${provider.name}: ${data.message}`);
            return res.status(400).json({
              success: false,
              verified: false,
              message: data.message || 'GST number not found or invalid',
              apiUsed: provider.name
            });
          } else {
            console.log(`⚠️ Unexpected response from ${provider.name}:`, data);
          }
        } else {
          const errorText = await response.text();
          console.error(`❌ ${provider.name} HTTP error:`, response.status, response.statusText, errorText);
        }
      } catch (apiError) {
        console.error(`❌ ${provider.name} API error:`, apiError.message);
        continue; // Try next provider
      }
    }

    // If all APIs fail, provide a more informative fallback
    console.log('⚠️ All GST API providers failed, using fallback');
    
    const fallbackData = {
      gstin: gstNumber,
      legalName: 'GST VALIDATION TEMPORARILY UNAVAILABLE',
      tradeName: 'Please verify manually',
      registrationDate: 'N/A',
      status: 'Format Valid',
      taxpayerType: 'Unknown',
      address: {
        building: '',
        buildingName: '',
        street: '',
        location: '',
        city: '',
        district: '',
        state: '',
        pincode: ''
      }
    };

    return res.status(200).json({
      success: true,
      verified: false,
      apiUsed: 'fallback',
      data: fallbackData,
      message: 'GST format valid but API verification temporarily unavailable. Please verify manually.'
    });

  } catch (error) {
    console.error('GST validation error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to validate GST number',
      error: error.message
    });
  }
});

module.exports = router;
