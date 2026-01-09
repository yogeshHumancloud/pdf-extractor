# 🔍 Debug Instructions - Multi-Page Selection Issue

## ✅ What We've Done

I've added **comprehensive debug logging** throughout the entire flow:

### 1. **SelectionCanvas.js** - When You Draw a Box
Logs:
- ✅ Canvas coordinates (what you draw)
- ✅ Viewport info (width, height, scale)
- ✅ Conversion formula (step by step with real numbers)
- ✅ PDF coordinates (after conversion)

### 2. **Package index.js** - When Extraction Happens
Logs:
- ✅ All selections received
- ✅ Each field being checked
- ✅ Field coordinates (page, x, y, width, height)
- ✅ Overlap calculation (step by step)
- ✅ Why fields match or don't match
- ✅ Final statistics

### 3. **Package Updated**
- ✅ Rebuilt with debug logs
- ✅ Installed in React app
- ✅ Ready to test

---

## 🚀 What You Need to Do Now

### Step 1: Start the App
```bash
cd /Users/yogeshvitekar/Desktop/rules_cli/test_react
npm start
```

### Step 2: Run the Test (No Need to Open Browser Console!)
1. **Upload PDF:**
   - Click "Choose PDF File"
   - Select: `/Users/yogeshvitekar/Desktop/rules_cli/package/pdf/2B.pdf`

2. **Upload Rules:**
   - Click "Choose Rules File"
   - Select: `/Users/yogeshvitekar/Desktop/rules_cli/package/rules/gstr2b-rules.json`
   - **Important:** Use `gstr2b-rules.json` (NOT `gstr2b-rules-updated.json`)

3. **Extract Data:**
   - Click "Extract Data" button
   - Wait for full extraction to complete
   - You should see ~260 fields extracted

4. **Navigate to Page 5:**
   - Use page navigation buttons
   - Or click thumbnail #5
   - Confirm you're on Page 5

5. **Draw a Selection Box:**
   - Make sure "Selection Mode" is ON (button should be highlighted)
   - Click and drag on the PDF to draw a box
   - Draw it anywhere on Page 5 (doesn't matter where)

6. **Extract Selected:**
   - Click "✂️ Extract Selected" button
   - Logs will automatically appear at the bottom of the page!

### Step 3: Copy the Logs (Super Easy!)

At the **bottom of the page**, you'll see a **Debug Logs** panel:

```
🔍 Debug Logs  [242]
[▲ Expand] [📋 Copy] [💾 Download] [🗑️ Clear]
```

1. **Click "▲ Expand"** - The panel will expand showing all logs
2. **Click "📋 Copy"** - All logs copied to clipboard!
3. **Paste here** - Just paste the logs in your next message

That's it! No need to open browser console or manually select text.

### Alternative: Download Logs as File

If you prefer, you can also click **"💾 Download"** to save the logs as a text file, then attach it to your message.

---

## 🔍 What the Logs Will Tell Us

### If It's Working ✅
You'll see:
```
📋 Field: itc_reversal_rule37a_integrated_tax
  Page: 5
  Y: 538.00 → 550.00

🔍 Selection 1 (Page 5):
  Result: ✅ OVERLAPS

✅ MATCHED - Field added to selection
```

### If It's NOT Working ❌
You'll see:
```
📋 Field: itc_reversal_rule37a_integrated_tax
  Page: 1  ← WRONG PAGE!
  Y: 513.05 → 523.05

🔍 Selection 1 (Page 5):
  ❌ Wrong page (field on 1, selection on 5)
```

OR

```
📋 Field: itc_reversal_rule37a_integrated_tax
  Page: 5  ← Correct page
  Y: 300.00 → 310.00  ← But Y doesn't overlap!

🔍 Selection 1 (Page 5):
  Selection Y: 450.00 → 550.00
  Field Y:     300.00 → 310.00
  Result: ❌ NO OVERLAP  ← Coordinates don't match!
```

---

## 📝 What to Send Me

After running the test, just:

1. **Click "📋 Copy" button** in the Debug Logs panel
2. **Paste the logs** in your next message
3. **(Optional)** Mention:
   - How many fields were returned?
   - Where did you draw the box? (top/middle/bottom)

---

## 🎯 What I'll Do With the Logs

I'll analyze:
1. **Selection Box Conversion:**
   - Are canvas coords converting to PDF coords correctly?
   - Is the formula right?
   - Are the values reasonable?

2. **Field Coordinates:**
   - Are Page 5 fields actually on Page 5 in rules file?
   - What are their Y coordinates?
   - Do they make sense?

3. **Overlap Detection:**
   - Step by step: why did fields match or not match?
   - Is the overlap logic correct?
   - Are we comparing apples to apples?

4. **Root Cause:**
   - Identify EXACTLY where the issue is
   - Fix it
   - Test again

---

## 💡 Understanding the Simple Logic

You're right - it IS simple:

1. **User draws box on canvas** → Canvas coords (pixels, top-left origin, Y↓)
2. **Convert to PDF coords** → PDF coords (points, bottom-left origin, Y↑)
3. **Check each field:** "Is field box inside/overlapping selection box?"
4. **Return matching fields**

The logs will show us **EXACTLY** where step 3 is failing and why.

---

## 📂 Reference Files

- **PROGRESS.md** - Full debugging context and analysis
- **Debug Logs Added:**
  - `/test_react/src/components/SelectionCanvas.js` (lines 227-265)
  - `/package/index.js` (lines 179-319)

---

## ⏱️ Time Estimate

- Starting app: 30 seconds
- Running test: 1 minute
- Copying logs: **5 seconds** (just click Copy button!)
- **Total: ~1.5 minutes**

---

## 🆘 If Something Goes Wrong

### App Won't Start
```bash
cd /Users/yogeshvitekar/Desktop/rules_cli/test_react
rm -rf node_modules package-lock.json
npm install
npm start
```

### Debug Log Viewer Not Showing
- Refresh the page
- Make sure you clicked "Extract Selected"
- Check bottom of page for the "🔍 Debug Logs" panel

### Copy Button Not Working
- Try the "💾 Download" button instead
- Or open browser console (F12) and copy from there

---

**Let's find the exact root cause and fix this once and for all!** 🚀

The logs will tell us everything we need to know.
