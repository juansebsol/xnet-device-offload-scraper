// src/parseDeviceCsv.js
// Parser for device-specific offload CSV data
// - Handles the format: Transaction Date, NAS-ID, Total Sessions, Count of Users, Rejects, Total GBs
// - Returns structured data ready for database insertion

function parseDeviceCsv(csvText) {
  if (!csvText || typeof csvText !== 'string') {
    throw new Error('CSV text is required and must be a string');
  }

  const lines = csvText.trim().split('\n');
  if (lines.length < 2) {
    throw new Error('CSV must have at least a header and one data row');
  }

  // Parse header - skip empty first column
  const headerLine = lines[0];
  const headers = headerLine.split(',').map(h => h.trim()).filter(h => h !== '');
  
  // Validate expected headers
  const expectedHeaders = [
    'Transaction Date',
    'NAS-ID', 
    'Total Sessions',
    'Count of Users',
    'Rejects',
    'Total GBs'
  ];
  
  const missingHeaders = expectedHeaders.filter(h => !headers.includes(h));
  if (missingHeaders.length > 0) {
    throw new Error(`Missing expected headers: ${missingHeaders.join(', ')}`);
  }

  // Parse data rows
  const data = [];
  const errors = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue; // Skip empty lines
    
    try {
      const row = parseCsvRow(line);
      if (row) {
        // Validate and transform the data
        const parsedRow = {
          transaction_date: parseDate(row['Transaction Date']),
          nas_id: row['NAS-ID'].trim(),
          total_sessions: parseInt(row['Total Sessions'], 10),
          count_of_users: parseInt(row['Count of Users'], 10),
          rejects: parseInt(row['Rejects'], 10),
          total_gbs: parseFloat(row['Total GBs'])
        };
        
        // Validate the parsed data
        if (isNaN(parsedRow.total_sessions) || parsedRow.total_sessions < 0) {
          throw new Error(`Invalid Total Sessions: ${row['Total Sessions']}`);
        }
        if (isNaN(parsedRow.count_of_users) || parsedRow.count_of_users < 0) {
          throw new Error(`Invalid Count of Users: ${row['Count of Users']}`);
        }
        if (isNaN(parsedRow.rejects) || parsedRow.rejects < 0) {
          throw new Error(`Invalid Rejects: ${row['Rejects']}`);
        }
        if (isNaN(parsedRow.total_gbs) || parsedRow.total_gbs < 0) {
          throw new Error(`Invalid Total GBs: ${row['Total GBs']}`);
        }
        
        data.push(parsedRow);
      }
    } catch (error) {
      errors.push({
        line: i + 1,
        content: line,
        error: error.message
      });
    }
  }

  return {
    data,
    errors,
    totalRows: lines.length - 1,
    validRows: data.length,
    errorRows: errors.length
  };
}

// Helper function to parse CSV row (handles quoted fields and skips empty first column)
function parseCsvRow(line) {
  const result = {};
  let current = '';
  let inQuotes = false;
  let fieldIndex = 0;
  let skipFirstColumn = true; // Skip the empty first column
  const headers = [
    'Transaction Date',
    'NAS-ID', 
    'Total Sessions',
    'Count of Users',
    'Rejects',
    'Total GBs'
  ];
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      // End of field
      if (skipFirstColumn) {
        skipFirstColumn = false; // Skip the first empty column
        current = '';
        continue;
      }
      
      if (headers[fieldIndex]) {
        result[headers[fieldIndex]] = current.trim();
      }
      current = '';
      fieldIndex++;
    } else {
      current += char;
    }
  }
  
  // Handle the last field
  if (headers[fieldIndex]) {
    result[headers[fieldIndex]] = current.trim();
  }
  
  return result;
}

// Helper function to parse date (YYYY-MM-DD format)
function parseDate(dateStr) {
  if (!dateStr) {
    throw new Error('Date is required');
  }
  
  const trimmed = dateStr.trim();
  const date = new Date(trimmed);
  
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid date format: ${dateStr}`);
  }
  
  // Return in YYYY-MM-DD format
  return trimmed;
}

// Helper function to format the parsed data for display
function formatDeviceData(data) {
  return data.map(row => ({
    ...row,
    total_gbs_formatted: formatGigabytes(row.total_gbs)
  }));
}

// Helper function to format gigabytes with appropriate units
function formatGigabytes(gbs) {
  if (gbs >= 1) {
    return `${gbs.toFixed(3)} GB`;
  } else if (gbs >= 0.001) {
    return `${(gbs * 1000).toFixed(3)} MB`;
  } else {
    return `${(gbs * 1000000).toFixed(3)} KB`;
  }
}

// convenience direct-run for testing
if (require.main === module) {
  const fs = require('fs');
  const path = require('path');
  
  // Test with a sample file if provided
  const testFile = process.argv[2];
  if (testFile) {
    try {
      const csvText = fs.readFileSync(testFile, 'utf8');
      const result = parseDeviceCsv(csvText);
      
      console.log('✅ CSV parsed successfully!');
      console.log(`📊 Total rows: ${result.totalRows}`);
      console.log(`✅ Valid rows: ${result.validRows}`);
      console.log(`❌ Error rows: ${result.errorRows}`);
      
      if (result.errors.length > 0) {
        console.log('\n❌ Errors:');
        result.errors.forEach(error => {
          console.log(`  Line ${error.line}: ${error.error}`);
        });
      }
      
      if (result.data.length > 0) {
        console.log('\n📋 Sample data:');
        const formatted = formatDeviceData(result.data.slice(0, 3));
        formatted.forEach((row, i) => {
          console.log(`  Row ${i + 1}: ${row.transaction_date} | ${row.nas_id} | ${row.total_sessions} sessions | ${row.count_of_users} users | ${row.rejects} rejects | ${row.total_gbs_formatted}`);
        });
      }
      
    } catch (error) {
      console.error('❌ Error parsing CSV:', error.message);
      process.exit(1);
    }
  } else {
    console.log('📝 Usage: node src/parseDeviceCsv.js <csv_file>');
    console.log('💡 This will parse and validate the device offload CSV format');
  }
}

module.exports = { 
  parseDeviceCsv, 
  formatDeviceData, 
  formatGigabytes 
};
