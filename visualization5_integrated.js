/**
 * FUNDING & LITERACY OUTCOMES - INTERACTIVE VISUALIZATION
 * INTEGRATED VERSION for "A Look @ Literacy" Project
 * 
 * Multi-panel visualization exploring the relationship between per-pupil
 * spending, socioeconomic status, and literacy outcomes.
 * 
 * Reads avatar data from localStorage (set in design.html):
 * - state: two-letter code (e.g., 'CA')
 * - grade: 4 or 8
 * - ses: 'low', 'medium', or 'high'
 * - name: student name
 * 
 * Dependencies:
 * - D3.js v7
 * - helpers3.js (for state name/code conversions and formatting)
 */

// Configuration
const CONFIG = {
  dimensions: {
    main: { width: 960, height: 700 },
    panel: { width: 450, height: 420 },  // ✅ BIGGER panels (was 300x280)
    margin: { top: 40, right: 30, bottom: 60, left: 80 }
  },
  colors: {
    lowSES: '#c85a54',      // Red - matches desert category
    middleSES: '#e89456',   // Orange - matches moderate
    highSES: '#8ab8d0',     // Blue - matches excellent
    avatar: '#0d0d0d',      // Black - prominent
    national: '#666',        // Gray
    highlight: '#f4d58d',   // Yellow - matches adequate
    paper: '#efe6da',
    ink: '#111'
  },
  dataUrl: 'data/viz5_data.json',
  nationalUrl: 'data/viz5_national.json',
  fonts: {
    title: 'Anton, "Bebas Neue", Impact, system-ui, sans-serif',
    mono: '"IBM Plex Mono", ui-monospace, monospace',
    body: 'Inter, system-ui, -apple-system, sans-serif'
  }
};

/**
 * Get avatar data from localStorage
 * Returns normalized avatar object compatible with visualization
 */
function getAvatarFromLocalStorage() {
  try {
    const data = JSON.parse(localStorage.getItem('characterData') || '{}');
    
    // Extract and normalize
    const state = data.state || 'CA';
    const grade = parseInt(data.grade) || 4;
    const ses = data.ses || 'medium';
    const name = data.name || 'Student';
    
    // Convert SES to expected format
    const sesMap = {
      'low': 'Low SES',
      'medium': 'Middle SES',
      'high': 'High SES'
    };
    const sesCategory = sesMap[ses.toLowerCase()] || 'Middle SES';
    
    console.log('👤 Avatar loaded from localStorage:', { state, grade, sesCategory, name });
    
    return {
      state: state.toUpperCase(),
      grade: grade === 8 ? 8 : 4, // Ensure only 4 or 8
      sesCategory: sesCategory,
      name: name
    };
  } catch (e) {
    console.error('❌ Error loading avatar from localStorage:', e);
    // Return default
    return {
      state: 'CA',
      grade: 4,
      sesCategory: 'Middle SES',
      name: 'Student'
    };
  }
}

/**
 * Check if D3 is loaded
 */
function checkLibraries() {
  if (typeof d3 === 'undefined') {
    console.error('❌ D3.js is not loaded');
    return false;
  }
  console.log('✅ D3.js version:', d3.version);
  return true;
}

/**
 * Display error message
 */
function displayError(container, message = 'Error loading visualization') {
  container.html(`
    <div style="padding: 60px 40px; text-align: center; font-family: ${CONFIG.fonts.mono};">
      <h2 style="color: ${CONFIG.colors.lowSES}; font-size: 20px; margin-bottom: 16px;">⚠️ ${message}</h2>
      <p style="color: #666; font-size: 14px; line-height: 1.6; max-width: 500px; margin: 0 auto;">
        Unable to load visualization data. Please check your data files and try again.
      </p>
    </div>
  `);
}

/**
 * Main render function - reads avatar from localStorage automatically
 * @param {object} options - Configuration options
 * @param {string|HTMLElement} options.container - Container selector or element
 * @param {string} options.dataUrl - URL to visualization data (optional)
 * @param {string} options.nationalUrl - URL to national averages (optional)
 */
