// File: js/visualization1.js
// Purpose: Interactive horizontal gauge where user picks predicted score using a SLIDER, then reveals actual NAEP reading score
// Optimized: Uses local data, slider for intuitive UX, shows state score context for benchmarking

// Cache for NAEP data
let naepDataCache = null;

/**
 * Load NAEP data from local JSON file
 */
async function loadNAEPData() {
  if (naepDataCache) {
    console.log('✅ Using cached NAEP data for viz1');
    return naepDataCache;
  }
  
  console.log('📊 Loading NAEP data for viz1...');
  const response = await fetch('data/naep_cleaned.json');
  if (!response.ok) {
    throw new Error(`Failed to load NAEP data: ${response.status}`);
  }
  
  const data = await response.json();
  naepDataCache = data;
  console.log('✅ NAEP data loaded and cached for viz1');
  return data;
}

/**
 * Get score for specific state, grade, and SES
 */
async function getStateScore(state, grade, ses) {
  const data = await loadNAEPData();
  const gradeKey = `grade${grade}`;
  const gradeData = data[gradeKey];
  
  if (!gradeData || !gradeData.states || !gradeData.states[state]) {
    console.warn(`⚠️ No data found for ${state}, grade ${grade}`);
    return null;
  }
  
  // Get the latest year's data
  const years = gradeData.years.sort((a, b) => b - a);
  const latestYear = String(years[0]);
  const stateScores = gradeData.states[state];
  const score = stateScores[latestYear];
  
  if (!score) {
    console.warn(`⚠️ No score found for ${state}, grade ${grade}, year ${latestYear}`);
    return null;
  }
  
  // Apply SES adjustment (typical gap is about 18 points)
  const sesGap = 18;
  let adjustedScore = score;
  
  if (ses === 'Low') {
    adjustedScore = score - sesGap;
  } else if (ses === 'High') {
    adjustedScore = score + sesGap;
  }
  
  return adjustedScore;
}

/**
 * Get national average for grade
 */
async function getNationalAverage(grade) {
  const data = await loadNAEPData();
  const gradeKey = `grade${grade}`;
  const gradeData = data[gradeKey];
  
  if (!gradeData || !gradeData.nationalAvg) {
    return null;
  }
  
  const years = gradeData.years.sort((a, b) => b - a);
  const latestYear = String(years[0]);
  return gradeData.nationalAvg[latestYear] || null;
}

/**
 * Get scores from multiple states for context
 */
async function getStateScoresForContext(grade, ses, count = 5) {
  const data = await loadNAEPData();
  const gradeKey = `grade${grade}`;
  const gradeData = data[gradeKey];
  
  if (!gradeData || !gradeData.states) {
    return [];
  }
  
  const years = gradeData.years.sort((a, b) => b - a);
  const latestYear = String(years[0]);
  
  // Get all state scores
  const stateScores = [];
  const sesGap = 18;
  
  for (const [stateCode, scores] of Object.entries(gradeData.states)) {
    const baseScore = scores[latestYear];
    if (baseScore != null && !isNaN(baseScore)) {
      let adjustedScore = baseScore;
      if (ses === 'Low') {
        adjustedScore = baseScore - sesGap;
      } else if (ses === 'High') {
        adjustedScore = baseScore + sesGap;
      }
      
      stateScores.push({
        state: stateCode,
        score: adjustedScore
      });
    }
  }
  
  // Sort by score
  stateScores.sort((a, b) => b.score - a.score);
  
  // Return top, middle, and bottom states
  const result = [];
  if (stateScores.length > 0) {
    // Highest
    result.push({ ...stateScores[0], label: 'Highest' });
    
    // Some middle states
    if (stateScores.length > 10) {
      const midIdx = Math.floor(stateScores.length / 2);
      result.push({ ...stateScores[midIdx], label: 'Middle' });
    }
    
    // Lowest
    result.push({ ...stateScores[stateScores.length - 1], label: 'Lowest' });
  }
  
  return result;
}

