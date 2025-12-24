# Quick Start Guide

## Installation

Dependencies are already installed. If needed:

```bash
npm install
```

## Basic Usage

### 1. Validate the Rules File

Before extracting data, validate the ITR-1 rules:

```bash
node cli.js validate -r ./rules/itr-rules.json
```

### 2. View Rules Information

See what fields will be extracted:

```bash
node cli.js info -r ./rules/itr-rules.json
```

### 3. Extract Data from ITR-1 PDF

Extract data to JSON format (default):

```bash
node cli.js extract -p ./itrsss.pdf -r ./rules/itr-rules.json
```

Output is automatically saved to: `./output/itrsss_2025-12-24_10-30-45/itrsss_2025-12-24_10-30-45.json`

### 4. Extract with Statistics

Show extraction statistics:

```bash
node cli.js extract -p ./itrsss.pdf -r ./rules/itr-rules.json -s
```

### 5. Export to Different Formats

**CSV format (for Excel/Spreadsheets):**
```bash
node cli.js extract -p ./itrsss.pdf -r ./rules/itr-rules.json -f csv
```

**Markdown format (for documentation):**
```bash
node cli.js extract -p ./itrsss.pdf -r ./rules/itr-rules.json -f md
```

**JSON format (default):**
```bash
node cli.js extract -p ./itrsss.pdf -r ./rules/itr-rules.json -f json
```

## Common Commands

### Extract with statistics

```bash
node cli.js extract \
  -p ./itrsss.pdf \
  -r ./rules/itr-rules.json \
  -f json \
  -s
```

### Export to CSV for Excel

```bash
node cli.js extract \
  -p ./itrsss.pdf \
  -r ./rules/itr-rules.json \
  -f csv
```

### Export to Markdown for Reports

```bash
node cli.js extract \
  -p ./itrsss.pdf \
  -r ./rules/itr-rules.json \
  -f md
```

### Print to Console (instead of saving file)

```bash
node cli.js extract \
  -p ./itrsss.pdf \
  -r ./rules/itr-rules.json \
  -f json \
  --console
```

### Debug extraction (include raw PDF text)

```bash
node cli.js extract \
  -p ./itrsss.pdf \
  -r ./rules/itr-rules.json \
  --raw
```

## Output Directory Structure

All extractions are automatically saved to organized directories:

```
./output/
└── {pdf_name}_{date}_{time}/
    ├── {pdf_name}_{date}_{time}.json
    ├── {pdf_name}_{date}_{time}.csv
    └── {pdf_name}_{date}_{time}.md
```

**Example:**
```
./output/
└── itrsss_2025-12-24_10-30-45/
    ├── itrsss_2025-12-24_10-30-45.json
    ├── itrsss_2025-12-24_10-30-45.csv
    └── itrsss_2025-12-24_10-30-45.md
```

Each run creates a new directory with the PDF name, date, and time (format: YYYY-MM-DD_HH-MM-SS), preventing overwrites.

## What Gets Extracted

The tool extracts 27 fields from ITR-1 acknowledgement PDFs:

- Basic Details (6 fields): Acknowledgement number, dates, form type, barcode
- Personal Information (4 fields): PAN, name, address, status
- Filing Details (8 fields): Section, transmission info, verification details
- Tax Details - Income (4 fields): Loss, income, book profit, adjusted income
- Tax Details - Payment (5 fields): Tax payable, paid, refund/payable amounts

## Output Formats

### JSON Format
Structured data with metadata, perfect for APIs and automation:
```json
{
  "metadata": {
    "ruleset": "Indian Income Tax Return (ITR-1) Extractor",
    "version": "1.0.0",
    "extracted_at": "2025-12-24T05:58:33.248Z"
  },
  "data": {
    "acknowledgement_number": {
      "value": "478525780050925",
      "found": true
    }
  }
}
```

### CSV Format
Spreadsheet-friendly format with headers:
```csv
Field,Value,Found,Description
"Acknowledgement Number","478525780050925",Yes,"Unique acknowledgement number"
"Filing Date","05-Sep-2025",Yes,"Date when the ITR was filed"
"Pan","DDDEEV5771D",Yes,"Permanent Account Number"
```

### Markdown Format
Beautiful formatted tables for documentation:
```markdown
# Indian Income Tax Return (ITR-1) Extractor

## Basic Details
| Field | Value |
|-------|-------|
| Acknowledgement Number | 478525780050925 |
| Filing Date | 05-Sep-2025 |
```

## Expected Console Output

When extraction is successful with statistics (`-s`), you'll see:

```
🔍 Starting PDF extraction...
PDF: ./itrsss.pdf
Rules: ./rules/itr-rules.json
Format: json

📊 Extraction Statistics:
  Total Rules: 27
  ✓ Found: 27
  ✗ Not Found: 0
  Success Rate: 100.00%

Created directory: output/itrsss_2025-12-24_10-30-45
✓ Results saved to: output/itrsss_2025-12-24_10-30-45/itrsss_2025-12-24_10-30-45.json

✓ Extraction completed successfully!
```

## Troubleshooting

### If fields are not found:

1. Use `--raw` to see the actual PDF text:
   ```bash
   node cli.js extract -p ./itrsss.pdf -r ./rules/itr-rules.json --raw
   ```

2. Check the output JSON file for the `raw_text` field

3. Adjust patterns in `./rules/itr-rules.json` based on actual text structure

### View extraction without saving:

Use `--console` to print results to terminal:
```bash
node cli.js extract -p ./itrsss.pdf -r ./rules/itr-rules.json --console
```

### If validation fails:

1. Check the error message from the validate command
2. Ensure regex patterns are properly escaped
3. Verify JSON syntax is correct

## Available Options

```
Commands:
  extract    Extract data from a PDF file using a rule file
  validate   Validate a rules file
  info       Show information about a rules file

Extract Options:
  -p, --pdf <path>      Path to PDF file (required)
  -r, --rules <path>    Path to rules JSON file (required)
  -f, --format <type>   Output format: json, csv, md (default: "json")
  -s, --stats           Show extraction statistics
  --raw                 Include raw PDF text in output (json format only)
  --console             Print to console instead of saving to file
```

## Next Steps

- Read the full README.md for detailed documentation
- Customize `./rules/itr-rules.json` for your specific ITR PDF format
- Create additional rule files for other document types
- Export to CSV for easy import into Excel
- Export to Markdown for beautiful documentation
