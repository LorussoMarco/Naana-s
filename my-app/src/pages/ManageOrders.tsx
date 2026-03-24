import React, { useEffect, useState } from 'react';
import SecureHttpClient from '../services/SecureHttpClient';

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

interface Review {
  id: number;
  name: string;
  event_type?: string | null;
  rating: number;
  text: string;
  approved: boolean;
  created_at: string;
  order_id?: number | null;
}

const ManageOrders: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'orders' | 'reviews'>('orders');

  // Reviews state
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsError, setReviewsError] = useState<string | null>(null);

  const fetchOrders = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await SecureHttpClient.get('/orders');
      if (!res.ok) throw new Error(`Fetch failed (${res.status})`);
      const data = await res.json();
      setOrders(data || []);
    } catch (e: any) {
      setError(e.message || 'Errore caricamento ordini');
    } finally {
      setLoading(false);
    }
  };

  const fetchReviews = async () => {
    setReviewsLoading(true);
    setReviewsError(null);
    try {
      const res = await SecureHttpClient.get('/reviews/all');
      if (!res.ok) throw new Error(`Fetch failed (${res.status})`);
      const data = await res.json();
      setReviews(data || []);
    } catch (e: any) {
      setReviewsError(e.message || 'Errore caricamento review');
    } finally {
      setReviewsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    fetchReviews();
  }, []);

  const approveReview = async (id: number) => {
    try {
      await SecureHttpClient.put(`/reviews/${id}`, { approved: true });
      fetchReviews();
    } catch (e) { console.error(e); }
  };

  const rejectReview = async (id: number) => {
    try {
      await SecureHttpClient.put(`/reviews/${id}`, { approved: false });
      fetchReviews();
    } catch (e) { console.error(e); }
  };

  const deleteReview = async (id: number) => {
    if (!confirm('Sei sicuro di voler eliminare questa review?')) return;
    try {
      await SecureHttpClient.delete(`/reviews/${id}`);
      fetchReviews();
    } catch (e) { console.error(e); }
  };

  const confirmOrder = async (id: number) => {
    try {
      await SecureHttpClient.put(`/orders/${id}`, { status: 'confirmed' });
      fetchOrders();
    } catch (e) {
      console.error(e);
    }
  };

  const completeOrder = async (id: number) => {
    try {
      await SecureHttpClient.put(`/orders/${id}`, { status: 'completed' });
      fetchOrders();
    } catch (e) {
      console.error(e);
    }
  };

  const deleteOrder = async (id: number) => {
    if (!confirm('Sei sicuro di voler eliminare questo ordine?')) return;
    try {
      await SecureHttpClient.delete(`/orders/${id}`);
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

  const pendingReviewsCount = reviews.filter(r => !r.approved).length;

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: 20 }}>
      <h1 style={{ marginBottom: 6 }}>Pannello Admin</h1>

      {/* Tab navigation */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 20, borderBottom: '2px solid #e5e7eb' }}>
        <button
          onClick={() => setActiveTab('orders')}
          style={{
            padding: '12px 24px', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 14,
            background: activeTab === 'orders' ? '#111827' : 'transparent',
            color: activeTab === 'orders' ? '#fff' : '#555',
            borderRadius: '8px 8px 0 0',
          }}
        >
          Ordini ({orders.length})
        </button>
        <button
          onClick={() => setActiveTab('reviews')}
          style={{
            padding: '12px 24px', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 14,
            background: activeTab === 'reviews' ? '#111827' : 'transparent',
            color: activeTab === 'reviews' ? '#fff' : '#555',
            borderRadius: '8px 8px 0 0',
            position: 'relative',
          }}
        >
          Review ({reviews.length})
          {pendingReviewsCount > 0 && (
            <span style={{
              position: 'absolute', top: 4, right: 4, background: '#ef4444', color: '#fff',
              borderRadius: 999, padding: '2px 7px', fontSize: 11, fontWeight: 700,
            }}>{pendingReviewsCount}</span>
          )}
        </button>
      </div>

      {activeTab === 'orders' && (
        <>
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
        </>
      )}

      {activeTab === 'reviews' && (
        <>
          <p style={{ marginTop: 0, color: '#555' }}>Modera le review dei clienti</p>
          {reviewsLoading && <div>Caricamento review...</div>}
          {reviewsError && <div style={{ color: 'crimson' }}>{reviewsError}</div>}
          <div style={{ display: 'grid', gap: 14 }}>
            {reviews.length === 0 && !reviewsLoading && <div style={{ color: '#666' }}>Nessuna review trovata.</div>}
            {reviews.map((r) => (
              <div key={r.id} style={{ padding: 14, background: '#fff', borderRadius: 10, boxShadow: '0 8px 30px rgba(2,6,23,0.06)', border: r.approved ? '1px solid rgba(2,6,23,0.04)' : '2px solid #fbbf24' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <strong style={{ fontSize: 16 }}>{r.name}</strong>
                    <span style={{ marginLeft: 8, fontSize: 12, color: '#888' }}>{r.event_type || ''}</span>
                    <div style={{ marginTop: 4 }}>
                      <ReviewStatusBadge approved={r.approved} />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {!r.approved && <ActionButton onClick={() => approveReview(r.id)} label="Approva" />}
                    {r.approved && <ActionButton onClick={() => rejectReview(r.id)} label="Nascondi" />}
                    <ActionButton onClick={() => deleteReview(r.id)} label="Elimina" danger />
                  </div>
                </div>
                <div style={{ marginTop: 8 }}>
                  <div style={{ display: 'flex', gap: 2, marginBottom: 4 }}>
                    {Array(r.rating).fill(0).map((_, i) => (
                      <span key={i} style={{ color: '#d4a574', fontSize: 14 }}>★</span>
                    ))}
                    {Array(5 - r.rating).fill(0).map((_, i) => (
                      <span key={i} style={{ color: '#ddd', fontSize: 14 }}>★</span>
                    ))}
                  </div>
                  <p style={{ margin: 0, color: '#333', fontSize: 14, lineHeight: 1.5 }}>"{r.text}"</p>
                  <p style={{ marginTop: 4, fontSize: 12, color: '#999' }}>
                    {new Date(r.created_at).toLocaleDateString('it-IT')}
                    {r.order_id ? ` — Ordine #${r.order_id}` : ''}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
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

function ReviewStatusBadge({ approved }: { approved: boolean }) {
  const s = approved
    ? { color: '#047857', bg: '#ECFDF5', label: 'Approvata' }
    : { color: '#92400e', bg: '#FEF3C7', label: 'In attesa' };
  return <span style={{ display: 'inline-block', padding: '4px 10px', borderRadius: 999, background: s.bg, color: s.color, fontSize: 12 }}>{s.label}</span>;
}

function ActionButton({ onClick, label, danger }: { onClick: () => void; label: string; danger?: boolean }) {
  return (
    <button onClick={onClick} style={{ padding: '8px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', background: danger ? '#ef4444' : '#111827', color: '#fff' }}>{label}</button>
  );
}

export default ManageOrders;
