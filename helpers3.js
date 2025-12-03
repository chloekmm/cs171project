/**
 * HELPER FUNCTIONS FOR BOOK DESERT INDEX VISUALIZATION
 * 
 * This file contains utility functions for data processing, 
 * state name/code conversions, number formatting, and tooltip management.
 */

/**
 * STATE NAME TO CODE MAPPING
 * Converts full state names to two-letter abbreviations
 */
const STATE_NAME_TO_CODE = {
  "Alabama": "AL", "Alaska": "AK", "Arizona": "AZ", "Arkansas": "AR", 
  "California": "CA", "Colorado": "CO", "Connecticut": "CT", "Delaware": "DE", 
  "Florida": "FL", "Georgia": "GA", "Hawaii": "HI", "Idaho": "ID", 
  "Illinois": "IL", "Indiana": "IN", "Iowa": "IA", "Kansas": "KS", 
  "Kentucky": "KY", "Louisiana": "LA", "Maine": "ME", "Maryland": "MD",
  "Massachusetts": "MA", "Michigan": "MI", "Minnesota": "MN", "Mississippi": "MS", 
  "Missouri": "MO", "Montana": "MT", "Nebraska": "NE", "Nevada": "NV", 
  "New Hampshire": "NH", "New Jersey": "NJ", "New Mexico": "NM", "New York": "NY", 
  "North Carolina": "NC", "North Dakota": "ND", "Ohio": "OH", "Oklahoma": "OK", 
  "Oregon": "OR", "Pennsylvania": "PA", "Rhode Island": "RI", "South Carolina": "SC",
  "South Dakota": "SD", "Tennessee": "TN", "Texas": "TX", "Utah": "UT", 
  "Vermont": "VT", "Virginia": "VA", "Washington": "WA", "West Virginia": "WV", 
  "Wisconsin": "WI", "Wyoming": "WY", "District of Columbia": "DC"
};

/**
 * STATE CODE TO NAME MAPPING
 * Converts two-letter abbreviations to full state names
 */
const STATE_CODE_TO_NAME = Object.fromEntries(
  Object.entries(STATE_NAME_TO_CODE).map(([name, code]) => [code, name])
);

/**
 * Convert state name to code
 * @param {string} name - Full state name (e.g., "California")
 * @returns {string|null} Two-letter state code (e.g., "CA") or null if not found
 * @example
 * getStateCode("California") // Returns "CA"
 * getStateCode("Texas") // Returns "TX"
 */
function getStateCode(name) {
  return STATE_NAME_TO_CODE[name] || null;
}

/**
 * Convert state code to name
 * @param {string} code - Two-letter state code (e.g., "CA")
 * @returns {string|null} Full state name (e.g., "California") or null if not found
 * @example
 * getStateName("CA") // Returns "California"
 * getStateName("TX") // Returns "Texas"
 */
function getStateName(code) {
  return STATE_CODE_TO_NAME[code] || null;
}

/**
 * Format large numbers with comma separators
 * @param {number} num - Number to format
 * @returns {string} Formatted number string with commas
 * @example
 * formatNumber(1234567) // Returns "1,234,567"
 * formatNumber(999) // Returns "999"
 */
