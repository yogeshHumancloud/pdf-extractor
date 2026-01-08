#!/usr/bin/env node

/**
 * Add coordinates to GSTR-3B rules using unpdf text extraction
 * Matches visible text fields in the PDF with rule patterns
 */

const fs = require('fs');

async function main() {
  const unpdf = await import('unpdf');

  const pdfPath = '/Users/yogeshvitekar/Desktop/rules_cli/pdf/3B.pdf';
  const rulesPath = '/Users/yogeshvitekar/Desktop/rules_cli/rules/gstr3b-rules.json';

  console.log('📍 Adding coordinates from unpdf extraction to GSTR-3B rules...\n');

  // Read PDF
  const pdfBuffer = fs.readFileSync(pdfPath);
  const uint8Array = new Uint8Array(pdfBuffer);

  // Read rules
  const rulesText = fs.readFileSync(rulesPath, 'utf8');
  const rules = JSON.parse(rulesText);

  // Load PDF document
  const pdf = await unpdf.getDocumentProxy(uint8Array);
  console.log(`📄 PDF has ${pdf.numPages} page(s)\n`);

  // Extract all text items with coordinates
  const allTextItems = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();

    textContent.items.forEach(item => {
      const x = item.transform[4];
      const y = item.transform[5];
      const width = item.width || 0;
      const height = item.height || 12;

      allTextItems.push({
        text: item.str,
        pageNum: i,
        x: Math.round(x * 100) / 100,
        y: Math.round(y * 100) / 100,
        width: Math.round(width * 100) / 100,
        height: Math.round(height * 100) / 100
      });
    });
  }

  console.log(`✅ Extracted ${allTextItems.length} text items\n`);

  // Define simple search patterns for key fields
  // These are the visible field labels/values in the PDF
  const fieldSearchPatterns = {
    year: { searchText: 'Year', offsetX: 60, offsetY: 0 },
    period: { searchText: 'Period', offsetX: 60, offsetY: 0 },
    gstin: { searchText: 'GSTIN', offsetX: 50, offsetY: 0 },
    legal_name: { searchText: 'Legal', offsetX: 150, offsetY: 0 },
    arn: { searchText: 'ARN', offsetX: 40, offsetY: 0 },
    date_of_arn: { searchText: 'Date of ARN', offsetX: 80, offsetY: 0 }
  };

  let addedCount = 0;
  console.log('🔍 Searching for fields in PDF...\n');

  for (const [fieldName, searchConfig] of Object.entries(fieldSearchPatterns)) {
    if (!rules.rules[fieldName]) {
      console.log(`⚠️  Field "${fieldName}" not found in rules, skipping`);
      continue;
    }

    // Find text item matching the search text
    const matchingItem = allTextItems.find(item =>
      item.text.toLowerCase().includes(searchConfig.searchText.toLowerCase())
    );

    if (matchingItem) {
      // Add coordinates with offset for value field
      const coords = {
        page: matchingItem.pageNum,
        x: matchingItem.x + searchConfig.offsetX,
        y: matchingItem.y + searchConfig.offsetY,
        width: 80,  // Standard width for value
        height: matchingItem.height
      };

      rules.rules[fieldName].coordinates = coords;

      console.log(`✅ ${fieldName}`);
      console.log(`   Found "${matchingItem.text}" at (${matchingItem.x}, ${matchingItem.y})`);
      console.log(`   Added value coordinates: Page ${coords.page}, (${coords.x}, ${coords.y}), ${coords.width}x${coords.height}\n`);
      addedCount++;
    } else {
      console.log(`❌ ${fieldName}: Could not find "${searchConfig.searchText}" in PDF\n`);
    }
  }

  // Save updated rules
  console.log('📝 Saving updated rules...');
  const updatedRulesJson = JSON.stringify(rules, null, 2);
  fs.writeFileSync(rulesPath, updatedRulesJson, 'utf8');

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('✨ COORDINATE ADDITION COMPLETE!');
  console.log('='.repeat(60));
  console.log(`✅ Successfully added: ${addedCount} fields`);
  console.log(`💾 Saved to: ${rulesPath}`);
  console.log('='.repeat(60));
}

main().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
