#!/usr/bin/env python3
"""
Fix GSTR-3B patterns that specify group: 1 but have no capture groups
"""

import json
import re
from pathlib import Path

RULES_PATH = Path(__file__).parent / 'rules' / 'gstr3b-rules.json'

def count_capture_groups(pattern):
    """Count unescaped opening parentheses (capture groups) in pattern"""
    count = 0
    i = 0
    while i < len(pattern):
        if pattern[i:i+2] == '\\(':
            # Escaped paren, skip
            i += 2
        elif pattern[i] == '(':
            # Unescaped paren = capture group
            count += 1
            i += 1
        else:
            i += 1
    return count

def add_capture_group_to_pattern(pattern):
    """
    Add capture group around the value we want to extract.
    Strategy: Find the number pattern at the end and wrap it in ()
    """
    # Common patterns to capture:
    # [\d,]+\.\d{2} -> ([\d,]+\.\d{2})
    # \([\d,]+\.\d{2}\) -> (\([\d,]+\.\d{2}\))
    # [\d,]+\.\d{2}\s*\([\d,]+\.\d{2}\) -> ([\d,]+\.\d{2}\s*\([\d,]+\.\d{2}\))

    # Find the last occurrence of a number pattern
    # Look for: [\d,]+\.\d{2} or \([\d,]+\.\d{2}\)

    # Strategy: Wrap the entire end part (after last \s* or similar) in a capture group
    # Find where the actual value starts (usually after the last descriptor text)

    # For most patterns, the value is at the very end
    # Let's add a capture group around the last number/value pattern

    # Simple heuristic: if pattern ends with a number-like pattern, wrap it
    patterns_to_wrap = [
        # Match number with optional escaped parens around it
        (r'(\[\\d,\]\+\\\.\\d\{2\}\\s\*\\\\\([\\d,\]\+\\\.\\d\{2\}\\\\\))$', r'(\1)'),
        # Match number at end
        (r'(\[\\d,\]\+\\\.\\d\{2\})$', r'(\1)'),
        # Match escaped paren with number
        (r'(\\\\\(\[\\d,\]\+\\\.\\d\{2\}\\\\\))$', r'(\1)'),
    ]

    fixed = pattern
    for old_pat, new_pat in patterns_to_wrap:
        if re.search(old_pat, fixed):
            fixed = re.sub(old_pat, new_pat, fixed)
            return fixed

    # More aggressive: find the last number-like pattern and wrap it
    # Pattern: [\d,]+\.\d{2}
    last_num_match = None
    for match in re.finditer(r'\[\\d,\]\+\\\.\\d\{2\}', pattern):
        last_num_match = match

    if last_num_match:
        start, end = last_num_match.span()
        # Check if there's more after it (like escaped parens)
        remaining = pattern[end:]

        # Find where to end the capture group
        # Include trailing escaped parens if present
        end_offset = 0
        if remaining.startswith('\\s*\\('):
            # Find the matching \)
            paren_end = remaining.find('\\)')
            if paren_end != -1:
                end_offset = paren_end + 2
        elif remaining.startswith('\\s*'):
            # Just whitespace
            ws_match = re.match(r'\\s\*', remaining)
            if ws_match:
                end_offset = ws_match.end()

        # Wrap in capture group
        capture_end = end + end_offset
        fixed = pattern[:start] + '(' + pattern[start:capture_end] + ')' + pattern[capture_end:]
        return fixed

    return pattern

def main():
    print("🔧 Fixing GSTR-3B capture groups...\n")

    # Read rules
    with open(RULES_PATH, 'r') as f:
        rules = json.load(f)

    fixed_count = 0
    issues = []

    for field_name, rule in rules['rules'].items():
        if 'pattern' not in rule or 'group' not in rule:
            continue

        pattern = rule['pattern']
        expected_group = rule['group']

        if expected_group == 0:
            # group 0 is the whole match, no capture needed
            continue

        # Count actual capture groups
        actual_groups = count_capture_groups(pattern)

        if actual_groups == 0 and expected_group > 0:
            # Problem! Expected a capture group but there are none
            print(f"⚠️  {field_name}")
            print(f"    Expected group {expected_group}, but pattern has 0 groups")
            print(f"    Pattern: {pattern[:100]}...")

            # Try to fix it
            fixed_pattern = add_capture_group_to_pattern(pattern)

            if count_capture_groups(fixed_pattern) > 0:
                # Test if the fixed pattern is still valid regex
                try:
                    re.compile(fixed_pattern, re.IGNORECASE | re.MULTILINE | re.DOTALL)
                    rule['pattern'] = fixed_pattern
                    fixed_count += 1
                    print(f"    ✅ Fixed! New pattern: {fixed_pattern[:100]}...\n")
                except re.error as e:
                    issues.append((field_name, str(e)))
                    print(f"    ❌ Fix failed: {str(e)}\n")
            else:
                issues.append((field_name, "Could not auto-fix"))
                print(f"    ❌ Could not auto-fix\n")
        elif actual_groups < expected_group:
            # Pattern has capture groups, but not enough
            issues.append((field_name, f"Has {actual_groups} groups, expects {expected_group}"))
            print(f"⚠️  {field_name}: Has {actual_groups} groups, expects {expected_group}")

    # Save
    with open(RULES_PATH, 'w') as f:
        json.dump(rules, f, indent=2)

    print("\n" + "="*70)
    print(f"✅ Fixed: {fixed_count} patterns")
    print(f"❌ Could not fix: {len(issues)} patterns")
    print(f"💾 Saved to: {RULES_PATH}")
    print("="*70)

    if issues:
        print("\n⚠️  Patterns still have issues (first 10):")
        for name, err in issues[:10]:
            print(f"  - {name}: {err}")

if __name__ == "__main__":
    main()
