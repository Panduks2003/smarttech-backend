import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables at module level
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

// Email configuration for Hostinger
console.log('Email Configuration:');
console.log('Host:', process.env.EMAIL_HOST || 'smtp.hostinger.com');
console.log('Port:', process.env.EMAIL_PORT || 587);
console.log('User:', process.env.EMAIL_USER ? '***configured***' : 'NOT SET');
console.log('Pass:', process.env.EMAIL_PASS ? '***configured***' : 'NOT SET');

// Validate required email configuration
if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
  console.error('❌ Error: Email configuration is incomplete. Please check your .env file.');
  console.error('EMAIL_USER:', process.env.EMAIL_USER ? 'Set' : 'Missing');
  console.error('EMAIL_PASS:', process.env.EMAIL_PASS ? 'Set' : 'Missing');
}

let enquiryTransporter;
let infoTransporter;

try {
  // Create transporter for enquiries@smarttechay.com with optimized settings
  enquiryTransporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.hostinger.com',
    port: parseInt(process.env.EMAIL_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    },
    tls: {
      rejectUnauthorized: false
    },
    connectionTimeout: 5000,  // 5 seconds
    greetingTimeout: 3000,    // 3 seconds  
    socketTimeout: 5000,      // 5 seconds
    pool: true,               // Enable connection pooling
    maxConnections: 5,        // Max concurrent connections
    maxMessages: 100          // Max messages per connection
  });

  // Create transporter for info@smarttechay.com with optimized settings
  infoTransporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.hostinger.com',
    port: parseInt(process.env.EMAIL_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER_2,
      pass: process.env.EMAIL_PASS_2
    },
    tls: {
      rejectUnauthorized: false
    },
    connectionTimeout: 5000,  // 5 seconds
    greetingTimeout: 3000,    // 3 seconds
    socketTimeout: 5000,      // 5 seconds
    pool: true,               // Enable connection pooling
    maxConnections: 5,        // Max concurrent connections
    maxMessages: 100          // Max messages per connection
  });
  
  console.log('✅ Email transporters created successfully');
  
} catch (error) {
  console.error('❌ Failed to create email transporter:', error);
  throw error;
}

// API endpoint to send emails
async function sendEmail(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { name, email, phone, message, to, subject, submitted_date, pdfData, pdfFileName } = req.body;
    
    // Validate required fields
    if (!name || !email || !message) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Email content - plain text for maximum speed
    const textContent = `
Book a Demo Request - Smart Technologies

Name: ${name}
Email: ${email}
Phone: ${phone || 'Not provided'}
Submitted: ${submitted_date}

Message:
${message}
`;

    // Simple HTML for basic formatting
    const htmlContent = `
<html>
<body>
  <h2>Book a Demo Request - Smart Technologies</h2>
  <p><strong>Name:</strong> ${name}</p>
  <p><strong>Email:</strong> ${email}</p>
  <p><strong>Phone:</strong> ${phone || 'Not provided'}</p>
  <p><strong>Submitted:</strong> ${submitted_date}</p>
  <h3>Message:</h3>
  <p>${message}</p>
</body>
</html>
`;

    // Email options - Send to specified recipient or company email
    const recipientEmail = to || 'enquiry@smarttechay.com'; // Use 'to' field if provided, otherwise company email
    
    // Determine which transporter to use based on recipient
    const transporter = recipientEmail.includes('info@') ? infoTransporter : enquiryTransporter;
    const emailType = recipientEmail.includes('info@') ? 'INFO' : 'ENQUIRY';
    
    const mailOptions = {
      from: recipientEmail.includes('info@') ? `"Smart Technologies" <${process.env.EMAIL_USER_2}>` : `"Smart Technologies" <${process.env.EMAIL_USER}>`,
      to: recipientEmail,
      subject: subject || `New Query from ${name}`,
      text: textContent,
      html: htmlContent,
      replyTo: recipientEmail // Reply to the same email account that sent it
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
    console.log(`📧 Sending ${emailType} email to: ${recipientEmail}`);
    
    try {
      const result = await transporter.sendMail(mailOptions);
      console.log('✅ Email sent successfully!');
      return res.status(200).json({ 
        success: true, 
        message: 'Email sent successfully',
        messageId: result.messageId
      });
    } catch (error) {
      console.error('❌ Error sending email:', error.message);
      
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to send email',
        error: {
          code: error.code,
          message: error.message,
          response: error.response
        }
      });
    }
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

export default sendEmail;
