#!/usr/bin/env node

/**
 * Automatic Coordinate Capture Script
 *
 * Reads a PDF, applies regex rules, captures coordinates, and updates rules.json
 */

const fs = require('fs');
const path = require('path');

// Import unpdf (dynamic import for ESM)
async function main() {
  const unpdf = await import('unpdf');

  const pdfPath = '/Users/yogeshvitekar/Desktop/rules_cli/pdf/2B.pdf';
  const rulesPath = '/Users/yogeshvitekar/Desktop/rules_cli/rules/gstr2b-rules.json';

  console.log('📍 Starting automatic coordinate capture...\n');

  // Read PDF
  console.log('📄 Reading PDF:', pdfPath);
  const pdfBuffer = fs.readFileSync(pdfPath);
  const uint8Array = new Uint8Array(pdfBuffer);

  // Read rules
  console.log('⚙️  Reading rules:', rulesPath);
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
      // Extract coordinates from transform matrix [a, b, c, d, x, y]
      const x = item.transform[4];
      const y = item.transform[5];
      const width = item.width || 0;
      const height = item.height || 12; // Default height

      allTextItems.push({
        text: item.str,
        pageNum: i,
        x: x,
        y: y,
        width: width,
        height: height
      });
    });
  }

  console.log(`✅ Extracted ${allTextItems.length} text items\n`);

  // Concatenate all text
  const fullText = allTextItems.map(item => item.text).join(' ');

  // Process each rule
  let capturedCount = 0;
  let failedCount = 0;

  console.log('🔍 Processing rules...\n');

  for (const [fieldName, rule] of Object.entries(rules.rules)) {
    try {
      // Skip if already has coordinates
      if (rule.coordinates) {
        console.log(`⏭️  ${fieldName}: Already has coordinates`);
        continue;
      }

      // Apply regex
      const regex = new RegExp(rule.pattern, 'gims');
      const match = regex.exec(fullText);

      if (!match) {
        console.log(`❌ ${fieldName}: No regex match found`);
        failedCount++;
        continue;
      }

      const matchedText = match[0];
      console.log(`✅ ${fieldName}: Found match "${matchedText.substring(0, 50)}..."`);

      // Find text item containing this match
      // Strategy: Look for significant words from the match
      const significantWords = matchedText
        .split(/\s+/)
        .filter(word => word.length > 2 && /[a-zA-Z0-9]/.test(word))
        .slice(0, 3);

      let matchingItem = null;

      // Try to find text item with significant word
      for (const word of significantWords) {
        matchingItem = allTextItems.find(item =>
          item.text.toLowerCase().includes(word.toLowerCase())
        );
        if (matchingItem) break;
      }

      if (!matchingItem) {
        // Fallback: find item containing start of matched text
        const searchTerm = matchedText.substring(0, 15);
        matchingItem = allTextItems.find(item =>
          item.text.includes(searchTerm)
        );
      }

      if (matchingItem) {
        // Add coordinates to rule
        rules.rules[fieldName].coordinates = {
          page: matchingItem.pageNum,
          x: Math.round(matchingItem.x * 100) / 100,
          y: Math.round(matchingItem.y * 100) / 100,
          width: Math.round(matchingItem.width * 100) / 100,
          height: Math.round(matchingItem.height * 100) / 100
        };

        console.log(`   📍 Coordinates: page=${matchingItem.pageNum}, x=${matchingItem.x.toFixed(2)}, y=${matchingItem.y.toFixed(2)}`);
        capturedCount++;
      } else {
        console.log(`   ⚠️  Could not locate text item`);
        failedCount++;
      }

    } catch (error) {
      console.error(`❌ ${fieldName}: Error -`, error.message);
      failedCount++;
    }
  }

  // Save updated rules
  console.log('\n📝 Saving updated rules...');
  const updatedRulesJson = JSON.stringify(rules, null, 2);
  fs.writeFileSync(rulesPath, updatedRulesJson, 'utf8');

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('✨ COORDINATE CAPTURE COMPLETE!');
  console.log('='.repeat(60));
  console.log(`✅ Successfully captured: ${capturedCount} fields`);
  console.log(`❌ Failed: ${failedCount} fields`);
  console.log(`📊 Success rate: ${((capturedCount / (capturedCount + failedCount)) * 100).toFixed(1)}%`);
  console.log(`\n💾 Updated rules saved to: ${rulesPath}`);
  console.log('='.repeat(60));
}

main().catch(err => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});
