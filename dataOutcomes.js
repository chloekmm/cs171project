// File: js/dataOutcomes.js
// Purpose: Build a state-level dataset for Visualization 3 (bubble scatter):
// approx LiteracyScore (from PIAAC) vs. HS graduation rate (ACGR 2021–22) or College enrollment rate (2021).
// Dependencies: d3 (v7+), dataHelpers.loadPIAAC (for PIAAC by state from XLSX or CSV)

import { loadPIAAC } from './dataHelpers.js';

// Map full state names to USPS codes (for consistency with other visuals)
const NAME_TO_USPS = {
  'Alabama':'AL','Alaska':'AK','Arizona':'AZ','Arkansas':'AR','California':'CA','Colorado':'CO','Connecticut':'CT','Delaware':'DE','District of Columbia':'DC','Florida':'FL','Georgia':'GA',
  'Hawaii':'HI','Idaho':'ID','Illinois':'IL','Indiana':'IN','Iowa':'IA','Kansas':'KS','Kentucky':'KY','Louisiana':'LA','Maine':'ME','Maryland':'MD','Massachusetts':'MA','Michigan':'MI',
  'Minnesota':'MN','Mississippi':'MS','Missouri':'MO','Montana':'MT','Nebraska':'NE','Nevada':'NV','New Hampshire':'NH','New Jersey':'NJ','New Mexico':'NM','New York':'NY',
  'North Carolina':'NC','North Dakota':'ND','Ohio':'OH','Oklahoma':'OK','Oregon':'OR','Pennsylvania':'PA','Rhode Island':'RI','South Carolina':'SC','South Dakota':'SD',
  'Tennessee':'TN','Texas':'TX','Utah':'UT','Vermont':'VT','Virginia':'VA','Washington':'WA','West Virginia':'WV','Wisconsin':'WI','Wyoming':'WY'
};

// Convert PIAAC % at/below Level 1 (Lit_P1) to an approximate NAEP-like literacy score.
// Keeps values in ~150–320 range; higher Lit_P1 => lower score.
function toLiteracyScore(litP1Percent) {
  if (litP1Percent == null || isNaN(litP1Percent)) return null;
  return 320 - (Number(litP1Percent) * 2);
}

function levelFromScore(score) {
  if (score == null || isNaN(score)) return 'Unknown';
  if (score < 200) return 'Below Basic';
  if (score < 240) return 'Basic';
  if (score < 280) return 'Proficient';
  return 'Advanced';
}

// Extract a numeric from strings like "55.3 (1.2)" -> 55.3
function parseLeadingNumber(x) {
  if (x == null) return null;
  const m = String(x).match(/-?\d+(?:\.\d+)?/);
  return m ? +m[0] : null;
}

// Cache for outcomes data (module-level)
let outcomesCache = null;
const CACHE_KEY = 'viz4_outcomes_cache';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

