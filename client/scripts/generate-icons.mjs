// client/scripts/generate-icons.mjs
// Run: node client/scripts/generate-icons.mjs
// Requires: npm install sharp (run once, dev only)

import sharp from 'sharp';
import { readFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ICONS_DIR = join(__dirname, '../public/icons');
const SVG_PATH  = join(__dirname, '../public/favicon.svg');

mkdirSync(ICONS_DIR, { recursive: true });

const SIZES = [72, 96, 128, 144, 152, 192, 384, 512];

const svgBuffer = readFileSync(SVG_PATH);

for (const size of SIZES) {
  await sharp(svgBuffer)
    .resize(size, size)
    .png()
    .toFile(join(ICONS_DIR, `icon-${size}x${size}.png`));
  console.log(`✓ icon-${size}x${size}.png`);
}

// Also generate a screenshot placeholder
await sharp({
  create: { width: 540, height: 720, channels: 4, background: { r: 2, g: 6, b: 23, alpha: 1 } }
}).png().toFile(join(ICONS_DIR, 'screenshot-mobile.png'));
console.log('✓ screenshot-mobile.png');

console.log('\nAll icons generated in client/public/icons/');