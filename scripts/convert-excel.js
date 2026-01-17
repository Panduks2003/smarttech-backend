const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// Path to the Excel file
const excelFilePath = path.join(__dirname, '../../public/M_s-SMART-IQ-EDUCATIONAL-SERVICES_Products.xlsx');
const outputPath = path.join(__dirname, '../data/products.json');

// Create data directory if it doesn't exist
const dataDir = path.dirname(outputPath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

try {
  console.log('Reading Excel file:', excelFilePath);
  
  // Read the Excel file
  const workbook = XLSX.readFile(excelFilePath);
  
  // Get the first sheet name
  const sheetName = workbook.SheetNames[0];
  console.log('Processing sheet:', sheetName);
  
  // Get the worksheet
  const worksheet = workbook.Sheets[sheetName];
  
  // Convert to JSON with header row
  const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
    header: 1, // Use first row as header
    defval: '' // Default value for empty cells
  });
  
  console.log('Raw data rows:', jsonData.length);
  
  if (jsonData.length === 0) {
    throw new Error('No data found in Excel file');
  }
  
  // Get headers from first row
  const headers = jsonData[0];
  console.log('Headers found:', headers);
  
  // Convert to array of objects
  const products = [];
  
  for (let i = 1; i < jsonData.length; i++) {
    const row = jsonData[i];
    
    // Skip empty rows
    if (row.length === 0 || row.every(cell => cell === '')) {
      continue;
    }
    
    const product = {};
    
    // Map each column to header
    headers.forEach((header, index) => {
      if (header && header.trim()) {
        product[header.trim()] = row[index] || '';
      }
    });
    
    // Add unique ID
    product.id = i;
    
    // Only add if product has meaningful data
    if (Object.values(product).some(value => value !== '' && value !== undefined)) {
      products.push(product);
    }
  }
  
  console.log('Processed products:', products.length);
  
  // Save to JSON file
  fs.writeFileSync(outputPath, JSON.stringify(products, null, 2));
  
  console.log('✅ Successfully converted Excel to JSON');
  console.log('📁 Output file:', outputPath);
  console.log('📊 Total products:', products.length);
  
  // Display sample data
  if (products.length > 0) {
    console.log('\n📋 Sample product:');
    console.log(JSON.stringify(products[0], null, 2));
    
    console.log('\n🔑 Available columns:');
    console.log(Object.keys(products[0]).join(', '));
  }
  
} catch (error) {
  console.error('❌ Error converting Excel file:', error.message);
  process.exit(1);
}
