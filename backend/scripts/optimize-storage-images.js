/**
 * Optimize all existing images in Supabase Storage bucket.
 * Downloads each image, resizes to max 1200px wide, compresses to JPEG quality 85,
 * and re-uploads (upsert) to the same path.
 *
 * Usage: node scripts/optimize-storage-images.js
 */
require('dotenv').config();
const supabase = require('../supabaseClient');
const sharp = require('sharp');

const BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'product-images';
const MAX_WIDTH = 1200;
const JPEG_QUALITY = 85;

async function listAllFiles(folder) {
  const files = [];
  const { data, error } = await supabase.storage.from(BUCKET).list(folder, { limit: 1000 });
  if (error) {
    console.error(`Error listing ${folder}:`, error.message);
    return files;
  }
  for (const item of data || []) {
    const fullPath = folder ? `${folder}/${item.name}` : item.name;
    if (item.id) {
      // It's a file
      files.push(fullPath);
    } else {
      // It's a folder — recurse
      const subFiles = await listAllFiles(fullPath);
      files.push(...subFiles);
    }
  }
  return files;
}

async function optimizeImage(filePath) {
  // Download
  const { data: blob, error: dlErr } = await supabase.storage.from(BUCKET).download(filePath);
  if (dlErr) {
    console.error(`  ✗ Download failed: ${filePath}`, dlErr.message);
    return null;
  }

  const arrayBuffer = await blob.arrayBuffer();
  const inputBuffer = Buffer.from(arrayBuffer);
  const originalKB = (inputBuffer.length / 1024).toFixed(1);

  // Get metadata
  const meta = await sharp(inputBuffer).metadata();
  const isImage = ['jpeg', 'jpg', 'png', 'webp', 'gif'].includes(meta.format);
  if (!isImage) {
    console.log(`  – Skipped (not an image): ${filePath}`);
    return null;
  }

  // Resize + compress → always output as JPEG for best compression
  const pipeline = sharp(inputBuffer).resize({ width: MAX_WIDTH, withoutEnlargement: true });

  let outputBuffer;
  let contentType;
  if (meta.format === 'png') {
    outputBuffer = await pipeline.png({ quality: JPEG_QUALITY, compressionLevel: 9 }).toBuffer();
    contentType = 'image/png';
  } else if (meta.format === 'webp') {
    outputBuffer = await pipeline.webp({ quality: JPEG_QUALITY }).toBuffer();
    contentType = 'image/webp';
  } else {
    // jpeg, gif, or others → convert to jpeg
    outputBuffer = await pipeline.jpeg({ quality: JPEG_QUALITY, mozjpeg: true }).toBuffer();
    contentType = 'image/jpeg';
  }

  const newKB = (outputBuffer.length / 1024).toFixed(1);
  const savings = ((1 - outputBuffer.length / inputBuffer.length) * 100).toFixed(0);

  // Skip if optimized is larger or only marginally smaller (<5%)
  if (outputBuffer.length >= inputBuffer.length * 0.95) {
    console.log(`  – Already optimized: ${filePath} (${originalKB} KB)`);
    return null;
  }

  // Re-upload (upsert)
  const { error: upErr } = await supabase.storage
    .from(BUCKET)
    .upload(filePath, outputBuffer, { contentType, upsert: true });

  if (upErr) {
    console.error(`  ✗ Upload failed: ${filePath}`, upErr.message);
    return null;
  }

  console.log(`  ✓ ${filePath}: ${originalKB} KB → ${newKB} KB (−${savings}%)`);
  return { file: filePath, before: parseFloat(originalKB), after: parseFloat(newKB) };
}

(async () => {
  console.log(`\nOptimizing images in bucket "${BUCKET}"...\n`);
  console.log(`Settings: max width ${MAX_WIDTH}px, quality ${JPEG_QUALITY}\n`);

  // List files in "items" folder (where product images are stored)
  const files = await listAllFiles('items');
  if (files.length === 0) {
    // Try root level too
    const rootFiles = await listAllFiles('');
    files.push(...rootFiles);
  }

  const imageFiles = files.filter(f => /\.(jpe?g|png|webp|gif)$/i.test(f));
  console.log(`Found ${imageFiles.length} image file(s)\n`);

  let totalBefore = 0;
  let totalAfter = 0;
  let optimized = 0;

  for (const file of imageFiles) {
    const result = await optimizeImage(file);
    if (result) {
      totalBefore += result.before;
      totalAfter += result.after;
      optimized++;
    }
  }

  console.log(`\n${'='.repeat(50)}`);
  console.log(`Done! Optimized ${optimized} of ${imageFiles.length} images.`);
  if (optimized > 0) {
    console.log(`Total: ${totalBefore.toFixed(0)} KB → ${totalAfter.toFixed(0)} KB (−${((1 - totalAfter / totalBefore) * 100).toFixed(0)}%)`);
  }
  process.exit(0);
})();
