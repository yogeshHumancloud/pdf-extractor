#!/usr/bin/env node

/**
 * Coordinate Recapture Script
 *
 * This script recaptures coordinates for all fields in a rules file using unpdf.
 * It ensures coordinates match the EXACT coordinate system used by the package.
 *
 * Usage:
 *   node recapture-coordinates.js <pdf-file> <rules-file> [output-file]
 *
 * Example:
 *   node recapture-coordinates.js ../pdf/2B.pdf ../rules/gstr2b-rules.json
 */

const fs = require('fs');
const path = require('path');

// Dynamic import for ESM module
let unpdf;
async function loadUnpdf() {
  if (!unpdf) {
    unpdf = await import('unpdf');
  }
  return unpdf;
}

/**
 * Extract text with coordinates from all pages
 */
async function extractTextWithCoordinates(pdfBuffer) {
  const { getDocumentProxy } = await loadUnpdf();
  const pdf = await getDocumentProxy(new Uint8Array(pdfBuffer));
  const numPages = pdf.numPages;

  console.log(`📄 PDF has ${numPages} pages\n`);

  const allPages = [];

  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale: 1.0 }); // Use scale 1.0 for native coordinates
    const textContent = await page.getTextContent();

    const pageData = {
      pageNum,
      viewport: {
        width: viewport.width,
        height: viewport.height
      },
      items: textContent.items.map(item => ({
        text: item.str,
        x: item.transform[4],
        y: item.transform[5],
        width: item.width,
        height: item.height || 12 // Estimate if not available
      }))
    };

    console.log(`✅ Page ${pageNum}: ${pageData.viewport.width} × ${pageData.viewport.height} pt, ${pageData.items.length} text items`);
    allPages.push(pageData);
  }

  return allPages;
}

/**
 * Rebuild full text for a page
 */
function rebuildPageText(pageData) {
  // Sort items by Y (descending, top to bottom), then X (ascending, left to right)
  const sortedItems = [...pageData.items].sort((a, b) => {
    const yDiff = b.y - a.y; // Higher Y first (top of page)
    if (Math.abs(yDiff) > 5) return yDiff; // Different lines
    return a.x - b.x; // Same line, left to right
  });

  return sortedItems.map(item => item.text).join(' ');
}

/**
 * Find text matching a pattern on a specific page
 */
function findTextOnPage(pageData, pattern, group = 1) {
  const fullText = rebuildPageText(pageData);
  const regex = new RegExp(pattern, 'gims');
  const match = regex.exec(fullText);

  if (!match || !match[group]) {
    return null;
  }

  const matchedText = match[group];

  // Find the text item that contains this matched text
  // Look for items that contain part of the matched text
  const searchText = matchedText.trim().replace(/\s+/g, ' ');

  for (const item of pageData.items) {
    const itemText = item.text.trim().replace(/\s+/g, ' ');

    // Check if this item contains the matched text or vice versa
    if (searchText.includes(itemText) || itemText.includes(searchText)) {
      return {
        text: matchedText,
        coordinates: {
          page: pageData.pageNum,
          x: Math.round(item.x * 100) / 100,
          y: Math.round(item.y * 100) / 100,
          width: Math.round(item.width * 100) / 100,
          height: Math.round(item.height * 100) / 100
        }
      };
    }
  }

  // Fallback: try to find by scanning for the first few characters
  const firstWord = searchText.split(/\s+/)[0];
  if (firstWord.length >= 3) {
    for (const item of pageData.items) {
      if (item.text.includes(firstWord)) {
        return {
          text: matchedText,
          coordinates: {
            page: pageData.pageNum,
            x: Math.round(item.x * 100) / 100,
            y: Math.round(item.y * 100) / 100,
            width: Math.round(item.width * 100) / 100,
            height: Math.round(item.height * 100) / 100
          }
        };
      }
    }
  }

  return null;
}

/**
 * Recapture coordinates for a single field
 */
