const express = require('express');
const router = express.Router();

/**
 * POST /api/validate-gst
 * Validate GST number using configured API key
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

    // Use GST API from gstincheck.co.in with your API key
    try {
      const fetch = require('node-fetch');
      
      // Use your gstincheck.co.in API
      const response = await fetch(`https://sheet.gstincheck.co.in/check/${process.env.GST_API_KEY}/${gstNumber}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('GST API Response:', data);
        
        if (data.flag === 1 && data.data) {
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
              pincode: gstData.pradr?.addr?.pncd || ''
            }
          };

          return res.status(200).json({
            success: true,
            verified: true,
            apiUsed: 'gstincheck',
            data: formattedData
          });
        } else if (data.flag === 0) {
          // GST number not found or invalid
          return res.status(400).json({
            success: false,
            verified: false,
            message: data.message || 'GST number not found or invalid',
            apiUsed: 'gstincheck'
          });
        }
      } else {
        console.error('GST API HTTP error:', response.status, response.statusText);
      }
    } catch (apiError) {
      console.error('GST API error:', apiError.message);
    }

    // Fallback to demo data if API fails
    const fallbackData = {
      gstin: gstNumber,
      legalName: 'GST VALIDATION UNAVAILABLE',
      tradeName: 'API ERROR',
      registrationDate: '01/01/2020',
      status: 'Unknown',
      taxpayerType: 'Regular',
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
      message: 'GST format valid but API verification failed'
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
