#!/bin/bash

# Update Package with Recaptured Coordinates
# This script updates the package rules file with recaptured coordinates and rebuilds the package

set -e  # Exit on error

echo "🔄 Package Update Script"
echo "======================="
echo ""

# Configuration
PACKAGE_DIR="/Users/yogeshvitekar/Desktop/rules_cli/package"
REACT_DIR="/Users/yogeshvitekar/Desktop/rules_cli/test_react"
RULES_FILE="gstr2b-rules.json"
UPDATED_RULES="gstr2b-rules-updated.json"
BACKUP_RULES="gstr2b-rules-backup-$(date +%Y%m%d-%H%M%S).json"

# Step 1: Navigate to package directory
echo "📂 Step 1: Navigating to package directory..."
cd "$PACKAGE_DIR"
pwd
echo ""

# Step 2: Backup original rules file
echo "💾 Step 2: Backing up original rules file..."
if [ -f "rules/$RULES_FILE" ]; then
    cp "rules/$RULES_FILE" "rules/$BACKUP_RULES"
    echo "✅ Backup created: rules/$BACKUP_RULES"
else
    echo "⚠️  Original rules file not found: rules/$RULES_FILE"
fi
echo ""

# Step 3: Replace old rules with updated rules
echo "🔄 Step 3: Replacing old rules with updated coordinates..."
if [ -f "rules/$UPDATED_RULES" ]; then
    cp "rules/$UPDATED_RULES" "rules/$RULES_FILE"
    echo "✅ Rules file updated with recaptured coordinates"
else
    echo "❌ ERROR: Updated rules file not found: rules/$UPDATED_RULES"
    echo "   Please run the recapture script first:"
    echo "   node scripts/recapture-coordinates.js pdf/2B.pdf rules/$RULES_FILE"
    exit 1
fi
echo ""

# Step 4: Show what changed
echo "📊 Step 4: Showing coordinate changes..."
echo "Example field: itc_reversal_rule37a_integrated_tax"
echo ""
echo "OLD coordinates (from backup):"
grep -A 7 "itc_reversal_rule37a_integrated_tax" "rules/$BACKUP_RULES" | grep -A 5 "coordinates" | head -6
echo ""
echo "NEW coordinates (recaptured):"
grep -A 7 "itc_reversal_rule37a_integrated_tax" "rules/$RULES_FILE" | grep -A 5 "coordinates" | head -6
echo ""

# Step 5: Rebuild package
echo "🔨 Step 5: Rebuilding package..."
npm pack
PACKAGE_FILE=$(ls -t *.tgz | head -1)
echo "✅ Package built: $PACKAGE_FILE"
echo ""

# Step 6: Install in React app
echo "📦 Step 6: Installing updated package in React app..."
cd "$REACT_DIR"
pwd
echo ""

echo "Installing $PACKAGE_DIR/$PACKAGE_FILE..."
npm install "$PACKAGE_DIR/$PACKAGE_FILE"
echo "✅ Package installed in React app"
echo ""

# Step 7: Summary
echo "✨ Update Complete!"
echo "=================="
echo ""
echo "✅ What was done:"
echo "  1. Backed up original rules: $BACKUP_RULES"
echo "  2. Updated rules file with recaptured coordinates"
echo "  3. Rebuilt package: $PACKAGE_FILE"
echo "  4. Installed in React app: $REACT_DIR"
echo ""
echo "🎯 Next Steps:"
echo "  1. Start React app: cd $REACT_DIR && npm start"
echo "  2. Upload your PDF and rules file"
echo "  3. Test Page 5 selections - should now return fields!"
echo ""
echo "📝 Note: Original rules backed up to:"
echo "   $PACKAGE_DIR/rules/$BACKUP_RULES"
echo ""
