# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**indian-tax-pdf-extractor** - A monorepo containing an NPM package for extracting structured data from Indian tax PDFs (ITR-1, GSTR-1, GSTR-2B, GSTR-3B) and a React demo application.

The package uses the `unpdf` library for PDF text extraction and applies regex-based rules with coordinate matching for precise field extraction. It supports both full-document and selection-based extraction modes.

## ⚠️ CRITICAL: Always Check PROGRESS.md

**BEFORE starting any work, ALWAYS read `PROGRESS.md` first.**

The `PROGRESS.md` file is the living documentation of:
- Current work in progress and active debugging sessions
- Known issues and their status (resolved/in-progress/blocked)
- Recent changes and why they were made
- Step-by-step debugging findings with timestamps
- Test results and analysis
- Files that were created, modified, or removed
- Root causes of bugs and their solutions

**When making ANY changes to the codebase:**
1. Read `PROGRESS.md` to understand the current context
2. Make your changes
3. **UPDATE `PROGRESS.md`** with:
   - What you changed and why
   - Files modified/created/deleted
   - Test results if applicable
   - Any new issues discovered
   - Timestamp your updates

**Format for updates:**
```markdown
### [Date] [Time] - [Brief Title]
**Actions:**
- What was done
- Files changed

**Findings:**
- What was discovered
- Test results

**Status:** ✅ Fixed / ⚠️ In Progress / ❌ Blocked
```

**This is NOT optional.** The PROGRESS.md file ensures continuity across sessions and prevents repeating work or breaking fixes that were already applied.

## Repository Structure

```
rules_cli/
├── package/                          # NPM package (v2.1.0)
│   ├── index.js                      # Main exports, dynamic unpdf loader
│   ├── extractor.js                  # PDFExtractor class (NOT index.js)
│   ├── cli.js                        # CLI tool (itr-extract command)
│   ├── rules/*.json                  # Extraction rules with regex patterns & coordinates
│   ├── pdf/                          # Sample PDFs for testing
│   ├── tests/                        # Python test suite
│   └── scripts/                      # Coordinate recapture & update tools
│
└── test_react/                       # React demo app
    ├── src/
    │   ├── PDFExtractorPage.js       # Main extraction UI
    │   ├── PDFViewer.js              # PDF rendering with selection
    │   ├── components/
    │   │   ├── SelectionCanvas.js    # Drag-to-select on PDF
    │   │   ├── DebugConsole.js       # Extraction debugging UI
    │   │   └── CoordinateDebugger.js # Coordinate system visualization
    │   ├── contexts/
    │   │   └── SelectionContext.js   # React Context for selections
    │   └── utils/                    # Helper utilities
    └── package.json
```

## Common Commands

### Package Development

```bash
# Install package dependencies
cd package
npm install

# Run CLI extraction
node cli.js extract -p pdf/2B.pdf -r rules/gstr2b-rules.json -f json

# CLI options
node cli.js extract -p <pdf> -r <rules> -f <json|csv|md> [--stats] [--raw] [--console]

# Build package tarball
npm pack

# Run comprehensive test suite (all PDFs)
cd tests
python3 comprehensive_extraction_test.py

# Recapture coordinates from a PDF
cd scripts
node recapture-coordinates.js <pdf_path> <rules_path> [output_path]

# Update package with new coordinates and rebuild
./update-package.sh
```

### React App Development

```bash
# Install React app dependencies
cd test_react
npm install

# Start dev server (runs on http://localhost:3000)
npm start

# Build production bundle
npm build

# Run tests
npm test
```

### Updating Package in React App

After making changes to the package:

```bash
# From package directory
cd package
npm pack

# From test_react directory
cd ../test_react
npm install ../package/indian-tax-pdf-extractor-2.1.0.tgz
```

Or use the automated script:

```bash
cd package/scripts
./update-package.sh
```

## Architecture

### Core Extraction Logic (package/)

**Key File: `extractor.js` (NOT `index.js`)**

The PDFExtractor class is defined in `extractor.js`. The `index.js` file only handles dynamic ESM imports for unpdf compatibility.

**PDFExtractor Methods:**
- `extract(pdfBuffer)` - Full document extraction using all rules
- `extractWithSelections(pdfBuffer, selections, tolerance)` - Extract only fields overlapping with user selections
- `extractFormatted(pdfBuffer)` - Apply output_format sections from rules
- `exportToCSV(pdfBuffer)` / `exportToMarkdown(pdfBuffer)` - Export formatted data
- `getStats(pdfBuffer)` - Extraction statistics

**Extraction Flow:**
1. Convert PDF buffer to Uint8Array (handles Node Buffer, ArrayBuffer, Uint8Array)
2. Extract full text using unpdf (`extractText` with `mergePages: true`)
3. Apply regex patterns to text (with transform support: number, refund, date, uppercase, lowercase)
4. For selection mode: filter fields by coordinate overlap before applying regex
5. Return structured results with metadata

### Rules Files (package/rules/)

JSON files defining extraction patterns:

