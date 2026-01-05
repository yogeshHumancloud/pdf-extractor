#!/usr/bin/env node

const { Command } = require('commander');
const chalk = require('chalk');
const fs = require('fs');
const path = require('path');
const PDFExtractor = require('./extractor');

const program = new Command();

program
  .name('pdf-extract')
  .description('Extract structured data from PDF files using rule files')
  .version('1.0.0');

program
  .command('extract')
  .description('Extract data from a PDF file using a rule file')
  .requiredOption('-p, --pdf <path>', 'Path to PDF file')
  .requiredOption('-r, --rules <path>', 'Path to rules JSON file')
  .option('-f, --format <type>', 'Output format: json, csv, md', 'json')
  .option('-s, --stats', 'Show extraction statistics')
  .option('--raw', 'Include raw PDF text in output (json format only)')
  .option('--console', 'Print to console instead of saving to file')
  .action(async (options) => {
    try {
      // Validate inputs
      if (!fs.existsSync(options.pdf)) {
        console.error(chalk.red(`Error: PDF file not found: ${options.pdf}`));
        process.exit(1);
      }

      if (!fs.existsSync(options.rules)) {
        console.error(chalk.red(`Error: Rules file not found: ${options.rules}`));
        process.exit(1);
      }

      console.log(chalk.blue('🔍 Starting PDF extraction...'));
      console.log(chalk.gray(`PDF: ${options.pdf}`));
      console.log(chalk.gray(`Rules: ${options.rules}`));
      console.log(chalk.gray(`Format: ${options.format}`));
      console.log();

      // Read rules file as JSON object
      const rulesData = JSON.parse(fs.readFileSync(options.rules, 'utf8'));
      const extractor = new PDFExtractor(rulesData);

      // Read PDF file as buffer
      const pdfBuffer = fs.readFileSync(options.pdf);

      // Generate output content based on format
      let outputContent;
      let fileExtension = options.format;

      switch (options.format) {
        case 'csv':
          outputContent = await extractor.exportToCSV(pdfBuffer);
          break;

        case 'md':
          outputContent = await extractor.exportToMarkdown(pdfBuffer);
          break;

        case 'json':
        default:
          const result = await extractor.extract(pdfBuffer);
          // Remove raw text if not requested
          if (!options.raw && result.raw_text) {
            delete result.raw_text;
          }
          outputContent = JSON.stringify(result, null, 2);
          fileExtension = 'json';
          break;
      }

      // Show statistics if requested
      if (options.stats) {
        const stats = await extractor.getStats(pdfBuffer);
        console.log(chalk.yellow('📊 Extraction Statistics:'));
        console.log(chalk.white(`  Total Rules: ${stats.total_rules}`));
        console.log(chalk.green(`  ✓ Found: ${stats.found}`));
        console.log(chalk.red(`  ✗ Not Found: ${stats.not_found}`));
        console.log(chalk.cyan(`  Success Rate: ${stats.success_rate}`));

        if (stats.missing_fields.length > 0) {
          console.log(chalk.yellow(`\n  Missing fields:`));
          stats.missing_fields.forEach(field => {
            console.log(chalk.gray(`    - ${field}`));
          });
        }
        console.log();
      }

      // Output results
      if (options.console) {
        // Print to console
        console.log(outputContent);
      } else {
        // Create output directory and save to file
        const pdfBaseName = path.basename(options.pdf, path.extname(options.pdf));
        const now = new Date();
        const dateTime = now.toISOString()
          .replace(/T/, '_')
          .replace(/:/g, '-')
          .split('.')[0]; // YYYY-MM-DD_HH-MM-SS
        const outputDir = path.join('./output', `${pdfBaseName}_${dateTime}`);
        const outputFileName = `${pdfBaseName}_${dateTime}.${fileExtension}`;
        const outputPath = path.join(outputDir, outputFileName);

        // Create directory if it doesn't exist
        if (!fs.existsSync(outputDir)) {
          fs.mkdirSync(outputDir, { recursive: true });
          console.log(chalk.gray(`Created directory: ${outputDir}`));
        }

        // Write file
        fs.writeFileSync(outputPath, outputContent);
        console.log(chalk.green(`✓ Results saved to: ${outputPath}`));
      }

      console.log(chalk.green('\n✓ Extraction completed successfully!'));
    } catch (error) {
      console.error(chalk.red(`\n✗ Error: ${error.message}`));
      if (error.stack) {
        console.error(chalk.gray(error.stack));
      }
      process.exit(1);
    }
  });

