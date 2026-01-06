require('dotenv').config();
const supabase = require('../supabaseClient');

// This script will attempt to normalize the `images` field in `items` table
// so that each image entry is a storage path like `items/filename.ext`.
// It looks for Supabase storage signed/public URLs and extracts the path.

(async () => {
  try {
    const { data: items, error } = await supabase.from('items').select('id, images');
    if (error) throw error;
    console.log(`Found ${items.length} items`);

    const updated = [];

    for (const it of items) {
      if (!it.images || !Array.isArray(it.images)) continue;
      const newImgs = it.images.map((img) => {
        if (!img || typeof img !== 'string') return img;
        try {
          const url = new URL(img);
          // supabase signed URLs often contain '/object/sign/<bucket>/' or '/object/public/<bucket>/'
          const idx = url.pathname.indexOf('/object/');
          if (idx >= 0) {
            const rest = url.pathname.slice(idx); // /object/...
            // /object/sign/<bucket>/<path>
            const parts = rest.split('/');
            // parts: ['','object','sign'|'public', '<bucket>', 'path','to','file']
            if (parts.length >= 5) {
              const pathParts = parts.slice(4); // path to file
              return pathParts.join('/');
            }
          }
          // Otherwise fallback: try to use last segment
          return img.split('/').slice(-1)[0];
        } catch (e) {
          return img;
        }
      });

      // If images changed, update row
      const identical = JSON.stringify(newImgs) === JSON.stringify(it.images);
      if (!identical) {
        const { error: upErr } = await supabase.from('items').update({ images: newImgs }).eq('id', it.id);
        if (upErr) {
          console.error('Failed to update item', it.id, upErr.message || upErr);
        } else {
          updated.push(it.id);
          console.log('Updated item', it.id);
        }
      }
    }

    console.log('Migration complete. Updated items:', updated.length);
    process.exit(0);
  } catch (e) {
    console.error('Migration failed', e.message || e);
    process.exit(1);
  }
})();
