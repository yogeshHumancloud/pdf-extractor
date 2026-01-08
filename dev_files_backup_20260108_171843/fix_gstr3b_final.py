#!/usr/bin/env python3
"""
Final fix for GSTR-3B regex patterns
Handles:
1. Double backslashes (\\s -> \s, \\n -> \n, etc.)
2. Unmatched parentheses (\(stuff) -> \(stuff\))
"""

import json
import re
from pathlib import Path

RULES_PATH = Path(__file__).parent / 'rules' / 'gstr3b-rules.json'

def fix_pattern_thoroughly(pattern):
    """
    Fix pattern issues:
    1. Replace \\s, \\n, \\d, etc. with \s, \n, \d
    2. Find \( followed by content and ) -> make sure ) is also escaped as \)
    """
    fixed = pattern

    # Fix double-escaped special characters
    # \\s -> \s, \\n -> \n, \\d -> \d, etc.
    replacements = {
        '\\\\s': '\\s',
        '\\\\S': '\\S',
        '\\\\d': '\\d',
        '\\\\D': '\\D',
        '\\\\w': '\\w',
        '\\\\W': '\\W',
        '\\\\n': '\\n',
        '\\\\r': '\\r',
        '\\\\t': '\\t',
    }

    for old, new in replacements.items():
        fixed = fixed.replace(old, new)

    # Now fix unbalanced parentheses
    # Pattern: \(  followed by stuff, then )  should be  \(stuff\)
    # We need to match \( and ensure corresponding ) is also escaped

    # Strategy: Find all \( and track if the next ) is escaped
    result = []
    i = 0
    while i < len(fixed):
        if i < len(fixed) - 1 and fixed[i:i+2] == '\\(':
            # Found escaped opening paren
            result.append('\\(')
            i += 2

            # Now find the matching closing paren
            depth = 1
            start_pos = i
            while i < len(fixed) and depth > 0:
                if i < len(fixed) - 1 and fixed[i:i+2] == '\\(':
                    depth += 1
                    result.append('\\(')
                    i += 2
                elif i < len(fixed) - 1 and fixed[i:i+2] == '\\)':
                    depth -= 1
                    result.append('\\)')
                    i += 2
                elif fixed[i] == '(':
                    # Unescaped opening paren (capture group)
                    depth += 1
                    result.append('(')
                    i += 1
                elif fixed[i] == ')':
                    # Unescaped closing paren
                    depth -= 1
                    if depth == 0:
                        # This closes our initial \(
                        # It should be escaped!
                        result.append('\\)')
                    else:
                        # This closes a capture group
                        result.append(')')
                    i += 1
                else:
                    result.append(fixed[i])
                    i += 1
        else:
            result.append(fixed[i])
            i += 1

    return ''.join(result)

def main():
    print("🔧 Final fix for GSTR-3B regex patterns...\n")

    # Read rules
    with open(RULES_PATH, 'r') as f:
        rules = json.load(f)

    fixed_count = 0
    still_invalid = []

    for field_name, rule in rules['rules'].items():
        if 'pattern' not in rule:
            continue

        original = rule['pattern']
        fixed = fix_pattern_thoroughly(original)

        # Test
        try:
            re.compile(fixed, re.IGNORECASE | re.MULTILINE | re.DOTALL)

            if original != fixed:
                rule['pattern'] = fixed
                fixed_count += 1
                if fixed_count <= 10:  # Show first 10
                    print(f"✅ {field_name}")
                    if len(original) < 120:
                        print(f"   Before: {original}")
                        print(f"   After:  {fixed}\n")

        except re.error as e:
            still_invalid.append((field_name, str(e)))
            print(f"❌ {field_name}: {str(e)}")

    # Save
    with open(RULES_PATH, 'w') as f:
        json.dump(rules, f, indent=2)

    print("\n" + "="*70)
    print(f"✅ Successfully fixed: {fixed_count} patterns")
    print(f"❌ Still invalid: {len(still_invalid)} patterns")
    print(f"💾 Saved to: {RULES_PATH}")
    print("="*70)

    if still_invalid:
        print("\n⚠️ Patterns still invalid (first 10):")
        for name, err in still_invalid[:10]:
            print(f"  - {name}: {err}")

if __name__ == "__main__":
    main()
