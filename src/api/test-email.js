import nodemailer from 'nodemailer';

// Simple test email function
async function testEmail(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    console.log('🧪 Testing email configuration...');
    
    // Create transporter
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || 'smtp.hostinger.com',
      port: process.env.EMAIL_PORT || 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      },
      tls: {
        rejectUnauthorized: false
      }
    });

    // Test connection
    await transporter.verify();
    console.log('✅ SMTP connection verified successfully');

    // Send simple test email
    const testMailOptions = {
      from: `"Smart Technologies Test" <${process.env.EMAIL_USER}>`,
      to: 'enquiry@smarttechay.com',
      subject: '🧪 Test Email - Smart Technologies Quotation System',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #4B2E83;">🧪 Test Email</h2>
          <p>This is a test email from the Smart Technologies Quotation System.</p>
          <p><strong>Time:</strong> ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</p>
          <p><strong>Status:</strong> Email service is working correctly!</p>
          <div style="background: #f0f8ff; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0; color: #0066cc;">
              If you receive this email, the quotation email system is configured properly.
            </p>
          </div>
        </div>
      `
    };

    const result = await transporter.sendMail(testMailOptions);
    
    console.log('✅ Test email sent successfully!');
    console.log('📧 Message ID:', result.messageId);
    console.log('📧 Response:', result.response);

    res.status(200).json({
      success: true,
      message: 'Test email sent successfully',
      messageId: result.messageId,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Test email failed:', error);
    res.status(500).json({
      success: false,
      message: 'Test email failed',
      error: error.message
    });
  }
}

export default testEmail;
