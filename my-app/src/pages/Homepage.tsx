import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import bg from '../assets/d.jpg';
import imgC from '../assets/b.jpg';
import Stepper, { Step } from '../Component/Stepper';

const Homepage: React.FC = () => {
  const { t } = useTranslation();
  const [showStepper, setShowStepper] = useState(false);
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
        <div style={styles.stickyBg} className="sticky-bg" />
        <a href="/product" style={styles.menuButton} className="menu-button">
          {t('homepage.view_products')}
        </a>
        <button
          onClick={() => setShowStepper(true)}
          className="primary menu-button"
          style={{
            ...styles.menuButton,
            left: 'calc(50% + 140px)',
            transform: 'translateX(-40%)',
          }}
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

      {/* Cover section: top image (d.jpg blurred), bottom image (b.jpg) */}
      <section id="cover" style={styles.coverSection}>
        <div style={styles.coverLeft} />
        <div style={styles.coverBottom} />
      </section>

      <section id="feature" style={styles.featureSection}>
        <div style={styles.featureLeft}>
          <h3 style={styles.featureTitle}>{t('homepage.feature_title')}</h3>
          <p style={styles.featureText}>{t('homepage.feature_text')}</p>
        </div>

        <div style={styles.featureRight} />
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
  stickyWrap: {
    position: 'relative',
    height: '60vh',
    width: '100%',
    display: 'block',
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
    color: 'var(--accent-600)',
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
    gridTemplateColumns: '1fr',
    gridTemplateRows: '1fr 1fr',
    minHeight: '100vh',
    alignItems: 'stretch',
    position: 'relative',
    zIndex: 15,
  },
  coverLeft: {
    backgroundImage: `url(${bg})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    filter: 'blur(4px)',
    minHeight: '50vh',
  },
  coverBottom: {
    backgroundImage: `url(${imgC})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    filter: 'none',
    minHeight: '50vh',
  },
  coverTitle: {
    display: 'none',
  },
  coverText: {
    display: 'none',
  },
    fontSize: 16,
    maxWidth: 520,
  },
};

export default Homepage;
