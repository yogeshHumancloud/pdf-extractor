import React, { useState, useEffect } from 'react';
import * as unpdfModule from 'unpdf';
import './PDFViewer.css';

function PDFViewer({ file }) {
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    if (!file) return;

    const loadPDF = async () => {
      setLoading(true);
      setError(null);

      try {
        // Read file as array buffer
        const arrayBuffer = await file.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);

        // Get PDF document
        const pdf = await unpdfModule.getDocumentProxy(uint8Array);
        const numPages = pdf.numPages;

        // Render all pages
        const pagePromises = [];
        for (let i = 1; i <= numPages; i++) {
          pagePromises.push(renderPage(pdf, i));
        }

        const renderedPages = await Promise.all(pagePromises);
        setPages(renderedPages);
        setLoading(false);
      } catch (err) {
        console.error('Error loading PDF:', err);
        setError(err.message);
        setLoading(false);
      }
    };

    loadPDF();
  }, [file]);

  const renderPage = async (pdf, pageNum) => {
    try {
      const page = await pdf.getPage(pageNum);
      const viewport = page.getViewport({ scale: 1.5 });

      // Create canvas
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.width = viewport.width;
      canvas.height = viewport.height;

      // Render page
      await page.render({
        canvasContext: context,
        viewport: viewport
      }).promise;

      return {
        pageNum,
        dataUrl: canvas.toDataURL(),
        width: viewport.width,
        height: viewport.height
      };
    } catch (err) {
      console.error(`Error rendering page ${pageNum}:`, err);
      return {
        pageNum,
        error: err.message
      };
    }
  };

  if (loading) {
    return (
      <div className="pdf-viewer-loading">
        <div className="spinner"></div>
        <p>Loading PDF...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="pdf-viewer-error">
        <span className="error-icon">⚠️</span>
        <p>Failed to load PDF: {error}</p>
      </div>
    );
  }

  return (
    <div className="pdf-viewer">
      {/* Page Navigation */}
      {pages.length > 1 && (
        <div className="pdf-navigation">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="nav-button"
          >
            ← Previous
          </button>
          <span className="page-info">
            Page {currentPage} of {pages.length}
          </span>
          <button
            onClick={() => setCurrentPage(p => Math.min(pages.length, p + 1))}
            disabled={currentPage === pages.length}
            className="nav-button"
          >
            Next →
          </button>
        </div>
      )}

      {/* PDF Pages */}
      <div className="pdf-pages">
        {pages.map((page) => (
          <div
            key={page.pageNum}
            className={`pdf-page ${page.pageNum === currentPage ? 'active' : ''}`}
            style={{ display: page.pageNum === currentPage ? 'block' : 'none' }}
          >
            {page.error ? (
              <div className="page-error">
                Error loading page {page.pageNum}: {page.error}
              </div>
            ) : (
              <img
                src={page.dataUrl}
                alt={`Page ${page.pageNum}`}
                className="pdf-page-image"
              />
            )}
          </div>
        ))}
      </div>

      {/* Thumbnail Navigation */}
      {pages.length > 1 && (
        <div className="pdf-thumbnails">
          {pages.map((page) => (
            <div
              key={page.pageNum}
              className={`thumbnail ${page.pageNum === currentPage ? 'active' : ''}`}
              onClick={() => setCurrentPage(page.pageNum)}
            >
              {page.error ? (
                <div className="thumbnail-error">❌</div>
              ) : (
                <img src={page.dataUrl} alt={`Page ${page.pageNum}`} />
              )}
              <span className="thumbnail-label">{page.pageNum}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default PDFViewer;