function formatNumber(num) {
  if (num === null || num === undefined) return '0';
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/**
 * Format number with appropriate suffix (K, M, B)
 * @param {number} num - Number to format
 * @returns {string} Formatted number with suffix
 * @example
 * formatNumberShort(24000000) // Returns "24.0M"
 * formatNumberShort(1500) // Returns "1.5K"
 * formatNumberShort(999) // Returns "999"
 */
function formatNumberShort(num) {
  if (num === null || num === undefined) return '0';
  if (num >= 1e9) return (num / 1e9).toFixed(1) + 'B';
  if (num >= 1e6) return (num / 1e6).toFixed(1) + 'M';
  if (num >= 1e3) return (num / 1e3).toFixed(1) + 'K';
  return num.toString();
}

/**
 * Get category color based on book access category
 * @param {string} category - Category name (desert, moderate, adequate, excellent)
 * @returns {string} Hex color code
 * @example
 * getCategoryColor("desert") // Returns "#c85a54"
 * getCategoryColor("excellent") // Returns "#8ab8d0"
 */
function getCategoryColor(category) {
  const colors = {
    'desert': '#c85a54',
    'moderate': '#e89456',
    'adequate': '#f4d58d',
    'excellent': '#8ab8d0'
  };
  return colors[category] || '#cccccc';
}

/**
 * Get category label and description
 * @param {string} category - Category name
 * @returns {object} Object with label, range, and description
 * @example
 * getCategoryInfo("desert") 
 * // Returns { label: "Desert", range: "< 8 books/student", description: "Critically low book access" }
 */
function getCategoryInfo(category) {
  const info = {
    'desert': {
      label: 'Desert',
      range: '< 8 books/student',
      description: 'Critically low book access'
    },
    'moderate': {
      label: 'Moderate',
      range: '8-12 books/student',
      description: 'Below adequate book access'
    },
    'adequate': {
      label: 'Adequate',
      range: '12-16 books/student',
      description: 'Adequate book access'
    },
    'excellent': {
      label: 'Excellent',
      range: '> 16 books/student',
      description: 'Excellent book access'
    }
  };
  return info[category] || info['moderate'];
}

/**
 * Create tooltip content HTML
 * @param {object} stateData - State data object with books, libraries, est_students, category
 * @param {string} stateName - Full state name
 * @param {string} stateCode - Two-letter state code
 * @returns {string} HTML string for tooltip
 * @example
 * createTooltipContent(
 *   {books: 7.4, libraries: 186, est_students: 7006161, category: "desert"},
 *   "California",
 *   "CA"
 * )
 */
function createTooltipContent(stateData, stateName, stateCode) {
  if (!stateData) {
    console.warn('createTooltipContent: No stateData provided for', stateName, stateCode);
    return '';
  }
  
  // Handle both property names (books vs books_per_student, libraries vs num_libraries)
  // Check for property existence using 'in' operator to handle 0 values correctly
  const booksPerStudent = ('books_per_student' in stateData && stateData.books_per_student != null) 
    ? stateData.books_per_student 
    : (('books' in stateData && stateData.books != null) ? stateData.books : null);
    
  const numLibraries = ('num_libraries' in stateData && stateData.num_libraries != null)
    ? stateData.num_libraries
    : (('libraries' in stateData && stateData.libraries != null) ? stateData.libraries : null);
    
  const estStudents = ('est_students' in stateData && stateData.est_students != null)
    ? stateData.est_students
    : null;
    
  const category = stateData.category || 'unknown';
  
  // Format numbers safely
  const formatNum = (num) => {
    if (num == null || num === undefined || isNaN(num)) return 'N/A';
    const n = Number(num);
    if (isNaN(n)) return 'N/A';
    if (typeof d3 !== 'undefined' && d3.format) {
      return d3.format(',')(Math.round(n));
    }
    return n.toLocaleString();
  };
  
  const formatDecimal = (num) => {
    if (num == null || num === undefined || isNaN(num)) return 'N/A';
    const n = Number(num);
    if (isNaN(n)) return 'N/A';
    if (typeof d3 !== 'undefined' && d3.format) {
      return d3.format('.1f')(n);
    }
    return n.toFixed(1);
  };
  
  console.log('ðŸ“Š Tooltip data for', stateName, ':', { 
    booksPerStudent, 
    numLibraries, 
    estStudents, 
    category,
    rawData: stateData 
  });
  
  return `
    <div style="font-weight: 700; font-size: 14px; margin-bottom: 6px; color: #111;">${stateName} (${stateCode})</div>
    <div style="color: #111; margin-bottom: 4px;"><strong>${formatDecimal(booksPerStudent)}</strong> books per student</div>
    <div style="color: #111; margin-bottom: 4px;">${formatNum(numLibraries)} public libraries</div>
    <div style="color: #111; margin-bottom: 6px;">${formatNum(estStudents)} estimated K-12 students</div>
    <div style="margin-top: 8px; padding-top: 6px; border-top: 1px solid rgba(0,0,0,0.2); font-size: 11px; color: #333; text-transform: capitalize;">
      Category: <strong>${category}</strong>
    </div>
  `;
}

/**
 * Show tooltip at specified position
 * @param {HTMLElement|d3.selection} tooltip - Tooltip element or D3 selection
 * @param {string} content - HTML content for tooltip
 * @param {number} x - X position (viewport coordinates)
 * @param {number} y - Y position (viewport coordinates)
 * @example
 * showTooltip(tooltipElement, htmlContent, event.clientX, event.clientY)
 */
function showTooltip(tooltip, content, x, y) {
  // Handle both native DOM elements and D3 selections
  const d3Tooltip = tooltip.node ? tooltip : d3.select(tooltip);
  
  // Ensure tooltip has proper styling if not already set
  d3Tooltip
    .html(content)
    .style("position", "fixed")
    .style("pointer-events", "none")
    .style("z-index", "1000")
    .style("left", (x + 20) + "px")
    .style("top", (y - 40) + "px")
    .style("opacity", 1);
}

/**
 * Hide tooltip
 * @param {HTMLElement|d3.selection} tooltip - Tooltip element or D3 selection
 * @example
 * hideTooltip(tooltipElement)
 */
function hideTooltip(tooltip) {
  const d3Tooltip = tooltip.node ? tooltip : d3.select(tooltip);
  d3Tooltip.style("opacity", 0);
}

/**
 * Get all states in a specific category
 * @param {object} data - Full data object with states array
 * @param {string} category - Category to filter by
 * @returns {array} Array of state codes in that category
 * @example
 * getStatesByCategory(vizData, "desert") // Returns ["AZ", "CA", "FL", "GA", "NC", "NV", "TX", "WA"]
 */
function getStatesByCategory(data, category) {
  if (!data || !data.states) return [];
  return data.states
    .filter(state => state.category === category)
    .map(state => state.state);
}

/**
 * Calculate aggregate statistics for a category
 * @param {object} data - Full data object
 * @param {string} category - Category to analyze
 * @returns {object} Statistics object with count, total_students, total_libraries, avg_books_per_student
 * @example
 * getCategoryStats(vizData, "excellent")
 * // Returns: { count: 14, total_students: 12671203, total_libraries: 4152, avg_books_per_student: 18.2, states: [...] }
 */
function getCategoryStats(data, category) {
  if (!data || !data.states) return null;
  
  const states = data.states.filter(s => s.category === category);
  
  if (states.length === 0) {
    return {
      count: 0,
      total_students: 0,
      total_libraries: 0,
      avg_books_per_student: 0,
      states: []
    };
  }
  
  return {
    count: states.length,
    total_students: states.reduce((sum, s) => sum + s.est_students, 0),
    total_libraries: states.reduce((sum, s) => sum + s.num_libraries, 0),
    avg_books_per_student: states.reduce((sum, s) => sum + s.books_per_student, 0) / states.length,
    states: states.map(s => s.state)
  };
}

/**
 * Sort states by books per student
 * @param {object} data - Full data object
 * @param {boolean} ascending - Sort order (default: false for descending)
 * @returns {array} Sorted array of state objects
 * @example
 * sortStatesByAccess(vizData, false) // Returns states from best to worst
 * sortStatesByAccess(vizData, true)  // Returns states from worst to best
 */
function sortStatesByAccess(data, ascending = false) {
  if (!data || !data.states) return [];
  
  return [...data.states].sort((a, b) => {
    return ascending 
      ? a.books_per_student - b.books_per_student
      : b.books_per_student - a.books_per_student;
  });
}

/**
 * Get top N states by book access
 * @param {object} data - Full data object
 * @param {number} n - Number of states to return (default: 10)
 * @returns {array} Array of top N state objects
 * @example
 * getTopStates(vizData, 5) 
 * // Returns top 5 states: [{state: "VT", books_per_student: 25.8, ...}, ...]
 */
function getTopStates(data, n = 10) {
  return sortStatesByAccess(data, false).slice(0, n);
}

/**
 * Get bottom N states by book access
 * @param {object} data - Full data object
 * @param {number} n - Number of states to return (default: 10)
 * @returns {array} Array of bottom N state objects
 * @example
 * getBottomStates(vizData, 5)
 * // Returns bottom 5 states: [{state: "AZ", books_per_student: 3.3, ...}, ...]
 */
function getBottomStates(data, n = 10) {
  return sortStatesByAccess(data, true).slice(0, n);
}

/**
 * Create state lookup dictionary for fast access
 * @param {object} data - Full data object
 * @returns {object} Dictionary with state codes as keys
 * @example
 * const lookup = createStateLookup(vizData);
 * const caData = lookup["CA"]; // Direct O(1) access to California data
 */
function createStateLookup(data) {
  if (!data || !data.states) return {};
  
  const lookup = {};
  data.states.forEach(state => {
    lookup[state.state] = state;
  });
  return lookup;
}

/**
 * Load data from JSON file
 * @param {string} url - URL to JSON file
 * @returns {Promise} Promise that resolves with data
 * @example
 * loadData('./data/viz_3_data.json')
 *   .then(data => console.log('Data loaded:', data))
 *   .catch(error => console.error('Error:', error));
 */
async function loadData(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error loading data:', error);
    throw error;
  }
}

