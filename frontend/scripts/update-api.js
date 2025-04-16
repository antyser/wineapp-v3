#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');

const API_URL = 'http://localhost:8000/api/v1/openapi.json';
const OUTPUT_PATH = path.join(__dirname, '..', 'src', 'api', 'openapi.json');

console.log('🔄 Downloading latest OpenAPI specification...');

// Ensure the directory exists
const outputDir = path.dirname(OUTPUT_PATH);
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Function to download the OpenAPI spec
function downloadSpec() {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(OUTPUT_PATH);

    http
      .get(API_URL, response => {
        if (response.statusCode !== 200) {
          reject(new Error(`Failed to download spec: ${response.statusCode}`));
          return;
        }

        response.pipe(file);

        file.on('finish', () => {
          file.close();
          console.log('✅ OpenAPI spec downloaded successfully');
          resolve();
        });
      })
      .on('error', err => {
        fs.unlink(OUTPUT_PATH, () => {}); // Delete the file if there was an error
        console.error('❌ Error downloading OpenAPI spec:', err.message);
        reject(err);
      });
  });
}

// Main function
async function main() {
  try {
    // Download the latest spec
    await downloadSpec();

    // Run the openapi-ts generator
    console.log('🔄 Generating API client...');
    execSync('npx openapi-ts', { stdio: 'inherit' });

    console.log('✅ API client generated successfully');
  } catch (error) {
    console.error('❌ Failed to update API client:', error.message);
    process.exit(1);
  }
}

main();
