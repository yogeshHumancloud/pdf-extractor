/**
 * PDF Data Extractor for Indian Tax Documents
 * Supports ITR-1, GSTR-1, GSTR-2B, and GSTR-3B
 */

// Dynamic import for ESM-only unpdf module
let unpdf;
async function loadUnpdf() {
  if (!unpdf) {
    unpdf = await import('unpdf');
  }
  return unpdf;
}

const { extractText, getDocumentProxy } = {
  extractText: async (...args) => {
    const mod = await loadUnpdf();
    return mod.extractText(...args);
  },
  getDocumentProxy: async (...args) => {
    const mod = await loadUnpdf();
    return mod.getDocumentProxy(...args);
  }
};

class PDFExtractor {
  /**
   * @param {Object|string} rules - Rules object or JSON string
   */
  constructor(rules) {
    if (typeof rules === 'string') {
      this.rules = JSON.parse(rules);
    } else if (typeof rules === 'object') {
      this.rules = rules;
    } else {
      throw new Error('Rules must be an object or JSON string');
    }
  }

  /**
   * Extract text from PDF buffer
   * @param {Buffer|Uint8Array|ArrayBuffer} pdfBuffer - PDF file as buffer
   * @returns {Promise<string>} Extracted text
   */
  async extractTextFromPDF(pdfBuffer) {
    // Convert to Uint8Array if needed
    let uint8Array;
    if (pdfBuffer instanceof Uint8Array && !Buffer.isBuffer(pdfBuffer)) {
      // Already a Uint8Array (but not a Buffer)
      uint8Array = pdfBuffer;
    } else if (pdfBuffer instanceof ArrayBuffer) {
      uint8Array = new Uint8Array(pdfBuffer);
    } else if (typeof Buffer !== 'undefined' && Buffer.isBuffer(pdfBuffer)) {
      // Convert Node.js Buffer to Uint8Array
      uint8Array = Uint8Array.from(pdfBuffer);
    } else if (pdfBuffer instanceof Uint8Array) {
      // This handles the case where it's a Uint8Array subclass (like Buffer)
      uint8Array = Uint8Array.from(pdfBuffer);
    } else {
      throw new Error('pdfBuffer must be a Buffer, Uint8Array, or ArrayBuffer');
    }

    const pdf = await getDocumentProxy(uint8Array);
    const { text } = await extractText(pdf, { mergePages: true });
    return text;
  }

