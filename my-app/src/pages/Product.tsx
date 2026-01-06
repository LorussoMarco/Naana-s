import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import aImg from '../assets/a.png';
import bImg from '../assets/b.jpg';
import CircularGallery from '../Component/CircularGallery'

// NOTE: front-end will only display products coming from the backend `/api/items`.
// The new DB schema stores images in `images` JSONB and may include `type` or `category`.
// This component maps API items into the shape used by the UI and filters by category: 'cold'|'hot'|'dessert'.

interface Photo {
  url: string;
  caption?: string;
}

interface Item {
  _id: string;
  name: string;
  description: string;
  photos: Photo[];
  available: boolean;
  category?: 'cold' | 'hot' | 'dessert';
}

const Prodotti: React.FC = () => {
  const { t } = useTranslation();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

  useEffect(() => {
    const fetchItems = async () => {
      try {
        const res = await fetch(`${apiBase}/items`);
        const data = await res.json();
        if (!Array.isArray(data) || data.length === 0) {
          // no items in DB
          setItems([]);
        } else {
          const mapped: Item[] = data.map((d: any) => {
            const imagesSource = Array.isArray(d.images) ? d.images : Array.isArray(d.photos) ? d.photos : [];
            const photos: Photo[] = imagesSource.length ? imagesSource.map((p: any) => ({ url: p.url || p })) : [{ url: bImg }];
            const rawCategory = (d.type || d.category || (d.tags && Array.isArray(d.tags) && d.tags[0]) || '').toString().toLowerCase();
            const category = ['cold', 'hot', 'dessert'].includes(rawCategory) ? (rawCategory as 'cold'|'hot'|'dessert') : undefined;
            return {
              _id: d.id ? String(d.id) : (d._id ? String(d._id) : ''),
              name: d.name || '',
              description: d.description || '',
              photos,
              available: typeof d.available === 'boolean' ? d.available : true,
              category,
            };
          });
          // Deduplicate by _id in case backend returns duplicates or different representations
          const uniqueMap = new Map<string, Item>();
          for (const it of mapped) {
            if (!it._id) continue; // skip items without id
            if (!uniqueMap.has(it._id)) uniqueMap.set(it._id, it);
          }
          const unique = Array.from(uniqueMap.values());
          if (unique.length !== mapped.length) {
            console.debug('Product dedupe: removed', mapped.length - unique.length, 'duplicates');
          }
          setItems(unique);
        }
        setLoading(false);
      } catch (err: any) {
        console.error(err);
        setError(t('product.load_error'));
        setItems([]);
        setLoading(false);
      }
    };
    fetchItems();
  }, []);

  if (loading) return <p>{t('product.loading')}</p>;

  const coldItems = items.filter(i => i.category === 'cold' && i.available);
  const hotItems = items.filter(i => i.category === 'hot' && i.available);
  const dessertItems = items.filter(i => i.category === 'dessert' && i.available);

  const renderStrip = (title: string, list: Item[], ariaId: string) => {
    // map Item -> { image, text } expected by CircularGallery
    const galleryItems = list && list.length
      ? list.map(i => ({
          image: (i.photos && i.photos[0] && i.photos[0].url) || bImg,
          text: i.name || 'Prodotto'
        }))
      : undefined;

    return (
      <section style={{ marginBottom: 28 }} aria-labelledby={ariaId}>
        <h2 id={ariaId} style={{ margin: '8px 0 12px', color: 'var(--inkcloud)', fontSize: 24, textAlign: 'center' }}>{title}</h2>
        <div style={{ height: '600px', position: 'relative' }}>
          <CircularGallery
            items={galleryItems}
            bend={0}
            textColor="var(--inkcloud)"
            font={'bold 140px "Inter", Miller Banner,serif'}
            textAlign={'left'}
            borderRadius={0.05}
            scrollEase={0.02}
          />
        </div>
      </section>
    );
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>{t('product.title')}</h1>
      {error && !loading && (
        <p style={{ color: 'var(--inkcloud)', textAlign: 'center', marginBottom: 18 }}>{t('product.load_error')}</p>
      )}

      {/* Component-scoped CSS for elegant scrollbar and layout */}
      <style>{`
        .productStrip {
          display: flex;
          gap: 18px;
          padding: 18px 12px;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          scroll-behavior: smooth;
        }

        /* Large minimal scrollbar for WebKit */
        .productStrip::-webkit-scrollbar {
          height: 12px;
        }
        .productStrip::-webkit-scrollbar-track {
          background: transparent;
        }
        .productStrip::-webkit-scrollbar-thumb {
          background: linear-gradient(180deg, rgba(74,74,74,0.9), rgba(74,74,74,0.8));
          border-radius: 999px;
          border: 3px solid rgba(0,0,0,0.0);
        }

        /* Firefox */
        .productStrip {
          scrollbar-width: thin;
          scrollbar-color: rgba(74,74,74,0.85) transparent;
        }

        .productCard {
          flex: 0 0 220px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          padding: 16px;
          border-radius: 12px;
          background: var(--mossmilk);
          box-shadow: 0 6px 18px rgba(74,74,74,0.06);
          min-height: 260px;
        }

        .productIcon {
          width: 120px;
          height: 120px;
          border-radius: 999px;
          object-fit: cover;
          box-shadow: 0 6px 18px rgba(74,74,74,0.08);
          margin-bottom: 6px;
        }

        .productName {
          margin: 4px 0 0;
          font-size: 25px;
          font-weight: 700;
          color: var(--inkcloud);
          text-align: center;
        }

        .productDesc {
          margin: 0;
          color: var(--inkcloud);
          font-size: 13px;
          text-align: center;
        }
      `}</style>

      {renderStrip(t('product.cold_title'), coldItems, 'strip-cold')}
      {renderStrip(t('product.hot_title'), hotItems, 'strip-hot')}
      {renderStrip(t('product.dessert_title'), dessertItems, 'strip-dessert')}
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    padding: '20px',
  },
  grid: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '15px',
  },
  card: {
    flex: '1 0 300px',
    border: '1px solid rgba(74,74,74,0.12)',
    borderRadius: '8px',
    padding: '15px',
    boxShadow: '2px 2px 5px rgba(0,0,0,0.1)',
  },
  image: {
    width: '100%',
    height: 'auto',
    borderRadius: '6px',
    marginBottom: '10px',
  },
  placeholder: {
    width: '120px',
    height: '120px',
    borderRadius: '999px',
    background: 'linear-gradient(180deg, rgba(184,175,166,0.95), rgba(184,175,166,0.85))',
  },
};

export default Prodotti;
