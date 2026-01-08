#!/usr/bin/env python3
"""
Add more coordinates to GSTR-3B fields
Uses pattern matching to find text in PDF and capture coordinates
"""

import json
import subprocess
import re
from pathlib import Path

BASE_DIR = Path(__file__).parent
PDF_PATH = BASE_DIR / 'pdf' / '3B.pdf'
RULES_PATH = BASE_DIR / 'rules' / 'gstr3b-rules.json'

def extract_pdf_text_with_coords():
    """Extract text from PDF using Node.js/unpdf"""
    script = f"""
const fs = require('fs');
const unpdf = await import('unpdf');

const pdfBuffer = fs.readFileSync('{PDF_PATH}');
const uint8Array = new Uint8Array(pdfBuffer);
const pdf = await unpdf.getDocumentProxy(uint8Array);

const allItems = [];
for (let i = 1; i <= pdf.numPages; i++) {{
  const page = await pdf.getPage(i);
  const textContent = await page.getTextContent();

  textContent.items.forEach(item => {{
    const x = Math.round(item.transform[4] * 100) / 100;
    const y = Math.round(item.transform[5] * 100) / 100;
    const width = Math.round((item.width || 0) * 100) / 100;
    const height = Math.round((item.height || 12) * 100) / 100;

    allItems.push({{
      text: item.str,
      pageNum: i,
      x, y, width, height
    }});
  }});
}}

console.log(JSON.stringify(allItems));
"""

    temp_script = BASE_DIR / 'temp_extract_coords.mjs'
    with open(temp_script, 'w') as f:
        f.write(script)

    try:
        result = subprocess.run(
            ['node', str(temp_script)],
            cwd=str(BASE_DIR),
            capture_output=True,
            text=True,
            timeout=30
        )

        if result.returncode != 0:
            print(f"Error: {result.stderr}")
            return []

        return json.loads(result.stdout)
    finally:
        if temp_script.exists():
            temp_script.unlink()

def find_coordinates_for_field(field_name, pattern, text_items):
    """
    Try to find coordinates for a field by matching keywords in the pattern
    """
    # Extract keywords from pattern (words with 3+ letters)
    keywords = re.findall(r'\b[A-Za-z]{3,}\b', pattern)
    keywords = [k for k in keywords if k.lower() not in ['outward', 'inward', 'supplies', 'goods', 'services']]

    if not keywords:
        return None

    # Try to find text items containing these keywords
    for keyword in keywords[:5]:  # Try first 5 keywords
        for item in text_items:
            if keyword.lower() in item['text'].lower():
                # Found a match! Return coordinates with some offset for the value
                return {
                    'page': item['pageNum'],
                    'x': item['x'] + 200,  # Offset to right for value
                    'y': item['y'],
                    'width': 100,
                    'height': item['height']
                }

    return None

def main():
    print("📍 Adding more coordinates to GSTR-3B fields...\n")

    # Extract PDF text with coordinates
    print("📄 Extracting PDF text...")
    text_items = extract_pdf_text_with_coords()
    if not text_items:
        print("❌ Failed to extract PDF text")
        return

    print(f"✅ Extracted {len(text_items)} text items\n")

    # Load rules
    with open(RULES_PATH, 'r') as f:
        rules = json.load(f)

    # Find coordinates for fields that don't have them
    added = 0
    skipped = 0

    for field_name, rule in rules['rules'].items():
        if 'coordinates' in rule:
            skipped += 1
            continue

        # Try to find coordinates
        pattern = rule.get('pattern', '')
        coords = find_coordinates_for_field(field_name, pattern, text_items)

        if coords:
            rule['coordinates'] = coords
            added += 1
            print(f"✅ {field_name}: Page {coords['page']}, ({coords['x']}, {coords['y']})")
        else:
            print(f"⚠️  {field_name}: Could not find coordinates")

    # Save updated rules
    with open(RULES_PATH, 'w') as f:
        json.dump(rules, f, indent=2)

    print("\n" + "="*60)
    print(f"✅ Added coordinates: {added} fields")
    print(f"⏭️  Already had: {skipped} fields")
    print(f"📊 Total with coords: {added + skipped} / {len(rules['rules'])}")
    print(f"💾 Saved to: {RULES_PATH}")
    print("="*60)

if __name__ == "__main__":
    main()