  /**
   * Apply a single rule to extract data
   */
  applyRule(text, ruleName, rule) {
    try {
      if (rule.type === 'regex') {
        const regex = new RegExp(rule.pattern, 'gims');
        const match = regex.exec(text);

        if (match && match[rule.group]) {
          let value = match[rule.group].trim();

          // Apply transformations
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

  /**
   * Transform extracted values based on type
   */
  transformValue(value, transformType, rule, match) {
    switch (transformType) {
      case 'number':
        // Remove commas and convert to number
        return value.replace(/,/g, '');

      case 'refund':
        // Handle refund amounts with sign
        const numValue = value.replace(/,/g, '');
        const signGroup = rule.signGroup || 1;
        const isNegative = match[signGroup] === '-' || value.includes('(-)');
        return isNegative ? `-${numValue}` : numValue;

      case 'date':
        // You can add date formatting here
        return value;

      case 'uppercase':
        return value.toUpperCase();

      case 'lowercase':
        return value.toLowerCase();

      default:
        return value;
    }
  }

  /**
   * Extract all data from PDF using rules
   * @param {Buffer|Uint8Array|ArrayBuffer} pdfBuffer - PDF file as buffer
   * @returns {Promise<Object>} Extraction results
   */
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

    // Apply each rule
    for (const [ruleName, rule] of Object.entries(this.rules.rules)) {
      results.data[ruleName] = this.applyRule(text, ruleName, rule);
    }

    return results;
  }

  /**
   * Extract only fields that overlap with user selections
   * Uses coordinates for filtering, regex on full text for extraction
   *
   * @param {Buffer|Uint8Array|ArrayBuffer} pdfBuffer - PDF file as buffer
   * @param {Array} selections - Array of selection objects with {pageNum, boundingBox: {x, y, width, height}}
   * @param {number} tolerance - Overlap tolerance in PDF points (default: 20)
   * @returns {Promise<Object>} Extraction results with only selected fields
   */
  async extractWithSelections(pdfBuffer, selections, tolerance = 20) {
    if (!selections || selections.length === 0) {
      throw new Error('At least one selection is required');
    }

    // Extract full text first
    const text = await this.extractTextFromPDF(pdfBuffer);

    // Find fields that overlap with selections
    const fieldsInSelection = [];

    for (const [fieldName, rule] of Object.entries(this.rules.rules)) {
      // Skip fields without coordinates
      if (!rule.coordinates) {
        continue;
      }

      const fieldCoords = rule.coordinates;

      // Check if this field overlaps with ANY user selection
      const overlapsWithSelection = selections.some(selection => {
        // Check if selection and field are on same page
        if (selection.pageNum !== fieldCoords.page) return false;

        // Check bounding box overlap with tolerance
        const selBox = selection.boundingBox;
        const fieldBox = fieldCoords;

        // Expand selection box by tolerance
        const expandedSelBox = {
          x: selBox.x - tolerance,
          y: selBox.y - tolerance,
          width: selBox.width + tolerance * 2,
          height: selBox.height + tolerance * 2
        };

        // Check if boxes overlap (not disjoint)
        const overlaps = !(
          expandedSelBox.x + expandedSelBox.width < fieldBox.x ||
          expandedSelBox.x > fieldBox.x + fieldBox.width ||
          expandedSelBox.y + expandedSelBox.height < fieldBox.y ||
          expandedSelBox.y > fieldBox.y + fieldBox.height
        );

        return overlaps;
      });

      if (overlapsWithSelection) {
        fieldsInSelection.push(fieldName);
      }
    }

    if (fieldsInSelection.length === 0) {
      return {
        metadata: {
          ruleset: this.rules.name,
          version: this.rules.version,
          description: this.rules.description,
          extracted_at: new Date().toISOString(),
          extraction_mode: 'selection',
          selected_fields: []
        },
        data: {},
        raw_text: text,
        error: 'No fields found in selected regions. Make sure your rules have coordinates and overlap with your selections.'
      };
    }

    // Extract ONLY the selected fields using regex on full text
    const results = {
      metadata: {
        ruleset: this.rules.name,
        version: this.rules.version,
        description: this.rules.description,
        extracted_at: new Date().toISOString(),
        extraction_mode: 'selection',
        selected_fields: fieldsInSelection,
        total_selections: selections.length
      },
      data: {},
      raw_text: text
    };

    // Apply regex to full text for each selected field
    for (const fieldName of fieldsInSelection) {
      const rule = this.rules.rules[fieldName];
      results.data[fieldName] = this.applyRule(text, fieldName, rule);
    }

    return results;
  }

  /**
   * Extract and format according to output sections
   * @param {Buffer|Uint8Array|ArrayBuffer} pdfBuffer - PDF file as buffer
   * @returns {Promise<Object>} Formatted extraction results
   */
  async extractFormatted(pdfBuffer) {
    const results = await this.extract(pdfBuffer);

    if (!this.rules.output_format || !this.rules.output_format.sections) {
      return results;
    }

    const formatted = {
      metadata: results.metadata,
      sections: []
    };

    for (const section of this.rules.output_format.sections) {
      const sectionData = {
        name: section.name,
        fields: {}
      };

      for (const fieldName of section.fields) {
        if (results.data[fieldName]) {
          sectionData.fields[fieldName] = {
            label: fieldName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
            value: results.data[fieldName].value,
            found: results.data[fieldName].found,
            description: results.data[fieldName].description
          };
        }
      }

      formatted.sections.push(sectionData);
    }

    return formatted;
  }

  /**
   * Get extraction statistics
   * @param {Buffer|Uint8Array|ArrayBuffer} pdfBuffer - PDF file as buffer
   * @returns {Promise<Object>} Extraction statistics
   */
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
      missing_fields: Object.keys(results.data)
        .filter(key => !results.data[key].found)
    };
  }

  /**
   * Export data to CSV format
   * @param {Buffer|Uint8Array|ArrayBuffer} pdfBuffer - PDF file as buffer
   * @returns {Promise<string>} CSV formatted string
   */
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

  /**
   * Export data to Markdown format
   * @param {Buffer|Uint8Array|ArrayBuffer} pdfBuffer - PDF file as buffer
   * @returns {Promise<string>} Markdown formatted string
   */
  async exportToMarkdown(pdfBuffer) {
    const results = await this.extractFormatted(pdfBuffer);
    const lines = [];

    // Title
    lines.push(`# ${this.rules.name || 'PDF Extraction Results'}`);
    lines.push('');

    // Metadata
    lines.push('## Metadata');
    lines.push('');
    lines.push(`- **Ruleset**: ${results.metadata.ruleset}`);
    lines.push(`- **Version**: ${results.metadata.version}`);
    lines.push(`- **Description**: ${results.metadata.description}`);
    lines.push(`- **Extracted At**: ${results.metadata.extracted_at}`);
    lines.push('');

    // Sections
    if (results.sections) {
      for (const section of results.sections) {
        lines.push(`## ${section.name}`);
        lines.push('');
        lines.push('| Field | Value |');
        lines.push('|-------|-------|');

        for (const [key, field] of Object.entries(section.fields)) {
          const value = field.value || 'N/A';
          lines.push(`| ${field.label} | ${value} |`);
        }
        lines.push('');
      }
    } else {
      // Fallback if no sections defined
      lines.push('## Extracted Data');
      lines.push('');
      lines.push('| Field | Value |');
      lines.push('|-------|-------|');

      for (const [key, data] of Object.entries(results.data)) {
        const label = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        const value = data.value || 'N/A';
        lines.push(`| ${label} | ${value} |`);
      }
      lines.push('');
    }

    return lines.join('\n');
  }
}

// Load rules helper
function loadRules(ruleType) {
  try {
    const rules = require(`./rules/${ruleType}-rules.json`);
    return rules;
  } catch (error) {
    throw new Error(`Failed to load rules for type: ${ruleType}. Available types: itr, gstr1, gstr2b, gstr3b`);
  }
}

// Create extractor with built-in rules
function createExtractor(ruleType) {
  const rules = loadRules(ruleType);
  return new PDFExtractor(rules);
}

// Exports
module.exports = {
  PDFExtractor,
  loadRules,
  createExtractor
};

// ESM support
if (typeof module !== 'undefined' && module.exports) {
  module.exports.default = PDFExtractor;
}