program
  .command('validate')
  .description('Validate a rules file')
  .requiredOption('-r, --rules <path>', 'Path to rules JSON file')
  .action((options) => {
    try {
      if (!fs.existsSync(options.rules)) {
        console.error(chalk.red(`Error: Rules file not found: ${options.rules}`));
        process.exit(1);
      }

      const rules = JSON.parse(fs.readFileSync(options.rules, 'utf8'));

      console.log(chalk.blue('🔍 Validating rules file...'));
      console.log();

      // Basic validation
      const errors = [];
      const warnings = [];

      if (!rules.name) warnings.push('Missing "name" field');
      if (!rules.rules || Object.keys(rules.rules).length === 0) {
        errors.push('No rules defined');
      }

      // Validate each rule
      if (rules.rules) {
        for (const [ruleName, rule] of Object.entries(rules.rules)) {
          if (!rule.pattern) {
            errors.push(`Rule "${ruleName}": missing "pattern" field`);
          }
          if (!rule.type) {
            warnings.push(`Rule "${ruleName}": missing "type" field`);
          }

          // Try to compile regex
          if (rule.pattern && rule.type === 'regex') {
            try {
              new RegExp(rule.pattern);
            } catch (e) {
              errors.push(`Rule "${ruleName}": invalid regex pattern - ${e.message}`);
            }
          }
        }
      }

      // Display results
      console.log(chalk.cyan(`Rules File: ${rules.name || 'Unnamed'}`));
      console.log(chalk.gray(`Total Rules: ${Object.keys(rules.rules || {}).length}`));
      console.log();

      if (errors.length > 0) {
        console.log(chalk.red('❌ Errors:'));
        errors.forEach(err => console.log(chalk.red(`  - ${err}`)));
        console.log();
      }

      if (warnings.length > 0) {
        console.log(chalk.yellow('⚠ Warnings:'));
        warnings.forEach(warn => console.log(chalk.yellow(`  - ${warn}`)));
        console.log();
      }

      if (errors.length === 0) {
        console.log(chalk.green('✓ Rules file is valid!'));

        // Show rule details
        console.log(chalk.cyan('\nRules:'));
        for (const [ruleName, rule] of Object.entries(rules.rules)) {
          console.log(chalk.white(`  • ${ruleName}`));
          if (rule.description) {
            console.log(chalk.gray(`    ${rule.description}`));
          }
        }
      } else {
        console.log(chalk.red('✗ Rules file has errors!'));
        process.exit(1);
      }
    } catch (error) {
      console.error(chalk.red(`Error parsing rules file: ${error.message}`));
      process.exit(1);
    }
  });

program
  .command('info')
  .description('Show information about a rules file')
  .requiredOption('-r, --rules <path>', 'Path to rules JSON file')
  .action((options) => {
    try {
      const rules = JSON.parse(fs.readFileSync(options.rules, 'utf8'));

      console.log(chalk.blue.bold('📋 Rules File Information'));
      console.log();
      console.log(chalk.cyan('Name:'), chalk.white(rules.name || 'N/A'));
      console.log(chalk.cyan('Version:'), chalk.white(rules.version || 'N/A'));
      console.log(chalk.cyan('Description:'), chalk.white(rules.description || 'N/A'));
      console.log(chalk.cyan('Total Rules:'), chalk.white(Object.keys(rules.rules || {}).length));
      console.log();

      if (rules.output_format && rules.output_format.sections) {
        console.log(chalk.cyan('Output Sections:'));
        rules.output_format.sections.forEach(section => {
          console.log(chalk.white(`  • ${section.name} (${section.fields.length} fields)`));
        });
        console.log();
      }

      console.log(chalk.cyan('Available Rules:'));
      for (const [ruleName, rule] of Object.entries(rules.rules || {})) {
        console.log(chalk.white(`  • ${ruleName}`));
        console.log(chalk.gray(`    Type: ${rule.type || 'N/A'}`));
        if (rule.transform) {
          console.log(chalk.gray(`    Transform: ${rule.transform}`));
        }
        if (rule.description) {
          console.log(chalk.gray(`    ${rule.description}`));
        }
        console.log();
      }
    } catch (error) {
      console.error(chalk.red(`Error: ${error.message}`));
      process.exit(1);
    }
  });

function printSimple(result) {
  if (result.sections) {
    // Formatted output
    result.sections.forEach(section => {
      console.log(chalk.cyan.bold(`\n${section.name}:`));
      for (const [key, field] of Object.entries(section.fields)) {
        if (field.found) {
          console.log(chalk.white(`  ${field.label}: ${chalk.green(field.value)}`));
        } else {
          console.log(chalk.white(`  ${field.label}: ${chalk.red('Not found')}`));
        }
      }
    });
  } else {
    // Raw output
    for (const [key, data] of Object.entries(result.data)) {
      const label = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      if (data.found) {
        console.log(chalk.white(`${label}: ${chalk.green(data.value)}`));
      } else {
        console.log(chalk.white(`${label}: ${chalk.red('Not found')}`));
      }
    }
  }
}

function printFormatted(result) {
  console.log();
  console.log(chalk.blue.bold('═══════════════════════════════════════════════════'));
  console.log(chalk.blue.bold('           ITR-1 EXTRACTION RESULTS'));
  console.log(chalk.blue.bold('═══════════════════════════════════════════════════'));

  if (result.sections) {
    result.sections.forEach((section, idx) => {
      console.log();
      console.log(chalk.cyan.bold(`┌─ ${section.name}`));
      console.log(chalk.cyan('│'));

      for (const [key, field] of Object.entries(section.fields)) {
        if (field.found) {
          console.log(chalk.cyan('│ ') + chalk.white(field.label.padEnd(30)) + chalk.green(field.value));
        } else {
          console.log(chalk.cyan('│ ') + chalk.white(field.label.padEnd(30)) + chalk.red('Not found'));
        }
      }

      if (idx < result.sections.length - 1) {
        console.log(chalk.cyan('│'));
      }
    });
    console.log(chalk.cyan('└' + '─'.repeat(50)));
  }
}

program.parse();
