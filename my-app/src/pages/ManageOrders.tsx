import React, { useEffect, useState } from 'react';

interface ClientInfo {
  id: number;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone_number?: string;
}

interface Order {
  id: number;
  client: number | null;
  client_info?: ClientInfo | null;
  status?: string | null;
  message?: string | null;
  max_budget?: number | null;
  delivery_type?: string | null;
  date?: string | null;
  street?: string | null;
  city?: string | null;
  postal_code?: string | null;
  num_people?: number | null;
  event_type?: string | null;
}

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const ManageOrders: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  const fetchOrders = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API}/orders`);
      if (!res.ok) throw new Error(`Fetch failed (${res.status})`);
      const data = await res.json();
      setOrders(data || []);
    } catch (e: any) {
      setError(e.message || 'Errore caricamento ordini');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const confirmOrder = async (id: number) => {
    try {
      await fetch(`${API}/orders/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'confirmed' }),
      });
      fetchOrders();
    } catch (e) {
      console.error(e);
    }
  };

  const completeOrder = async (id: number) => {
    try {
      await fetch(`${API}/orders/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'completed' }),
      });
      fetchOrders();
    } catch (e) {
      console.error(e);
    }
  };

  const deleteOrder = async (id: number) => {
    if (!confirm('Sei sicuro di voler eliminare questo ordine?')) return;
    try {
      await fetch(`${API}/orders/${id}`, { method: 'DELETE' });
      fetchOrders();
    } catch (e) {
      console.error(e);
    }
  };

  const filtered = orders.filter((o) => {
    if (!query) return true;
    const q = query.toLowerCase();
    const clientName = o.client_info ? `${o.client_info.first_name || ''} ${o.client_info.last_name || ''}` : '';
    return (
      String(o.id).includes(q) ||
      (o.event_type || '').toLowerCase().includes(q) ||
      clientName.toLowerCase().includes(q) ||
      (o.city || '').toLowerCase().includes(q)
    );
  });

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: 20 }}>
      <h1 style={{ marginBottom: 6 }}>Gestisci ordini</h1>
      <p style={{ marginTop: 0, color: '#555' }}>Visualizza, conferma o elimina le ordinazioni</p>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center' }}>
        <input
          placeholder="Cerca per id, cliente, evento, città..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: '1px solid #ddd' }}
        />
      </div>

      {loading && <div>Caricamento ordini...</div>}
      {error && <div style={{ color: 'crimson' }}>{error}</div>}

      <div style={{ display: 'grid', gap: 14 }}>
        {filtered.length === 0 && !loading && <div style={{ color: '#666' }}>Nessun ordine trovato.</div>}
        {filtered.map((o) => (
          <div key={o.id} style={{ padding: 14, background: '#fff', borderRadius: 10, boxShadow: '0 8px 30px rgba(2,6,23,0.06)', border: '1px solid rgba(2,6,23,0.04)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong style={{ fontSize: 16 }}>Ordine #{o.id}</strong>
                <div style={{ fontSize: 13, color: '#666', marginTop: 4 }}>
                  <StatusBadge status={o.status || 'pending'} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <ActionButton onClick={() => confirmOrder(o.id)} label="Conferma" />
                <ActionButton onClick={() => completeOrder(o.id)} label="Completato" />
                <ActionButton onClick={() => deleteOrder(o.id)} label="Elimina" danger />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
              <div>
                <h4 style={{ margin: '0 0 8px 0' }}>Dati cliente</h4>
                {o.client_info ? (
                  <div style={{ color: '#333' }}>
                    <div><strong>{o.client_info.first_name} {o.client_info.last_name}</strong></div>
                    <div style={{ fontSize: 13 }}>{o.client_info.email}</div>
                    <div style={{ fontSize: 13 }}>{o.client_info.phone_number}</div>
                  </div>
                ) : (
                  <div style={{ color: '#666' }}>Cliente non disponibile</div>
                )}
              </div>

              <div>
                <h4 style={{ margin: '0 0 8px 0' }}>Dettagli ordine</h4>
                <div style={{ color: '#333', fontSize: 14, lineHeight: 1.5 }}>
                  <div><strong>Evento:</strong> {o.event_type || '-'}</div>
                  <div><strong>Persone:</strong> {o.num_people ?? '-'}</div>
                  <div><strong>Budget max:</strong> {o.max_budget ?? '-'}</div>
                  <div><strong>Data:</strong> {o.date ?? '-'}</div>
                  <div><strong>Note:</strong> {o.message ?? '-'}</div>
                  <div><strong>Consegna:</strong> {o.delivery_type ?? '-'}</div>
                  <div><strong>Indirizzo:</strong> {o.street ?? ''} {o.city ?? ''} {o.postal_code ?? ''}</div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { color: string; bg: string }> = {
    pending: { color: '#7C3AED', bg: '#F3E8FF' },
    confirmed: { color: '#0EA5A4', bg: '#ECFEFF' },
    completed: { color: '#047857', bg: '#ECFDF5' },
    cancelled: { color: '#B91C1C', bg: '#FEE2E2' },
  };
  const s = map[status] || { color: '#374151', bg: '#F3F4F6' };
  return <span style={{ display: 'inline-block', padding: '4px 10px', borderRadius: 999, background: s.bg, color: s.color, fontSize: 12 }}>{status}</span>;
}

function ActionButton({ onClick, label, danger }: { onClick: () => void; label: string; danger?: boolean }) {
  return (
    <button onClick={onClick} style={{ padding: '8px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', background: danger ? '#ef4444' : '#111827', color: '#fff' }}>{label}</button>
  );
}

export default ManageOrders;
