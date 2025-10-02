# Smart Technologies - Production Environment Test

## 🎯 **Purpose**
This is a local production environment to test how your Smart Technologies web app will behave after hosting on Render.

## 🚀 **Quick Start**

### **Method 1: Using Start Script (Recommended)**
```bash
cd /Users/pandushirabur/Desktop/smarttech-production-test
./start-production.sh
```

### **Method 2: Manual Start**
```bash
cd /Users/pandushirabur/Desktop/smarttech-production-test
npm install
npm run prod-test
```

## 🔍 **What This Tests**

### **✅ Production Features Enabled:**
- **Environment**: `NODE_ENV=production`
- **Port**: `5001` (same as Render)
- **Logging**: Production level (info/warn/error only)
- **Debug**: Disabled
- **CORS**: Production domains + localhost for testing
- **Error Handling**: Production-grade responses

### **🧪 API Endpoints to Test:**

1. **Health Check**: `http://localhost:5001/api/health`
2. **Products (133 items)**: `http://localhost:5001/api/products`
3. **Quotations**: `http://localhost:5001/api/quotations`
4. **GST Validation**: `POST http://localhost:5001/api/validate-gst`
5. **Email Service**: `POST http://localhost:5001/api/send-email`

### **🎯 Test Scenarios:**

#### **1. Create Customer Quotation**
```bash
curl -X POST http://localhost:5001/api/quotations \
  -H "Content-Type: application/json" \
  -d '{
    "type": "CUST",
    "customerData": {
      "name": "Test Customer",
      "email": "test@example.com",
      "phone": "+91-9876543210",
      "address": "Test Address"
    },
    "items": [
      {
        "name": "LED Bulb 9W",
        "qty": 2,
        "price": 150,
        "priceWithTax": 177,
        "hsn": "8539",
        "tax": 18,
        "units": "PCS"
      }
    ],
    "totals": {
      "subtotal": 300,
      "taxAmount": 54,
      "total": 354
    }
  }'
```

#### **2. Validate GST Number**
```bash
curl -X POST http://localhost:5001/api/validate-gst \
  -H "Content-Type: application/json" \
  -d '{"gstNumber": "29AACCG0527D1Z0"}'
```

#### **3. Get All Products**
```bash
curl http://localhost:5001/api/products
```

## 🎯 **Expected Results**

### **Quotation Numbers Should Generate:**
- First Customer: `ST/CUST/2024/01`
- Second Customer: `ST/CUST/2024/02`
- First Vendor: `ST/VEND/2024/01`

### **GST API Should Return:**
```json
{
  "success": true,
  "verified": true,
  "apiUsed": "gstincheck",
  "data": {
    "gstin": "29AACCG0527D1Z0",
    "legalName": "Company Name",
    "status": "Active"
  }
}
```

### **Products Should Return:**
```json
{
  "success": true,
  "count": 133,
  "products": [...]
}
```

## 🔧 **Troubleshooting**

### **If Server Won't Start:**
1. Check if port 5001 is available: `lsof -i :5001`
2. Kill existing process: `kill -9 <PID>`
3. Try different port: `PORT=5002 npm run prod-test`

### **If APIs Don't Work:**
1. Check logs for errors
2. Verify environment variables are loaded
3. Test individual endpoints with curl

## 📊 **Performance Testing**

### **Load Test Quotations:**
```bash
# Create 10 quotations quickly to test race conditions
for i in {1..10}; do
  curl -X POST http://localhost:5001/api/quotations \
    -H "Content-Type: application/json" \
    -d '{"type":"CUST","customerData":{"name":"Test '$i'","email":"test'$i'@example.com","phone":"+91-9876543210","address":"Test"},"items":[{"name":"Test Product","qty":1,"price":100,"priceWithTax":118,"hsn":"1234","tax":18,"units":"PCS"}],"totals":{"subtotal":100,"taxAmount":18,"total":118}}' &
done
wait
```

## 🎯 **Success Criteria**

✅ **Server starts without errors**  
✅ **Health check returns production config**  
✅ **133 products load correctly**  
✅ **Quotations generate unique sequential numbers**  
✅ **GST validation works with your API key**  
✅ **No duplicate key errors**  
✅ **CORS allows frontend connections**  

## 🚀 **Next Steps**

If all tests pass, your app is ready for production deployment to Render!

**Deploy Command:**
```bash
# Copy this production-tested backend to GitHub
cp -r /Users/pandushirabur/Desktop/smarttech-production-test/* /path/to/your/github/repo/
```
