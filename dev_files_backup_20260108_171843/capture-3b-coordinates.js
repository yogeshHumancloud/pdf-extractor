#!/usr/bin/env node

/**
 * Automatic Coordinate Capture Script for GSTR-3B
 *
 * Reads a PDF, applies regex rules, captures coordinates, and updates rules.json
 */

const fs = require('fs');
const path = require('path');

// Import unpdf (dynamic import for ESM)
async function main() {
  const unpdf = await import('unpdf');

  const pdfPath = '/Users/yogeshvitekar/Desktop/rules_cli/pdf/3B.pdf';
  const rulesPath = '/Users/yogeshvitekar/Desktop/rules_cli/rules/gstr3b-rules.json';

  console.log('📍 Starting automatic coordinate capture for GSTR-3B...\n');

  // Read PDF
  console.log('📄 Reading PDF:', pdfPath);
  const pdfBuffer = fs.readFileSync(pdfPath);
  const uint8Array = new Uint8Array(pdfBuffer);

  // Read rules
  console.log('⚙️  Reading rules:', rulesPath);
  const rulesText = fs.readFileSync(rulesPath, 'utf8');
  const rules = JSON.parse(rulesText);

  console.log(`📋 Total rules to process: ${Object.keys(rules.rules).length}\n`);

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

  console.log(`✅ Extracted ${allTextItems.length} text items from PDF\n`);

  // Concatenate all text
  const fullText = allTextItems.map(item => item.text).join(' ');

  // Process each rule
  let capturedCount = 0;
  let failedCount = 0;
  let alreadyHasCoords = 0;

  console.log('🔍 Processing rules...\n');
  console.log('─'.repeat(80));

  for (const [fieldName, rule] of Object.entries(rules.rules)) {
    try {
      // Skip if already has coordinates
      if (rule.coordinates) {
        alreadyHasCoords++;
        continue;
      }

      // Apply regex - note the pattern might have escaped backslashes
      let pattern = rule.pattern;
      // Handle double-escaped patterns (from JSON)
      pattern = pattern.replace(/\\\\/g, '\\');

      const regex = new RegExp(pattern, 'gims');
      const match = regex.exec(fullText);

      if (!match) {
        console.log(`❌ ${fieldName}`);
        console.log(`   Pattern: ${pattern.substring(0, 60)}...`);
        console.log(`   Status: No regex match found\n`);
        failedCount++;
        continue;
      }

      const matchedText = match[0];
      const displayText = matchedText.length > 80
        ? matchedText.substring(0, 80) + '...'
        : matchedText;

      console.log(`🔍 ${fieldName}`);
      console.log(`   Match: "${displayText}"`);

      // Find text item containing this match
      // Strategy: Look for significant words from the match
      const significantWords = matchedText
        .split(/\s+/)
        .filter(word => word.length > 2 && /[a-zA-Z0-9]/.test(word))
        .slice(0, 5); // Take first 5 significant words

      let matchingItem = null;

      // Try to find text item with significant word
      for (const word of significantWords) {
        matchingItem = allTextItems.find(item =>
          item.text.toLowerCase().includes(word.toLowerCase())
        );
        if (matchingItem) {
          console.log(`   Found via word: "${word}"`);
          break;
        }
      }

      if (!matchingItem) {
        // Fallback: find item containing start of matched text
        const searchTerm = matchedText.substring(0, 20).trim();
        matchingItem = allTextItems.find(item =>
          item.text.includes(searchTerm)
        );
        if (matchingItem) {
          console.log(`   Found via text: "${searchTerm}"`);
        }
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

        console.log(`   ✅ Coordinates: Page ${matchingItem.pageNum}, (${matchingItem.x.toFixed(2)}, ${matchingItem.y.toFixed(2)}, ${matchingItem.width.toFixed(2)}x${matchingItem.height.toFixed(2)})\n`);
        capturedCount++;
      } else {
        console.log(`   ⚠️  Could not locate text item in PDF\n`);
        failedCount++;
      }

    } catch (error) {
      console.error(`❌ ${fieldName}: Error - ${error.message}\n`);
      failedCount++;
    }
  }

  console.log('─'.repeat(80));

  // Save updated rules
  console.log('\n📝 Saving updated rules...');
  const updatedRulesJson = JSON.stringify(rules, null, 2);
  fs.writeFileSync(rulesPath, updatedRulesJson, 'utf8');

  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('✨ COORDINATE CAPTURE COMPLETE!');
  console.log('='.repeat(80));
  console.log(`📊 Total rules: ${Object.keys(rules.rules).length}`);
  console.log(`✅ Successfully captured: ${capturedCount} fields`);
  console.log(`⏭️  Already had coordinates: ${alreadyHasCoords} fields`);
  console.log(`❌ Failed: ${failedCount} fields`);
  console.log(`📈 Success rate: ${((capturedCount / (capturedCount + failedCount)) * 100).toFixed(1)}%`);
  console.log(`\n💾 Updated rules saved to: ${rulesPath}`);
  console.log('='.repeat(80));

  if (failedCount > 0) {
    console.log('\n⚠️  Note: Some fields failed to capture coordinates.');
    console.log('   This could be due to:');
    console.log('   - Regex pattern not matching the PDF content');
    console.log('   - Text not present in the PDF');
    console.log('   - Complex text layout in the PDF');
  }
}

main().catch(err => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});
