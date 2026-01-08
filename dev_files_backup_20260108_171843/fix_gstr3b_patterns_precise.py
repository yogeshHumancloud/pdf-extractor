#!/usr/bin/env python3
"""
Fix GSTR-3B patterns to be more precise
Replace [\s\S]{1,100} with [^\d]*? to match non-digits lazily
"""

import json
import re
from pathlib import Path

RULES_PATH = Path(__file__).parent / 'rules' / 'gstr3b-rules.json'

def main():
    print("🔧 Fixing GSTR-3B patterns for precision...\n")

    # Read rules
    with open(RULES_PATH, 'r') as f:
        rules = json.load(f)

    fixed_count = 0

    for field_name, rule in rules['rules'].items():
        if 'pattern' not in rule:
            continue

        original = rule['pattern']

        # Replace [\s\S]{1,100} with [^\d]*? (match non-digits lazily)
        # This stops before the first digit
        fixed = original.replace('[\\s\\S]{1,100}', '[^\\d]*?')
        fixed = fixed.replace('[\\s\\S]{1,200}', '[^\\d]*?')
        fixed = fixed.replace('[\\s\\S]{1,150}', '[^\\d]*?')
        fixed = fixed.replace('[\\s\\S]{1,300}', '[^\\d]*?')

        if original != fixed:
            # Verify it's still valid regex
            try:
                re.compile(fixed, re.IGNORECASE | re.MULTILINE | re.DOTALL)
                rule['pattern'] = fixed
                fixed_count += 1

                if fixed_count <= 15:
                    print(f"✅ {field_name}")
                    if len(original) < 120:
                        print(f"   Before: {original}")
                        print(f"   After:  {fixed}\n")
            except re.error as e:
                print(f"❌ {field_name}: {str(e)}")

    # Save
    with open(RULES_PATH, 'w') as f:
        json.dump(rules, f, indent=2)

    print("\n" + "="*70)
    print(f"✅ Fixed: {fixed_count} patterns")
    print(f"💾 Saved to: {RULES_PATH}")
    print("="*70)

if __name__ == "__main__":
    main()
