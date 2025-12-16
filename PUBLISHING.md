# Publishing Guide

## Testing Locally

### 1. Test with the included HTML file

```bash
# Make sure you've built the package
npm run build

# Open test.html in your browser
open test.html
```

Upload a PDF file and verify that:
- Text extraction works
- Tables are detected
- Metadata is displayed
- No console errors

### 2. Test with npm link

```bash
# In this package directory
npm link

# In another project
npm link @yogeshvitekar/pdf-reader

# Use it in your project
import PDFReader from '@yogeshvitekar/pdf-reader';
```

## Publishing to NPM

### Prerequisites

1. Create an NPM account at https://www.npmjs.com/signup
2. Login to NPM in your terminal:

```bash
npm login
```

### Update Package Name (if needed)

If the package name `@yogeshvitekar/pdf-reader` is already taken, update it in `package.json`:

```json
{
  "name": "@your-username/pdf-reader",
  ...
}
```

### Pre-publish Checklist

- [ ] All tests pass locally
- [ ] README.md is complete and accurate
- [ ] package.json has correct version, description, keywords
- [ ] LICENSE file is present
- [ ] .gitignore excludes node_modules and sensitive files
- [ ] Code is built (`npm run build`)
- [ ] All dependencies are correctly listed in package.json

### Publish

```bash
# Make sure you're logged in
npm whoami

# Dry run to see what will be published
npm publish --dry-run

# Publish the package (for scoped packages, add --access public)
npm publish --access public
```

### Version Updates

For future releases:

```bash
# Patch release (1.0.0 -> 1.0.1)
npm version patch

# Minor release (1.0.0 -> 1.1.0)
npm version minor

# Major release (1.0.0 -> 2.0.0)
npm version major

# Then publish
npm publish --access public
```

## After Publishing

1. Verify your package at: `https://www.npmjs.com/package/@yogeshvitekar/pdf-reader`

2. Test installation in a new project:

```bash
mkdir test-project
cd test-project
npm init -y
npm install @yogeshvitekar/pdf-reader pdfjs-dist
```

3. Create a test file:

```javascript
import PDFReader from '@yogeshvitekar/pdf-reader';

// Test code here
```

## Updating the Package

When you make changes:

1. Update code
2. Run tests
3. Build: `npm run build`
4. Update CHANGELOG.md
5. Bump version: `npm version patch/minor/major`
6. Publish: `npm publish --access public`
7. Push to git: `git push && git push --tags`

## GitHub Repository (Recommended)

1. Create a GitHub repository
2. Initialize git and push:

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/yogeshvitekar/pdf-reader.git
git push -u origin main
```

3. Create releases on GitHub matching npm versions
4. Add GitHub Actions for automated testing/publishing (optional)

## Troubleshooting

### Package name already exists
Change the package name in package.json or use a scoped name like `@your-username/package-name`

### 403 Forbidden
Make sure you're logged in with `npm login` and have permission to publish scoped packages

### Build errors
Delete node_modules and package-lock.json, then:
```bash
npm install
npm run build
```

## Support

For issues, create a GitHub issue at:
https://github.com/yogeshvitekar/pdf-reader/issues
