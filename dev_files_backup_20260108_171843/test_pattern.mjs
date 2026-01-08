import fs from 'fs';
import * as unpdf from 'unpdf';

const pdfBuffer = fs.readFileSync('pdf/3B.pdf');
const pdf = await unpdf.getDocumentProxy(new Uint8Array(pdfBuffer));
const { text } = await unpdf.extractText(pdf, { mergePages: true });

// Test the pattern for outward_taxable_supplies_total_value
const pattern = /\(a\) Outward taxable supplies[\s\S]{1,100}\s+\s*([\d,]+\.\d{2})/gim;
const match = pattern.exec(text);

console.log('Pattern:', pattern);
console.log('\nMatch:', match);

if (match) {
  console.log('\nFull match:', JSON.stringify(match[0]));
  console.log('Group 1 (captured value):', match[1]);
} else {
  console.log('\n❌ No match found');

  // Show the actual text around "Outward taxable supplies"
  const idx = text.indexOf('(a) Outward taxable supplies');
  if (idx !== -1) {
    console.log('\nActual text context:');
    console.log(JSON.stringify(text.substring(idx, idx + 200)));
  }
}
