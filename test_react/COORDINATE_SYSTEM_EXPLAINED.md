# PDF Coordinate System - Complete Explanation

## 🎯 The Problem You're Facing

You have two different coordinate systems that need to match:
1. **Rules File Coordinates** - Captured from unpdf when rules were created
2. **Canvas Selection Coordinates** - Created when user draws selection boxes

They don't match because they might use different origins and page heights.

---

## 📊 Two Coordinate Systems

### 1. PDF Coordinate System (unpdf)
```
Origin: BOTTOM-LEFT corner of page
Y-axis: Increases UPWARD

(0, 842)  ←─────────────┐
          │              │
          │              │ Y increases ↑
          │              │
          │              │
          └─────────────→ (595, 0)
      (0, 0)         X increases →

Example Page: A4 size = 595 × 842 points
```

**Key Points:**
- Origin (0,0) is at **bottom-left**
- Y increases going **UP**
- Used by: unpdf, PDF.js, pdfminer, PyPDF2
- This is the **standard PDF coordinate system**

### 2. Canvas Coordinate System (React/Browser)
```
(0, 0)  ←─────────────┐
        │              │
        │              │ Y increases ↓
        │              │
        │              │
        └─────────────→ (595, 842)
                    X increases →

Origin: TOP-LEFT corner of page
Y-axis: Increases DOWNWARD
```

**Key Points:**
- Origin (0,0) is at **top-left**
- Y increases going **DOWN**
- Used by: HTML Canvas, SVG, most UI frameworks
- This is the **standard browser coordinate system**

---

## 🔄 Coordinate Conversion

### Canvas to PDF (when user draws selection):
```javascript
function canvasToPDF(canvasCoords, viewport, scale = 1.5) {
  const { x, y, width, height } = canvasCoords;

  return {
    x: x / scale,
    y: (viewport.height / scale) - (y / scale) - (height / scale), // ← Y-axis flip!
    width: width / scale,
    height: height / scale
  };
}
```

**Example:**
```
Page height: 842 points
Scale: 1.5
Canvas selection: { x: 60, y: 500, width: 200, height: 50 }

PDF coordinates:
  x = 60 / 1.5 = 40
  y = (842 / 1.5) - (500 / 1.5) - (50 / 1.5)
    = 561.33 - 333.33 - 33.33
    = 194.67
  width = 200 / 1.5 = 133.33
  height = 50 / 1.5 = 33.33

Result: { x: 40, y: 194.67, width: 133.33, height: 33.33 }
```

### Visual Representation:
```
CANVAS (top-left origin)          PDF (bottom-left origin)
┌─────────────────┐              ┌─────────────────┐
│ y=500           │              │                 │
│ ┌────────┐      │              │                 │ y=194.67
│ │Selection│     │      →       │                 │ ┌────────┐
│ └────────┘      │              │                 │ │Selection│
│                 │              │                 │ └────────┘
│                 │              │                 │
└─────────────────┘              └─────────────────┘
     (canvas)                         (PDF)
```

---

## 📄 Multi-Page PDF Handling

### How unpdf Extracts Coordinates

When unpdf processes a multi-page PDF:

```javascript
const pdf = await getDocumentProxy(pdfBuffer);

// Get page 1
const page1 = await pdf.getPage(1);
const content1 = await page1.getTextContent();

// content1.items = [
//   { str: "Hello", transform: [12, 0, 0, 12, 45, 700], width: 30, height: 12 },
//   { str: "World", transform: [12, 0, 0, 12, 80, 700], width: 35, height: 12 }
// ]

// Get page 2
const page2 = await pdf.getPage(2);
const content2 = await page2.getTextContent();
// ... same structure for page 2

// Get page 5
const page5 = await pdf.getPage(5);
const content5 = await page5.getTextContent();
```

**Key Points:**
1. **Each page has its OWN coordinate system**
2. Each page starts at (0, 0) at bottom-left
3. Pages don't share coordinates
4. Page 1 field at (100, 200) is DIFFERENT from Page 5 field at (100, 200)

### Page Number in Rules File

```json
{
  "b2b_invoices_integrated_tax": {
    "pattern": "B2B.*Invoices.*([\\d,]+\\.\\d{2})",
    "coordinates": {
      "page": 1,        ← Which page
      "x": 88.44,       ← X from left edge of page 1
      "y": 170.77,      ← Y from BOTTOM edge of page 1
      "width": 18.08,
      "height": 10
    }
  },
  "some_field_on_page_5": {
    "pattern": "Some.*Field.*([\\d,]+)",
    "coordinates": {
      "page": 5,        ← Different page
      "x": 88.44,       ← X from left edge of page 5
      "y": 387.54,      ← Y from BOTTOM edge of page 5
      "width": 20,
      "height": 10
    }
  }
}
```

---

