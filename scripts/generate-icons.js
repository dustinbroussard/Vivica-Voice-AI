import sharp from 'sharp';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const svgPath = join(__dirname, '../public/icon.svg');
const output192 = join(__dirname, '../public/icon-192x192.png');
const output512 = join(__dirname, '../public/icon-512x512.png');

async function generateIcons() {
  try {
    await sharp(svgPath)
      .resize(192, 192)
      .png()
      .toFile(output192);
    console.log('Generated icon-192x192.png');

    await sharp(svgPath)
      .resize(512, 512)
      .png()
      .toFile(output512);
    console.log('Generated icon-512x512.png');
  } catch (error) {
    console.error('Error generating icons:', error);
    process.exit(1);
  }
}

generateIcons();
