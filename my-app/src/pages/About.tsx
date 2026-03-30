import React from 'react';
import { useTranslation } from 'react-i18next';
import SEO from '../services/SEO';
import aImg from '../assets/doris.jpeg';
import bImg from '../assets/nerina.jpeg';

const About: React.FC = () => {
  const { t } = useTranslation();
  const [isMobile, setIsMobile] = React.useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(max-width: 768px)').matches;
  });

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const mediaQuery = window.matchMedia('(max-width: 768px)');
    const handleMediaChange = (event: MediaQueryListEvent) => setIsMobile(event.matches);

    setIsMobile(mediaQuery.matches);
    mediaQuery.addEventListener('change', handleMediaChange);

    return () => mediaQuery.removeEventListener('change', handleMediaChange);
  }, []);

  return (
    <>
      <SEO
        title="Chi Siamo | Naana's Kitchen"
        description="Scopri la storia di Naana's Kitchen, il nostro impegno verso l'eccellenza culinaria e i nostri servizi di catering professionale."
        url="https://naanaskitchen.com/about"
        type="website"
      />
      <section style={styles.section} aria-labelledby="about-title">
      <div style={styles.container}>
        <h1 id="about-title" style={styles.title}>{t('about.title')}</h1>
        <p style={styles.reminder}>
          {t('about.reminder')}
        </p>
        <p style={styles.lead}>
          {t('about.lead').split('\n').map((line, i) => (
            <React.Fragment key={i}>
              {line}
              {i < t('about.lead').split('\n').length - 1 && <br />}
            </React.Fragment>
          ))}
        </p>
        <p style={styles.text}>
          {t('about.text').split('\n').map((line, i) => (
            <React.Fragment key={i}>
              {line}
              {i < t('about.text').split('\n').length - 1 && <br />}
            </React.Fragment>
          ))}
        </p>

        <div
          style={{
            ...styles.grid,
            ...(isMobile ? styles.gridMobile : styles.gridDesktop),
          }}
        >
          <figure style={styles.figure}>
            <img
              src={aImg}
              alt="Doris"
              style={styles.img}
              loading="lazy"
            />
            <figcaption style={styles.caption}>{t('about.figure1')}</figcaption>
          </figure>

          <figure style={styles.figure}>
            <img
              src={bImg}
              alt="Nerina"
              style={styles.img}
              loading="lazy"
            />
            <figcaption style={styles.caption}>{t('about.figure2')}</figcaption>
          </figure>
        </div>


      </div>
    </section>
    </>
  );
};

const styles: { [k: string]: React.CSSProperties } = {
  section: {
    padding: '2rem 1rem',
  },
  container: {
    maxWidth: 1380,
    margin: '0 auto',
    color: 'var(--inkcloud)',
  },
  title: {
    fontSize: 32,
    marginBottom: 8,
  },
  lead: {
    fontSize: 18,
    color: 'rgba(0,0,0,0.75)',
    marginBottom: 20,
    lineHeight: 1.5,
  },
  grid: {
    display: 'grid',
    marginBottom: 32,
  },
  gridDesktop: {
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: 72,
  },
  gridMobile: {
    gridTemplateColumns: '1fr',
    gap: 44,
  },
  figure: {
    margin: 0,
    textAlign: 'center' as const,
  },
  img: {
    width: '100%',
    maxWidth: 640,
    height: 'auto',
    aspectRatio: '4 / 3',
    objectFit: 'contain',
    display: 'block',
    margin: '0 auto',
    borderRadius: 12,
    background: '#fff',
    boxShadow: '0 6px 16px rgba(74,74,74,0.08)',
  },
  caption: {
    padding: '12px 0',
    fontSize: 16,
    fontWeight: 600,
    color: 'var(--inkcloud)',
  },
  text: {
    fontSize: 16,
    lineHeight: 1.6,
    color: 'rgba(0,0,0,0.7)',
  },
  reminder: {
    fontSize: 19,
    lineHeight: 1.7,
    fontStyle: 'italic',
    textAlign: 'center' as const,
    color: 'rgba(0,0,0,0.78)',
    maxWidth: 760,
    margin: '26px auto 34px',
    padding: '14px 18px',
    borderTop: '1px solid rgba(0,0,0,0.16)',
    borderBottom: '1px solid rgba(0,0,0,0.16)',
  },
};

export default About;
