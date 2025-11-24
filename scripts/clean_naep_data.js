// Script to clean and combine NAEP data from Excel files
// Run with: node scripts/clean_naep_data.js
// Requires: xlsx package (npm install xlsx)

const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// State name to USPS code mapping
const stateNameToCode = {
  'Alabama': 'AL', 'Alaska': 'AK', 'Arizona': 'AZ', 'Arkansas': 'AR', 'California': 'CA',
  'Colorado': 'CO', 'Connecticut': 'CT', 'Delaware': 'DE', 'District of Columbia': 'DC',
  'Florida': 'FL', 'Georgia': 'GA', 'Hawaii': 'HI', 'Idaho': 'ID', 'Illinois': 'IL',
  'Indiana': 'IN', 'Iowa': 'IA', 'Kansas': 'KS', 'Kentucky': 'KY', 'Louisiana': 'LA',
  'Maine': 'ME', 'Maryland': 'MD', 'Massachusetts': 'MA', 'Michigan': 'MI', 'Minnesota': 'MN',
  'Mississippi': 'MS', 'Missouri': 'MO', 'Montana': 'MT', 'Nebraska': 'NE', 'Nevada': 'NV',
  'New Hampshire': 'NH', 'New Jersey': 'NJ', 'New Mexico': 'NM', 'New York': 'NY',
  'North Carolina': 'NC', 'North Dakota': 'ND', 'Ohio': 'OH', 'Oklahoma': 'OK', 'Oregon': 'OR',
  'Pennsylvania': 'PA', 'Rhode Island': 'RI', 'South Carolina': 'SC', 'South Dakota': 'SD',
  'Tennessee': 'TN', 'Texas': 'TX', 'Utah': 'UT', 'Vermont': 'VT', 'Virginia': 'VA',
  'Washington': 'WA', 'West Virginia': 'WV', 'Wisconsin': 'WI', 'Wyoming': 'WY'
};

function parseNAEPFile(filePath, grade) {
  console.log(`\n📊 Processing ${filePath} (Grade ${grade})...`);
  
  const wb = XLSX.readFile(filePath);
  const sheetName = wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });
  
  console.log(`  Loaded ${rows.length} rows`);
  
  // Find header row
  let headerRowIdx = -1;
  let dataStartIdx = -1;
  const years = [];
  const yearColumns = new Map();
  
  for (let i = 0; i < Math.min(10, rows.length); i++) {
    const row = rows[i];
    if (!row || !Array.isArray(row)) continue;
    const firstCell = String(row[0] || '').trim().toLowerCase();
    
    if (firstCell.includes('state') && firstCell.includes('jurisdiction')) {
      headerRowIdx = i;
      dataStartIdx = i + 2;
      
      // Parse years from header
      for (let j = 1; j < Math.min(row.length, 50); j++) {
        const cell = row[j];
        if (cell == null) continue;
        
        const cellStr = String(cell);
        const yearMatch = cellStr.match(/^(19[89][0-9]|200[0-9]|201[0-9]|202[0-2])/);
        if (yearMatch) {
          const year = parseInt(yearMatch[1]);
          if (year >= 1990 && year <= 2025 && !years.includes(year)) {
            years.push(year);
            yearColumns.set(year, j);
          }
        }
      }
      break;
    }
  }
  
  years.sort((a, b) => a - b);
  console.log(`  ✅ Found ${years.length} years:`, years);
  
  // Parse state data
  const stateData = new Map(); // stateCode -> {year: score}
  const nationalAvgByYear = new Map();
  
  for (let i = dataStartIdx; i < rows.length; i++) {
    const row = rows[i];
    if (!row || !Array.isArray(row)) continue;
    
    let stateName = String(row[0] || '').trim();
    if (!stateName) continue;
    
    // Check for national average
    if (stateName.toLowerCase().replace(/\s+/g, ' ').includes('united states')) {
      years.forEach(year => {
        const colIdx = yearColumns.get(year);
        if (colIdx !== undefined && row[colIdx] != null) {
          let score = null;
          const cellValue = row[colIdx];
          
          if (typeof cellValue === 'number') {
            score = cellValue;
          } else if (typeof cellValue === 'string') {
            const match = cellValue.match(/^(\d+\.?\d*)/);
            score = match ? parseFloat(match[1]) : null;
          }
          
          if (score != null && !isNaN(score) && score > 0) {
            nationalAvgByYear.set(year, score);
          }
        }
      });
      continue;
    }
    
    // Match state
    let stateCode = stateNameToCode[stateName];
    if (!stateCode) {
      for (const [key, code] of Object.entries(stateNameToCode)) {
        if (key.toLowerCase() === stateName.toLowerCase()) {
          stateCode = code;
          break;
        }
      }
    }
    
    if (stateCode) {
      const yearScores = {};
      years.forEach(year => {
        const colIdx = yearColumns.get(year);
        if (colIdx !== undefined && row[colIdx] != null) {
          let score = null;
          const cellValue = row[colIdx];
          
          if (typeof cellValue === 'number') {
            score = cellValue;
          } else if (typeof cellValue === 'string') {
            const match = cellValue.match(/^(\d+\.?\d*)/);
            score = match ? parseFloat(match[1]) : null;
          }
          
          if (score != null && !isNaN(score) && score > 0) {
            yearScores[year] = score;
          }
        }
      });
      
      if (Object.keys(yearScores).length > 0) {
        stateData.set(stateCode, yearScores);
      }
    }
  }
  
  console.log(`  ✅ Loaded data for ${stateData.size} states`);
  console.log(`  ✅ National averages for ${nationalAvgByYear.size} years`);
  
  return {
    grade,
    years,
    stateData: Object.fromEntries(stateData),
    nationalAvgByYear: Object.fromEntries(nationalAvgByYear)
  };
}

// Main function
function main() {
  const dataDir = path.join(__dirname, '..', 'data');
  const outputFile = path.join(dataDir, 'naep_cleaned.json');
  
  console.log('🚀 Cleaning NAEP data files...\n');
  
  // Parse both grade files
  const grade4Data = parseNAEPFile(path.join(dataDir, 'fourth_grade_naep.xlsx'), 4);
  const grade8Data = parseNAEPFile(path.join(dataDir, 'eighth_grade_naep.xlsx'), 8);
  
  // Combine into single structure
  const combined = {
    grade4: {
      years: grade4Data.years,
      states: grade4Data.stateData,
      nationalAvg: grade4Data.nationalAvgByYear
    },
    grade8: {
      years: grade8Data.years,
      states: grade8Data.stateData,
      nationalAvg: grade8Data.nationalAvgByYear
    },
    allYears: [...new Set([...grade4Data.years, ...grade8Data.years])].sort((a, b) => a - b),
    metadata: {
      generated: new Date().toISOString(),
      source: 'NAEP Reading Assessment',
      grades: [4, 8]
    }
  };
  
  // Save to JSON
  fs.writeFileSync(outputFile, JSON.stringify(combined, null, 2));
  console.log(`\n✅ Saved cleaned data to ${outputFile}`);
  console.log(`   Total states (Grade 4): ${Object.keys(combined.grade4.states).length}`);
  console.log(`   Total states (Grade 8): ${Object.keys(combined.grade8.states).length}`);
  console.log(`   Years available: ${combined.allYears.join(', ')}`);
}

main();

