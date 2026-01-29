import React from 'react';
import { useTranslation } from 'react-i18next';

const Footer: React.FC = () => {
  const { t } = useTranslation();
  return (
    <footer style={styles.footer}>
      <div style={styles.container} className="container">
        <p style={styles.copy}>© {new Date().getFullYear()} Catering Site</p>

        <nav aria-label="Footer navigation" style={styles.nav}>
          <a href="/contact" style={styles.link}>{t('nav.contact')}</a>
        </nav>

        <div style={styles.made} aria-hidden>
          Made with <span style={styles.heart}>❤</span>
        </div>
      </div>
    </footer>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  footer: {
    borderTop: '1px solid var(--inkcloud)',
    background: 'var(--mossmilk)',
    color: 'var(--inkcloud)',
    padding: '20px 16px',
    fontSize: 14,
  },
  container: {
    maxWidth: 1100,
    margin: '0 auto',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    flexWrap: 'wrap',
  },
  copy: {
    margin: 0,
    color: 'var(--inkcloud)',
  },
  nav: {
    display: 'flex',
    gap: 16,
    alignItems: 'center',
  },
  link: {
    color: 'var(--inkcloud)',
    textDecoration: 'none',
    padding: '6px 8px',
    borderRadius: 8,
    fontSize: 13,
  },
  made: {
    color: 'var(--inkcloud)',
    fontSize: 13,
  },
  heart: {
    color: 'var(--inkcloud)',
    marginLeft: 6,
  },
};

export default Footer;