/**
 * Update summary statistics in the UI
 * @param {object} data - Full data object
 * @example
 * updateSummaryStats(vizData);
 * // Updates DOM elements with IDs: national-avg, desert-pct, desert-students
 */
function updateSummaryStats(data) {
  if (!data || !data.summary) return;
  
  const nationalAvgEl = document.getElementById('national-avg');
  const desertPctEl = document.getElementById('desert-pct');
  const desertStudentsEl = document.getElementById('desert-students');
  
  if (nationalAvgEl) {
    nationalAvgEl.textContent = data.summary.national_avg;
  }
  
  if (desertPctEl) {
    const desertPct = Math.round((data.summary.desert_states / data.summary.total_states) * 100);
    desertPctEl.innerHTML = `${desertPct}<small>%</small>`;
  }
  
  if (desertStudentsEl) {
    desertStudentsEl.textContent = formatNumberShort(data.summary.desert_students);
  }
}

/**
 * Log comprehensive statistics to console
 * @param {object} data - Full data object
 * @example
 * logStatistics(vizData);
 * // Logs category breakdowns, top/bottom states, etc. to console
 */
function logStatistics(data) {
  if (!data) return;
  
  console.log('=== Book Desert Index Statistics ===');
  console.log(`National Average: ${data.summary.national_avg} books/student`);
  console.log(`Total States: ${data.summary.total_states}`);
  console.log(`Desert States: ${data.summary.desert_states}`);
  console.log(`Students in Deserts: ${formatNumber(data.summary.desert_students)}`);
  
  console.log('\n=== Category Breakdown ===');
  ['desert', 'moderate', 'adequate', 'excellent'].forEach(category => {
    const stats = getCategoryStats(data, category);
    console.log(`${category.toUpperCase()}: ${stats.count} states, ${formatNumber(Math.round(stats.total_students))} students`);
  });
  
  console.log('\n=== Top 5 States ===');
  getTopStates(data, 5).forEach((state, i) => {
    console.log(`${i + 1}. ${state.state}: ${state.books_per_student} books/student`);
  });
  
  console.log('\n=== Bottom 5 States ===');
  getBottomStates(data, 5).forEach((state, i) => {
    console.log(`${i + 1}. ${state.state}: ${state.books_per_student} books/student`);
  });
}

