#!/usr/bin/env python3
"""
Coordinate Recapture Script (Python Version)

This script recaptures coordinates for all fields in a rules file using PyPDF2.
It provides an alternative to the Node.js version.

Usage:
    python3 recapture-coordinates.py <pdf-file> <rules-file> [output-file]

Example:
    python3 recapture-coordinates.py ../pdf/2B.pdf ../rules/gstr2b-rules.json

Requirements:
    pip install PyPDF2
"""

import sys
import json
import re
from pathlib import Path

try:
    from PyPDF2 import PdfReader
except ImportError:
    print("❌ PyPDF2 is not installed. Install it with: pip install PyPDF2")
    sys.exit(1)


def extract_text_with_coordinates(pdf_path):
    """Extract text with coordinates from all pages."""
    reader = PdfReader(pdf_path)
    num_pages = len(reader.pages)

    print(f"📄 PDF has {num_pages} pages\n")

    all_pages = []

    for page_num in range(num_pages):
        page = reader.pages[page_num]
        page_height = float(page.mediabox.height)
        page_width = float(page.mediabox.width)

        # Extract text
        text = page.extract_text()

        # Try to extract text with visitor pattern for coordinates
        page_data = {
            'pageNum': page_num + 1,
            'viewport': {
                'width': page_width,
                'height': page_height
            },
            'text': text
        }

        print(f"✅ Page {page_num + 1}: {page_width} × {page_height} pt")
        all_pages.append(page_data)

    return all_pages


def find_text_on_page(page_data, pattern, group=1):
    """Find text matching a pattern on a specific page."""
    text = page_data['text']

    try:
        regex = re.compile(pattern, re.IGNORECASE | re.MULTILINE | re.DOTALL)
        match = regex.search(text)

        if not match or len(match.groups()) < group:
            return None

        matched_text = match.group(group)

        # Since PyPDF2 doesn't provide exact coordinates easily,
        # we'll create approximate coordinates based on text position
        # This is a limitation - for exact coordinates, use the Node.js version

        # Calculate approximate position (rough estimate)
        text_before = text[:match.start(group)]
        lines_before = text_before.count('\n')

        # Rough estimate: assume 12pt font, ~50 chars per line
        y_approx = page_data['viewport']['height'] - (lines_before * 14)
        x_approx = 50  # Rough left margin

        return {
            'text': matched_text,
            'coordinates': {
                'page': page_data['pageNum'],
                'x': round(x_approx, 2),
                'y': round(y_approx, 2),
                'width': round(len(matched_text) * 6, 2),  # Rough estimate
                'height': 12.0
            }
        }

    except re.error as e:
        print(f"  ⚠️  Regex error: {e}")
        return None


def recapture_field_coordinates(field_name, rule, all_pages, stats):
    """Recapture coordinates for a single field."""
    if rule.get('type') != 'regex':
        stats['skipped'] += 1
        return None

    pattern = rule['pattern']
    group = rule.get('group', 1)

    # Try to find on each page
    for page_data in all_pages:
        result = find_text_on_page(page_data, pattern, group)
        if result:
            stats['found'] += 1
            return result['coordinates']

    # Not found
    stats['notFound'].append(field_name)
    return None


def recapture_coordinates(pdf_path, rules_path, output_path):
    """Main recapture function."""
    print("🔍 Coordinate Recapture Script (Python)\n")
    print(f"PDF File: {pdf_path}")
    print(f"Rules File: {rules_path}")
    print(f"Output File: {output_path}\n")

    print("⚠️  NOTE: PyPDF2 provides approximate coordinates.")
    print("   For exact coordinates, use the Node.js version with unpdf.\n")

    # Extract text with coordinates from all pages
    print("🔍 Extracting text from PDF...\n")
    all_pages = extract_text_with_coordinates(pdf_path)

    # Read rules
    print("\n📖 Reading rules file...")
    with open(rules_path, 'r', encoding='utf-8') as f:
        rules = json.load(f)

    print(f"📋 Rules file: {rules['name']} v{rules['version']}")
    print(f"📊 Total fields: {len(rules['rules'])}\n")

    # Recapture coordinates for each field
    print("🎯 Recapturing coordinates...\n")
    stats = {
        'found': 0,
        'notFound': [],
        'skipped': 0
    }

    for field_name, rule in rules['rules'].items():
        new_coords = recapture_field_coordinates(field_name, rule, all_pages, stats)

        if new_coords:
            rule['coordinates'] = new_coords
            print(f"✅ {field_name}: Page {new_coords['page']}, ({new_coords['x']}, {new_coords['y']})")
        elif rule.get('type') == 'regex':
            print(f"❌ {field_name}: NOT FOUND")

    # Write updated rules
    print("\n💾 Writing updated rules...")
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(rules, f, indent=2, ensure_ascii=False)

    print(f"✅ Updated rules written to: {output_path}\n")

    # Print summary
    print("📊 Summary:")
    print(f"  ✅ Found: {stats['found']}")
    print(f"  ❌ Not Found: {len(stats['notFound'])}")
    print(f"  ⏭️  Skipped: {stats['skipped']}")

    if stats['notFound']:
        print("\n⚠️  Fields not found:")
        for field in stats['notFound']:
            print(f"  - {field}")

    total = stats['found'] + len(stats['notFound'])
    if total > 0:
        success_rate = (stats['found'] / total) * 100
        print(f"\n✨ Success Rate: {success_rate:.1f}%")


if __name__ == '__main__':
    if len(sys.argv) < 3:
        print("❌ Usage: python3 recapture-coordinates.py <pdf-file> <rules-file> [output-file]")
        print("\nExample:")
        print("  python3 recapture-coordinates.py ../pdf/2B.pdf ../rules/gstr2b-rules.json")
        print("  python3 recapture-coordinates.py ../pdf/2B.pdf ../rules/gstr2b-rules.json output.json")
        sys.exit(1)

    pdf_path = Path(sys.argv[1]).resolve()
    rules_path = Path(sys.argv[2]).resolve()
    output_path = Path(sys.argv[3]).resolve() if len(sys.argv) > 3 else rules_path.with_name(rules_path.stem + '-updated.json')

    # Validate files exist
    if not pdf_path.exists():
        print(f"❌ PDF file not found: {pdf_path}")
        sys.exit(1)

    if not rules_path.exists():
        print(f"❌ Rules file not found: {rules_path}")
        sys.exit(1)

    # Run
    try:
        recapture_coordinates(str(pdf_path), str(rules_path), str(output_path))
        print("\n✅ Done!")
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
