import * as pdfjsLib from 'pdfjs-dist';
import { extractText } from './textExtractor';
import { detectTables } from './tableDetector';

/**
 * PDFReader - A frontend PDF reader and text extractor
 * Built with PDF.js 5.x
 */
class PDFReader {
  /**
   * Initialize PDF.js worker
   * This should be called before using the extract method
   * @param {string} workerSrc - Optional custom worker source URL
   */
  static initWorker(workerSrc) {
    if (workerSrc) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;
    } else {
      // Use CDN for worker by default (version 5.4.449)
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/5.4.449/pdf.worker.min.mjs`;
    }
  }

  /**
   * Extract content from PDF file
   * @param {File|Blob|ArrayBuffer|Uint8Array} file - PDF file to process
   * @param {Object} options - Configuration options
   * @param {boolean} options.detectTables - Enable table detection (default: true)
   * @param {boolean} options.includeMetadata - Include PDF metadata (default: true)
   * @param {Function} options.onProgress - Progress callback function
   * @returns {Promise<Object>} Extracted content
   */
  static async extract(file, options = {}) {
    try {
      // Initialize worker if not already done
      if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
        this.initWorker();
      }

      // Default options
      const config = {
        detectTables: options.detectTables !== false,
        includeMetadata: options.includeMetadata !== false,
        onProgress: options.onProgress || null
      };

      // Convert file to ArrayBuffer if needed
      const arrayBuffer = await this._fileToArrayBuffer(file);

      // Load PDF document
      const loadingTask = pdfjsLib.getDocument({
        data: arrayBuffer,
        verbosity: 0 // Reduce console output
      });

      // Handle progress if callback provided
      if (config.onProgress) {
        loadingTask.onProgress = config.onProgress;
      }

      const pdf = await loadingTask.promise;

      console.log(`PDF loaded: ${pdf.numPages} pages`);

      // Extract content from all pages
      const pages = [];
      let fullText = '';

      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);

        // Extract text content
        const textContent = await extractText(page);

        // Detect tables if enabled
        const tables = config.detectTables
          ? await detectTables(page, textContent)
          : [];

        const pageData = {
          pageNumber: pageNum,
          text: textContent.text,
          elements: textContent.elements,
          tables: tables,
          viewport: {
            width: page.view[2],
            height: page.view[3]
          }
        };

        pages.push(pageData);
        fullText += textContent.text + '\n\n';
      }

      // Build result object
      const result = {
        success: true,
        numPages: pdf.numPages,
        fullText: fullText.trim(),
        pages: pages
      };

      // Add metadata if requested
      if (config.includeMetadata) {
        result.metadata = await this._extractMetadata(pdf);
      }

      return result;

    } catch (error) {
      console.error('Error extracting PDF:', error);
      return {
        success: false,
        error: error.message,
        stack: error.stack
      };
    }
  }

  /**
   * Extract text from a specific page
   * @param {File|Blob|ArrayBuffer|Uint8Array} file - PDF file
   * @param {number} pageNumber - Page number (1-indexed)
   * @param {Object} options - Configuration options
   * @returns {Promise<Object>} Page content
   */
  static async extractPage(file, pageNumber, options = {}) {
    try {
      // Initialize worker if not already done
      if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
        this.initWorker();
      }

      const arrayBuffer = await this._fileToArrayBuffer(file);
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;

      if (pageNumber < 1 || pageNumber > pdf.numPages) {
        throw new Error(`Invalid page number. PDF has ${pdf.numPages} pages.`);
      }

      const page = await pdf.getPage(pageNumber);
      const textContent = await extractText(page);

      const tables = options.detectTables !== false
        ? await detectTables(page, textContent)
        : [];

      return {
        success: true,
        pageNumber: pageNumber,
        text: textContent.text,
        elements: textContent.elements,
        tables: tables,
        viewport: {
          width: page.view[2],
          height: page.view[3]
        }
      };

    } catch (error) {
      console.error('Error extracting page:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Convert File/Blob to ArrayBuffer
   * @private
   */
  static _fileToArrayBuffer(file) {
    return new Promise((resolve, reject) => {
      // Already an ArrayBuffer
      if (file instanceof ArrayBuffer) {
        resolve(file);
        return;
      }

      // Already a Uint8Array
      if (file instanceof Uint8Array) {
        resolve(file.buffer);
        return;
      }

      // File or Blob - use FileReader
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = (e) => reject(new Error('Failed to read file'));
      reader.readAsArrayBuffer(file);
    });
  }

  /**
   * Extract PDF metadata
   * @private
   */
  static async _extractMetadata(pdf) {
    try {
      const metadata = await pdf.getMetadata();

      return {
        info: {
          title: metadata.info?.Title || '',
          author: metadata.info?.Author || '',
          subject: metadata.info?.Subject || '',
          keywords: metadata.info?.Keywords || '',
          creator: metadata.info?.Creator || '',
          producer: metadata.info?.Producer || '',
          creationDate: metadata.info?.CreationDate || '',
          modificationDate: metadata.info?.ModDate || ''
        },
        metadata: metadata.metadata ? {
          rawXml: metadata.metadata._metadataMap || null
        } : null,
        contentDispositionFilename: metadata.contentDispositionFilename || null
      };
    } catch (error) {
      console.warn('Could not extract metadata:', error);
      return {};
    }
  }

  /**
   * Get PDF information without extracting full content
   * @param {File|Blob|ArrayBuffer|Uint8Array} file - PDF file
   * @returns {Promise<Object>} PDF information
   */
  static async getInfo(file) {
    try {
      // Initialize worker if not already done
      if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
        this.initWorker();
      }

      const arrayBuffer = await this._fileToArrayBuffer(file);
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;

      const metadata = await this._extractMetadata(pdf);

      return {
        success: true,
        numPages: pdf.numPages,
        metadata: metadata,
        fingerprints: pdf.fingerprints || []
      };

    } catch (error) {
      console.error('Error getting PDF info:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

// Auto-initialize worker on import (can be overridden by calling initWorker)
PDFReader.initWorker();

export default PDFReader;
