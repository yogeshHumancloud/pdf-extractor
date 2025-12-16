/**
 * Page Renderer Module
 * Renders PDF pages to canvas for OCR processing
 */

/**
 * Render a PDF page to canvas
 * @param {Object} page - PDF.js page object
 * @param {Object} options - Rendering options
 * @returns {Promise<HTMLCanvasElement>} Canvas containing rendered page
 */
export async function renderPageToCanvas(page, options = {}) {
  try {
    // Default scale for better OCR quality (2x for high DPI)
    const scale = options.scale || 2.0;

    // Get viewport
    const viewport = page.getViewport({ scale });

    // Create canvas
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');

    canvas.width = viewport.width;
    canvas.height = viewport.height;

    // Set white background for better OCR
    context.fillStyle = 'white';
    context.fillRect(0, 0, canvas.width, canvas.height);

    // Render PDF page to canvas
    const renderContext = {
      canvasContext: context,
      viewport: viewport,
      intent: 'print', // Higher quality rendering
      enableWebGL: false, // Disable WebGL for compatibility
      renderInteractiveForms: false
    };

    await page.render(renderContext).promise;

    return canvas;
  } catch (error) {
    console.error('Error rendering page to canvas:', error);
    throw new Error(`Failed to render page: ${error.message}`);
  }
}

/**
 * Convert canvas to image data for OCR
 * @param {HTMLCanvasElement} canvas - Canvas element
 * @returns {ImageData} Image data from canvas
 */
export function canvasToImageData(canvas) {
  const context = canvas.getContext('2d');
  return context.getImageData(0, 0, canvas.width, canvas.height);
}

/**
 * Clean up canvas resources
 * @param {HTMLCanvasElement} canvas - Canvas to clean up
 */
export function cleanupCanvas(canvas) {
  if (canvas) {
    const context = canvas.getContext('2d');
    if (context) {
      context.clearRect(0, 0, canvas.width, canvas.height);
    }
    canvas.width = 0;
    canvas.height = 0;
  }
}
