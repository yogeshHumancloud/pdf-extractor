# @yogeshvitekar/pdf-reader

A powerful, frontend-only PDF reader and text extraction library built with **PDF.js 5.4.449**. Extract text, detect tables, and analyze PDF documents entirely in the browser without any backend dependencies.

## Features

- ✅ **Extract text from PDFs** with accurate positioning data
- ✅ **OCR Support** - automatic fallback for scanned/image-based PDFs
- ✅ **Automatic table detection** and extraction
- ✅ **Frontend-only** - works entirely in the browser, no backend needed
- ✅ **Multiple page support** with progress tracking
- ✅ **PDF metadata extraction** (title, author, dates, etc.)
- ✅ **Table export** to CSV and JSON formats
- ✅ **Region-based text extraction** for specific areas
- ✅ **Text statistics** (word count, fonts, etc.)
- ✅ **100+ language support** via Tesseract.js OCR
- ✅ **TypeScript-ready** with type definitions
- ✅ **Modern PDF.js 5.x** API

## Installation

```bash
npm install @yogeshvitekar/pdf-reader pdfjs-dist
```

## Quick Start

### Basic Usage

```javascript
import PDFReader from '@yogeshvitekar/pdf-reader';

// From file input
const fileInput = document.getElementById('pdfInput');
fileInput.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  const result = await PDFReader.extract(file);

  if (result.success) {
    console.log('Full text:', result.fullText);
    console.log('Number of pages:', result.numPages);
    console.log('First page text:', result.pages[0].text);
    console.log('Tables found:', result.pages[0].tables);
  }
});
```

### Extract with Progress Tracking

```javascript
const result = await PDFReader.extract(file, {
  onProgress: (progress) => {
    console.log(`Loading: ${Math.round(progress.loaded / progress.total * 100)}%`);
  }
});
```

### Extract Specific Page

```javascript
const pageResult = await PDFReader.extractPage(file, 1); // Page 1
console.log('Page 1 text:', pageResult.text);
```

### Get PDF Information

```javascript
const info = await PDFReader.getInfo(file);
console.log('Number of pages:', info.numPages);
console.log('Title:', info.metadata.info.title);
console.log('Author:', info.metadata.info.author);
```

### OCR Support for Scanned PDFs

The package supports automatic OCR (Optical Character Recognition) fallback for scanned or image-based PDFs.

#### Basic OCR Usage

```javascript
const result = await PDFReader.extract(file, {
  enableOCR: true  // Enable OCR fallback
});
```

#### Advanced OCR Configuration

```javascript
const result = await PDFReader.extract(file, {
  enableOCR: true,
  ocrMode: 'auto',        // 'auto' | 'always' | 'never'
  ocrLanguage: 'eng',     // Tesseract language code
  ocrThreshold: 0.5,      // Quality threshold (0-1)
  onPageOCR: (info) => {
    console.log(`OCR on page ${info.pageNum}: ${info.confidence}% confidence`);
  }
});
```

#### OCR Modes

- **`auto`** (default): Automatically uses OCR when text extraction yields poor results
- **`always`**: Force OCR on all pages (slower but works for scanned PDFs)
- **`never`**: Disable OCR completely

#### Supported Languages

Tesseract.js supports 100+ languages. Common ones:
- `eng` - English (default)
- `spa` - Spanish
- `fra` - French
- `deu` - German
- `chi_sim` - Chinese Simplified
- `ara` - Arabic
- `hin` - Hindi
- `jpn` - Japanese

