/**
 * BOOK DESERT INDEX - MAIN VISUALIZATION
 * 
 * Interactive choropleth map showing public library book access
 * across US states, measured in books per K-12 student.
 * 
 * Dependencies:
 * - D3.js v7 (from CDN or local file in lib/)
 * - TopoJSON v3 (from CDN or local file in lib/)
 * - helpers3.js (local helper functions)
 */

// Import helper functions (will be available globally when loaded via script tag)
// Make sure helpers3.js is loaded before this file

// Configuration
const CONFIG = {
  map: {
    width: 960,
    height: 600,
    scale: 1200,
    translate: [480, 300]  // [width/2, height/2]
  },
  colors: {
    desert: '#c85a54',
    moderate: '#e89456',
    adequate: '#f4d58d',
    excellent: '#8ab8d0'
  },
  dataUrl: 'data/viz_3_data.json',
  topoJsonUrl: 'data/us-states-10m.json'  // LOCAL - much faster than CDN
};

/**
 * Check if required libraries are loaded
 * @returns {boolean} True if D3 and TopoJSON are available
 */
function checkLibraries() {
  if (typeof d3 === 'undefined') {
    console.error('❌ D3.js is not loaded');
    return false;
  }
  if (typeof topojson === 'undefined') {
    console.error('❌ TopoJSON is not loaded');
    return false;
  }
  console.log('✅ D3.js version:', d3.version);
  console.log('✅ TopoJSON loaded');
  return true;
}

/**
 * Get avatar's selected state from localStorage
 * Reads from the characterData stored by the avatar selection
 * @returns {string|null} Two-letter state code or null
 */
function getAvatarStateFromLocalStorage() {
  try {
    const characterData = localStorage.getItem('characterData');
    if (characterData) {
      const data = JSON.parse(characterData);
      const state = data.state;
      if (state && typeof state === 'string' && state.length === 2) {
        console.log('👤 Detected avatar state from localStorage:', state);
        return state.toUpperCase();
      }
    }
  } catch (e) {
    console.warn('⚠️ Error reading avatar state from localStorage:', e);
  }
  return null;
}

/**
 * Display error message in the container
 * @param {d3.selection} container - Container element
 * @param {string} message - Error message to display
 */
function displayError(container, message = 'Error loading visualization') {
  container.html(`
    <div style="padding: 60px 40px; text-align: center; font-family: monospace;">
      <h2 style="color: #c85a54; font-size: 20px; margin-bottom: 16px;">⚠️ ${message}</h2>
      <p style="color: #666; font-size: 14px; line-height: 1.6; max-width: 500px; margin: 0 auto;">
        This visualization requires D3.js and TopoJSON libraries. Please ensure you have an active 
        internet connection, or download the libraries locally and place them in the lib/ folder.
      </p>
    </div>
  `);
}

/**
 * Initialize the visualization
 * Main entry point - loads data and creates the map
 * @param {string|HTMLElement} container - Container selector or element
 * @param {object} options - Configuration options
 */
