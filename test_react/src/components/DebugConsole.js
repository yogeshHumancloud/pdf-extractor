import React, { useState } from 'react';
import './DebugConsole.css';

function DebugConsole({ debugData }) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [activeTab, setActiveTab] = useState('coordinates'); // 'coordinates', 'output', or 'overlap'

  if (!debugData) return null;

  const { coordinates, output, timestamp } = debugData;

  // Calculate overlap analysis
  const getOverlapAnalysis = () => {
    if (!coordinates || !output || !output.metadata?.selected_fields) return null;

    const analysis = {
      totalSelections: coordinates.length,
      totalFieldsMatched: output.metadata.selected_fields.length,
      byPage: {},
      selectionBoxes: []
    };

    coordinates.forEach(sel => {
      const box = sel.boundingBox;
      const boxInfo = {
        id: sel.id,
        page: sel.pageNum,
        x: box.x.toFixed(2),
        y: box.y.toFixed(2),
        width: box.width.toFixed(2),
        height: box.height.toFixed(2),
        xRange: `${box.x.toFixed(2)} → ${(box.x + box.width).toFixed(2)}`,
        yRange: `${box.y.toFixed(2)} → ${(box.y + box.height).toFixed(2)}`
      };
      analysis.selectionBoxes.push(boxInfo);

      if (!analysis.byPage[sel.pageNum]) {
        analysis.byPage[sel.pageNum] = {
          selections: 0,
          fieldsMatched: 0
        };
      }
      analysis.byPage[sel.pageNum].selections++;
    });

    return analysis;
  };

  const overlapAnalysis = getOverlapAnalysis();

  return (
    <div className={`debug-console ${isExpanded ? 'expanded' : 'collapsed'}`}>
      <div className="debug-console-header" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="debug-console-title">
          <span className="debug-icon">🐛</span>
          <span>Debug Console</span>
          {timestamp && (
            <span className="debug-timestamp">
              {new Date(timestamp).toLocaleTimeString()}
            </span>
          )}
        </div>
        <button className="debug-toggle-button">
          {isExpanded ? '▼' : '▲'}
        </button>
      </div>

      {isExpanded && (
        <div className="debug-console-content">
          <div className="debug-tabs">
            <button
              className={`debug-tab ${activeTab === 'coordinates' ? 'active' : ''}`}
              onClick={() => setActiveTab('coordinates')}
            >
              📍 Coordinates Sent ({coordinates?.length || 0})
            </button>
            <button
              className={`debug-tab ${activeTab === 'overlap' ? 'active' : ''}`}
              onClick={() => setActiveTab('overlap')}
            >
              🎯 Overlap Analysis
            </button>
            <button
              className={`debug-tab ${activeTab === 'output' ? 'active' : ''}`}
              onClick={() => setActiveTab('output')}
            >
              📤 Package Output
            </button>
          </div>

          <div className="debug-content-area">
            {activeTab === 'coordinates' && (
              <div className="debug-section">
                <h4>Coordinates/Selections Sent to Package:</h4>
                {coordinates && coordinates.length > 0 ? (
                  <div className="debug-code-block">
                    <pre>{JSON.stringify(coordinates, null, 2)}</pre>
                  </div>
                ) : (
                  <div className="debug-empty-message">
                    <p>No coordinates sent (full PDF extraction mode)</p>
                  </div>
                )}
                {coordinates && coordinates.length > 0 && (
                  <div className="debug-summary">
                    <p><strong>Total Selections:</strong> {coordinates.length}</p>
                    <p><strong>Pages:</strong> {[...new Set(coordinates.map(c => c.page))].join(', ')}</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'overlap' && overlapAnalysis && (
              <div className="debug-section">
                <h4>Selection Box Overlap Analysis:</h4>

                <div className="debug-summary overlap-summary">
                  <p><strong>Total Selections:</strong> {overlapAnalysis.totalSelections}</p>
                  <p><strong>Fields Matched:</strong> {overlapAnalysis.totalFieldsMatched}</p>

                  {overlapAnalysis.selectionBoxes.map((box, idx) => (
                    <div key={idx} className="selection-box-info">
                      <h5>Selection {idx + 1} (Page {box.page}):</h5>
                      <div className="box-details">
                        <p><strong>Position:</strong> x={box.x}, y={box.y}</p>
                        <p><strong>Size:</strong> {box.width} × {box.height}</p>
                        <p><strong>X Range:</strong> {box.xRange}</p>
                        <p><strong>Y Range:</strong> {box.yRange}</p>
                      </div>
                      <div className="overlap-note">
                        <p>💡 <strong>Note:</strong> All fields with coordinates on page {box.page} that fall within this range will be matched.</p>
                        {output.metadata.selected_fields.length === 0 && (
                          <p className="warning-text">⚠️ <strong>No fields matched!</strong> This means either:<br/>
                          1. No fields in the rules file have coordinates on page {box.page}, OR<br/>
                          2. The field coordinates don't overlap with your selection box (Y: {box.yRange})<br/>
                          <br/>
                          <strong>Tip:</strong> The rules file may have coordinates captured with a different PDF viewer/scale. Check the "Package Output" tab error message for details.
                          </p>
                        )}
                        {output.metadata.selected_fields.length > 50 && (
                          <p className="warning-text">💡 <strong>Many fields matched</strong> ({output.metadata.selected_fields.length}). Your selection box might be too wide. Try drawing a smaller, more precise selection around just the values you want.</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="matched-fields-preview">
                  <h5>Matched Fields ({output.metadata.selected_fields.length}):</h5>
                  <div className="debug-code-block">
                    <pre>{output.metadata.selected_fields.slice(0, 20).join('\n')}
{output.metadata.selected_fields.length > 20 ? `\n... and ${output.metadata.selected_fields.length - 20} more fields` : ''}</pre>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'output' && (
              <div className="debug-section">
                <h4>Output Received from Package:</h4>
                {output ? (
                  <>
                    <div className="debug-code-block">
                      <pre>{JSON.stringify(output, null, 2)}</pre>
                    </div>
                    <div className="debug-summary">
                      <p><strong>Total Fields:</strong> {Object.keys(output.data || {}).length}</p>
                      <p><strong>Found:</strong> {Object.values(output.data || {}).filter(f => f.found).length}</p>
                      <p><strong>Extraction Mode:</strong> {output.metadata?.extraction_mode || 'N/A'}</p>
                      {output.metadata?.selected_fields && (
                        <p><strong>Selected Fields:</strong> {output.metadata.selected_fields.length}</p>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="debug-empty-message">
                    <p>No output received yet</p>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="debug-actions">
            <button
              className="debug-action-button"
              onClick={() => {
                const data = activeTab === 'coordinates' ? coordinates : output;
                const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `debug-${activeTab}-${Date.now()}.json`;
                a.click();
                URL.revokeObjectURL(url);
              }}
            >
              💾 Download {activeTab === 'coordinates' ? 'Coordinates' : 'Output'}
            </button>
            <button
              className="debug-action-button"
              onClick={() => {
                const data = activeTab === 'coordinates' ? coordinates : output;
                navigator.clipboard.writeText(JSON.stringify(data, null, 2));
                alert('Copied to clipboard!');
              }}
            >
              📋 Copy to Clipboard
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default DebugConsole;
