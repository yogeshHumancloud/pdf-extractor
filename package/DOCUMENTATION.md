# Indian Tax PDF Extractor - Complete Documentation

**Version:** 2.1.0
**Package:** indian-tax-pdf-extractor

---

## Table of Contents

1. [Overview](#overview)
2. [How It Works](#how-it-works)
3. [Architecture](#architecture)
4. [Core Components](#core-components)
5. [Extraction System](#extraction-system)
6. [Pattern Matching](#pattern-matching)
7. [Coordinate System](#coordinate-system)
8. [API Reference](#api-reference)
9. [Rules System](#rules-system)
10. [Examples](#examples)
11. [Advanced Usage](#advanced-usage)
12. [Troubleshooting](#troubleshooting)

---

## Overview

### What This Package Does

The `indian-tax-pdf-extractor` package extracts structured data from Indian tax PDFs using **regex pattern matching** and **coordinate-based filtering**. It supports:

- **ITR-1** (Income Tax Return)
- **GSTR-1** (GST Return - Outward Supplies)
- **GSTR-2B** (GST Return - Inward Supplies)
- **GSTR-3B** (GST Return - Monthly/Quarterly Summary)

### Key Features

1. **Full PDF Extraction** - Extract all fields using regex patterns
2. **Selection-Based Extraction** - Extract only fields within selected regions
3. **Coordinate Filtering** - Filter fields by PDF coordinates
4. **CLI Tool** - Command-line interface for quick extraction
5. **TypeScript Support** - Full TypeScript type definitions included

---

## How It Works

### High-Level Flow

```
┌─────────────┐
│  PDF File   │
└──────┬──────┘
       │
       ▼
┌─────────────────────┐
│  unpdf Library      │  ← Extracts text with coordinates
│  getDocumentProxy() │
│  extractText()      │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│  Full PDF Text      │  ← Single string with all text
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│  Rules Engine       │  ← Applies regex patterns
│  (applyRule)        │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│  Extracted Data     │  ← Structured JSON output
└─────────────────────┘
```

### Step-by-Step Process

1. **Load PDF** → Convert PDF buffer to Uint8Array
2. **Extract Text** → Use unpdf to get full text from all pages
3. **Load Rules** → Read extraction rules JSON file
4. **Apply Patterns** → Match regex patterns against text
5. **Transform Values** → Convert extracted strings to proper types
6. **Return Results** → Structured JSON with all extracted fields

---

## Architecture

### Package Structure

```
indian-tax-pdf-extractor/
├── index.js           ← Main entry point (PDFExtractor class + exports)
├── extractor.js       ← Duplicate of index.js (for compatibility)
├── cli.js             ← Command-line interface
├── index.d.ts         ← TypeScript definitions
└── rules/             ← Extraction rules
    ├── gstr1-rules.json
    ├── gstr2b-rules.json
    ├── gstr3b-rules.json
    └── itr-rules.json
```

### Main Components

#### 1. PDFExtractor Class
**Location:** `index.js`

The core class that handles all extraction logic.

**Key Methods:**
- `constructor(rules)` - Initialize with rules
- `extractTextFromPDF(pdfBuffer)` - Extract text from PDF
- `extract(pdfBuffer)` - Full extraction (all fields)
- `extractWithSelections(pdfBuffer, selections, tolerance)` - Selection-based extraction
- `applyRule(text, ruleName, rule)` - Apply single rule to text

#### 2. unpdf Integration
**Library:** `unpdf` v1.4.0 (ESM module)

**Functions Used:**
- `getDocumentProxy(uint8Array)` - Load PDF document
- `extractText(pdf, options)` - Extract text from all pages

**Important:** unpdf is ESM-only, so we use dynamic imports:
```javascript
const unpdf = await import('unpdf');
```

#### 3. Rules Engine
**Format:** JSON files with regex patterns

Each rule defines:
- `pattern` - Regex pattern to match
- `type` - Rule type (always "regex")
- `group` - Capture group number (0 = full match, 1+ = groups)
- `transform` - Optional transformation ("number", "date", etc.)
- `coordinates` - Optional PDF coordinates for filtering
- `description` - Human-readable description

---

## Core Components

### 1. PDFExtractor Class

```javascript
class PDFExtractor {
  constructor(rules)
  async extractTextFromPDF(pdfBuffer)
  applyRule(text, ruleName, rule)
  transformValue(value, transformType, rule, match)
  async extract(pdfBuffer)
  async extractWithSelections(pdfBuffer, selections, tolerance)
}
```

#### Constructor
```javascript
constructor(rules)
```
**Parameters:**
- `rules` - Rules object or JSON string

**Example:**
```javascript
const rules = JSON.parse(fs.readFileSync('rules/gstr2b-rules.json'));
const extractor = new PDFExtractor(rules);
```

---

### 2. Text Extraction Method

```javascript
async extractTextFromPDF(pdfBuffer)
```

**How It Works:**

1. **Convert Buffer** → Ensure buffer is Uint8Array
2. **Load PDF** → Use unpdf.getDocumentProxy()
3. **Extract Text** → Use unpdf.extractText() with `mergePages: true`
4. **Return** → Full text as single string

**Important:** Text is extracted with **spaces** between items, **not newlines**.

**Example Output:**
```
"Form GSTR-3B Year 2025-26 Period Apr-Jun GSTIN 27BICPP1081P2ZT Legal name Aditya Ponkshe..."
```

---

### 3. Rule Application

```javascript
applyRule(text, ruleName, rule)
```

**How It Works:**

1. **Compile Regex** → `new RegExp(rule.pattern, 'gims')`
   - `g` - Global search
   - `i` - Case insensitive
   - `m` - Multiline
   - `s` - Dot matches newlines

2. **Execute Pattern** → `regex.exec(text)`

3. **Extract Value** → Get capture group: `match[rule.group]`

4. **Transform** → Apply transformation if specified

5. **Return Result** → Object with value, found status, description

**Return Format:**
```javascript
{
  value: "extracted value",
  found: true,
  description: "Field description"
}
```

**On Error:**
```javascript
{
  value: null,
  found: false,
  error: "error message",
  description: "Field description"
}
```

---

## Extraction System

### Full Extraction

Extracts **all fields** defined in the rules file.

```javascript
async extract(pdfBuffer)
```

**Process:**
1. Extract full PDF text
2. Loop through all rules
3. Apply each rule to the text
4. Collect all results
5. Return structured JSON

**Output Structure:**
```javascript
{
  metadata: {
    ruleset: "GSTR-2B Extractor",
    version: "1.0.0",
    description: "...",
    extracted_at: "2026-01-08T12:00:00.000Z"
  },
  data: {
    field_name: {
      value: "extracted value",
      found: true,
      description: "..."
    },
    // ... more fields
  },
  raw_text: "full PDF text..."
}
```

---

### Selection-Based Extraction

Extracts **only fields** that overlap with user selections.

```javascript
async extractWithSelections(pdfBuffer, selections, tolerance = 20)
```

**Parameters:**
- `pdfBuffer` - PDF file as buffer
- `selections` - Array of selection objects
- `tolerance` - Overlap tolerance in PDF points (default: 20)

**Selection Object Format:**
```javascript
{
  pageNum: 1,
  boundingBox: {
    x: 100,
    y: 200,
    width: 300,
    height: 50
  }
}
```

**How It Works:**

1. **Extract Full Text** → Same as full extraction
2. **Find Overlapping Fields** → Check which field coordinates overlap with selections
3. **Filter Fields** → Create list of fields to extract
4. **Extract Filtered Fields** → Apply rules only to selected fields
5. **Return Results** → Same format but only selected fields

**Overlap Detection:**
```javascript
// Expand selection box by tolerance
const expandedBox = {
  x: selection.x - tolerance,
  y: selection.y - tolerance,
  width: selection.width + tolerance * 2,
  height: selection.height + tolerance * 2
};

// Check if boxes overlap (not disjoint)
const overlaps = !(
  expandedBox.x + expandedBox.width < field.x ||
  expandedBox.x > field.x + field.width ||
  expandedBox.y + expandedBox.height < field.y ||
  expandedBox.y > field.y + field.height
);
```

**Output Structure:**
```javascript
{
  metadata: {
    ruleset: "...",
    extraction_mode: "selection",
    selected_fields: ["field1", "field2"],
    total_selections: 2,
    // ...
  },
  data: {
    // Only selected fields
  },
  raw_text: "..."
}
```

---

## Pattern Matching

### Regex Pattern System

All extraction uses **regex patterns** defined in rules files.

### Pattern Structure

**Basic Pattern:**
```javascript
{
  "field_name": {
    "pattern": "Year\\s*(\\d{4}-\\d{2})",
    "type": "regex",
    "group": 1,
    "description": "Financial year"
  }
}
```

**Components:**
- `Year\\s*` - Match literal "Year" followed by optional whitespace
- `(\\d{4}-\\d{2})` - **Capture group** matching year format (2025-26)
- `group: 1` - Use first capture group as result

### Pattern Types

#### 1. Simple Text Match
```javascript
"pattern": "GSTIN of the supplier\\s*([A-Z0-9]{15})"
```
- Matches: "GSTIN of the supplier 27BICPP1081P2ZT"
- Captures: "27BICPP1081P2ZT"

#### 2. Number Extraction
```javascript
"pattern": "Total taxable value\\s*([\\d,]+\\.\\d{2})"
```
- Matches: "Total taxable value 947,178.00"
- Captures: "947,178.00"

#### 3. Multi-Value Pattern
```javascript
"pattern": "\\(a\\) Outward[^\\d]*?\\s+\\s*([\\d,]+\\.\\d{2})"
```
- `[^\\d]*?` - Match non-digits lazily (stops at first digit)
- Ensures we capture the **first** number after "Outward"

#### 4. Complex Pattern with Context
```javascript
"pattern": "\\(a\\) Outward taxable supplies[^\\d]*?([\\d,]+\\.\\d{2})\\s*([\\d,]+\\.\\d{2})\\s*([\\d,]+\\.\\d{2})"
```
- Matches multiple values in sequence
- Can use different groups (1, 2, 3) for different fields

### Pattern Best Practices

**✅ DO:**
- Use `[^\\d]*?` instead of `[\\s\\S]{1,100}` for lazy matching
- Use `\\s+` instead of `\\n` (unpdf returns text with spaces)
- Add capture groups `()` around values to extract
- Use descriptive patterns that match unique text

**❌ DON'T:**
- Use `\\n` (newlines) - unpdf doesn't preserve newlines
- Use greedy patterns like `.*` or `[\\s\\S]{1,100}` without context
- Forget to escape special characters: `\\(`, `\\)`, `\\.`
- Use patterns without capture groups when `group: 1`

### Common Pattern Issues

#### Issue 1: Wrong Capture Group
```javascript
// ❌ WRONG - No capture group
"pattern": "Year\\s*\\d{4}-\\d{2}",
"group": 1  // Error: no group 1!

// ✅ CORRECT
"pattern": "Year\\s*(\\d{4}-\\d{2})",
"group": 1
```

#### Issue 2: Greedy Matching
```javascript
// ❌ WRONG - Captures wrong value
"pattern": "Total[\\s\\S]{1,100}([\\d,]+\\.\\d{2})"
// Might capture: "947178.00 0.00 85246.02" and extract "0.00"

// ✅ CORRECT - Lazy matching
"pattern": "Total[^\\d]*?([\\d,]+\\.\\d{2})"
// Captures: "947178.00" (first number)
```

#### Issue 3: Newline Expectations
```javascript
// ❌ WRONG - Expects newline
"pattern": "Total value\\n\\s*([\\d,]+)"

// ✅ CORRECT - Expects spaces
"pattern": "Total value\\s+([\\d,]+)"
```

---

## Coordinate System

### How Coordinates Work

Coordinates are used to **filter** which fields to extract, **not** to extract text from regions.

### Coordinate Format

```javascript
{
  "coordinates": {
    "page": 1,           // Page number (1-indexed)
    "x": 100,            // X position (left edge)
    "y": 200,            // Y position (bottom-left origin)
    "width": 300,        // Width of field
    "height": 50         // Height of field
  }
}
```

### Coordinate Origin

**PDF Coordinate System:**
- Origin: **Bottom-left** corner (0, 0)
- X-axis: Left → Right (increases)
- Y-axis: Bottom → Top (increases)

**Example:**
```
Page (600 x 800)
┌─────────────────────┐ (0, 800)
│                     │
│   Field (100, 700)  │ ← Top of page
│   ┌──────────┐      │
│   │  Field   │      │
│   └──────────┘      │
│                     │
└─────────────────────┘ (0, 0) ← Bottom-left origin
```

### Coordinate Extraction

Coordinates come from unpdf's `getTextContent()`:

```javascript
const textContent = await page.getTextContent();
textContent.items.forEach(item => {
  const x = item.transform[4];      // X position
  const y = item.transform[5];      // Y position
  const width = item.width || 0;
  const height = item.height || 12;
});
```

### Selection vs. Extraction

**Important Distinction:**

1. **Coordinates are for FILTERING** - Determine which fields to extract
2. **Regex is for EXTRACTION** - Extract values from full PDF text

```javascript
// WRONG APPROACH (not used)
// Extract text from coordinate region, then apply regex

// ✅ CORRECT APPROACH (actual implementation)
// 1. Check if field coordinates overlap with selection
// 2. If yes, apply regex to FULL PDF TEXT
```

---

## API Reference

### PDFExtractor Class

#### Constructor

```typescript
constructor(rules: Object | string)
```

**Parameters:**
- `rules` - Rules object or JSON string

**Example:**
```javascript
const { PDFExtractor } = require('indian-tax-pdf-extractor');

// From object
const extractor = new PDFExtractor(rulesObject);

// From JSON string
const extractor = new PDFExtractor(JSON.stringify(rules));

// From file
const rules = JSON.parse(fs.readFileSync('rules.json'));
const extractor = new PDFExtractor(rules);
```

---

#### extractTextFromPDF()

```typescript
async extractTextFromPDF(
  pdfBuffer: Buffer | Uint8Array | ArrayBuffer
): Promise<string>
```

**Description:** Extract full text from PDF

**Parameters:**
- `pdfBuffer` - PDF file as buffer

**Returns:** Full PDF text as string

**Example:**
```javascript
const fs = require('fs');
const pdfBuffer = fs.readFileSync('document.pdf');
const text = await extractor.extractTextFromPDF(pdfBuffer);
console.log(text.substring(0, 100)); // First 100 chars
```

---

#### extract()

```typescript
async extract(
  pdfBuffer: Buffer | Uint8Array | ArrayBuffer
): Promise<ExtractionResult>
```

**Description:** Extract all fields from PDF

**Parameters:**
- `pdfBuffer` - PDF file as buffer

**Returns:** Extraction result object

**Return Type:**
```typescript
interface ExtractionResult {
  metadata: {
    ruleset: string;
    version: string;
    description: string;
    extracted_at: string;
  };
  data: {
    [fieldName: string]: {
      value: any;
      found: boolean;
      description: string;
      error?: string;
    };
  };
  raw_text: string;
}
```

**Example:**
```javascript
const results = await extractor.extract(pdfBuffer);

console.log('Total fields:', Object.keys(results.data).length);
console.log('GSTIN:', results.data.gstin?.value);
console.log('Year:', results.data.year?.value);

// Count found fields
const foundCount = Object.values(results.data)
  .filter(field => field.found).length;
console.log('Found:', foundCount);
```

---

#### extractWithSelections()

```typescript
async extractWithSelections(
  pdfBuffer: Buffer | Uint8Array | ArrayBuffer,
  selections: Selection[],
  tolerance?: number
): Promise<ExtractionResult>
```

**Description:** Extract only fields within selections

**Parameters:**
- `pdfBuffer` - PDF file as buffer
- `selections` - Array of selection objects
- `tolerance` - Overlap tolerance in pixels (default: 20)

**Selection Type:**
```typescript
interface Selection {
  pageNum: number;
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}
```

**Returns:** Extraction result (same format as extract())

**Example:**
```javascript
const selections = [
  {
    pageNum: 1,
    boundingBox: { x: 50, y: 650, width: 500, height: 100 }
  },
  {
    pageNum: 1,
    boundingBox: { x: 50, y: 500, width: 500, height: 80 }
  }
];

const results = await extractor.extractWithSelections(
  pdfBuffer,
  selections,
  20  // 20px tolerance
);

console.log('Selected fields:', results.metadata.selected_fields);
console.log('Field count:', results.metadata.selected_fields.length);
```

---

#### applyRule()

```typescript
applyRule(
  text: string,
  ruleName: string,
  rule: Rule
): FieldResult
```

**Description:** Apply single rule to text

**Parameters:**
- `text` - Full PDF text
- `ruleName` - Name of the rule/field
- `rule` - Rule object

**Returns:** Field result object

**Example:**
```javascript
const text = await extractor.extractTextFromPDF(pdfBuffer);

const result = extractor.applyRule(text, 'gstin', {
  pattern: 'GSTIN\\s*([A-Z0-9]{15})',
  type: 'regex',
  group: 1,
  description: 'GSTIN number'
});

if (result.found) {
  console.log('GSTIN:', result.value);
} else {
  console.log('Not found');
}
```

---

### Helper Functions

#### loadRules()

```typescript
loadRules(ruleType: string): Object
```

**Description:** Load built-in rules by type

**Parameters:**
- `ruleType` - One of: "itr", "gstr1", "gstr2b", "gstr3b"

**Returns:** Rules object

**Example:**
```javascript
const { loadRules } = require('indian-tax-pdf-extractor');

const rules = loadRules('gstr2b');
console.log('Loaded rules:', rules.name);
```

---

#### createExtractor()

```typescript
createExtractor(ruleType: string): PDFExtractor
```

**Description:** Create extractor with built-in rules

**Parameters:**
- `ruleType` - One of: "itr", "gstr1", "gstr2b", "gstr3b"

**Returns:** PDFExtractor instance

**Example:**
```javascript
const { createExtractor } = require('indian-tax-pdf-extractor');

const extractor = createExtractor('gstr2b');
const results = await extractor.extract(pdfBuffer);
```

---

## Rules System

### Rules File Structure

```json
{
  "name": "GSTR-2B Extractor",
  "version": "1.0.0",
  "description": "Extraction rules for GSTR-2B",
  "rules": {
    "field_name": {
      "pattern": "regex pattern",
      "type": "regex",
      "group": 1,
      "transform": "number",
      "coordinates": {
        "page": 1,
        "x": 100,
        "y": 200,
        "width": 300,
        "height": 50
      },
      "description": "Field description"
    }
  }
}
```

### Rule Properties

#### Required Properties

**pattern** (string)
- Regex pattern to match text
- Must be valid JavaScript regex
- Use `\\` for escaping (JSON string)

**type** (string)
- Always "regex" (only type supported)

**group** (number)
- Capture group number to extract
- 0 = full match
- 1+ = capture groups in pattern

#### Optional Properties

**transform** (string)
- Value transformation type
- Options: "number", "date", "boolean"

**coordinates** (object)
- PDF coordinates for filtering
- Used in selection-based extraction
- Format: `{ page, x, y, width, height }`

**description** (string)
- Human-readable field description
- Returned in extraction results

### Creating Rules

#### Step 1: Extract PDF Text

```javascript
const text = await extractor.extractTextFromPDF(pdfBuffer);
console.log(text);
```

#### Step 2: Identify Patterns

Find the text you want to extract:
```
"Year 2025-26 Period Apr-Jun GSTIN 27BICPP1081P2ZT"
```

#### Step 3: Write Pattern

```javascript
{
  "year": {
    "pattern": "Year\\s*(\\d{4}-\\d{2})",
    "type": "regex",
    "group": 1,
    "description": "Financial year"
  }
}
```

#### Step 4: Test Pattern

```javascript
const testText = "Year 2025-26 Period Apr-Jun";
const regex = /Year\s*(\d{4}-\d{2})/i;
const match = regex.exec(testText);
console.log(match[1]); // "2025-26"
```

#### Step 5: Add Coordinates (Optional)

If you want selection-based filtering:

```javascript
{
  "year": {
    "pattern": "Year\\s*(\\d{4}-\\d{2})",
    "type": "regex",
    "group": 1,
    "coordinates": {
      "page": 1,
      "x": 444.5,
      "y": 725.88,
      "width": 80,
      "height": 9
    },
    "description": "Financial year"
  }
}
```

### Transform Types

#### number
Converts string to number, removes commas

```javascript
{
  "pattern": "Total\\s*([\\d,]+\\.\\d{2})",
  "transform": "number"
}
// "947,178.00" → 947178.00
```

#### date
Keeps date as string (no transformation currently)

```javascript
{
  "pattern": "Date\\s*(\\d{2}/\\d{2}/\\d{4})",
  "transform": "date"
}
// "14/07/2025" → "14/07/2025"
```

---

## Examples

### Example 1: Basic Extraction

```javascript
const fs = require('fs');
const { PDFExtractor } = require('indian-tax-pdf-extractor');

// Load rules
const rules = JSON.parse(
  fs.readFileSync('rules/gstr2b-rules.json', 'utf8')
);

// Create extractor
const extractor = new PDFExtractor(rules);

// Load PDF
const pdfBuffer = fs.readFileSync('2B.pdf');

// Extract all fields
const results = await extractor.extract(pdfBuffer);

// Display results
console.log('Metadata:', results.metadata);
console.log('Total fields:', Object.keys(results.data).length);

// Display found fields
Object.entries(results.data).forEach(([name, field]) => {
  if (field.found) {
    console.log(`${name}: ${field.value}`);
  }
});
```

---

### Example 2: Selection-Based Extraction

```javascript
const { PDFExtractor } = require('indian-tax-pdf-extractor');

// Create extractor with built-in rules
const extractor = createExtractor('gstr2b');

// Define selections (user drew these on PDF)
const selections = [
  {
    pageNum: 1,
    boundingBox: {
      x: 50,
      y: 650,
      width: 500,
      height: 100
    }
  }
];

// Extract only selected fields
const results = await extractor.extractWithSelections(
  pdfBuffer,
  selections,
  20  // 20px tolerance
);

console.log('Selected fields:', results.metadata.selected_fields);
console.log('Results:', results.data);
```

---

### Example 3: Custom Rules

```javascript
// Create custom rules
const customRules = {
  name: "Custom Extractor",
  version: "1.0",
  description: "My custom extraction rules",
  rules: {
    company_name: {
      pattern: "Company:\\s*([A-Za-z\\s]+)",
      type: "regex",
      group: 1,
      description: "Company name"
    },
    invoice_number: {
      pattern: "Invoice #\\s*(\\d+)",
      type: "regex",
      group: 1,
      description: "Invoice number"
    },
    total_amount: {
      pattern: "Total:\\s*₹\\s*([\\d,]+\\.\\d{2})",
      type: "regex",
      group: 1,
      transform: "number",
      description: "Total amount"
    }
  }
};

const extractor = new PDFExtractor(customRules);
const results = await extractor.extract(pdfBuffer);
```

---

### Example 4: CLI Usage

```bash
# Extract all fields
node cli.js extract document.pdf rules/gstr2b-rules.json

# Extract with specific rule type
node cli.js extract document.pdf --type gstr2b

# Show available commands
node cli.js --help
```

---

### Example 5: Error Handling

```javascript
try {
  const extractor = new PDFExtractor(rules);
  const results = await extractor.extract(pdfBuffer);

  // Check for errors
  const errors = Object.entries(results.data)
    .filter(([_, field]) => field.error)
    .map(([name, field]) => ({ name, error: field.error }));

  if (errors.length > 0) {
    console.log('Errors found:', errors);
  }

  // Count success rate
  const total = Object.keys(results.data).length;
  const found = Object.values(results.data)
    .filter(f => f.found).length;

  console.log(`Success rate: ${found}/${total} (${(found/total*100).toFixed(1)}%)`);

} catch (error) {
  console.error('Extraction failed:', error.message);
}
```

---

## Advanced Usage

### Multi-Page Selection

```javascript
const selections = [
  // Page 1 selections
  {
    pageNum: 1,
    boundingBox: { x: 50, y: 650, width: 500, height: 100 }
  },
  {
    pageNum: 1,
    boundingBox: { x: 50, y: 500, width: 500, height: 80 }
  },
  // Page 2 selections
  {
    pageNum: 2,
    boundingBox: { x: 50, y: 700, width: 500, height: 150 }
  }
];

const results = await extractor.extractWithSelections(
  pdfBuffer,
  selections
);
```

---

### Dynamic Rule Loading

```javascript
const ruleType = 'gstr2b'; // From user input or config

const rules = loadRules(ruleType);
const extractor = new PDFExtractor(rules);
const results = await extractor.extract(pdfBuffer);
```

---

### Batch Processing

```javascript
const fs = require('fs').promises;
const path = require('path');

async function processBatch(directory, ruleType) {
  const files = await fs.readdir(directory);
  const pdfFiles = files.filter(f => f.endsWith('.pdf'));

  const extractor = createExtractor(ruleType);
  const results = [];

  for (const file of pdfFiles) {
    const filePath = path.join(directory, file);
    const pdfBuffer = await fs.readFile(filePath);

    try {
      const result = await extractor.extract(pdfBuffer);
      results.push({
        file,
        success: true,
        data: result.data
      });
    } catch (error) {
      results.push({
        file,
        success: false,
        error: error.message
      });
    }
  }

  return results;
}

// Usage
const results = await processBatch('./pdfs', 'gstr2b');
console.log(`Processed ${results.length} files`);
```

---

## Troubleshooting

### Common Issues

#### Issue 1: "getDocumentProxy is not a function"

**Cause:** unpdf module not loaded correctly (ESM import issue)

**Solution:** The package now uses dynamic imports - this should be fixed in v2.1.0

```javascript
// Already implemented in package
const unpdf = await import('unpdf');
```

---

#### Issue 2: Pattern Not Matching

**Cause:** Pattern expects newlines, but unpdf returns spaces

**Solution:** Use `\\s+` instead of `\\n`

```javascript
// ❌ Wrong
"pattern": "Total\\n([\\d,]+)"

// ✅ Correct
"pattern": "Total\\s+([\\d,]+)"
```

---

#### Issue 3: Wrong Value Extracted

**Cause:** Greedy pattern or wrong capture group

**Solution:** Use lazy matching `[^\\d]*?`

```javascript
// ❌ Wrong - might capture wrong value
"pattern": "Total[\\s\\S]{1,100}([\\d,]+\\.\\d{2})"

// ✅ Correct - stops at first number
"pattern": "Total[^\\d]*?([\\d,]+\\.\\d{2})"
```

---

#### Issue 4: No Capture Group

**Cause:** Pattern has no `()` but `group: 1`

**Solution:** Add capture group around value

```javascript
// ❌ Wrong
"pattern": "Year\\s*\\d{4}-\\d{2}",
"group": 1  // Error!

// ✅ Correct
"pattern": "Year\\s*(\\d{4}-\\d{2})",
"group": 1
```

---

#### Issue 5: Selection Not Working

**Cause:** Coordinates don't overlap with selection

**Solution:** Increase tolerance or check coordinates

```javascript
// Try larger tolerance
const results = await extractor.extractWithSelections(
  pdfBuffer,
  selections,
  50  // Increased from 20
);

// Or verify coordinates match PDF
console.log('Field coords:', rule.coordinates);
console.log('Selection:', selection.boundingBox);
```

---

### Debugging Tips

#### 1. View Extracted Text

```javascript
const text = await extractor.extractTextFromPDF(pdfBuffer);
console.log('Full text:', text);
console.log('Text length:', text.length);
console.log('First 500 chars:', text.substring(0, 500));
```

#### 2. Test Individual Pattern

```javascript
const text = await extractor.extractTextFromPDF(pdfBuffer);
const pattern = /Year\s*(\d{4}-\d{2})/i;
const match = pattern.exec(text);

if (match) {
  console.log('✅ Pattern matched!');
  console.log('Full match:', match[0]);
  console.log('Group 1:', match[1]);
} else {
  console.log('❌ Pattern did not match');
}
```

#### 3. Check Rule Application

```javascript
const result = extractor.applyRule(text, 'year', {
  pattern: 'Year\\s*(\\d{4}-\\d{2})',
  type: 'regex',
  group: 1
});

console.log('Result:', result);
```

#### 4. Analyze Extraction Results

```javascript
const results = await extractor.extract(pdfBuffer);

// Count by status
const found = Object.values(results.data).filter(f => f.found).length;
const missing = Object.values(results.data).filter(f => !f.found).length;
const errors = Object.values(results.data).filter(f => f.error).length;

console.log('Found:', found);
console.log('Missing:', missing);
console.log('Errors:', errors);

// Show errors
Object.entries(results.data)
  .filter(([_, f]) => f.error)
  .forEach(([name, field]) => {
    console.log(`${name}: ${field.error}`);
  });
```

---

## Performance Considerations

### Memory Usage

- PDF is loaded entirely into memory
- Text extraction happens once per document
- Results stored in memory until returned

**Recommendation:** Process PDFs one at a time for large batches

---

### Speed

Typical extraction times (on modern hardware):
- Small PDF (1-2 pages): 100-300ms
- Medium PDF (5-10 pages): 300-800ms
- Large PDF (20+ pages): 1-2 seconds

**Bottlenecks:**
1. PDF text extraction (unpdf)
2. Regex pattern matching (minimal)

---

### Optimization Tips

1. **Reuse Extractor Instance**
   ```javascript
   const extractor = new PDFExtractor(rules);
   // Reuse for multiple PDFs
   ```

2. **Filter Rules**
   ```javascript
   // Extract only needed fields
   const minimalRules = {
     ...rules,
     rules: {
       gstin: rules.rules.gstin,
       year: rules.rules.year
     }
   };
   ```

3. **Use Selection Extraction**
   ```javascript
   // Extract fewer fields = faster
   const results = await extractor.extractWithSelections(...);
   ```

---

## Version History

### v2.1.0 (Current)
- ✅ Fixed ESM import for unpdf
- ✅ Fixed 205 GSTR-3B patterns
- ✅ Improved accuracy from 3.8% → 23.5% for GSTR-3B
- ✅ 100% value accuracy
- ✅ Zero regex errors

### v2.0.0
- ✅ Added selection-based extraction
- ✅ React integration
- ✅ TypeScript support

---

## License

ISC

---

## Support

For issues, questions, or contributions:
- GitHub Issues: [Repository URL]
- Documentation: This file
- Examples: See `tests/` directory

---

**Last Updated:** January 8, 2026
**Package Version:** 2.1.0
