# Coordinate Recapture Scripts

These scripts automatically recapture coordinates for all fields in a rules file by analyzing the PDF with the same libraries used by the extraction package.

## 🎯 Purpose

The coordinate recapture scripts solve the problem of coordinate mismatches by:

1. **Using the SAME libraries** as the extraction package (unpdf for Node.js)
2. **Extracting text with exact coordinates** from each PDF page
3. **Matching regex patterns** to find field locations
4. **Updating the rules file** with accurate coordinates

This ensures that coordinates in the rules file match the exact coordinate system used during extraction.

---

## 📦 Two Versions Available

### 1. **Node.js Version** (RECOMMENDED)
   - Uses `unpdf` - the SAME library as the package
   - Provides **exact coordinates** matching the extraction engine
   - Most accurate and reliable

### 2. **Python Version**
   - Uses `PyPDF2` for PDF parsing
   - Provides **approximate coordinates** (less accurate)
   - Alternative if Node.js is not available

**⚠️ IMPORTANT:** Use the **Node.js version** for production to ensure coordinates match perfectly.

---

## 🚀 Quick Start

### Node.js Version (Recommended)

```bash
# Navigate to scripts directory
cd /Users/yogeshvitekar/Desktop/rules_cli/package/scripts

# Run the script
node recapture-coordinates.js ../pdf/2B.pdf ../rules/gstr2b-rules.json

# Or specify output file
node recapture-coordinates.js ../pdf/2B.pdf ../rules/gstr2b-rules.json ../rules/gstr2b-rules-new.json
```

### Python Version

```bash
# Install PyPDF2 (first time only)
pip install PyPDF2

# Navigate to scripts directory
cd /Users/yogeshvitekar/Desktop/rules_cli/package/scripts

# Run the script
python3 recapture-coordinates.py ../pdf/2B.pdf ../rules/gstr2b-rules.json
```

---

## 📖 Usage

### Command Syntax

```bash
node recapture-coordinates.js <pdf-file> <rules-file> [output-file]
```

**Parameters:**
- `<pdf-file>`: Path to the PDF file
- `<rules-file>`: Path to the JSON rules file
- `[output-file]`: (Optional) Path for output file. Defaults to `<rules-file>-updated.json`

### Examples

**Example 1: Update GSTR-2B rules**
```bash
node recapture-coordinates.js ../pdf/2B.pdf ../rules/gstr2b-rules.json
# Creates: gstr2b-rules-updated.json
```

**Example 2: Update ITR-1 rules with custom output**
```bash
node recapture-coordinates.js ../pdf/ITR.pdf ../rules/itr-rules.json ../rules/itr-rules-v2.json
# Creates: itr-rules-v2.json
```

**Example 3: Update GSTR-3B rules**
```bash
node recapture-coordinates.js ../pdf/3B.pdf ../rules/gstr3b-rules.json
```

---

## 🔍 How It Works

### Step 1: Extract Text with Coordinates

The script uses `unpdf` to extract text from each PDF page along with exact coordinates:

```javascript
const page = await pdf.getPage(pageNum);
const textContent = await page.getTextContent();

// textContent.items contains:
// [
//   { str: "B2B - Invoices", transform: [12, 0, 0, 12, 88.44, 170.77], width: 80 },
//   { str: "1,640.90", transform: [12, 0, 0, 12, 300, 170.77], width: 45 },
//   ...
// ]
```

### Step 2: Rebuild Full Text

Text items are sorted and joined to recreate the full page text (same as extraction):

```javascript
// Sort by Y (top to bottom), then X (left to right)
const fullText = sortedItems.map(item => item.text).join(' ');
```

### Step 3: Match Patterns

For each field in the rules file, the script:
1. Gets the regex pattern (e.g., `B2B.*Invoices.*([\\d,]+\\.\\d{2})`)
2. Matches it against the full page text
3. Finds the text item containing the matched value
4. Captures its coordinates

```javascript
const regex = new RegExp(rule.pattern, 'gims');
const match = regex.exec(fullText);
const matchedText = match[1]; // "1,640.90"

// Find text item containing "1,640.90"
const item = findItemWithText(pageData.items, matchedText);

return {
  page: pageNum,
  x: item.x,
  y: item.y,
  width: item.width,
  height: item.height
};
```

### Step 4: Update Rules File

The script updates each field's `coordinates` property:

```json
{
  "b2b_invoices_integrated_tax": {
    "pattern": "B2B.*Invoices.*([\\d,]+\\.\\d{2})",
    "type": "regex",
    "group": 1,
    "transform": "number",
    "description": "B2B Invoices - Integrated Tax",
    "coordinates": {
      "page": 1,
      "x": 88.44,
      "y": 170.77,
      "width": 18.08,
      "height": 10
    }
  }
}
```

---

## 📊 Output Example

```
🔍 Coordinate Recapture Script

PDF File: /Users/.../pdf/2B.pdf
Rules File: /Users/.../rules/gstr2b-rules.json
Output File: /Users/.../rules/gstr2b-rules-updated.json

📖 Reading PDF...

🔍 Extracting text with coordinates...
✅ Page 1: 595.27 × 841.88 pt, 2847 text items
✅ Page 2: 595.27 × 841.88 pt, 1823 text items
✅ Page 3: 595.27 × 841.88 pt, 1456 text items
✅ Page 4: 595.27 × 841.88 pt, 982 text items
✅ Page 5: 595.27 × 841.88 pt, 754 text items

📖 Reading rules file...
📋 Rules file: GST GSTR-2B Auto-drafted ITC Statement Extractor v2.0.0
📊 Total fields: 262

🎯 Recapturing coordinates...

✅ financial_year: Page 1, (565, 474.96)
✅ period: Page 1, (565, 458.24)
✅ gstin: Page 1, (45, 425.52)
✅ legal_name: Page 1, (45, 408.8)
...
✅ b2b_invoices_integrated_tax: Page 1, (88.44, 170.77)
✅ b2b_invoices_central_tax: Page 1, (120.5, 170.77)
...
❌ some_field_not_in_pdf: NOT FOUND

💾 Writing updated rules...
✅ Updated rules written to: gstr2b-rules-updated.json

📊 Summary:
  ✅ Found: 260
  ❌ Not Found: 2
  ⏭️  Skipped: 0

⚠️  Fields not found:
  - field_not_in_pdf_1
  - field_not_in_pdf_2

✨ Success Rate: 99.2%

✅ Done!
```

