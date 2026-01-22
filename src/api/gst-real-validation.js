// Real GST validation using a working API service
async function validateRealGST(req, res) {
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

    // Try the GST API that actually works
    try {
      // Using a Python-based GST API service
      const response = await fetch('https://gst-return-status.p.rapidapi.com/free/gstin_info', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-RapidAPI-Key': process.env.RAPIDAPI_KEY || 'demo',
          'X-RapidAPI-Host': 'gst-return-status.p.rapidapi.com'
        },
        body: JSON.stringify({
          gstin: gstNumber
        })
      });

      if (response.ok) {
        const data = await response.json();
        console.log('GST API Response:', data);
        
        if (data.status_cd === 'Success' && data.data) {
          const gstInfo = data.data;
          return res.status(200).json({
            success: true,
            verified: true,
            apiUsed: 'rapidapi-real',
            data: {
              gstin: gstInfo.gstin,
              legalName: gstInfo.lgnm,
              tradeName: gstInfo.tradeNam || gstInfo.lgnm,
              registrationDate: gstInfo.rgdt,
              status: gstInfo.sts,
              taxpayerType: gstInfo.ctb,
              address: {
                building: gstInfo.pradr?.addr?.bno || '',
                buildingName: gstInfo.pradr?.addr?.bnm || '',
                street: gstInfo.pradr?.addr?.st || '',
                location: gstInfo.pradr?.addr?.loc || '',
                city: gstInfo.pradr?.addr?.city || '',
                district: gstInfo.pradr?.addr?.dst || '',
                state: gstInfo.pradr?.addr?.stcd || '',
                pincode: gstInfo.pradr?.addr?.pncd || ''
              }
            }
          });
        }
      }
    } catch (error) {
      console.log('RapidAPI failed:', error.message);
    }

    // Try alternative free GST API
    try {
      const response2 = await fetch(`https://api.mastergst.com/public/search?gstin=${gstNumber}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (response2.ok) {
        const data2 = await response2.json();
        console.log('MasterGST API Response:', data2);
        
        if (data2.status === 'success' && data2.data) {
          const gstInfo = data2.data;
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

    // If all APIs fail, return error instead of mock data
    return res.status(404).json({
      success: false,
      verified: false,
      message: 'Unable to fetch real GST data. External GST APIs are currently unavailable. Please try again later or contact support.',
      note: 'This system requires real GST data from government APIs which may have limited availability.'
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

export default validateRealGST;
