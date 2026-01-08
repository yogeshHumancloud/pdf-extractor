# Web/Browser Usage Guide

This extractor is now fully compatible with web browsers and Next.js projects!

## Installation

```bash
npm install unpdf
# Copy extractor.js to your project
```

## Browser Usage Example

```javascript
import { PDFExtractor } from './extractor';

// Example: File upload in browser
async function handleFileUpload(event) {
  const file = event.target.files[0];
  const rulesResponse = await fetch('/rules/itr-rules.json');
  const rules = await rulesResponse.json();

  // Create extractor instance
  const extractor = new PDFExtractor(rules);

  // Read file as ArrayBuffer
  const arrayBuffer = await file.arrayBuffer();

  // Extract data
  const results = await extractor.extract(arrayBuffer);

  console.log('Extracted data:', results);
}
```

## Next.js Usage Example

### 1. Client Component (App Router)

```javascript
'use client';

import { PDFExtractor } from '@/lib/extractor';
import { useState } from 'react';

export default function PDFUploader() {
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setLoading(true);
    try {
      // Load rules (you can import this statically too)
      const rulesResponse = await fetch('/rules/itr-rules.json');
      const rules = await rulesResponse.json();

      const extractor = new PDFExtractor(rules);
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
    <div>
      <input
        type="file"
        accept=".pdf"
        onChange={handleUpload}
        disabled={loading}
      />
      {loading && <p>Extracting data...</p>}
      {results && (
        <div>
          <h3>Extraction Results:</h3>
          <pre>{JSON.stringify(results, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
```

### 2. Server Component with Server Action

```javascript
// app/actions.js
'use server';

import { PDFExtractor } from '@/lib/extractor';
import fs from 'fs/promises';

export async function extractPDFData(formData) {
  const file = formData.get('pdf');
  const ruleType = formData.get('ruleType'); // 'itr', 'gstr1', etc.

  // Read rules file
  const rulesPath = `./rules/${ruleType}-rules.json`;
  const rulesData = JSON.parse(await fs.readFile(rulesPath, 'utf8'));

  const extractor = new PDFExtractor(rulesData);

  // Convert file to buffer
  const arrayBuffer = await file.arrayBuffer();
  const results = await extractor.extract(arrayBuffer);

  return results;
}
```

```javascript
// app/page.js
import { extractPDFData } from './actions';

export default function UploadPage() {
  async function handleSubmit(formData) {
    'use server';
    const results = await extractPDFData(formData);
    return results;
  }

  return (
    <form action={handleSubmit}>
      <input type="file" name="pdf" accept=".pdf" required />
      <select name="ruleType">
        <option value="itr">ITR-1</option>
        <option value="gstr1">GSTR-1</option>
        <option value="gstr2b">GSTR-2B</option>
        <option value="gstr3b">GSTR-3B</option>
      </select>
      <button type="submit">Extract Data</button>
    </form>
  );
}
```

### 3. API Route (App Router)

```javascript
// app/api/extract/route.js
import { PDFExtractor } from '@/lib/extractor';
import { NextResponse } from 'next/server';
import fs from 'fs/promises';

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('pdf');
    const ruleType = formData.get('ruleType');

    // Load rules
    const rulesPath = `./rules/${ruleType}-rules.json`;
    const rulesData = JSON.parse(await fs.readFile(rulesPath, 'utf8'));

    const extractor = new PDFExtractor(rulesData);

    // Extract from PDF
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

### 4. Using with Static Rules Import

```javascript
// lib/extractors.js
import { PDFExtractor } from './extractor';
import itrRules from '@/rules/itr-rules.json';
import gstr1Rules from '@/rules/gstr1-rules.json';
import gstr2bRules from '@/rules/gstr2b-rules.json';
import gstr3bRules from '@/rules/gstr3b-rules.json';

export const extractors = {
  itr: new PDFExtractor(itrRules),
  gstr1: new PDFExtractor(gstr1Rules),
  gstr2b: new PDFExtractor(gstr2bRules),
  gstr3b: new PDFExtractor(gstr3bRules),
};

// Usage
export async function extractData(pdfBuffer, type) {
  const extractor = extractors[type];
  if (!extractor) throw new Error(`Unknown rule type: ${type}`);

  return await extractor.extract(pdfBuffer);
}
```

## Vanilla HTML/JavaScript Example

```html
<!DOCTYPE html>
<html>
<head>
  <title>PDF Data Extractor</title>
</head>
<body>
  <input type="file" id="pdfFile" accept=".pdf">
  <button onclick="extractData()">Extract</button>
  <div id="results"></div>

  <script type="module">
    import { PDFExtractor } from './extractor.js';

    window.extractData = async function() {
      const fileInput = document.getElementById('pdfFile');
      const file = fileInput.files[0];

      // Load rules
      const rulesResponse = await fetch('./rules/itr-rules.json');
      const rules = await rulesResponse.json();

      const extractor = new PDFExtractor(rules);
      const arrayBuffer = await file.arrayBuffer();
      const results = await extractor.extract(arrayBuffer);

      document.getElementById('results').innerHTML =
        `<pre>${JSON.stringify(results, null, 2)}</pre>`;
    }
  </script>
</body>
</html>
```

## Key Points

1. **No File System Access**: The extractor now works entirely with buffers/ArrayBuffers
2. **Rules as Objects**: Pass rules as JavaScript objects or JSON strings
3. **Multiple Input Types**: Supports `Buffer` (Node.js), `Uint8Array`, and `ArrayBuffer` (browsers)
4. **All Methods Work**: `extract()`, `extractFormatted()`, `getStats()`, `exportToCSV()`, `exportToMarkdown()`

## TypeScript Support (Optional)

```typescript
// types.d.ts
declare module './extractor' {
  export class PDFExtractor {
    constructor(rules: object | string);
    extract(pdfBuffer: Buffer | Uint8Array | ArrayBuffer): Promise<any>;
    extractFormatted(pdfBuffer: Buffer | Uint8Array | ArrayBuffer): Promise<any>;
    getStats(pdfBuffer: Buffer | Uint8Array | ArrayBuffer): Promise<{
      total_rules: number;
      found: number;
      not_found: number;
      success_rate: string;
      missing_fields: string[];
    }>;
    exportToCSV(pdfBuffer: Buffer | Uint8Array | ArrayBuffer): Promise<string>;
    exportToMarkdown(pdfBuffer: Buffer | Uint8Array | ArrayBuffer): Promise<string>;
  }
}
```

## Installation in Next.js Project

```bash
# In your Next.js project
mkdir -p lib
mkdir -p public/rules

# Copy files
cp /path/to/rules_cli/extractor.js lib/
cp /path/to/rules_cli/rules/*.json public/rules/

# Install dependency
npm install unpdf
```