export async function renderFundingLiteracy({
  container,
  dataUrl = CONFIG.dataUrl,
  nationalUrl = CONFIG.nationalUrl
} = {}) {
  if (!container) throw new Error('renderFundingLiteracy: container is required');
  
  try {
    if (!checkLibraries()) {
      const root = d3.select(container);
      displayError(root, 'D3.js not loaded');
      return;
    }
    
    console.log('🚀 Initializing Funding & Literacy visualization...');
    
    // Get container element
    const containerEl = typeof container === 'string' ? document.querySelector(container) : container;
    if (!containerEl) throw new Error('Container element not found');
    
    // Clear container completely to prevent duplicates
    containerEl.innerHTML = '';
    
    const root = d3.select(containerEl);
    
    // Get avatar from localStorage
    const avatar = getAvatarFromLocalStorage();
    console.log('👤 Using avatar:', avatar);
    
    // Load data
    const [stateData, nationalData] = await Promise.all([
      d3.json(dataUrl),
      d3.json(nationalUrl)
    ]);
    
    console.log(`📊 Loaded data for ${stateData.length} states`);
    
    // Find avatar's state data
    const avatarStateData = stateData.find(d => d.state === avatar.state);
    
    if (!avatarStateData) {
      displayError(root, `No data found for state: ${avatar.state}`);
      return;
    }
    
    // Create visualization
    createVisualization(root, stateData, nationalData, avatarStateData, avatar);
    
    console.log('✅ Visualization initialized successfully');
    
  } catch (error) {
    console.error('❌ Error initializing visualization:', error);
    const root = d3.select(container);
    displayError(root, 'Failed to load data');
  }
}

/**
 * Create the main visualization layout
 */
function createVisualization(root, stateData, nationalData, avatarStateData, avatar) {
  // Create main wrapper
  const wrapper = root.append('div')
    .attr('class', 'viz5-wrapper')
    .style('background', CONFIG.colors.paper)
    .style('padding', '48px 40px')
    .style('font-family', CONFIG.fonts.body)
    .style('color', CONFIG.colors.ink);
  
  // Add title section
  createTitleSection(wrapper, avatar);
  
  // Create main content area
  const content = wrapper.append('div')
    .attr('class', 'viz5-content')
    .style('margin-top', '40px');
  
  // Create three-panel layout
  const panels = content.append('div')
    .attr('class', 'viz5-panels')
    .style('display', 'flex')
    .style('gap', '32px')
    .style('flex-wrap', 'wrap')
    .style('justify-content', 'center');
  
  // Panel 1: Per-Pupil Spending Comparison
  createSpendingPanel(panels, avatarStateData, nationalData, avatar);
  
  // Panel 2: Funding vs Reading Scores Scatter
  createScatterPanel(panels, stateData, avatarStateData, avatar);
  
  // ✅ REMOVED: Panel 3 (Literacy Pathway) to make other panels bigger
  
  // Add insights section
  createInsightsSection(wrapper, avatarStateData, nationalData, avatar, stateData);
}

/**
 * Create title section with avatar info
 */
function createTitleSection(wrapper, avatar) {
  const titleSection = wrapper.append('div')
    .attr('class', 'viz5-title')
    .style('text-align', 'center')
    .style('margin-bottom', '24px');
  
  // Get state full name
  const stateName = window.getStateName ? window.getStateName(avatar.state) : avatar.state;
  
  titleSection.append('h1')
    .style('font-family', CONFIG.fonts.title)
    .style('font-size', '64px')
    .style('line-height', '1')
    .style('margin', '0 0 16px 0')
    .style('letter-spacing', '1px')
    .text(`${avatar.name.toUpperCase()}'S FUNDING STORY`);
  
  titleSection.append('div')
    .attr('class', 'avatar-badge')
    .style('display', 'inline-block')
    .style('background', CONFIG.colors.avatar)
    .style('color', '#fff')
    .style('padding', '12px 28px')
    .style('border-radius', '32px')
    .style('font-family', CONFIG.fonts.mono)
    .style('font-size', '16px')
    .style('letter-spacing', '0.06em')
    .style('box-shadow', '3px 3px 0 rgba(0,0,0,0.2)')
    .html(`${stateName} &nbsp;•&nbsp; Grade ${avatar.grade} &nbsp;•&nbsp; ${avatar.sesCategory}`);
}

