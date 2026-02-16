import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Header from './pages/Header';
import Footer from './pages/Footer';
import Homepage from './pages/Homepage';
import Contatti from './pages/Contact';
import About from './pages/About';
import Login from './pages/Login';
import EditProducts from './pages/EditProducts';
import ManageOrders from './pages/ManageOrders';
import { useSessionSecurity } from './hooks/useSessionSecurity';
import AuthService from './services/AuthService';

// Session warning modal component
const SessionWarning: React.FC<{ show: boolean; onContinue: () => void }> = ({ show, onContinue }) => {
  if (!show) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
    }}>
      <div style={{
        background: 'white',
        padding: '24px',
        borderRadius: '8px',
        minWidth: '300px',
        textAlign: 'center',
        boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
      }}>
        <h2 style={{ marginTop: 0, color: '#e74c3c' }}>Sessione in scadenza</h2>
        <p>La tua sessione scadrà tra 2 minuti per inattività.</p>
        <p>Clicca per continuare o verrai disconnesso.</p>
        <button
          onClick={onContinue}
          style={{
            padding: '10px 20px',
            borderRadius: '6px',
            background: '#111827',
            color: 'white',
            border: 'none',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 600,
          }}
        >
          Continua sessione
        </button>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [showSessionWarning, setShowSessionWarning] = useState(false);

  useSessionSecurity({
    timeoutMs: 30 * 60 * 1000, // 30 minuti
    warningMs: 2 * 60 * 1000,  // Avviso 2 minuti prima
    onWarning: () => {
      // Only show warning if user is authenticated
      if (AuthService.isAuthenticated()) {
        setShowSessionWarning(true);
      }
    },
    onTimeout: () => {
      AuthService.logout().finally(() => {
        window.location.href = '/login';
      });
    }
  });

  const handleContinueSession = () => {
    setShowSessionWarning(false);
  };

  return (
    <Router>
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
        <SessionWarning show={showSessionWarning} onContinue={handleContinueSession} />
        <Header />
        <main style={{ flex: 1, overflowY: 'auto' }}>
          <Routes>
            <Route path="/" element={<Homepage />} />
            <Route path="/contact" element={<Contatti />} />
            <Route path="/about" element={<About />} />
            <Route path="/login" element={<Login />} />
            <Route path="/admin/products" element={<EditProducts />} />
            <Route path="/admin/orders" element={<ManageOrders />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  );
};

export default App;