export async function renderScoreComparison({
  container,
  state,
  grade,
  ses,                  // 'Low' | 'Middle' | 'High'
  predictedScore = null, // Optional: pre-set prediction
  actualScore = null,    // Will be loaded if not provided
  nationalAverage = null, // Will be loaded if not provided
  literacy = null,      // % adults at/below Level 1 (PIAAC)
  povertyRate = null,   // % below 150% poverty
  width = 850,
  height = 280,         // Increased height for slider
  margin = { top: 20, right: 30, bottom: 50, left: 30 },
  domain = [150, 320]   // Adjusted to typical NAEP range
} = {}) {
  if (!container) throw new Error('renderScoreComparison: container is required');
  if (!state) throw new Error('renderScoreComparison: state is required');
  if (!grade) throw new Error('renderScoreComparison: grade is required');
  if (!ses) throw new Error('renderScoreComparison: ses is required');

  console.log('🎯 renderScoreComparison called with:', { state, grade, ses, actualScore, nationalAverage });

  // Load data if not provided
  try {
    if (actualScore == null) {
      console.log('📊 Loading actual score from data...');
      actualScore = await getStateScore(state, grade, ses);
      console.log('✅ Loaded actual score:', actualScore);
    }
    
    if (nationalAverage == null) {
      console.log('📊 Loading national average from data...');
      nationalAverage = await getNationalAverage(grade);
      console.log('✅ Loaded national average:', nationalAverage);
    }
    
    if (actualScore == null) {
      throw new Error(`No NAEP data available for ${state}, grade ${grade}`);
    }
  } catch (error) {
    console.error('❌ Error loading data:', error);
    throw error;
  }
  
  // Get context scores from other states
  const contextScores = await getStateScoresForContext(grade, ses);
  console.log('📊 Context scores:', contextScores);

  // Theme from CSS custom properties (paper & ink aesthetic)
  const styles = getComputedStyle(document.documentElement);
  const paper = styles.getPropertyValue('--paper')?.trim() || '#efe6da';
  const ink = styles.getPropertyValue('--ink')?.trim() || '#111';
  const muted = styles.getPropertyValue('--muted')?.trim() || '#232323';
  
  // Font families matching other visualizations
  const fontMono = '"IBM Plex Mono", ui-monospace, monospace';
  const fontTitle = 'Anton, sans-serif';

  // Clear container for re-render
  const root = d3.select(container);
  root.selectAll('*').remove();

  // Outer wrapper
  const wrap = root.append('div')
    .attr('class', 'score-gauge-wrap')
    .style('position', 'relative')
    .style('width', '100%');

  // Score meaning explanation banner
  const explanationBanner = wrap.append('div')
    .style('margin-bottom', '12px')
    .style('padding', '10px 14px')
    .style('background', '#e8f4f8')
    .style('border', `2px solid #3498db`)
    .style('border-radius', '4px')
    .style('font-family', fontMono)
    .style('font-size', '12px')
    .style('color', ink)
    .style('line-height', '1.5')
    .html(`
      <strong>NAEP Score Guide:</strong> Scores range from 0-500. 
      <span style="color: #c0392b; font-weight: 600;">150-199 = Below Basic</span>, 
      <span style="color: #e67e22; font-weight: 600;">200-237 = Basic</span>, 
      <span style="color: #27ae60; font-weight: 600;">238-267 = Proficient</span>, 
      <span style="color: #2980b9; font-weight: 600;">268+ = Advanced</span>
    `);

  // Context scores banner
  if (contextScores.length > 0) {
    const contextBanner = wrap.append('div')
      .style('margin-bottom', '16px')
      .style('padding', '12px 14px')
      .style('background', '#fff3cd')
      .style('border', `2px solid #f1c40f`)
      .style('border-radius', '4px')
      .style('font-family', fontMono)
      .style('font-size', '11px')
      .style('color', ink)
      .style('line-height', '1.6');
    
    const contextHTML = contextScores.map(c => 
      `<span style="font-weight: 600;">${c.label}: ${c.state}</span> <span style="color: ${muted};">(${Math.round(c.score)})</span>`
    ).join(' • ');
    
    contextBanner.html(`<strong>State Benchmarks (Grade ${grade}, ${ses} SES):</strong> ${contextHTML}`);
  }

  // Instruction banner
  const instruction = wrap.append('div')
    .style('margin-bottom', '16px')
    .style('padding', '12px 16px')
    .style('background', '#f7efe6')
    .style('border', `2px solid ${ink}`)
    .style('border-radius', '4px')
    .style('font-family', fontMono)
    .style('font-size', '14px')
    .style('font-weight', '600')
    .style('color', ink)
    .style('text-align', 'center')
    .style('box-shadow', '3px 3px 0 rgba(0,0,0,0.1)')
    .text(`Use the slider below to predict ${state}'s Grade ${grade} reading score`);

  // Placeholder for controls (will be inserted here after reveal)
  const controlsPlaceholder = wrap.append('div')
    .attr('id', 'controls-placeholder')
    .style('display', 'none');

  const svg = wrap.append('svg')
    .attr('viewBox', `0 0 ${width} ${height}`)
    .attr('width', '100%')
    .attr('height', 'auto')
    .attr('role', 'img')
    .attr('aria-label', `Interactive NAEP reading score prediction for ${state}, grade ${grade}, ${ses} SES`);

  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;
  const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

  // Scale & axis
  const x = d3.scaleLinear().domain(domain).nice().range([0, innerW]);
  const axis = d3.axisBottom(x).ticks(8).tickSizeOuter(0);

  // Track positioning - centered vertically
  const trackY = innerH / 2 - 20;
  const trackH = 24;
  
  // Draw axis
  const axisG = g.append('g')
    .attr('transform', `translate(0, ${trackY + trackH + 10})`)
    .call(axis);

  axisG.selectAll('text')
    .attr('font-family', fontMono)
    .attr('font-size', '13px')
    .attr('fill', muted);

  axisG.selectAll('line')
    .attr('stroke', 'rgba(0,0,0,0.15)');

  // Hide the domain line
  axisG.select('.domain')
    .attr('stroke', 'none')
    .attr('stroke-width', '0');

  // Track visual background
  const trackBg = g.append('rect')
    .attr('x', 0)
    .attr('y', trackY)
    .attr('width', innerW)
    .attr('height', trackH)
    .attr('fill', '#f7efe6')
    .attr('stroke', ink)
    .attr('stroke-width', 2)
    .attr('rx', 8)
    .attr('ry', 8)
    .style('pointer-events', 'none');

  // User's prediction (initially set to middle of range)
  let userPrediction = Math.round((domain[0] + domain[1]) / 2);
  let isRevealed = false;
  let resultText = null;

  // Main bar that fills and adjusts
  const mainBar = g.append('rect')
    .attr('x', 0)
    .attr('y', trackY + 2)
    .attr('height', trackH - 4)
    .attr('width', x(userPrediction))
    .attr('fill', ink)
    .attr('rx', 6)
    .attr('ry', 6)
    .attr('opacity', 0.85)
    .style('pointer-events', 'none');

  // Prediction marker (draggable handle)
  const predictionGroup = g.append('g')
    .attr('class', 'prediction-handle')
    .attr('transform', `translate(${x(userPrediction)}, ${trackY + trackH / 2})`);

  // Vertical line from handle
  predictionGroup.append('line')
    .attr('x1', 0)
    .attr('x2', 0)
    .attr('y1', -trackH / 2 - 15)
    .attr('y2', trackH / 2 + 15)
    .attr('stroke', '#e74c3c')
    .attr('stroke-width', 3)
    .style('pointer-events', 'none');

  // Draggable circle handle
  const predictionHandle = predictionGroup.append('circle')
    .attr('cy', 0)
    .attr('r', 12)
    .attr('fill', '#e74c3c')
    .attr('stroke', ink)
    .attr('stroke-width', 2)
    .style('cursor', 'grab');

  // Score label on handle
  const predictionLabel = predictionGroup.append('text')
    .attr('y', -trackH / 2 - 25)
    .attr('text-anchor', 'middle')
    .attr('font-family', fontMono)
    .attr('font-size', '14px')
    .attr('font-weight', '700')
    .attr('fill', '#e74c3c')
    .text(Math.round(userPrediction))
    .style('pointer-events', 'none');

  // Actual score marker (hidden until revealed)
  const actualMarker = g.append('line')
    .attr('x1', -10)
    .attr('x2', -10)
    .attr('y1', trackY - 15)
    .attr('y2', trackY + trackH + 15)
    .attr('stroke', '#3498db')
    .attr('stroke-width', 3)
    .attr('opacity', 0)
    .style('pointer-events', 'none');

  const actualDot = g.append('circle')
    .attr('cx', -10)
    .attr('cy', trackY - 15)
    .attr('r', 5)
    .attr('fill', '#3498db')
    .attr('stroke', ink)
    .attr('stroke-width', 2)
    .attr('opacity', 0)
    .style('pointer-events', 'none');

  // National average marker (dashed line - always visible)
  if (nationalAverage != null && !isNaN(nationalAverage)) {
    const nx = x(nationalAverage);
    
    g.append('line')
      .attr('x1', nx)
      .attr('x2', nx)
      .attr('y1', trackY - 15)
      .attr('y2', trackY + trackH + 15)
      .attr('stroke', muted)
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', '5 3')
      .style('pointer-events', 'none');

    g.append('path')
      .attr('d', d3.symbol().type(d3.symbolDiamond).size(80))
      .attr('transform', `translate(${nx}, ${trackY - 15})`)
      .attr('fill', muted)
      .attr('stroke', ink)
      .attr('stroke-width', 2)
      .style('pointer-events', 'none');
  }

  // Info display
  const infoDisplay = wrap.append('div')
    .style('margin-top', '16px')
    .style('margin-bottom', '12px')
    .style('font-family', fontMono)
    .style('font-size', '14px')
    .style('font-weight', '600')
    .style('color', ink)
    .style('text-align', 'center')
    .style('min-height', '24px')
    .style('padding', '8px')
    .style('background', paper)
    .style('border', `1px solid ${muted}`)
    .style('border-radius', '4px')
    .html(`<span style="color: ${muted};">Your prediction:</span> <strong style="color: #e74c3c; font-size: 20px;">${Math.round(userPrediction)}</strong>`);
  
  // Reveal button
  const buttonWrap = wrap.append('div')
    .style('margin-top', '8px')
    .style('margin-bottom', '16px')
    .style('text-align', 'center');

  const revealButton = buttonWrap.append('button')
    .style('padding', '12px 24px')
    .style('font-family', fontMono)
    .style('font-size', '13px')
    .style('font-weight', '600')
    .style('color', '#fff')
    .style('background', ink)
    .style('border', `2px solid ${ink}`)
    .style('border-radius', '4px')
    .style('cursor', 'pointer')
    .style('box-shadow', '3px 3px 0 rgba(0,0,0,0.1)')
    .style('transition', 'all 0.2s')
    .style('letter-spacing', '0.06em')
    .text('Reveal Actual Score')
    .on('mouseenter', function() {
      d3.select(this)
        .style('transform', 'translate(2px, 2px)')
        .style('box-shadow', '1px 1px 0 rgba(0,0,0,0.1)');
    })
    .on('mouseleave', function() {
      d3.select(this)
        .style('transform', 'translate(0, 0)')
        .style('box-shadow', '3px 3px 0 rgba(0,0,0,0.1)');
    })
    .on('click', revealActual);

  // ===== SLIDER FUNCTIONALITY =====
  let isDragging = false;

  // Update function for slider
  function updatePrediction(newX) {
    if (isRevealed) return; // Lock after reveal
    
    // Clamp to valid range
    newX = Math.max(0, Math.min(innerW, newX));
    const newValue = x.invert(newX);
    const clampedValue = Math.max(domain[0], Math.min(domain[1], newValue));
    userPrediction = Math.round(clampedValue);
    
    // Update bar width
    mainBar.attr('width', x(userPrediction));
    
    // Update handle position
    predictionGroup.attr('transform', `translate(${x(userPrediction)}, ${trackY + trackH / 2})`);
    
    // Update label
    predictionLabel.text(Math.round(userPrediction));
    
    // Update info display
    infoDisplay.html(`<span style="color: ${muted};">Your prediction:</span> <strong style="color: #e74c3c; font-size: 20px;">${Math.round(userPrediction)}</strong>`);
    
    // Update instruction
    instruction.text(`Your prediction: ${Math.round(userPrediction)} — Click the button below to see the actual score!`);
  }

  // Drag behavior using d3.drag
  const drag = d3.drag()
    .on('start', function(event) {
      isDragging = true;
      predictionHandle.style('cursor', 'grabbing');
    })
    .on('drag', function(event) {
      if (!isRevealed) {
        updatePrediction(event.x);
      }
    })
    .on('end', function(event) {
      isDragging = false;
      predictionHandle.style('cursor', 'grab');
    });

  predictionHandle.call(drag);

  // Also allow clicking on track to jump to position
  g.append('rect')
    .attr('x', 0)
    .attr('y', trackY - 8)
    .attr('width', innerW)
    .attr('height', trackH + 16)
    .attr('fill', 'transparent')
    .attr('cursor', 'pointer')
    .on('click', function(event) {
      if (isRevealed) return;
      const [mouseX] = d3.pointer(event, this);
      updatePrediction(mouseX);
    });

  // Reveal actual score
  function revealActual() {
    if (isRevealed) return;
    isRevealed = true;

    // Lock the handle
    predictionHandle.style('cursor', 'not-allowed');

    // Update instruction
    instruction
      .transition()
      .duration(300)
      .text('Score revealed! Compare your prediction with the actual result below.');

    // Hide reveal button
    buttonWrap
      .transition()
      .duration(200)
      .style('opacity', 0)
      .style('pointer-events', 'none')
      .remove();

    // Change bar color to blue and adjust width to actual score
    mainBar
      .transition()
      .delay(300)
      .duration(800)
      .attr('width', x(actualScore))
      .attr('fill', '#3498db');

    // Show actual marker
    actualMarker
      .transition()
      .delay(300)
      .duration(800)
      .attr('x1', x(actualScore))
      .attr('x2', x(actualScore))
      .attr('opacity', 1);

    actualDot
      .transition()
      .delay(300)
      .duration(800)
      .attr('cx', x(actualScore))
      .attr('opacity', 1);

    // Update info display with comparison
    const diff = actualScore - userPrediction;
    const diffText = diff === 0 ? 'Exact match!' : (diff > 0 ? `+${d3.format('.0f')(diff)}` : `${d3.format('.0f')(diff)}`);
    
    setTimeout(() => {
      infoDisplay.html(`
        <div style="display: flex; justify-content: center; align-items: center; gap: 20px; flex-wrap: wrap; font-family: ${fontMono};">
          <div>
            <span style="color: ${muted}; font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em;">Your prediction:</span><br>
            <strong style="color: #e74c3c; font-size: 20px;">${d3.format('.0f')(userPrediction)}</strong>
          </div>
          <div style="font-size: 20px; color: ${muted};">|</div>
          <div>
            <span style="color: ${muted}; font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em;">Actual score:</span><br>
            <strong style="color: #3498db; font-size: 20px;">${d3.format('.0f')(actualScore)}</strong>
          </div>
          <div style="font-size: 20px; color: ${muted};">|</div>
          <div>
            <span style="color: ${muted}; font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em;">Difference:</span><br>
            <strong style="color: ${diff > 0 ? '#3498db' : '#e74c3c'}; font-size: 20px;">${diffText}</strong>
          </div>
        </div>
      `);
    }, 1100);

    // Result message
    resultText = wrap.append('div')
      .style('margin-top', '8px')
      .style('font-family', fontMono)
      .style('font-size', '13px')
      .style('font-weight', '600')
      .style('color', ink)
      .style('text-align', 'center')
      .style('opacity', 0);

    if (Math.abs(diff) <= 5) {
      resultText.text('Great prediction! Very close to the actual score.');
    } else if (diff > 0) {
      resultText.text(`The actual score is ${d3.format('.0f')(diff)} points higher than your prediction.`);
    } else {
      resultText.text(`The actual score is ${d3.format('.0f')(Math.abs(diff))} points lower than your prediction.`);
    }

    resultText
      .transition()
      .delay(1200)
      .duration(300)
      .style('opacity', 1);
    
    // Store reference for update function
    window.viz1ResultText = resultText;
    
    // Add toggle controls above the bar after reveal
    setTimeout(() => {
      addToggleControls();
    }, 1500);
  }
  
  // Add toggle controls for exploring different states and grades
  async function addToggleControls() {
    if (wrap.select('#explore-controls').size() > 0) {
      return;
    }
    
    let currentState = state;
    let currentGrade = grade;
    let currentSes = ses;
    
    // Controls container
    const controlsWrap = wrap.insert('div', '#controls-placeholder')
      .attr('id', 'explore-controls')
      .style('margin-bottom', '16px')
      .style('padding', '10px 12px')
      .style('background', '#f7efe6')
      .style('border', `1.5px solid ${muted}`)
      .style('border-radius', '4px')
      .style('opacity', 0);
    
    const placeholder = wrap.select('#controls-placeholder');
    if (placeholder.size() > 0) {
      placeholder.remove();
    }
    
    controlsWrap.append('div')
      .style('font-family', fontMono)
      .style('font-size', '11px')
      .style('font-weight', '600')
      .style('color', ink)
      .style('margin-bottom', '8px')
      .style('text-transform', 'uppercase')
      .style('letter-spacing', '0.08em')
      .text('Explore different data:');
    
    const controlsRow = controlsWrap.append('div')
      .style('display', 'flex')
      .style('gap', '15px')
      .style('align-items', 'center')
      .style('flex-wrap', 'wrap');
    
    // State selector
    const stateGroup = controlsRow.append('div')
      .style('display', 'flex')
      .style('align-items', 'center')
      .style('gap', '8px');
    
    stateGroup.append('span')
      .style('font-family', fontMono)
      .style('font-size', '10px')
      .style('color', muted)
      .text('State:');
    
    const stateSelect = stateGroup.append('select')
      .style('padding', '4px 8px')
      .style('font-family', fontMono)
      .style('font-size', '11px')
      .style('border', `1.5px solid ${muted}`)
      .style('border-radius', '3px')
      .style('background', paper)
      .style('color', ink)
      .style('cursor', 'pointer');
    
    const states = [
      'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA',
      'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
      'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT',
      'VA', 'WA', 'WV', 'WI', 'WY'
    ];
    
    const stateNames = {
      'AL': 'Alabama', 'AK': 'Alaska', 'AZ': 'Arizona', 'AR': 'Arkansas', 'CA': 'California',
      'CO': 'Colorado', 'CT': 'Connecticut', 'DE': 'Delaware', 'FL': 'Florida', 'GA': 'Georgia',
      'HI': 'Hawaii', 'ID': 'Idaho', 'IL': 'Illinois', 'IN': 'Indiana', 'IA': 'Iowa',
      'KS': 'Kansas', 'KY': 'Kentucky', 'LA': 'Louisiana', 'ME': 'Maine', 'MD': 'Maryland',
      'MA': 'Massachusetts', 'MI': 'Michigan', 'MN': 'Minnesota', 'MS': 'Mississippi', 'MO': 'Missouri',
      'MT': 'Montana', 'NE': 'Nebraska', 'NV': 'Nevada', 'NH': 'New Hampshire', 'NJ': 'New Jersey',
      'NM': 'New Mexico', 'NY': 'New York', 'NC': 'North Carolina', 'ND': 'North Dakota', 'OH': 'Ohio',
      'OK': 'Oklahoma', 'OR': 'Oregon', 'PA': 'Pennsylvania', 'RI': 'Rhode Island', 'SC': 'South Carolina',
      'SD': 'South Dakota', 'TN': 'Tennessee', 'TX': 'Texas', 'UT': 'Utah', 'VT': 'Vermont',
      'VA': 'Virginia', 'WA': 'Washington', 'WV': 'West Virginia', 'WI': 'Wisconsin', 'WY': 'Wyoming'
    };
    
    stateSelect.selectAll('option')
      .data(states)
      .enter()
      .append('option')
      .attr('value', d => d)
      .property('selected', d => d === currentState)
      .text(d => `${d} - ${stateNames[d]}`);
    
    // Grade selector
    const gradeGroup = controlsRow.append('div')
      .style('display', 'flex')
      .style('align-items', 'center')
      .style('gap', '8px');
    
    gradeGroup.append('span')
      .style('font-family', fontMono)
      .style('font-size', '10px')
      .style('color', muted)
      .text('Grade:');
    
    const gradeSelect = gradeGroup.append('select')
      .style('padding', '4px 8px')
      .style('font-family', fontMono)
      .style('font-size', '11px')
      .style('border', `1.5px solid ${muted}`)
      .style('border-radius', '3px')
      .style('background', paper)
      .style('color', ink)
      .style('cursor', 'pointer');
    
    gradeSelect.selectAll('option')
      .data([4, 8])
      .enter()
      .append('option')
      .attr('value', d => d)
      .property('selected', d => d === currentGrade)
      .text(d => `Grade ${d}`);
    
    // Update function
    async function updateVisualization() {
      try {
        infoDisplay.html('Loading...');
        
        const newActualScore = await getStateScore(currentState, currentGrade, currentSes);
        const newNationalAvg = await getNationalAverage(currentGrade);
        
        if (newActualScore == null) {
          infoDisplay.html(`<span style="color: #e74c3c;">No data available for ${currentState}, Grade ${currentGrade}</span>`);
          return;
        }
        
        actualMarker
          .transition()
          .duration(500)
          .attr('x1', x(newActualScore))
          .attr('x2', x(newActualScore));
        
        actualDot
          .transition()
          .duration(500)
          .attr('cx', x(newActualScore));
        
        mainBar
          .transition()
          .duration(500)
          .attr('width', x(newActualScore));
        
        const nationalAvgLine = g.select('line[stroke-dasharray]');
        if (nationalAvgLine.size() > 0 && newNationalAvg != null) {
          const nx = x(newNationalAvg);
          nationalAvgLine
            .transition()
            .duration(500)
            .attr('x1', nx)
            .attr('x2', nx);
          
          const nationalAvgSymbol = g.select('path[d*="M"]');
          if (nationalAvgSymbol.size() > 0) {
            nationalAvgSymbol
              .transition()
              .duration(500)
              .attr('transform', `translate(${nx}, ${trackY - 15})`);
          }
        }
        
        const diff = newActualScore - userPrediction;
        const diffText = diff === 0 ? 'Exact match!' : (diff > 0 ? `+${d3.format('.0f')(diff)}` : `${d3.format('.0f')(diff)}`);
        
        infoDisplay.html(`
          <div style="display: flex; justify-content: center; align-items: center; gap: 20px; flex-wrap: wrap; font-family: ${fontMono};">
            <div>
              <span style="color: ${muted}; font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em;">Your prediction:</span><br>
              <strong style="color: #e74c3c; font-size: 20px;">${d3.format('.0f')(userPrediction)}</strong>
            </div>
            <div style="font-size: 20px; color: ${muted};">|</div>
            <div>
              <span style="color: ${muted}; font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em;">Actual score:</span><br>
              <strong style="color: #3498db; font-size: 20px;">${d3.format('.0f')(newActualScore)}</strong>
            </div>
            <div style="font-size: 20px; color: ${muted};">|</div>
            <div>
              <span style="color: ${muted}; font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em;">Difference:</span><br>
              <strong style="color: ${diff > 0 ? '#3498db' : '#e74c3c'}; font-size: 20px;">${diffText}</strong>
            </div>
          </div>
        `);
        
        if (window.viz1ContextWrap) {
          window.viz1ContextWrap
            .style('border-top', 'none')
            .style('padding-top', '0')
            .text(`${currentState} · Grade ${currentGrade} · ${currentSes} SES`);
        }
        
        if (window.viz1ResultText) {
          if (Math.abs(diff) <= 5) {
            window.viz1ResultText.text('Great prediction! Very close to the actual score.');
          } else if (diff > 0) {
            window.viz1ResultText.text(`The actual score is ${d3.format('.0f')(diff)} points higher than your prediction.`);
          } else {
            window.viz1ResultText.text(`The actual score is ${d3.format('.0f')(Math.abs(diff))} points lower than your prediction.`);
          }
        }
        
      } catch (error) {
        console.error('Error updating visualization:', error);
        infoDisplay.html(`<span style="color: #e74c3c;">Error loading data</span>`);
      }
    }
    
    stateSelect.on('change', async function() {
      currentState = this.value;
      await updateVisualization();
    });
    
    gradeSelect.on('change', async function() {
      currentGrade = parseInt(this.value);
      await updateVisualization();
    });
    
    controlsWrap
      .transition()
      .duration(300)
      .style('opacity', 1);
  }

  // Context information
  let contextWrap = wrap.append('div')
    .style('margin-top', '6px')
    .style('font-family', fontMono)
    .style('font-size', '10px')
    .style('color', muted)
    .style('text-align', 'center');

  const contextLines = [`${state} · Grade ${grade} · ${ses} SES`];
  if (literacy != null && !isNaN(literacy)) {
    contextLines.push(`Adult literacy (≤ L1): ${d3.format('.1f')(literacy)}%`);
  }
  if (povertyRate != null && !isNaN(povertyRate)) {
    contextLines.push(`Poverty ≤150%: ${d3.format('.1f')(povertyRate)}%`);
  }

  contextWrap.text(contextLines.join('  •  '));
  
  window.viz1ContextWrap = contextWrap;

  // Legend
  const legend = wrap.append('div')
    .style('margin-top', '4px')
    .style('display', 'flex')
    .style('justify-content', 'center')
    .style('gap', '15px')
    .style('font-family', fontMono)
    .style('font-size', '9px')
    .style('color', muted);

  const addLegendItem = (label, color, symbol = 'circle', dashed = false) => {
    const item = legend.append('div')
      .style('display', 'flex')
      .style('align-items', 'center')
      .style('gap', '8px');
    
    if (symbol === 'circle') {
      item.append('div')
        .style('width', '12px')
        .style('height', '12px')
        .style('border-radius', '50%')
        .style('background', color)
        .style('border', `2px solid ${ink}`)
        .style('flex-shrink', '0');
    } else if (symbol === 'diamond') {
      item.append('div')
        .style('width', '12px')
        .style('height', '12px')
        .style('background', color)
        .style('border', `2px solid ${ink}`)
        .style('transform', 'rotate(45deg)')
        .style('flex-shrink', '0');
    }
    
    if (dashed) {
      item.append('div')
        .style('width', '20px')
        .style('height', '2px')
        .style('background', `repeating-linear-gradient(to right, ${color} 0, ${color} 5px, transparent 5px, transparent 8px)`)
        .style('flex-shrink', '0');
    }
    
    item.append('span').text(label);
  };

  addLegendItem('Your prediction', '#e74c3c', 'circle');
  addLegendItem('Actual score', '#3498db', 'circle');
  if (nationalAverage != null) {
    addLegendItem('National avg', muted, 'diamond', true);
  }

  console.log('✅ Viz1 rendered successfully with slider interface');
}