/**
 * Panel 1: Per-Pupil Spending Comparison Bar Chart
 */
function createSpendingPanel(panels, avatarStateData, nationalData, avatar) {
  const panel = panels.append('div')
    .attr('class', 'viz5-panel spending-panel')
    .style('background', '#fff')
    .style('border', '3px solid ' + CONFIG.colors.ink)
    .style('box-shadow', '6px 6px 0 rgba(0,0,0,0.1)')
    .style('padding', '32px')  // ✅ Increased padding (was 24px)
    .style('width', '450px');  // ✅ Wider panel (was 300px)
  
  panel.append('h3')
    .style('font-family', CONFIG.fonts.title)
    .style('font-size', '36px')  // ✅ Larger title (was 28px)
    .style('margin', '0 0 8px 0')
    .style('line-height', '1.1')
    .text('PER-PUPIL');
  
  panel.append('h3')
    .style('font-family', CONFIG.fonts.title)
    .style('font-size', '36px')  // ✅ Larger title (was 28px)
    .style('margin', '0 0 24px 0')  // ✅ More margin (was 20px)
    .style('line-height', '1.1')
    .text('SPENDING');
  
  // Get avatar's spending
  const avatarSpending = avatarStateData.spending[avatar.sesCategory]?.amount || 0;
  const nationalAvg = nationalData[avatar.sesCategory] || 0;
  
  // Create data for chart
  const chartData = [
    { label: `${avatar.name}'s District`, value: avatarSpending, color: CONFIG.colors.avatar, isAvatar: true },
    { label: 'State Avg', value: calculateStateAverage(avatarStateData), color: CONFIG.colors.middleSES, isAvatar: false },
    { label: 'National Avg', value: nationalAvg, color: CONFIG.colors.national, isAvatar: false }
  ];
  
  const svg = panel.append('svg')
    .attr('width', '100%')
    .attr('height', '280')  // ✅ Taller chart (was 180)
    .attr('viewBox', '0 0 386 280');  // ✅ Wider viewBox (was 252x180)
  
  const barHeight = 60;  // ✅ Taller bars (was 40)
  const barSpacing = 24;  // ✅ More spacing (was 16)
  
  // ✅ NEW: Use a zoomed-in scale to make differences more obvious
  // Find min and max values
  const minValue = d3.min(chartData, d => d.value);
  const maxValue = d3.max(chartData, d => d.value);
  
  // Create a scale that starts at 80% of min value (to show differences better)
  const scaleMin = minValue * 0.8;
  const scaleMax = maxValue * 1.1;
  
  const scale = d3.scaleLinear()
    .domain([scaleMin, scaleMax])
    .range([0, 280]);  // ✅ Wider bars (was 180)
  
  // Draw bars
  const bars = svg.selectAll('g.bar-group')
    .data(chartData)
    .join('g')
    .attr('class', 'bar-group')
    .attr('transform', (d, i) => `translate(0, ${i * (barHeight + barSpacing) + 20})`);  // Add 20px offset for gridlines
  
  // ✅ NEW: Add subtle gridlines and axis for scale reference
  const gridlineGroup = svg.append('g')
    .attr('class', 'gridlines')
    .attr('transform', 'translate(0, 20)');  // Match bar offset
  
  // Create 5 gridlines
  const numGridlines = 5;
  const gridValues = [];
  for (let i = 0; i <= numGridlines; i++) {
    gridValues.push(scaleMin + (scaleMax - scaleMin) * (i / numGridlines));
  }
  
  gridValues.forEach(value => {
    const x = scale(value);
    
    // Draw subtle vertical gridline
    gridlineGroup.append('line')
      .attr('x1', x)
      .attr('y1', 0)
      .attr('x2', x)
      .attr('y2', (barHeight + barSpacing) * chartData.length - barSpacing)
      .attr('stroke', '#ddd')
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', '2,3');
    
    // Add value label at top
    gridlineGroup.append('text')
      .attr('x', x)
      .attr('y', -5)
      .attr('text-anchor', 'middle')
      .style('font-family', CONFIG.fonts.mono)
      .style('font-size', '9px')
      .style('fill', '#999')
      .text(`$${formatNumber(Math.round(value / 1000))}k`);
  });
  
  bars.append('rect')
    .attr('x', 0)
    .attr('y', 0)
    .attr('width', d => scale(d.value))
    .attr('height', barHeight)
    .attr('fill', d => d.color)
    .attr('stroke', d => d.isAvatar ? '#fff' : 'none')
    .attr('stroke-width', d => d.isAvatar ? 3 : 0);
  
  // Add value labels
  bars.append('text')
    .attr('x', d => scale(d.value) + 8)  // ✅ More offset (was 6)
    .attr('y', barHeight / 2)
    .attr('dy', '0.35em')
    .style('font-family', CONFIG.fonts.mono)
    .style('font-size', '18px')  // ✅ Larger text (was 14px)
    .style('font-weight', '700')
    .style('fill', CONFIG.colors.ink)
    .text(d => `$${formatNumber(Math.round(d.value))}`);
  
  // Add labels
  bars.append('text')
    .attr('x', 0)
    .attr('y', barHeight + 16)  // ✅ More offset (was 12)
    .style('font-family', CONFIG.fonts.mono)
    .style('font-size', '14px')  // ✅ Larger text (was 11px)
    .style('fill', CONFIG.colors.ink)
    .text(d => d.label);
}

