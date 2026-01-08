#!/usr/bin/env node

/**
 * Manually add coordinates for key GSTR-3B fields
 * Based on visual inspection of the PDF
 */

const fs = require('fs');

const rulesPath = '/Users/yogeshvitekar/Desktop/rules_cli/rules/gstr3b-rules.json';

console.log('📝 Adding manual coordinates to GSTR-3B rules...\n');

// Read rules
const rulesText = fs.readFileSync(rulesPath, 'utf8');
const rules = JSON.parse(rulesText);

// Manually add coordinates for key fields based on PDF analysis
const manualCoordinates = {
  period: {
    page: 1,
    x: 384.50,
    y: 710.84,
    width: 26.19,
    height: 9
  },
  gstin: {
    page: 1,
    x: 24.50,
    y: 676.22,
    width: 100,  // Wider to capture full GSTIN
    height: 12
  },
  legal_name: {
    page: 1,
    x: 24.50,
    y: 650,  // Approximate, below GSTIN
    width: 200,
    height: 12
  },
  arn: {
    page: 1,
    x: 24.50,
    y: 630,  // Approximate
    width: 100,
    height: 12
  },
  date_of_arn: {
    page: 1,
    x: 24.50,
    y: 610,  // Approximate
    width: 80,
    height: 12
  }
};

let addedCount = 0;

for (const [fieldName, coords] of Object.entries(manualCoordinates)) {
  if (rules.rules[fieldName]) {
    rules.rules[fieldName].coordinates = coords;
    console.log(`✅ Added coordinates for: ${fieldName}`);
    console.log(`   Page: ${coords.page}, Position: (${coords.x}, ${coords.y}), Size: ${coords.width}x${coords.height}`);
    addedCount++;
  } else {
    console.log(`⚠️  Field "${fieldName}" not found in rules`);
  }
}

// Save updated rules
const updatedRulesJson = JSON.stringify(rules, null, 2);
fs.writeFileSync(rulesPath, updatedRulesJson, 'utf8');

console.log('\n' + '='.repeat(60));
console.log(`✅ Successfully added coordinates for ${addedCount} fields`);
console.log(`💾 Saved to: ${rulesPath}`);
console.log('='.repeat(60));
