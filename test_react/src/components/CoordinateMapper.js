import React, { useState } from 'react';
import { useSelection } from '../contexts/SelectionContext';
import './CoordinateMapper.css';

/**
 * Coordinate Mapper - Tool to capture coordinates for rules.json fields
 *
 * Workflow:
 * 1. Load rules.json
 * 2. For each field without coordinates, prompt user to draw box
 * 3. Save coordinates back to rules.json
 */
function CoordinateMapper({ rules, onSaveCoordinates }) {
  const { selections, clearSelections } = useSelection();
  const [currentFieldIndex, setCurrentFieldIndex] = useState(0);
  const [mappedFields, setMappedFields] = useState({});
  const [isComplete, setIsComplete] = useState(false);

  // Get list of fields from rules
  const ruleFields = rules?.rules ? Object.keys(rules.rules) : [];
  const currentField = ruleFields[currentFieldIndex];
  const currentRule = rules?.rules?.[currentField];

  // Progress
  const progress = (Object.keys(mappedFields).length / ruleFields.length) * 100;

  const handleCaptureCoordinates = () => {
    if (selections.length === 0) {
      alert('Please draw a selection box on the PDF first!');
      return;
    }

    // Use the first (or only) selection
    const selection = selections[0];

    // Save coordinates for current field
    const updatedFields = {
      ...mappedFields,
      [currentField]: {
        page: selection.pageNum,
        x: selection.boundingBox.x,
        y: selection.boundingBox.y,
        width: selection.boundingBox.width,
        height: selection.boundingBox.height
      }
    };

    setMappedFields(updatedFields);
    clearSelections();

    // Move to next field or complete
    if (currentFieldIndex < ruleFields.length - 1) {
      setCurrentFieldIndex(currentFieldIndex + 1);
    } else {
      setIsComplete(true);
    }
  };

  const handleSkipField = () => {
    if (currentFieldIndex < ruleFields.length - 1) {
      setCurrentFieldIndex(currentFieldIndex + 1);
    } else {
      setIsComplete(true);
    }
  };

  const handleGoBack = () => {
    if (currentFieldIndex > 0) {
      setCurrentFieldIndex(currentFieldIndex - 1);
      clearSelections();
    }
  };

  const handleSave = () => {
    // Merge coordinates into rules
    const updatedRules = JSON.parse(JSON.stringify(rules));

    Object.entries(mappedFields).forEach(([fieldName, coords]) => {
      if (updatedRules.rules[fieldName]) {
        updatedRules.rules[fieldName].coordinates = coords;
      }
    });

    onSaveCoordinates(updatedRules);
  };

  const handleDownloadJSON = () => {
    const updatedRules = JSON.parse(JSON.stringify(rules));

    Object.entries(mappedFields).forEach(([fieldName, coords]) => {
      if (updatedRules.rules[fieldName]) {
        updatedRules.rules[fieldName].coordinates = coords;
      }
    });

    const blob = new Blob([JSON.stringify(updatedRules, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'itr-rules-with-coordinates.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!rules || !rules.rules) {
    return (
      <div className="coordinate-mapper">
        <div className="mapper-error">
          <h3>⚠️ No Rules Loaded</h3>
          <p>Please upload a rules.json file first</p>
        </div>
      </div>
    );
  }

  if (isComplete) {
    return (
      <div className="coordinate-mapper">
        <div className="mapper-complete">
          <h2>✅ Coordinate Mapping Complete!</h2>
          <p>Mapped {Object.keys(mappedFields).length} out of {ruleFields.length} fields</p>

          <div className="mapped-fields-list">
            <h3>Mapped Fields:</h3>
            {Object.entries(mappedFields).map(([fieldName, coords]) => (
              <div key={fieldName} className="mapped-field-item">
                <strong>{fieldName}</strong>
                <span className="coords-preview">
                  Page {coords.page}, x:{Math.round(coords.x)}, y:{Math.round(coords.y)}
                </span>
              </div>
            ))}
          </div>

          <div className="mapper-actions">
            <button onClick={handleDownloadJSON} className="btn-primary">
              💾 Download Updated Rules
            </button>
            <button onClick={() => {
              setCurrentFieldIndex(0);
              setIsComplete(false);
            }} className="btn-secondary">
              🔄 Start Over
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="coordinate-mapper">
      <div className="mapper-header">
        <h2>📍 Coordinate Mapper</h2>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${progress}%` }}></div>
        </div>
        <p className="progress-text">
          Field {currentFieldIndex + 1} of {ruleFields.length}
          ({Object.keys(mappedFields).length} mapped)
        </p>
      </div>

      <div className="current-field-card">
        <div className="field-header">
          <h3>{currentField}</h3>
          <span className="field-badge">{currentRule?.type || 'regex'}</span>
        </div>

        <p className="field-description">{currentRule?.description}</p>

        <div className="field-pattern">
          <strong>Pattern:</strong>
          <code>{currentRule?.pattern}</code>
        </div>

        <div className="instructions">
          <h4>📋 Instructions:</h4>
          <ol>
            <li>Locate "<strong>{currentField}</strong>" on the PDF</li>
            <li>Draw a selection box around it</li>
            <li>Click "Capture Coordinates" below</li>
          </ol>
        </div>

        {selections.length > 0 && (
          <div className="selection-preview">
            <strong>✓ Selection Ready:</strong>
            <span>
              Page {selections[0].pageNum},
              x:{Math.round(selections[0].boundingBox.x)},
              y:{Math.round(selections[0].boundingBox.y)},
              w:{Math.round(selections[0].boundingBox.width)},
              h:{Math.round(selections[0].boundingBox.height)}
            </span>
          </div>
        )}
      </div>

      <div className="mapper-controls">
        <button
          onClick={handleGoBack}
          disabled={currentFieldIndex === 0}
          className="btn-secondary"
        >
          ← Back
        </button>

        <button
          onClick={handleSkipField}
          className="btn-secondary"
        >
          Skip Field
        </button>

        <button
          onClick={handleCaptureCoordinates}
          disabled={selections.length === 0}
          className="btn-primary"
        >
          ✓ Capture Coordinates
        </button>
      </div>
    </div>
  );
}

export default CoordinateMapper;
