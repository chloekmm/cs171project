// ========================================
// VISUALIZATION 4: College Graduation Prediction Model
// Multi-factor prediction based on reading scores, SES, state, and inequality
// ========================================

export async function renderLiteracyOutcomesScatter({
  container,
  defaultMetric = 'HS Graduation',
  avatarState = null
} = {}) {
  if (!container) throw new Error('renderLiteracyOutcomesScatter: container is required');
  
  const containerEl = typeof container === 'string' ? document.querySelector(container) : container;
  if (!containerEl) throw new Error('Container element not found');
  containerEl.innerHTML = '';
  
  const containerSel = d3.select(containerEl);
  
  // Get CSS variables
  const css = getComputedStyle(document.documentElement);
  const paper = css.getPropertyValue('--paper')?.trim() || '#efe6da';
  const ink = css.getPropertyValue('--ink')?.trim() || '#111';
  
  // Get avatar data from localStorage
  let avatarData = { state: 'CA', grade: 4, ses: 'medium', name: 'Student' };
  try {
    const stored = localStorage.getItem('characterData');
    if (stored) {
      const parsed = JSON.parse(stored);
      avatarData = {
        state: parsed.state || 'CA',
        grade: parseInt(parsed.grade) || 4,
        ses: parsed.ses || 'medium',
        name: parsed.name || 'Student'
      };
    }
  } catch (e) {
    console.warn('Could not load avatar data:', e);
  }
  
  // Override with passed avatar state if provided
  if (avatarState) {
    avatarData.state = avatarState;
  }
  
  console.log('👤 Avatar data:', avatarData);
  
  // Show loading
  const loading = containerSel.append('div')
    .style('text-align', 'center')
    .style('padding', '40px')
    .style('font-family', '"IBM Plex Mono", monospace')
    .style('color', ink)
    .text('Loading prediction model...');
  
  // Load all data files
  try {
    const [collegeGradData, giniData, incomeData, naepData] = await Promise.all([
      d3.csv('data/college-graduation-rates-by-state-2025.csv'),
      d3.csv('data/2019_state_gini_index.csv'),
      d3.csv('data/college_grad_by_family_income.csv'),
      fetch('data/naep_cleaned.json').then(r => r.json())
    ]);
    
    loading.remove();
    
    console.log('✅ All data loaded');
    
    // Process data into lookup maps
    const stateGradRates = new Map();
    collegeGradData.forEach(row => {
      if (row.state && row.College_2023) {
        const stateCode = getStateCode(row.state);
        if (stateCode) {
          stateGradRates.set(stateCode, parseFloat(row.College_2023));
        }
      }
    });
    
    const stateGini = new Map();
    giniData.forEach(row => {
      if (row.State && row.Gini) {
        const stateCode = getStateCode(row.State);
        if (stateCode) {
          stateGini.set(stateCode, parseFloat(row.Gini));
        }
      }
    });
    
    // Income quartile effects (from most recent cohort 2012/2017)
    const latestCohort = incomeData[incomeData.length - 1];
    const incomeEffects = {
      'low': parseFloat(latestCohort['First (Lowest) Income Quartile'].replace('%', '')),
      'medium': (parseFloat(latestCohort['Second Income Quartile'].replace('%', '')) + 
                 parseFloat(latestCohort['Third Income Quartile'].replace('%', ''))) / 2,
      'high': parseFloat(latestCohort['Fourth (Highest) Income Quartile'].replace('%', ''))
    };
    
    console.log('📊 Income quartile effects:', incomeEffects);
    
    // Get NAEP score for avatar
    const gradeKey = `grade${avatarData.grade}`;
    const gradeData = naepData[gradeKey];
    let avatarScore = null;
    
    if (gradeData && gradeData.states && gradeData.states[avatarData.state]) {
      const years = gradeData.years.sort((a, b) => b - a);
      const latestYear = String(years[0]);
      avatarScore = gradeData.states[avatarData.state][latestYear];
      
      // Apply SES adjustment
      const sesGap = 18;
      if (avatarData.ses === 'low') avatarScore -= sesGap;
      else if (avatarData.ses === 'high') avatarScore += sesGap;
    }
    
    console.log('📚 Avatar reading score:', avatarScore);
    
    // Build prediction model
    const baseRate = stateGradRates.get(avatarData.state) || 35;
    const giniScore = stateGini.get(avatarData.state) || 0.48;
    const incomeEffect = incomeEffects[avatarData.ses] || incomeEffects.medium;
    
    // Prediction formula
    const readingAdjustment = avatarScore ? ((avatarScore - 240) / 10) * 2 : 0;
    const incomeModifier = (incomeEffect / 50);
    const giniPenalty = (giniScore - 0.45) * 10;
    
    const predictedRate = baseRate + readingAdjustment + (baseRate * (incomeModifier - 1)) - giniPenalty;
    const finalPrediction = Math.max(15, Math.min(75, predictedRate));
    
    console.log('🎯 Prediction factors:', {
      baseRate,
      readingAdjustment,
      incomeModifier,
      giniPenalty,
      finalPrediction
    });
    
    // Render visualization
    renderPredictionViz({
      containerSel,
      avatarData,
      baseRate,
      readingAdjustment,
      incomeEffect,
      giniScore,
      giniPenalty,
      finalPrediction,
      avatarScore,
      paper,
      ink,
      stateGradRates,
      stateGini,
      incomeEffects,
      naepData,
      gradeData
    });
    
  } catch (error) {
    console.error('❌ Error loading data:', error);
    loading.text(`Error: ${error.message}`).style('color', '#c0392b');
  }
}

