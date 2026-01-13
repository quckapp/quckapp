#!/usr/bin/env ts-node
/**
 * Post-generation script for the QuikApp API client
 *
 * This script runs after openapi-typescript generates the schema types.
 * It can be used for additional processing, validation, or customization.
 */

/* eslint-disable @typescript-eslint/no-var-requires */
const fs = require('fs');
const path = require('path');

const GENERATED_DIR = path.join(__dirname, '../src/generated');
const SCHEMA_FILE = path.join(GENERATED_DIR, 'schema.ts');

function main() {
  console.log('Running post-generation script...');

  // Verify the schema file was generated
  if (!fs.existsSync(SCHEMA_FILE)) {
    console.error('Error: schema.ts was not generated. Run generate:types first.');
    process.exit(1);
  }

  // Get file stats
  const stats = fs.statSync(SCHEMA_FILE);
  const fileSizeKB = (stats.size / 1024).toFixed(2);

  console.log(`Generated schema.ts (${fileSizeKB} KB)`);

  // Count exported types (rough estimate)
  const content = fs.readFileSync(SCHEMA_FILE, 'utf-8');
  const interfaceCount = (content.match(/export (interface|type) /g) || []).length;
  const pathCount = (content.match(/paths\["/g) || []).length;

  console.log(`  - Types/Interfaces: ~${interfaceCount}`);
  console.log(`  - API Paths: ~${pathCount}`);

  // Create an index file for generated types
  const indexContent = `/**
 * Generated types from OpenAPI specification
 * DO NOT EDIT - This file is auto-generated
 */
export * from './schema';
`;

  fs.writeFileSync(path.join(GENERATED_DIR, 'index.ts'), indexContent);
  console.log('Created generated/index.ts');

  console.log('Post-generation complete!');
}

main();
