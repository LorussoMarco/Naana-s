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
        <p style={styles.text}>
          {t('about.text').split('\n').map((line, i) => (
            <React.Fragment key={i}>
              {line}
              {i < t('about.text').split('\n').length - 1 && <br />}
            </React.Fragment>
          ))}
        </p>
        <div style={styles.grid}>
          <figure style={styles.figure}>
            <img src={aImg} alt="Doris" style={styles.img} loading="lazy" />
            <figcaption style={styles.caption}>{t('about.figure1')}</figcaption>
          </figure>

          <figure style={styles.figure}>
            <img src={bImg} alt="Nerina" style={styles.img} loading="lazy" />
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
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: 32,
    marginBottom: 32,
  },
  figure: {
    margin: 0,
    textAlign: 'center' as const,
  },
  img: {
    width: '100%',
    maxWidth: 400,
    height: 'auto',
    aspectRatio: '3 / 4',
    objectFit: 'cover',
    display: 'block',
    margin: '0 auto',
    borderRadius: 12,
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
};

export default About;
