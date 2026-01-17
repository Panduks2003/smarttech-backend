const fetch = require('node-fetch');

// Real GST validation using working APIs
async function validateRealWorkingGST(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

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

    console.log(`Validating GST: ${gstNumber}`);

    // Method 1: Try GSTINCheck.co.in API (Free with API key)
    try {
      // Note: You need to get a free API key from https://gstincheck.co.in/
      const apiKey = process.env.GSTINCHECK_API_KEY || 'demo'; // Add your API key to .env
      
      if (apiKey !== 'demo') {
        const response = await fetch(`https://sheet.gstincheck.co.in/check/${apiKey}/${gstNumber}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          }
        });

        if (response.ok) {
          const data = await response.json();
          console.log('GSTINCheck API Response:', data);
          
          if (data.flag && data.gstin) {
            return res.status(200).json({
              success: true,
              verified: true,
              apiUsed: 'gstincheck',
              data: {
                gstin: data.gstin,
                legalName: data.lgnm || data.legal_name || 'N/A',
                tradeName: data.tradeNam || data.trade_name || data.lgnm || 'N/A',
                registrationDate: data.rgdt || data.registration_date || 'N/A',
                status: data.sts || data.status || 'Active',
                taxpayerType: data.ctb || data.taxpayer_type || 'Regular',
                address: {
                  building: data.pradr?.addr?.bno || '',
                  buildingName: data.pradr?.addr?.bnm || '',
                  street: data.pradr?.addr?.st || '',
                  location: data.pradr?.addr?.loc || '',
                  city: data.pradr?.addr?.city || '',
                  district: data.pradr?.addr?.dst || '',
                  state: data.pradr?.addr?.stcd || data.pradr?.addr?.state || '',
                  pincode: data.pradr?.addr?.pncd || data.pradr?.addr?.pincode || ''
                }
              }
            });
          }
        }
      }
    } catch (error) {
      console.log('GSTINCheck API failed:', error.message);
    }

    // Method 2: Try official GST portal scraping (public endpoint)
    try {
      const response = await fetch('https://services.gst.gov.in/services/api/search/taxpayerDetails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        body: JSON.stringify({
          gstin: gstNumber
        })
      });

      if (response.ok) {
        const data = await response.json();
        console.log('GST Portal API Response:', data);
        
        if (data.flag && data.taxpayerInfo) {
          const info = data.taxpayerInfo;
          return res.status(200).json({
            success: true,
            verified: true,
            apiUsed: 'gst-portal',
            data: {
              gstin: info.gstin,
              legalName: info.lgnm,
              tradeName: info.tradeNam || info.lgnm,
              registrationDate: info.rgdt,
              status: info.sts,
              taxpayerType: info.ctb,
              address: {
                building: info.pradr?.addr?.bno || '',
                buildingName: info.pradr?.addr?.bnm || '',
                street: info.pradr?.addr?.st || '',
                location: info.pradr?.addr?.loc || '',
                city: info.pradr?.addr?.city || '',
                district: info.pradr?.addr?.dst || '',
                state: info.pradr?.addr?.stcd || '',
                pincode: info.pradr?.addr?.pncd || ''
              }
            }
          });
        }
      }
    } catch (error) {
      console.log('GST Portal API failed:', error.message);
    }

    // Method 3: Try alternative GST API
    try {
      const response = await fetch(`https://appyflow.in/api/verifyGST?gstNo=${gstNumber}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('AppyFlow API Response:', data);
        
        if (data.status === 'Active' && data.gstin) {
          return res.status(200).json({
            success: true,
            verified: true,
            apiUsed: 'appyflow',
            data: {
              gstin: data.gstin,
              legalName: data.legalName || data.lgnm,
              tradeName: data.tradeName || data.tradeNam || data.legalName,
              registrationDate: data.registrationDate || data.rgdt,
              status: data.status,
              taxpayerType: data.taxpayerType || data.ctb || 'Regular',
              address: {
                building: data.address?.building || '',
                buildingName: data.address?.buildingName || '',
                street: data.address?.street || '',
                location: data.address?.location || '',
                city: data.address?.city || '',
                district: data.address?.district || '',
                state: data.address?.state || '',
                pincode: data.address?.pincode || ''
              }
            }
          });
        }
      }
    } catch (error) {
      console.log('AppyFlow API failed:', error.message);
    }

    // Method 4: Try MasterGST API
    try {
      const response = await fetch(`https://mastergst.com/api/public/gstin/${gstNumber}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('MasterGST API Response:', data);
        
        if (data.success && data.data) {
          const gstInfo = data.data;
          return res.status(200).json({
            success: true,
            verified: true,
            apiUsed: 'mastergst',
            data: {
              gstin: gstInfo.gstin,
              legalName: gstInfo.legalName,
              tradeName: gstInfo.tradeName || gstInfo.legalName,
              registrationDate: gstInfo.registrationDate,
              status: gstInfo.status,
              taxpayerType: gstInfo.taxpayerType,
              address: {
                building: gstInfo.address?.building || '',
                buildingName: gstInfo.address?.buildingName || '',
                street: gstInfo.address?.street || '',
                location: gstInfo.address?.location || '',
                city: gstInfo.address?.city || '',
                district: gstInfo.address?.district || '',
                state: gstInfo.address?.state || '',
                pincode: gstInfo.address?.pincode || ''
              }
            }
          });
        }
      }
    } catch (error) {
      console.log('MasterGST API failed:', error.message);
    }

    // If all real APIs fail, return error (no mock data)
    return res.status(404).json({
      success: false,
      verified: false,
      message: 'Unable to fetch real GST data. All external GST APIs are currently unavailable.',
      note: 'Please ensure the GST number is correct and try again later. You may also need to set up API keys for better reliability.',
      suggestion: 'To get a free API key for better results, visit: https://gstincheck.co.in/ and add GSTINCHECK_API_KEY to your .env file'
    });

  } catch (error) {
    console.error('GST validation error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to validate GST number',
      error: error.message
    });
  }
}

module.exports = validateRealWorkingGST;
