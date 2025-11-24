// File: js/visualization2.js
// Purpose: Interactive US choropleth of NAEP reading performance by state with year selector
// Optimized version with avatar integration and local data caching
// Requires: D3 v7+, topojson (topojson-client)

// Cache for loaded data to prevent multiple fetches
const dataCache = {
  naep: null,
  topojson: null
};

export async function renderReadingMap({
    container,
    grade = 4,
    ses = 'Middle',
    selectedState = null,
    compareState = null,
    topojsonUrl = 'https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json',
    width = 900,
    height = 560
  } = {}) {
    if (!container) throw new Error('renderReadingMap: container is required');
  
    console.log('🗺️ renderReadingMap called with:', { grade, ses, selectedState, compareState });
  
    const css = getComputedStyle(document.documentElement);
    const paper = css.getPropertyValue('--paper')?.trim() || '#efe6da';
    const ink = css.getPropertyValue('--ink')?.trim() || '#111';
  
    const root = d3.select(container);
    root.selectAll('*').remove();
  
    const wrap = root.append('div').attr('class', 'viz2-wrap').style('position', 'relative');
    
    // Loading overlay
    const loading = wrap.append('div')
      .attr('class', 'map-loading')
      .style('position', 'absolute')
      .style('inset', '0')
      .style('display', 'flex')
      .style('align-items', 'center')
      .style('justify-content', 'center')
      .style('background', 'rgba(239,230,218,0.9)')
      .style('z-index', '10')
      .style('font-family', '"IBM Plex Mono", ui-monospace, monospace')
      .style('font-size', '14px')
      .style('color', ink)
      .html('Loading map data...');
  
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
  
    // Load NAEP data from cleaned JSON file (with caching)
    async function loadNAEPData() {
      // Check cache first
      if (dataCache.naep) {
        console.log('✅ Using cached NAEP data');
        return dataCache.naep;
      }
      
      console.log('📊 Loading NAEP data from cleaned JSON...');
      
      const res = await fetch('data/naep_cleaned.json');
      if (!res.ok) {
        throw new Error(`Failed to fetch naep_cleaned.json: ${res.status} ${res.statusText}`);
      }
      
      const allData = await res.json();
      
      // Cache the data
      dataCache.naep = allData;
      console.log('✅ NAEP data loaded and cached');
      
      return allData;
    }
    
    // Load TopoJSON data (with caching)
    async function loadTopojson() {
      if (dataCache.topojson) {
        console.log('✅ Using cached TopoJSON');
        return dataCache.topojson;
      }
      
      console.log('🗺️ Loading TopoJSON...');
      const us = await d3.json(topojsonUrl);
      dataCache.topojson = us;
      console.log('✅ TopoJSON loaded and cached');
      return us;
    }
    
    // Load data in parallel for better performance
    let naepAllData, us;
    try {
      [naepAllData, us] = await Promise.all([loadNAEPData(), loadTopojson()]);
      loading.style('display', 'none');
    } catch (error) {
      console.error('❌ Error loading data:', error);
      loading.html(`Error loading data: ${error.message}`).style('color', '#c0392b');
      return;
    }
    
    // Extract grade data
    const gradeKey = `grade${grade}`;
    const gradeData = naepAllData[gradeKey];
    
    if (!gradeData) {
      loading.html(`Error: No data found for grade ${grade}`).style('color', '#c0392b');
      return;
    }
    
    // Convert to Maps for easier access
    const stateData = new Map();
    Object.entries(gradeData.states).forEach(([stateCode, yearScores]) => {
      stateData.set(stateCode, yearScores);
    });
    
    const nationalAvgByYear = new Map();
    Object.entries(gradeData.nationalAvg || {}).forEach(([year, avg]) => {
      nationalAvgByYear.set(year, avg);
    });
    
    const years = [...gradeData.years].sort((a, b) => a - b);
    let currentYear = years[years.length - 1]; // Start with latest year
    let currentGrade = grade;
    
    console.log(`✅ Loaded data for Grade ${grade}:`);
    console.log(`   - ${stateData.size} states`);
    console.log(`   - ${years.length} years: ${years.join(', ')}`);
    console.log(`   - Selected state: ${selectedState || 'None'}`);
  
    // Controls
    const controls = wrap.append('div')
      .attr('class', 'map-controls')
      .style('display', 'flex')
      .style('flex-wrap', 'wrap')
      .style('gap', '15px')
      .style('align-items', 'center')
      .style('margin-bottom', '15px')
      .style('padding', '10px')
      .style('background', paper)
      .style('border', `2px solid ${ink}`)
      .style('border-radius', '8px');
  
    controls.append('span')
      .style('font-family', 'Inter, system-ui')
      .style('font-weight', '800')
      .style('font-size', '18px')
      .style('color', ink)
      .text('NAEP Reading Scores');
  
    // Grade selector
    const gradeSelect = controls.append('select')
      .style('font-family', '"IBM Plex Mono", ui-monospace, monospace')
      .style('border', `2px solid ${ink}`)
      .style('background', paper)
      .style('padding', '6px 10px')
      .style('border-radius', '4px')
      .style('cursor', 'pointer');
    
    gradeSelect.selectAll('option')
      .data([4, 8])
      .enter()
      .append('option')
      .attr('value', d => d)
      .text(d => `Grade ${d}`);
    
    gradeSelect.property('value', currentGrade);
    
    gradeSelect.on('change', async function() {
      currentGrade = parseInt(this.value);
      
      // Extract new grade data
      const newGradeKey = `grade${currentGrade}`;
      const newGradeData = naepAllData[newGradeKey];
      
      if (!newGradeData) {
        console.error(`No data found for grade ${currentGrade}`);
        return;
      }
      
      // Update maps
      stateData.clear();
      Object.entries(newGradeData.states).forEach(([stateCode, yearScores]) => {
        stateData.set(stateCode, yearScores);
      });
      
      nationalAvgByYear.clear();
      Object.entries(newGradeData.nationalAvg || {}).forEach(([year, avg]) => {
        nationalAvgByYear.set(year, avg);
      });
      
      // Update years
      years.length = 0;
      years.push(...[...newGradeData.years].sort((a, b) => a - b));
      currentYear = years[years.length - 1];
      
      // Update year dropdown
      yearSelect.selectAll('option').remove();
      const sortedYears = [...years].sort((a, b) => b - a);
      yearSelect.selectAll('option')
        .data(sortedYears)
        .enter()
        .append('option')
        .attr('value', d => d)
        .property('selected', d => d === currentYear)
        .text(d => d);
      
      yearSelect.property('value', currentYear);
      
      console.log(`🔄 Grade changed to ${currentGrade}`);
      updateMap();
      updateLegend();
    });
    
    // Year selector
    const yearGroup = controls.append('div')
      .style('display', 'flex')
      .style('align-items', 'center')
      .style('gap', '10px');
    
    yearGroup.append('span')
      .style('font-family', 'Inter, system-ui')
      .style('font-size', '14px')
      .style('color', ink)
      .style('font-weight', '500')
      .text('Year:');
    
    const yearSelect = yearGroup.append('select')
      .style('font-family', '"IBM Plex Mono", ui-monospace, monospace')
      .style('border', `2px solid ${ink}`)
      .style('background', paper)
      .style('padding', '6px 10px')
      .style('border-radius', '4px')
      .style('cursor', 'pointer')
      .style('min-width', '80px');
    
    const sortedYears = [...years].sort((a, b) => b - a);
    yearSelect.selectAll('option')
      .data(sortedYears)
      .enter()
      .append('option')
      .attr('value', d => d)
      .property('selected', d => d === currentYear)
      .text(d => d);
    
    yearSelect.on('change', function() {
      currentYear = parseInt(this.value);
      console.log(`📅 Year changed to ${currentYear}`);
      updateMap();
      updateLegend();
    });
    
    // Show selected state info if provided
    if (selectedState) {
      const stateInfo = controls.append('div')
        .style('margin-left', 'auto')
        .style('font-family', '"IBM Plex Mono", ui-monospace, monospace')
        .style('font-size', '13px')
        .style('color', ink)
        .style('padding', '6px 12px')
        .style('background', '#fff')
        .style('border', `2px solid ${ink}`)
        .style('border-radius', '4px')
        .html(`👤 Your State: <strong>${selectedState}</strong>`);
    }
    
    // National average display
    const natAvgDisplay = controls.append('div')
      .style('margin-left', selectedState ? '10px' : 'auto')
      .style('font-family', '"IBM Plex Mono", ui-monospace, monospace')
      .style('font-size', '13px')
      .style('color', ink)
      .style('padding', '6px 12px')
      .style('background', '#fff')
      .style('border', `2px solid ${ink}`)
      .style('border-radius', '4px');
    
    // SVG setup
    const svg = wrap.append('svg')
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', `0 0 ${width} ${height}`)
      .style('background', paper)
      .style('border', `2px solid ${ink}`)
      .style('border-radius', '8px')
      .style('margin-top', '10px');
    
    const g = svg.append('g');
    
    // Projection
    const projection = d3.geoAlbersUsa()
      .scale(1100)
      .translate([width / 2, height / 2]);
    
    const path = d3.geoPath().projection(projection);
    
    // Extract features and build ID to USPS map
    const states = topojson.feature(us, us.objects.states);
    const idToUSPS = new Map();
    states.features.forEach(f => {
      const name = f.properties?.name;
      if (name) {
        const usps = stateNameToCode[name];
        if (usps) idToUSPS.set(f.id, usps);
      }
    });
    
    console.log(`✅ Built ID→USPS mapping for ${idToUSPS.size} states`);
    
    // Color scale function
    function getColorScale(yearData, nationalAvg) {
      const scores = Array.from(yearData.values()).filter(v => v != null && !isNaN(v));
      if (scores.length === 0) return d3.scaleLinear().domain([0, 100]).range(['#ddd', '#ddd']);
      
      const min = d3.min(scores);
      const max = d3.max(scores);
      const mid = nationalAvg || d3.mean(scores);
      
      // Three-color scale: red (below avg) → yellow (avg) → green (above avg)
      return d3.scaleLinear()
        .domain([min, mid, max])
        .range(['#c0392b', '#f39c12', '#27ae60'])
        .clamp(true);
    }
    
    // Update map function
    function updateMap() {
      console.log(`🎨 Updating map for year ${currentYear}, grade ${currentGrade}`);
      
      // Get year data
      const yearKey = String(currentYear);
      const yearData = new Map();
      stateData.forEach((scores, stateCode) => {
        const score = scores[yearKey];
        if (score != null && !isNaN(score) && score > 0) {
          yearData.set(stateCode, score);
        }
      });
      
      // Get national average
      let currentNatAvg = nationalAvgByYear.get(yearKey);
      if (currentNatAvg == null) {
        const stateScores = Array.from(yearData.values()).filter(v => v != null && !isNaN(v));
        currentNatAvg = stateScores.length > 0 ? d3.mean(stateScores) : null;
      }
      
      natAvgDisplay.html(`National Average: <strong>${currentNatAvg ? currentNatAvg.toFixed(1) : 'N/A'}</strong>`);
      
      // Get color scale
      const colorScale = getColorScale(yearData, currentNatAvg);
      
      // Update paths
      const paths = g.selectAll('path.state')
        .data(states.features, d => d.id);
      
      paths.exit().remove();
      
      const pathsEnter = paths.enter()
        .append('path')
        .attr('class', 'state')
        .attr('d', path)
        .attr('fill', '#ddd')
        .attr('stroke', paper)
        .attr('stroke-width', 1)
        .style('cursor', 'pointer');
      
      const pathsUpdate = pathsEnter.merge(paths);
      
      // Update colors with transition
      pathsUpdate
        .transition()
        .duration(300)
        .attr('fill', d => {
          const usps = idToUSPS.get(d.id);
          if (!usps) return '#ddd';
          const score = yearData.get(usps);
          if (score == null || isNaN(score)) return '#ddd';
          return colorScale(score);
        });
      
      // Event handlers
      pathsUpdate
        .on('mouseover', function(event, d) {
          const usps = idToUSPS.get(d.id);
          const score = yearData.get(usps);
          const stateName = d.properties?.name || usps;
          
          d3.select(this)
            .attr('stroke', ink)
            .attr('stroke-width', 2.5);
          
          tooltip
            .style('visibility', 'visible')
            .html(`
              <div style="line-height: 1.6;">
                <strong style="font-size: 14px;">${stateName} (${usps})</strong><br/>
                <span style="font-size: 12px;">Year: <strong>${currentYear}</strong></span><br/>
                <span style="font-size: 12px;">Score: <strong>${score != null ? score.toFixed(1) : 'N/A'}</strong></span><br/>
                <span style="font-size: 12px;">National Avg: <strong>${currentNatAvg ? currentNatAvg.toFixed(1) : 'N/A'}</strong></span>
              </div>
            `)
            .style('left', (event.pageX + 15) + 'px')
            .style('top', (event.pageY - 15) + 'px');
        })
        .on('mouseout', function() {
          d3.select(this)
            .attr('stroke', paper)
            .attr('stroke-width', 1);
          tooltip.style('visibility', 'hidden');
        });
      
      // Add pin marker for selected state (avatar state)
      g.selectAll('.state-pin').remove();
      if (selectedState) {
        const stateFeature = states.features.find(f => idToUSPS.get(f.id) === selectedState);
        if (stateFeature) {
          const centroid = path.centroid(stateFeature);
          const [cx, cy] = centroid;
          
          // Create a group for the pin marker
          const pinGroup = g.append("g")
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
          pinGroup.append("rect")
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
          
          console.log(`✅ Added pin marker for state: ${selectedState}`);
        }
      }
      
      console.log(`✅ Map updated for year ${currentYear}`);
    }
    
    // Tooltip
    const tooltip = wrap.append('div')
      .attr('class', 'map-tooltip')
      .style('position', 'absolute')
      .style('visibility', 'hidden')
      .style('background', '#ffffff')
      .style('border', `2px solid ${ink}`)
      .style('border-radius', '6px')
      .style('padding', '8px 12px')
      .style('font-family', 'Inter, system-ui')
      .style('font-size', '13px')
      .style('pointer-events', 'none')
      .style('z-index', '1000')
      .style('box-shadow', '0 2px 8px rgba(0,0,0,0.2)');
    
    // Legend
    const legend = wrap.append('div')
      .attr('class', 'map-legend')
      .style('margin-top', '10px')
      .style('padding', '10px')
      .style('background', paper)
      .style('border', `2px solid ${ink}`)
      .style('border-radius', '6px')
      .style('font-family', 'Inter, system-ui')
      .style('font-size', '12px');
    
    function updateLegend() {
      const yearKey = String(currentYear);
      const yearData = new Map();
      stateData.forEach((scores, stateCode) => {
        const score = scores[yearKey];
        if (score != null && !isNaN(score) && score > 0) {
          yearData.set(stateCode, score);
        }
      });
      
      let currentNatAvg = nationalAvgByYear.get(yearKey);
      if (currentNatAvg == null) {
        const stateScores = Array.from(yearData.values()).filter(v => v != null && !isNaN(v));
        currentNatAvg = stateScores.length > 0 ? d3.mean(stateScores) : null;
      }
      
      const scores = Array.from(yearData.values()).filter(v => v != null && !isNaN(v));
      if (scores.length === 0) {
        legend.html(`<div style="color: #c0392b;">No data available for year ${currentYear}</div>`);
        return;
      }
      
      const min = d3.min(scores);
      const max = d3.max(scores);
      
      legend.html(`
        <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
          <span style="font-weight: 600; font-size: 13px;">Score Range (${currentYear}):</span>
          <div style="display: flex; align-items: center; gap: 5px;">
            <span style="font-size: 12px;">${min.toFixed(0)}</span>
            <div style="width: 120px; height: 20px; background: linear-gradient(to right, #c0392b, #f39c12, #27ae60); border: 2px solid ${ink}; border-radius: 3px;"></div>
            <span style="font-size: 12px;">${max.toFixed(0)}</span>
          </div>
          <span style="font-size: 12px;">| National Avg: <strong>${currentNatAvg ? currentNatAvg.toFixed(1) : 'N/A'}</strong></span>
        </div>
      `);
    }
    
    // Initial render
    updateMap();
    updateLegend();
    
    console.log('✅ Map visualization rendered successfully');
    
    return {
      updateYear: (year) => {
        if (years.includes(year)) {
          currentYear = year;
          yearSelect.property('value', year);
          updateMap();
          updateLegend();
        }
      },
      updateGrade: (newGrade) => {
        if ([4, 8].includes(newGrade)) {
          gradeSelect.property('value', newGrade);
          gradeSelect.dispatch('change');
        }
      }
    };
  }
