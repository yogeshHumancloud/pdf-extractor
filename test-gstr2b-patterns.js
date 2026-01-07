#!/usr/bin/env node

/**
 * Test GSTR2B regex patterns against actual PDF text
 */

const fs = require('fs');

async function main() {
  const unpdf = await import('unpdf');

  const pdfPath = '/Users/yogeshvitekar/Desktop/rules_cli/pdf/2B.pdf';
  const rulesPath = '/Users/yogeshvitekar/Desktop/rules_cli/rules/gstr2b-rules.json';

  console.log('📄 Reading PDF...');
  const pdfBuffer = fs.readFileSync(pdfPath);
  const pdf = await unpdf.getDocumentProxy(new Uint8Array(pdfBuffer));

  console.log('⚙️  Reading rules...');
  const rules = JSON.parse(fs.readFileSync(rulesPath, 'utf8'));

  // Extract all text from all pages
  console.log('📝 Extracting text from all pages...\n');
  let fullText = '';

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map(item => item.str).join(' ');
    fullText += pageText + '\n';
  }

  // Test each pattern
  let matched = 0;
  let failed = 0;
  const failedFields = [];

  console.log('🔍 Testing patterns...\n');
  console.log('='.repeat(80));

  for (const [key, rule] of Object.entries(rules.rules)) {
    if (rule.coordinates) {
      console.log(`⏭️  ${key}: Already has coordinates`);
      continue;
    }

    const pattern = new RegExp(rule.pattern, 'gis');
    const match = fullText.match(pattern);

    if (match) {
      console.log(`✅ ${key}: MATCHED`);
      console.log(`   Pattern: ${rule.pattern}`);
      console.log(`   Match: ${match[0].substring(0, 100)}...`);
      console.log('');
      matched++;
    } else {
      console.log(`❌ ${key}: NO MATCH`);
      failed++;
      failedFields.push(key);
    }
  }

  console.log('='.repeat(80));
  console.log(`\n📊 Summary:`);
  console.log(`✅ Matched: ${matched}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Success rate: ${((matched / (matched + failed)) * 100).toFixed(1)}%`);

  if (failedFields.length > 0) {
    console.log(`\n❌ Failed fields (${failedFields.length}):`);
    failedFields.slice(0, 20).forEach((field, i) => {
      console.log(`   ${i + 1}. ${field}`);
    });
    if (failedFields.length > 20) {
      console.log(`   ... and ${failedFields.length - 20} more`);
    }
  }

  // Save full text to file for manual inspection
  fs.writeFileSync('/Users/yogeshvitekar/Desktop/rules_cli/gstr2b-extracted-text.txt', fullText);
  console.log('\n💾 Full extracted text saved to: gstr2b-extracted-text.txt');
}

main().catch(console.error);