export async function renderBookDesertMap({
  container,
  dataUrl = CONFIG.dataUrl,
  topoJsonUrl = CONFIG.topoJsonUrl,
  width = CONFIG.map.width,
  height = CONFIG.map.height,
  selectedState = null
} = {}) {
  if (!container) throw new Error('renderBookDesertMap: container is required');
  
  try {
    // Auto-detect avatar state if not provided
    if (!selectedState) {
      selectedState = getAvatarStateFromLocalStorage();
      if (selectedState) {
        console.log('🎯 Using avatar state for map highlighting:', selectedState);
      }
    }
    
    // Check if required libraries are available
    if (!checkLibraries()) {
      const root = d3.select(container);
      displayError(root, 'Required libraries not loaded');
      return;
    }
    
    console.log('🚀 Initializing Book Desert visualization...');
    
    const root = d3.select(container);
    root.selectAll('*').remove();
    
    // Create wrapper
    const wrap = root.append('div').attr('class', 'viz3-wrap').style('position', 'relative');
    
    // Create title
    const title = wrap.append('div')
      .style('font-family', 'Inter, system-ui')
      .style('font-weight', 800)
      .style('font-size', '18px')
      .style('letter-spacing', '.02em')
      .style('color', '#111')
      .style('margin-bottom', '12px')
      .text('Library Book Access by State');
    
    // Create legend BEFORE the map
    const legend = wrap.append('div')
      .attr('class', 'book-desert-legend')
      .style('display', 'flex')
      .style('flex-wrap', 'wrap')
      .style('gap', '16px')
      .style('align-items', 'center')
      .style('margin-bottom', '12px')
      .style('padding', '12px')
      .style('background', '#f7efe6')
      .style('border', '2px solid #111')
      .style('border-radius', '8px')
      .style('box-shadow', '3px 3px 0 #111');
    
    // Add legend items from CONFIG
    const categories = [
      { key: 'excellent', label: 'Excellent', color: CONFIG.colors.excellent, range: '16+ books/student' },
      { key: 'adequate', label: 'Adequate', color: CONFIG.colors.adequate, range: '12-16 books/student' },
      { key: 'moderate', label: 'Moderate', color: CONFIG.colors.moderate, range: '8-12 books/student' },
      { key: 'desert', label: 'Desert', color: CONFIG.colors.desert, range: '< 8 books/student' }
    ];
    
    categories.forEach(cat => {
      const item = legend.append('div')
        .style('display', 'flex')
        .style('align-items', 'center')
        .style('gap', '8px');
      
      item.append('div')
        .style('width', '32px')
        .style('height', '16px')
        .style('background', cat.color)
        .style('border', '2px solid #111')
        .style('border-radius', '3px');
      
      item.append('div')
        .style('font-family', '"IBM Plex Mono", ui-monospace, monospace')
        .style('font-size', '12px')
        .style('color', '#111')
        .html(`<strong>${cat.label}</strong>: ${cat.range}`);
    });
    
    // Create tooltip with better contrast
    const tooltip = wrap.append('div')
      .attr('class', 'tooltip')
      .style('position', 'fixed')
      .style('pointer-events', 'none')
      .style('opacity', 0)
      .style('z-index', 1000)
      .style('background', '#ffffff')
      .style('border', '2px solid #111')
      .style('padding', '12px 16px')
      .style('border-radius', '8px')
      .style('box-shadow', '4px 4px 0 #111, 0 4px 12px rgba(0,0,0,0.15)')
      .style('font-family', 'Inter, system-ui, sans-serif')
      .style('font-size', '13px')
      .style('line-height', '1.5')
      .style('min-width', '200px')
      .style('max-width', '280px');
    
    // Load the data
    const vizData = await loadData(dataUrl);
    const stateLookup = createStateLookup(vizData);
    
    console.log(`📊 Data loaded: ${vizData.states.length} states`);
    
    // Create the map
    await createMap(wrap, tooltip, vizData, stateLookup, topoJsonUrl, width, height, selectedState);
    
    // Log statistics to console
    logStatistics(vizData);
    
    console.log('✅ Visualization initialized successfully');
  } catch (error) {
    console.error('❌ Error initializing visualization:', error);
    const root = d3.select(container);
    displayError(root, 'Failed to load data');
  }
}

/**
 * Create the interactive choropleth map
 * Renders US states with color-coded book access levels
 */
