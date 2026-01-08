import fs from 'fs';
import * as unpdf from 'unpdf';

const pdfBuffer = fs.readFileSync('pdf/3B.pdf');
const pdf = await unpdf.getDocumentProxy(new Uint8Array(pdfBuffer));
const { text } = await unpdf.extractText(pdf, { mergePages: true });

// Test the NEW pattern for outward_taxable_supplies_total_value
const pattern = /\(a\) Outward taxable supplies[^\d]*?\s+\s*([\d,]+\.\d{2})/gim;
const match = pattern.exec(text);

console.log('New Pattern:', pattern);
console.log('\nMatch:', match ? match[0] : 'null');

if (match) {
  console.log('\nGroup 1 (captured value):', match[1]);
  console.log('✅ Expected: 947178.00');
  console.log(match[1] === '947178.00' ? '✅ CORRECT!' : `❌ WRONG (got ${match[1]})`);
}