// Load and merge: PIAAC + HS grads/ACGR + college enrollment
// Returns an array of state records with: { stateName, state, literacyScore, level, hsGraduates, hsRate, hsRateProxy, collegeRate, cohortSize }
export async function loadOutcomes({
  piaacPath = 'data/PIACC data.xlsx',
  hsPath = 'data/HS_grad_rates.csv',
  collegePath = 'data/college_enrollment.csv',
  useCache = true
} = {}) {
  // Check cache first
  if (useCache && outcomesCache) {
    console.log('✅ Using cached outcomes data');
    return outcomesCache;
  }
  
  // Check localStorage cache
  if (useCache) {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        const now = Date.now();
        if (parsed.timestamp && (now - parsed.timestamp) < CACHE_DURATION) {
          console.log('✅ Using localStorage cached outcomes data');
          outcomesCache = parsed.data;
          return parsed.data;
        } else {
          console.log('⏰ Cache expired, reloading data...');
          localStorage.removeItem(CACHE_KEY);
        }
      }
    } catch (e) {
      console.warn('⚠️ Error reading cache:', e);
    }
  }
  
  console.log('📊 Loading fresh outcomes data...');
  // 1) PIAAC literacy (state -> % <= Level 1)
  const piaac = await loadPIAAC(piaacPath); // { AL: 28.6, ... }

  // 2) HS graduates + ACGR CSV (State, ... year columns ..., hsRate)
  const hsCSV = await d3.csv(hsPath);

  // Identify grad-year column — **prefer 2021–22** explicitly to align with ACGR timing.
  // Handle hyphen or en dash: 2021-22 or 2021–22
  const yearCols = hsCSV.columns.filter(c => /\d{4}[–-]\d{2}/.test(c));
  const prefer2122 = yearCols.find(c => /2021[–-]22/.test(c));
  // If 2021–22 is missing, fall back to the latest year present.
  const chosenGradCol = prefer2122 || yearCols.sort((a,b) => (+a.slice(0,4)) - (+b.slice(0,4))).at(-1);

  // 3) College enrollment CSV (State, Total)
  const colCSV = await d3.csv(collegePath);
  
  // Debug: check CSV structure
  if (colCSV.length > 0) {
    console.log('📊 College enrollment CSV columns:', Object.keys(colCSV[0]));
    console.log('📊 Sample row:', colCSV[0]);
  }

  // Build intermediate maps
  const hsGradsByState = new Map();
  const hsRateByState = new Map(); // ACGR 2021–22 from hsRate column
  hsCSV.forEach(row => {
    const name = row.State?.trim();
    if (!name) return;
    const usps = NAME_TO_USPS[name] || (/^[A-Z]{2}$/.test(name) ? name : null);
    if (!usps) return;

    const gradCount = chosenGradCol ? parseLeadingNumber(row[chosenGradCol]) : null;
    if (gradCount != null) hsGradsByState.set(usps, gradCount);

    const acgr = row.hsRate != null ? parseLeadingNumber(row.hsRate) : null; // expects 2021–22 ACGR
    if (acgr != null) hsRateByState.set(usps, acgr);
  });

  const collegeRateByState = new Map();
  let collegeLoadCount = 0;
  colCSV.forEach((row, idx) => {
    // Handle state name - try multiple column name variations and trim whitespace
    const name = (row.State || row['State or jurisdiction'] || row.state || row['state'] || row['State '] || row[' State'])?.trim();
    if (!name) {
      if (idx < 3) console.warn(`⚠️ Row ${idx}: No state name found`);
      return;
    }
    
    // Try to match state name (handles trailing spaces from CSV)
    const usps = NAME_TO_USPS[name] || (/^[A-Z]{2}$/.test(name) ? name.toUpperCase() : null);
    if (!usps) {
      if (idx < 5) console.warn(`⚠️ Row ${idx}: Could not match state name "${name}"`);
      return;
    }
    
    // Try multiple column name variations for Total (CSV may have different capitalization/spacing)
    const totalVal = row.Total || row.total || row['Total'] || row['total'] || row[' Total'] || row['Total '] || row[' Total '];
    if (!totalVal && idx < 3) {
      console.warn(`⚠️ Row ${idx} (${name}): No Total column found. Available keys:`, Object.keys(row));
    }
    
    const pct = parseLeadingNumber(totalVal);
    if (pct != null && !isNaN(pct) && pct > 0) {
      collegeRateByState.set(usps, pct);
      collegeLoadCount++;
      if (collegeLoadCount <= 3) {
        console.log(`✅ ${usps} (${name}): ${pct}% college enrollment`);
      }
    } else if (idx < 3) {
      console.warn(`⚠️ Row ${idx} (${name}): Could not parse college enrollment from "${totalVal}"`);
    }
  });
  
  console.log(`📊 Loaded college enrollment rates for ${collegeRateByState.size} states`);
  if (collegeRateByState.size === 0) {
    console.error('❌ No college enrollment data loaded! Check CSV structure.');
    console.error('First row keys:', colCSV.length > 0 ? Object.keys(colCSV[0]) : 'No rows');
  }

  // For bubble sizing, use HS graduates in **2021–22** if present (chosenGradCol prefers that year)
  const gradCounts = Array.from(hsGradsByState.values()).filter(v => v != null && !isNaN(v));
  const minG = d3.min(gradCounts), maxG = d3.max(gradCounts);

  const out = [];
  Object.entries(NAME_TO_USPS).forEach(([fullName, usps]) => {
    const litP1 = piaac[usps];
    const literacyScore = toLiteracyScore(litP1);
    const level = levelFromScore(literacyScore);

    const hsGraduates = hsGradsByState.get(usps) ?? null;      // **2021–22 preferred**
    const hsRate = hsRateByState.get(usps) ?? null;            // ACGR 2021–22
    const hsRateProxy = hsRate == null && (hsGraduates != null && maxG > minG)
      ? ((hsGraduates - minG) / (maxG - minG)) * 100
      : null;

    const collegeRate = collegeRateByState.get(usps) ?? null;  // % (18–24 enrolled, 2021)

    const cohortSize = hsGraduates ?? null;

    out.push({
      stateName: fullName,
      state: usps,
      literacyScore,
      level,
      litP1,
      hsGraduates,
      hsRate,        // ACGR 2021–22 if provided
      hsRateProxy,   // fallback only
      collegeRate,   // % (18–24 enrolled, 2021)
      cohortSize,
      latestHSYear: chosenGradCol
    });
  });

  const result = { data: out, latestHSYear: chosenGradCol };
  
  // Cache the result
  outcomesCache = result;
  if (useCache) {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({
        data: result,
        timestamp: Date.now()
      }));
      console.log('✅ Cached outcomes data to localStorage');
    } catch (e) {
      console.warn('⚠️ Error caching data:', e);
    }
  }
  
  return result;
}

// Convenience: color palette consistent with earlier visuals
export function colorForLevel(level) {
  return level === 'Below Basic' ? '#c0392b'
       : level === 'Basic'       ? '#e67e22'
       : level === 'Proficient'  ? '#f1c40f'
       : level === 'Advanced'    ? '#3498db'
       : '#999';
}
