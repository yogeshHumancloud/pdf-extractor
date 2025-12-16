/**
 * Text Extractor for PDF.js
 * Extracts and formats text content from PDF pages
 */

/**
 * Extract text content from a PDF page
 * @param {PDFPageProxy} page - PDF.js page object
 * @returns {Promise<Object>} Extracted text and elements with positioning data
 */
export async function extractText(page) {
  try {
    const textContent = await page.getTextContent();

    let text = '';
    const elements = [];

    // Sort items by vertical position (y-coordinate) then horizontal (x)
    const sortedItems = textContent.items.sort((a, b) => {
      const yDiff = Math.abs(a.transform[5] - b.transform[5]);
      // Different lines (5px threshold)
      if (yDiff > 5) {
        return b.transform[5] - a.transform[5]; // Top to bottom
      }
      return a.transform[4] - b.transform[4]; // Left to right
    });

    let currentLine = [];
    let lastY = null;
    let lastItem = null;

    sortedItems.forEach((item, index) => {
      const x = item.transform[4];
      const y = item.transform[5];
      const width = item.width;
      const height = item.height;
      const itemText = item.str;

      // Skip empty strings
      if (!itemText || itemText.trim() === '') {
        return;
      }

      // Store element information with detailed positioning
      elements.push({
        text: itemText,
        x: x,
        y: y,
        width: width,
        height: height,
        fontName: item.fontName || '',
        fontSize: item.transform[0] || 0, // Font size from transform matrix
        hasEOL: item.hasEOL || false
      });

      // Check if we're on a new line
      if (lastY !== null && Math.abs(y - lastY) > 5) {
        // Add current line with proper spacing
        text += currentLine.join('') + '\n';
        currentLine = [itemText];
      } else {
        // Same line - check if we need space between items
        if (currentLine.length > 0 && lastItem) {
          const gap = x - (lastItem.transform[4] + lastItem.width);

          // Add space if gap is significant (more than 2px)
          if (gap > 2) {
            // Calculate approximate number of spaces based on gap and font size
            const spaceWidth = lastItem.transform[0] * 0.25; // Approximate space width
            const numSpaces = Math.max(1, Math.round(gap / spaceWidth));

            // Limit to reasonable number of spaces
            const spaces = ' '.repeat(Math.min(numSpaces, 10));
            currentLine.push(spaces + itemText);
          } else {
            // No gap - concatenate directly
            currentLine.push(itemText);
          }
        } else {
          currentLine.push(itemText);
        }
      }

      lastY = y;
      lastItem = item;
    });

    // Add last line
    if (currentLine.length > 0) {
      text += currentLine.join('');
    }

    return {
      text: text.trim(),
      elements: elements,
      itemsCount: sortedItems.length
    };

  } catch (error) {
    console.error('Error extracting text:', error);
    throw new Error(`Text extraction failed: ${error.message}`);
  }
}

/**
 * Extract text from specific coordinates on a page
 * @param {PDFPageProxy} page - PDF.js page object
 * @param {Object} bounds - Bounding box {x, y, width, height}
 * @returns {Promise<string>} Extracted text from the specified region
 */
export async function extractTextFromRegion(page, bounds) {
  try {
    const textContent = await page.getTextContent();

    let text = '';

    textContent.items.forEach(item => {
      const x = item.transform[4];
      const y = item.transform[5];

      // Check if item is within bounds
      if (
        x >= bounds.x &&
        x <= bounds.x + bounds.width &&
        y >= bounds.y &&
        y <= bounds.y + bounds.height
      ) {
        text += item.str + ' ';
      }
    });

    return text.trim();

  } catch (error) {
    console.error('Error extracting text from region:', error);
    throw new Error(`Region text extraction failed: ${error.message}`);
  }
}

/**
 * Get text statistics from a page
 * @param {PDFPageProxy} page - PDF.js page object
 * @returns {Promise<Object>} Text statistics
 */
export async function getTextStats(page) {
  try {
    const textContent = await page.getTextContent();

    const fonts = new Set();
    let totalChars = 0;
    let wordCount = 0;

    textContent.items.forEach(item => {
      if (item.fontName) {
        fonts.add(item.fontName);
      }
      totalChars += item.str.length;
      wordCount += item.str.trim().split(/\s+/).filter(w => w.length > 0).length;
    });

    return {
      totalItems: textContent.items.length,
      totalCharacters: totalChars,
      wordCount: wordCount,
      uniqueFonts: Array.from(fonts),
      fontCount: fonts.size
    };

  } catch (error) {
    console.error('Error getting text stats:', error);
    throw new Error(`Text stats extraction failed: ${error.message}`);
  }
}
