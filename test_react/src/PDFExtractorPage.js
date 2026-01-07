import React, { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import * as unpdfModule from 'unpdf';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { SelectionProvider, useSelection } from './contexts/SelectionContext';
import { extractTextWithPositions, filterTextBySelections } from './utils/textExtraction';
import { autoCaptureCoordinates, downloadRulesJSON } from './utils/autoCoordinateCapture';
import PDFViewer from './PDFViewer';
import './PDFExtractorPage.css';

// PDFExtractor class - browser compatible version
class PDFExtractor {
  constructor(rules) {
    if (typeof rules === 'string') {
      this.rules = JSON.parse(rules);
    } else if (typeof rules === 'object') {
      this.rules = rules;
    } else {
      throw new Error('Rules must be an object or JSON string');
    }
  }

  async extractTextFromPDF(pdfBuffer) {
    let uint8Array;
    if (pdfBuffer instanceof Uint8Array) {
      uint8Array = pdfBuffer;
    } else if (pdfBuffer instanceof ArrayBuffer) {
      uint8Array = new Uint8Array(pdfBuffer);
    } else {
      throw new Error('pdfBuffer must be a Uint8Array or ArrayBuffer');
    }

    const pdf = await unpdfModule.getDocumentProxy(uint8Array);
    const { text } = await unpdfModule.extractText(pdf, { mergePages: true });
    return text;
  }

  applyRule(text, ruleName, rule) {
    try {
      if (rule.type === 'regex') {
        const regex = new RegExp(rule.pattern, 'gims');
        const match = regex.exec(text);

        if (match && match[rule.group]) {
          let value = match[rule.group].trim();

          if (rule.transform) {
            value = this.transformValue(value, rule.transform, rule, match);
          }

          return {
            value: value,
            found: true,
            description: rule.description
          };
        }
      }

      return {
        value: null,
        found: false,
        description: rule.description
      };
    } catch (error) {
      return {
        value: null,
        found: false,
        error: error.message,
        description: rule.description
      };
    }
  }

  transformValue(value, transformType, rule, match) {
    switch (transformType) {
      case 'number':
        return value.replace(/,/g, '');
      case 'refund':
        const numValue = value.replace(/,/g, '');
        const signGroup = rule.signGroup || 1;
        const isNegative = match[signGroup] === '-' || value.includes('(-)');
        return isNegative ? `-${numValue}` : numValue;
      case 'date':
        return value;
      case 'uppercase':
        return value.toUpperCase();
      case 'lowercase':
        return value.toLowerCase();
      default:
        return value;
    }
  }

  async extractWithCoordinates(pdfFile) {
    // Extract text items with positions
    const arrayBuffer = await pdfFile.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    const pdf = await unpdfModule.getDocumentProxy(uint8Array);

    // Get all text items with positions
    const pagesData = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const viewport = page.getViewport({ scale: 1.5 });

      pagesData.push({
        pageNum: i,
        textItems: textContent.items,
        viewport: {
          width: viewport.width,
          height: viewport.height,
          scale: viewport.scale
        }
      });
    }

    // Also get full text for fallback
    const { text: fullText } = await unpdfModule.extractText(pdf, { mergePages: true });

    const results = {
      metadata: {
        ruleset: this.rules.name,
        version: this.rules.version,
        description: this.rules.description,
        extracted_at: new Date().toISOString(),
        extraction_mode: 'hybrid' // NEW
      },
      data: {},
      raw_text: fullText,
      extraction_stats: {
        coordinate_success: 0,
        fallback_success: 0,
        failed: 0
      }
    };

    // Process each rule with hybrid approach
    for (const [ruleName, rule] of Object.entries(this.rules.rules)) {
      let result = null;

      // Step 1: Try coordinate-based extraction if coordinates exist
      if (rule.coordinates) {
        result = this.extractFromCoordinates(pagesData, ruleName, rule);
        if (result.found) {
          results.extraction_stats.coordinate_success++;
        }
      }

      // Step 2: Fallback to full-text regex if coordinate extraction failed
      if (!result || !result.found) {
        result = this.applyRule(fullText, ruleName, rule);
        if (result.found) {
          results.extraction_stats.fallback_success++;
          result.extraction_method = 'fallback';
        } else {
          results.extraction_stats.failed++;
        }
      } else {
        result.extraction_method = 'coordinates';
      }

      results.data[ruleName] = result;
    }

    return results;
  }

  extractFromCoordinates(pagesData, ruleName, rule) {
    try {
      const coords = rule.coordinates;

      // Find the page
      const pageData = pagesData.find(p => p.pageNum === coords.page);
      if (!pageData) {
        return {
          value: null,
          found: false,
          error: 'Page not found',
          description: rule.description
        };
      }

      // Extract text from the coordinate region
      const regionText = this.getTextFromRegion(pageData, coords);

      if (!regionText || regionText.trim().length === 0) {
        return {
          value: null,
          found: false,
          error: 'No text in region',
          description: rule.description
        };
      }

      // Apply regex to region text
      const regex = new RegExp(rule.pattern, 'gims');
      const match = regex.exec(regionText);

      if (match && match[rule.group]) {
        let value = match[rule.group].trim();

        if (rule.transform) {
          value = this.transformValue(value, rule.transform, rule, match);
        }

        return {
          value: value,
          found: true,
          description: rule.description,
          extraction_method: 'coordinates'
        };
      }

      return {
        value: null,
        found: false,
        description: rule.description
      };
    } catch (error) {
      return {
        value: null,
        found: false,
        error: error.message,
        description: rule.description
      };
    }
  }

  getTextFromRegion(pageData, coords) {
    const textItems = [];

    pageData.textItems.forEach(item => {
      // Get text item bounding box
      const [, , , , x, y] = item.transform;
      const width = item.width || 0;
      const height = item.height || 12;

      // Check if text item overlaps with coordinate region
      // Simple overlap check: center point within region
      const centerX = x + width / 2;
      const centerY = y + height / 2;

      const isInRegion = (
        centerX >= coords.x &&
        centerX <= coords.x + coords.width &&
        centerY >= coords.y &&
        centerY <= coords.y + coords.height
      );

      if (isInRegion && item.str) {
        textItems.push(item.str);
      }
    });

    return textItems.join(' ');
  }

  async extract(pdfBuffer) {
    const text = await this.extractTextFromPDF(pdfBuffer);
    const results = {
      metadata: {
        ruleset: this.rules.name,
        version: this.rules.version,
        description: this.rules.description,
        extracted_at: new Date().toISOString()
      },
      data: {},
      raw_text: text
    };

    for (const [ruleName, rule] of Object.entries(this.rules.rules)) {
      results.data[ruleName] = this.applyRule(text, ruleName, rule);
    }

    return results;
  }

  // Extract from pre-extracted text (for selection-based extraction)
  extractFromText(text) {
    const results = {
      metadata: {
        ruleset: this.rules.name,
        version: this.rules.version,
        description: this.rules.description,
        extracted_at: new Date().toISOString()
      },
      data: {},
      raw_text: text
    };

    for (const [ruleName, rule] of Object.entries(this.rules.rules)) {
      results.data[ruleName] = this.applyRule(text, ruleName, rule);
    }

    return results;
  }

  async getStats(pdfBuffer) {
    const results = await this.extract(pdfBuffer);
    const totalRules = Object.keys(this.rules.rules).length;
    const foundCount = Object.values(results.data).filter(r => r.found).length;
    const notFoundCount = totalRules - foundCount;
    const successRate = ((foundCount / totalRules) * 100).toFixed(2);

    return {
      total_rules: totalRules,
      found: foundCount,
      not_found: notFoundCount,
      success_rate: `${successRate}%`,
      missing_fields: Object.keys(results.data).filter(key => !results.data[key].found)
    };
  }

  async exportToMarkdown(pdfBuffer) {
    const results = await this.extract(pdfBuffer);
    const lines = [];

    // Title
    lines.push(`# ${this.rules.name || 'PDF Extraction Results'}`);
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
        const value = (data.value || 'N/A').replace(/\|/g, '\\|'); // Escape pipes
        lines.push(`| ${index + 1} | **${label}** | ${value} |`);
      });
    } else {
      lines.push('> No data was extracted from the PDF.');
    }

    lines.push('');
    lines.push('---');
    lines.push('');

    // Missing Fields (if any)
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
  }

  async exportToCSV(pdfBuffer) {
    const results = await this.extract(pdfBuffer);
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
  }
}

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
        // Selection-based extraction
        // Strategy: Find which fields have coordinates that overlap with user selections
        // Then extract ONLY those fields

        console.log('✂️ Using SELECTION-BASED extraction');

        // Build comprehensive debug info
        const debugInfo = {
          selections: selections.map(s => ({
            id: s.id,
            page: s.pageNum,
            canvasBox: s.canvasBox,
            boundingBox: s.boundingBox,
            range: {
              x: [s.boundingBox.x, s.boundingBox.x + s.boundingBox.width],
              y: [s.boundingBox.y, s.boundingBox.y + s.boundingBox.height]
            }
          })),
          fieldChecks: [],
          matchedFields: []
        };

        // Find fields that overlap with selections
        const fieldsInSelection = [];

        for (const [fieldName, rule] of Object.entries(rules.rules)) {
          if (!rule.coordinates) {
            debugInfo.fieldChecks.push({
              field: fieldName,
              status: 'skipped',
              reason: 'no coordinates'
            });
            continue;
          }

          const fieldCoords = rule.coordinates;

          // Check if this field overlaps with ANY user selection
          const overlapsWithSelection = selections.some(selection => {
            // Check if selection and field are on same page
            if (selection.pageNum !== fieldCoords.page) return false;

            // Check bounding box overlap with 20px tolerance
            const selBox = selection.boundingBox;
            const fieldBox = fieldCoords;
            const tolerance = 20; // 20px tolerance in PDF coordinates

            // Expand selection box by tolerance
            const expandedSelBox = {
              x: selBox.x - tolerance,
              y: selBox.y - tolerance,
              width: selBox.width + tolerance * 2,
              height: selBox.height + tolerance * 2
            };

            const overlaps = !(
              expandedSelBox.x + expandedSelBox.width < fieldBox.x ||
              expandedSelBox.x > fieldBox.x + fieldBox.width ||
              expandedSelBox.y + expandedSelBox.height < fieldBox.y ||
              expandedSelBox.y > fieldBox.y + fieldBox.height
            );

            return overlaps;
          });

          const fieldRange = {
            x: [fieldCoords.x, fieldCoords.x + fieldCoords.width],
            y: [fieldCoords.y, fieldCoords.y + fieldCoords.height]
          };

          debugInfo.fieldChecks.push({
            field: fieldName,
            page: fieldCoords.page,
            coordinates: fieldCoords,
            range: fieldRange,
            overlaps: overlapsWithSelection
          });

          if (overlapsWithSelection) {
            fieldsInSelection.push(fieldName);
            debugInfo.matchedFields.push(fieldName);
          }
        }

        // Single consolidated log
        console.log('🔍 SELECTION-BASED EXTRACTION DEBUG:', JSON.stringify(debugInfo, null, 2));

        if (fieldsInSelection.length === 0) {
          setError('No fields found in selected regions. Make sure your rules have coordinates and overlap with your selections.');
          setLoading(false);
          return;
        }

        console.log(`Found ${fieldsInSelection.length} fields in selection:`, fieldsInSelection);

        // Extract full PDF text
        const pdfBuffer = await pdfFile.arrayBuffer();
        const fullResults = await extractor.extract(pdfBuffer);

        // Filter results to only include fields in selection
        results = {
          ...fullResults,
          data: {},
          metadata: {
            ...fullResults.metadata,
            extraction_mode: 'selection',
            selected_fields: fieldsInSelection
          }
        };

        // Copy only the selected fields
        for (const fieldName of fieldsInSelection) {
          results.data[fieldName] = fullResults.data[fieldName];
        }

        // Generate markdown and CSV from filtered results
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

  // Auto-capture coordinates from PDF
  const handleAutoCapture = async () => {
    if (!pdfFile || !rulesFile) {
      setError('Please upload both PDF and rules file first');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Read rules file
      const rulesText = await rulesFile.text();
      const rules = JSON.parse(rulesText);

      console.log('📍 Starting automatic coordinate capture...');

      // Auto-capture coordinates
      const updatedRules = await autoCaptureCoordinates(pdfFile, rules);

      // Download updated rules
      downloadRulesJSON(updatedRules, 'itr-rules-with-coordinates.json');

      alert(`✅ Coordinate capture complete!\n\nDownloaded: itr-rules-with-coordinates.json\n\nCheck the console for details.`);
    } catch (err) {
      setError(`Auto-capture failed: ${err.message}`);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

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
                <PDFViewer file={pdfFile} rules={parsedRules} />
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
