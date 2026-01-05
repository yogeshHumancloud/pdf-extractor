/**
 * Coordinate transformation utilities for PDF selection boxes
 *
 * Handles conversion between:
 * - Canvas coordinates (origin: top-left, scaled by 1.5)
 * - PDF coordinates (origin: bottom-left, native scale)
 */

/**
 * Convert canvas coordinates to PDF coordinates
 *
 * @param {Object} canvasCoords - Canvas coordinates {x, y, width, height}
 * @param {Object} viewport - PDF viewport object
 * @param {number} scale - Scale factor (default: 1.5)
 * @returns {Object} PDF coordinates {x, y, width, height}
 */
export function canvasToPDF(canvasCoords, viewport, scale = 1.5) {
  const { x, y, width, height } = canvasCoords;

  // Canvas is scaled, so divide by scale factor
  // Canvas origin is top-left, PDF origin is bottom-left
  return {
    x: x / scale,
    y: (viewport.height / scale) - (y / scale) - (height / scale),
    width: width / scale,
    height: height / scale
  };
}

/**
 * Convert PDF coordinates to canvas coordinates
 *
 * @param {Object} pdfCoords - PDF coordinates {x, y, width, height}
 * @param {Object} viewport - PDF viewport object
 * @param {number} scale - Scale factor (default: 1.5)
 * @returns {Object} Canvas coordinates {x, y, width, height}
 */
export function pdfToCanvas(pdfCoords, viewport, scale = 1.5) {
  const { x, y, width, height } = pdfCoords;

  // Multiply by scale factor
  // Convert from bottom-left origin to top-left origin
  return {
    x: x * scale,
    y: (viewport.height / scale - y - height) * scale,
    width: width * scale,
    height: height * scale
  };
}

/**
 * Extract bounding box from PDF TextItem
 * TextItem has transform matrix: [a, b, c, d, e, f]
 * where e = x coordinate, f = y coordinate
 *
 * @param {Object} textItem - PDF TextItem from getTextContent()
 * @returns {Object} Bounding box {x, y, width, height}
 */
export function getTextItemBoundingBox(textItem) {
  if (!textItem || !textItem.transform) {
    return { x: 0, y: 0, width: 0, height: 0 };
  }

  const [, , , , x, y] = textItem.transform;
  const width = textItem.width || 0;

  // Estimate height from font size or use default
  // PDF.js provides height in some cases, otherwise estimate
  const height = textItem.height || 12;

  return { x, y, width, height };
}

/**
 * Check if two bounding boxes intersect
 *
 * @param {Object} box1 - First bounding box {x, y, width, height}
 * @param {Object} box2 - Second bounding box {x, y, width, height}
 * @returns {boolean} True if boxes intersect
 */
export function isBoxIntersecting(box1, box2) {
  // No intersection if one box is completely to the side of the other
  return !(
    box1.x + box1.width < box2.x ||
    box2.x + box2.width < box1.x ||
    box1.y + box1.height < box2.y ||
    box2.y + box2.height < box1.y
  );
}

/**
 * Calculate intersection area between two boxes
 *
 * @param {Object} box1 - First bounding box
 * @param {Object} box2 - Second bounding box
 * @returns {number} Intersection area
 */
export function getIntersectionArea(box1, box2) {
  if (!isBoxIntersecting(box1, box2)) {
    return 0;
  }

  const xOverlap = Math.min(box1.x + box1.width, box2.x + box2.width) -
                   Math.max(box1.x, box2.x);
  const yOverlap = Math.min(box1.y + box1.height, box2.y + box2.height) -
                   Math.max(box1.y, box2.y);

  return xOverlap * yOverlap;
}

/**
 * Check if a text item significantly overlaps with a selection box
 * For complex tables, we use a more lenient check
 *
 * @param {Object} textItemBox - Text item bounding box
 * @param {Object} selectionBox - Selection bounding box
 * @returns {boolean} True if significant overlap
 */
export function hasSignificantOverlap(textItemBox, selectionBox) {
  // First check if boxes intersect at all
  if (!isBoxIntersecting(textItemBox, selectionBox)) {
    return false;
  }

  const intersectionArea = getIntersectionArea(textItemBox, selectionBox);
  const textItemArea = textItemBox.width * textItemBox.height;

  if (textItemArea === 0) return false;

  const overlapRatio = intersectionArea / textItemArea;

  // More lenient threshold for complex tables
  // Include if >25% overlaps OR if text item center is inside selection
  if (overlapRatio > 0.25) {
    return true;
  }

  // Check if center point of text item is inside selection
  const centerX = textItemBox.x + textItemBox.width / 2;
  const centerY = textItemBox.y + textItemBox.height / 2;

  return isPointInBox({ x: centerX, y: centerY }, selectionBox);
}

/**
 * Check if a point is inside a bounding box
 *
 * @param {Object} point - Point {x, y}
 * @param {Object} box - Bounding box {x, y, width, height}
 * @returns {boolean} True if point is inside box
 */
export function isPointInBox(point, box) {
  return (
    point.x >= box.x &&
    point.x <= box.x + box.width &&
    point.y >= box.y &&
    point.y <= box.y + box.height
  );
}

/**
 * Normalize a rectangle (ensure positive width and height)
 * Used when user drags selection box in any direction
 *
 * @param {Object} rect - Rectangle {x, y, width, height}
 * @returns {Object} Normalized rectangle
 */
export function normalizeRect(rect) {
  let { x, y, width, height } = rect;

  // If width is negative, adjust x and make width positive
  if (width < 0) {
    x = x + width;
    width = -width;
  }

  // If height is negative, adjust y and make height positive
  if (height < 0) {
    y = y + height;
    height = -height;
  }

  return { x, y, width, height };
}

/**
 * Generate a unique ID for selections
 *
 * @returns {string} Unique ID
 */
export function generateSelectionId() {
  return `sel-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Get the area of a bounding box
 *
 * @param {Object} box - Bounding box {x, y, width, height}
 * @returns {number} Area
 */
export function getBoxArea(box) {
  return box.width * box.height;
}

/**
 * Check if a bounding box is valid (has positive dimensions)
 *
 * @param {Object} box - Bounding box {x, y, width, height}
 * @returns {boolean} True if valid
 */
export function isValidBox(box) {
  return box &&
         box.width > 0 &&
         box.height > 0 &&
         Number.isFinite(box.x) &&
         Number.isFinite(box.y);
}
