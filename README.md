# Indian Tax PDF Extractor - Monorepo

This repository contains the **indian-tax-pdf-extractor** package and its React demo application.

---

## 📁 Project Structure

```
rules_cli/
├── package/                    ← NPM Package
│   ├── index.js               - Main entry point
│   ├── extractor.js           - PDFExtractor class
│   ├── cli.js                 - CLI tool
│   ├── package.json           - Package configuration
│   ├── rules/                 - Extraction rules (GSTR-1, GSTR-2B, GSTR-3B, ITR-1)
│   ├── pdf/                   - Sample PDFs
│   ├── tests/                 - Test suite
│   └── README.md              - Package documentation
│
└── test_react/                ← React Demo App
    ├── src/                   - React components
    ├── public/                - Static assets
    └── package.json           - React app config
```

---

## 🚀 Quick Start

### NPM Package

The package extracts data from Indian tax PDFs (ITR-1, GSTR-1, GSTR-2B, GSTR-3B).

```bash
# Navigate to package directory
cd package

# Install dependencies
npm install

# Build package
npm pack

# Test extraction
node cli.js extract pdf/2B.pdf rules/gstr2b-rules.json
```

**Package Documentation:** See [package/README.md](package/README.md)

### React Demo App

Interactive web interface for PDF extraction with selection-based filtering.

```bash
# Navigate to React app
cd test_react

# Install dependencies
npm install

# Start development server
npm start
```

**App runs on:** http://localhost:3000

---

## 📦 Package Details

**Name:** `indian-tax-pdf-extractor`
**Version:** 2.1.0
**Status:** ✅ Production Ready

### Features
- ✅ Extract data from ITR-1, GSTR-1, GSTR-2B, GSTR-3B PDFs
- ✅ Full PDF text extraction using regex patterns
- ✅ Selection-based extraction with coordinate filtering
- ✅ Command-line interface (CLI)
- ✅ React integration ready
- ✅ TypeScript support

### Extraction Rates
- **GSTR-2B:** 262/262 fields (100%)
- **GSTR-3B:** 31/132 fields (23.5%) with 100% accuracy
- **ITR-1:** 32/33 fields (97%)
- **Overall:** 325/427 fields (76.1%)

---

## 🧪 Testing

### Run Package Tests
```bash
cd package/tests
python3 comprehensive_extraction_test.py
```

### Test Results
- ✅ 0 regex errors
- ✅ 100% value accuracy
- ✅ All PDFs tested and working

---

## 📚 Documentation

- **Package README:** [package/README.md](package/README.md)
- **Production Checklist:** [package/PRODUCTION_READY.md](package/PRODUCTION_READY.md)
- **Cleanup Summary:** [package/CLEANUP_SUMMARY.md](package/CLEANUP_SUMMARY.md)
- **Test Documentation:** [package/tests/README.md](package/tests/README.md)

---

## 🔧 Development

### Package Development
```bash
cd package
npm install
# Make changes to index.js, extractor.js, etc.
npm pack  # Build package
```

### React App Development
```bash
cd test_react
npm install
npm start  # Start dev server
```

### Update Package in React App
```bash
# From root directory
cd package
npm pack

cd ../test_react
npm install ../package/indian-tax-pdf-extractor-2.1.0.tgz
```

---

## 📝 Publishing

### Publish to NPM
```bash
cd package
npm publish
```

### Create GitHub Release
```bash
git tag v2.1.0
git push origin v2.1.0
```

---

## 🎯 Key Achievements

- **GSTR-3B Improvements:** Extraction rate improved from 3.8% → 23.5% (+520%)
- **Value Accuracy:** 100% accurate (e.g., 947178.00 instead of 0.00)
- **Zero Errors:** All regex patterns fixed and working
- **Production Ready:** Clean codebase, tested, and documented

---

## 📄 License

ISC

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes in `package/` directory
4. Run tests: `cd package/tests && python3 comprehensive_extraction_test.py`
5. Submit a pull request

---

## 📧 Support

For issues, questions, or contributions, please open an issue on GitHub.

---

**Version:** 2.1.0
**Last Updated:** January 8, 2026
**Status:** ✅ Production Ready
