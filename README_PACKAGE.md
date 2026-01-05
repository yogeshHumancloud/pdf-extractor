# Indian Tax PDF Data Extractor

Extract structured data from Indian tax PDFs (ITR-1, GSTR-1, GSTR-2B, GSTR-3B) using regex-based rules. Works in both Node.js and browsers!

## Features

✅ **Multiple Form Support**: ITR-1, GSTR-1, GSTR-2B, GSTR-3B
✅ **Browser Compatible**: Works in web browsers and Next.js
✅ **Rule-Based Extraction**: Easy to customize and extend
✅ **Multiple Export Formats**: JSON, CSV, Markdown
✅ **High Accuracy**: Thoroughly tested patterns
✅ **TypeScript Support**: Type definitions included

## Installation

```bash
npm install indian-tax-pdf-extractor
# or
yarn add indian-tax-pdf-extractor
```

## Quick Start

### Option 1: Using Built-in Rules (Easiest)

```javascript
import { createExtractor } from 'indian-tax-pdf-extractor';

// Create extractor with built-in rules
const extractor = createExtractor('itr'); // or 'gstr1', 'gstr2b', 'gstr3b'

// Extract from PDF buffer
const file = document.getElementById('fileInput').files[0];
const arrayBuffer = await file.arrayBuffer();
const results = await extractor.extract(arrayBuffer);

console.log(results);
```

### Option 2: Using Custom Rules

```javascript
import { PDFExtractor, loadRules } from 'indian-tax-pdf-extractor';

// Load built-in rules
const rules = loadRules('gstr1');

// Or use custom rules
const customRules = {
  name: "My Custom Extractor",
  version: "1.0.0",
  rules: {
    field_name: {
      pattern: "regex pattern here",
      type: "regex",
      group: 1
    }
  }
};

const extractor = new PDFExtractor(rules);
const results = await extractor.extract(pdfBuffer);
```

## Next.js Examples

### Client Component (App Router)

```javascript
'use client';

import { createExtractor } from 'indian-tax-pdf-extractor';
import { useState } from 'react';

export default function PDFUploader() {
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setLoading(true);
    try {
      const extractor = createExtractor('itr');
      const arrayBuffer = await file.arrayBuffer();
      const data = await extractor.extract(arrayBuffer);
      setResults(data);
    } catch (error) {
      console.error('Extraction failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4">
      <input
        type="file"
        accept=".pdf"
        onChange={handleUpload}
        disabled={loading}
        className="mb-4"
      />
      {loading && <p>Extracting data...</p>}
      {results && (
        <div>
          <h3 className="text-lg font-bold mb-2">Results:</h3>
          <pre className="bg-gray-100 p-4 rounded overflow-auto">
            {JSON.stringify(results, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
```

### API Route (App Router)

```javascript
// app/api/extract/route.js
import { createExtractor } from 'indian-tax-pdf-extractor';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('pdf');
    const ruleType = formData.get('type') || 'itr';

    const extractor = createExtractor(ruleType);
    const arrayBuffer = await file.arrayBuffer();
    const results = await extractor.extract(arrayBuffer);

    return NextResponse.json(results);
  } catch (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
```

### Server Action

```javascript
// app/actions.js
'use server';

import { createExtractor } from 'indian-tax-pdf-extractor';

export async function extractPDFData(formData) {
  const file = formData.get('pdf');
  const ruleType = formData.get('type');

  const extractor = createExtractor(ruleType);
  const arrayBuffer = await file.arrayBuffer();
  const results = await extractor.extract(arrayBuffer);

  return results;
}
```

## Node.js Usage

```javascript
const { createExtractor } = require('indian-tax-pdf-extractor');
const fs = require('fs');

async function extractFromFile() {
  const extractor = createExtractor('gstr2b');
  const pdfBuffer = fs.readFileSync('document.pdf');
  const results = await extractor.extract(pdfBuffer);

  console.log(`Found ${results.metadata.extracted_at}`);
  console.log('Data:', results.data);
}

extractFromFile();
```

