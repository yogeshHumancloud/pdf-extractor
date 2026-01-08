#!/usr/bin/env python3
"""
Fix GSTR-3B regex patterns
Main issue: Inconsistently escaped parentheses
Example: \([\d,]+\.\d{2}) should be \([\d,]+\.\d{2}\)
"""

import json
import re
from pathlib import Path

RULES_PATH = Path(__file__).parent / 'rules' / 'gstr3b-rules.json'
BACKUP_PATH = Path(__file__).parent / 'rules' / 'gstr3b-rules.json.backup'

def fix_pattern(pattern):
    """
    Fix regex patterns by ensuring all literal parentheses are consistently escaped

    Strategy:
    1. Handle double backslashes first (\\s -> \s)
    2. Look for patterns like \( followed later by unescaped )
    3. Also look for unescaped ( followed by \)
    """
    # First, fix double-escaped backslashes
    fixed = pattern.replace('\\\\', '\\')

    # Now we need to match pairs like:
    # \(stuff) where opening is escaped but closing is not
    # OR (stuff\) where closing is escaped but opening is not

    # Pattern to find \(....) where opening paren is escaped but closing is not
    # We'll look for \( followed by content that doesn't have \) and ends with just )
    def escape_closing_parens(m):
        """Helper to escape unescaped closing parens after escaped opening ones"""
        content = m.group(1)
        # Only escape if it's not already escaped
        if content.endswith('\\'):
            return m.group(0)  # Already escaped
        return f'\\({content}\\)'

    # This regex finds \(content) where ) is not escaped
    fixed = re.sub(r'\\(\([^)]*[^\\])\)', escape_closing_parens, fixed)

    return fixed

def main():
    print("🔧 Fixing GSTR-3B regex patterns...\n")

    # Backup original
    with open(RULES_PATH, 'r') as f:
        original_content = f.read()

    with open(BACKUP_PATH, 'w') as f:
        f.write(original_content)
    print(f"💾 Backup saved to: {BACKUP_PATH}\n")

    # Read rules
    rules = json.loads(original_content)

    fixed_count = 0
    still_invalid = []

    for field_name, rule in rules['rules'].items():
        if 'pattern' not in rule:
            continue

        original_pattern = rule['pattern']
        fixed_pattern = fix_pattern(original_pattern)

        # Test if the pattern is valid
        try:
            re.compile(fixed_pattern, re.IGNORECASE | re.MULTILINE | re.DOTALL)

            if original_pattern != fixed_pattern:
                rule['pattern'] = fixed_pattern
                fixed_count += 1
                print(f"✅ Fixed: {field_name}")

        except re.error as e:
            still_invalid.append((field_name, str(e), fixed_pattern[:100]))
            # Keep original if fix didn't work
            print(f"⚠️  {field_name}: {str(e)[:50]}")

    # Save fixed rules
    print(f"\n📝 Saving fixed rules...")
    with open(RULES_PATH, 'w') as f:
        json.dump(rules, f, indent=2)

    print("\n" + "="*70)
    print(f"✅ Successfully fixed: {fixed_count} patterns")
    print(f"⚠️  Still invalid: {len(still_invalid)} patterns")
    print(f"💾 Saved to: {RULES_PATH}")
    print(f"📦 Backup at: {BACKUP_PATH}")
    print("="*70)

    if still_invalid:
        print("\n⚠️  Patterns that still need manual fixing:")
        for name, error, pattern in still_invalid[:10]:
            print(f"  - {name}: {error}")
            print(f"    Pattern: {pattern}...")

if __name__ == "__main__":
    main()
