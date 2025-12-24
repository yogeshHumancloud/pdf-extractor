# ITR-1 Data Extractor CLI

A powerful Node.js CLI tool to extract structured data from Indian Income Tax Return (ITR-1) PDF documents using customizable JSON rule files. Perfect for automating data extraction from ITR acknowledgement forms and other tax documents.

## Features

- 🎯 **Rule-Based Extraction**: Define extraction rules in JSON format
- 📄 **PDF Support**: Uses `pdf-parse` for reliable text extraction from ITR PDFs
- 🎨 **Multiple Output Formats**: JSON, formatted console output, or simple text
- 📊 **Statistics**: Track extraction success rates and identify missing fields
- ✅ **Rule Validation**: Validate rule files before use
- 🔧 **Flexible**: Support for regex patterns, transformations, and custom output sections
- 💰 **Tax-Specific Transformations**: Handle refunds, tax amounts, and special formatting

## Installation

```bash
npm install
```

## Quick Start

### Basic Extraction

Extract data from an ITR-1 PDF using the provided rules file:

```bash
node cli.js extract -p /path/to/itr-acknowledgement.pdf -r itr-rules.json
```

### With Statistics

Show extraction statistics to see success rate and missing fields:

```bash
node cli.js extract -p /path/to/itr-acknowledgement.pdf -r itr-rules.json -s
```

### Save to File

Save extraction results to JSON file:

```bash
node cli.js extract -p /path/to/itr-acknowledgement.pdf -r itr-rules.json -o output.json
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

## ITR-1 Extraction Rules

The tool comes with comprehensive ITR-1 extraction rules in `itr-rules.json` that extract:

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
├── cli.js              # CLI interface with commands
├── extractor.js        # PDF extraction engine
├── itr-rules.json      # ITR-1 extraction rules
├── package.json        # Dependencies
└── README.md           # This file
```

## Dependencies

- **pdf-parse** (^1.1.4): PDF text extraction
- **commander** (^11.1.0): CLI framework
- **chalk** (^4.1.2): Terminal styling and colors

## How It Works

1. **PDF Parsing**: Extracts text from PDF using `pdf-parse`
2. **Rule Application**: Applies regex patterns to extracted text
3. **Transformation**: Transforms values (numbers, dates, etc.)
4. **Formatting**: Organizes results into sections
5. **Output**: Displays or saves results in chosen format

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
