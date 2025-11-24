# A Look @ Literacy

**CS 171 Final Project**

An interactive data visualization exploring U.S. literacy trends, educational outcomes, and socioeconomic factors affecting student performance.

**Presented by:** Somto Unini, Anchal Bhardwaj, Oakley Browning, Chloe Manilay

---

## Project Overview

This project presents an interactive narrative visualization that allows users to explore literacy outcomes across the United States through multiple perspectives:

1. **The Geography of Literacy** - Interactive choropleth map showing NAEP reading scores by state
2. **What's Your District Spending on You?** - Funding and literacy outcomes visualization
3. **Where Are America's Library Deserts?** - Book access and library availability map
4. **Let's talk about scores** - Interactive scatter plot exploring literacy outcomes
5. **The Long Shadow of Early Literacy** - Score prediction and comparison tool

---

## How to Run

### Prerequisites

- A modern web browser (Chrome, Firefox, Safari, or Edge)
- A local web server (required for loading data files)

### Option 1: Using Python's Built-in Server

```bash
# Navigate to the project directory
cd "cs171proj 2"

# Python 3
python3 -m http.server 8000

# Python 2
python -m SimpleHTTPServer 8000
```

Then open your browser and navigate to:
```
http://localhost:8000/index.html
```

### Option 2: Using Node.js http-server

```bash
# Install http-server globally (if not already installed)
npm install -g http-server

# Navigate to the project directory
cd "cs171proj 2"

# Start the server
http-server -p 8000
```

Then open your browser and navigate to:
```
http://localhost:8000/index.html
```

### Option 3: Using VS Code Live Server

1. Install the "Live Server" extension in VS Code
2. Right-click on `index.html`
3. Select "Open with Live Server"

### Important Notes

- **Do not** open HTML files directly in the browser (using `file://` protocol) as this will cause CORS errors when loading data files
- All visualizations require an active internet connection for loading external libraries (D3.js, TopoJSON, SheetJS)

---

## Project Structure

```
cs171proj 2/
├── index.html              # Landing page
├── investigate.html        # Table of contents / navigation
├── design.html             # Character/avatar creation page
├── desk.html               # Main visualization page (desk interface)
├── dot_guide.html          # Guide page
├── css/
│   ├── style.css          # Main stylesheet
│   ├── styles.css         # Additional styles
│   └── visualization5.css # Visualization 5 specific styles
├── js/
│   ├── visualization1.js              # Score comparison gauge
│   ├── visualization2.js              # Reading map (choropleth)
│   ├── visualization3-with-avatar-pin.js  # Book desert map
│   ├── visualization4.js              # Literacy outcomes scatter plot
│   ├── visualization5_integrated.js   # Funding & literacy outcomes
│   ├── dataHelpers.js                 # NAEP and PIAAC data loading utilities
│   ├── dataOutcomes.js                 # Outcomes data processing
│   └── helpers3.js                    # State name/code conversion utilities
├── data/                   # All data files (see DATA_SOURCES.txt for details)
├── png/                    # Image assets (desk, icons, etc.)
├── scripts/                # Data processing scripts
│   ├── clean_naep_data.js  # Script to clean NAEP Excel files
│   └── visualization2.js   # Alternative visualization2 implementation
└── README.md               # This file
```

---

## Libraries and Dependencies

### External Libraries (Loaded via CDN)

- **D3.js v7** - Data visualization library
  - URL: `https://d3js.org/d3.v7.min.js`
  - Used for: All visualizations, data manipulation, DOM manipulation

- **TopoJSON v3** - Geographic data format
  - URL: `https://unpkg.com/topojson@3`
  - Used for: Map visualizations (choropleth maps)

- **SheetJS (XLSX)** - Excel file parsing
  - URL: `https://cdn.sheetjs.com/xlsx-0.20.0/package/dist/xlsx.full.min.js`
  - Used for: Loading NAEP and PIAAC data from Excel files

### Google Fonts

- **Anton** - Display font for headings
- **Bebas Neue** - Display font alternative
- **IBM Plex Mono** - Monospace font for data labels
- **Inter** - Body text font

### Node.js Dependencies (for data processing scripts only)

If you need to run the data cleaning scripts:

```bash
npm install xlsx
```

---

## Navigation Flow

1. **index.html** → Landing page with project introduction
2. **investigate.html** → Table of contents / navigation hub
3. **design.html** → Create your character/avatar (select state, grade, SES)
4. **desk.html** → Main interactive visualizations page
   - Click on desk items (map, laptop, books, paper, gradcap) to explore visualizations
   - Progress is tracked via localStorage

---

## Key Features

### Character/Avatar System

- Users create a character on `design.html` by selecting:
  - **State**: Their home state (two-letter code)
  - **Grade**: 4th or 8th grade
  - **SES**: Low, Medium, or High socioeconomic status
  - **Name**: Student name

- Character data is stored in `localStorage` and used throughout visualizations to personalize the experience

### Progress Tracking

- The desk page tracks which visualizations have been viewed
- Progress is stored in `localStorage` with key `deskVizProgress_v2`
- Grey dot indicators show which items haven't been explored yet

### Data Caching

- Visualizations implement caching to avoid redundant data fetches
- NAEP data is cached per grade
- Outcomes data uses localStorage caching with 24-hour expiration

---

## Data Sources

See `data/DATA_SOURCES.txt` for a comprehensive list of all data files used in this project, including:
- Data source descriptions
- Field descriptions
- Usage in visualizations

---

## Browser Compatibility

- **Chrome/Edge**: Full support
- **Firefox**: Full support
- **Safari**: Full support
- **Internet Explorer**: Not supported

---

## Troubleshooting

### Visualizations not loading

1. **Check browser console** (F12) for error messages
2. **Verify internet connection** - external libraries load from CDN
3. **Ensure you're using a local server** - not opening files directly
4. **Clear browser cache** if data seems stale

### Data not displaying

1. Check that all data files exist in the `data/` folder
2. Verify file names match exactly (case-sensitive)
3. Check browser console for fetch errors

### Character/avatar not working

1. Ensure `localStorage` is enabled in your browser
2. Try creating a new character on `design.html`
3. Check browser console for localStorage errors

### Map visualizations not rendering

1. Verify TopoJSON library is loaded
2. Check that `us-states-10m.json` exists in `data/` folder
3. Ensure D3.js is loaded before visualization scripts

---

## Development Notes

### Code Organization

- Each visualization is self-contained in its own module
- Data loading utilities are centralized in `dataHelpers.js` and `dataOutcomes.js`
- Helper functions for state conversions are in `helpers3.js`

### Data Processing

- NAEP data is cleaned using `scripts/clean_naep_data.js`
- The cleaned data is saved as `data/naep_cleaned.json` for faster loading
- Excel files are parsed client-side using SheetJS

### Performance Optimizations

- Data caching to reduce redundant fetches
- Parallel data loading where possible
- Lazy loading of visualizations (only render when clicked)

---

## License

This project was created for CS 171 (Data Visualization) at Harvard University.

---

## Contact

For questions or issues, please contact the project team members.

