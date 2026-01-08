#!/usr/bin/env python3
"""
Test PDF extraction with both pdf-parse and unpdf
Compares results to ensure both libraries produce identical output
"""

import json
import re
import subprocess
import sys
from pathlib import Path
from typing import Dict, Any, Tuple

class Colors:
    """ANSI color codes for terminal output"""
    BLUE = '\033[94m'
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    CYAN = '\033[96m'
    WHITE = '\033[97m'
    GRAY = '\033[90m'
    RESET = '\033[0m'
    BOLD = '\033[1m'

def extract_text_pdfparse(pdf_path: str) -> str:
    """Extract text using pdf-parse via Node.js"""
    node_script = f"""
    const fs = require('fs');
    const pdf = require('pdf-parse');
    const dataBuffer = fs.readFileSync('{pdf_path}');
    pdf(dataBuffer).then(data => {{
        console.log(data.text);
    }}).catch(err => {{
        console.error('Error:', err.message);
        process.exit(1);
    }});
    """

    try:
        result = subprocess.run(
            ['node', '-e', node_script],
            capture_output=True,
            text=True,
            check=True
        )
        return result.stdout
    except subprocess.CalledProcessError as e:
        raise Exception(f"pdf-parse extraction failed: {e.stderr}")

def extract_text_unpdf(pdf_path: str) -> str:
    """Extract text using unpdf via Node.js"""
    node_script = f"""
    const fs = require('fs');
    const {{ extractText, getDocumentProxy }} = require('unpdf');

    (async () => {{
        try {{
            const buffer = fs.readFileSync('{pdf_path}');
            const pdf = await getDocumentProxy(new Uint8Array(buffer));
            const {{ text }} = await extractText(pdf, {{ mergePages: true }});
            console.log(text);
        }} catch (err) {{
            console.error('Error:', err.message);
            process.exit(1);
        }}
    }})();
    """

    try:
        result = subprocess.run(
            ['node', '-e', node_script],
            capture_output=True,
            text=True,
            check=True
        )
        return result.stdout
    except subprocess.CalledProcessError as e:
        raise Exception(f"unpdf extraction failed: {e.stderr}")

def apply_rule(text: str, rule_name: str, rule: Dict[str, Any]) -> Dict[str, Any]:
    """Apply a single regex rule to extract data from text"""
    try:
        if rule.get('type') != 'regex':
            return {'value': None, 'found': False, 'error': 'Not a regex rule'}

        pattern = rule['pattern']
        group = rule.get('group', 1)

        regex = re.compile(pattern, re.IGNORECASE | re.MULTILINE | re.DOTALL)
        match = regex.search(text)

        if match and len(match.groups()) >= group:
            value = match.group(group).strip() if match.group(group) else None
            return {
                'value': value,
                'found': True,
                'description': rule.get('description', '')
            }

        return {
            'value': None,
            'found': False,
            'description': rule.get('description', '')
        }

    except Exception as e:
        return {
            'value': None,
            'found': False,
            'error': str(e),
            'description': rule.get('description', '')
        }

