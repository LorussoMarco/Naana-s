const express = require('express');
const supabase = require('../supabaseClient');
const { verifyToken } = require('../middleware/auth');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });
const router = express.Router();

// Public GET endpoints for products (used by frontend product listing)
// Protect mutating endpoints (create/update/delete) with verifyToken

// Get all items
router.get('/', async (req, res) => {
  try {
    const { data: items, error } = await supabase.from('items').select('*').order('created_at', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });

    const bucket = process.env.SUPABASE_STORAGE_BUCKET || 'product-images';

    // For each item, if images are stored as storage paths (e.g. 'items/..'),
    // generate short-lived signed URLs on the fly. If the image entry is already
    // a full URL (starts with http), leave it as-is.
    const transformed = await Promise.all((items || []).map(async (it) => {
      if (!it.images || !Array.isArray(it.images)) return it;
      const imgs = await Promise.all(it.images.map(async (img) => {
        if (!img) return img;
        // if it's already a full URL, return as-is
        if (typeof img === 'string' && (img.startsWith('http://') || img.startsWith('https://'))) {
          return img;
        }
        // otherwise assume it's a storage path and create a signed url
        try {
          const ttl = 60 * 60; // 1 hour
          const { data: signedData, error: signedErr } = await supabase.storage.from(bucket).createSignedUrl(img, ttl);
          if (signedErr) return null;
          return signedData && signedData.signedUrl ? signedData.signedUrl : null;
        } catch (e) {
          return null;
        }
      }));
      return { ...it, images: imgs };
    }));

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
      const imgs = await Promise.all(item.images.map(async (img) => {
        if (!img) return img;
        if (typeof img === 'string' && (img.startsWith('http://') || img.startsWith('https://'))) return img;
        try {
          const ttl = 60 * 60; // 1 hour
          const { data: signedData, error: signedErr } = await supabase.storage.from(bucket).createSignedUrl(img, ttl);
          if (signedErr) return null;
          return signedData && signedData.signedUrl ? signedData.signedUrl : null;
        } catch (e) {
          return null;
        }
      }));
      item.images = imgs;
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
