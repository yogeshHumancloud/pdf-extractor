#!/usr/bin/env python3
"""
Fix GSTR-2B regex patterns for unpdf compatibility
Adds \\s* between consecutive number patterns to handle spacing differences
"""

import json
import re
import sys
from pathlib import Path

def fix_pattern(pattern):
    """
    Fix a single pattern by adding \\s* between consecutive number patterns

    Fixes:
    1. )[\\d -> )\\s*[\\d (after captured group)
    2. {2}[\\d -> {2}\\s*[\\d (between consecutive numbers)
    3. {2}( -> {2}\\s*( (before captured group)
    4. ]( -> ]\\s*( (before captured group after non-captured number)
    5. text[\\d -> text\\s*[\\d (text directly before number pattern)
    6. DetailsX -> Details\\s*X (between "Details" and category names)
    7. IIX -> II\\s*X (between roman numerals and text)
    8. text( -> text\\s*( (between text and capture groups)
    9. \\d{2}\\d -> \\d{2}\\s*\\d (between \\d quantified patterns)
    10. text\\d+ -> text\\s*\\d+ (between text and \\d+ patterns)
    11. (\\d+)Text -> (\\d+)\\s*Text (between captured \\d+ and text)
    12. \\d+( -> \\d+\\s*( (between \\d+ and capture groups)
    """
    original = pattern

    # Fix 1: Add \\s* after closing paren of capture group before next number
    # Pattern: )[\\d,]+ should become )\\s*[\\d,]+
    pattern = re.sub(r'\)\[\\d', r')\\\\s*[\\d', pattern)

    # Fix 2: Add \\s* between consecutive number patterns
    # Pattern: {2}[\\d should become {2}\\s*[\\d
    pattern = re.sub(r'\{2\}\[\\d', r'{2}\\\\s*[\\d', pattern)

    # Fix 3: Add \\s* before captured groups after numbers
    # Pattern: {2}( should become {2}\\s*(
    pattern = re.sub(r'\{2\}\(', r'{2}\\\\s*\(', pattern)

    # Fix 4: Add \\s* before captured groups after character class
    # Pattern: ]( should become ]\\s*(  (for patterns like ][\\d,]+\\.\\d{2}([...)
    pattern = re.sub(r'\]\(', r']\\\\s*\(', pattern)

    # Fix 5: Add \\s* between text and number patterns
    # Pattern: text[\\d -> text\\s*[\\d (where text is letters/closing paren/special chars)
    # Use \\\\ in raw string to match one literal backslash
    pattern = re.sub(r'([a-zA-Z\)\-])(\[\\d)', r'\1\\\\s*\2', pattern)

    # Fix 6: Add \\s* between "Details" and category names (ISD, B2B, etc.)
    # Pattern: DetailsISD -> Details\\s*ISD
    pattern = re.sub(r'Details([A-Z])', r'Details\\\\s*\1', pattern)

    # Fix 7: Add \\s* between roman numerals (I, II, III, IV) and following text
    # Pattern: IIInward -> II\\s*Inward
    pattern = re.sub(r'(I{1,4})([A-Z][a-z])', r'\1\\\\s*\2', pattern)

    # Fix 8: Add \\s* between text and capture groups
    # Pattern: text( -> text\\s*( (where text is letters or specific patterns)
    pattern = re.sub(r'([a-zA-Z\)])(\()', r'\1\\\\s*\2', pattern)

    # Fix 9: Add \\s* between \\d patterns (for payment fields)
    # Pattern: \d{2}\d+ -> \d{2}\\s*\d+
    pattern = re.sub(r'(\\d\{\d+\})(\\d)', r'\1\\\\s*\2', pattern)

    # Fix 10: Add \\s* between text and \\d+ patterns (for document_type fields)
    # Pattern: Total\d+ -> Total\\s*\d+
    pattern = re.sub(r'([a-zA-Z])(\\d\+)', r'\1\\\\s*\2', pattern)

    # Fix 11: Add \\s* between \\d+ and text (reverse of Fix 10)
    # Pattern: (\d+)Note -> (\d+)\\s*Note
    pattern = re.sub(r'(\\d\+\))([A-Z][a-z])', r'\1\\\\s*\2', pattern)

    # Fix 12: Add \\s* between \\d+ and capture groups with text
    # Pattern: \d+(Note|Invoice) -> \d+\\s*(Note|Invoice)
    pattern = re.sub(r'(\\d\+)(\()', r'\1\\\\s*\2', pattern)

    return pattern, original != pattern

def fix_rules_file(rules_path, output_path=None):
    """
    Fix all patterns in a rules JSON file

    Args:
        rules_path: Path to the rules JSON file
        output_path: Optional output path (defaults to overwriting input)
    """
    print(f"🔧 Fixing GSTR-2B patterns in: {rules_path}\n")

    # Read the rules file
    with open(rules_path, 'r', encoding='utf-8') as f:
        rules = json.load(f)

    fixed_count = 0
    fixed_fields = []

    # Fix each rule pattern
    for field_name, rule in rules.get('rules', {}).items():
        if 'pattern' not in rule:
            continue

        original_pattern = rule['pattern']
        fixed_pattern, was_changed = fix_pattern(original_pattern)

        if was_changed:
            rule['pattern'] = fixed_pattern
            fixed_count += 1
            fixed_fields.append(field_name)
            print(f"✓ Fixed: {field_name}")

    # Save the fixed rules
    output_file = output_path or rules_path
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(rules, f, indent=2, ensure_ascii=False)

    print(f"\n{'='*80}")
    print(f"✅ Fixed {fixed_count} patterns")
    print(f"💾 Saved to: {output_file}")

    if fixed_count > 0:
        print(f"\nFixed fields:")
        for i, field in enumerate(fixed_fields[:10], 1):
            print(f"  {i}. {field}")
        if len(fixed_fields) > 10:
            print(f"  ... and {len(fixed_fields) - 10} more")

    return fixed_count

def main():
    """Main entry point"""
    if len(sys.argv) < 2:
        print("Usage: python fix_gstr2b_patterns.py <rules_file> [output_file]")
        print("\nExample:")
        print("  python fix_gstr2b_patterns.py rules/gstr2b-rules.json")
        print("  python fix_gstr2b_patterns.py rules/gstr2b-rules.json rules/gstr2b-rules-fixed.json")
        sys.exit(1)

    rules_path = sys.argv[1]
    output_path = sys.argv[2] if len(sys.argv) > 2 else None

    if not Path(rules_path).exists():
        print(f"❌ Error: File not found: {rules_path}")
        sys.exit(1)

    # Create backup
    backup_path = f"{rules_path}.backup"
    if not output_path:  # Only backup if overwriting
        import shutil
        shutil.copy2(rules_path, backup_path)
        print(f"📦 Backup created: {backup_path}\n")

    try:
        fixed_count = fix_rules_file(rules_path, output_path)

        if fixed_count > 0:
            print(f"\n✅ Success! Run your test script to verify all fields work.\n")
        else:
            print(f"\n⚠️  No patterns needed fixing. They may already be fixed.\n")

    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == '__main__':
    main()
