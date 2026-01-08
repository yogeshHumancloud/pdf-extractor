import fs from 'fs';
import * as unpdf from 'unpdf';

const pdfBuffer = fs.readFileSync('pdf/3B.pdf');
const pdf = await unpdf.getDocumentProxy(new Uint8Array(pdfBuffer));
const { text } = await unpdf.extractText(pdf, { mergePages: true });

// Show first 1500 chars
console.log('=== extractText output (first 1500 chars) ===');
console.log(text.substring(0, 1500));

// Count newlines
const newlineCount = (text.match(/\n/g) || []).length;
console.log(`\n\nTotal newlines in text: ${newlineCount}`);
console.log(`Total length: ${text.length}`);

// Find the (a) Outward section
const idx = text.indexOf('Outward   taxable   supplies');
if (idx !== -1) {
  console.log('\n=== Found "Outward taxable supplies" at position', idx, '===');
  console.log('Context (300 chars):');
  console.log(JSON.stringify(text.substring(Math.max(0, idx-20), idx+280)));
}
