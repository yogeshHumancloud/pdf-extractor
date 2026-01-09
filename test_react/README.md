# Indian Tax PDF Extractor - React Demo

Interactive React application demonstrating the **indian-tax-pdf-extractor** package with visual PDF viewer and selection-based extraction capabilities.

## Features

- 📄 **PDF Upload & Rendering**: Upload and view Indian tax PDFs (ITR-1, GSTR-1, GSTR-2B, GSTR-3B)
- 🖱️ **Interactive Selection**: Draw selection boxes on PDF to extract specific fields
- 📍 **Coordinate Visualization**: Real-time coordinate debugging and visualization
- 🎯 **Dual Extraction Modes**:
  - Full extraction (all fields)
  - Selection-based extraction (specific regions)
- 🐛 **Advanced Debugging**: 3-tab debug console with coordinate analysis
- 🎨 **Clean UI**: Modern interface with visual feedback

## Quick Start

### Installation

```bash
npm install
```

### Development

```bash
npm start
```

Runs the app in development mode at [http://localhost:3000](http://localhost:3000).

### Production Build

```bash
npm run build
```

Builds the app for production to the `build` folder.

## Usage

### 1. Upload PDF

- Click "Choose PDF File" button
- Select an Indian tax PDF (ITR-1, GSTR-2B, GSTR-3B, etc.)
- PDF will render in the viewer

### 2. Full Extraction

- Click "Extract All Fields" button
- View extracted data in JSON format
- Check extraction statistics

### 3. Selection-Based Extraction

- Toggle "Selection Mode" ON
- Click and drag on PDF to create selection boxes
- Multiple selections can be created
- Click "Extract Selected Fields" to extract only fields within selections
- Use "Clear Selections" to reset

### 4. Debugging Tools

After extraction, the Debug Console automatically appears with 3 tabs:

- **Coordinates Sent**: Raw coordinate data sent to extraction package
- **Package Output**: Full response from extraction engine
- **Overlap Analysis**: Detailed analysis of field-selection overlaps

Click the "Debug" button for visual coordinate system explanation.

## Architecture

### Components

```
src/
├── PDFExtractorPage.js          # Main extraction UI & state management
├── PDFViewer.js                 # PDF rendering with react-pdf
├── components/
│   ├── SelectionCanvas.js       # Interactive selection overlay
│   ├── DebugConsole.js          # 3-tab debugging interface
│   ├── CoordinateDebugger.js    # Coordinate system visualization
│   ├── DebugLogViewer.js        # Extraction logs viewer
│   └── DebugConsole.css         # Styling
├── contexts/
│   └── SelectionContext.js      # Global selection state (React Context)
└── utils/
    └── coordinateUtils.js       # Coordinate transformation utilities
```

### State Management

Uses **React Context + useReducer** for global selection state:

- `selections` - Array of selection boxes with coordinates
- `selectionMode` - Boolean toggle for selection mode
- `textItemsCache` - Cached PDF text items per page

### Coordinate System

**Critical Concept**: PDF and Canvas use different coordinate systems

- **PDF**: Origin at bottom-left, Y increases upward
- **Canvas**: Origin at top-left, Y increases downward

**Conversion** (in `coordinateUtils.js`):
```javascript
pdfY = (viewport.height / scale) - (canvasY / scale) - (height / scale)
```

All coordinates are converted to PDF format before sending to the extraction package.

## Key Dependencies

- **react-pdf** (^9.1.1): PDF rendering in React
- **pdfjs-dist** (^4.9.155): PDF.js library
- **indian-tax-pdf-extractor** (^2.1.0): Core extraction engine
- **react** (^18.3.1): UI framework

## Production Deployment

### Build for Production

```bash
npm run build
```

This creates an optimized production build in the `build/` folder.

### Deployment Options

**Static Hosting** (Recommended):
- Deploy `build/` folder to Netlify, Vercel, GitHub Pages, or AWS S3
- Supports client-side routing

**Docker**:
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
RUN npm install -g serve
CMD ["serve", "-s", "build", "-l", "3000"]
```

**Traditional Server**:
```bash
npm install -g serve
serve -s build -l 3000
```

## Environment Configuration

No environment variables required for basic operation. All extraction happens client-side.

## Performance Considerations

- Large PDFs (>100 pages) may take longer to render
- Selection canvas uses HTML5 Canvas for optimal performance
- Text extraction happens in browser using unpdf (WASM-based)
- First page load may be slower due to PDF.js worker initialization

## Troubleshooting

### PDF Not Rendering

- Check browser console for errors
- Ensure PDF is valid and not corrupted
- Try a different PDF file

### Selection Not Working

- Ensure Selection Mode is toggled ON
- Check that you're clicking and dragging (not just clicking)
- Verify selections appear in the selection list below the PDF

### No Fields Extracted

- Check Debug Console "Overlap Analysis" tab
- Verify selections overlap with actual field coordinates
- Try expanding selection boxes to cover more area
- Use "Extract All Fields" to verify the PDF contains extractable data

### Coordinate Mismatch

- Open CoordinateDebugger (click "Debug" button)
- Verify coordinate system understanding
- Check that selections are on the correct page
- Review COORDINATE_SYSTEM_EXPLAINED.md in project root

## Development

### Running Tests

```bash
npm test
```

Launches the test runner in interactive watch mode.

### Code Structure

- Keep components focused and single-purpose
- Use React Context for global state (selections)
- Component-level state for UI-specific state (hover, loading, etc.)
- Utility functions in `utils/` for reusable logic

### Adding New Features

1. Update components in `src/components/`
2. Add utilities in `src/utils/` if needed
3. Update context in `src/contexts/` for global state
4. Test with multiple PDF types

## Learn More

- [React Documentation](https://reactjs.org/)
- [react-pdf Documentation](https://github.com/wojtekmaj/react-pdf)
- [PDF.js Documentation](https://mozilla.github.io/pdf.js/)
- [Create React App Documentation](https://facebook.github.io/create-react-app/docs/getting-started)

## License

MIT

## Support

For issues or questions:
1. Check the Troubleshooting section above
2. Review Debug Console output after extraction
3. Use CoordinateDebugger for coordinate-related issues
4. Check browser console for JavaScript errors
