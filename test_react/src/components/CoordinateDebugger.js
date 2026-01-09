import React, { useState, useEffect } from 'react';
import './CoordinateDebugger.css';

/**
 * Coordinate Debugger Component
 * Shows viewport info and coordinate conversion in real-time
 */
function CoordinateDebugger({ viewport, scale, selections, pageNum }) {
  const [debugInfo, setDebugInfo] = useState(null);

  useEffect(() => {
    if (!viewport) return;

    const info = {
      pageNum,
      viewport: {
        width: viewport.width.toFixed(2),
        height: viewport.height.toFixed(2),
        scale: viewport.scale
      },
      renderScale: scale,
      scaledDimensions: {
        width: (viewport.width * scale / viewport.scale).toFixed(2),
        height: (viewport.height * scale / viewport.scale).toFixed(2)
      }
    };

    // If we have selections, show conversion examples
    if (selections && selections.length > 0) {
      const sel = selections[0];
      info.exampleSelection = {
        canvas: {
          x: sel.canvasBox.x.toFixed(2),
          y: sel.canvasBox.y.toFixed(2),
          width: sel.canvasBox.width.toFixed(2),
          height: sel.canvasBox.height.toFixed(2)
        },
        pdf: {
          x: sel.boundingBox.x.toFixed(2),
          y: sel.boundingBox.y.toFixed(2),
          width: sel.boundingBox.width.toFixed(2),
          height: sel.boundingBox.height.toFixed(2)
        },
        conversion: {
          formula: `y_pdf = (${viewport.height.toFixed(2)} / ${scale}) - (${sel.canvasBox.y.toFixed(2)} / ${scale}) - (${sel.canvasBox.height.toFixed(2)} / ${scale})`,
          result: sel.boundingBox.y.toFixed(2)
        }
      };
    }

    setDebugInfo(info);
  }, [viewport, scale, selections, pageNum]);

  if (!debugInfo) return null;

  return (
    <div className="coordinate-debugger">
      <div className="debugger-header">
        <span className="debug-icon">🔍</span>
        <span>Coordinate System Debug - Page {debugInfo.pageNum}</span>
      </div>

      <div className="debug-grid">
        <div className="debug-section">
          <h4>📐 Viewport Info</h4>
          <table className="debug-table">
            <tbody>
              <tr>
                <td>Width:</td>
                <td>{debugInfo.viewport.width} pt</td>
              </tr>
              <tr>
                <td>Height:</td>
                <td>{debugInfo.viewport.height} pt</td>
              </tr>
              <tr>
                <td>Viewport Scale:</td>
                <td>{debugInfo.viewport.scale}</td>
              </tr>
              <tr>
                <td>Render Scale:</td>
                <td>{debugInfo.renderScale}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="debug-section">
          <h4>📏 Coordinate Origins</h4>
          <div className="origin-diagram">
            <div className="coord-system">
              <div className="system-label">Canvas (HTML)</div>
              <div className="origin-box canvas-origin">
                <div className="origin-marker top-left"></div>
                <span className="origin-text">Origin (0,0)<br/>Top-Left</span>
                <div className="axis-label y-down">Y ↓</div>
                <div className="axis-label x-right">X →</div>
              </div>
            </div>
            <div className="coord-system">
              <div className="system-label">PDF (unpdf)</div>
              <div className="origin-box pdf-origin">
                <div className="origin-marker bottom-left"></div>
                <span className="origin-text">Origin (0,0)<br/>Bottom-Left</span>
                <div className="axis-label y-up">Y ↑</div>
                <div className="axis-label x-right">X →</div>
              </div>
            </div>
          </div>
        </div>

        {debugInfo.exampleSelection && (
          <div className="debug-section full-width">
            <h4>🎯 Selection Coordinate Conversion</h4>
            <div className="conversion-example">
              <div className="coords-box">
                <h5>Canvas Coordinates</h5>
                <pre>{JSON.stringify(debugInfo.exampleSelection.canvas, null, 2)}</pre>
              </div>
              <div className="arrow">→</div>
              <div className="coords-box">
                <h5>PDF Coordinates</h5>
                <pre>{JSON.stringify(debugInfo.exampleSelection.pdf, null, 2)}</pre>
              </div>
            </div>
            <div className="formula-box">
              <h5>Y-Axis Conversion Formula:</h5>
              <code>{debugInfo.exampleSelection.conversion.formula}</code>
              <p>Result: <strong>{debugInfo.exampleSelection.conversion.result}</strong></p>
            </div>
          </div>
        )}
      </div>

      <div className="debug-tips">
        <h4>💡 Tips for Coordinate Issues:</h4>
        <ul>
          <li>If selections don't match fields, check if <strong>viewport.height</strong> matches the height used when capturing rule coordinates</li>
          <li>Rules file should use coordinates from <strong>unpdf</strong> (bottom-left origin)</li>
          <li>Canvas selections are automatically converted from top-left to bottom-left</li>
          <li>Each page has its own coordinate space starting at (0,0)</li>
        </ul>
      </div>
    </div>
  );
}

export default CoordinateDebugger;
