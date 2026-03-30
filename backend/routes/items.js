const express = require('express');
const supabase = require('../supabaseClient');
const { verifyToken, requireAdmin } = require('../middleware/auth');
const multer = require('multer');
const sharp = require('sharp');

const IMAGE_MAX_WIDTH = 1200;
const IMAGE_QUALITY = 85;

// Optimize an image buffer: resize to max width, compress, keep format
async function optimizeBuffer(buffer, mimetype) {
  const meta = await sharp(buffer).metadata();
  const pipeline = sharp(buffer).resize({ width: IMAGE_MAX_WIDTH, withoutEnlargement: true });

  if (mimetype === 'image/png') {
    return { buffer: await pipeline.png({ quality: IMAGE_QUALITY, compressionLevel: 9 }).toBuffer(), contentType: 'image/png' };
  }
  if (mimetype === 'image/webp') {
    return { buffer: await pipeline.webp({ quality: IMAGE_QUALITY }).toBuffer(), contentType: 'image/webp' };
  }
  // jpeg, gif, others → jpeg
  return { buffer: await pipeline.jpeg({ quality: IMAGE_QUALITY, mozjpeg: true }).toBuffer(), contentType: 'image/jpeg' };
}
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB per file
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowed.includes(file.mimetype)) {
      return cb(new Error('Tipo di file non permesso. Solo JPEG, PNG, WebP e GIF.'));
    }
    cb(null, true);
  }
});
const router = express.Router();

// Magic bytes validation for image files
const IMAGE_SIGNATURES = {
  'image/jpeg': [Buffer.from([0xFF, 0xD8, 0xFF])],
  'image/png': [Buffer.from([0x89, 0x50, 0x4E, 0x47])],
  'image/gif': [Buffer.from('GIF87a'), Buffer.from('GIF89a')],
  'image/webp': null, // checked separately (RIFF....WEBP)
};

function validateImageMagicBytes(buffer, mimetype) {
  if (!buffer || buffer.length < 12) return false;
  if (mimetype === 'image/webp') {
    return buffer.slice(0, 4).toString() === 'RIFF' && buffer.slice(8, 12).toString() === 'WEBP';
  }
  const sigs = IMAGE_SIGNATURES[mimetype];
  if (!sigs) return false;
  return sigs.some(sig => buffer.slice(0, sig.length).equals(sig));
}

// In-memory cache for signed URLs (pathString -> { url, expiresAt })
const signedUrlCache = new Map();
const CACHE_TTL = 50 * 60 * 1000; // 50 minutes (signed URLs last 1 hour)
const REFRESH_THRESHOLD = 5 * 60 * 1000; // Refresh if expiring in <5 minutes

// Full response cache — avoids re-processing on repeated requests
let itemsResponseCache = { data: null, expiresAt: 0 };
const RESPONSE_CACHE_TTL = 2 * 60 * 1000; // 2 minutes

// Helper to get or create signed URL with caching
// Supports optional transform params for responsive images
async function getSignedUrl(bucket, imagePath, transform) {
  const cacheKey = transform ? `${imagePath}__w${transform.width}` : imagePath;
  const now = Date.now();
  const cached = signedUrlCache.get(cacheKey);
  
  // Return cached URL if still valid and not expiring soon
  if (cached && cached.expiresAt > now + REFRESH_THRESHOLD) {
    return cached.url;
  }
  
  // Generate new signed URL
  try {
    const ttl = 60 * 60; // 1 hour
    const options = { transform };
    const { data: signedData, error: signedErr } = await supabase.storage.from(bucket).createSignedUrl(imagePath, ttl, options);
    if (signedErr) return null;
    
    const signedUrl = signedData && signedData.signedUrl ? signedData.signedUrl : null;
    if (signedUrl) {
      signedUrlCache.set(cacheKey, {
        url: signedUrl,
        expiresAt: now + ttl * 1000
      });
    }
    return signedUrl;
  } catch (e) {
    return null;
  }
}