async function createMap(wrap, tooltip, vizData, stateLookup, topoJsonUrl, width, height, selectedState = null) {
  try {
    // Set up SVG
    const svg = wrap.append("svg")
      .attr("viewBox", [0, 0, width, height])
      .attr("width", "100%")
      .attr("height", "auto")
      .attr("preserveAspectRatio", "xMidYMid meet");

    // Set up projection (Albers USA includes Alaska and Hawaii)
    const projection = d3.geoAlbersUsa()
      .scale(CONFIG.map.scale)
      .translate(CONFIG.map.translate);

    const path = d3.geoPath().projection(projection);

    console.log('📥 Loading US map topology...');
    
    // Load US TopoJSON
    const us = await d3.json(topoJsonUrl);
    const states = topojson.feature(us, us.objects.states);

    console.log(`🗺️  Map loaded: ${states.features.length} states`);

    // Draw states with proper coloring
    const statesGroup = svg.append("g").attr("class", "states");
    
    const statesPaths = statesGroup
      .selectAll("path")
      .data(states.features)
      .join("path")
      .attr("class", d => {
        const stateCode = getStateCode(d.properties.name);
        const stateData = stateLookup[stateCode];
        const category = stateData?.category || "moderate";
        return `state ${category}`;
      })
      .attr("d", path)
      .attr("fill", d => {
        const stateCode = getStateCode(d.properties.name);
        const stateData = stateLookup[stateCode];
        const category = stateData?.category || "moderate";
        return CONFIG.colors[category] || CONFIG.colors.moderate;
      })
      .attr("stroke", d => {
        // Highlight selected state with thicker stroke and red color
        const stateCode = getStateCode(d.properties.name);
        return (selectedState && stateCode === selectedState) ? "#e74c3c" : "#111";
      })
      .attr("stroke-width", d => {
        const stateCode = getStateCode(d.properties.name);
        return (selectedState && stateCode === selectedState) ? 4 : 1;
      })
      .attr("stroke-dasharray", d => {
        const stateCode = getStateCode(d.properties.name);
        return (selectedState && stateCode === selectedState) ? "none" : "none";
      })
      .attr("filter", d => {
        // Add glow effect to selected state
        const stateCode = getStateCode(d.properties.name);
        if (selectedState && stateCode === selectedState) {
          return "drop-shadow(0 0 8px rgba(231, 76, 60, 0.6))";
        }
        return "none";
      })
      .style("cursor", "pointer")
      .on("mouseover", function(event, d) {
        // Don't increase stroke if already highlighted
        const stateCode = getStateCode(d.properties.name);
        if (!selectedState || stateCode !== selectedState) {
          d3.select(this).attr("stroke-width", 2.5);
        }
        handleMouseOver(event, d, tooltip, stateLookup);
      })
      .on("mouseout", function(event, d) {
        const stateCode = getStateCode(d.properties.name);
        if (!selectedState || stateCode !== selectedState) {
          d3.select(this).attr("stroke-width", 1);
        } else {
          d3.select(this).attr("stroke-width", 4);
        }
        handleMouseOut(tooltip);
      });

    // Add pin marker and label for selected state
    if (selectedState) {
      // Find the selected state feature and get its centroid
      const selectedFeature = states.features.find(f => 
        getStateCode(f.properties.name) === selectedState
      );
      
      if (selectedFeature) {
        const centroid = path.centroid(selectedFeature);
        const [cx, cy] = centroid;
        
        // Create a group for the pin marker
        const pinGroup = svg.append("g")
          .attr("class", "state-pin")
          .attr("transform", `translate(${cx},${cy})`);
        
        // Pin shadow (for depth)
        pinGroup.append("ellipse")
          .attr("cx", 0)
          .attr("cy", 32)
          .attr("rx", 8)
          .attr("ry", 3)
          .attr("fill", "rgba(0,0,0,0.3)");
        
        // Pin body (teardrop shape)
        pinGroup.append("path")
          .attr("d", "M 0,-25 C -8,-25 -15,-18 -15,-10 C -15,-2 0,15 0,15 C 0,15 15,-2 15,-10 C 15,-18 8,-25 0,-25 Z")
          .attr("fill", "#e74c3c")
          .attr("stroke", "#111")
          .attr("stroke-width", 2.5)
          .attr("filter", "drop-shadow(0 2px 4px rgba(0,0,0,0.3))");
        
        // Pin inner circle
        pinGroup.append("circle")
          .attr("cx", 0)
          .attr("cy", -10)
          .attr("r", 6)
          .attr("fill", "#fff")
          .attr("stroke", "#111")
          .attr("stroke-width", 2);
        
        // Pulsing circle animation
        const pulseCircle = pinGroup.append("circle")
          .attr("cx", 0)
          .attr("cy", -10)
          .attr("r", 6)
          .attr("fill", "none")
          .attr("stroke", "#e74c3c")
          .attr("stroke-width", 2)
          .attr("opacity", 0.8);
        
        // Animate the pulse
        pulseCircle.transition()
          .duration(1500)
          .ease(d3.easeQuadOut)
          .attr("r", 15)
          .attr("opacity", 0)
          .on("end", function repeat() {
            d3.select(this)
              .attr("r", 6)
              .attr("opacity", 0.8)
              .transition()
              .duration(1500)
              .ease(d3.easeQuadOut)
              .attr("r", 15)
              .attr("opacity", 0)
              .on("end", repeat);
          });
        
        // Label background
        const labelBg = pinGroup.append("rect")
          .attr("x", -40)
          .attr("y", -50)
          .attr("width", 80)
          .attr("height", 22)
          .attr("rx", 11)
          .attr("fill", "#fff")
          .attr("stroke", "#111")
          .attr("stroke-width", 2)
          .attr("filter", "drop-shadow(0 2px 4px rgba(0,0,0,0.2))");
        
        // Label text
        pinGroup.append("text")
          .attr("x", 0)
          .attr("y", -34)
          .attr("text-anchor", "middle")
          .attr("font-family", '"IBM Plex Mono", monospace')
          .attr("font-size", "12px")
          .attr("font-weight", "700")
          .attr("fill", "#e74c3c")
          .text("YOUR STATE");
        
        // Bounce animation on pin
        pinGroup
          .style("transform-origin", "center")
          .transition()
          .duration(600)
          .ease(d3.easeBounceOut)
          .attr("transform", `translate(${cx},${cy}) scale(1)`)
          .transition()
          .duration(200)
          .attr("transform", `translate(${cx},${cy}) scale(1.05)`)
          .transition()
          .duration(200)
          .attr("transform", `translate(${cx},${cy}) scale(1)`);
      }
      
      console.log('✅ Highlighted selected state in library map:', selectedState);
      console.log('📍 Added pin marker to:', selectedState);
    }

    console.log('✅ Map rendered successfully');
    
  } catch (error) {
    console.error('❌ Error creating map:', error);
    throw error;
  }
}