function recaptureFieldCoordinates(fieldName, rule, allPages, stats) {
  if (rule.type !== 'regex') {
    stats.skipped++;
    return null;
  }

  const pattern = rule.pattern;
  const group = rule.group || 1;

  // Try to find on each page
  for (const pageData of allPages) {
    const result = findTextOnPage(pageData, pattern, group);
    if (result) {
      stats.found++;
      return result.coordinates;
    }
  }

  // Not found
  stats.notFound.push(fieldName);
  return null;
}

/**
 * Main recapture function
 */
async function recaptureCoordinates(pdfPath, rulesPath, outputPath) {
  console.log('🔍 Coordinate Recapture Script\n');
  console.log(`PDF File: ${pdfPath}`);
  console.log(`Rules File: ${rulesPath}`);
  console.log(`Output File: ${outputPath}\n`);

  // Read PDF
  console.log('📖 Reading PDF...');
  const pdfBuffer = fs.readFileSync(pdfPath);

  // Extract text with coordinates from all pages
  console.log('\n🔍 Extracting text with coordinates...');
  const allPages = await extractTextWithCoordinates(pdfBuffer);

  // Read rules
  console.log('\n📖 Reading rules file...');
  const rulesContent = fs.readFileSync(rulesPath, 'utf8');
  const rules = JSON.parse(rulesContent);

  console.log(`📋 Rules file: ${rules.name} v${rules.version}`);
  console.log(`📊 Total fields: ${Object.keys(rules.rules).length}\n`);

  // Recapture coordinates for each field
  console.log('🎯 Recapturing coordinates...\n');
  const stats = {
    found: 0,
    notFound: [],
    skipped: 0
  };

  for (const [fieldName, rule] of Object.entries(rules.rules)) {
    const newCoords = recaptureFieldCoordinates(fieldName, rule, allPages, stats);

    if (newCoords) {
      rule.coordinates = newCoords;
      console.log(`✅ ${fieldName}: Page ${newCoords.page}, (${newCoords.x}, ${newCoords.y})`);
    } else if (rule.type === 'regex') {
      console.log(`❌ ${fieldName}: NOT FOUND`);
    }
  }

  // Write updated rules
  console.log('\n💾 Writing updated rules...');
  const updatedRules = JSON.stringify(rules, null, 2);
  fs.writeFileSync(outputPath, updatedRules, 'utf8');

  console.log(`✅ Updated rules written to: ${outputPath}\n`);

  // Print summary
  console.log('📊 Summary:');
  console.log(`  ✅ Found: ${stats.found}`);
  console.log(`  ❌ Not Found: ${stats.notFound.length}`);
  console.log(`  ⏭️  Skipped: ${stats.skipped}`);

  if (stats.notFound.length > 0) {
    console.log('\n⚠️  Fields not found:');
    stats.notFound.forEach(field => console.log(`  - ${field}`));
  }

  const successRate = ((stats.found / (stats.found + stats.notFound.length)) * 100).toFixed(1);
  console.log(`\n✨ Success Rate: ${successRate}%`);
}

// CLI handling
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.error('❌ Usage: node recapture-coordinates.js <pdf-file> <rules-file> [output-file]');
    console.error('\nExample:');
    console.error('  node recapture-coordinates.js ../pdf/2B.pdf ../rules/gstr2b-rules.json');
    console.error('  node recapture-coordinates.js ../pdf/2B.pdf ../rules/gstr2b-rules.json output.json');
    process.exit(1);
  }

  const pdfPath = path.resolve(args[0]);
  const rulesPath = path.resolve(args[1]);
  const outputPath = args[2] ? path.resolve(args[2]) : rulesPath.replace('.json', '-updated.json');

  // Validate files exist
  if (!fs.existsSync(pdfPath)) {
    console.error(`❌ PDF file not found: ${pdfPath}`);
    process.exit(1);
  }

  if (!fs.existsSync(rulesPath)) {
    console.error(`❌ Rules file not found: ${rulesPath}`);
    process.exit(1);
  }

  // Run
  recaptureCoordinates(pdfPath, rulesPath, outputPath)
    .then(() => {
      console.log('\n✅ Done!');
      process.exit(0);
    })
    .catch(err => {
      console.error('\n❌ Error:', err.message);
      console.error(err.stack);
      process.exit(1);
    });
}

module.exports = { recaptureCoordinates };
