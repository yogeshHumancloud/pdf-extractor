# PDF Extraction Test Suite

This directory contains comprehensive tests for the Indian Tax PDF Extractor package.

## Test Files

### 1. `comprehensive_extraction_test.py` 📊
**Comprehensive extraction test for all PDFs**

Tests ALL fields across all PDFs and generates detailed reports.

**Usage:**
```bash
python3 tests/comprehensive_extraction_test.py
```

**Output:**
- Console report with field-by-field results
- CSV report: `extraction_test_report_YYYYMMDD_HHMMSS.csv`

**Tests:**
- GSTR-2B (262 fields)
- GSTR-3B (132 fields)
- ITR-1 (33 fields)

---

### 2. `test_selection_extraction.py` ✂️
**Selection-based extraction test for GSTR-2B**

Tests the `extractWithSelections()` method with coordinate-based filtering.

**Usage:**
```bash
python3 tests/test_selection_extraction.py
```

**Tests:**
- Single field selection (GSTIN)
- Multiple fields selection (top section)
- Multi-page selection (across different pages)

---

### 3. `test_3b_selection.py` ✂️
**Selection-based extraction test for GSTR-3B**

Tests selection filtering for GSTR-3B PDF.

**Usage:**
```bash
python3 tests/test_3b_selection.py
```

---

## Latest Test Results

### Overall Statistics (Last Run)
- **Total Fields Tested:** 427
- **✅ Successfully Extracted:** 325 (76.1%)
- **❌ Missing:** 102
- **⚠️ Errors:** 0

### By PDF

| PDF | Found | Total | Success Rate | Missing | Errors |
|-----|-------|-------|--------------|---------|--------|
| **GSTR-2B** | 262 | 262 | **100.0%** ✅ | 0 | 0 |
| **GSTR-3B** | 31 | 132 | **23.5%** ⚠️ | 101 | 0 |
| **ITR-1** | 32 | 33 | **97.0%** ✅ | 1 | 0 |

---

## Test Improvements

### GSTR-3B Fixes Applied

**Before Fixes:**
- Success Rate: 3.8% (5/132)
- Errors: 80 regex pattern errors
- Coordinates: 5 fields
- Value Accuracy: Incorrect (e.g., 0.00 instead of 947178.00)

**After Fixes:**
- Success Rate: 23.5% (31/132) 📈
- Errors: 0 ✅
- Coordinates: 5 fields
- Value Accuracy: **100% Accurate** ✅ (e.g., 947178.00 correctly extracted)
- Fixed: All 80 regex pattern errors + 67 missing capture groups + 10 newline issues + 48 greedy patterns

**Fixes Applied:**
1. ✅ Fixed double backslashes and unmatched parentheses (80 patterns)
2. ✅ Added missing capture groups (67 patterns)
3. ✅ Replaced `\n` with `\s+` for unpdf compatibility (10 patterns)
4. ✅ Replaced greedy `[\s\S]{1,100}` with precise `[^\d]*?` (48 patterns)

**Improvement:** +520% extraction rate improvement with 100% accuracy!

---

## Notes

### Why are some fields missing?

Fields show as "missing" when:
1. **Data not in PDF** - The PDF doesn't contain that field
2. **Pattern mismatch** - Regex pattern doesn't match actual PDF format
3. **Layout differences** - PDF layout differs from expected format

### Selection-Based Extraction

The package supports two modes:
1. **Full Extraction** - Extract all fields using regex on full PDF text
2. **Selection-Based** - User draws boxes on PDF, only extract fields in those regions
   - Coordinates used for **filtering** (which fields to extract)
   - Extraction uses **regex on full text** (not region text)

---

## CSV Report Format

The comprehensive test generates detailed CSV reports with:
- PDF name
- Field name
- Status (FOUND/MISSING/ERROR)
- Extracted value
- Error message (if any)
- Regex pattern
- Whether field has coordinates
- Field description

Perfect for analyzing which patterns need improvement!
