import React, { useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import bImg from '../assets/c.jpg';
// import CircularGallery from '../Component/CircularGallery'

// NOTE: front-end will only display products coming from the backend `/api/items`.
// The new DB schema stores images in `images` JSONB.
// This component maps API items into the shape used by the UI and displays all dishes.

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
}

// Memoized gallery item component
interface GalleryItemProps {
  item: Item;
  bImg: string;
}

const GalleryItem = React.memo(({ item, bImg }: GalleryItemProps) => (
  <div className="gallery-item">
    <div className="gallery-image-wrapper">
      <img 
        src={(item.photos && item.photos[0] && item.photos[0].url) || bImg} 
        alt={item.name || 'Prodotto'} 
        className="gallery-image"
        loading="lazy"
        decoding="async"
        fetchPriority="low"
      />
    </div>
    <h3 className="gallery-item-name">{item.name || 'Prodotto'}</h3>
    {item.description && (
      <p className="gallery-item-desc">{item.description}</p>
    )}
  </div>
));

const Prodotti: React.FC = () => {
  const { t } = useTranslation();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

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
            return {
              _id: d.id ? String(d.id) : (d._id ? String(d._id) : ''),
              name: d.name || '',
              description: d.description || '',
              photos,
              available: typeof d.available === 'boolean' ? d.available : true,
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

  const availableItems = items.filter(i => i.available);

  /* ===== NUOVA GALLERIA ORIZZONTALE SEMPLICE ===== */

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = 300;
      scrollContainerRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  const renderSimpleGallery = (title: string, list: Item[], ariaId: string) => {
    if (!list || list.length === 0) {
      return (
        <section style={{ marginBottom: 28 }} aria-labelledby={ariaId}>
          <h2 id={ariaId} style={{ margin: '8px 0 12px', color: 'var(--inkcloud)', fontSize: 24, textAlign: 'center' }}>{title}</h2>
          <p style={{ textAlign: 'center', color: 'var(--inkcloud)' }}>Nessun prodotto disponibile</p>
        </section>
      );
    }

    return (
      <section style={{ marginBottom: 28 }} aria-labelledby={ariaId}>
        <h2 id={ariaId} style={{ margin: '8px 0 24px', color: 'var(--inkcloud)', fontSize: 24, textAlign: 'center' }}>{title}</h2>
        <div className="gallery-wrapper">
          <button className="gallery-arrow gallery-arrow-left" onClick={() => scroll('left')} aria-label="Scorri a sinistra">
            ‹
          </button>
          <div className="simple-gallery" ref={scrollContainerRef}>
            {list.map((item, idx) => (
              <GalleryItem key={item._id || idx} item={item} bImg={bImg} />
            ))}
          </div>
          <button className="gallery-arrow gallery-arrow-right" onClick={() => scroll('right')} aria-label="Scorri a destra">
            ›
          </button>
        </div>
      </section>
    );
  };

  /* ===== VECCHIA CIRCULAR GALLERY (COMMENTATA) ===== */
  /*
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
  */

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>{t('product.title')}</h1>
      {error && !loading && (
        <p style={{ color: 'var(--inkcloud)', textAlign: 'center', marginBottom: 18 }}>{t('product.load_error')}</p>
      )}

      {/* Component-scoped CSS for elegant scrollbar and layout */}
      <style>{`
        .gallery-wrapper {
          position: relative;
          display: flex;
          align-items: center;
          padding: 0 40px;
        }

        .gallery-arrow {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          z-index: 10;
          background: var(--inkcloud, #333);
          color: white;
          border: none;
          width: 44px;
          height: 44px;
          border-radius: 50%;
          font-size: 28px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          transition: transform 0.2s, background 0.2s;
        }

        .gallery-arrow:hover {
          transform: translateY(-50%) scale(1.1);
          background: #555;
        }

        .gallery-arrow-left {
          left: 0;
        }

        .gallery-arrow-right {
          right: 0;
        }

        .simple-gallery {
          display: flex;
          gap: 24px;
          padding: 20px 10px;
          overflow-x: auto;
          scroll-behavior: smooth;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: none;
          -ms-overflow-style: none;
        }

        .simple-gallery::-webkit-scrollbar {
          display: none;
        }

        .gallery-item {
          flex: 0 0 280px;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 20px;
          background: var(--mossmilk, #f9f9f9);
          border-radius: 16px;
          box-shadow: 0 8px 24px rgba(0,0,0,0.08);
          transition: none;
          will-change: auto;
          contain: layout style paint;
          backface-visibility: hidden;
          transform: translateZ(0);
        }

        .gallery-image-wrapper {
          width: 100%;
          height: 200px;
          overflow: hidden;
          border-radius: 12px;
          margin-bottom: 16px;
          contain: layout paint;
        }

        .gallery-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
          transition: none;
          will-change: auto;
        }

        .gallery-item-name {
          margin: 0 0 8px 0;
          font-size: 18px;
          font-weight: 700;
          color: var(--inkcloud, #333);
          text-align: center;
        }

        .gallery-item-desc {
          margin: 0;
          font-size: 14px;
          color: var(--inkcloud, #666);
          text-align: center;
          line-height: 1.4;
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        /* Responsive */
        @media (max-width: 768px) {
          .gallery-wrapper {
            padding: 0 30px;
          }

          .gallery-arrow {
            width: 36px;
            height: 36px;
            font-size: 22px;
          }

          .gallery-item {
            flex: 0 0 240px;
            padding: 16px;
          }

          .gallery-image-wrapper {
            height: 160px;
          }

          .gallery-item-name {
            font-size: 16px;
          }
        }

        @media (max-width: 480px) {
          .gallery-wrapper {
            padding: 0 24px;
          }

          .gallery-arrow {
            width: 32px;
            height: 32px;
            font-size: 18px;
          }

          .gallery-item {
            flex: 0 0 200px;
            padding: 12px;
          }

          .gallery-image-wrapper {
            height: 140px;
          }
        }

        /* Vecchi stili productStrip (commentati)
        .productStrip {
          display: flex;
          gap: 18px;
          padding: 18px 12px;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          scroll-behavior: smooth;
        }

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
        */
      `}</style>

      {renderSimpleGallery(t('product.dishes_title'), availableItems, 'strip-dishes')}
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    padding: '20px',
    minHeight: '100%',
    display: 'flex',
    flexDirection: 'column',
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
