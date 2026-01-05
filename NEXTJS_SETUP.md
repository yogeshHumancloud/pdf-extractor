# Next.js Project Setup Guide

## Option 1: Install as Local Package (Recommended for Development)

### Step 1: Prepare the Package

```bash
cd /Users/yogeshvitekar/Desktop/rules_cli
npm pack
```

This creates a `.tgz` file like `indian-tax-pdf-extractor-2.0.0.tgz`

### Step 2: Install in Your Next.js Project

```bash
cd /path/to/your/nextjs-project
npm install /Users/yogeshvitekar/Desktop/rules_cli/indian-tax-pdf-extractor-2.0.0.tgz
```

Or add to package.json:

```json
{
  "dependencies": {
    "indian-tax-pdf-extractor": "file:../rules_cli/indian-tax-pdf-extractor-2.0.0.tgz"
  }
}
```

### Step 3: Use in Your Next.js App

```javascript
// app/components/PDFUploader.jsx
'use client';

import { createExtractor } from 'indian-tax-pdf-extractor';
import { useState } from 'react';

export default function PDFUploader() {
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setLoading(true);
    try {
      const extractor = createExtractor('itr');
      const buffer = await file.arrayBuffer();
      const data = await extractor.extract(buffer);
      setResults(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <input type="file" accept=".pdf" onChange={handleUpload} />
      {loading && <p>Processing...</p>}
      {results && <pre>{JSON.stringify(results, null, 2)}</pre>}
    </div>
  );
}
```

## Option 2: Copy Files Directly (Quick Start)

### Step 1: Copy Files

```bash
# In your Next.js project
mkdir -p lib/pdf-extractor
cp /Users/yogeshvitekar/Desktop/rules_cli/index.js lib/pdf-extractor/
cp -r /Users/yogeshvitekar/Desktop/rules_cli/rules lib/pdf-extractor/
```

### Step 2: Install unpdf

```bash
npm install unpdf
```

### Step 3: Use in Your App

```javascript
'use client';

import { createExtractor } from '@/lib/pdf-extractor';

export default function PDFUploader() {
  // Same code as above
}
```

## Option 3: Publish to npm (For Production)

### Step 1: Update package.json

```bash
cd /Users/yogeshvitekar/Desktop/rules_cli
```

Edit package.json:
- Change author name
- Add repository URL
- Update description if needed

### Step 2: Create npm Account (if you don't have one)

```bash
npm login
```

### Step 3: Publish

```bash
npm publish
```

### Step 4: Install in Next.js Project

```bash
npm install indian-tax-pdf-extractor
```

## Complete Next.js Example

### Client Component with Multiple Form Types

```javascript
'use client';

import { createExtractor } from 'indian-tax-pdf-extractor';
import { useState } from 'react';

export default function PDFExtractorPage() {
  const [formType, setFormType] = useState('itr');
  const [results, setResults] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleExtract = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setLoading(true);
    setResults(null);
    setStats(null);

    try {
      const extractor = createExtractor(formType);
      const buffer = await file.arrayBuffer();

      // Get both results and stats
      const [data, statistics] = await Promise.all([
        extractor.extract(buffer),
        extractor.getStats(buffer)
      ]);

      setResults(data);
      setStats(statistics);
    } catch (error) {
      console.error('Extraction failed:', error);
      alert('Failed to extract data: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">PDF Data Extractor</h1>

      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">
            Select Form Type
          </label>
          <select
            value={formType}
            onChange={(e) => setFormType(e.target.value)}
            className="w-full border rounded px-3 py-2"
          >
            <option value="itr">ITR-1 (Income Tax Return)</option>
            <option value="gstr1">GSTR-1 (Outward Supplies)</option>
            <option value="gstr2b">GSTR-2B (ITC Statement)</option>
            <option value="gstr3b">GSTR-3B (Monthly Return)</option>
          </select>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">
            Upload PDF
          </label>
          <input
            type="file"
            accept=".pdf"
            onChange={handleExtract}
            disabled={loading}
            className="w-full border rounded px-3 py-2"
          />
        </div>

        {loading && (
          <div className="text-center py-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Extracting data...</p>
          </div>
        )}
      </div>

      {stats && (
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">Statistics</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-600">Total Rules</p>
              <p className="text-2xl font-bold">{stats.total_rules}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Found</p>
              <p className="text-2xl font-bold text-green-600">{stats.found}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Not Found</p>
              <p className="text-2xl font-bold text-red-600">{stats.not_found}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Success Rate</p>
              <p className="text-2xl font-bold text-blue-600">{stats.success_rate}</p>
            </div>
          </div>
        </div>
      )}

      {results && (
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-bold mb-4">Extracted Data</h2>

          <div className="space-y-4">
            {Object.entries(results.data)
              .filter(([_, field]) => field.found)
              .map(([key, field]) => (
                <div key={key} className="border-b pb-2">
                  <p className="text-sm text-gray-600">
                    {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </p>
                  <p className="font-medium">{field.value}</p>
                  {field.description && (
                    <p className="text-xs text-gray-500 mt-1">{field.description}</p>
                  )}
                </div>
              ))}
          </div>

          <div className="mt-6">
            <button
              onClick={() => {
                const dataStr = JSON.stringify(results, null, 2);
                const blob = new Blob([dataStr], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'extracted-data.json';
                a.click();
              }}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Download JSON
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
```

### API Route Example

```javascript
// app/api/extract/route.js
import { createExtractor } from 'indian-tax-pdf-extractor';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('pdf');
    const type = formData.get('type') || 'itr';

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    const extractor = createExtractor(type);
    const buffer = await file.arrayBuffer();
    const results = await extractor.extract(buffer);

    return NextResponse.json(results);
  } catch (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
```

## Troubleshooting

### Issue: "Cannot find module 'unpdf'"

**Solution:**
```bash
npm install unpdf
```

### Issue: Build errors with unpdf

**Solution:** Add to `next.config.js`:
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    config.resolve.fallback = { fs: false, path: false };
    return config;
  },
}

module.exports = nextConfig;
```

### Issue: Large bundle size

**Solution:** Use dynamic imports:
```javascript
const { createExtractor } = await import('indian-tax-pdf-extractor');
```

## Performance Tips

1. **Lazy Load**: Only import the extractor when needed
2. **Web Worker**: For large PDFs, use a Web Worker
3. **Cache Rules**: Create extractors once and reuse them
4. **Server-Side**: For heavy processing, use API routes

## Example with Web Worker (Advanced)

```javascript
// public/pdf-worker.js
importScripts('https://unpkg.com/unpdf@1.4.0/dist/index.js');

self.onmessage = async (e) => {
  const { pdfBuffer, rules } = e.data;
  // Extraction logic here
  self.postMessage(results);
};
```

```javascript
// Component
const worker = new Worker('/pdf-worker.js');
worker.postMessage({ pdfBuffer, rules });
worker.onmessage = (e) => setResults(e.data);
```
