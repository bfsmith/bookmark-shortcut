#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Read package.json to get the new version
const packageJsonPath = path.join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
const newVersion = packageJson.version;

// Read manifest.json
const manifestPath = path.join(__dirname, '..', 'manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

// Update version in manifest.json
manifest.version = newVersion;

// Write updated manifest.json
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');

console.log(`Updated manifest.json version to ${newVersion}`);
