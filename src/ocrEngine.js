/**
 * OCR Engine Module
 * Uses Tesseract.js 7.0.0 for optical character recognition
 */

import { createWorker } from 'tesseract.js';

let workerInstance = null;
let isInitializing = false;
let initPromise = null;

/**
 * Initialize Tesseract.js worker
 * @param {string} language - Language code (default: 'eng')
 * @returns {Promise<Object>} Initialized worker
 */
async function initializeWorker(language = 'eng') {
  // If already initialized, return existing worker
  if (workerInstance) {
    return workerInstance;
  }

  // If initialization is in progress, wait for it
  if (isInitializing && initPromise) {
    return initPromise;
  }

  // Start new initialization
  isInitializing = true;
  initPromise = (async () => {
    try {
      console.log('Initializing Tesseract.js worker...');
      const worker = await createWorker(language, 1, {
        logger: (m) => {
          if (m.status === 'loading tesseract core' || m.status === 'initializing tesseract') {
            console.log(`OCR: ${m.status} ${m.progress ? Math.round(m.progress * 100) + '%' : ''}`);
          }
        }
      });

      workerInstance = worker;
      isInitializing = false;
      console.log('Tesseract.js worker initialized successfully');
      return worker;
    } catch (error) {
      isInitializing = false;
      initPromise = null;
      throw new Error(`Failed to initialize OCR worker: ${error.message}`);
    }
  })();

  return initPromise;
}

/**
 * Perform OCR on a canvas element
 * @param {HTMLCanvasElement} canvas - Canvas containing the page image
 * @param {Object} options - OCR options
 * @returns {Promise<Object>} OCR result with text and confidence
 */
export async function performOCR(canvas, options = {}) {
  try {
    const language = options.language || 'eng';
    const worker = await initializeWorker(language);

    console.log('Starting OCR recognition...');
    const startTime = Date.now();

    // Perform OCR on the canvas
    const result = await worker.recognize(canvas);

    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    console.log(`OCR completed in ${duration}s, confidence: ${result.data.confidence.toFixed(2)}%`);

    return {
      success: true,
      text: result.data.text,
      confidence: result.data.confidence,
      words: result.data.words || [],
      lines: result.data.lines || [],
      paragraphs: result.data.paragraphs || [],
      duration: duration
    };
  } catch (error) {
    console.error('OCR error:', error);
    return {
      success: false,
      error: error.message,
      text: '',
      confidence: 0
    };
  }
}

/**
 * Terminate the OCR worker to free resources
 */
export async function terminateWorker() {
  if (workerInstance) {
    try {
      await workerInstance.terminate();
      workerInstance = null;
      isInitializing = false;
      initPromise = null;
      console.log('OCR worker terminated');
    } catch (error) {
      console.error('Error terminating OCR worker:', error);
    }
  }
}

/**
 * Check if OCR worker is ready
 * @returns {boolean} True if worker is initialized
 */
export function isWorkerReady() {
  return workerInstance !== null;
}
