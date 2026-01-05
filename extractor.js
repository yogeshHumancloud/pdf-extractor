const fs = require('fs');
const { extractText, getDocumentProxy } = require('unpdf');

class PDFExtractor {
  constructor(rulesPath) {
    this.rules = JSON.parse(fs.readFileSync(rulesPath, 'utf8'));
  }

  /**
   * Extract text from PDF file
   */
  async extractTextFromPDF(pdfPath) {
    const buffer = fs.readFileSync(pdfPath);
    const pdf = await getDocumentProxy(new Uint8Array(buffer));
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
   */
  async extract(pdfPath) {
    const text = await this.extractTextFromPDF(pdfPath);
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
   * Extract and format according to output sections
   */
  async extractFormatted(pdfPath) {
    const results = await this.extract(pdfPath);

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
   */
  async getStats(pdfPath) {
    const results = await this.extract(pdfPath);
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
   */
  async exportToCSV(pdfPath) {
    const results = await this.extract(pdfPath);
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
   */
  async exportToMarkdown(pdfPath) {
    const results = await this.extractFormatted(pdfPath);
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

module.exports = PDFExtractor;
