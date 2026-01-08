#!/usr/bin/env python3
"""
Comprehensive PDF Extraction Test Suite
Tests ALL fields for each PDF and generates detailed reports
"""

import json
import subprocess
import sys
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Tuple
import csv

# Base directory
BASE_DIR = Path(__file__).parent.parent

# PDF and Rules configurations
TEST_CONFIGS = [
    {
        'name': 'GSTR-2B',
        'pdf': BASE_DIR / 'pdf' / '2B.pdf',
        'rules': BASE_DIR / 'rules' / 'gstr2b-rules.json'
    },
    {
        'name': 'GSTR-3B',
        'pdf': BASE_DIR / 'pdf' / '3B.pdf',
        'rules': BASE_DIR / 'rules' / 'gstr3b-rules.json'
    },
    {
        'name': 'ITR-1',
        'pdf': BASE_DIR / 'itrsss.pdf',
        'rules': BASE_DIR / 'rules' / 'itr-rules.json'
    }
]


class ExtractionTester:
    def __init__(self, package_dir: Path):
        self.package_dir = package_dir
        self.results = []

    def run_extraction(self, pdf_path: Path, rules_path: Path) -> Dict:
        """Run Node.js extraction and return results"""
        test_script = f"""
const fs = require('fs');
const {{ PDFExtractor }} = require('./index.js');

async function test() {{
    try {{
        const rules = JSON.parse(fs.readFileSync('{rules_path}', 'utf8'));
        const pdfBuffer = fs.readFileSync('{pdf_path}');
        const extractor = new PDFExtractor(rules);

        // Run full extraction
        const results = await extractor.extract(pdfBuffer);

        console.log(JSON.stringify(results, null, 2));
    }} catch (error) {{
        console.error('Error:', error.message);
        console.error(error.stack);
        process.exit(1);
    }}
}}

test();
"""

        test_script_path = self.package_dir / 'temp_comprehensive_test.js'
        with open(test_script_path, 'w') as f:
            f.write(test_script)

        try:
            result = subprocess.run(
                ['node', str(test_script_path)],
                cwd=str(self.package_dir),
                capture_output=True,
                text=True,
                timeout=60
            )

            if result.returncode != 0:
                print(f"❌ Node.js Error:\n{result.stderr}")
                return None

            return json.loads(result.stdout)

        except subprocess.TimeoutExpired:
            print("❌ Extraction timed out (60s)")
            return None
        except json.JSONDecodeError as e:
            print(f"❌ JSON Parse Error: {e}")
            print(f"Output: {result.stdout[:500]}")
            return None
        finally:
            if test_script_path.exists():
                test_script_path.unlink()

    def analyze_results(self, config: Dict, extraction_results: Dict, rules_data: Dict) -> Dict:
        """Analyze extraction results and generate statistics"""
        total_fields = len(rules_data['rules'])
        data = extraction_results.get('data', {})

        found_fields = []
        missing_fields = []
        error_fields = []

        for field_name, field_result in data.items():
            field_info = {
                'name': field_name,
                'description': field_result.get('description', 'N/A'),
                'value': field_result.get('value'),
                'found': field_result.get('found', False),
                'error': field_result.get('error'),
                'pattern': rules_data['rules'][field_name].get('pattern', 'N/A'),
                'has_coordinates': 'coordinates' in rules_data['rules'][field_name]
            }

            if field_result.get('error'):
                error_fields.append(field_info)
            elif field_result.get('found'):
                found_fields.append(field_info)
            else:
                missing_fields.append(field_info)

        return {
            'config': config,
            'total_fields': total_fields,
            'found_count': len(found_fields),
            'missing_count': len(missing_fields),
            'error_count': len(error_fields),
            'success_rate': (len(found_fields) / total_fields * 100) if total_fields > 0 else 0,
            'found_fields': found_fields,
            'missing_fields': missing_fields,
            'error_fields': error_fields,
            'metadata': extraction_results.get('metadata', {}),
            'raw_text_length': len(extraction_results.get('raw_text', ''))
        }

    def print_header(self, title: str, char: str = "="):
        """Print formatted header"""
        width = 100
        print(f"\n{char * width}")
        print(f"{title:^{width}}")
        print(f"{char * width}\n")

    def print_field_table(self, fields: List[Dict], title: str):
        """Print formatted table of fields"""
        if not fields:
            print(f"  No fields in this category.\n")
            return

        print(f"\n{title} ({len(fields)} fields):")
        print("  " + "─" * 96)
        print(f"  {'Field Name':<35} {'Value/Error':<45} {'Has Coords':<10}")
        print("  " + "─" * 96)

        for field in fields:
            name = field['name'][:34]

            if field.get('error'):
                value = f"ERROR: {field['error'][:40]}"
            elif field.get('value'):
                value = str(field['value'])[:44]
            else:
                value = "Pattern not matched"

            has_coords = "Yes" if field['has_coordinates'] else "No"
            print(f"  {name:<35} {value:<45} {has_coords:<10}")

        print("  " + "─" * 96)

    def generate_csv_report(self, all_results: List[Dict], output_path: Path):
        """Generate CSV report with all fields"""
        with open(output_path, 'w', newline='', encoding='utf-8') as csvfile:
            fieldnames = ['PDF', 'Field Name', 'Status', 'Value', 'Error', 'Pattern', 'Has Coordinates', 'Description']
            writer = csv.DictWriter(csvfile, fieldnames=fieldnames)

            writer.writeheader()

            for result in all_results:
                pdf_name = result['config']['name']

                # Write found fields
                for field in result['found_fields']:
                    writer.writerow({
                        'PDF': pdf_name,
                        'Field Name': field['name'],
                        'Status': 'FOUND',
                        'Value': field['value'],
                        'Error': '',
                        'Pattern': field['pattern'][:100] if len(field['pattern']) <= 100 else field['pattern'][:97] + '...',
                        'Has Coordinates': 'Yes' if field['has_coordinates'] else 'No',
                        'Description': field['description']
                    })

                # Write missing fields
                for field in result['missing_fields']:
                    writer.writerow({
                        'PDF': pdf_name,
                        'Field Name': field['name'],
                        'Status': 'MISSING',
                        'Value': '',
                        'Error': '',
                        'Pattern': field['pattern'][:100] if len(field['pattern']) <= 100 else field['pattern'][:97] + '...',
                        'Has Coordinates': 'Yes' if field['has_coordinates'] else 'No',
                        'Description': field['description']
                    })

                # Write error fields
                for field in result['error_fields']:
                    writer.writerow({
                        'PDF': pdf_name,
                        'Field Name': field['name'],
                        'Status': 'ERROR',
                        'Value': '',
                        'Error': field['error'],
                        'Pattern': field['pattern'][:100] if len(field['pattern']) <= 100 else field['pattern'][:97] + '...',
                        'Has Coordinates': 'Yes' if field['has_coordinates'] else 'No',
                        'Description': field['description']
                    })

    def run_comprehensive_test(self):
        """Run comprehensive test on all PDFs"""
        self.print_header("COMPREHENSIVE PDF EXTRACTION TEST SUITE", "═")

        print(f"📅 Test Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"📁 Package Directory: {self.package_dir}")
        print(f"📄 Testing {len(TEST_CONFIGS)} PDF configurations\n")

        all_results = []

        for config in TEST_CONFIGS:
            self.print_header(f"Testing: {config['name']}", "=")

            # Check files exist
            if not config['pdf'].exists():
                print(f"❌ PDF not found: {config['pdf']}")
                continue

            if not config['rules'].exists():
                print(f"❌ Rules not found: {config['rules']}")
                continue

            print(f"📄 PDF: {config['pdf'].name}")
            print(f"📋 Rules: {config['rules'].name}")

            # Load rules to get field count
            with open(config['rules'], 'r') as f:
                rules_data = json.load(f)

            fields_with_coords = sum(1 for r in rules_data['rules'].values() if 'coordinates' in r)
            print(f"📊 Total fields in rules: {len(rules_data['rules'])}")
            print(f"📍 Fields with coordinates: {fields_with_coords}")

            # Run extraction
            print(f"\n🔧 Running extraction...")
            extraction_results = self.run_extraction(config['pdf'], config['rules'])

            if not extraction_results:
                print("❌ Extraction failed\n")
                continue

            # Analyze results
            analysis = self.analyze_results(config, extraction_results, rules_data)
            all_results.append(analysis)

            # Print statistics
            print(f"\n📊 EXTRACTION STATISTICS")
            print(f"  Total Fields:     {analysis['total_fields']}")
            print(f"  ✅ Found:         {analysis['found_count']} ({analysis['success_rate']:.1f}%)")
            print(f"  ❌ Missing:       {analysis['missing_count']}")
            print(f"  ⚠️  Errors:        {analysis['error_count']}")
            print(f"  📝 Raw Text Size: {analysis['raw_text_length']:,} characters")

            # Print field details
            self.print_field_table(analysis['found_fields'], "✅ SUCCESSFULLY EXTRACTED FIELDS")
            self.print_field_table(analysis['missing_fields'], "❌ MISSING FIELDS (Pattern Not Matched)")
            self.print_field_table(analysis['error_fields'], "⚠️  FIELDS WITH ERRORS")

        # Overall Summary
        if all_results:
            self.print_header("OVERALL TEST SUMMARY", "═")

            total_fields_all = sum(r['total_fields'] for r in all_results)
            total_found_all = sum(r['found_count'] for r in all_results)
            total_missing_all = sum(r['missing_count'] for r in all_results)
            total_errors_all = sum(r['error_count'] for r in all_results)
            overall_success_rate = (total_found_all / total_fields_all * 100) if total_fields_all > 0 else 0

            print("📊 AGGREGATE STATISTICS:\n")
            print(f"  Total PDFs Tested:        {len(all_results)}")
            print(f"  Total Fields Across All:  {total_fields_all}")
            print(f"  ✅ Total Found:           {total_found_all} ({overall_success_rate:.1f}%)")
            print(f"  ❌ Total Missing:         {total_missing_all}")
            print(f"  ⚠️  Total Errors:          {total_errors_all}\n")

            print("📋 BY PDF:\n")
            for result in all_results:
                print(f"  {result['config']['name']:15s} | "
                      f"Found: {result['found_count']:3d}/{result['total_fields']:3d} "
                      f"({result['success_rate']:5.1f}%) | "
                      f"Missing: {result['missing_count']:3d} | "
                      f"Errors: {result['error_count']:2d}")

            # Generate CSV report
            csv_path = BASE_DIR / f"extraction_test_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
            self.generate_csv_report(all_results, csv_path)
            print(f"\n💾 Detailed CSV report saved to: {csv_path}")

        print("\n" + "═" * 100)
        print("✅ Comprehensive test completed!")
        print("═" * 100 + "\n")


def main():
    print("🧪 Starting Comprehensive PDF Extraction Test...\n")

    tester = ExtractionTester(BASE_DIR)
    tester.run_comprehensive_test()


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n⚠️  Test interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Test failed with error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