---

## 🎯 Best Practices

### 1. Always Use the Same PDF

Use the **exact same PDF** that users will upload. Don't use:
- Different versions of the form
- Scanned PDFs (use native/digital PDFs)
- PDFs with different layouts

### 2. Verify Patterns First

Before recapturing, ensure regex patterns work:

```bash
# Test extraction first
node cli.js extract ../pdf/2B.pdf ../rules/gstr2b-rules.json
```

Check which fields are found and which are missing.

### 3. Review Output

After recapture:
1. Check the summary - aim for >95% success rate
2. Review fields not found - update their patterns if needed
3. Test extraction with new coordinates:

```bash
node cli.js extract ../pdf/2B.pdf ../rules/gstr2b-rules-updated.json
```

### 4. Backup Original Rules

Always keep a backup:

```bash
cp ../rules/gstr2b-rules.json ../rules/gstr2b-rules-backup.json
```

### 5. Update All Related PDFs

If you have multiple PDF formats, recapture for each:

```bash
# GSTR-2B
node recapture-coordinates.js ../pdf/2B.pdf ../rules/gstr2b-rules.json

# GSTR-3B
node recapture-coordinates.js ../pdf/3B.pdf ../rules/gstr3b-rules.json

# ITR-1
node recapture-coordinates.js ../pdf/ITR.pdf ../rules/itr-rules.json
```

---

## 🐛 Troubleshooting

### Issue: "Field not found"

**Cause:** Regex pattern doesn't match text in PDF

**Solution:**
1. Extract raw text: `node cli.js extract ../pdf/2B.pdf ../rules/gstr2b-rules.json`
2. Check the raw_text in output
3. Update the pattern in rules file
4. Re-run recapture script

### Issue: Wrong coordinates captured

**Cause:** Multiple matches for the same pattern

**Solution:**
1. Make the pattern more specific
2. Add context before/after the value
3. Example:
   ```json
   // Too broad
   "pattern": "([\\d,]+\\.\\d{2})"

   // More specific
   "pattern": "B2B - Invoices.*?([\\d,]+\\.\\d{2})"
   ```

### Issue: Coordinates on wrong page

**Cause:** Pattern matches on multiple pages, script picks first match

**Solution:**
1. Add page-specific context to pattern
2. Example:
   ```json
   "pattern": "Table 3.*?B2B - Invoices.*?([\\d,]+\\.\\d{2})"
   ```

---

## 🔧 Advanced Usage

### Recapture Only Specific Pages

Modify the script to process only certain pages:

```javascript
// In recapture-coordinates.js
// Change:
for (let pageNum = 1; pageNum <= numPages; pageNum++) {

// To:
for (let pageNum = 1; pageNum <= 3; pageNum++) { // Only pages 1-3
```

### Custom Coordinate Adjustments

If coordinates need fine-tuning:

```javascript
// Add offset to all coordinates
const COORD_OFFSET = { x: 0, y: 5 }; // Adjust Y by 5 points

return {
  x: Math.round(item.x + COORD_OFFSET.x),
  y: Math.round(item.y + COORD_OFFSET.y),
  width: Math.round(item.width),
  height: Math.round(item.height)
};
```

---

## 📝 Notes

1. **Coordinate System:** Uses PDF coordinate system (bottom-left origin, Y increases upward)
2. **Scale:** Always uses scale 1.0 for native PDF coordinates
3. **Precision:** Coordinates rounded to 2 decimal places
4. **Performance:** Processes ~2000 text items per page in <1 second

---

## ✅ Next Steps

After running the recapture script:

1. **Test the updated rules:**
   ```bash
   cd /Users/yogeshvitekar/Desktop/rules_cli/package
   node cli.js extract pdf/2B.pdf rules/gstr2b-rules-updated.json
   ```

2. **Compare with old results:**
   ```bash
   # Old rules
   node cli.js extract pdf/2B.pdf rules/gstr2b-rules.json > old-output.json

   # New rules
   node cli.js extract pdf/2B.pdf rules/gstr2b-rules-updated.json > new-output.json

   # Compare
   diff old-output.json new-output.json
   ```

3. **If satisfied, replace old rules:**
   ```bash
   mv rules/gstr2b-rules-updated.json rules/gstr2b-rules.json
   ```

4. **Rebuild package:**
   ```bash
   npm pack
   ```

5. **Update in React app:**
   ```bash
   cd ../test_react
   npm install ../package/indian-tax-pdf-extractor-2.1.0.tgz
   ```

---

## 🆘 Support

If you encounter issues:

1. Check that unpdf is installed: `npm list unpdf`
2. Verify PDF is not corrupted: `node -e "require('unpdf').getDocumentProxy(require('fs').readFileSync('pdf/2B.pdf'))"`
3. Review regex patterns for errors
4. Check script logs for specific error messages

For coordinate debugging in React app, use the built-in coordinate debugger (🔍 Debug button).
