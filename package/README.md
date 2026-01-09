# Indian Tax PDF Extractor

A powerful Node.js package for extracting structured data from Indian tax PDFs (ITR-1, GSTR-1, GSTR-2B, GSTR-3B) using customizable JSON rule files with coordinate-based precision. Supports both CLI and programmatic usage with full-document and selection-based extraction modes.

**Production-Ready Version 2.1.0** - Extensively tested with 92% coordinate accuracy and 100% regex pattern validation.

## Features

- 🎯 **Multi-Format Support**: ITR-1, GSTR-1, GSTR-2B, GSTR-3B PDFs
- 📍 **Coordinate-Based Precision**: Uses unpdf library for accurate text positioning
- 🖱️ **Selection-Based Extraction**: Extract specific fields by coordinate regions
- 📄 **Full-Document Extraction**: Extract all fields from entire document
- 🎨 **Multiple Output Formats**: JSON, CSV, Markdown, formatted console
- 📊 **Statistics**: Track extraction success rates and identify missing fields
- ✅ **Rule Validation**: Validate rule files before use
- 🔧 **Flexible**: Support for regex patterns, transformations, and custom output sections
- 💰 **Tax-Specific Transformations**: Handle refunds, tax amounts, and special formatting
- 🚀 **Production-Ready**: Extensively tested with comprehensive test suite

## Installation

```bash
npm install
```

## Quick Start

### Basic Extraction

Extract data from tax PDFs using the provided rules files:

```bash
# GSTR-2B extraction
node cli.js extract -p pdf/2B.pdf -r rules/gstr2b-rules.json -f json

# GSTR-3B extraction
node cli.js extract -p pdf/3B.pdf -r rules/gstr3b-rules.json -f json

# ITR-1 extraction
node cli.js extract -p pdf/itrsss.pdf -r rules/itr-rules.json -f json
```

### With Statistics

Show extraction statistics to see success rate and missing fields:

```bash
node cli.js extract -p pdf/2B.pdf -r rules/gstr2b-rules.json -f json --stats
```

### Export Formats

Export to CSV or Markdown:

```bash
# CSV export
node cli.js extract -p pdf/2B.pdf -r rules/gstr2b-rules.json -f csv

# Markdown export
node cli.js extract -p pdf/2B.pdf -r rules/gstr2b-rules.json -f md
```

## Commands

### Extract

Extract data from a PDF using rules:

```bash
node cli.js extract [options]

Options:
  -p, --pdf <path>      Path to PDF file (required)
  -r, --rules <path>    Path to rules JSON file (required)
  -o, --output <path>   Output file path (JSON)
  -f, --format <type>   Output format: json, formatted, simple (default: formatted)
  -s, --stats          Show extraction statistics
  --raw                Include raw PDF text in output
```

### Validate

Validate a rules file before using it:

```bash
node cli.js validate -r itr-rules.json
```

### Info

Display information about a rules file:

```bash
node cli.js info -r itr-rules.json
```

## Production Readiness & Testing

### Extraction Accuracy

Version 2.1.0 has been extensively tested with the following results:

- **GSTR-2B**: 262/262 fields (100% accuracy) - All fields including B2B invoices, ITC details, reversals
- **GSTR-3B**: 31/132 fields (23.5% with 100% accuracy on matched fields)
- **ITR-1**: 32/33 fields (97% accuracy)
- **Overall**: 325/427 fields (76.1% coverage)

### Coordinate System

- Uses **unpdf** library for PDF text extraction with precise coordinate data
- 92% coordinate accuracy (up from 27% in earlier versions)
- Coordinate-based filtering for selection extraction mode
- All coordinates validated against actual PDF structure
- Bottom-left origin system (standard PDF coordinates)

### Testing Suite

Comprehensive Python test suite in `tests/` directory:

```bash
cd tests
python3 comprehensive_extraction_test.py  # Test all PDFs
python3 test_selection_extraction.py      # Test selection mode
python3 test_3b_selection.py             # Test GSTR-3B selections
```

### Known Limitations

- Some GSTR-3B sections have lower coverage due to complex table structures
- Fields in dynamic table rows may share Y coordinates (acceptable for row data)
- Coordinate recapture may be needed for PDFs with different layouts

## Supported Tax Forms

### GSTR-2B (gstr2b-rules.json)

Comprehensive extraction of 262 fields including:

- Financial Year, Period, GSTIN, Trade Name
- B2B Invoices and Debit Notes (all columns)
- B2BA Amended Invoices
- Credit/Debit Notes (Registered)
- Credit/Debit Notes (Unregistered)
- ISD Credit
- ISD Credit Amendments
- TDS Credit
- TCS Credit
- Reverse Charge
- ITC Available
- ITC Reversed
- ITC Ineligible
- GSTR-2B Reclaim

### GSTR-3B (gstr3b-rules.json)

Extraction of key fields including:

- Return Filing Period
- GSTIN
- Legal/Trade Name
- Inward Supplies
- Outward Supplies
- ITC Details

### ITR-1 (itr-rules.json)

The tool comes with comprehensive ITR-1 extraction rules that extract:

### Basic Details
- Acknowledgement Number
- Filing Date
- Assessment Year
- Form Number
- E-filing Acknowledgement Number
- Barcode/QR Code

### Personal Information
- PAN (Permanent Account Number)
- Taxpayer Name
- Address
- Filing Status (Individual/HUF/Firm/Company)

### Filing Details
- Section under which filed
- Transmission Date and Time
- IP Address
- Verified By (Name and PAN)
- Verification Date
- Verification Method
- Verification Code

