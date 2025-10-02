#!/bin/bash

# Smart Technologies - Production Environment Starter
echo "🚀 Starting Smart Technologies in Production Mode..."
echo "=================================================="

# Set production environment
export NODE_ENV=production
export PORT=5001

# Load production environment variables
if [ -f .env.production ]; then
    echo "✅ Loading production environment variables..."
    export $(cat .env.production | grep -v '^#' | xargs)
else
    echo "❌ .env.production file not found!"
    exit 1
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

echo ""
echo "🌍 Production Environment Details:"
echo "   - Environment: $NODE_ENV"
echo "   - Port: $PORT"
echo "   - Backend URL: http://localhost:$PORT"
echo "   - Health Check: http://localhost:$PORT/api/health"
echo ""
echo "🔗 API Endpoints:"
echo "   - Products: http://localhost:$PORT/api/products"
echo "   - Quotations: http://localhost:$PORT/api/quotations"
echo "   - GST Validation: http://localhost:$PORT/api/validate-gst"
echo "   - Email: http://localhost:$PORT/api/send-email"
echo ""
echo "⚡ Starting server..."
echo "=================================================="

# Start the server
node server.js
