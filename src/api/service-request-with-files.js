import express from 'express';
import multer from 'multer';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load environment variables
dotenv.config();

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(process.cwd(), 'uploads', 'service-requests');
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Create unique filename with timestamp and original name
    const timestamp = Date.now();
    const originalName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, `${timestamp}_${originalName}`);
  }
});

// File filter to accept images and videos
const fileFilter = (req, file, cb) => {
  console.log('File received:', file.originalname, 'MIME type:', file.mimetype);
  
  // Accept all image and video MIME types
  if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
    console.log('File accepted:', file.originalname);
    return cb(null, true);
  } else {
    console.log('File rejected:', file.originalname, 'Type:', file.mimetype);
    cb(new Error(`File type not allowed: ${file.mimetype}. Only images and videos are accepted.`));
  }
};

// Configure multer
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit per file
    files: 5 // Maximum 5 files
  },
  fileFilter: fileFilter
});

// Email transporter setup (reusing from send-email.js)
let enquiryTransporter;

try {
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
    connectionTimeout: 5000,
    greetingTimeout: 3000,
    socketTimeout: 5000,
    pool: true,
    maxConnections: 5,
    maxMessages: 100
  });
  
  console.log('✅ Service Request Email transporter created successfully');
} catch (error) {
  console.error('❌ Failed to create service request email transporter:', error);
}

// Main endpoint handler
router.post('/', upload.array('files', 5), async (req, res) => {
  try {
    console.log('📝 Service request received');
    console.log('Form data:', req.body);
    console.log('Files uploaded:', req.files ? req.files.length : 0);
    
    if (req.files) {
      req.files.forEach((file, index) => {
        console.log(`File ${index + 1}:`, file.originalname, file.size, file.mimetype);
      });
    }
    
    const { name, email, phone, address, productType, issueDescription, urgency, to, email_subject, submitted_date } = req.body;
    const uploadedFiles = req.files || [];

    // Validate required fields
    if (!name || !email || !issueDescription) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Prepare file attachments
    const attachments = uploadedFiles.map(file => ({
      filename: file.originalname,
      path: file.path,
      contentType: file.mimetype
    }));

    // Create email content
    const textContent = `
Service Request - Smart Technologies

Customer Information:
Name: ${name}
Email: ${email}
Phone: ${phone || 'Not provided'}
Address: ${address || 'Not provided'}

Service Details:
Product Type: ${productType || 'Not specified'}
Urgency Level: ${urgency || 'Normal'}
Issue Description: ${issueDescription}

Files Attached: ${uploadedFiles.length > 0 ? uploadedFiles.length : 'None'}
${uploadedFiles.length > 0 ? uploadedFiles.map((file, index) => 
  `File ${index + 1}: ${file.originalname} (${(file.size / 1024 / 1024).toFixed(2)} MB)`
).join('\n') : ''}

Submitted: ${submitted_date}
`;

    const htmlContent = `
<html>
<body>
  <h2>🔧 Service Request - Smart Technologies</h2>
  
  <h3>📋 Customer Information</h3>
  <p><strong>Name:</strong> ${name}</p>
  <p><strong>Email:</strong> ${email}</p>
  <p><strong>Phone:</strong> ${phone || 'Not provided'}</p>
  <p><strong>Address:</strong> ${address || 'Not provided'}</p>
  
  <h3>🔧 Service Details</h3>
  <p><strong>Product Type:</strong> ${productType || 'Not specified'}</p>
  <p><strong>Urgency Level:</strong> ${urgency || 'Normal'}</p>
  <p><strong>Issue Description:</strong></p>
  <p>${issueDescription.replace(/\n/g, '<br>')}</p>
  
  <h3>📎 Files Attached: ${uploadedFiles.length > 0 ? uploadedFiles.length : 'None'}</h3>
  ${uploadedFiles.length > 0 ? uploadedFiles.map((file, index) => 
    `<p><strong>File ${index + 1}:</strong> ${file.originalname} (${(file.size / 1024 / 1024).toFixed(2)} MB)</p>`
  ).join('') : ''}
  
  <p><strong>Submitted:</strong> ${submitted_date}</p>
</body>
</html>
`;

    // Email options
    const recipientEmail = to || 'enquiry@smarttechay.com';
    
    const mailOptions = {
      from: `"Smart Technologies" <${process.env.EMAIL_USER}>`,
      to: recipientEmail,
      subject: email_subject || `Service Request from ${name}`,
      text: textContent,
      html: htmlContent,
      replyTo: email
    };

    // Add file attachments
    if (attachments.length > 0) {
      mailOptions.attachments = attachments.map(attachment => ({
        filename: attachment.filename,
        path: attachment.path,
        contentType: attachment.contentType
      }));
    }

    // Send email
    console.log(`📧 Sending service request email to: ${recipientEmail}`);
    console.log(`📎 Files attached: ${attachments.length}`);
    
    const result = await enquiryTransporter.sendMail(mailOptions);
    console.log('✅ Service request email sent successfully!');
    
    // Clean up uploaded files after sending (optional - comment out if you want to keep files)
    // uploadedFiles.forEach(file => {
    //   try {
    //     fs.unlinkSync(file.path);
    //   } catch (error) {
    //     console.error('Error cleaning up file:', error);
    //   }
    // });

    return res.status(200).json({ 
      success: true, 
      message: 'Service request submitted successfully with file attachments',
      filesProcessed: uploadedFiles.length,
      messageId: result.messageId
    });

  } catch (error) {
    console.error('❌ Error processing service request:', error);
    
    // Clean up files on error
    if (req.files) {
      req.files.forEach(file => {
        try {
          fs.unlinkSync(file.path);
        } catch (cleanupError) {
          console.error('Error cleaning up file:', cleanupError);
        }
      });
    }
    
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to submit service request',
      error: error.message 
    });
  }
});

// Error handling middleware for multer
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ message: 'File size too large. Maximum size is 10MB per file.' });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(413).json({ message: 'Too many files. Maximum is 5 files.' });
    }
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({ message: 'Unexpected file field.' });
    }
  }
  
  if (error.message.includes('Only images and videos are allowed')) {
    return res.status(400).json({ message: 'Only images and videos are allowed.' });
  }
  
  next(error);
});

export default router;