// Export functions for use in other modules (if using module system)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    getStateCode,
    getStateName,
    formatNumber,
    formatNumberShort,
    getCategoryColor,
    getCategoryInfo,
    createTooltipContent,
    showTooltip,
    hideTooltip,
    getStatesByCategory,
    getCategoryStats,
    sortStatesByAccess,
    getTopStates,
    getBottomStates,
    createStateLookup,
    loadData,
    updateSummaryStats,
    logStatistics,
    STATE_NAME_TO_CODE,
    STATE_CODE_TO_NAME
  };
}

// Make functions available globally for visualization3.js
if (typeof window !== 'undefined') {
  window.getStateCode = getStateCode;
  window.getStateName = getStateName;
  window.formatNumber = formatNumber;
  window.formatNumberShort = formatNumberShort;
  window.getCategoryColor = getCategoryColor;
  window.getCategoryInfo = getCategoryInfo;
  window.createTooltipContent = createTooltipContent;
  window.showTooltip = showTooltip;
  window.hideTooltip = hideTooltip;
  window.getStatesByCategory = getStatesByCategory;
  window.getCategoryStats = getCategoryStats;
  window.sortStatesByAccess = sortStatesByAccess;
  window.getTopStates = getTopStates;
  window.getBottomStates = getBottomStates;
  window.createStateLookup = createStateLookup;
  window.loadData = loadData;
  window.updateSummaryStats = updateSummaryStats;
  window.logStatistics = logStatistics;
}