// Helper function to convert state names to codes
function getStateCode(stateName) {
  const map = {
    'Alabama': 'AL', 'Alaska': 'AK', 'Arizona': 'AZ', 'Arkansas': 'AR',
    'California': 'CA', 'Colorado': 'CO', 'Connecticut': 'CT', 'Delaware': 'DE',
    'Florida': 'FL', 'Georgia': 'GA', 'Hawaii': 'HI', 'Idaho': 'ID',
    'Illinois': 'IL', 'Indiana': 'IN', 'Iowa': 'IA', 'Kansas': 'KS',
    'Kentucky': 'KY', 'Louisiana': 'LA', 'Maine': 'ME', 'Maryland': 'MD',
    'Massachusetts': 'MA', 'Michigan': 'MI', 'Minnesota': 'MN', 'Mississippi': 'MS',
    'Missouri': 'MO', 'Montana': 'MT', 'Nebraska': 'NE', 'Nevada': 'NV',
    'New Hampshire': 'NH', 'New Jersey': 'NJ', 'New Mexico': 'NM', 'New York': 'NY',
    'North Carolina': 'NC', 'North Dakota': 'ND', 'Ohio': 'OH', 'Oklahoma': 'OK',
    'Oregon': 'OR', 'Pennsylvania': 'PA', 'Rhode Island': 'RI', 'South Carolina': 'SC',
    'South Dakota': 'SD', 'Tennessee': 'TN', 'Texas': 'TX', 'Utah': 'UT',
    'Vermont': 'VT', 'Virginia': 'VA', 'Washington': 'WA', 'West Virginia': 'WV',
    'Wisconsin': 'WI', 'Wyoming': 'WY', 'District of Columbia': 'DC'
  };
  return map[stateName] || null;
}

function getStateName(stateCode) {
  const map = {
    'AL': 'Alabama', 'AK': 'Alaska', 'AZ': 'Arizona', 'AR': 'Arkansas',
    'CA': 'California', 'CO': 'Colorado', 'CT': 'Connecticut', 'DE': 'Delaware',
    'FL': 'Florida', 'GA': 'Georgia', 'HI': 'Hawaii', 'ID': 'Idaho',
    'IL': 'Illinois', 'IN': 'Indiana', 'IA': 'Iowa', 'KS': 'Kansas',
    'KY': 'Kentucky', 'LA': 'Louisiana', 'ME': 'Maine', 'MD': 'Maryland',
    'MA': 'Massachusetts', 'MI': 'Michigan', 'MN': 'Minnesota', 'MS': 'Mississippi',
    'MO': 'Missouri', 'MT': 'Montana', 'NE': 'Nebraska', 'NV': 'Nevada',
    'NH': 'New Hampshire', 'NJ': 'New Jersey', 'NM': 'New Mexico', 'NY': 'New York',
    'NC': 'North Carolina', 'ND': 'North Dakota', 'OH': 'Ohio', 'OK': 'Oklahoma',
    'OR': 'Oregon', 'PA': 'Pennsylvania', 'RI': 'Rhode Island', 'SC': 'South Carolina',
    'SD': 'South Dakota', 'TN': 'Tennessee', 'TX': 'Texas', 'UT': 'Utah',
    'VT': 'Vermont', 'VA': 'Virginia', 'WA': 'Washington', 'WV': 'West Virginia',
    'WI': 'Wisconsin', 'WY': 'Wyoming', 'DC': 'District of Columbia'
  };
  return map[stateCode] || stateCode;
}

