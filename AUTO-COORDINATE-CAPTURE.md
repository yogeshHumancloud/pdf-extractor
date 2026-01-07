# 📍 Automatic Coordinate Capture

## How It Works

Instead of manually drawing boxes, the system:
1. ✅ Extracts **all text items with coordinates** from the PDF (using unpdf)
2. ✅ Applies **each regex rule** to find matches
3. ✅ When a match is found, **captures the coordinates** of that text
4. ✅ **Automatically updates** rules.json with coordinates

## Usage

### Step 1: Upload Files
1. Go to http://localhost:3000
2. Upload your PDF: `/Users/yogeshvitekar/Desktop/rules_cli/itrsss.pdf`
3. Upload your rules: `/Users/yogeshvitekar/Desktop/rules_cli/rules/itr-rules.json`

### Step 2: Auto-Capture
Click the **"📍 Auto-Capture Coordinates"** button

### Step 3: Check Results
- A file `itr-rules-with-coordinates.json` will be downloaded
- Check the browser console for detailed logs:
  ```
  ✅ Found match for "acknowledgement_number": "Acknowledgement Number:478525780050925"
    📍 Coordinates: page=1, x=28.33, y=812.00
  ```

### Step 4: Review the Output
The downloaded file will have coordinates added to each field:

```json
{
  "acknowledgement_number": {
    "pattern": "Acknowledgement Number:(\\d+)",
    "type": "regex",
    "group": 1,
    "description": "Unique acknowledgement number for the ITR filing",
    "coordinates": {
      "page": 1,
      "x": 28.33,
      "y": 812.00,
      "width": 280.5,
      "height": 9.59
    }
  }
}
```

### Step 5: Use the Updated Rules
1. Replace your old rules file with the new one
2. Now you can use coordinate-based extraction!

---

## How It Finds Coordinates

For each rule:
1. **Apply regex** to full PDF text
2. **Extract matched text** (e.g., "Acknowledgement Number:478525780050925")
3. **Find the text item** containing significant words from the match
4. **Record coordinates** of that text item

### Example:
- **Rule**: `"pattern": "Acknowledgement Number:(\\d+)"`
- **Match found**: "Acknowledgement Number:478525780050925"
- **Search for**: "Acknowledgement" in text items
- **Found at**: x=28.33, y=812.00
- **Capture**: Those coordinates!

---

## Troubleshooting

### Some fields didn't get coordinates
Check the console for warnings:
- `❌ No regex match found` - The regex didn't find anything (pattern might be wrong)
- `⚠️ Could not locate text item` - Found a match but couldn't pinpoint exact location

**Solutions:**
1. Update the regex pattern in rules.json
2. Or manually add coordinates for those fields using the selection feature

### Success Rate
The console will show:
```
✨ Coordinate capture complete!
   ✅ Successfully captured: 24 fields
   ❌ Failed: 3 fields
   📊 Success rate: 88.9%
```

Aim for 90%+ success rate. Failed fields might need:
- Better regex patterns
- Manual coordinate capture

---

## Next Step: Coordinate-Based Extraction

Once you have coordinates in your rules, you can extract data more accurately:

1. The system will use coordinates to look in **specific regions**
2. Only apply regex to text in those regions
3. Much faster and more accurate than full-text search!

---

## Benefits

✅ **No manual work** - Automatic coordinate capture
✅ **Fast** - Processes all fields in seconds
✅ **Accurate** - Uses actual text positions from unpdf
✅ **Reusable** - Save coordinates for future PDFs
✅ **Smart** - Finds text even if layout varies slightly

