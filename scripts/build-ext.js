#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const distDir = path.join(__dirname, '..', 'dist');
const extDir = path.join(__dirname, '..', 'ext');

// Ensure ext directory exists
if (fs.existsSync(extDir)) {
  fs.rmSync(extDir, { recursive: true, force: true });
}
fs.mkdirSync(extDir, { recursive: true });

// Copy function
function copyFile(src, dest) {
  const destDir = path.dirname(dest);
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }
  fs.copyFileSync(src, dest);
}

function copyDir(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      copyFile(srcPath, destPath);
    }
  }
}

// Copy compiled JavaScript files from dist
console.log('Copying compiled JavaScript files...');
const jsFiles = [
  { src: path.join(distDir, 'background.js'), dest: path.join(extDir, 'background.js') },
  { src: path.join(distDir, 'storage.js'), dest: path.join(extDir, 'storage.js') },
  { src: path.join(distDir, 'popup', 'popup.js'), dest: path.join(extDir, 'popup', 'popup.js') },
  { src: path.join(distDir, 'options', 'options.js'), dest: path.join(extDir, 'options', 'options.js') }
];

for (const file of jsFiles) {
  if (fs.existsSync(file.src)) {
    copyFile(file.src, file.dest);
    console.log(`  ✓ ${path.relative(extDir, file.dest)}`);
  } else {
    console.warn(`  ⚠ Missing: ${file.src}`);
  }
}

// Copy manifest.json
console.log('\nCopying manifest.json...');
copyFile(
  path.join(__dirname, '..', 'manifest.json'),
  path.join(extDir, 'manifest.json')
);
console.log('  ✓ manifest.json');

// Copy HTML and CSS files
console.log('\nCopying HTML and CSS files...');
const staticFiles = [
  { src: path.join(__dirname, '..', 'popup', 'popup.html'), dest: path.join(extDir, 'popup', 'popup.html') },
  { src: path.join(distDir, 'popup', 'popup.css'), dest: path.join(extDir, 'popup', 'popup.css') },
  { src: path.join(__dirname, '..', 'options', 'options.html'), dest: path.join(extDir, 'options', 'options.html') },
  { src: path.join(distDir, 'options', 'options.css'), dest: path.join(extDir, 'options', 'options.css') }
];

for (const file of staticFiles) {
  if (fs.existsSync(file.src)) {
    copyFile(file.src, file.dest);
    console.log(`  ✓ ${path.relative(extDir, file.dest)}`);
  } else {
    console.warn(`  ⚠ Missing: ${file.src}`);
  }
}

// Copy icons directory
console.log('\nCopying icons directory...');
const iconsSrc = path.join(__dirname, '..', 'icons');
const iconsDest = path.join(extDir, 'icons');
if (fs.existsSync(iconsSrc)) {
  copyDir(iconsSrc, iconsDest);
  console.log('  ✓ icons/');
} else {
  console.warn(`  ⚠ Missing: ${iconsSrc}`);
}

console.log('\n✓ Extension files copied to ext/ directory');