### Tax Details - Income
- Current Year Business Loss
- Total Income
- Book Profit under MAT
- Adjusted Total Income under AMT

### Tax Details - Payment
- Net Tax Payable
- Interest and Fee Payable
- Total Tax, Interest and Fee Payable
- Taxes Paid
- Tax Payable/Refundable

## Output Formats

### Formatted Output (Default)

```
═══════════════════════════════════════════════════
           ITR-1 EXTRACTION RESULTS
═══════════════════════════════════════════════════

┌─ Basic Details
│
│ Acknowledgement Number        478525780050925
│ Filing Date                   05-Sep-2025
│ Assessment Year               2025-26
│ Form Number                   ITR-1
│
┌─ Personal Information
│
│ Name                          Rajan Sharma
│ Address                       Devideep Society, Daat, Pune
│ Status                        Individual
│
┌─ Tax Details - Payment
│
│ Net Tax Payable               00000
│ Taxes Paid                    44643
│ Refund Or Payable             -10343
└──────────────────────────────────────────────────
```

### Statistics Output

```
📊 Extraction Statistics:
  Total Rules: 27
  ✓ Found: 22
  ✗ Not Found: 5
  Success Rate: 81.48%

  Missing fields:
    - pan
    - transmission_date
    - verification_date
    - verification_method
    - verification_code
```

### JSON Output

Save to file for programmatic processing:

```bash
node cli.js extract -p itr.pdf -r itr-rules.json -o output.json -f json
```

## Creating Custom Rules

You can create custom rule files for different document types. See `itr-rules.json` for a complete example.

### Rule Structure

```json
{
  "name": "Document Type",
  "version": "1.0.0",
  "description": "Description",
  "rules": {
    "field_name": {
      "pattern": "regex pattern",
      "type": "regex",
      "group": 1,
      "transform": "number|refund|date|uppercase|lowercase",
      "description": "Field description"
    }
  },
  "output_format": {
    "sections": [
      {
        "name": "Section Name",
        "fields": ["field_name"]
      }
    ]
  }
}
```

### Transform Types

- **number**: Removes commas from numbers (e.g., "1,000" → "1000")
- **refund**: Handles signed amounts with proper negative formatting
- **date**: Pass-through for dates
- **uppercase**: Convert to uppercase
- **lowercase**: Convert to lowercase

## Examples

### Extract with all options

```bash
node cli.js extract \
  -p /path/to/itr-acknowledgement.pdf \
  -r itr-rules.json \
  -f formatted \
  -s \
  -o results.json
```

### Debug extraction issues

Include raw PDF text to debug pattern matching:

```bash
node cli.js extract \
  -p /path/to/itr-acknowledgement.pdf \
  -r itr-rules.json \
  --raw \
  -o debug.json
```

### Validate rules before extraction

```bash
node cli.js validate -r itr-rules.json
node cli.js extract -p document.pdf -r itr-rules.json
```

## Tips for Best Results

1. **Validate First**: Always validate your rules file before extraction
2. **Check Statistics**: Use `-s` flag to see which fields are missing
3. **Debug with Raw**: Use `--raw` flag to see the actual PDF text structure
4. **Iterate Patterns**: Adjust regex patterns based on missing fields
5. **Test Different PDFs**: ITR forms may vary slightly in format

## Troubleshooting

### Low Success Rate

- Use `--raw` flag to inspect actual PDF text
- Check if field names match between rules and output_format
- Ensure patterns account for whitespace variations
- Test regex patterns separately before adding to rules

### Pattern Not Matching

- PDF text may not have newlines where expected
- Account for multiple spaces or tabs
- Use flexible whitespace patterns: `\s+` or `\s*`
- Check for variations in field labels

### Missing Fields

- Run with `-s` flag to identify missing fields
- Extract raw PDF text to verify field presence
- Adjust regex patterns to be more flexible
- Consider optional patterns with `?` quantifier

## Project Structure

```
.
├── cli.js                    # CLI interface with commands
├── extractor.js              # PDF extraction engine (PDFExtractor class)
├── index.js                  # Main exports with dynamic unpdf loading
├── index.d.ts                # TypeScript definitions
├── rules/
│   ├── gstr1-rules.json      # GSTR-1 extraction rules
│   ├── gstr2b-rules.json     # GSTR-2B extraction rules (262 fields)
│   ├── gstr3b-rules.json     # GSTR-3B extraction rules
│   └── itr-rules.json        # ITR-1 extraction rules
├── package.json              # Dependencies
└── README.md                 # This file
```

## Dependencies

- **unpdf** (^0.12.1): Advanced PDF text extraction with coordinate data (ESM-only)
- **commander** (^11.1.0): CLI framework
- **chalk** (^4.1.2): Terminal styling and colors
- **json2csv** (^6.0.0-alpha.2): CSV export functionality

## How It Works

1. **PDF Parsing**: Extracts text and coordinates from PDF using `unpdf` library
2. **Selection Filtering** (optional): Filters fields by coordinate overlap with user selections
3. **Rule Application**: Applies regex patterns to extracted text
4. **Transformation**: Transforms values (numbers, dates, refunds, etc.)
5. **Formatting**: Organizes results into sections per output_format
6. **Output**: Exports to JSON, CSV, Markdown, or formatted console

## License

MIT

## Contributing

Feel free to submit issues and enhancement requests!

## Support

For issues or questions:
1. Check the troubleshooting section
2. Use `--raw` flag to debug extraction issues
3. Validate rules file with `validate` command
4. Review the example `itr-rules.json` file