/**
 * Handle mouse over event on states
 * Shows tooltip with state information
 * @param {Event} event - Mouse event
 * @param {object} d - State feature data from TopoJSON
 * @param {d3.selection} tooltip - Tooltip element
 * @param {object} stateLookup - State lookup dictionary
 */
function handleMouseOver(event, d, tooltip, stateLookup) {
  const stateCode = getStateCode(d.properties.name);
  const stateData = stateLookup[stateCode];
  
  console.log('Mouse over state:', d.properties.name, 'Code:', stateCode);
  console.log('State data found:', stateData);
  console.log('Lookup keys sample:', Object.keys(stateLookup).slice(0, 5));
  
  if (stateData) {
    const content = createTooltipContent(stateData, d.properties.name, stateCode);
    showTooltip(tooltip, content, event.clientX, event.clientY);
  } else {
    console.warn('⚠️ No data found for state:', d.properties.name, 'Code:', stateCode);
    // Show a fallback tooltip
    tooltip
      .html(`<div style="font-weight: 700; color: #111;">${d.properties.name} (${stateCode || 'Unknown'})</div><div style="color: #666; margin-top: 4px;">Data not available</div>`)
      .style('left', (event.clientX + 20) + 'px')
      .style('top', (event.clientY - 40) + 'px')
      .transition()
      .duration(200)
      .style('opacity', 1);
  }
}

/**
 * Handle mouse move event on states
 * Updates tooltip position as mouse moves
 * @param {Event} event - Mouse event
 * @param {d3.selection} tooltip - Tooltip element
 */
function handleMouseMove(event, tooltip) {
  // Use clientX/clientY for viewport-relative positioning (works better in modals)
  const x = event.clientX;
  const y = event.clientY;
  tooltip
    .style("left", (x + 20) + "px")
    .style("top", (y - 40) + "px");
}

/**
 * Handle mouse out event on states
 * Hides the tooltip
 * @param {d3.selection} tooltip - Tooltip element
 */
function handleMouseOut(tooltip) {
  hideTooltip(tooltip);
}
