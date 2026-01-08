#!/usr/bin/env python3
"""
Fix GSTR-3B patterns - add capture groups where missing
Simple approach: manually wrap the value pattern
"""

import json
import re
from pathlib import Path

RULES_PATH = Path(__file__).parent / 'rules' / 'gstr3b-rules.json'

def count_unescaped_parens(pattern):
    """Count actual capture groups (unescaped parentheses)"""
    count = 0
    i = 0
    while i < len(pattern):
        if i < len(pattern) - 1 and pattern[i:i+2] == '\\(':
            i += 2  # Skip escaped (
        elif pattern[i] == '(':
            count += 1
            i += 1
        else:
            i += 1
    return count

def add_capture_group(pattern):
    """
    Add capture group around the value we want to extract.
    Most patterns end with a number pattern like: [\d,]+\.\d{2}
    Wrap that in ()
    """
    # Find the last occurrence of the value pattern
    # Common endings:
    # 1. [\d,]+\.\d{2}  (just a number)
    # 2. \([\d,]+\.\d{2}\)  (number in escaped parens)
    # 3. [\d,]+\.\d{2}\s*\([\d,]+\.\d{2}\)  (number followed by another in parens)

    # Strategy: Find where the final value starts and wrap from there to end

    # Look for the last [\d,]+
    last_digit_pos = pattern.rfind('[\\d,]+')
    if last_digit_pos == -1:
        # No number pattern found
        return pattern

    # Start capture from the last [\d,]+
    start = last_digit_pos

    # Find the end - go to the very end of pattern
    end = len(pattern)

    # But first, check if we need to exclude trailing stuff
    # Most patterns end with the value, so just wrap from start to end

    # Insert the capture group
    result = pattern[:start] + '(' + pattern[start:end] + ')'

    return result

def main():
    print("🔧 Fixing GSTR-3B capture groups (simple approach)...\n")

    # Read rules
    with open(RULES_PATH, 'r') as f:
        rules = json.load(f)

    fixed_count = 0
    skipped = 0
    errors = []

    for field_name, rule in rules['rules'].items():
        if 'pattern' not in rule or 'group' not in rule:
            continue

        pattern = rule['pattern']
        expected_group = rule['group']

        if expected_group == 0:
            skipped += 1
            continue

        # Count actual groups
        actual_groups = count_unescaped_parens(pattern)

        if actual_groups == 0 and expected_group > 0:
            # Need to add capture group
            fixed = add_capture_group(pattern)

            # Verify it's valid
            try:
                re.compile(fixed, re.IGNORECASE | re.MULTILINE | re.DOTALL)

                # Count groups in fixed pattern
                if count_unescaped_parens(fixed) > 0:
                    rule['pattern'] = fixed
                    fixed_count += 1

                    if fixed_count <= 10:
                        print(f"✅ {field_name}")
                        print(f"   Before: {pattern[:90]}...")
                        print(f"   After:  {fixed[:90]}...\n")
                else:
                    errors.append((field_name, "Failed to add capture group"))

            except re.error as e:
                errors.append((field_name, str(e)))
                if len(errors) <= 5:
                    print(f"❌ {field_name}: {str(e)}")

    # Save
    with open(RULES_PATH, 'w') as f:
        json.dump(rules, f, indent=2)

    print("\n" + "="*70)
    print(f"✅ Fixed: {fixed_count} patterns")
    print(f"⏭️  Already OK: {skipped} patterns")
    print(f"❌ Errors: {len(errors)} patterns")
    print(f"💾 Saved to: {RULES_PATH}")
    print("="*70)

    if errors:
        print("\n⚠️  Errors (first 10):")
        for name, err in errors[:10]:
            print(f"  - {name}: {err}")

if __name__ == "__main__":
    main()