def compare_extractions(pdf_path: str, rules_path: str, show_all: bool = False) -> Tuple[int, int, int, int]:
    """
    Compare extraction results from pdf-parse and unpdf

    Returns:
        Tuple of (matched, missing_in_unpdf, missing_in_pdfparse, not_found_either)
    """
    print(f"{Colors.BLUE}{Colors.BOLD}🔍 Testing PDF Extraction{Colors.RESET}\n")
    print("="*80)

    # Load rules
    with open(rules_path, 'r', encoding='utf-8') as f:
        rules_data = json.load(f)
    rules = rules_data.get('rules', {})

    print(f"\n{Colors.CYAN}📦 Extracting with pdf-parse...{Colors.RESET}")
    pdfparse_text = extract_text_pdfparse(pdf_path)
    print(f"{Colors.GREEN}✓ Extracted {len(pdfparse_text)} characters{Colors.RESET}")

    print(f"\n{Colors.CYAN}📦 Extracting with unpdf...{Colors.RESET}")
    unpdf_text = extract_text_unpdf(pdf_path)
    print(f"{Colors.GREEN}✓ Extracted {len(unpdf_text)} characters{Colors.RESET}")

    print(f"\n{Colors.CYAN}📊 Comparing Results...{Colors.RESET}\n")
    print("="*80)

    matched = []
    missing_in_unpdf = []
    missing_in_pdfparse = []
    not_found_either = []
    mismatched_values = []

    # Test key fields first
    key_fields = ['financial_year', 'period', 'gstin', 'legal_name', 'date_of_generation', 'trade_name']

    print(f"\n{Colors.BOLD}Key Fields:{Colors.RESET}\n")

    for field_name in key_fields:
        if field_name not in rules:
            continue

        rule = rules[field_name]
        pdfparse_result = apply_rule(pdfparse_text, field_name, rule)
        unpdf_result = apply_rule(unpdf_text, field_name, rule)

        pdfparse_val = pdfparse_result['value']
        unpdf_val = unpdf_result['value']

        if pdfparse_val and unpdf_val:
            if pdfparse_val == unpdf_val:
                status = f"{Colors.GREEN}✅ Match{Colors.RESET}"
                matched.append(field_name)
            else:
                status = f"{Colors.YELLOW}⚠️  Mismatch{Colors.RESET}"
                mismatched_values.append(field_name)
        elif pdfparse_val and not unpdf_val:
            status = f"{Colors.RED}❌ Missing in unpdf{Colors.RESET}"
            missing_in_unpdf.append(field_name)
        elif not pdfparse_val and unpdf_val:
            status = f"{Colors.CYAN}➕ Only in unpdf{Colors.RESET}"
            missing_in_pdfparse.append(field_name)
        else:
            status = f"{Colors.GRAY}⚪ Both missing{Colors.RESET}"
            not_found_either.append(field_name)

        print(f"{field_name}:")
        print(f"  Status:    {status}")
        print(f"  pdf-parse: {pdfparse_val or '(not found)'}")
        print(f"  unpdf:     {unpdf_val or '(not found)'}")
        print()

    # Test all fields
    print(f"\n{Colors.BOLD}Testing ALL {len(rules)} fields...{Colors.RESET}\n")

    for field_name, rule in rules.items():
        if field_name in key_fields:  # Already tested
            continue

        pdfparse_result = apply_rule(pdfparse_text, field_name, rule)
        unpdf_result = apply_rule(unpdf_text, field_name, rule)

        pdfparse_val = pdfparse_result['value']
        unpdf_val = unpdf_result['value']

        if pdfparse_val and unpdf_val:
            if pdfparse_val == unpdf_val:
                matched.append(field_name)
            else:
                mismatched_values.append(field_name)
                if show_all:
                    print(f"{Colors.YELLOW}⚠️  {field_name}: '{pdfparse_val}' != '{unpdf_val}'{Colors.RESET}")
        elif pdfparse_val and not unpdf_val:
            missing_in_unpdf.append(field_name)
        elif not pdfparse_val and unpdf_val:
            missing_in_pdfparse.append(field_name)
        else:
            not_found_either.append(field_name)

    # Summary
    print("="*80)
    print(f"{Colors.BOLD}📊 SUMMARY:{Colors.RESET}")
    print("="*80)
    print(f"Total Rules:             {len(rules)}")
    print(f"{Colors.GREEN}✅ Matched fields:       {len(matched)}{Colors.RESET}")
    print(f"{Colors.RED}❌ Missing in unpdf:     {len(missing_in_unpdf)}{Colors.RESET}")
    print(f"{Colors.CYAN}➕ Only in unpdf:        {len(missing_in_pdfparse)}{Colors.RESET}")
    print(f"{Colors.YELLOW}⚠️  Mismatched values:   {len(mismatched_values)}{Colors.RESET}")
    print(f"{Colors.GRAY}⚪ Not found in either:  {len(not_found_either)}{Colors.RESET}")

    if missing_in_unpdf:
        print(f"\n{Colors.RED}❌ Sample fields missing in unpdf (first 5):{Colors.RESET}")
        for field in missing_in_unpdf[:5]:
            print(f"   - {field}")
        if len(missing_in_unpdf) > 5:
            print(f"   ... and {len(missing_in_unpdf) - 5} more")

    if mismatched_values:
        print(f"\n{Colors.YELLOW}⚠️  Fields with mismatched values:{Colors.RESET}")
        for field in mismatched_values[:5]:
            print(f"   - {field}")
        if len(mismatched_values) > 5:
            print(f"   ... and {len(mismatched_values) - 5} more")

    # Final verdict
    print(f"\n{'='*80}")
    print(f"{Colors.BOLD}🏁 VERDICT:{Colors.RESET}")
    print("="*80)

    if len(matched) == len(rules) - len(not_found_either):
        print(f"{Colors.GREEN}✅ unpdf is 100% COMPATIBLE!{Colors.RESET}")
        print(f"{Colors.GREEN}✅ All {len(matched)} extractable fields match perfectly.{Colors.RESET}")
    elif len(missing_in_unpdf) == 0 and len(mismatched_values) == 0:
        print(f"{Colors.GREEN}✅ unpdf is COMPATIBLE!{Colors.RESET}")
        print(f"{Colors.GREEN}✅ All values match (some fields not in this PDF).{Colors.RESET}")
    elif len(missing_in_unpdf) > 0:
        print(f"{Colors.YELLOW}⚠️  {len(missing_in_unpdf)} fields missing in unpdf - needs pattern fixes{Colors.RESET}")
        print(f"{Colors.CYAN}💡 Run: python fix_gstr2b_patterns.py {rules_path}{Colors.RESET}")
    elif len(mismatched_values) > 0:
        print(f"{Colors.YELLOW}⚠️  {len(mismatched_values)} fields have different values{Colors.RESET}")

    print()
    return len(matched), len(missing_in_unpdf), len(missing_in_pdfparse), len(not_found_either)

def main():
    """Main entry point"""
    if len(sys.argv) < 3:
        print("Usage: python test_extraction.py <pdf_file> <rules_file> [--show-all]")
        print("\nExample:")
        print("  python test_extraction.py pdf/2B.pdf rules/gstr2b-rules.json")
        print("  python test_extraction.py pdf/2B.pdf rules/gstr2b-rules.json --show-all")
        sys.exit(1)

    pdf_path = sys.argv[1]
    rules_path = sys.argv[2]
    show_all = '--show-all' in sys.argv

    # Validate inputs
    if not Path(pdf_path).exists():
        print(f"{Colors.RED}❌ Error: PDF file not found: {pdf_path}{Colors.RESET}")
        sys.exit(1)

    if not Path(rules_path).exists():
        print(f"{Colors.RED}❌ Error: Rules file not found: {rules_path}{Colors.RESET}")
        sys.exit(1)

    try:
        compare_extractions(pdf_path, rules_path, show_all)
    except Exception as e:
        print(f"\n{Colors.RED}❌ Error: {e}{Colors.RESET}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == '__main__':
    main()
