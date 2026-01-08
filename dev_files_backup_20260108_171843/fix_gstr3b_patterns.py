#!/usr/bin/env python3
"""
Fix GSTR-3B regex patterns
Fixes:
1. Double-escaped backslashes (\\s -> \s)
2. Unmatched parentheses in regex patterns
"""

import json
import re
from pathlib import Path

RULES_PATH = Path(__file__).parent / 'rules' / 'gstr3b-rules.json'

def fix_pattern(pattern):
    """Fix common regex pattern issues"""
    # First, handle double-escaped backslashes
    fixed = pattern.replace('\\\\', '\\')

    # The patterns have unescaped parentheses that should be escaped
    # We need to be careful here - parentheses used for grouping should stay unescaped
    # Parentheses that are literal (like in "(a)" or "(1)") should be escaped

    # Common fixes for literal parentheses in GSTR-3B patterns:
    # Replace literal parentheses like (a), (b), (1), etc. with escaped versions
    fixed = re.sub(r'(?<!\\)\(([a-zA-Z0-9])\)(?!\s*\?)', r'\\(\1\\)', fixed)

    # Also fix standalone closing parentheses that are not part of groups
    # This is tricky - we need to match closing parens that don't have a matching opening paren

    return fixed

def main():
    print("🔧 Fixing GSTR-3B regex patterns...\n")

    # Read rules
    with open(RULES_PATH, 'r') as f:
        rules = json.load(f)

    fixed_count = 0
    error_count = 0

    for field_name, rule in rules['rules'].items():
        if 'pattern' not in rule:
            continue

        original_pattern = rule['pattern']
        fixed_pattern = fix_pattern(original_pattern)

        if original_pattern != fixed_pattern:
            # Test if the pattern is valid
            try:
                re.compile(fixed_pattern, re.IGNORECASE | re.MULTILINE | re.DOTALL)
                rule['pattern'] = fixed_pattern
                fixed_count += 1
                print(f"✅ {field_name}")
                if len(original_pattern) < 80:
                    print(f"   Before: {original_pattern}")
                    print(f"   After:  {fixed_pattern}")
                else:
                    print(f"   Pattern length: {len(original_pattern)} chars")
            except re.error as e:
                print(f"❌ {field_name}: Still invalid after fix - {e}")
                error_count += 1

    # Save fixed rules
    print(f"\n📝 Saving fixed rules...")
    with open(RULES_PATH, 'w') as f:
        json.dump(rules, f, indent=2)

    print("\n" + "="*60)
    print(f"✅ Fixed {fixed_count} patterns")
    print(f"❌ Still have errors: {error_count}")
    print(f"💾 Saved to: {RULES_PATH}")
    print("="*60)

if __name__ == "__main__":
    main()