// Batch signed URL generation — one API call for many paths
async function batchSignedUrls(bucket, paths) {
  if (!paths.length) return {};
  const now = Date.now();
  const ttl = 60 * 60; // 1 hour

  // Split into cached and uncached
  const result = {};
  const uncached = [];
  for (const p of paths) {
    const cached = signedUrlCache.get(p);
    if (cached && cached.expiresAt > now + REFRESH_THRESHOLD) {
      result[p] = cached.url;
    } else {
      uncached.push(p);
    }
  }

  if (uncached.length > 0) {
    try {
      const { data, error } = await supabase.storage.from(bucket).createSignedUrls(uncached, ttl);
      if (!error && data) {
        for (const item of data) {
          if (item.signedUrl) {
            const path = item.path || uncached[data.indexOf(item)];
            result[path] = item.signedUrl;
            signedUrlCache.set(path, { url: item.signedUrl, expiresAt: now + ttl * 1000 });
          }
        }
      }
    } catch (e) {
      // Fallback: leave uncached paths as null
    }
  }
  return result;
}

// Public GET endpoints for products (used by frontend product listing)
// Protect mutating endpoints (create/update/delete) with verifyToken

// Get all items — uses batch signed URLs + response caching for speed
router.get('/', async (req, res) => {
  try {
    // Return cached response if fresh
    const now = Date.now();
    if (itemsResponseCache.data && itemsResponseCache.expiresAt > now) {
      return res.json(itemsResponseCache.data);
    }

    const { data: items, error } = await supabase.from('items').select('*').order('created_at', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });

    const bucket = process.env.SUPABASE_STORAGE_BUCKET || 'product-images';
    const transformed = items || [];

    // Collect all unique image paths that need signed URLs
    const allPaths = new Set();
    for (const it of transformed) {
      if (!it.images || !Array.isArray(it.images)) continue;
      for (const img of it.images) {
        if (!img || (typeof img === 'string' && (img.startsWith('http://') || img.startsWith('https://')))) continue;
        allPaths.add(typeof img === 'string' ? img : img);
      }
    }

    // One batch call for all image paths
    const signedMap = await batchSignedUrls(bucket, [...allPaths]);

    // Map signed URLs back to items
    for (let i = 0; i < transformed.length; i++) {
      const it = transformed[i];
      if (!it.images || !Array.isArray(it.images)) continue;
      transformed[i] = {
        ...it,
        images: it.images.map((img) => {
          if (!img) return { original: img };
          if (typeof img === 'string' && (img.startsWith('http://') || img.startsWith('https://'))) {
            return { original: img, sm: img, md: img, lg: img };
          }
          const url = signedMap[img] || null;
          return { original: url, sm: url, md: url, lg: url };
        }),
      };
    }

    // Cache the full response
    itemsResponseCache = { data: transformed, expiresAt: Date.now() + RESPONSE_CACHE_TTL };

    res.json(transformed);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Get single item
router.get('/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const { data, error } = await supabase.from('items').select('*').eq('id', id).limit(1);
    if (error) return res.status(500).json({ error: error.message });
    if (!data || data.length === 0) return res.status(404).json({ error: 'Item not found' });
    const item = data[0];
    const bucket = process.env.SUPABASE_STORAGE_BUCKET || 'product-images';
    if (item.images && Array.isArray(item.images)) {
      const paths = item.images.filter(img => img && typeof img === 'string' && !img.startsWith('http://') && !img.startsWith('https://'));
      const signedMap = await batchSignedUrls(bucket, paths);
      item.images = item.images.map((img) => {
        if (!img) return { original: img };
        if (typeof img === 'string' && (img.startsWith('http://') || img.startsWith('https://'))) {
          return { original: img, sm: img, md: img, lg: img };
        }
        const url = signedMap[img] || null;
        return { original: url, sm: url, md: url, lg: url };
      });
    }
    res.json(item);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Create item (protected) — supports multipart/form-data with files in `images` field
router.post('/', verifyToken, requireAdmin, upload.array('images'), async (req, res) => {
  try {
    const payload = req.body || {};
    
    // Parse multipart form fields properly (multer sends them as strings)
    const name = payload.name || '';
    const available = payload.available === 'true';
    const description = payload.description && payload.description.trim() ? payload.description : null;

    const imagesArray = [];
    const bucket = process.env.SUPABASE_STORAGE_BUCKET || 'product-images';

    // Upload files if any
    if (req.files && req.files.length) {
      for (const file of req.files) {
        try {
          // Validate magic bytes
          if (!validateImageMagicBytes(file.buffer, file.mimetype)) {
            return res.status(400).json({ error: 'File non valido: contenuto non corrisponde al tipo dichiarato' });
          }

          // Optimize image before uploading
          const optimized = await optimizeBuffer(file.buffer, file.mimetype);

          const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
          const filename = `${Date.now()}_${Math.random().toString(36).slice(2,8)}_${safeName}`;
          const filePath = `items/${filename}`;

          const { data: uploadData, error: uploadError } = await supabase.storage.from(bucket).upload(filePath, optimized.buffer, { contentType: optimized.contentType, upsert: false });
          
          if (uploadError) {
            return res.status(500).json({ error: 'Failed to upload file to storage', details: uploadError.message || JSON.stringify(uploadError) });
          }

          imagesArray.push(filePath);
        } catch (fileError) {
          return res.status(500).json({ error: 'Exception during file upload', details: fileError.message });
        }
      }
    }

    const category = payload.category || null;

    const itemPayload = {
      name,
      available,
      description,
      category,
      images: imagesArray
    };

    const { data, error } = await supabase.from('items').insert([itemPayload]).select().single();
    if (error) {
      return res.status(500).json({ error: 'Failed to insert item', details: error.message || JSON.stringify(error) });
    }
    itemsResponseCache = { data: null, expiresAt: 0 };
    res.status(201).json(data);
  } catch (e) {
    res.status(500).json({ error: 'Unexpected server error', details: e && e.message ? e.message : JSON.stringify(e) });
  }
});

// Update item (protected) — supports multipart/form-data with files in `images` field
// Kept existing images should be sent in `keptImages` field as JSON string
router.put('/:id', verifyToken, requireAdmin, upload.array('images'), async (req, res) => {
  try {
    const id = req.params.id;
    const payload = req.body || {};
    const bucket = process.env.SUPABASE_STORAGE_BUCKET || 'product-images';

    // Parse multipart form fields properly (multer sends them as strings)
    const name = payload.name || '';
    const available = payload.available === 'true';
    const description = payload.description && payload.description.trim() ? payload.description : null;

    // Get kept images from the keptImages field (JSON string)
    let imagesArray = [];
    if (payload.keptImages) {
      try {
        imagesArray = JSON.parse(payload.keptImages);
        if (!Array.isArray(imagesArray)) imagesArray = [];
      } catch (_) {
        imagesArray = [];
      }
    }

    // Upload new files and append to images array
    if (req.files && req.files.length) {
      for (const file of req.files) {
        try {
          // Validate magic bytes
          if (!validateImageMagicBytes(file.buffer, file.mimetype)) {
            return res.status(400).json({ error: 'File non valido: contenuto non corrisponde al tipo dichiarato' });
          }

          // Optimize image before uploading
          const optimized = await optimizeBuffer(file.buffer, file.mimetype);

          const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
          const filename = `${Date.now()}_${Math.random().toString(36).slice(2,8)}_${safeName}`;
          const filePath = `items/${filename}`;

          const { data: uploadData, error: uploadError } = await supabase.storage.from(bucket).upload(filePath, optimized.buffer, { contentType: optimized.contentType });
          
          if (uploadError) {
            return res.status(500).json({ error: uploadError.message || uploadError });
          }

          imagesArray.push(filePath);
        } catch (fileError) {
          return res.status(500).json({ error: fileError.message });
        }
      }
    }

    // Build final update payload
    const category = payload.category || null;
    const itemPayload = {
      name,
      available,
      description,
      category,
      images: imagesArray
    };

    const { data, error } = await supabase.from('items').update(itemPayload).eq('id', id).select().single();
    if (error) {
      return res.status(500).json({ error: error.message });
    }
    itemsResponseCache = { data: null, expiresAt: 0 };
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Delete item (protected)
router.delete('/:id', verifyToken, requireAdmin, async (req, res) => {
  try {
    const id = req.params.id;
    const { error } = await supabase.from('items').delete().eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    itemsResponseCache = { data: null, expiresAt: 0 };
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
