const express = require('express');
const supabase = require('../supabaseClient');
const { verifyToken } = require('../middleware/auth');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });
const router = express.Router();

// In-memory cache for signed URLs (pathString -> { url, expiresAt })
const signedUrlCache = new Map();
const CACHE_TTL = 50 * 60 * 1000; // 50 minutes (signed URLs last 1 hour)
const REFRESH_THRESHOLD = 5 * 60 * 1000; // Refresh if expiring in <5 minutes

// Helper to get or create signed URL with caching
async function getSignedUrl(bucket, imagePath) {
  const now = Date.now();
  const cached = signedUrlCache.get(imagePath);
  
  // Return cached URL if still valid and not expiring soon
  if (cached && cached.expiresAt > now + REFRESH_THRESHOLD) {
    return cached.url;
  }
  
  // Generate new signed URL
  try {
    const ttl = 60 * 60; // 1 hour
    const { data: signedData, error: signedErr } = await supabase.storage.from(bucket).createSignedUrl(imagePath, ttl);
    if (signedErr) return null;
    
    const signedUrl = signedData && signedData.signedUrl ? signedData.signedUrl : null;
    if (signedUrl) {
      // Cache it with expiry time
      signedUrlCache.set(imagePath, {
        url: signedUrl,
        expiresAt: now + ttl * 1000
      });
    }
    return signedUrl;
  } catch (e) {
    return null;
  }
}

// Public GET endpoints for products (used by frontend product listing)
// Protect mutating endpoints (create/update/delete) with verifyToken

// Get all items
router.get('/', async (req, res) => {
  try {
    const { data: items, error } = await supabase.from('items').select('*').order('created_at', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });

    const bucket = process.env.SUPABASE_STORAGE_BUCKET || 'product-images';

    // For each item, process images with caching
    const transformed = items || [];
    for (let i = 0; i < transformed.length; i++) {
      const it = transformed[i];
      if (!it.images || !Array.isArray(it.images)) continue;
      
      const processedImages = await Promise.all(
        it.images.map(async (img) => {
          if (!img) return img;
          // if it's already a full URL, return as-is
          if (typeof img === 'string' && (img.startsWith('http://') || img.startsWith('https://'))) {
            return img;
          }
          // Use cached signed URL helper
          return await getSignedUrl(bucket, img);
        })
      );
      transformed[i] = { ...it, images: processedImages };
    }

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
      const processedImages = await Promise.all(
        item.images.map(async (img) => {
          if (!img) return img;
          if (typeof img === 'string' && (img.startsWith('http://') || img.startsWith('https://'))) return img;
          return await getSignedUrl(bucket, img);
        })
      );
      item.images = processedImages;
    }
    res.json(item);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Create item (protected) — supports multipart/form-data with files in `images` field
router.post('/', verifyToken, upload.array('images'), async (req, res) => {
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
          const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
          const filename = `${Date.now()}_${Math.random().toString(36).slice(2,8)}_${safeName}`;
          const filePath = `items/${filename}`;

          const { data: uploadData, error: uploadError } = await supabase.storage.from(bucket).upload(filePath, file.buffer, { contentType: file.mimetype, upsert: false });
          
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
    res.status(201).json(data);
  } catch (e) {
    res.status(500).json({ error: 'Unexpected server error', details: e && e.message ? e.message : JSON.stringify(e) });
  }
});

// Update item (protected) — supports multipart/form-data with files in `images` field
// Kept existing images should be sent in `keptImages` field as JSON string
router.put('/:id', verifyToken, upload.array('images'), async (req, res) => {
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
          const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
          const filename = `${Date.now()}_${Math.random().toString(36).slice(2,8)}_${safeName}`;
          const filePath = `items/${filename}`;

          const { data: uploadData, error: uploadError } = await supabase.storage.from(bucket).upload(filePath, file.buffer, { contentType: file.mimetype });
          
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
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Delete item (protected)
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const id = req.params.id;
    const { error } = await supabase.from('items').delete().eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