```json
{
  "name": "Rule Set Name",
  "version": "2.0.0",
  "description": "Description",
  "rules": {
    "field_name": {
      "type": "regex",
      "pattern": "Regex pattern with capture group",
      "group": 1,
      "description": "Field description",
      "transform": "number|refund|date|uppercase|lowercase",
      "coordinates": {
        "page": 1,
        "x": 100.5,
        "y": 200.3,
        "width": 50,
        "height": 12
      }
    }
  }
}
```

**CRITICAL: Coordinate System**

PDF coordinates use bottom-left origin (Y increases upward), but React canvas uses top-left origin (Y increases downward). The package expects **PDF coordinates** in rules files. Canvas coordinates are converted in the React app before sending to the package.

Conversion formula (in React app):
```javascript
pdfY = pageHeight - canvasY - selectionHeight
```

### Selection-Based Extraction

**How It Works:**
1. User draws selections on PDF in React app (canvas coordinates)
2. React app converts to PDF coordinates and sends to package
3. Package filters rules to only those with coordinates overlapping selections (with tolerance)
4. Package applies regex to **full text** for matched fields (NOT coordinate-based text extraction)
5. Package returns only selected fields

**Overlap Detection:**
- Expands selection box by tolerance (default: 20 PDF points)
- Checks bounding box overlap using standard rectangle intersection
- Must be on same page
- Extensive debug logging available (see `extractWithSelections` in extractor.js)

### React App Architecture (test_react/)

**State Management:**
- `SelectionContext` - Global state for PDF selections (using React Context + useReducer)
- Provides: selections array, selectionMode toggle, textItemsCache (per-page)

**Key Components:**
- `PDFExtractorPage.js` - Main UI, file upload, extraction modes, output display
- `PDFViewer.js` - Renders PDF pages, manages viewport/scale
- `SelectionCanvas.js` - Overlay for drag-to-select, draws selection boxes
- `DebugConsole.js` - 3 tabs: Coordinates Sent, Package Output, Overlap Analysis
- `CoordinateDebugger.js` - Visual coordinate system explanation with real-time data

**Extraction Modes:**
- Full: Extract all fields from entire document
- Selection: Extract only fields in selected regions

### Coordinate Recapture

When selections don't match fields (common issue), recapture coordinates:

1. Use `recapture-coordinates.js` (Node) or `recapture-coordinates.py` (Python)
2. Uses unpdf to extract text items with positions (same as package)
3. Maps each field name to text item coordinates
4. Updates rules file with new coordinates
5. Rebuilds and reinstalls package

This ensures coordinates match the extraction engine exactly.

## Common Issues & Solutions

### Selection Returns 0 Fields

**Cause:** Coordinates in rules file don't match actual PDF coordinate system.

**Solution:**
```bash
cd package/scripts
node recapture-coordinates.js ../pdf/2B.pdf ../rules/gstr2b-rules.json
./update-package.sh
```

### "unpdf is not defined" Error

**Cause:** unpdf is ESM-only, requires dynamic import.

**Solution:** Use the pattern in `index.js` - dynamic import with lazy loading wrapper.

### Fields Extracted in Wrong Order

**Note:** Extraction order follows rule definition order in JSON, not PDF page order. The raw text is merged across all pages (`mergePages: true`), so page boundaries don't affect matching.

### Coordinates Out of Bounds

**Debug Steps:**
1. Enable DebugConsole in React app (automatically shown after extraction)
2. Check "Coordinates Sent" tab for selection boxes
3. Check "Overlap Analysis" tab for field matching logic
4. Use CoordinateDebugger component (click "Debug" button) to visualize coordinate systems
5. Compare with COORDINATE_SYSTEM_EXPLAINED.md

## Testing

**Comprehensive Test Suite:**
```bash
cd package/tests
python3 comprehensive_extraction_test.py
```

Tests all PDFs (GSTR-2B, GSTR-3B, ITR-1) and generates:
- Field-by-field success/failure report
- Overall statistics per document
- Missing fields list
- Extraction accuracy percentages

**Selection Extraction Tests:**
```bash
python3 test_selection_extraction.py
python3 test_3b_selection.py
```

## Important Notes

- The PDFExtractor class is in `extractor.js`, not `index.js`
- Always use `mergePages: true` for text extraction (current implementation)
- Regex patterns use `gims` flags (global, case-insensitive, multiline, dotAll)
- Transform types: number (removes commas), refund (handles signs), date, uppercase, lowercase
- Coordinate tolerance default: 20 PDF points (configurable in extractWithSelections)
- Package version: 2.1.0 (check package.json before updating)
- Node.js requirement: >=14.0.0
- Extensive debug logging in extractWithSelections (search for console.log)

## Key Achievements

- GSTR-2B: 262/262 fields (100%)
- GSTR-3B: 31/132 fields (23.5%) with 100% accuracy
- ITR-1: 32/33 fields (97%)
- Overall: 325/427 fields (76.1%)
- Zero regex errors after fixes
- Coordinate recapture system for selection accuracy

## File Naming Conventions

- Rules files: `<form-type>-rules.json` (e.g., gstr2b-rules.json)
- Sample PDFs: Short names (2B.pdf, 3B.pdf, itrsss.pdf)
- Scripts: Lowercase with hyphens (recapture-coordinates.js)
- React components: PascalCase (SelectionCanvas.js)
- Context/utils: camelCase for utilities, PascalCase for components
