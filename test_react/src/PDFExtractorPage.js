import React, { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { SelectionProvider, useSelection } from './contexts/SelectionContext';
// import { autoCaptureCoordinates, downloadRulesJSON } from './utils/autoCoordinateCapture';
import PDFViewer from './PDFViewer';
import { PDFExtractor } from 'indian-tax-pdf-extractor';
import './PDFExtractorPage.css';

// NOTE: PDFExtractor is imported from 'indian-tax-pdf-extractor' package (v2.1.0)
// The package now handles selection filtering via extractWithSelections() method
// Local PDFExtractor class has been removed

// Inner component that uses selection context
function PDFExtractorPageContent() {
  const [pdfFile, setPdfFile] = useState(null);
  const [rulesFile, setRulesFile] = useState(null);
  const [parsedRules, setParsedRules] = useState(null);
  const [extractedData, setExtractedData] = useState(null);
  const [markdown, setMarkdown] = useState('');
  const [csv, setCsv] = useState('');
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);
  const [extractionMode, setExtractionMode] = useState('full'); // 'full' or 'selection'

  // Selection context
  const { selections, hasSelections } = useSelection();

  // Parse rules when rules file changes
  useEffect(() => {
    if (!rulesFile) {
      setParsedRules(null);
      return;
    }

    const parseRules = async () => {
      try {
        const text = await rulesFile.text();
        const rules = JSON.parse(text);
        setParsedRules(rules);
      } catch (err) {
        console.error('Error parsing rules:', err);
        setParsedRules(null);
      }
    };

    parseRules();
  }, [rulesFile]);

  // Helper function to generate markdown from results
  const generateMarkdownFromResults = (results, rules) => {
    const lines = [];

    // Title
    lines.push(`# ${rules.name || 'PDF Extraction Results'}`);
    lines.push('');
    lines.push('---');
    lines.push('');

    // Metadata Section
    lines.push('## 📋 Metadata');
    lines.push('');
    lines.push(`- **Ruleset**: ${results.metadata.ruleset}`);
    lines.push(`- **Version**: ${results.metadata.version}`);
    lines.push(`- **Description**: ${results.metadata.description}`);
    lines.push(`- **Extracted At**: ${new Date(results.metadata.extracted_at).toLocaleString()}`);
    if (results.metadata.extraction_mode) {
      lines.push(`- **Extraction Mode**: ${results.metadata.extraction_mode}`);
    }
    if (results.metadata.selected_fields && results.metadata.selected_fields.length > 0) {
      lines.push(`- **Selected Fields**: ${results.metadata.selected_fields.length} field(s) from user selection`);
    }
    lines.push('');

    // Statistics
    const totalRules = Object.keys(results.data).length;
    const foundCount = Object.values(results.data).filter(r => r.found).length;
    const successRate = ((foundCount / totalRules) * 100).toFixed(2);

    lines.push('## 📊 Extraction Statistics');
    lines.push('');
    lines.push(`- **Total Fields**: ${totalRules}`);
    lines.push(`- **Successfully Extracted**: ${foundCount} ✅`);
    lines.push(`- **Not Found**: ${totalRules - foundCount}`);
    lines.push(`- **Success Rate**: ${successRate}%`);

    // Show hybrid extraction stats if available
    if (results.extraction_stats) {
      lines.push('');
      lines.push('### Extraction Method Breakdown:');
      lines.push(`- **Via Coordinates**: ${results.extraction_stats.coordinate_success} 🎯`);
      lines.push(`- **Via Fallback (Full-Text)**: ${results.extraction_stats.fallback_success} 📄`);
      lines.push(`- **Failed**: ${results.extraction_stats.failed} ❌`);
    }

    lines.push('');
    lines.push('---');
    lines.push('');

    // Extracted Data
    lines.push('## 📊 Extracted Data');
    lines.push('');

    const foundFields = Object.entries(results.data).filter(([_, data]) => data.found);

    if (foundFields.length > 0) {
      lines.push('| # | Field | Value |');
      lines.push('|---|-------|-------|');

      foundFields.forEach(([key, data], index) => {
        const label = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        const value = (data.value || 'N/A').replace(/\|/g, '\\|');
        lines.push(`| ${index + 1} | **${label}** | ${value} |`);
      });
    } else {
      lines.push('> No data was extracted from the PDF.');
    }

    lines.push('');
    lines.push('---');
    lines.push('');

    // Missing Fields
    const missingFields = Object.entries(results.data).filter(([_, data]) => !data.found);
    if (missingFields.length > 0) {
      lines.push('## ⚠️ Missing Fields');
      lines.push('');
      lines.push('<details>');
      lines.push('<summary>Click to view fields that were not found in the PDF</summary>');
      lines.push('');
      missingFields.forEach(([key, data]) => {
        const label = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        lines.push(`- ${label}`);
      });
      lines.push('');
      lines.push('</details>');
      lines.push('');
    }

    lines.push('---');
    lines.push('');
    lines.push('*Generated by PDF Data Extractor*');

    return lines.join('\n');
  };

  // Helper function to generate CSV from results
  const generateCSVFromResults = (results) => {
    const lines = [];

    // Header
    lines.push('Field,Value,Found,Description');

    // Data rows
    for (const [fieldName, fieldData] of Object.entries(results.data)) {
      const label = fieldName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      const value = fieldData.value ? `"${String(fieldData.value).replace(/"/g, '""')}"` : '';
      const found = fieldData.found ? 'Yes' : 'No';
      const description = fieldData.description ? `"${fieldData.description.replace(/"/g, '""')}"` : '';
      lines.push(`"${label}",${value},${found},${description}`);
    }

    return lines.join('\n');
  };

  // PDF dropzone
  const onDropPDF = useCallback((acceptedFiles) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      setPdfFile(file);
      setError(null);
    }
  }, []);

  const {
    getRootProps: getPdfRootProps,
    getInputProps: getPdfInputProps,
    isDragActive: isPdfDragActive
  } = useDropzone({
    onDrop: onDropPDF,
    accept: { 'application/pdf': ['.pdf'] },
    multiple: false
  });

  // Rules dropzone
  const onDropRules = useCallback((acceptedFiles) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      setRulesFile(file);
      setError(null);
    }
  }, []);

  const {
    getRootProps: getRulesRootProps,
    getInputProps: getRulesInputProps,
    isDragActive: isRulesDragActive
  } = useDropzone({
    onDrop: onDropRules,
    accept: { 'application/json': ['.json'] },
    multiple: false
  });

  // Extract data - supports both full and selection modes
  const handleExtract = async (mode = 'full') => {
    if (!pdfFile || !rulesFile) {
      setError('Please upload both PDF and rules file');
      return;
    }

    // Validate selection mode
    if (mode === 'selection' && !hasSelections()) {
      setError('Please create at least one selection box on the PDF');
      return;
    }

    setLoading(true);
    setError(null);
    setExtractionMode(mode);

    try {
      // Read rules file
      const rulesText = await rulesFile.text();
      const rules = JSON.parse(rulesText);

      // Create extractor
      const extractor = new PDFExtractor(rules);

      let results, md, csvData;

      if (mode === 'selection') {
        // Selection-based extraction using package method
        // The package handles coordinate filtering and regex extraction internally
        console.log('✂️ Using SELECTION-BASED extraction (via package)');

        const pdfBuffer = await pdfFile.arrayBuffer();

        // Call package's extractWithSelections method
        // It handles: 1) Coordinate overlap checking, 2) Regex on full text
        results = await extractor.extractWithSelections(pdfBuffer, selections, 20);

        // Check if extraction returned error
        if (results.error) {
          setError(results.error);
          setLoading(false);
          return;
        }

        console.log(`✅ Extracted ${results.metadata.selected_fields.length} fields from selections`);

        // Generate markdown and CSV from results
        md = await generateMarkdownFromResults(results, extractor.rules);
        csvData = await generateCSVFromResults(results);
      } else {
        // Full PDF extraction (original logic - no coordinates needed)
        console.log('📄 Using FULL-TEXT extraction');

        const pdfBuffer = await pdfFile.arrayBuffer();
        results = await extractor.extract(pdfBuffer);

        const pdfBuffer3 = await pdfFile.arrayBuffer();
        md = await extractor.exportToMarkdown(pdfBuffer3);

        const pdfBuffer4 = await pdfFile.arrayBuffer();
        csvData = await extractor.exportToCSV(pdfBuffer4);
      }

      // Calculate statistics
      const totalRules = mode === 'selection'
        ? Object.keys(results.data).length  // Only count selected fields
        : Object.keys(rules.rules).length;   // Count all fields
      const foundCount = Object.values(results.data).filter(r => r.found).length;
      const statistics = {
        total_rules: totalRules,
        found: foundCount,
        not_found: totalRules - foundCount,
        success_rate: `${((foundCount / totalRules) * 100).toFixed(2)}%`,
        missing_fields: Object.keys(results.data).filter(key => !results.data[key].found),
        extraction_mode: mode
      };

      setExtractedData(results);
      setStats(statistics);
      setMarkdown(md);
      setCsv(csvData);
    } catch (err) {
      setError(`Extraction failed: ${err.message}`);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setPdfFile(null);
    setRulesFile(null);
    setExtractedData(null);
    setMarkdown('');
    setCsv('');
    setStats(null);
    setError(null);
  };

  // Auto-capture coordinates from PDF (currently disabled)
  // const handleAutoCapture = async () => {
  //   if (!pdfFile || !rulesFile) {
  //     setError('Please upload both PDF and rules file first');
  //     return;
  //   }

  //   setLoading(true);
  //   setError(null);

  //   try {
  //     // Read rules file
  //     const rulesText = await rulesFile.text();
  //     const rules = JSON.parse(rulesText);

  //     console.log('📍 Starting automatic coordinate capture...');

  //     // Auto-capture coordinates
  //     const updatedRules = await autoCaptureCoordinates(pdfFile, rules);

  //     // Download updated rules
  //     downloadRulesJSON(updatedRules, 'itr-rules-with-coordinates.json');

  //     alert(`✅ Coordinate capture complete!\n\nDownloaded: itr-rules-with-coordinates.json\n\nCheck the console for details.`);
  //   } catch (err) {
  //     setError(`Auto-capture failed: ${err.message}`);
  //     console.error(err);
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  return (
    <div className="pdf-extractor-page">
      <header className="header">
        <h1>📄 PDF Data Extractor</h1>
        <p>Upload PDF and rules file to extract structured data</p>
      </header>

      {!extractedData ? (
        <div className="upload-section">
          <div className="dropzones">
            {/* PDF Dropzone */}
            <div
              {...getPdfRootProps()}
              className={`dropzone ${isPdfDragActive ? 'active' : ''} ${pdfFile ? 'has-file' : ''}`}
            >
              <input {...getPdfInputProps()} />
              <div className="dropzone-content">
                <span className="dropzone-icon">📑</span>
                {pdfFile ? (
                  <>
                    <p className="file-name">{pdfFile.name}</p>
                    <p className="file-size">{(pdfFile.size / 1024).toFixed(2)} KB</p>
                    <p className="dropzone-hint">Click or drag to change</p>
                  </>
                ) : (
                  <>
                    <p className="dropzone-title">Drop PDF here</p>
                    <p className="dropzone-hint">or click to browse</p>
                  </>
                )}
              </div>
            </div>

            {/* Rules Dropzone */}
            <div
              {...getRulesRootProps()}
              className={`dropzone ${isRulesDragActive ? 'active' : ''} ${rulesFile ? 'has-file' : ''}`}
            >
              <input {...getRulesInputProps()} />
              <div className="dropzone-content">
                <span className="dropzone-icon">⚙️</span>
                {rulesFile ? (
                  <>
                    <p className="file-name">{rulesFile.name}</p>
                    <p className="file-size">{(rulesFile.size / 1024).toFixed(2)} KB</p>
                    <p className="dropzone-hint">Click or drag to change</p>
                  </>
                ) : (
                  <>
                    <p className="dropzone-title">Drop Rules JSON here</p>
                    <p className="dropzone-hint">or click to browse</p>
                  </>
                )}
              </div>
            </div>
          </div>

          {error && (
            <div className="error-message">
              <span className="error-icon">⚠️</span>
              {error}
            </div>
          )}

          <button
            className="extract-button"
            onClick={() => handleExtract('full')}
            disabled={!pdfFile || !rulesFile || loading}
          >
            {loading ? (
              <>
                <span className="spinner"></span>
                Extracting...
              </>
            ) : (
              <>
                <span>🚀</span>
                Extract Data
              </>
            )}
          </button>

          {/* <button
            className="extract-button"
            style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', marginTop: '10px' }}
            onClick={handleAutoCapture}
            disabled={!pdfFile || !rulesFile || loading}
          >
            {loading ? (
              <>
                <span className="spinner"></span>
                Capturing...
              </>
            ) : (
              <>
                <span>📍</span>
                Auto-Capture Coordinates
              </>
            )}
          </button> */}
        </div>
      ) : (
        <div className="results-section">
          {/* Stats Bar */}
          <div className="stats-bar">
            <div className="stat">
              <span className="stat-label">Total Rules:</span>
              <span className="stat-value">{stats.total_rules}</span>
            </div>
            <div className="stat">
              <span className="stat-label">Found:</span>
              <span className="stat-value success">{stats.found}</span>
            </div>
            <div className="stat">
              <span className="stat-label">Not Found:</span>
              <span className="stat-value error">{stats.not_found}</span>
            </div>
            <div className="stat">
              <span className="stat-label">Success Rate:</span>
              <span className="stat-value">{stats.success_rate}</span>
            </div>
            {hasSelections() && (
              <button
                className="reset-button extract-selected-button"
                onClick={() => handleExtract('selection')}
                disabled={loading}
              >
                {loading && extractionMode === 'selection' ? (
                  <>
                    <span className="spinner-small"></span>
                    Extracting...
                  </>
                ) : (
                  <>
                    ✂️ Extract Selected
                  </>
                )}
              </button>
            )}
            <button className="reset-button" onClick={handleReset}>
              🔄 New Extraction
            </button>
          </div>

          {/* Split View */}
          <div className="split-view">
            {/* Left: PDF Viewer */}
            <div className="panel pdf-panel">
              <div className="panel-header">
                <h3>📄 PDF Document</h3>
                <span className="file-name">{pdfFile.name}</span>
              </div>
              <div className="panel-content">
                <PDFViewer
                  file={pdfFile}
                  rules={parsedRules}
                  onClearAll={() => handleExtract('full')}
                />
              </div>
            </div>

            {/* Right: Markdown Output */}
            <div className="panel markdown-panel">
              <div className="panel-header">
                <h3>📊 Extracted Data</h3>
                <div className="panel-actions">
                  <button
                    className="download-button"
                    onClick={() => {
                      const blob = new Blob([markdown], { type: 'text/markdown' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `extracted-data-${Date.now()}.md`;
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                    title="Download as Markdown"
                  >
                    📄 MD
                  </button>
                  <button
                    className="download-button"
                    onClick={() => {
                      const blob = new Blob([csv], { type: 'text/csv' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `extracted-data-${Date.now()}.csv`;
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                    title="Download as CSV"
                  >
                    📊 CSV
                  </button>
                  <button
                    className="download-button"
                    onClick={() => {
                      const json = JSON.stringify(extractedData, null, 2);
                      const blob = new Blob([json], { type: 'application/json' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `extracted-data-${Date.now()}.json`;
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                    title="Download as JSON"
                  >
                    📋 JSON
                  </button>
                </div>
              </div>
              <div className="panel-content markdown-content">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Wrapper component with SelectionProvider
function PDFExtractorPage() {
  return (
    <SelectionProvider>
      <PDFExtractorPageContent />
    </SelectionProvider>
  );
}

export default PDFExtractorPage;
