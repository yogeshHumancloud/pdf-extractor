import * as unpdfModule from 'unpdf';
import { getTextItemBoundingBox } from './coordinateUtils';

/**
 * Automatically capture coordinates for rules by matching regex patterns
 * with text items that have position data
 *
 * @param {File} pdfFile - PDF file to extract from
 * @param {Object} rules - Rules object with regex patterns
 * @returns {Object} Updated rules with coordinates added to each field
 */
export async function autoCaptureCoordinates(pdfFile, rules) {
  console.log('🔍 Starting automatic coordinate capture...');

  // Extract all text items with positions
  const arrayBuffer = await pdfFile.arrayBuffer();
  const uint8Array = new Uint8Array(arrayBuffer);
  const pdf = await unpdfModule.getDocumentProxy(uint8Array);

  const allTextItems = [];

  // Get text items from all pages
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();

    textContent.items.forEach(item => {
      const bbox = getTextItemBoundingBox(item);
      allTextItems.push({
        text: item.str,
        pageNum: i,
        x: bbox.x,
        y: bbox.y,
        width: bbox.width,
        height: bbox.height,
        transform: item.transform
      });
    });
  }

  console.log(`📄 Extracted ${allTextItems.length} text items from ${pdf.numPages} pages`);

  // Concatenate all text for full-text matching
  const fullText = allTextItems.map(item => item.text).join(' ');

  const updatedRules = JSON.parse(JSON.stringify(rules));
  let capturedCount = 0;
  let failedCount = 0;

  // For each rule, try to find matching text and capture coordinates
  for (const [fieldName, rule] of Object.entries(rules.rules)) {
    try {
      // Skip if already has coordinates
      if (rule.coordinates) {
        console.log(`⏭️  Skipping ${fieldName} - already has coordinates`);
        continue;
      }

      // Apply regex to full text
      const regex = new RegExp(rule.pattern, 'gims');
      const match = regex.exec(fullText);

      if (match) {
        const matchedText = match[0];
        console.log(`✅ Found match for "${fieldName}": "${matchedText}"`);

        // Find the text item(s) that contain this match
        // Strategy: Find the first significant word in the match and locate it
        const significantWords = matchedText
          .split(/\s+/)
          .filter(word => word.length > 2 && /[a-zA-Z0-9]/.test(word))
          .slice(0, 3); // First 3 significant words

        let matchingItem = null;

        // Try to find text item containing the first significant word
        for (const word of significantWords) {
          matchingItem = allTextItems.find(item =>
            item.text.toLowerCase().includes(word.toLowerCase())
          );
          if (matchingItem) break;
        }

        if (!matchingItem) {
          // Fallback: find any item containing part of the matched text
          const searchTerm = matchedText.substring(0, 20);
          matchingItem = allTextItems.find(item =>
            item.text.includes(searchTerm)
          );
        }

        if (matchingItem) {
          // Capture coordinates from matching text item
          updatedRules.rules[fieldName].coordinates = {
            page: matchingItem.pageNum,
            x: matchingItem.x,
            y: matchingItem.y,
            width: matchingItem.width,
            height: matchingItem.height
          };

          console.log(`  📍 Coordinates: page=${matchingItem.pageNum}, x=${matchingItem.x.toFixed(2)}, y=${matchingItem.y.toFixed(2)}`);
          capturedCount++;
        } else {
          console.warn(`⚠️  Could not locate text item for "${fieldName}"`);
          failedCount++;
        }
      } else {
        console.warn(`❌ No regex match found for "${fieldName}"`);
        failedCount++;
      }
    } catch (error) {
      console.error(`❌ Error processing "${fieldName}":`, error);
      failedCount++;
    }
  }

  console.log(`\n✨ Coordinate capture complete!`);
  console.log(`   ✅ Successfully captured: ${capturedCount} fields`);
  console.log(`   ❌ Failed: ${failedCount} fields`);
  console.log(`   📊 Success rate: ${((capturedCount / (capturedCount + failedCount)) * 100).toFixed(1)}%`);

  return updatedRules;
}

/**
 * Advanced: Capture coordinates for a specific bounding region
 * Useful when you know the approximate area but want precise coordinates
 *
 * @param {File} pdfFile - PDF file
 * @param {Object} rules - Rules object
 * @param {Object} region - Region to search {page, x, y, width, height}
 * @returns {Array} Text items found in that region
 */
export async function findTextInRegion(pdfFile, region) {
  const arrayBuffer = await pdfFile.arrayBuffer();
  const uint8Array = new Uint8Array(arrayBuffer);
  const pdf = await unpdfModule.getDocumentProxy(uint8Array);

  const page = await pdf.getPage(region.page);
  const textContent = await page.getTextContent();

  const itemsInRegion = [];

  textContent.items.forEach(item => {
    const bbox = getTextItemBoundingBox(item);

    // Check if item is within region
    const isInRegion = (
      bbox.x >= region.x &&
      bbox.x + bbox.width <= region.x + region.width &&
      bbox.y >= region.y &&
      bbox.y + bbox.height <= region.y + region.height
    );

    if (isInRegion) {
      itemsInRegion.push({
        text: item.str,
        x: bbox.x,
        y: bbox.y,
        width: bbox.width,
        height: bbox.height
      });
    }
  });

  return itemsInRegion;
}

/**
 * Export updated rules to JSON file
 *
 * @param {Object} rules - Updated rules object
 * @param {string} filename - Filename to save as
 */
export function downloadRulesJSON(rules, filename = 'rules-with-coordinates.json') {
  const blob = new Blob([JSON.stringify(rules, null, 2)], {
    type: 'application/json'
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
