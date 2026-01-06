import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
// react-router's useNavigate is optional for this component; we don't require it.

const Login: React.FC = () => {
  // react-router navigation is optional here; we fallback to window.location
  // so we don't rely on the router instance in this small example.

  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email || !password) {
      setError(t('auth.enter_email_password'));
      return;
    }
    setLoading(true);
    try {
      const resp = await fetch(`${apiBase}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const json = await resp.json();
      setLoading(false);
        if (!resp.ok) {
        setError(json && json.error ? json.error : t('auth.login_error'));
        return;
      }

      // save JWT token in localStorage
      if (json.token) {
        localStorage.setItem('token', json.token);
      }

      // redirect after login
      if (typeof window !== 'undefined' && (window as any).location) {
        window.location.href = '/product';
      }
    } catch (err: any) {
      setLoading(false);
      setError(err?.message || t('auth.cannot_login'));
    }
  };

  return (
    <main style={styles.root}>
      <div style={styles.card}>
        <h1 style={styles.title}>{t('auth.login')}</h1>
        <br></br>
        <form onSubmit={submit} style={styles.form}>
          <label style={styles.label} htmlFor="email">{t('contact.email')}</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={styles.input}
            required
            autoComplete="email"
          />

          <label style={styles.label} htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={styles.input}
            required
            autoComplete="current-password"
          />

          {error && <div style={styles.error}>{error}</div>}

          <div style={styles.actions}>
            <button type="submit" style={styles.submit} disabled={loading}>
              {loading ? t('auth.accessing') : t('auth.login')}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
};

const styles: { [k: string]: React.CSSProperties } = {
  root: {
    minHeight: '70vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 16px',
    background: 'var(--mossmilk)',
    fontFamily: "'Miller Banner', Inter, system-ui, -apple-system, 'Segoe UI', Roboto, Arial, serif",
    color: 'var(--inkcloud)',
  },
  card: {
    width: '100%',
    maxWidth: 420,
    padding: 28,
    borderRadius: 12,
    boxShadow: '0 10px 30px rgba(74,74,74,0.08)',
    background: 'var(--mossmilk)',
  },
  title: {
    margin: 0,
    fontSize: 22,
    fontWeight: 700,
  },
  lead: {
    marginTop: 8,
    marginBottom: 18,
    color: 'var(--inkcloud)',
    fontSize: 14,
  },
  form: {
    display: 'grid',
    gap: 12,
  },
  label: {
    fontSize: 13,
    color: 'var(--inkcloud)',
  },
  input: {
    padding: '10px 12px',
    borderRadius: 8,
    border: '1px solid rgba(74,74,74,0.12)',
    fontSize: 14,
  },
  actions: {
    display: 'flex',
    justifyContent: 'flex-end',
    marginTop: 6,
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
  error: {
    color: 'var(--inkcloud)',
    background: 'rgba(184,175,166,0.06)',
    padding: '8px 10px',
    borderRadius: 8,
    border: '1px solid rgba(74,74,74,0.06)',
  },
};

export default Login;
