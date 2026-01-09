import React, { useState, useEffect } from 'react';
import * as unpdfModule from 'unpdf';
import { useSelection } from './contexts/SelectionContext';
import SelectionCanvas from './components/SelectionCanvas';
import CoordinateDebugger from './components/CoordinateDebugger';
import './PDFViewer.css';

function PDFViewer({ file, rules = null, onClearAll = null }) {
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [showDebugger, setShowDebugger] = useState(false);

  // Selection context
  const {
    selectionMode,
    setSelectionMode,
    clearSelections,
    getSelectionCount,
    getPageCount,
    getSelectionsForPage
  } = useSelection();

  // Convert rules to field locations for visualization
  const fieldLocations = rules ? Object.entries(rules.rules || {}).map(([name, rule]) => ({
    name,
    page: rule.coordinates?.page || 1,
    coordinates: rule.coordinates,
    hasCoordinates: !!rule.coordinates
  })) : [];

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
        height: viewport.height,
        viewport: {
          width: viewport.width,
          height: viewport.height,
          scale: viewport.scale
        }
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
      {/* Selection Toolbar */}
      <div className="selection-toolbar">
        <button
          onClick={() => setSelectionMode(!selectionMode)}
          className={`toolbar-button ${selectionMode ? 'active' : ''}`}
          title="Toggle selection mode"
        >
          🖱️ Selection Mode: {selectionMode ? 'ON' : 'OFF'}
        </button>
        {getSelectionCount() > 0 && (
          <>
            <button
              onClick={() => {
                clearSelections();
                // Trigger full extraction after clearing selections
                if (onClearAll) {
                  onClearAll();
                }
              }}
              className="toolbar-button"
              title="Clear all selections and run full extraction"
            >
              🗑️ Clear All
            </button>
            <button
              onClick={() => setShowDebugger(!showDebugger)}
              className={`toolbar-button ${showDebugger ? 'active' : ''}`}
              title="Toggle coordinate system debugger"
            >
              🔍 Debug
            </button>
            <span className="selection-info">
              {getSelectionCount()} selection{getSelectionCount() !== 1 ? 's' : ''} across {getPageCount()} page{getPageCount() !== 1 ? 's' : ''}
            </span>
          </>
        )}
      </div>

      {/* Coordinate Debugger */}
      {showDebugger && pages.length > 0 && (
        <CoordinateDebugger
          viewport={pages.find(p => p.pageNum === currentPage)?.viewport}
          scale={1.5}
          selections={getSelectionsForPage(currentPage)}
          pageNum={currentPage}
        />
      )}

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
              <div className="page-container" style={{ position: 'relative', display: 'inline-block' }}>
                <img
                  src={page.dataUrl}
                  alt={`Page ${page.pageNum}`}
                  className="pdf-page-image"
                />
                {page.viewport && (
                  <SelectionCanvas
                    pageNum={page.pageNum}
                    pageWidth={page.width}
                    pageHeight={page.height}
                    viewport={page.viewport}
                    scale={1.5}
                    fieldLocations={fieldLocations}
                  />
                )}
              </div>
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
