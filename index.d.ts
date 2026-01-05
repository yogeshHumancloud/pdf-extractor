/**
 * TypeScript definitions for Indian Tax PDF Extractor
 */

export interface Rule {
  pattern: string;
  type: 'regex';
  group: number;
  transform?: 'number' | 'date' | 'uppercase' | 'lowercase' | 'refund';
  signGroup?: number;
  description?: string;
}

export interface RuleSet {
  name: string;
  version: string;
  description: string;
  rules: Record<string, Rule>;
  output_format?: {
    sections: Array<{
      name: string;
      fields: string[];
    }>;
  };
}

export interface ExtractionMetadata {
  ruleset: string;
  version: string;
  description: string;
  extracted_at: string;
}

export interface FieldResult {
  value: string | null;
  found: boolean;
  description?: string;
  error?: string;
}

export interface ExtractionResult {
  metadata: ExtractionMetadata;
  data: Record<string, FieldResult>;
  raw_text: string;
}

export interface FormattedSection {
  name: string;
  fields: Record<string, {
    label: string;
    value: string | null;
    found: boolean;
    description?: string;
  }>;
}

export interface FormattedResult {
  metadata: ExtractionMetadata;
  sections: FormattedSection[];
}

export interface ExtractionStats {
  total_rules: number;
  found: number;
  not_found: number;
  success_rate: string;
  missing_fields: string[];
}

export type RuleType = 'itr' | 'gstr1' | 'gstr2b' | 'gstr3b';

export class PDFExtractor {
  constructor(rules: RuleSet | string);

  extractTextFromPDF(pdfBuffer: Buffer | Uint8Array | ArrayBuffer): Promise<string>;

  extract(pdfBuffer: Buffer | Uint8Array | ArrayBuffer): Promise<ExtractionResult>;

  extractFormatted(pdfBuffer: Buffer | Uint8Array | ArrayBuffer): Promise<FormattedResult>;

  getStats(pdfBuffer: Buffer | Uint8Array | ArrayBuffer): Promise<ExtractionStats>;

  exportToCSV(pdfBuffer: Buffer | Uint8Array | ArrayBuffer): Promise<string>;

  exportToMarkdown(pdfBuffer: Buffer | Uint8Array | ArrayBuffer): Promise<string>;
}

export function loadRules(ruleType: RuleType): RuleSet;

export function createExtractor(ruleType: RuleType): PDFExtractor;

export default PDFExtractor;