## Available Methods

### `extract(pdfBuffer)`
Extract all data from PDF.

```javascript
const results = await extractor.extract(pdfBuffer);
// Returns: { metadata, data, raw_text }
```

### `extractFormatted(pdfBuffer)`
Extract data with formatted sections.

```javascript
const formatted = await extractor.extractFormatted(pdfBuffer);
// Returns: { metadata, sections }
```

### `getStats(pdfBuffer)`
Get extraction statistics.

```javascript
const stats = await extractor.getStats(pdfBuffer);
// Returns: { total_rules, found, not_found, success_rate, missing_fields }
```

### `exportToCSV(pdfBuffer)`
Export results as CSV.

```javascript
const csv = await extractor.exportToCSV(pdfBuffer);
// Returns: CSV string
```

### `exportToMarkdown(pdfBuffer)`
Export results as Markdown.

```javascript
const markdown = await extractor.exportToMarkdown(pdfBuffer);
// Returns: Markdown string
```

## Supported Document Types

| Type | Description | Rules Count |
|------|-------------|-------------|
| `itr` | ITR-1 (Income Tax Return) | 27 fields |
| `gstr1` | GSTR-1 (Outward Supplies) | 505 fields |
| `gstr2b` | GSTR-2B (ITC Statement) | 262 fields |
| `gstr3b` | GSTR-3B (Monthly Return) | 132 fields |

## Rule Structure

Rules are defined in JSON format:

```json
{
  "name": "Rule Set Name",
  "version": "1.0.0",
  "description": "Description",
  "rules": {
    "field_name": {
      "pattern": "Regex pattern with capture group",
      "type": "regex",
      "group": 1,
      "transform": "number",
      "description": "Field description"
    }
  }
}
```

### Transform Types

- `number` - Remove commas from numbers
- `date` - Date formatting
- `uppercase` - Convert to uppercase
- `lowercase` - Convert to lowercase
- `refund` - Handle refund amounts with signs

## TypeScript Support

```typescript
import { PDFExtractor, createExtractor, loadRules } from 'indian-tax-pdf-extractor';

const extractor: PDFExtractor = createExtractor('itr');

interface ExtractionResult {
  metadata: {
    ruleset: string;
    version: string;
    description: string;
    extracted_at: string;
  };
  data: Record<string, {
    value: string | null;
    found: boolean;
    description?: string;
    error?: string;
  }>;
  raw_text: string;
}

const results: ExtractionResult = await extractor.extract(pdfBuffer);
```

## Browser Compatibility

Works in all modern browsers that support:
- ES6+ JavaScript
- File API
- ArrayBuffer
- Uint8Array

Tested in: Chrome, Firefox, Safari, Edge

## Performance

- ITR-1 (27 rules): ~1-2 seconds
- GSTR-2B (262 rules): ~2-3 seconds
- GSTR-1 (505 rules): ~3-5 seconds
- GSTR-3B (132 rules): ~1-2 seconds

*Times may vary based on PDF size and complexity*

## Error Handling

```javascript
try {
  const extractor = createExtractor('itr');
  const results = await extractor.extract(pdfBuffer);

  // Check for extraction errors
  const errors = Object.entries(results.data)
    .filter(([_, field]) => field.error)
    .map(([name, field]) => ({ name, error: field.error }));

  if (errors.length > 0) {
    console.warn('Some fields had errors:', errors);
  }
} catch (error) {
  console.error('Extraction failed:', error.message);
}
```

## Contributing

Custom rules can be created by following the rule structure. Pull requests are welcome!

## License

MIT

## Support

For issues and questions, please open an issue on GitHub.

## Changelog

### 2.0.0
- ✅ Added browser compatibility
- ✅ Removed file system dependencies
- ✅ Added built-in rule loading helpers
- ✅ Improved buffer handling
- ✅ Added TypeScript support

### 1.0.0
- Initial release with CLI support