## 🔍 How Selection Filtering Works

### Step 1: User Draws Selection on Page 5

```javascript
// User draws on canvas (page 5 visible)
Canvas selection: {
  pageNum: 5,
  canvasBox: { x: 71, y: 455, width: 1123, height: 65 },
  boundingBox: { x: 47.47, y: 247.79, width: 749, height: 43.51 }
}
```

### Step 2: Package Checks Overlap

```javascript
// In package/index.js - extractWithSelections()

for (const [fieldName, rule] of Object.entries(rules.rules)) {
  if (!rule.coordinates) continue;  // Skip fields without coordinates

  const fieldCoords = rule.coordinates;

  selections.forEach(selection => {
    // ✅ MUST be on same page
    if (selection.pageNum !== fieldCoords.page) return false;

    // ✅ Check bounding box overlap
    const selBox = selection.boundingBox;
    const fieldBox = fieldCoords;

    const overlaps = !(
      selBox.x + selBox.width < fieldBox.x ||
      selBox.x > fieldBox.x + fieldBox.width ||
      selBox.y + selBox.height < fieldBox.y ||  // ← This is where it fails!
      selBox.y > fieldBox.y + fieldBox.height
    );

    if (overlaps) {
      fieldsInSelection.push(fieldName);
    }
  });
}
```

### Step 3: Why Page 5 Fails

```
Your Selection (Page 5):
  Y Range: 247.79 → 291.30

Rules File Fields (Page 5):
  Y Position: 387.54

Overlap Check:
  selBox.y (247.79) > fieldBox.y + fieldBox.height (387.54 + 10 = 397.54)?
  NO - selection is BELOW the field

  selBox.y + selBox.height (291.30) < fieldBox.y (387.54)?
  YES - selection ends before field starts

Result: NO OVERLAP ❌
```

---

## 🐛 The Root Cause

The issue is that **the rules file coordinates were captured with a different page height than what your canvas is using**.

### Possible Causes:

1. **Different PDF Rendering:**
   - Rules captured: Page height = 842 (A4)
   - Canvas using: Page height = 700 (scaled/cropped)

2. **Different Coordinate Origin:**
   - Rules use: Bottom-left origin
   - Canvas uses: Top-left origin
   - Conversion formula depends on **exact page height**

3. **Wrong Viewport Height:**
   ```javascript
   // If this is wrong, all Y coordinates are wrong:
   y: (viewport.height / scale) - (y / scale) - (height / scale)
        ^^^^^^^^^^^^^^  ← If this doesn't match the original, coordinates are off
   ```

---

## 🔧 How to Debug

### Check Viewport Height

Add this to your React component:

```javascript
// In PDFViewer.js
const renderPage = async (pageNumber) => {
  const page = await pdf.getPage(pageNumber);
  const viewport = page.getViewport({ scale: 1.5 });

  console.log(`Page ${pageNumber} viewport:`, {
    width: viewport.width,
    height: viewport.height,
    scale: viewport.scale
  });

  // ... rest of rendering
};
```

### Check What unpdf Returns

```javascript
const pdf = await getDocumentProxy(pdfBuffer);
const page5 = await pdf.getPage(5);
const viewport5 = page5.getViewport({ scale: 1.0 });

console.log('Page 5 dimensions:', {
  width: viewport5.width,
  height: viewport5.height
});
```

---

## ✅ Solution Options

### Option 1: Recapture All Coordinates

Create a tool that uses your CURRENT canvas/viewport to capture coordinates:

1. Display PDF in your React app
2. Draw boxes around fields
3. Save coordinates using YOUR coordinate system
4. Now they'll match when users draw selections

### Option 2: Convert Rules File Coordinates

If you know the original page height used to capture coordinates:

```javascript
function convertCoordinates(oldCoords, oldPageHeight, newPageHeight) {
  // Convert from old coordinate system to new
  return {
    ...oldCoords,
    y: (newPageHeight / oldPageHeight) * oldCoords.y
  };
}
```

### Option 3: Make Coordinate System Consistent

Always use the same viewport height for both:
- Capturing coordinates
- Converting canvas selections
- Checking overlaps

---

## 📝 Summary

**The coordinate system works like this:**

1. **PDF uses bottom-left origin**, Y increases upward
2. **Canvas uses top-left origin**, Y increases downward
3. **Each page has its own coordinate space** (0,0) to (width, height)
4. **Conversion depends on EXACT page height** from viewport
5. **Rules file coordinates must match the viewport used by canvas**

**Your issue:**
- Page 5 selection: Y = 247-291
- Page 5 rules fields: Y = 387
- They don't overlap because the Y coordinates are in different scales/systems

**Fix:**
- Ensure `viewport.height` is the same when capturing rules and when drawing selections
- Or recapture all coordinates using your current React PDF viewer
