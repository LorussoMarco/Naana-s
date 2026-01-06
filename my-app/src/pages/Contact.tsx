import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

const Contact: React.FC = () => {
  const { t } = useTranslation();
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.currentTarget as HTMLFormElement;
    const formData = new FormData(form);

    setSubmitting(true);
    try {
      const payload = Object.fromEntries(formData.entries());
      // optional subject
      payload._subject = payload._subject || `Contact form from ${payload.name || ''}`;

      const API = 'http://localhost:5000/api';
      const res = await fetch(`${API}/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        alert(t('contact.sent_alert'));
        form.reset();
      } else {
        console.error('Contact API error', data);
        alert(t('contact.sent_error'));
      }
    } catch (err) {
      console.error(err);
      alert(t('contact.sent_error'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main style={styles.root}>
      <div style={styles.container}>
        <h1 style={styles.title}>{t('contact.title')}</h1>
        <p style={styles.lead}>{t('contact.lead')}</p>

        <div style={styles.grid}>
          <address style={styles.card}>
            <h3 style={styles.cardTitle}>{t('contact.office_title')}</h3>
            <p style={styles.cardText}>Via Roma 1<br/>00100 Roma (RM), Italia</p>
            <p style={styles.cardText}>Tel: <a href="tel:+390612345678" style={styles.link}>+39 06 1234 5678</a></p>
            <p style={styles.cardText}>Email: <a href="mailto:info@example.com" style={styles.link}>info@example.com</a></p>
          </address>

          <div style={styles.card}>
            <h3 style={styles.cardTitle}>{t('contact.showroom_title')}</h3>
            <p style={styles.cardText}>Corso Buenos Aires 12<br/>20124 Milano (MI), Italia</p>
            <p style={styles.cardText}>Tel: <a href="tel:+390298765432" style={styles.link}>+39 02 9876 5432</a></p>
            <p style={styles.cardText}>Email: <a href="mailto:milano@example.com" style={styles.link}>milano@example.com</a></p>
          </div>

          <div style={styles.card}>
            <h3 style={styles.cardTitle}>{t('contact.hours_title')}</h3>
            <p style={styles.cardText}>Lun - Ven: 09:00 — 18:00<br/>Sab: 10:00 — 14:00<br/>Dom: chiuso</p>
          </div>

          <div style={styles.card}>
            <h3 style={styles.cardTitle}>{t('contact.social_title')}</h3>
            <p style={styles.cardText}>Instagram: <a href="#" style={styles.link}>@naanaskitchen</a><br/>Facebook: <a href="#" style={styles.link}>Naana's Kitchen</a></p>
          </div>
        </div>

        <section style={styles.formWrap} aria-labelledby="contact-form-title">
          <h2 id="contact-form-title" style={styles.formTitle}>{t('contact.form_title')}</h2>
          <form onSubmit={handleSubmit} style={styles.form}>
            {/* honeypot to reduce spam */}
            <input type="text" name="_honey" style={{ display: 'none' }} />
            <input name="name" placeholder={t('contact.name')} className="form-input" required />
            <input name="email" type="email" placeholder={t('contact.email')} className="form-input" required />
            <textarea name="message" placeholder={t('contact.message')} rows={6} className="form-input" required />
            <div style={styles.formActions}>
              <button type="submit" style={styles.submit} disabled={submitting}>{submitting ? t('contact.sending') || 'Sending...' : t('contact.submit')}</button>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  root: {
    fontFamily: "Inter, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial",
    color: 'var(--inkcloud)',
    padding: '40px 16px',
  },
  container: {
    maxWidth: 1100,
    margin: '0 auto',
  },
  title: {
    fontSize: 28,
    margin: 0,
    fontWeight: 700,
  },
  lead: {
    marginTop: 8,
    color: 'var(--inkcloud)',
    marginBottom: 24,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: 16,
    marginBottom: 32,
  },
  card: {
    background: 'var(--mossmilk)',
    padding: 16,
    borderRadius: 8,
    boxShadow: '0 6px 18px rgba(74,74,74,0.04)',
  },
  cardTitle: {
    margin: 0,
    fontSize: 16,
    fontWeight: 700,
  },
  cardText: {
    marginTop: 8,
    color: 'var(--inkcloud)',
    lineHeight: 1.5,
  },
  link: {
    color: 'var(--inkcloud)',
    textDecoration: 'none',
  },
  formWrap: {
    marginTop: 8,
  },
  formTitle: {
    margin: 0,
    fontSize: 18,
    fontWeight: 700,
    marginBottom: 12,
  },
  form: {
    display: 'grid',
    gap: 12,
    gridTemplateColumns: '1fr',
  },
  input: {
    padding: '10px 12px',
    borderRadius: 8,
    border: '1px solid rgba(74,74,74,0.12)',
    fontSize: 14,
  },
  textarea: {
    padding: '10px 12px',
    borderRadius: 8,
    border: '1px solid rgba(74,74,74,0.12)',
    fontSize: 14,
    resize: 'vertical',
  },
  formActions: {
    display: 'flex',
    justifyContent: 'flex-end',
  },
  submit: {
    background: 'var(--inkcloud)',
    color: 'white',
    padding: '10px 16px',
    borderRadius: 8,
    border: 'none',
    cursor: 'pointer',
    fontWeight: 600,
  },
};

export default Contact;

