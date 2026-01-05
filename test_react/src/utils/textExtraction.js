import * as unpdfModule from 'unpdf';
import {
  getTextItemBoundingBox,
  hasSignificantOverlap
} from './coordinateUtils';

/**
 * Extract text with position data from a PDF file
 * Returns text items for all pages with their coordinates
 *
 * @param {File} pdfFile - PDF file object
 * @returns {Promise<Array>} Array of page data with text items and viewports
 */
export async function extractTextWithPositions(pdfFile) {
  try {
    // Read PDF file
    const arrayBuffer = await pdfFile.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    // Load PDF document
    const pdf = await unpdfModule.getDocumentProxy(uint8Array);
    const pagesData = [];

    // Extract text items from each page
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const viewport = page.getViewport({ scale: 1.5 });

      pagesData.push({
        pageNum: i,
        textItems: textContent.items || [],
        viewport: {
          width: viewport.width,
          height: viewport.height,
          scale: viewport.scale
        }
      });
    }

    return pagesData;
  } catch (error) {
    console.error('Error extracting text with positions:', error);
    throw new Error(`Failed to extract text with positions: ${error.message}`);
  }
}

/**
 * Filter text items by selection bounding boxes
 * Returns concatenated text from items that intersect with selections
 *
 * @param {Array} pagesData - Array of page data from extractTextWithPositions
 * @param {Array} selections - Array of selection objects with pageNum and boundingBox
 * @returns {string} Filtered text concatenated from matching items
 */
export function filterTextBySelections(pagesData, selections) {
  if (!selections || selections.length === 0) {
    return '';
  }

  const processedItems = new Set(); // Track processed items to avoid duplicates
  const textSegments = [];

  // Group selections by page for efficiency
  const selectionsByPage = {};
  selections.forEach(selection => {
    if (!selectionsByPage[selection.pageNum]) {
      selectionsByPage[selection.pageNum] = [];
    }
    selectionsByPage[selection.pageNum].push(selection);
  });

  // Process each page that has selections
  Object.entries(selectionsByPage).forEach(([pageNum, pageSelections]) => {
    const pageData = pagesData.find(p => p.pageNum === parseInt(pageNum));
    if (!pageData) return;

    // Create comprehensive debug data for copy-paste
    const debugData = {
      pageNum: parseInt(pageNum),
      totalTextItems: pageData.textItems.length,
      viewport: pageData.viewport,
      selections: pageSelections.map(s => ({
        pdfCoords: s.boundingBox,
        canvasCoords: s.canvasBox
      })),
      firstFiveTextItems: pageData.textItems.slice(0, 5).map((item, idx) => ({
        index: idx,
        text: item.str,
        transform: item.transform,
        boundingBox: getTextItemBoundingBox(item)
      }))
    };

    console.log('═══════════════════════════════════════════════════════════');
    console.log('🔍 DEBUG DATA FOR PAGE ' + pageNum + ' (Copy this entire block):');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(JSON.stringify(debugData, null, 2));
    console.log('═══════════════════════════════════════════════════════════');

    let matchCount = 0;

    // For each text item on this page
    pageData.textItems.forEach((textItem, itemIndex) => {
      // Create unique key for this item
      const itemKey = `${pageNum}-${itemIndex}`;
      if (processedItems.has(itemKey)) return;

      // Get text item bounding box
      const textBox = getTextItemBoundingBox(textItem);
      if (textBox.width === 0 || textBox.height === 0) return;

      // Check if text item intersects with any selection on this page
      const intersectsAnySelection = pageSelections.some(selection => {
        const overlaps = hasSignificantOverlap(textBox, selection.boundingBox);
        if (overlaps) {
          matchCount++;
        }
        return overlaps;
      });

      if (intersectsAnySelection) {
        // Add text from this item
        if (textItem.str && textItem.str.trim()) {
          textSegments.push({
            text: textItem.str,
            pageNum: parseInt(pageNum),
            y: textBox.y,
            x: textBox.x
          });
          processedItems.add(itemKey);
        }
      }
    });

    console.log(`✅ Found ${matchCount} matching text items on page ${pageNum}\n`);
  });

  // Sort text segments by page, then by Y position (top to bottom), then by X (left to right)
  textSegments.sort((a, b) => {
    if (a.pageNum !== b.pageNum) {
      return a.pageNum - b.pageNum;
    }
    // In PDF coordinates, higher Y values are higher on page
    // We want to read top to bottom, so sort by descending Y
    if (Math.abs(a.y - b.y) > 5) { // Group items on same line (within 5 units)
      return b.y - a.y;
    }
    // Same line, sort left to right
    return a.x - b.x;
  });

  // Concatenate text with proper spacing
  let result = '';
  let lastPageNum = null;
  let lastY = null;

  textSegments.forEach(segment => {
    // Add page break
    if (lastPageNum !== null && segment.pageNum !== lastPageNum) {
      result += '\n\n=== Page ' + segment.pageNum + ' ===\n\n';
    }

    // Add line break if Y position changed significantly
    if (lastY !== null && Math.abs(segment.y - lastY) > 5) {
      result += '\n';
    } else if (result.length > 0 && !result.endsWith(' ')) {
      // Add space between items on same line
      result += ' ';
    }

    result += segment.text;
    lastPageNum = segment.pageNum;
    lastY = segment.y;
  });

  return result.trim();
}

/**
 * Check if there are any text items within selections
 *
 * @param {Array} pagesData - Array of page data
 * @param {Array} selections - Array of selections
 * @returns {boolean} True if selections contain text
 */
export function hasTextInSelections(pagesData, selections) {
  const filteredText = filterTextBySelections(pagesData, selections);
  return filteredText.trim().length > 0;
}

/**
 * Get statistics about text extraction from selections
 *
 * @param {Array} pagesData - Array of page data
 * @param {Array} selections - Array of selections
 * @returns {Object} Statistics object
 */
export function getSelectionTextStats(pagesData, selections) {
  const filteredText = filterTextBySelections(pagesData, selections);
  const wordCount = filteredText.split(/\s+/).filter(w => w.length > 0).length;
  const charCount = filteredText.length;
  const lineCount = filteredText.split('\n').length;

  const affectedPages = new Set(selections.map(s => s.pageNum)).size;

  return {
    wordCount,
    charCount,
    lineCount,
    affectedPages,
    selectionCount: selections.length,
    hasText: charCount > 0
  };
}

/**
 * Extract text from a single selection
 * Useful for debugging or preview
 *
 * @param {Array} pagesData - Array of page data
 * @param {Object} selection - Single selection object
 * @returns {string} Extracted text
 */
export function extractTextFromSelection(pagesData, selection) {
  return filterTextBySelections(pagesData, [selection]);
}
