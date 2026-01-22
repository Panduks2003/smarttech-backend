const nodemailer = require('nodemailer');

// Email configuration for Hostinger
console.log('Email Configuration:');
console.log('Host:', process.env.EMAIL_HOST || 'smtp.hostinger.com');
console.log('Port:', process.env.EMAIL_PORT || 587);
console.log('User:', process.env.EMAIL_USER ? '***configured***' : 'NOT SET');
console.log('Pass:', process.env.EMAIL_PASS ? '***configured***' : 'NOT SET');

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.hostinger.com',
  port: process.env.EMAIL_PORT || 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER, // your Hostinger email
    pass: process.env.EMAIL_PASS  // your Hostinger email password
  },
  tls: {
    rejectUnauthorized: false // Accept self-signed certificates
  }
});

// API endpoint to send emails
async function sendEmail(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { name, email, phone, message, to, subject, submitted_date, pdfData, pdfFileName } = req.body;
    
    // Log payload size for debugging
    const payloadSize = JSON.stringify(req.body).length;
    console.log('Received email request with payload size:', payloadSize, 'characters');
    if (pdfData) {
      console.log('PDF data size:', pdfData.length, 'characters');
    }

    // Validate required fields
    if (!name || !email || !message) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Email content
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #4B2E83;">New Query from Smart Technologies Website</h2>
        
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #0F4C3A; margin-top: 0;">Contact Information</h3>
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Phone:</strong> ${phone || 'Not provided'}</p>
          <p><strong>Submitted:</strong> ${submitted_date}</p>
        </div>

        <div style="background: #ffffff; padding: 20px; border: 1px solid #e9ecef; border-radius: 8px;">
          <h3 style="color: #0F4C3A; margin-top: 0;">Message</h3>
          <p style="line-height: 1.6;">${message}</p>
        </div>

        <div style="margin-top: 20px; padding: 15px; background: #e8f4f8; border-radius: 8px;">
          <p style="margin: 0; font-size: 14px; color: #666;">
            This email was sent from the Smart Technologies website contact form.
          </p>
        </div>
      </div>
    `;

    // Email options - Send to specified recipient or company email
    const recipientEmail = to || 'enquiry@smarttechay.com'; // Use 'to' field if provided, otherwise company email
    const mailOptions = {
      from: `"Smart Technologies" <${process.env.EMAIL_USER}>`,
      to: recipientEmail,
      subject: subject || `New Query from ${name}`,
      html: htmlContent,
      replyTo: 'enquiry@smarttechay.com' // Always reply to company email
    };

    // Add PDF attachment if provided
    if (pdfData && pdfFileName) {
      mailOptions.attachments = [{
        filename: pdfFileName,
        content: Buffer.from(pdfData, 'base64'),
        contentType: 'application/pdf'
      }];
    }

    // Send email
    console.log('📧 Attempting to send email to:', recipientEmail);
    console.log('📧 Email subject:', mailOptions.subject);
    console.log('📧 From:', mailOptions.from);
    console.log('📧 Has PDF attachment:', !!pdfData);
    
    const result = await transporter.sendMail(mailOptions);
    
    console.log('✅ Email sent successfully!');
    console.log('📧 Message ID:', result.messageId);
    console.log('📧 Response:', result.response);

    res.status(200).json({ 
      success: true, 
      message: 'Email sent successfully',
      messageId: result.messageId,
      recipient: recipientEmail
    });

  } catch (error) {
    console.error('Email sending error:', error);
    
    // Check if it's a payload size error
    if (error.code === 'LIMIT_FILE_SIZE' || error.message.includes('payload')) {
      return res.status(413).json({ 
        success: false, 
        message: 'Email attachment too large. Please try again.',
        error: 'Payload too large' 
      });
    }
    
    res.status(500).json({ 
      success: false, 
      message: 'Failed to send email',
      error: error.message 
    });
  }
}

module.exports = sendEmail;