/**
 * Panel 2: Funding vs Reading Scores Scatter Plot
 */
function createScatterPanel(panels, stateData, avatarStateData, avatar) {
  const panel = panels.append('div')
    .attr('class', 'viz5-panel scatter-panel')
    .style('background', '#fff')
    .style('border', '3px solid ' + CONFIG.colors.ink)
    .style('box-shadow', '6px 6px 0 rgba(0,0,0,0.1)')
    .style('padding', '32px')  // ✅ Increased padding (was 24px)
    .style('width', '450px');  // ✅ Wider panel (was 300px)
  
  panel.append('h3')
    .style('font-family', CONFIG.fonts.title)
    .style('font-size', '36px')  // ✅ Larger title (was 28px)
    .style('margin', '0 0 8px 0')
    .style('line-height', '1.1')
    .text('FUNDING vs');
  
  panel.append('h3')
    .style('font-family', CONFIG.fonts.title)
    .style('font-size', '36px')  // ✅ Larger title (was 28px)
    .style('margin', '0 0 24px 0')  // ✅ More margin (was 20px)
    .style('line-height', '1.1')
    .text('OUTCOMES');
  
  const width = 386;  // ✅ Wider (was 252)
  const height = 320;  // ✅ Taller (was 200)
  const margin = { top: 15, right: 15, bottom: 50, left: 60 };  // ✅ More margins
  
  const svg = panel.append('svg')
    .attr('width', '100%')
    .attr('height', height)
    .attr('viewBox', `0 0 ${width} ${height}`);
  
  const g = svg.append('g')
    .attr('transform', `translate(${margin.left}, ${margin.top})`);
  
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;
  
  // Prepare data: average spending vs reading score
  const scatterData = stateData.map(d => {
    const avgSpending = calculateStateAverage(d);
    const score = avatar.grade === 4 ? d.fourth_grade_score : d.eighth_grade_score;
    return {
      state: d.state,
      spending: avgSpending,
      score: score,
      isAvatar: d.state === avatar.state
    };
  }).filter(d => d.spending && d.score && !isNaN(d.spending) && !isNaN(d.score));
  
  console.log(`📊 Scatter plot data: ${scatterData.length} states`);
  
  // Check if we have valid data
  if (scatterData.length === 0) {
    console.warn('⚠️ No valid scatter plot data');
    g.append('text')
      .attr('x', innerWidth / 2)
      .attr('y', innerHeight / 2)
      .style('text-anchor', 'middle')
      .style('font-family', CONFIG.fonts.mono)
      .style('font-size', '12px')
      .text('No data available');
    return;
  }
  
  // Scales
  const xMin = d3.min(scatterData, d => d.spending);
  const xMax = d3.max(scatterData, d => d.spending);
  const yMin = d3.min(scatterData, d => d.score);
  const yMax = d3.max(scatterData, d => d.score);
  
  const xScale = d3.scaleLinear()
    .domain([xMin * 0.95, xMax * 1.05])
    .range([0, innerWidth]);
  
  const yScale = d3.scaleLinear()
    .domain([yMin * 0.98, yMax * 1.02])
    .range([innerHeight, 0]);
  
  // Axes
  const xAxis = d3.axisBottom(xScale)
    .ticks(4)
    .tickFormat(d => `$${d3.format('.0f')(d / 1000)}k`);
  
  const yAxis = d3.axisLeft(yScale)
    .ticks(5);
  
  g.append('g')
    .attr('transform', `translate(0, ${innerHeight})`)
    .call(xAxis)
    .style('font-family', CONFIG.fonts.mono)
    .style('font-size', '11px');  // ✅ Larger (was 9px)
  
  g.append('g')
    .call(yAxis)
    .style('font-family', CONFIG.fonts.mono)
    .style('font-size', '11px');  // ✅ Larger (was 9px)
  
  // X-axis label
  g.append('text')
    .attr('x', innerWidth / 2)
    .attr('y', innerHeight + 40)  // ✅ More offset (was 30)
    .style('text-anchor', 'middle')
    .style('font-family', CONFIG.fonts.mono)
    .style('font-size', '13px')  // ✅ Larger (was 10px)
    .style('fill', CONFIG.colors.ink)
    .text('Avg Spending/Pupil');
  
  // Y-axis label
  g.append('text')
    .attr('transform', 'rotate(-90)')
    .attr('x', -innerHeight / 2)
    .attr('y', -45)  // ✅ More offset (was -35)
    .style('text-anchor', 'middle')
    .style('font-family', CONFIG.fonts.mono)
    .style('font-size', '13px')  // ✅ Larger (was 10px)
    .style('fill', CONFIG.colors.ink)
    .text(`Grade ${avatar.grade} Score`);
  
  // Add trend line BEFORE circles (so circles appear on top)
  const regression = calculateLinearRegression(scatterData);
  if (regression) {
    const x1 = xScale.domain()[0];
    const x2 = xScale.domain()[1];
    const y1 = regression.slope * x1 + regression.intercept;
    const y2 = regression.slope * x2 + regression.intercept;
    
    g.append('line')
      .attr('x1', xScale(x1))
      .attr('y1', yScale(y1))
      .attr('x2', xScale(x2))
      .attr('y2', yScale(y2))
      .attr('stroke', CONFIG.colors.lowSES)
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', '4,4')
      .attr('opacity', 0.5);
  }
  
  // Draw circles LAST (on top of everything)
  const circles = g.selectAll('circle.datapoint')
    .data(scatterData)
    .join('circle')
    .attr('class', 'datapoint')
    .attr('cx', d => xScale(d.spending))
    .attr('cy', d => yScale(d.score))
    .attr('r', d => d.isAvatar ? 8 : 4)  // ✅ Larger circles (was 6 and 3)
    .attr('fill', d => d.isAvatar ? CONFIG.colors.avatar : CONFIG.colors.middleSES)
    .attr('stroke', d => d.isAvatar ? '#fff' : 'none')
    .attr('stroke-width', d => d.isAvatar ? 3 : 0)  // ✅ Thicker stroke (was 2)
    .attr('opacity', d => d.isAvatar ? 1 : 0.6);
  
  console.log(`✅ Drew ${circles.size()} circles in scatter plot`);
  
  // ✅ NEW: Add legend to explain what dots represent
  const legendGroup = g.append('g')
    .attr('transform', `translate(10, 10)`);
  
  // Legend background
  legendGroup.append('rect')
    .attr('x', -5)
    .attr('y', -5)
    .attr('width', 145)
    .attr('height', 55)
    .attr('fill', 'rgba(255, 255, 255, 0.95)')
    .attr('stroke', CONFIG.colors.ink)
    .attr('stroke-width', 1.5)
    .attr('rx', 4);
  
  // Legend title
  legendGroup.append('text')
    .attr('x', 0)
    .attr('y', 8)
    .style('font-family', CONFIG.fonts.mono)
    .style('font-size', '11px')
    .style('font-weight', '700')
    .style('fill', CONFIG.colors.ink)
    .text('Each dot = 1 state');
  
  // Other states indicator
  legendGroup.append('circle')
    .attr('cx', 5)
    .attr('cy', 28)
    .attr('r', 4)
    .attr('fill', CONFIG.colors.middleSES)
    .attr('opacity', 0.6);
  
  legendGroup.append('text')
    .attr('x', 15)
    .attr('y', 28)
    .attr('dy', '0.35em')
    .style('font-family', CONFIG.fonts.mono)
    .style('font-size', '10px')
    .style('fill', CONFIG.colors.ink)
    .text('Other states');
  
  // Avatar state indicator
  legendGroup.append('circle')
    .attr('cx', 5)
    .attr('cy', 43)
    .attr('r', 6)
    .attr('fill', CONFIG.colors.avatar)
    .attr('stroke', '#fff')
    .attr('stroke-width', 2);
  
  legendGroup.append('text')
    .attr('x', 15)
    .attr('y', 43)
    .attr('dy', '0.35em')
    .style('font-family', CONFIG.fonts.mono)
    .style('font-size', '10px')
    .style('fill', CONFIG.colors.ink)
    .text(`${avatar.name}'s state`);
}

