# Smart Technologies Backend

Backend server for Smart Technologies website - Educational technology solutions platform.

## Features

- **Express.js Server**: RESTful API with ES modules
- **Supabase Database**: PostgreSQL database integration
- **Email Service**: Nodemailer with SMTP configuration
- **File Upload**: Multer for handling file uploads
- **GST Validation**: Real-time GST number validation
- **Quotation System**: Generate and manage quotations
- **CORS Enabled**: Cross-origin resource sharing

## Tech Stack

- Node.js (>=14.0.0)
- Express.js
- Supabase
- Nodemailer
- Multer
- XLSX for Excel processing

## Installation

```bash
npm install
```

## Environment Variables

Create a `.env` file:

```env
# Database
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key

# Email Configuration
EMAIL_HOST=smtp.hostinger.com
EMAIL_PORT=587
EMAIL_USER=enquiry@smarttechay.com
EMAIL_PASS=your_email_password

# Server
PORT=5001
NODE_ENV=production
```

## Scripts

```bash
npm start       # Start production server
npm run dev     # Start development server with nodemon
npm test        # Run tests
```

## API Endpoints

- `GET /api/products` - Get all products
- `POST /api/quotations` - Create quotation
- `POST /api/send-email` - Send email
- `POST /api/validate-gst` - Validate GST number
- `POST /api/service-request` - Submit service request

## Deployment

This backend is deployed on Render at: https://smarttech-backend.onrender.com

## License

MIT