See [full language list](https://tesseract-ocr.github.io/tessdoc/Data-Files-in-different-versions.html)

#### OCR Performance

| PDF Type | Method | Speed per Page |
|----------|--------|----------------|
| Text-based PDF | Text extraction | 10-50ms |
| Scanned PDF (OCR disabled) | Text extraction | 10-50ms (minimal text) |
| Scanned PDF (OCR enabled) | OCR fallback | 2-5 seconds |

**Note:** OCR is always included in the package but only activated when you enable it via options.

## API Reference

### `PDFReader.extract(file, options)`

Extracts complete content from a PDF file.

**Parameters:**
- `file` (File|Blob|ArrayBuffer|Uint8Array): PDF file to process
- `options` (Object): Optional configuration
  - `detectTables` (boolean): Enable table detection (default: `true`)
  - `includeMetadata` (boolean): Include PDF metadata (default: `true`)
  - `onProgress` (Function): Progress callback function
  - `enableOCR` (boolean): Enable OCR fallback for scanned PDFs (default: `false`)
  - `ocrMode` (string): OCR mode - `'auto'` | `'always'` | `'never'` (default: `'auto'`)
  - `ocrLanguage` (string): OCR language code (default: `'eng'`)
  - `ocrThreshold` (number): Quality threshold for OCR 0-1 (default: `0.5`)
  - `onPageOCR` (Function): OCR progress callback function

**Returns:** `Promise<Object>`

```javascript
{
  success: true,
  numPages: 5,
  fullText: "Complete text from all pages...",
  pages: [
    {
      pageNumber: 1,
      text: "Page 1 text...",
      elements: [
        {
          text: "Hello",
          x: 72,
          y: 720,
          width: 50,
          height: 12,
          fontName: "Times-Roman",
          fontSize: 12
        }
      ],
      tables: [
        {
          rowCount: 3,
          columnCount: 4,
          data: [["Header1", "Header2"], ["Row1Col1", "Row1Col2"]],
          headers: ["Header1", "Header2"],
          rows: [["Row1Col1", "Row1Col2"]],
          position: { top: 500, bottom: 400, left: 50, right: 500 }
        }
      ],
      viewport: { width: 612, height: 792 }
    }
  ],
  metadata: {
    info: {
      title: "Document Title",
      author: "Author Name",
      subject: "Subject",
      keywords: "keywords",
      creator: "Creator",
      producer: "Producer",
      creationDate: "D:20231201120000",
      modificationDate: "D:20231201120000"
    }
  }
}
```

### `PDFReader.extractPage(file, pageNumber, options)`

Extracts content from a specific page.

**Parameters:**
- `file` (File|Blob|ArrayBuffer|Uint8Array): PDF file
- `pageNumber` (number): Page number (1-indexed)
- `options` (Object): Optional configuration
  - `detectTables` (boolean): Enable table detection (default: `true`)

**Returns:** `Promise<Object>`

```javascript
{
  success: true,
  pageNumber: 1,
  text: "Page text...",
  elements: [...],
  tables: [...],
  viewport: { width: 612, height: 792 }
}
```

### `PDFReader.getInfo(file)`

Gets PDF information without extracting full content.

**Parameters:**
- `file` (File|Blob|ArrayBuffer|Uint8Array): PDF file

**Returns:** `Promise<Object>`

```javascript
{
  success: true,
  numPages: 10,
  metadata: { ... },
  fingerprints: ["abc123", "def456"]
}
```

### `PDFReader.initWorker(workerSrc)`

Initializes the PDF.js worker (called automatically by default).

**Parameters:**
- `workerSrc` (string): Optional custom worker source URL

```javascript
// Use custom worker location
PDFReader.initWorker('/path/to/pdf.worker.min.mjs');

// Or use default CDN (automatically called)
PDFReader.initWorker();
```

## Table Utilities

### Export Table to CSV

```javascript
import { tableToCSV } from '@yogeshvitekar/pdf-reader/dist/tableDetector';

const result = await PDFReader.extract(file);
const firstTable = result.pages[0].tables[0];

const csv = tableToCSV(firstTable);
console.log(csv);
// Output:
// Header1,Header2,Header3
// Value1,Value2,Value3
```

### Export Table to JSON

```javascript
import { tableToJSON } from '@yogeshvitekar/pdf-reader/dist/tableDetector';

const json = tableToJSON(firstTable);
console.log(json);
// Output:
// [
//   { "Header1": "Value1", "Header2": "Value2", "Header3": "Value3" },
//   ...
// ]
```

## Advanced Usage

### Region-Based Text Extraction

```javascript
import { extractTextFromRegion } from '@yogeshvitekar/pdf-reader/dist/textExtractor';

// Get a specific page
const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
const pdf = await loadingTask.promise;
const page = await pdf.getPage(1);

// Extract text from a specific region
const regionText = await extractTextFromRegion(page, {
  x: 100,
  y: 500,
  width: 400,
  height: 200
});

console.log('Region text:', regionText);
```

### Get Text Statistics

```javascript
import { getTextStats } from '@yogeshvitekar/pdf-reader/dist/textExtractor';

const page = await pdf.getPage(1);
const stats = await getTextStats(page);

console.log('Statistics:', stats);
// Output:
// {
//   totalItems: 150,
//   totalCharacters: 2500,
//   wordCount: 450,
//   uniqueFonts: ["Times-Roman", "Helvetica"],
//   fontCount: 2
// }
```

## Browser Usage (UMD)

```html
<!DOCTYPE html>
<html>
<head>
  <title>PDF Reader Demo</title>
</head>
<body>
  <input type="file" id="pdfInput" accept=".pdf" />
  <div id="output"></div>

  <!-- Load PDF.js -->
  <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/5.4.449/pdf.min.mjs" type="module"></script>

  <!-- Load PDF Reader -->
  <script src="https://unpkg.com/@yogeshvitekar/pdf-reader/dist/index.js"></script>

  <script>
    document.getElementById('pdfInput').addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (file) {
        console.log('Processing PDF...');
        const result = await PDFReader.extract(file);

        if (result.success) {
          document.getElementById('output').innerHTML = `
            <h2>Results:</h2>
            <p><strong>Pages:</strong> ${result.numPages}</p>
            <p><strong>Text length:</strong> ${result.fullText.length} characters</p>
            <h3>Preview:</h3>
            <pre>${result.fullText.substring(0, 500)}...</pre>
            <h3>Tables Found:</h3>
            <p>${result.pages.reduce((sum, p) => sum + p.tables.length, 0)} tables</p>
          `;
        }
      }
    });
  </script>
</body>
</html>
```

## React Example

```javascript
import React, { useState } from 'react';
import PDFReader from '@yogeshvitekar/pdf-reader';

function PDFUploader() {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setLoading(true);
    try {
      const data = await PDFReader.extract(file, {
        onProgress: (progress) => {
          console.log(`Progress: ${Math.round(progress.loaded / progress.total * 100)}%`);
        }
      });
      setResult(data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <input type="file" accept=".pdf" onChange={handleFileChange} />

      {loading && <p>Loading...</p>}

      {result && (
        <div>
          <h2>PDF Content</h2>
          <p>Pages: {result.numPages}</p>
          <p>Characters: {result.fullText.length}</p>

          <h3>Pages:</h3>
          {result.pages.map((page, i) => (
            <div key={i}>
              <h4>Page {page.pageNumber}</h4>
              <p>Tables: {page.tables.length}</p>
              <pre>{page.text.substring(0, 200)}...</pre>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default PDFUploader;
```

## Configuration

### Custom Worker Path

If you're hosting the PDF.js worker yourself:

```javascript
import PDFReader from '@yogeshvitekar/pdf-reader';

// Set custom worker path before extraction
PDFReader.initWorker('/static/js/pdf.worker.min.mjs');

// Then use normally
const result = await PDFReader.extract(file);
```

### Disable Table Detection

```javascript
const result = await PDFReader.extract(file, {
  detectTables: false // Skip table detection for faster processing
});
```

## Error Handling

```javascript
const result = await PDFReader.extract(file);

if (!result.success) {
  console.error('Error:', result.error);
  console.error('Stack:', result.stack);
  // Handle error
}
```

## Browser Compatibility

- Chrome/Edge: ✅ Latest versions
- Firefox: ✅ Latest versions
- Safari: ✅ Latest versions
- IE11: ⚠️ Requires polyfills

## Dependencies

- **pdfjs-dist** (^5.4.449): Core PDF.js library

## Development

```bash
# Install dependencies
npm install

# Build for production
npm run build

# Watch mode for development
npm run dev
```

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Support

If you encounter any issues or have questions, please open an issue on GitHub.

## Credits

Built with [PDF.js](https://mozilla.github.io/pdf.js/) by Mozilla.

---

Made with ❤️ by Yogesh Vitekar