/**
 * Panel 3: Literacy Pathway (K-12 to Adult)
 */
function createPathwayPanel(panels, avatarStateData, nationalData, avatar) {
  const panel = panels.append('div')
    .attr('class', 'viz5-panel pathway-panel')
    .style('background', '#fff')
    .style('border', '3px solid ' + CONFIG.colors.ink)
    .style('box-shadow', '6px 6px 0 rgba(0,0,0,0.1)')
    .style('padding', '24px')
    .style('width', '300px');
  
  panel.append('h3')
    .style('font-family', CONFIG.fonts.title)
    .style('font-size', '28px')
    .style('margin', '0 0 8px 0')
    .style('line-height', '1.1')
    .text('LITERACY');
  
  panel.append('h3')
    .style('font-family', CONFIG.fonts.title)
    .style('font-size', '28px')
    .style('margin', '0 0 20px 0')
    .style('line-height', '1.1')
    .text('PATHWAY');
  
  // Create vertical flow chart showing progression
  const stages = [
    { 
      label: 'Grade 4', 
      stateScore: avatarStateData.fourth_grade_score,
      nationalScore: nationalData.fourth_grade,
      active: avatar.grade === 4
    },
    { 
      label: 'Grade 8', 
      stateScore: avatarStateData.eighth_grade_score,
      nationalScore: nationalData.eighth_grade,
      active: avatar.grade === 8
    },
    { 
      label: 'Adult', 
      stateScore: avatarStateData.adult_literacy,
      nationalScore: null,
      active: false
    }
  ];
  
  const stageContainer = panel.append('div')
    .style('margin-top', '12px');
  
  stages.forEach((stage, i) => {
    const stageDiv = stageContainer.append('div')
      .style('margin-bottom', i < stages.length - 1 ? '20px' : '0')
      .style('position', 'relative');
    
    // Stage label
    stageDiv.append('div')
      .style('font-family', CONFIG.fonts.mono)
      .style('font-size', '13px')
      .style('font-weight', '700')
      .style('margin-bottom', '6px')
      .style('color', stage.active ? CONFIG.colors.avatar : CONFIG.colors.ink)
      .text(stage.label + (stage.active ? ' ★' : ''));
    
    // Score bar
    const barContainer = stageDiv.append('div')
      .style('display', 'flex')
      .style('align-items', 'center')
      .style('gap', '8px');
    
    // State score bar
    const maxScore = 280;
    const minScore = 200;
    const scoreRange = maxScore - minScore;
    const statePercent = ((stage.stateScore - minScore) / scoreRange) * 100;
    
    barContainer.append('div')
      .style('flex', '1')
      .style('height', '24px')
      .style('background', '#f0f0f0')
      .style('border', `2px solid ${stage.active ? CONFIG.colors.avatar : CONFIG.colors.ink}`)
      .style('position', 'relative')
      .style('overflow', 'hidden')
      .append('div')
      .style('position', 'absolute')
      .style('left', '0')
      .style('top', '0')
      .style('bottom', '0')
      .style('width', `${Math.min(100, Math.max(0, statePercent))}%`)
      .style('background', stage.active ? CONFIG.colors.avatar : CONFIG.colors.middleSES)
      .style('transition', 'width 0.8s ease');
    
    barContainer.append('div')
      .style('font-family', CONFIG.fonts.mono)
      .style('font-size', '12px')
      .style('font-weight', '700')
      .style('min-width', '45px')
      .style('text-align', 'right')
      .text(Math.round(stage.stateScore));
    
    // Arrow connector (except for last stage)
    if (i < stages.length - 1) {
      stageDiv.append('div')
        .style('margin-top', '8px')
        .style('text-align', 'center')
        .style('font-size', '20px')
        .style('color', CONFIG.colors.middleSES)
        .text('↓');
    }
  });
}

