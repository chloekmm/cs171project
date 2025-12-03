// File: js/dataHelpers.js
// Purpose: Fetch, clean, and merge data from NAEP API, district poverty CSV, and PIAAC literacy data
// Author: Project Team
// Description: These helper functions prepare consistent data objects for use in visualization1.js and other visuals.

// ============================
// Utility: Local caching helpers
// ============================
function cacheData(key, data) {
    try { localStorage.setItem(key, JSON.stringify({ data, ts: Date.now() })); } catch (e) {}
  }
  
  function loadCachedData(key, maxAgeMinutes = 1440) { // 24 hours default
    try {
      const item = JSON.parse(localStorage.getItem(key));
      if (!item) return null;
      const age = (Date.now() - item.ts) / 60000;
      return age < maxAgeMinutes ? item.data : null;
    } catch (e) { return null; }
  }
  
  // Global cache for loaded Excel files (by grade) - loaded once per grade
  const naepDataCache = new Map();
  
  // ============================
  // 1. Load all NAEP data from Excel file (loads once per grade)
  // ============================
  async function loadAllNAEPData(grade = 4) {
    // Check if already loaded
    if (naepDataCache.has(grade)) {
      console.log(`✅ Using cached NAEP data for grade ${grade}`);
      return naepDataCache.get(grade);
    }
    
    try {
      // Load from Excel files based on grade
      const filePath = grade === 4 
        ? 'data/fourth_grade_naep.xlsx' 
        : 'data/eighth_grade_naep.xlsx';
      
      console.log(`📊 Loading NAEP data from ${filePath} for Grade ${grade}`);
      
      if (typeof XLSX === 'undefined') {
        throw new Error("XLSX (SheetJS) not found. Make sure it's loaded in the page.");
      }
      
      const res = await fetch(filePath);
      if (!res.ok) {
        throw new Error(`Failed to fetch ${filePath}: ${res.status} ${res.statusText}`);
      }
      
      const buf = await res.arrayBuffer();
      const wb = XLSX.read(buf, { type: 'array' });
      
      // Get the first sheet
      const sheetName = wb.SheetNames[0];
      const ws = wb.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });
      
      console.log(`📊 Loaded ${rows.length} rows from Excel file`);
      
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
        'Washington': 'WA', 'West Virginia': 'WV', 'Wisconsin': 'WI', 'Wyoming': 'WY',
        'United States': 'National'
      };
      
      // Find the data rows
      let dataStartRow = -1;
      let headerRowIndex = -1;
      
      // Find header row - try multiple strategies
      // Strategy 1: Look for "State or jurisdiction" header
      for (let i = 0; i < Math.min(15, rows.length); i++) {
        const row = rows[i];
        if (!row || !Array.isArray(row)) continue;
        const firstCell = String(row[0] || '').trim().toLowerCase();
        
        if (firstCell.includes('state') || firstCell.includes('jurisdiction')) {
          dataStartRow = i + 1;
          headerRowIndex = i;
          console.log(`📊 Found header row at index ${i}: "${String(rows[i][0]).trim()}"`);
          break;
        }
      }
      
      // Strategy 2: Look for row with year numbers in header
      if (headerRowIndex === -1) {
        for (let i = 0; i < Math.min(15, rows.length); i++) {
          const row = rows[i];
          if (!row || !Array.isArray(row)) continue;
          
          // Check if this row has year numbers
          let yearCount = 0;
          for (let j = 1; j < Math.min(row.length, 15); j++) {
            const cell = String(row[j] || '').trim();
            if (/^(199[2-9]|200[0-9]|201[0-9]|202[0-2])$/.test(cell)) {
              yearCount++;
            }
          }
          
          // If we found multiple years, this is likely the header
          if (yearCount >= 3) {
            headerRowIndex = i;
            dataStartRow = i + 1;
            console.log(`📊 Found header row with years at index ${i} (${yearCount} years found)`);
            break;
          }
        }
      }
      
      // Strategy 3: Look for first state name, then find header above it
      if (dataStartRow === -1) {
        for (let i = 0; i < Math.min(30, rows.length); i++) {
          const row = rows[i];
          if (!row || !Array.isArray(row)) continue;
          const firstCell = String(row[0] || '').trim();
          if (stateNameToCode[firstCell] || firstCell === 'United States') {
            // Look backwards for header row with years
            for (let j = Math.max(0, i - 5); j < i; j++) {
              const headerRow = rows[j];
              if (headerRow && Array.isArray(headerRow)) {
                const hasYears = headerRow.some(cell => {
                  const val = String(cell || '').trim();
                  return /^(199[2-9]|200[0-9]|201[0-9]|202[0-2])$/.test(val);
                });
                if (hasYears) {
                  headerRowIndex = j;
                  dataStartRow = i;
                  console.log(`📊 Found header at index ${j}, data starts at ${i}`);
                  break;
                }
              }
            }
            if (headerRowIndex !== -1) break;
          }
        }
      }
      
      if (dataStartRow === -1 || headerRowIndex === -1) {
        console.error(`❌ Could not find data start row or header row`);
        console.log('First 10 rows:', rows.slice(0, 10).map(r => r && Array.isArray(r) ? String(r[0] || '').trim() : 'null'));
        throw new Error('Could not parse Excel file structure');
      }
      
      const headerRow = rows[headerRowIndex];
      
      // Find year columns
      const yearColumns = [];
      for (let i = 1; i < headerRow.length; i++) {
        const cell = String(headerRow[i] || '').trim();
        const yearMatch = cell.match(/^(199[2-9]|200[0-9]|201[0-9]|202[0-2])$/);
        if (yearMatch) {
          yearColumns.push({ index: i, year: yearMatch[1] });
        }
      }
      
      if (yearColumns.length === 0) {
        throw new Error('Could not find year columns in Excel file');
      }
      
      // Get latest year (2022 if available)
      yearColumns.sort((a, b) => parseInt(b.year) - parseInt(a.year));
      const targetYearCol = yearColumns[0];
      console.log(`📊 Using year ${targetYearCol.year} at column index ${targetYearCol.index}`);
      
      // Parse all states
      const stateData = new Map();
      let nationalAvg = null;
      const sesGap = 18; // Typical NAEP reading score gap
      
      for (let i = dataStartRow; i < rows.length; i++) {
        const row = rows[i];
        if (!row || !Array.isArray(row)) continue;
        const firstCell = String(row[0] || '').trim();
        
        // Check for national average
        if (firstCell === 'United States' || firstCell.toLowerCase().includes('united states')) {
          const natScoreCell = row[targetYearCol.index];
          if (typeof natScoreCell === 'number') {
            nationalAvg = natScoreCell;
          } else if (typeof natScoreCell === 'string') {
            const natScoreMatch = natScoreCell.match(/^(\d+\.?\d*)/);
            if (natScoreMatch) {
              nationalAvg = parseFloat(natScoreMatch[1]);
            }
          }
          continue;
        }
        
        // Check for state
        const stateCode = stateNameToCode[firstCell];
        if (stateCode) {
          const scoreCell = row[targetYearCol.index];
          let score = null;
          
          if (typeof scoreCell === 'number') {
            score = scoreCell;
          } else if (typeof scoreCell === 'string') {
            const scoreMatch = scoreCell.match(/^(\d+\.?\d*)/);
            score = scoreMatch ? parseFloat(scoreMatch[1]) : null;
          }
          
          if (score !== null && !isNaN(score)) {
            stateData.set(stateCode, {
              Low: score - sesGap,
              Middle: score,
              High: score + sesGap,
              NationalAverage: nationalAvg || score
            });
          }
        }
      }
      
      console.log(`✅ Loaded ${stateData.size} states from Excel file`);
      if (nationalAvg) {
        console.log(`✅ National average: ${nationalAvg}`);
      }
      
      // Cache the results
      const result = { stateData, nationalAvg };
      naepDataCache.set(grade, result);
      return result;
    } catch (err) {
      console.error(`❌ Failed to load NAEP data for Grade ${grade}:`, err);
      throw err;
    }
  }
  
  // ============================
  // 2. Fetch NAEP data for a specific state
  // ============================
  // Input: state code (e.g. "TX"), grade (4 or 8), subject ("READING")
  // Output: Object with SES categories and average scores
  export async function fetchNAEP(state, grade = 4, subject = 'READING') {
    const cacheKey = `naep_${state}_${grade}_${subject}`;
    const cached = loadCachedData(cacheKey);
    if (cached) {
      return cached;
    }
    
    try {
      // Load all data for this grade (cached after first load)
      const { stateData, nationalAvg } = await loadAllNAEPData(grade);
      
      // Get state-specific data
      const scores = stateData.get(state) || {
        Low: null,
        Middle: null,
        High: null,
        NationalAverage: nationalAvg
      };
      
      if (scores.Middle === null) {
        console.warn(`⚠️ No data found for ${state}, Grade ${grade}`);
      }
      
      // Cache individual state result
      cacheData(cacheKey, scores);
      return scores;
    } catch (err) {
      console.error(`❌ NAEP load failed for ${state}, Grade ${grade}:`, err);
      return { Low: null, Middle: null, High: null, NationalAverage: null };
    }
  }
  
  // ============================
  // 3. SES classification helper
  // ============================
  // Input: numeric poverty rate (e.g., Poverty_150 from dataset)
  // Output: 'Low', 'Middle', or 'High' string
  export function getSESCategory(povertyRate) {
    if (povertyRate == null || isNaN(povertyRate)) return 'Unknown';
    if (povertyRate >= 30) return 'Low';
    if (povertyRate >= 15) return 'Middle';
    return 'High';
  }
  
  // ============================
  // 4. Load PIAAC literacy data
  // ============================
  // Input: path to PIAAC CSV or Excel converted to CSV
  // Output: Object mapping state code -> % adults below Level 1 literacy
  export async function loadPIAAC(path = 'data/PIACC data.xlsx') {
    // Supports CSV or Excel. If Excel, uses SheetJS (XLSX) to parse.
    // Expected columns on the chosen sheet: State, Lit_P1 (percent at/below Literacy Level 1)
    const isExcel = /\.xlsx?$/i.test(path);
  
    // Helper: map full state name to USPS code
    const nameToUSPS = {
      'Alabama':'AL','Alaska':'AK','Arizona':'AZ','Arkansas':'AR','California':'CA','Colorado':'CO','Connecticut':'CT','Delaware':'DE','District of Columbia':'DC','Florida':'FL','Georgia':'GA',
      'Hawaii':'HI','Idaho':'ID','Illinois':'IL','Indiana':'IN','Iowa':'IA','Kansas':'KS','Kentucky':'KY','Louisiana':'LA','Maine':'ME','Maryland':'MD','Massachusetts':'MA','Michigan':'MI',
      'Minnesota':'MN','Mississippi':'MS','Missouri':'MO','Montana':'MT','Nebraska':'NE','Nevada':'NV','New Hampshire':'NH','New Jersey':'NJ','New Mexico':'NM','New York':'NY',
      'North Carolina':'NC','North Dakota':'ND','Ohio':'OH','Oklahoma':'OK','Oregon':'OR','Pennsylvania':'PA','Rhode Island':'RI','South Carolina':'SC','South Dakota':'SD',
      'Tennessee':'TN','Texas':'TX','Utah':'UT','Vermont':'VT','Virginia':'VA','Washington':'WA','West Virginia':'WV','Wisconsin':'WI','Wyoming':'WY'
    };
  
    if (isExcel) {
      if (typeof XLSX === 'undefined') {
        throw new Error("XLSX (SheetJS) not found. Add <script src='https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js'></script> to index.html before this file.");
      }
      const res = await fetch(path);
      const buf = await res.arrayBuffer();
      const wb = XLSX.read(buf, { type: 'array' });
  
      // Choose sheet: prefer names containing 'state'
      const wanted = wb.SheetNames.find(n => /state/i.test(n)) || wb.SheetNames[0];
      const ws = wb.Sheets[wanted];
      const rows = XLSX.utils.sheet_to_json(ws, { defval: null });
  
      const out = {};
      rows.forEach(r => {
        const stateName = r.State || r.STATE || r.state || r.Jurisdiction || r.JURISDICTION;
        const val = r.Lit_P1 ?? r.lit_p1 ?? r["Lit_P1"];
        if (!stateName || val == null) return;
        const usps = nameToUSPS[stateName.trim()] || (/[A-Z]{2}/.test(stateName) ? stateName.trim().toUpperCase() : null);
        if (usps) out[usps] = +val;
      });
      return out;
    } else {
      // CSV path: expect columns: State (full name or USPS) and Lit_P1
      const data = await d3.csv(path, d3.autoType);
      const literacyByState = {};
      data.forEach(d => {
        const key = (d.State && nameToUSPS[d.State]) ? nameToUSPS[d.State]
                  : (d.State && /^[A-Z]{2}$/.test(d.State) ? d.State : null);
        if (key && d.Lit_P1 != null) literacyByState[key] = +d.Lit_P1;
      });
      return literacyByState;
    }
  }
  
  
  // ============================
  // 5. Merge context for visualization
  // ============================
  // Combines NAEP + poverty + literacy data into one object per state
  export async function getStateContext(state, grade, povertyDataPath = 'data/district_perpupil_stats.csv', piaacPath = 'data/PIACC data.xlsx') {
    const [naepScores, piaac, poverty] = await Promise.all([
      fetchNAEP(state, grade, 'READING'),
      loadPIAAC(piaacPath),
      d3.csv(povertyDataPath, d3.autoType)
    ]);
  
    // Find average poverty rate for state
    const stateRows = poverty.filter(r => r.State === state);
    const avgPov = d3.mean(stateRows, d => +d.Poverty_150);
    const sesCategory = getSESCategory(avgPov);
  
    return {
      state,
      grade,
      povertyRate: avgPov,
      ses: sesCategory,
      literacyLowLevelPct: piaac[state] ?? null,
      scores: naepScores
    };
  }
  
  // ============================
  // Example usage (for teammates)
  // ============================
  // const context = await getStateContext('TX', 4);
  // console.log(context);
  // => {
  //   state: 'TX',
  //   grade: 4,
  //   povertyRate: 31.5,
  //   ses: 'Low',
  //   literacyLowLevelPct: 45.2,
  //   scores: { Low: 235, Middle: 261, High: 287, NationalAverage: 266 }
  // }