// Render the prediction visualization
function renderPredictionViz({
  containerSel,
  avatarData,
  baseRate,
  readingAdjustment,
  incomeEffect,
  giniScore,
  giniPenalty,
  finalPrediction,
  avatarScore,
  paper,
  ink,
  stateGradRates,
  stateGini,
  incomeEffects,
  naepData,
  gradeData
}) {
  // Create wrapper - minimal padding
  const wrapper = containerSel.append('div')
    .style('font-family', 'Inter, system-ui')
    .style('max-width', '1100px')
    .style('margin', '0 auto')
    .style('padding', '10px');
  
  // Title - compact
  wrapper.append('div')
    .style('text-align', 'center')
    .style('font-size', '20px')
    .style('font-weight', 'bold')
    .style('font-family', 'Anton, Impact, system-ui')
    .style('color', ink)
    .style('margin-bottom', '4px')
    .text('COLLEGE GRADUATION PREDICTION');
  
  wrapper.append('div')
    .style('text-align', 'center')
    .style('font-size', '12px')
    .style('color', '#666')
    .style('margin-bottom', '12px')
    .style('font-family', '"IBM Plex Mono", monospace')
    .text(`For ${avatarData.name} • ${avatarData.state} • Grade ${avatarData.grade} • ${avatarData.ses.toUpperCase()} SES`);
  
  // Big prediction result - compact padding
  const resultCard = wrapper.append('div')
    .style('background', '#fff')
    .style('border', `3px solid ${ink}`)
    .style('border-radius', '8px')
    .style('padding', '20px 15px')
    .style('text-align', 'center')
    .style('color', ink)
    .style('margin-bottom', '8px')
    .style('box-shadow', `4px 4px 0 ${ink}`);
  
  resultCard.append('div')
    .style('font-size', '12px')
    .style('color', '#666')
    .style('margin-bottom', '12px')
    .style('font-family', '"IBM Plex Mono", monospace')
    .style('font-weight', '600')
    .style('letter-spacing', '0.5px')
    .text('PREDICTED COLLEGE GRADUATION LIKELIHOOD');
  
  // Animated dot visualization container - minimal margins
  const dotContainer = resultCard.append('div')
    .style('margin', '8px 0')
    .style('position', 'relative');
  
  // Create SVG for dots - compact spacing
  const dotsPerRow = 10;
  const totalDots = 100;
  const dotRadius = 6;
  const dotSpacing = 35; // Reduced from 45
  const startX = 15;
  const startY = 10;
  
  // Calculate needed height: 10 rows × 35px spacing + minimal padding
  const svgHeight = startY + (10 * dotSpacing) + 10; // 10px bottom padding
  const svgWidth = startX + (10 * dotSpacing) + 10; // 10px right padding
  
  const dotSvg = dotContainer.append('svg')
    .attr('width', '100%')
    .attr('height', svgHeight)
    .attr('viewBox', `0 0 ${svgWidth} ${svgHeight}`)
    .attr('preserveAspectRatio', 'xMidYMid meet')
    .style('max-width', '500px')
    .style('margin', '0 auto')
    .style('display', 'block');
  
  const filledDots = Math.round(finalPrediction);
  
  // Create all dots
  const dots = [];
  for (let i = 0; i < totalDots; i++) {
    const row = Math.floor(i / dotsPerRow);
    const col = i % dotsPerRow;
    const x = startX + col * dotSpacing;
    const y = startY + row * dotSpacing;
    dots.push({ x, y, filled: i < filledDots, index: i });
  }
  
  // Draw dots - start invisible
  const dotGroup = dotSvg.selectAll('circle')
    .data(dots)
    .enter()
    .append('circle')
    .attr('cx', d => d.x)
    .attr('cy', d => d.y)
    .attr('r', 0)
    .attr('fill', '#e0e0e0')
    .attr('stroke', ink)
    .attr('stroke-width', 1.5)
    .attr('opacity', 0);
  
  // Percentage text below dots (initially hidden) - create before animation function
  const percentText = resultCard.append('div')
    .style('font-size', '40px')
    .style('font-weight', 'bold')
    .style('margin-top', '6px')
    .style('color', ink)
    .style('opacity', 0)
    .text(`${finalPrediction.toFixed(0)}%`);
  
  // Start animation when modal becomes visible (not when context modal is showing)
  function startAnimation() {
    const modal = document.getElementById('gradcapModal');
    if (!modal || !modal.classList.contains('active')) {
      // Modal not visible yet, try again
      setTimeout(startAnimation, 100);
      return;
    }
    
    // Modal is visible, start animation
    // Animate dots appearing
    dotGroup
      .transition()
      .delay((d, i) => i * 10) // Faster stagger
      .duration(150)
      .attr('r', dotRadius)
      .attr('opacity', 1)
      .on('end', function() {
        // After all dots appear, fill the appropriate ones
        dotGroup.filter(d => d.filled)
          .transition()
          .delay((d, i) => i * 15)
          .duration(200)
          .attr('fill', '#3498db')
          .attr('stroke-width', 2);
        
        // Show percentage text
        percentText
          .transition()
          .delay(filledDots * 15 + 200)
          .duration(400)
          .style('opacity', 1);
      });
  }
  
  // Start animation check - waits for modal to be visible
  startAnimation();
  
  // Footnote explaining the prediction - compact
  wrapper.append('div')
    .style('font-size', '10px')
    .style('color', '#888')
    .style('text-align', 'center')
    .style('font-family', '"IBM Plex Mono", monospace')
    .style('font-style', 'italic')
    .style('margin-bottom', '15px')
    .style('margin-top', '4px')
    .html(`Based on ${avatarData.state} baseline, reading score, ${avatarData.ses} SES, and state inequality`);
  
  // REPLACED: State Comparison Scatter Plot (instead of visual breakdown)
  wrapper.append('div')
    .style('margin-top', '20px')
    .style('margin-bottom', '10px')
    .style('font-size', '18px')
    .style('font-weight', 'bold')
    .style('font-family', 'Anton, Impact, system-ui')
    .style('color', ink)
    .text('ALL STATES: PREDICTED GRADUATION RATES');
  
  wrapper.append('div')
    .style('font-size', '11px')
    .style('color', '#666')
    .style('margin-bottom', '12px')
    .style('font-family', '"IBM Plex Mono", monospace')
    .text('See how reading scores predict college outcomes across all states. Filter by socioeconomic status to see disparities.');
  
  // Create scatter plot container - compact
  const scatterContainer = wrapper.append('div')
    .attr('id', 'state-scatter-container')
    .style('background', '#fff')
    .style('border', `3px solid ${ink}`)
    .style('border-radius', '8px')
    .style('padding', '15px 12px')
    .style('margin-bottom', '15px');
  
  // SES filter buttons - compact
  const buttonGroup = scatterContainer.append('div')
    .style('display', 'flex')
    .style('gap', '8px')
    .style('justify-content', 'center')
    .style('margin-bottom', '12px')
    .style('flex-wrap', 'wrap');
  
  const sesOptions = [
    { value: 'low', label: 'Low SES' },
    { value: 'medium', label: 'Medium SES' },
    { value: 'high', label: 'High SES' }
  ];
  
  let currentSES = avatarData.ses;
  
  // Function to calculate prediction for a state at a given SES level
  function calculateStatePrediction(stateCode, sesLevel, literacyScore) {
    const baseRate = stateGradRates.get(stateCode) || 35;
    const gini = stateGini.get(stateCode) || 0.48;
    const income = incomeEffects[sesLevel] || incomeEffects.medium;
    
    const readingAdj = literacyScore ? ((literacyScore - 240) / 10) * 2 : 0;
    const incomeMod = (income / 50);
    const giniPen = (gini - 0.45) * 10;
    
    const predicted = baseRate + readingAdj + (baseRate * (incomeMod - 1)) - giniPen;
    return Math.max(15, Math.min(75, predicted));
  }
  
  // Function to render scatter plot
  async function renderScatterPlot(selectedSES) {
    // Clear previous scatter
    d3.select('#scatter-svg').remove();
    
    // Prepare data for all states
    const sesGap = 18;
    const stateScores = [];
    
    // Get all state codes
    const stateCodes = Object.keys(gradeData.states || {});
    const years = gradeData.years.sort((a, b) => b - a);
    const latestYear = String(years[0]);
    
    stateCodes.forEach(stateCode => {
      let baseScore = gradeData.states[stateCode][latestYear];
      if (!baseScore) return;
      
      // Apply SES adjustment
      let adjustedScore = baseScore;
      if (selectedSES === 'low') adjustedScore -= sesGap;
      else if (selectedSES === 'high') adjustedScore += sesGap;
      
      const prediction = calculateStatePrediction(stateCode, selectedSES, adjustedScore);
      
      stateScores.push({
        state: stateCode,
        literacyScore: adjustedScore,
        prediction: prediction,
        isAvatar: stateCode === avatarData.state
      });
    });
    
    console.log(`📊 Prepared ${stateScores.length} states for scatter plot (SES: ${selectedSES})`);
    
    // Update button styles
    buttonGroup.selectAll('button')
      .style('background', function() {
        return d3.select(this).attr('data-ses') === selectedSES ? ink : paper;
      })
      .style('color', function() {
        return d3.select(this).attr('data-ses') === selectedSES ? paper : ink;
      });
    
    // Create SVG
    const scatterWidth = 1000;
    const scatterHeight = 500;
    const margin = { top: 40, right: 160, bottom: 60, left: 70 };
    const innerWidth = scatterWidth - margin.left - margin.right;
    const innerHeight = scatterHeight - margin.top - margin.bottom;
    
    const svg = scatterContainer.append('svg')
      .attr('id', 'scatter-svg')
      .attr('width', scatterWidth)
      .attr('height', scatterHeight)
      .style('display', 'block')
      .style('margin', '0 auto');
    
    const g = svg.append('g')
      .attr('transform', `translate(${margin.left}, ${margin.top})`);
    
    // Scales
    const xScale = d3.scaleLinear()
      .domain([200, 300])
      .range([0, innerWidth]);
    
    const yScale = d3.scaleLinear()
      .domain([15, 75])
      .range([innerHeight, 0]);
    
    // Axes
    const xAxis = d3.axisBottom(xScale)
      .ticks(10)
      .tickFormat(d => d);
    
    const yAxis = d3.axisLeft(yScale)
      .ticks(8)
      .tickFormat(d => d + '%');
    
    g.append('g')
      .attr('transform', `translate(0, ${innerHeight})`)
      .call(xAxis)
      .selectAll('text')
      .style('font-family', '"IBM Plex Mono", monospace')
      .style('font-size', '11px');
    
    g.append('g')
      .call(yAxis)
      .selectAll('text')
      .style('font-family', '"IBM Plex Mono", monospace')
      .style('font-size', '11px');
    
    // Axis labels
    g.append('text')
      .attr('x', innerWidth / 2)
      .attr('y', innerHeight + 45)
      .attr('text-anchor', 'middle')
      .attr('font-size', '13px')
      .attr('font-weight', '600')
      .attr('font-family', '"IBM Plex Mono", monospace')
      .attr('fill', ink)
      .text('Reading Literacy Score (NAEP)');
    
    g.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('x', -innerHeight / 2)
      .attr('y', -50)
      .attr('text-anchor', 'middle')
      .attr('font-size', '13px')
      .attr('font-weight', '600')
      .attr('font-family', '"IBM Plex Mono", monospace')
      .attr('fill', ink)
      .text('Predicted College Graduation Rate (%)');
    
    // Trend line
    const xMean = d3.mean(stateScores, d => d.literacyScore);
    const yMean = d3.mean(stateScores, d => d.prediction);
    
    let numerator = 0;
    let denominator = 0;
    stateScores.forEach(d => {
      numerator += (d.literacyScore - xMean) * (d.prediction - yMean);
      denominator += Math.pow(d.literacyScore - xMean, 2);
    });
    
    const slope = numerator / denominator;
    const intercept = yMean - slope * xMean;
    
    const trendLine = d3.line()
      .x(d => xScale(d))
      .y(d => yScale(slope * d + intercept));
    
    g.append('path')
      .datum([200, 300])
      .attr('d', trendLine)
      .attr('stroke', '#e74c3c')
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', '8,4')
      .attr('fill', 'none')
      .attr('opacity', 0.7);
    
    // Tooltip
    const tooltip = d3.select('body').selectAll('.viz4-pred-tooltip').data([0]);
    const tooltipEnter = tooltip.enter().append('div').attr('class', 'viz4-pred-tooltip');
    const tooltipMerged = tooltipEnter.merge(tooltip)
      .style('position', 'absolute')
      .style('visibility', 'hidden')
      .style('background', '#fff')
      .style('border', `2px solid ${ink}`)
      .style('border-radius', '6px')
      .style('padding', '10px')
      .style('font-family', '"IBM Plex Mono", monospace')
      .style('font-size', '12px')
      .style('pointer-events', 'none')
      .style('z-index', '10000')
      .style('box-shadow', '0 2px 8px rgba(0,0,0,0.2)');
    
    // Plot points
    g.selectAll('circle.state-point')
      .data(stateScores)
      .enter()
      .append('circle')
      .attr('class', 'state-point')
      .attr('cx', d => xScale(d.literacyScore))
      .attr('cy', d => yScale(d.prediction))
      .attr('r', 7)
      .attr('fill', d => {
        if (d.prediction > 45) return '#3498db'; // Blue - high
        if (d.prediction > 30) return '#f39c12'; // Orange - medium
        return '#e74c3c'; // Red - low
      })
      .attr('stroke', d => d.isAvatar ? '#000' : ink)
      .attr('stroke-width', d => d.isAvatar ? 3 : 1.5)
      .attr('opacity', 0.8)
      .style('cursor', 'pointer')
      .on('mouseover', function(event, d) {
        d3.select(this)
          .attr('opacity', 1)
          .attr('stroke-width', 3)
          .attr('r', 9);
        
        tooltipMerged
          .style('visibility', 'visible')
          .html(`
            <strong>${getStateName(d.state)}</strong> ${d.isAvatar ? '(Your State)' : ''}<br/>
            Literacy Score: <strong>${d.literacyScore.toFixed(0)}</strong><br/>
            Predicted Grad Rate: <strong>${d.prediction.toFixed(1)}%</strong><br/>
            SES: <strong>${selectedSES.toUpperCase()}</strong>
          `);
      })
      .on('mousemove', function(event) {
        tooltipMerged
          .style('top', (event.pageY - 10) + 'px')
          .style('left', (event.pageX + 10) + 'px');
      })
      .on('mouseout', function(event, d) {
        d3.select(this)
          .attr('opacity', 0.8)
          .attr('stroke-width', d => d.isAvatar ? 3 : 1.5)
          .attr('r', 7);
        
        tooltipMerged.style('visibility', 'hidden');
      });
    
    // Highlight avatar state
    const avatarPoint = stateScores.find(d => d.isAvatar);
    if (avatarPoint) {
      g.append('circle')
        .attr('cx', xScale(avatarPoint.literacyScore))
        .attr('cy', yScale(avatarPoint.prediction))
        .attr('r', 12)
        .attr('fill', 'none')
        .attr('stroke', '#000')
        .attr('stroke-width', 2)
        .attr('stroke-dasharray', '5,3');
      
      // Get state name and measure approximate width
      const stateName = getStateName(avatarPoint.state).toUpperCase();
      const charCount = stateName.length;
      const labelWidth = Math.max(80, charCount * 7 + 20); // Dynamic width based on text length
      
      // Label background (oval shape)
      g.append('rect')
        .attr('x', xScale(avatarPoint.literacyScore) - labelWidth/2)
        .attr('y', yScale(avatarPoint.prediction) - 30)
        .attr('width', labelWidth)
        .attr('height', 22)
        .attr('rx', 11)
        .attr('fill', '#fff')
        .attr('stroke', '#111')
        .attr('stroke-width', 2)
        .attr('filter', 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))');
      
      // Label text
      g.append('text')
        .attr('x', xScale(avatarPoint.literacyScore))
        .attr('y', yScale(avatarPoint.prediction) - 18)
        .attr('text-anchor', 'middle')
        .attr('font-size', '11px')
        .attr('font-weight', 'bold')
        .attr('font-family', '"IBM Plex Mono", monospace')
        .attr('fill', ink)
        .text(stateName);
    }
    
    // Legend
    const legendData = [
      { label: 'High (>45%)', color: '#3498db' },
      { label: 'Medium (30-45%)', color: '#f39c12' },
      { label: 'Low (<30%)', color: '#e74c3c' }
    ];
    
    const legend = svg.append('g')
      .attr('transform', `translate(${innerWidth + 20}, 50)`);
    
    // Legend title
    legend.append('text')
      .attr('x', 0)
      .attr('y', -5)
      .attr('font-size', '12px')
      .attr('font-weight', 'bold')
      .attr('font-family', '"IBM Plex Mono", monospace')
      .attr('fill', ink)
      .text('PREDICTED RATE');
    
    legendData.forEach((item, i) => {
      const legendRow = legend.append('g')
        .attr('transform', `translate(0, ${i * 25 + 15})`);
      
      legendRow.append('circle')
        .attr('cx', 8)
        .attr('cy', 0)
        .attr('r', 6)
        .attr('fill', item.color)
        .attr('stroke', ink)
        .attr('stroke-width', 1);
      
      legendRow.append('text')
        .attr('x', 20)
        .attr('y', 0)
        .attr('dy', '0.35em')
        .attr('font-size', '11px')
        .attr('font-family', '"IBM Plex Mono", monospace')
        .attr('fill', ink)
        .text(item.label);
    });
  }
  
  // Create SES filter buttons
  sesOptions.forEach(option => {
    buttonGroup.append('button')
      .attr('data-ses', option.value)
      .style('padding', '10px 24px')
      .style('border', `2px solid ${ink}`)
      .style('border-radius', '6px')
      .style('font-family', '"IBM Plex Mono", monospace')
      .style('font-size', '13px')
      .style('font-weight', '600')
      .style('cursor', 'pointer')
      .style('transition', 'all 0.2s')
      .style('background', option.value === currentSES ? ink : paper)
      .style('color', option.value === currentSES ? paper : ink)
      .text(option.label)
      .on('click', function() {
        currentSES = option.value;
        renderScatterPlot(currentSES);
      });
  });
  
  // Initial render
  renderScatterPlot(currentSES);
  
  // Explanation
  wrapper.append('div')
    .style('margin-top', '30px')
    .style('padding', '20px')
    .style('background', '#fff')
    .style('border', `3px solid ${ink}`)
    .style('border-radius', '8px')
    .style('font-size', '13px')
    .style('line-height', '1.7')
    .style('box-shadow', '4px 4px 0 rgba(0,0,0,0.1)')
    .html(`
      <strong style="font-family: 'IBM Plex Mono', monospace; font-size: 14px; letter-spacing: 0.5px;">📊 ABOUT THIS PREDICTION</strong><br/><br/>
      This model combines multiple research-backed factors:<br/>
      • <strong>State baseline</strong>: Historical college completion rate for ${avatarData.state}<br/>
      • <strong>Reading proficiency</strong>: Students with higher NAEP scores have significantly better college outcomes<br/>
      • <strong>Socioeconomic status</strong>: Income quartile strongly predicts college completion (${avatarData.ses} SES)<br/>
      • <strong>State inequality</strong>: Higher Gini index correlates with lower educational mobility<br/><br/>
      <strong>What the scatter plot shows:</strong> Each dot represents a state's predicted college graduation rate 
      based on average reading scores. Filter by SES to see how outcomes vary dramatically by socioeconomic status. 
      States with higher literacy scores generally have better predicted outcomes, but SES creates substantial disparities.<br/><br/>
      <em style="color: #666;">Note: This is an educational model showing how multiple factors interact. 
      Individual outcomes vary based on many additional factors including school quality, 
      family support, and personal determination.</em>
    `);
  
  console.log('✅ Prediction visualization rendered');
}