/**
 * Create insights section with key findings
 */
function createInsightsSection(wrapper, avatarStateData, nationalData, avatar, stateData) {
  const insights = wrapper.append('div')
    .attr('class', 'viz5-insights')
    .style('margin-top', '48px')
    .style('padding', '32px')
    .style('background', CONFIG.colors.highlight)
    .style('border', '3px solid ' + CONFIG.colors.ink)
    .style('box-shadow', '6px 6px 0 rgba(0,0,0,0.1)');
  
  insights.append('h3')
    .style('font-family', CONFIG.fonts.title)
    .style('font-size', '36px')
    .style('margin', '0 0 20px 0')
    .text('KEY INSIGHTS');
  
  const avatarSpending = avatarStateData.spending[avatar.sesCategory]?.amount || 0;
  const nationalAvg = nationalData[avatar.sesCategory] || 0;
  const diff = avatarSpending - nationalAvg;
  const diffPercent = ((diff / nationalAvg) * 100).toFixed(1);
  
  const currentScore = avatar.grade === 4 ? avatarStateData.fourth_grade_score : avatarStateData.eighth_grade_score;
  const nationalScore = avatar.grade === 4 ? nationalData.fourth_grade : nationalData.eighth_grade;
  const scoreDiff = currentScore - nationalScore;
  
  // Calculate SES gap in state
  const lowSpending = avatarStateData.spending['Low SES']?.amount || 0;
  const highSpending = avatarStateData.spending['High SES']?.amount || 0;
  const sesGap = highSpending - lowSpending;
  const sesGapPercent = ((sesGap / lowSpending) * 100).toFixed(1);
  
  const insightsList = insights.append('div')
    .style('display', 'grid')
    .style('grid-template-columns', 'repeat(auto-fit, minmax(280px, 1fr))')
    .style('gap', '20px')
    .style('font-family', CONFIG.fonts.body);
  
  // Insight 1: Funding comparison
  addInsight(insightsList, 
    diff >= 0 ? '📈' : '📉',
    `${avatar.name}'s district receives <strong>$${Math.abs(diff).toFixed(0)}</strong> ${diff >= 0 ? 'more' : 'less'} per student than the national ${avatar.sesCategory} average (${diffPercent >= 0 ? '+' : ''}${diffPercent}%).`
  );
  
  // Insight 2: Reading score comparison
  addInsight(insightsList,
    scoreDiff >= 0 ? '✓' : '⚠️',
    `Grade ${avatar.grade} reading scores in ${avatar.name}'s state are <strong>${Math.abs(scoreDiff).toFixed(1)} points</strong> ${scoreDiff >= 0 ? 'above' : 'below'} the national average.`
  );
  
  // Insight 3: SES funding gap
  if (sesGap !== 0) {
    addInsight(insightsList,
      '💰',
      `In ${avatar.name}'s state, High SES districts receive <strong>${Math.abs(sesGapPercent)}%</strong> ${sesGap > 0 ? 'more' : 'less'} funding than Low SES districts.`
    );
  }
  
  // ✅ REMOVED: Insight 4 about correlation between spending and reading scores
}

