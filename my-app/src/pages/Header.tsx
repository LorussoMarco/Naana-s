import React, { useEffect, useState } from "react";
import { useTranslation } from 'react-i18next';
import logoImg from "../assets/logo.jpg";

type NavLink = { label: string; href: string };

interface HeaderProps {
    title?: string;
}

const Header: React.FC<HeaderProps> = ({
    title = "Naanas's Kitchen",
}) => {
    const { t, i18n } = useTranslation();
    const [isAuthed, setIsAuthed] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    useEffect(() => {
        const t = localStorage.getItem('token');
        setIsAuthed(!!t);
        const onStorage = () => setIsAuthed(!!localStorage.getItem('token'));
        window.addEventListener('storage', onStorage);
        return () => window.removeEventListener('storage', onStorage);
    }, []);
    const navLinks: NavLink[] = [
        { label: t('nav.home'), href: '/' },
        { label: t('nav.about'), href: '/about' },
        { label: t('nav.contact'), href: '/contact' },
    ];

    const changeLanguage = (lng: string) => {
        i18n.changeLanguage(lng);
        localStorage.setItem('lang', lng);
    };

    return (
        <header style={styles.header} className={`site-header ${menuOpen ? 'nav-open' : ''}`}>
            <div style={styles.container} className="container">
                <div style={styles.brand}>
                    <a href="/" style={styles.title}>
                        <img src={logoImg} alt={title} style={styles.logoImage} className={isAuthed ? 'hide-mobile' : ''} />
                    </a>
                </div>

                <button
                    className="mobile-toggle show-mobile"
                    aria-label={menuOpen ? t('header.close_menu') : t('header.open_menu')}
                    aria-expanded={menuOpen}
                    onClick={() => setMenuOpen((s) => !s)}
                    style={styles.mobileToggle}
                >
                    {menuOpen ? (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M6 6L18 18M6 18L18 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    ) : (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    )}
                </button>

                {/* auth controls (login/admin) -- language moved to the right */}
                <div style={styles.authRow} className="header-auth-row">
                    {isAuthed ? (
                        <>
                            <a href="/admin/products" style={styles.adminButton} className="auth-btn">
                                Modifica Prodotti
                            </a>
                            <a href="/admin/orders" style={styles.adminButton} className="auth-btn">
                                Gestisci Ordini
                            </a>
                            <button onClick={() => {
                                localStorage.removeItem('token');
                                window.location.href = '/';
                            }} style={styles.loginButton} className="auth-btn">
                                {t('auth.logout')}
                            </button>
                        </>
                    ) : (
                        <a href="/login" style={styles.loginButton}>
                            {t('auth.login')}
                        </a>
                    )}

                    {/* Desktop language selector: placed to the right of login */}
                    <select
                        id="lang-select"
                        aria-label={t('header.language')}
                        value={i18n.language}
                        onChange={(e) => changeLanguage(e.target.value)}
                        style={styles.langSelect}
                        className="hide-mobile"
                    >
                        <option value="it">{t('header.italian')}</option>
                        <option value="en">{t('header.english')}</option>
                    </select>
                </div>
            </div>

            <nav className={`mobile-nav ${menuOpen ? 'open' : ''}`} aria-label="Primary navigation">
                <ul style={{ ...styles.ul, ...styles.ulClickable }}>
                    {navLinks.map((l) => (
                        <li key={l.href} style={styles.li}>
                            <a href={l.href} style={styles.link} onClick={() => setMenuOpen(false)}>
                                {l.label}
                            </a>
                        </li>
                    ))}
                </ul>
            </nav>
        </header>
    );
};



const styles: { [k: string]: React.CSSProperties } = {
    header: {
        borderBottom: "1px solid var(--inkcloud)",
        background: "var(--mossmilk)",
        position: "sticky",
        top: 0,
        zIndex: 50,
    },
    container: {
        maxWidth: 1400,
        margin: "0 auto",
        padding: "0.75rem 1rem",
        display: "flex",
        alignItems: "center",
        gap: 12,
        justifyContent: "space-between",
        position: "relative",
    },
    brand: {
        display: "flex",
        alignItems: "center",
        gap: 12,
        flex: "0 0 auto",
    },
    logoWrapper: {
        display: "flex",
        alignItems: "center",
    },
    logoPlaceholder: {
        width: 44,
        height: 44,
        borderRadius: 10,
        background: "var(--inkcloud)",
        color: "var(--mossmilk)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: 700,
        fontSize: 18,
    },
    title: {
        color: "var(--inkcloud)",
        textDecoration: "none",
        fontSize: 18,
        marginLeft: 8,
        letterSpacing: 0.2,
    },
    logoImage: {
        height: 44,
        width: 'auto',
        display: 'block',
        borderRadius: 8,
    },
    mobileToggle: {
        background: 'transparent',
        border: 'none',
        color: 'var(--inkcloud)',
        cursor: 'pointer',
        padding: 8,
        marginLeft: 8,
        width: 40,
        height: 40,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
    nav: {
        // display: "flex", // Removed inline display for mobile CSS handling
        justifyContent: "center",
        alignItems: "center",
        position: "static",
        zIndex: 10,
        pointerEvents: "auto",
    },
    ul: {
        listStyle: "none",
        margin: 0,
        padding: 0,
        display: "flex",
        gap: 18,
        flexDirection: "row",
        flexWrap: "wrap",
    },
    li: {},
    link: {
        color: "var(--inkcloud)",
        textDecoration: "none",
        padding: "6px 10px",
        display: "inline-block",
        borderRadius: 8,
        fontSize: 15,
    },
    // make anchors clickable through the centered nav
    ulClickable: {
        pointerEvents: "auto",
        display: "flex",
        gap: 18,
    },
    loginButton: {
        background: "var(--inkcloud)",
        color: "white",
        padding: "8px 14px",
        borderRadius: 10,
        textDecoration: "none",
        fontWeight: 600,
        fontSize: 14,
        marginLeft: 8,
        boxShadow: "0 1px 2px rgba(74,74,74,0.08)",
    },
    adminButton: {
        background: 'transparent',
        color: 'var(--inkcloud)',
        padding: '8px 12px',
        borderRadius: 8,
        textDecoration: 'none',
        fontWeight: 600,
        fontSize: 14,
        marginLeft: 8,
        border: '1px solid rgba(0,0,0,0.06)',
    },
    authRow: {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        zIndex: 60,
        flexWrap: 'nowrap',
        whiteSpace: 'nowrap',
    },
    langSelect: {
        borderRadius: 8,
        padding: '6px 8px',
        border: '1px solid rgba(0,0,0,0.06)',
        marginLeft: 8,
    },
    // Larger screens
    "@media(min-width: 640px)": {},
};

export default Header;