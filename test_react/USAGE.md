# PDF Extractor React App - Usage Guide

Your PDF extraction React app is ready! 🎉

## 🚀 App is Running

**URL:** http://localhost:3000

The development server is already running in the background.

## 📋 Features

### ✅ Drag & Drop Interface
- **Left Dropzone:** Upload your PDF file
- **Right Dropzone:** Upload rules JSON file (from `/rules/` folder)

### ✅ Split View Display
- **Left Panel:** Interactive PDF viewer with:
  - Page navigation (Previous/Next buttons)
  - Thumbnail navigation at bottom
  - Zoom and pan support

- **Right Panel:** Extracted data as formatted Markdown with:
  - Beautiful table formatting
  - Hierarchical sections
  - Download options (MD & JSON)

### ✅ Statistics Dashboard
- Total rules count
- Successfully extracted fields (green)
- Missing fields (red)
- Success rate percentage

## 🎯 How to Use

### Step 1: Open the App
Visit: http://localhost:3000

### Step 2: Upload Files
1. **Drag & drop** or **click** the left box to upload a PDF
   - Available test PDFs in `/Users/yogeshvitekar/Desktop/rules_cli/pdf/`

2. **Drag & drop** or **click** the right box to upload rules
   - Available rules in `/Users/yogeshvitekar/Desktop/rules_cli/rules/`

### Step 3: Extract Data
Click the **"🚀 Extract Data"** button

### Step 4: View Results
- View PDF on the left
- See extracted markdown on the right
- Navigate between PDF pages
- Download results as MD or JSON

### Step 5: Try Another File
Click **"🔄 New Extraction"** to start over

## 📁 Test Files Available

### PDFs
- `../pdf/itrsss.pdf` - ITR-1 form (100% success rate)
- `../pdf/2B.pdf` - GSTR-2B form (58% success rate)
- `../pdf/3B.pdf` - GSTR-3B form
- `../pdf/GSTR1.pdf` - GSTR-1 form

### Rules
- `../rules/itr-rules.json` - For ITR-1 PDFs (27 fields)
- `../rules/gstr2b-rules.json` - For GSTR-2B PDFs (262 fields)
- `../rules/gstr3b-rules.json` - For GSTR-3B PDFs (132 fields)
- `../rules/gstr1-rules.json` - For GSTR-1 PDFs (505 fields)

## 🎨 UI Highlights

### Beautiful Design
- **Purple Gradient Background**: Modern and professional
- **Smooth Animations**: Hover effects and transitions
- **Responsive Layout**: Works on all screen sizes
- **Color-Coded Stats**: Green for success, red for errors

### PDF Viewer Features
- High-quality rendering using unpdf
- Page-by-page navigation
- Thumbnail previews
- Smooth scrolling

### Markdown Display
- Syntax-highlighted tables
- Hierarchical headings
- Professional typography
- Easy to read formatting

## 🛠️ Tech Stack

- **React 19** - UI framework
- **react-dropzone** - Drag & drop functionality
- **unpdf** - PDF rendering and text extraction
- **react-markdown** - Markdown rendering
- **indian-tax-pdf-extractor** - Our custom extraction package

## 📊 Component Structure

```
src/
├── App.js                    # Main app component
├── PDFExtractorPage.js       # Main extraction page
├── PDFViewer.js              # PDF rendering component
├── PDFExtractorPage.css      # Main styles
└── PDFViewer.css             # PDF viewer styles
```

## 🔧 Development Commands

```bash
# Start the app (already running)
npm start

# Build for production
npm run build

# Run tests
npm test
```

## 💡 Tips

1. **Best Results**: Use ITR-1 PDF with itr-rules.json for 100% extraction
2. **Large PDFs**: May take a few seconds to render
3. **Download**: Use download buttons to save extracted data
4. **Navigation**: Use arrow keys or click thumbnails to navigate PDF pages

## 🎯 Example Usage Flow

1. Drop `itrsss.pdf` in left box
2. Drop `itr-rules.json` in right box
3. Click "Extract Data"
4. View PDF on left, see all 27 fields extracted on right
5. Download JSON or Markdown
6. Try another file!

## 🐛 Troubleshooting

### App not loading?
- Check if port 3000 is available
- Restart with: `npm start`

### Extraction fails?
- Ensure PDF and rules match (e.g., ITR PDF needs ITR rules)
- Check console for error messages

### PDF not rendering?
- Check PDF file is not corrupted
- Try a different PDF

## 📞 Need Help?

The app is fully functional and ready to use. Open http://localhost:3000 to start!

---

**Enjoy extracting data from your PDFs! 🎉**
