#!/usr/bin/env node
/**
 * Test script to verify the package works correctly
 */

const { createExtractor, loadRules, PDFExtractor } = require('./index.js');
const fs = require('fs');

console.log('🧪 Testing Indian Tax PDF Extractor Package\n');

// Test 1: Load rules
console.log('Test 1: Loading rules...');
try {
  const itrRules = loadRules('itr');
  const gstr1Rules = loadRules('gstr1');
  const gstr2bRules = loadRules('gstr2b');
  const gstr3bRules = loadRules('gstr3b');

  console.log('✅ All rules loaded successfully');
  console.log(`   - ITR rules: ${Object.keys(itrRules.rules).length} fields`);
  console.log(`   - GSTR-1 rules: ${Object.keys(gstr1Rules.rules).length} fields`);
  console.log(`   - GSTR-2B rules: ${Object.keys(gstr2bRules.rules).length} fields`);
  console.log(`   - GSTR-3B rules: ${Object.keys(gstr3bRules.rules).length} fields`);
} catch (error) {
  console.error('❌ Failed to load rules:', error.message);
  process.exit(1);
}

// Test 2: Create extractor
console.log('\nTest 2: Creating extractors...');
try {
  const extractor1 = createExtractor('itr');
  const extractor2 = new PDFExtractor(loadRules('gstr1'));
  console.log('✅ Extractors created successfully');
} catch (error) {
  console.error('❌ Failed to create extractors:', error.message);
  process.exit(1);
}

// Test 3: Extract from real PDF (if available)
console.log('\nTest 3: Testing extraction...');
if (fs.existsSync('itrsss.pdf')) {
  (async () => {
    try {
      const extractor = createExtractor('itr');
      const pdfBuffer = fs.readFileSync('itrsss.pdf');
      const results = await extractor.extract(pdfBuffer);
      const stats = await extractor.getStats(pdfBuffer);

      console.log('✅ Extraction successful');
      console.log(`   - Success rate: ${stats.success_rate}`);
      console.log(`   - Fields found: ${stats.found}/${stats.total_rules}`);

      // Test export formats
      const csv = await extractor.exportToCSV(pdfBuffer);
      const markdown = await extractor.exportToMarkdown(pdfBuffer);
      console.log('✅ Export formats working');
      console.log(`   - CSV length: ${csv.length} chars`);
      console.log(`   - Markdown length: ${markdown.length} chars`);

      console.log('\n✅ All tests passed! Package is ready to use.');
    } catch (error) {
      console.error('❌ Extraction failed:', error.message);
      process.exit(1);
    }
  })();
} else {
  console.log('⚠️  Skipped (no test PDF found)');
  console.log('\n✅ Basic tests passed! Package structure is correct.');
}
