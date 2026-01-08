#!/usr/bin/env node

/**
 * Extract raw text from 3B.pdf to analyze content
 */

const fs = require('fs');

async function main() {
  const unpdf = await import('unpdf');

  const pdfPath = '/Users/yogeshvitekar/Desktop/rules_cli/pdf/3B.pdf';
  const pdfBuffer = fs.readFileSync(pdfPath);
  const uint8Array = new Uint8Array(pdfBuffer);

  const pdf = await unpdf.getDocumentProxy(uint8Array);
  console.log(`PDF has ${pdf.numPages} pages\n`);

  // Extract text from all pages
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();

    console.log(`\n${'='.repeat(80)}`);
    console.log(`PAGE ${i}`);
    console.log('='.repeat(80));

    const pageText = textContent.items.map(item => item.str).join(' ');
    console.log(pageText);

    // Also show first 20 text items with coordinates
    console.log(`\n--- First 20 text items with coordinates ---`);
    textContent.items.slice(0, 20).forEach((item, idx) => {
      const x = item.transform[4];
      const y = item.transform[5];
      console.log(`${idx+1}. "${item.str}" at (${x.toFixed(2)}, ${y.toFixed(2)}) w=${item.width.toFixed(2)}`);
    });
  }
}

main().catch(console.error);
