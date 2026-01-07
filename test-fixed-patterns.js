#!/usr/bin/env node

/**
 * Test fixed patterns for key GSTR2B fields
 */

const fs = require('fs');

async function main() {
  const unpdf = await import('unpdf');

  // Extract text from PDF
  const pdfBuffer = fs.readFileSync('/Users/yogeshvitekar/Desktop/rules_cli/pdf/2B.pdf');
  const pdf = await unpdf.getDocumentProxy(new Uint8Array(pdfBuffer));

  let fullText = '';
  for (let i = 1; i <= Math.min(pdf.numPages, 3); i++) {  // Just first 3 pages for testing
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map(item => item.str).join(' ');
    fullText += pageText + ' ';
  }

  console.log('🔍 Testing improved patterns...\n');
  console.log('='.repeat(80));

  // Test patterns with improved whitespace handling
  const testPatterns = {
    financial_year: {
      old: "Financial Year\\s*(\\d{4}-\\d{2})",
      new: "Financial\\s+Year\\s+(\\d{4}-\\d{2})"
    },
    period: {
      old: "Period\\s*([A-Za-z]{3}-[A-Za-z]{3})",
      new: "Period\\s+([A-Za-z]{3}-?\\s*[A-Za-z]{3})"
    },
    legal_name: {
      old: "2\\(a\\)\\.Legal name of the registered person\\s*([A-Za-z\\s]+?)2\\(b\\)",
      new: "2\\(a\\)\\.Legal\\s+name\\s+of\\s+the\\s+registered\\s+person\\s+([A-Za-z\\s]+?)2\\(b\\)"
    },
    trade_name: {
      old: "2\\(b\\)\\.Trade name, if any\\s*([A-Za-z0-9\\s\\-]+?)2\\(c\\)",
      new: "2\\(b\\)\\.Trade\\s+name,\\s+if\\s+any\\s+([A-Za-z0-9\\s\\-]+?)2\\(c\\)"
    },
    date_of_generation: {
      old: "2\\(c\\)\\.Date of generation\\s*(\\d{2}/\\d{2}/\\d{4})",
      new: "2\\(c\\)\\.Date\\s+of\\s+generation\\s+(\\d{2}/\\d{2}/\\d{4})"
    },
    b2b_invoices_integrated_tax: {
      old: "B2B - Invoices \\(IMS\\)\\s*([\\d,]+\\.\\d{2})\\s*[\\d,]+\\.\\d{2}\\s*[\\d,]+\\.\\d{2}\\s*[\\d,]+\\.\\d{2}",
      new: "B2B\\s+-\\s+Invoices\\s+\\(IMS\\)\\s+([\\d,]+\\.\\d{2})\\s+[\\d,]+\\.\\d{2}\\s+[\\d,]+\\.\\d{2}\\s+[\\d,]+\\.\\d{2}"
    }
  };

  for (const [key, patterns] of Object.entries(testPatterns)) {
    console.log(`\n📝 Testing: ${key}`);
    console.log(`   Old pattern: ${patterns.old}`);
    console.log(`   New pattern: ${patterns.new}`);

    // Test old pattern
    const oldMatch = fullText.match(new RegExp(patterns.old, 'i'));
    console.log(`   Old match: ${oldMatch ? '✅ ' + oldMatch[0].substring(0, 60) : '❌ NO MATCH'}`);

    // Test new pattern
    const newMatch = fullText.match(new RegExp(patterns.new, 'i'));
    console.log(`   New match: ${newMatch ? '✅ ' + newMatch[0].substring(0, 60) : '❌ NO MATCH'}`);

    if (newMatch && newMatch[1]) {
      console.log(`   Captured value: "${newMatch[1].trim()}"`);
    }
  }

  console.log('\n' + '='.repeat(80));
}

main().catch(console.error);
