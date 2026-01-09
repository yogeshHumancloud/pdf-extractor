# Package Update Guide

## Quick Update - Automated Script

The easiest way to update your package with recaptured coordinates:

```bash
cd /Users/yogeshvitekar/Desktop/rules_cli/package/scripts
./update-package.sh
```

This script will:
1. ✅ Backup your original rules file
2. ✅ Replace it with recaptured coordinates
3. ✅ Rebuild the package
4. ✅ Install it in React app
5. ✅ Show you what changed

---

## Manual Update - Step by Step

If you prefer to do it manually:

### Step 1: Backup Original Rules
```bash
cd /Users/yogeshvitekar/Desktop/rules_cli/package
cp rules/gstr2b-rules.json rules/gstr2b-rules-backup.json
```

### Step 2: Replace with Updated Rules
```bash
cp rules/gstr2b-rules-updated.json rules/gstr2b-rules.json
```

### Step 3: Rebuild Package
```bash
npm pack
```

This creates: `indian-tax-pdf-extractor-2.1.0.tgz`

### Step 4: Install in React App
```bash
cd /Users/yogeshvitekar/Desktop/rules_cli/test_react
npm install ../package/indian-tax-pdf-extractor-2.1.0.tgz
```

### Step 5: Test
```bash
npm start
```

Then:
- Upload your PDF
- Upload rules file (or use bundled rules)
- Draw selections on Page 5
- Click "✂️ Extract Selected"
- Should return 24 fields! 🎉

---

## What Changed?

### Before (Old Coordinates)
```
Page 5 fields were on wrong page with wrong coordinates:
- itc_reversal_rule37a_integrated_tax: Page 1, X: 400.97, Y: 513.05
- User selection on Page 5: Y = 247.79 → 291.31
- Result: 0 fields matched ❌
```

### After (Recaptured Coordinates)
```
Page 5 fields now have correct coordinates:
- itc_reversal_rule37a_integrated_tax: Page 5, X: 73.65, Y: 538.00
- User selection on Page 5: Y = 428.46 → 556.38
- Result: 24 fields matched ✅
```

---

## Update All PDFs (Optional)

If you want to recapture coordinates for all your PDFs:

```bash
cd /Users/yogeshvitekar/Desktop/rules_cli/package/scripts

# GSTR-2B (already done)
node recapture-coordinates.js ../pdf/2B.pdf ../rules/gstr2b-rules.json

# GSTR-3B
node recapture-coordinates.js ../pdf/3B.pdf ../rules/gstr3b-rules.json

# GSTR-1
node recapture-coordinates.js ../pdf/1.pdf ../rules/gstr1-rules.json

# ITR-1
node recapture-coordinates.js ../pdf/ITR.pdf ../rules/itr-rules.json
```

Then run the update script for each one, or manually replace and rebuild.

---

## Troubleshooting

### Issue: Script fails at npm pack

**Solution:** Make sure you're in the package directory:
```bash
cd /Users/yogeshvitekar/Desktop/rules_cli/package
npm pack
```

### Issue: React app still uses old coordinates

**Solution:** Make sure you reinstalled the package:
```bash
cd /Users/yogeshvitekar/Desktop/rules_cli/test_react
npm install ../package/indian-tax-pdf-extractor-2.1.0.tgz
npm start
```

Clear your browser cache if needed.

### Issue: Still getting 0 fields on Page 5

**Solution:**
1. Check that you're using the updated rules file
2. Check the debug console's "Overlap Analysis" tab
3. Make sure your selection box overlaps with field coordinates
4. Field coordinates should be on Page 5 (not Page 1)

---

## Verification

After updating, verify the fix:

1. **Check Package Rules:**
   ```bash
   cd /Users/yogeshvitekar/Desktop/rules_cli/package
   grep -A 7 "itc_reversal_rule37a_integrated_tax" rules/gstr2b-rules.json | grep "page"
   ```

   Should show: `"page": 5` (not 1)

2. **Check Installed Package:**
   ```bash
   cd /Users/yogeshvitekar/Desktop/rules_cli/test_react
   grep -A 7 "itc_reversal_rule37a_integrated_tax" node_modules/indian-tax-pdf-extractor/rules/gstr2b-rules.json | grep "page"
   ```

   Should also show: `"page": 5`

3. **Test in React App:**
   - Upload PDF and draw selection on Page 5
   - Should return 24 fields with values "0.00"

---

## Restore Backup (If Needed)

If something goes wrong, restore from backup:

```bash
cd /Users/yogeshvitekar/Desktop/rules_cli/package
cp rules/gstr2b-rules-backup-YYYYMMDD-HHMMSS.json rules/gstr2b-rules.json
npm pack
cd ../test_react
npm install ../package/indian-tax-pdf-extractor-2.1.0.tgz
```

---

## Summary

**The Problem:**
- Page 5 selections returned 0 fields
- Coordinates in rules file didn't match React canvas
- Fields were on wrong page with wrong coordinates

**The Solution:**
- Recaptured coordinates using unpdf (same library as package)
- Updated rules file with correct coordinates
- Page 5 fields now on correct page with correct values

**The Fix:**
- Run `./update-package.sh` to apply changes
- Test in React app
- Page 5 selections now work! ✅

---

## Need Help?

1. Check `RECAPTURE_SUMMARY.md` for coordinate recapture details
2. Check `README.md` for recapture script documentation
3. Check `COORDINATE_SYSTEM_EXPLAINED.md` for technical details
4. Use the 🔍 Debug button in React app for live debugging