/**
 * Add an insight card
 */
function addInsight(container, emoji, text) {
  const insight = container.append('div')
    .style('padding', '16px')
    .style('background', '#fff')
    .style('border', '2px solid ' + CONFIG.colors.ink)
    .style('box-shadow', '3px 3px 0 rgba(0,0,0,0.1)')
    .style('font-size', '14px')
    .style('line-height', '1.6');
  
  insight.append('div')
    .style('font-size', '24px')
    .style('margin-bottom', '8px')
    .text(emoji);
  
  insight.append('div')
    .html(text);
}

/**
 * Helper: Calculate state average spending across all SES categories
 */
function calculateStateAverage(stateData) {
  const categories = ['Low SES', 'Middle SES', 'High SES'];
  let total = 0;
  let count = 0;
  
  categories.forEach(cat => {
    if (stateData.spending[cat]) {
      total += stateData.spending[cat].amount;
      count++;
    }
  });
  
  return count > 0 ? total / count : 0;
}

/**
 * Helper: Format numbers with commas
 */
function formatNumber(num) {
  if (typeof window.formatNumber === 'function') {
    return window.formatNumber(num);
  }
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/**
 * Helper: Calculate linear regression for scatter plot
 */
function calculateLinearRegression(data) {
  const n = data.length;
  if (n < 2) return null;
  
  const xMean = d3.mean(data, d => d.spending);
  const yMean = d3.mean(data, d => d.score);
  
  let num = 0;
  let den = 0;
  
  data.forEach(d => {
    num += (d.spending - xMean) * (d.score - yMean);
    den += (d.spending - xMean) ** 2;
  });
  
  const slope = den !== 0 ? num / den : 0;
  const intercept = yMean - slope * xMean;
  
  return { slope, intercept };
}

/**
 * Helper: Calculate correlation coefficient
 */
function calculateCorrelation(stateData, grade) {
  const data = stateData.map(d => ({
    spending: calculateStateAverage(d),
    score: grade === 4 ? d.fourth_grade_score : d.eighth_grade_score
  })).filter(d => d.spending && d.score);
  
  const n = data.length;
  if (n < 2) return null;
  
  const xMean = d3.mean(data, d => d.spending);
  const yMean = d3.mean(data, d => d.score);
  
  let num = 0;
  let xDen = 0;
  let yDen = 0;
  
  data.forEach(d => {
    const xDiff = d.spending - xMean;
    const yDiff = d.score - yMean;
    num += xDiff * yDiff;
    xDen += xDiff ** 2;
    yDen += yDiff ** 2;
  });
  
  const den = Math.sqrt(xDen * yDen);
  return den !== 0 ? num / den : 0;
}

// Make function available globally (for non-module usage)
if (typeof window !== 'undefined') {
  window.renderFundingLiteracy = renderFundingLiteracy;
}
