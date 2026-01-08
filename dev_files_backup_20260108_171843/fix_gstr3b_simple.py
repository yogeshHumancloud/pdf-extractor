#!/usr/bin/env python3
"""
Simple fix for GSTR-3B regex patterns
Fixes double-escaped backslashes and validates each pattern
"""

import json
import re
from pathlib import Path

RULES_PATH = Path(__file__).parent / 'rules' / 'gstr3b-rules.json'

def main():
    print("🔧 Fixing GSTR-3B regex patterns (simple approach)...\n")

    # Read rules
    with open(RULES_PATH, 'r') as f:
        rules = json.load(f)

    fixed_count = 0
    invalid_patterns = []

    for field_name, rule in rules['rules'].items():
        if 'pattern' not in rule:
            continue

        original = rule['pattern']

        # Simply fix double-escaped backslashes
        fixed = original.replace('\\\\', '\\')

        # Try to compile and see if it works
        try:
            re.compile(fixed, re.IGNORECASE | re.MULTILINE | re.DOTALL)

            if original != fixed:
                rule['pattern'] = fixed
                fixed_count += 1
                print(f"✅ {field_name}: Fixed double backslashes")

        except re.error as e:
            error_msg = str(e)

            # Try to fix unmatched parentheses
            if 'unmatched' in error_msg.lower() or 'Unmatched' in error_msg:
                # Find position of error if available
                print(f"⚠️  {field_name}: {error_msg}")
                print(f"    Pattern: {fixed[:150]}...")

                # Try escaping all unescaped closing parens
                # This is a heuristic: if we see ) that's not preceded by \, escape it
                # But we need to be careful about capture groups
                attempt = fixed
                # Replace ) that's not part of a quantifier or preceded by \
                attempt = re.sub(r'(?<!\\)(?<![*+?}])\)', r'\\)', attempt)

                try:
                    re.compile(attempt, re.IGNORECASE | re.MULTILINE | re.DOTALL)
                    rule['pattern'] = attempt
                    fixed_count += 1
                    print(f"    ✅ Fixed by escaping closing parens")
                except:
                    invalid_patterns.append((field_name, error_msg, fixed[:100]))
                    print(f"    ❌ Still invalid")
            else:
                invalid_patterns.append((field_name, error_msg, fixed[:100]))

    # Save
    with open(RULES_PATH, 'w') as f:
        json.dump(rules, f, indent=2)

    print("\n" + "="*70)
    print(f"✅ Fixed: {fixed_count} patterns")
    print(f"❌ Still invalid: {len(invalid_patterns)} patterns")
    print("="*70)

    if invalid_patterns:
        print("\n❌ Invalid patterns (need manual fix):")
        for name, err, pat in invalid_patterns[:5]:
            print(f"  {name}: {err}")

if __name__ == "__main__":
    main()
