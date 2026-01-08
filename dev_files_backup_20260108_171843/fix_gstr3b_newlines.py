#!/usr/bin/env python3
"""
Fix GSTR-3B patterns - replace \n with \s+ since unpdf doesn't preserve newlines
"""

import json
import re
from pathlib import Path

RULES_PATH = Path(__file__).parent / 'rules' / 'gstr3b-rules.json'

def main():
    print("🔧 Fixing GSTR-3B patterns - replacing \\n with \\s+...\n")

    # Read rules
    with open(RULES_PATH, 'r') as f:
        rules = json.load(f)

    fixed_count = 0

    for field_name, rule in rules['rules'].items():
        if 'pattern' not in rule:
            continue

        original = rule['pattern']

        # Replace \n with \s+ (one or more whitespace)
        # Also replace \\n with \\s+ (in case it's double-escaped)
        fixed = original.replace('\\n', '\\s+').replace('\\\\n', '\\\\s+')

        if original != fixed:
            rule['pattern'] = fixed
            fixed_count += 1

            if fixed_count <= 10:
                print(f"✅ {field_name}")
                print(f"   Before: {original[:100]}...")
                print(f"   After:  {fixed[:100]}...\n")

    # Save
    with open(RULES_PATH, 'w') as f:
        json.dump(rules, f, indent=2)

    print("\n" + "="*70)
    print(f"✅ Fixed: {fixed_count} patterns (replaced \\n with \\s+)")
    print(f"💾 Saved to: {RULES_PATH}")
    print("="*70)

if __name__ == "__main__":
    main()
