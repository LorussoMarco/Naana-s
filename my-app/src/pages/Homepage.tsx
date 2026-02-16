import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import bg from '../assets/d.jpg';
import imgC from '../assets/c.jpg';
import home3 from '../assets/home3.jpg';
import bImg from '../assets/c.jpg';
import Stepper, { Step } from '../Component/Stepper';

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
  category?: string | null;
}

// Memoized gallery item component to prevent unnecessary re-renders
interface GalleryItemProps {
  item: Item;
  bImg: string;
}

const GalleryItem = React.memo(({ item, bImg }: GalleryItemProps) => (
  <div className="homepage-gallery-item">
    <div className="homepage-gallery-image-wrapper">
      <img 
        src={(item.photos && item.photos[0] && item.photos[0].url) || bImg} 
        alt={item.name || 'Prodotto'} 
        className="homepage-gallery-image"
        loading="lazy"
      />
    </div>
    <h3 className="homepage-gallery-item-name">{item.name || 'Prodotto'}</h3>
    {item.description && (
      <p className="homepage-gallery-item-desc">{item.description}</p>
    )}
  </div>
));

const Homepage: React.FC = () => {
  const { t } = useTranslation();
  const [showStepper, setShowStepper] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 8; // Show 8 items per page
  
  // Products state
  const [items, setItems] = useState<Item[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [productsError, setProductsError] = useState<string | null>(null);
  
  // Step 1 - client
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  // Step 2 - event
  const [eventType, setEventType] = useState('');
  const [numPeople, setNumPeople] = useState<number | ''>('');
  const [budgetMax, setBudgetMax] = useState<number | ''>('');
  const [eventDate, setEventDate] = useState('');
  const [eventMessage, setEventMessage] = useState('');

  // Step 3 - address/delivery
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [zip, setZip] = useState('');
  const [deliveryType, setDeliveryType] = useState<'takeaway' | 'delivery'>('takeaway');

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [stepError, setStepError] = useState<string | null>(null);

  // Fetch products on mount
  useEffect(() => {
    const fetchItems = async () => {
      try {
        const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
        const res = await fetch(`${apiBase}/items`);
        const data = await res.json();
        if (!Array.isArray(data) || data.length === 0) {
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
              category: d.category || null,
            };
          });
          const uniqueMap = new Map<string, Item>();
          for (const it of mapped) {
            if (!it._id) continue;
            if (!uniqueMap.has(it._id)) uniqueMap.set(it._id, it);
          }
          const unique = Array.from(uniqueMap.values());
          if (unique.length !== mapped.length) {
            console.debug('Product dedupe: removed', mapped.length - unique.length, 'duplicates');
          }
          setItems(unique);
        }
        setProductsLoading(false);
      } catch (err: any) {
        console.error(err);
        setProductsError(t('product.load_error'));
        setItems([]);
        setProductsLoading(false);
      }
    };
    fetchItems();
  }, [t]);

  // Reset page when category changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategory]);

  // Memoized filtered items for current category
  const filteredItems = useMemo(() => {
    if (!selectedCategory) return [];
    return items.filter(i => i.available && i.category === selectedCategory);
  }, [items, selectedCategory]);

  // Memoized paginated items
  const paginatedItems = useMemo(() => {
    const startIdx = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredItems.slice(startIdx, startIdx + ITEMS_PER_PAGE);
  }, [filteredItems, currentPage]);

  const totalPages = Math.ceil(filteredItems.length / ITEMS_PER_PAGE);

  const overlayStyle: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: 20,
  };

  const modalStyle: React.CSSProperties = {
    width: '100%',
    maxWidth: 960,
    maxHeight: '90vh',
    overflow: 'visible',
    background: 'transparent',
    borderRadius: 12,
    boxShadow: 'none',
    padding: 0,
  };

  // Paginated gallery with navigation
  const renderPaginatedGallery = (title: string, list: Item[], currentPage: number, totalPages: number, ariaId: string) => {
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 24, padding: '0 16px' }}>
          {list.map((item, idx) => (
            <GalleryItem key={item._id || idx} item={item} bImg={bImg} />
          ))}
        </div>
        
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, marginTop: 32 }}>
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              style={{ padding: '8px 12px', borderRadius: 6, background: currentPage === 1 ? '#ccc' : '#111827', color: 'white', cursor: currentPage === 1 ? 'not-allowed' : 'pointer' }}
            >
              ← Precedente
            </button>
            <span style={{ color: 'var(--inkcloud)', fontWeight: 600 }}>
              Pagina {currentPage} di {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              style={{ padding: '8px 12px', borderRadius: 6, background: currentPage === totalPages ? '#ccc' : '#111827', color: 'white', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer' }}
            >
              Successiva →
            </button>
          </div>
        )}
      </section>
    );
  };

  return (
    <main style={styles.root}>
      <header style={styles.hero}>
          <div style={styles.heroInner}>
          <div style={styles.heroText}>
            <h1 style={styles.title}>{t('homepage.hero_title')}</h1>
            <p style={styles.lead}>{t('homepage.hero_lead')}</p>
          </div>
        </div>
      </header>



      {/* Sticky blurred background image: stays in place while sections scroll over it */}
      <div style={styles.stickyWrap} className="sticky-wrap">
        <div style={styles.stickyBgContainer} className="sticky-bg">
        </div>
        <button
          onClick={() => setShowStepper(true)}
          className="primary menu-button"
          style={styles.menuButton}
        >
          {t('homepage.make_order')}
        </button>
      </div>

      {showStepper && (
        <div style={overlayStyle} onClick={() => setShowStepper(false)}>
          <div role="dialog" aria-modal="true" style={modalStyle} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <button
                aria-label={t('homepage.close')}
                onClick={() => setShowStepper(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  fontSize: 20,
                  cursor: 'pointer',
                  color: '#444'
                }}
              >
                ×
              </button>
            </div>

            <div style={{ width: 'min(860px, 96vw)', padding: 8 }}>
              <Stepper
                initialStep={1}
                onStepChange={(step) => console.log(step)}
                    onBeforeStepChange={async (currentStep, targetStep) => {
                      // only validate when attempting to move forward
                      if (targetStep <= currentStep) return true;
                      setStepError(null);
                      const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
                      const isPhone = (s: string) => {
                        const digits = s.replace(/\D/g, '');
                        return digits.length >= 8 && digits.length <= 15;
                      };
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);

                      if (currentStep === 1) {
                        if (!firstName.trim() || !lastName.trim() || !email.trim() || !phone.trim()) {
                          setStepError(t('validation.fill_client_fields'));
                          return false;
                        }
                        if (!isEmail(email.trim())) {
                          setStepError(t('validation.invalid_email'));
                          return false;
                        }
                        if (!isPhone(phone.trim())) {
                          setStepError(t('validation.invalid_phone'));
                          return false;
                        }
                        return true;
                      }

                      if (currentStep === 2) {
                        if (!eventDate) {
                          setStepError(t('validation.select_event_date'));
                          return false;
                        }
                        const d = new Date(eventDate);
                        d.setHours(0, 0, 0, 0);
                        if (d < today) {
                          setStepError(t('validation.event_date_past'));
                          return false;
                        }
                        return true;
                      }

                      if (currentStep === 3) {
                        if (!deliveryType) {
                          setStepError(t('validation.select_delivery_type'));
                          return false;
                        }
                        if (deliveryType === 'delivery') {
                            if (!street.trim() || !city.trim() || !zip.trim()) {
                              setStepError(t('validation.fill_address_fields'));
                              return false;
                            }
                            if (!/^\d+$/.test(zip.trim())) {
                              setStepError(t('validation.zip_numeric'));
                              return false;
                            }
                        }
                        return true;
                      }

                      return true;
                    }}
                onFinalStepCompleted={async () => {
                  setSubmitError(null);
                  setSubmitting(true);
                  try {
                    const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

                    // Create client
                    const clientPayload = {
                      first_name: firstName,
                      last_name: lastName,
                      email,
                      phone_number: phone,
                    };

                    const cRes = await fetch(`${API}/clients`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(clientPayload),
                    });
                    if (!cRes.ok) {
                      const err = await cRes.json().catch(() => ({}));
                      throw new Error(err.error || `Failed to create client (${cRes.status})`);
                    }
                    const createdClient = await cRes.json();

                    // Create order linked to client id — use DB column names from schema
                    const orderPayload: any = {
                      client: createdClient.id,
                      event_type: eventType,
                      num_people: typeof numPeople === 'number' ? numPeople : null,
                      max_budget: typeof budgetMax === 'number' ? budgetMax : null,
                      date: eventDate || null,
                      message: eventMessage || null,
                      street: street,
                      city: city,
                      postal_code: zip,
                      delivery_type: deliveryType,
                      status: 'pending',
                    };

                    const oRes = await fetch(`${API}/orders`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(orderPayload),
                    });
                    if (!oRes.ok) {
                      const err = await oRes.json().catch(() => ({}));
                      throw new Error(err.error || `Failed to create order (${oRes.status})`);
                    }
                    const createdOrder = await oRes.json();
                    console.log('Order created', createdOrder);

                    // Send order details to backend /api/contact so server uses SITE_OWNER_EMAIL
                    try {
                      const orderPayload = {
                        order_id: createdOrder.id || '',
                        first_name: firstName,
                        last_name: lastName,
                        email,
                        phone,
                        event_type: eventType,
                        num_people: numPeople || '',
                        max_budget: budgetMax || '',
                        date: eventDate || '',
                        message: eventMessage || '',
                        street,
                        city,
                        postal_code: zip,
                        delivery_type: deliveryType,
                        _subject: `New order${createdOrder.id ? ' #' + createdOrder.id : ''} from ${firstName} ${lastName}`,
                      };

                      const mailRes = await fetch(`${API}/contact`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(orderPayload),
                      });
                      const mailData = await mailRes.json().catch(() => ({}));
                      if (!mailRes.ok || !mailData.ok) {
                        console.error('Order email error', mailData);
                      } else {
                        console.log('Order email sent via backend', mailData);
                      }
                    } catch (mailErr) {
                      console.error('Error sending order email via backend', mailErr);
                    }

                    setSubmitSuccess(t('stepper.order_created'));
                    // close modal after brief delay
                    setTimeout(() => {
                      setShowStepper(false);
                      setSubmitSuccess(null);
                      // reset form
                      setFirstName('');
                      setLastName('');
                      setEmail('');
                      setPhone('');
                      setEventType('');
                      setNumPeople('');
                      setBudgetMax('');
                      setEventDate('');
                      setStreet('');
                      setCity('');
                      setZip('');
                      setDeliveryType('takeaway');
                    }, 1200);
                  } catch (e: any) {
                    console.error(e);
                    setSubmitError(e.message || t('validation.submit_error'));
                  } finally {
                    setSubmitting(false);
                  }
                }}
                backButtonText={t('stepper.back')}
                nextButtonText={t('stepper.next')}
              >
                <Step>
                  <h2>{t('stepper.client_title')}</h2>
                  <div style={{ display: 'grid', gap: 8 }}>
                    <input placeholder={t('stepper.client_name_placeholder')} value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                    <input placeholder={t('stepper.client_last_placeholder')} value={lastName} onChange={(e) => setLastName(e.target.value)} />
                    <input placeholder={t('stepper.client_email_placeholder')} value={email} onChange={(e) => setEmail(e.target.value)} type="email" />
                    <input placeholder={t('stepper.client_phone_placeholder')} value={phone} onChange={(e) => setPhone(e.target.value)} />
                  </div>
                  {stepError && <div style={{ color: 'crimson', marginTop: 8 }}>{stepError}</div>}
                </Step>
                <Step>
                  <h2>{t('stepper.event_title')}</h2>
                  <div style={{ display: 'grid', gap: 8 }}>
                    <input placeholder={t('stepper.event_type_placeholder')} value={eventType} onChange={(e) => setEventType(e.target.value)} />
                    <input placeholder={t('stepper.num_people_placeholder')} value={numPeople as any} onChange={(e) => setNumPeople(e.target.value === '' ? '' : Number(e.target.value))} type="number" />
                    <input placeholder={t('stepper.budget_placeholder')} value={budgetMax as any} onChange={(e) => setBudgetMax(e.target.value === '' ? '' : Number(e.target.value))} type="number" />
                    <input placeholder={t('stepper.event_date_placeholder')} value={eventDate} onChange={(e) => setEventDate(e.target.value)} type="date" />
                    <textarea placeholder={t('stepper.event_message_placeholder')} value={eventMessage} onChange={(e) => setEventMessage(e.target.value)} rows={3} />
                  </div>
                  {stepError && <div style={{ color: 'crimson', marginTop: 8 }}>{stepError}</div>}
                </Step>
                <Step>
                  <h2>{t('stepper.address_title')}</h2>
                  <div style={{ display: 'grid', gap: 8 }}>
                    <input placeholder={t('stepper.street_placeholder')} value={street} onChange={(e) => setStreet(e.target.value)} />
                    <input placeholder={t('stepper.city_placeholder')} value={city} onChange={(e) => setCity(e.target.value)} />
                    <input placeholder={t('stepper.zip_placeholder')} value={zip} onChange={(e) => setZip(e.target.value)} />
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <label>
                        <input type="radio" checked={deliveryType === 'takeaway'} onChange={() => setDeliveryType('takeaway')} /> {t('stepper.takeaway')}
                      </label>
                      <label>
                        <input type="radio" checked={deliveryType === 'delivery'} onChange={() => setDeliveryType('delivery')} /> {t('stepper.delivery')}
                      </label>
                    </div>
                  </div>
                  {stepError && <div style={{ color: 'crimson', marginTop: 8 }}>{stepError}</div>}
                  <div style={{ marginTop: 12 }}>
                    {submitError && <div style={{ color: 'crimson' }}>{submitError}</div>}
                    {submitSuccess && <div style={{ color: 'green' }}>{submitSuccess}</div>}
                    {submitting && <div>{t('stepper.sending')}</div>}
                  </div>
                </Step>
              </Stepper>
            </div>
          </div>
        </div>
      )}

      {/* Cover section: left half image (uses a.png), right half title + description.
          When this section scrolls into view it will overlay the blurred background. */}
      <section id="cover" style={styles.coverSection}>
        <div style={styles.coverLeft} />
        <div style={styles.coverRight}>
          <h2 style={styles.coverTitle}>{t('homepage.cover_title')}</h2>
          <p style={styles.coverText}>{t('homepage.cover_text')}</p>
        </div>
      </section>

      {/* Products Gallery Section */}
      <style>{`
        .category-filters {
          display: flex;
          justify-content: center;
          gap: 24px;
          margin-bottom: 40px;
          flex-wrap: wrap;
          padding: 0 16px;
        }

        .category-btn {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          padding: 16px;
          border: 2px solid transparent;
          border-radius: 12px;
          background: var(--mossmilk, #f9f9f9);
          cursor: pointer;
          transition: all 0.3s ease;
          min-width: 100px;
          font-size: 14px;
          color: var(--inkcloud, #333);
          font-weight: 600;
        }

        .category-btn:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 24px rgba(0,0,0,0.12);
        }

        .category-btn.active {
          border-color: #d4a574;
          background: linear-gradient(135deg, rgba(212,165,116,0.1), rgba(212,165,116,0.05));
          color: #d4a574;
        }

        .category-icon {
          font-size: 32px;
        }

        .homepage-gallery-wrapper {
          position: relative;
          display: flex;
          align-items: center;
          padding: 0 40px;
        }

        .homepage-gallery-arrow {
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

        .homepage-gallery-arrow:hover {
          transform: translateY(-50%) scale(1.1);
          background: #555;
        }

        .homepage-gallery-arrow-left {
          left: 0;
        }

        .homepage-gallery-arrow-right {
          right: 0;
        }

        .homepage-simple-gallery {
          display: flex;
          gap: 24px;
          padding: 20px 10px;
          overflow-x: auto;
          scroll-behavior: smooth;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: none;
          -ms-overflow-style: none;
        }

        .homepage-simple-gallery::-webkit-scrollbar {
          display: none;
        }

        .homepage-gallery-item {
          flex: 0 0 280px;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 20px;
          background: var(--mossmilk, #f9f9f9);
          border-radius: 16px;
          box-shadow: 0 8px 24px rgba(0,0,0,0.08);
          transition: transform 0.3s, box-shadow 0.3s;
        }

        .homepage-gallery-item:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 32px rgba(0,0,0,0.12);
        }

        .homepage-gallery-image-wrapper {
          width: 100%;
          height: 200px;
          overflow: hidden;
          border-radius: 12px;
          margin-bottom: 16px;
        }

        .homepage-gallery-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.3s;
        }

        .homepage-gallery-item:hover .homepage-gallery-image {
          transform: scale(1.05);
        }

        .homepage-gallery-item-name {
          margin: 0 0 8px 0;
          font-size: 18px;
          font-weight: 700;
          color: var(--inkcloud, #333);
          text-align: center;
        }

        .homepage-gallery-item-desc {
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

        @media (max-width: 768px) {
          .category-filters {
            gap: 16px;
          }

          .category-btn {
            min-width: 90px;
            padding: 12px;
            font-size: 13px;
          }

          .category-icon {
            font-size: 28px;
          }

          .homepage-gallery-wrapper {
            padding: 0 30px;
          }

          .homepage-gallery-arrow {
            width: 36px;
            height: 36px;
            font-size: 22px;
          }

          .homepage-gallery-item {
            flex: 0 0 240px;
            padding: 16px;
          }

          .homepage-gallery-image-wrapper {
            height: 160px;
          }

          .homepage-gallery-item-name {
            font-size: 16px;
          }
        }

        @media (max-width: 480px) {
          .category-filters {
            gap: 12px;
          }

          .category-btn {
            min-width: 80px;
            padding: 10px;
            font-size: 12px;
          }

          .category-icon {
            font-size: 24px;
          }

          .homepage-gallery-wrapper {
            padding: 0 24px;
          }

          .homepage-gallery-arrow {
            width: 32px;
            height: 32px;
            font-size: 18px;
          }

          .homepage-gallery-item {
            flex: 0 0 200px;
            padding: 12px;
          }

          .homepage-gallery-image-wrapper {
            height: 140px;
          }
        }
      `}</style>

      <section id="feature" style={styles.featureSection}>
        <div style={styles.featureLeft}>
          <h3 style={styles.featureTitle}>{t('homepage.feature_title')}</h3>
          <p style={styles.featureText}>{t('homepage.feature_text')}</p>
        </div>

        <div style={styles.featureRight} />
      </section>

      <div style={{ padding: '40px 16px' }}>
        {productsError && !productsLoading && (
          <p style={{ color: 'var(--inkcloud)', textAlign: 'center', marginBottom: 18 }}>{productsError}</p>
        )}
        {!productsLoading && (
          <>
            <h2 style={{ textAlign: 'center', marginBottom: 32, color: 'var(--inkcloud)', fontSize: 24 }}>
              {t('product.dishes_title')}
            </h2>
            
            <div className="category-filters">
              <button
                className={`category-btn ${selectedCategory === 'carne' ? 'active' : ''}`}
                onClick={() => setSelectedCategory(selectedCategory === 'carne' ? null : 'carne')}
              >
                <span className="category-icon">🥩</span>
                Carne
              </button>
              <button
                className={`category-btn ${selectedCategory === 'pesce' ? 'active' : ''}`}
                onClick={() => setSelectedCategory(selectedCategory === 'pesce' ? null : 'pesce')}
              >
                <span className="category-icon">🐟</span>
                Pesce
              </button>
              <button
                className={`category-btn ${selectedCategory === 'vegetariano' ? 'active' : ''}`}
                onClick={() => setSelectedCategory(selectedCategory === 'vegetariano' ? null : 'vegetariano')}
              >
                <span className="category-icon">🥗</span>
                Vegetariano
              </button>
              <button
                className={`category-btn ${selectedCategory === 'dessert' ? 'active' : ''}`}
                onClick={() => setSelectedCategory(selectedCategory === 'dessert' ? null : 'dessert')}
              >
                <span className="category-icon">🍰</span>
                Dessert
              </button>
            </div>

            {selectedCategory && renderPaginatedGallery(
              `${selectedCategory.charAt(0).toUpperCase()}${selectedCategory.slice(1)}`,
              paginatedItems, 
              currentPage,
              totalPages,
              'homepage-strip-dishes'
            )}
          </>
        )}
      </div>

      {/* Reviews Section */}
      <section id="reviews" style={styles.reviewsSection}>
        <div style={styles.reviewsContainer}>
          <h2 style={styles.reviewsTitle}>{t('reviews.title')}</h2>
          <p style={styles.reviewsSubtitle}>{t('reviews.subtitle')}</p>
          
          <div style={styles.reviewsGrid}>
            {[
              {
                name: 'Francesca M.',
                role: 'Wedding Event',
                text: 'Naana\'s Kitchen ha trasformato il nostro matrimonio in un\'esperienza indimenticabile. Ogni piatto era una sorpresa, ogni dettaglio perfetto.',
                rating: 5
              },
              {
                name: 'Marco L.',
                role: 'Corporate Event',
                text: 'Professionalità, eleganza e gusto eccezionale. I nostri ospiti ancora ne parlano. Consigliatissimo per eventi aziendali.',
                rating: 5
              },
              {
                name: 'Elena R.',
                role: 'Intimate Dinner',
                text: 'Un\'esperienza culinaria che va oltre il semplice catering. Dori e Nerina creano arte in ogni piatto.',
                rating: 5
              },
              {
                name: 'Paolo T.',
                role: 'Birthday Celebration',
                text: 'Dalla prima consultazione al giorno dell\'evento, tutto è stato curato nei minimi dettagli. Grazie Naana\'s Kitchen!',
                rating: 5
              }
            ].map((review, idx) => (
              <div key={idx} style={styles.reviewCard}>
                <div style={styles.reviewRating}>
                  {Array(review.rating).fill(0).map((_, i) => (
                    <span key={i} style={{ color: '#d4a574', fontSize: 16, marginRight: 2 }}>★</span>
                  ))}
                </div>
                <p style={styles.reviewText}>"{review.text}"</p>
                <p style={styles.reviewAuthor}>{review.name}</p>
                <p style={styles.reviewRole}>{review.role}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

    </main>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  root: {
    // Uses Miller Banner (serif) for homepage. Make sure the font is loaded
    // via @font-face, a local asset, or a licensed webfont provider.
    fontFamily: "var(--font-sans, system-ui)",
    color: 'var(--inkcloud)',
  },
  hero: {
    background: 'var(--mossmilk)',
    padding: '48px 16px',
  },
  heroInner: {
    maxWidth: 1100,
    margin: '0 auto',
    display: 'grid',
    gridTemplateColumns: '1fr 480px',
    gap: 32,
    alignItems: 'center',
  },
  heroText: {
    paddingRight: 12,
  },
  title: {
    margin: 0,
    fontSize: 36,
    lineHeight: 1.05,
    fontWeight: 700,
    fontFamily: "var(--font-serif, 'Playfair Display')",
  },
  lead: {
    marginTop: 12,
    color: 'var(--inkcloud)',
    fontSize: 16,
  },
  heroImageWrap: {
    display: 'flex',
    justifyContent: 'center',
  },
  heroImage: {
    width: '100%',
    height: 'auto',
    borderRadius: 12,
    boxShadow: '0 6px 18px rgba(16,24,40,0.06)',
    objectFit: 'cover',
  },
  scrollNav: {
    position: 'sticky',
    top: 72, // below header
    zIndex: 30,
    display: 'flex',
    justifyContent: 'center',
    gap: 18,
    padding: '12px 0',
    background: 'linear-gradient(to bottom, rgba(184,175,166,0.95), rgba(184,175,166,0.85))',
    backdropFilter: 'blur(6px)',
    borderBottom: '1px solid rgba(74,74,74,0.04)',
  },
  navLink: {
    color: 'var(--inkcloud)',
    textDecoration: 'none',
    padding: '8px 12px',
    borderRadius: 999,
    fontSize: 14,
    background: 'transparent',
    transition: 'background 120ms ease, color 120ms ease',
  },
  stickyBg: {
    position: 'sticky',
    top: 72,
    height: '60vh',
    width: '100%',
    zIndex: 0,
    backgroundImage: `url(${bg})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    filter: 'blur(4px) saturate(0.9) brightness(0.85)',
    transform: 'scale(1.02)',
    pointerEvents: 'auto',
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  stickyBgContainer: {
    position: 'absolute' as const,
    inset: 0,
    backgroundImage: `url(${home3})`,
    backgroundSize: 'contain',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
  },
  stickyBgImage1: {
    display: 'none',
  },
  stickyBgImage2: {
    display: 'none',
  },
  stickyWrap: {
    position: 'relative',
    height: '60vh',
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: {
    padding: '56px 16px',
    position: 'relative',
    zIndex: 10,
    background: 'transparent',
  },
  sectionLight: {
    padding: '56px 16px',
    position: 'relative',
    zIndex: 10,
    background: 'var(--mossmilk)',
  },
  sectionInner: {
    maxWidth: 1100,
    margin: '0 auto',
  },
  sectionTitle: {
    margin: 0,
    fontSize: 22,
    fontWeight: 700,
  },
  sectionText: {
    marginTop: 12,
    color: 'var(--inkcloud)',
    maxWidth: 740,
  },
  gallery: {
    display: 'flex',
    gap: 12,
    overflowX: 'auto',
    padding: '16px 0',
    WebkitOverflowScrolling: 'touch',
  },
  photoCard: {
    minWidth: 320,
    flex: '0 0 320px',
    borderRadius: 12,
    overflow: 'hidden',
    boxShadow: '0 6px 18px rgba(74,74,74,0.06)',
  },
  photo: {
    width: '100%',
    height: 220,
    objectFit: 'cover',
    display: 'block',
  },
  menuButton: {
    position: 'absolute',
    bottom: '40%',
    left: '50%',
    transform: 'translateX(-50%)',
    background: 'rgba(255,255,255,0.9)',
    color: 'black',
    padding: '12px 18px',
    borderRadius: 999,
    textDecoration: 'none',
    fontWeight: 600,
    boxShadow: '0 8px 30px rgba(16,24,40,0.06)',
    zIndex: 5,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    boxSizing: 'border-box',
  },
  featureSection: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    alignItems: 'center',
    gap: 24,
    padding: '64px 16px',
    maxWidth: '1100px',
    margin: '0 auto',
  },
  featureLeft: {
    paddingRight: 12,
  },
  featureRight: {
    backgroundImage: `url(${imgC})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    borderRadius: 12,
    minHeight: 320,
    boxShadow: '0 6px 18px rgba(74,74,74,0.06)',
  },
  featureTitle: {
    margin: 0,
    fontSize: 26,
    color: 'var(--mossmilk)',
    fontWeight: 700,
    textShadow: '0 2px 6px rgba(74,74,74,0.45)',
    letterSpacing: 0.2,
  },
  featureText: {
    marginTop: 12,
    color: 'var(--inkcloud)',
    maxWidth: 560,
    lineHeight: 1.6,
  },
  coverSection: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    minHeight: '70vh',
    alignItems: 'stretch',
    position: 'relative',
    zIndex: 15,
  },
  coverLeft: {
    backgroundImage: `url(${bg})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    filter: 'none',
  },
  coverRight: {
    padding: '48px 32px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    background: 'linear-gradient(180deg, rgba(255,255,255,0.95), rgba(255,255,255,0.85))',
    borderRadius: 12,
    boxShadow: '0 12px 40px rgba(16,24,40,0.06)',
  },
  coverTitle: {
    margin: 0,
    fontSize: 28,
    fontWeight: 700,
  },
  coverText: {
    marginTop: 12,
    color: 'var(--inkcloud)',
    fontSize: 16,
    maxWidth: 520,
  },
  reviewsSection: {
    padding: '64px 16px',
    background: 'linear-gradient(180deg, rgba(212,165,116,0.05), rgba(212,165,116,0.02))',
    position: 'relative',
    zIndex: 10,
  },
  reviewsContainer: {
    maxWidth: '1100px',
    margin: '0 auto',
  },
  reviewsTitle: {
    textAlign: 'center',
    fontSize: 32,
    fontWeight: 700,
    color: 'var(--inkcloud)',
    margin: '0 0 12px 0',
  },
  reviewsSubtitle: {
    textAlign: 'center',
    fontSize: 16,
    color: 'var(--inkcloud)',
    marginBottom: 40,
    opacity: 0.8,
  },
  reviewsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: 24,
  },
  reviewCard: {
    background: 'white',
    padding: '28px',
    borderRadius: '16px',
    boxShadow: '0 4px 12px rgba(74,74,74,0.08)',
    transition: 'transform 0.3s, box-shadow 0.3s',
    border: '1px solid rgba(212,165,116,0.1)',
    display: 'flex',
    flexDirection: 'column',
  } as React.CSSProperties,
  reviewRating: {
    marginBottom: 12,
    display: 'flex',
  },
  reviewText: {
    fontSize: 15,
    color: 'var(--inkcloud)',
    lineHeight: 1.6,
    fontStyle: 'italic',
    margin: '0 0 16px 0',
    flex: 1,
  },
  reviewAuthor: {
    fontSize: 15,
    fontWeight: 700,
    color: 'var(--inkcloud)',
    margin: '0 0 4px 0',
  },
  reviewRole: {
    fontSize: 12,
    color: 'var(--inkcloud)',
    opacity: 0.7,
    margin: 0,
  },
};

export default Homepage;
