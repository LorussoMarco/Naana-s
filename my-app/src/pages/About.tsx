import React from 'react';
import { useTranslation } from 'react-i18next';
import SEO from '../services/SEO';
import aImg from '../assets/doris.jpeg';
import bImg from '../assets/nerina.jpeg';

const About: React.FC = () => {
  const { t } = useTranslation();
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
        <p style={styles.lead}>
          {t('about.lead').split('\n').map((line, i) => (
            <React.Fragment key={i}>
              {line}
              {i < t('about.lead').split('\n').length - 1 && <br />}
            </React.Fragment>
          ))}
        </p>

        <div style={styles.grid}>
          <figure style={styles.figure}>
            <img src={aImg} alt={t('about.figure1')} style={styles.img} />
            <figcaption style={styles.caption}>{t('about.figure1')}</figcaption>
          </figure>

          <figure style={styles.figure}>
            <img src={bImg} alt={t('about.figure2')} style={styles.img} />
            <figcaption style={styles.caption}>{t('about.figure2')}</figcaption>
          </figure>
        </div>

        <p style={styles.text}>
          {t('about.text').split('\n').map((line, i) => (
            <React.Fragment key={i}>
              {line}
              {i < t('about.text').split('\n').length - 1 && <br />}
            </React.Fragment>
          ))}
        </p>
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
    maxWidth: 1100,
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
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: 16,
    marginBottom: 20,
  },
  figure: {
    margin: 0,
    background: 'white',
    borderRadius: 10,
    overflow: 'hidden',
    boxShadow: '0 6px 18px rgba(0,0,0,0.06)',
  },
  img: {
    width: '100%',
    height: 'auto',
    display: 'block',
  },
  caption: {
    padding: '10px 12px',
    fontSize: 14,
    color: 'var(--inkcloud)',
  },
  text: {
    fontSize: 16,
    lineHeight: 1.6,
    color: 'rgba(0,0,0,0.7)',
  },
};

export default About;
