#!/bin/bash

# Production Cleanup Script
# This script removes temporary development files and keeps only production-ready files

echo "🧹 Starting production cleanup..."
echo ""

# Create backup directory for safety
BACKUP_DIR="./dev_files_backup_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"
echo "📦 Created backup directory: $BACKUP_DIR"
echo ""

# Files to remove (temporary/development files)
FILES_TO_REMOVE=(
  # Fix scripts (development only)
  "fix_gstr3b_capture_groups.py"
  "fix_gstr3b_captures_simple.py"
  "fix_gstr3b_final.py"
  "fix_gstr3b_newlines.py"
  "fix_gstr3b_patterns.py"
  "fix_gstr3b_patterns_precise.py"
  "fix_gstr3b_regex.py"
  "fix_gstr3b_simple.py"
  "fix_gstr2b_patterns.py"

  # Coordinate capture scripts (development only)
  "add-manual-coordinates-3b.js"
  "add-unpdf-coordinates-3b.js"
  "add_more_coordinates_3b.py"
  "auto-capture-coordinates.js"
  "capture-3b-coordinates.js"
  "capture-coordinates.html"
  "extract-3b-text.js"

  # Test files (temporary)
  "test-fixed-patterns.js"
  "test-gstr2b-patterns.js"
  "test-package.js"
  "test_extract_text.mjs"
  "test_extraction.py"
  "test_pattern.mjs"
  "test_pattern2.mjs"

  # Old package versions
  "indian-tax-pdf-extractor-2.0.0.tgz"
  "indian-tax-pdf-extractor-2.1.0.tgz"

  # Development documentation (keep only README.md)
  "AUTO-COORDINATE-CAPTURE.md"
  "GSTR3B_FIXES_SUMMARY.md"
  "HYBRID-EXTRACTION.md"
  "NEXTJS_SETUP.md"
  "PACKAGE_READY.md"
  "QUICKSTART.md"
  "USAGE_WEB.md"
  "README_PACKAGE.md"
  "ALL_FIXES_COMPLETE.md"

  # Test PDF files
  "itrsss.pdf"

  # Misc
  "node"
  ".DS_Store"
)

# Move files to backup
echo "📁 Moving files to backup..."
MOVED_COUNT=0
for file in "${FILES_TO_REMOVE[@]}"; do
  if [ -f "$file" ]; then
    mv "$file" "$BACKUP_DIR/"
    echo "  ✓ Moved: $file"
    ((MOVED_COUNT++))
  fi
done

echo ""
echo "✅ Cleanup complete!"
echo "   📊 Files moved to backup: $MOVED_COUNT"
echo "   📦 Backup location: $BACKUP_DIR"
echo ""
echo "📋 Production-ready files remaining:"
echo "   ✓ README.md (main documentation)"
echo "   ✓ package.json (package configuration)"
echo "   ✓ index.js, extractor.js, cli.js (main code)"
echo "   ✓ index.d.ts (TypeScript definitions)"
echo "   ✓ rules/ (extraction rules)"
echo "   ✓ pdf/ (sample PDFs)"
echo "   ✓ tests/ (test suite)"
echo "   ✓ test_react/ (React demo app)"
echo ""
echo "💡 To permanently delete backup:"
echo "   rm -rf $BACKUP_DIR"
echo ""
echo "✨ Your package is now production-ready!"
