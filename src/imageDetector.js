/**
 * Image Detector Module
 * Detects images in PDF pages using PDF.js operator list
 */

/**
 * Detect if a PDF page contains images
 * @param {Object} page - PDF.js page object
 * @returns {Promise<Object>} Detection result with image count and whether OCR is needed
 */
export async function detectImages(page) {
  try {
    // Get the operator list which contains all drawing operations
    const operatorList = await page.getOperatorList();

    let imageCount = 0;
    const imageOps = new Set(['paintImageXObject', 'paintInlineImageXObject', 'paintImageMaskXObject']);

    // Count image operations in the operator list
    for (let i = 0; i < operatorList.fnArray.length; i++) {
      const op = operatorList.fnArray[i];
      // PDF.js uses numeric operation codes, check common image operations
      // paintImageXObject (OPS.paintImageXObject = 85)
      // paintInlineImageXObject (OPS.paintInlineImageXObject = 86)
      // paintImageMaskXObject (OPS.paintImageMaskXObject = 87)
      if (op === 85 || op === 86 || op === 87) {
        imageCount++;
      }
    }

    return {
      hasImages: imageCount > 0,
      imageCount: imageCount,
      needsOCR: imageCount > 0
    };
  } catch (error) {
    console.warn('Error detecting images:', error);
    return {
      hasImages: false,
      imageCount: 0,
      needsOCR: false
    };
  }
}

/**
 * Check if text extraction quality is poor (suggesting scanned document)
 * @param {string} text - Extracted text from page
 * @returns {boolean} True if text quality is poor
 */
export function isPoorTextQuality(text) {
  if (!text || text.trim().length === 0) {
    return true; // No text found, might be image-only
  }

  // Check for very short text (less than 20 chars on a page is suspicious)
  if (text.trim().length < 20) {
    return true;
  }

  // Check for high ratio of garbled characters
  const garbledChars = text.match(/[^\w\s\.,;:!?\-'"()\[\]{}]/g) || [];
  const garbledRatio = garbledChars.length / text.length;

  if (garbledRatio > 0.3) {
    return true; // More than 30% garbled characters
  }

  return false;
}
