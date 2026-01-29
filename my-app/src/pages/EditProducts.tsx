import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

type Item = {
  id?: string;
  name: string;
  available?: boolean;
  description?: string | null;
  images?: any[];
};

const EditProducts: React.FC = () => {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<Item | null>(null);

  const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
    }
  }, []);

  async function fetchItems() {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${apiBase}/items`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      if (res.status === 401) {
        // token expired or invalid
        localStorage.removeItem('token');
        navigate('/login');
        return;
      }
      const data = await res.json();
      setItems(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchItems();
  }, []);

  const filtered = items.filter(i => {
    if (!query) return true;
    const q = query.toLowerCase();
    return (i.name || '').toLowerCase().includes(q)
      || (i.description || '').toLowerCase().includes(q);
  });

  async function removeItem(id: string) {
    if (!confirm('Confermi la cancellazione di questo prodotto?')) return;
    const token = localStorage.getItem('token');
    const res = await fetch(`${apiBase}/items/${id}`, { method: 'DELETE', headers: token ? { Authorization: `Bearer ${token}` } : {} });
    if (res.status === 401) {
      localStorage.removeItem('token');
      navigate('/login');
      return;
    }
    fetchItems();
  }

  function startEdit(item: Item) {
    setEditing({ ...item });
  }

  function cancelEdit() {
    setEditing(null);
  }

  async function saveEdit(eOrForm: React.FormEvent | FormData) {
    // If caller passed a FormData object (from EditForm), handle it directly
    if (eOrForm && typeof (eOrForm as any).append === 'function') {
      const formData = eOrForm as FormData;
      if (!editing) return;
      const method = editing.id ? 'PUT' : 'POST';
      const url = editing.id ? `${apiBase}/items/${editing.id}` : `${apiBase}/items`;
      const token = localStorage.getItem('token');
      const headers: any = {};
      if (token) headers.Authorization = `Bearer ${token}`;
      const res = await fetch(url, { method, headers, body: formData });
      if (res.status === 401) {
        localStorage.removeItem('token');
        navigate('/login');
        return;
      }
      setEditing(null);
      fetchItems();
      return;
    }

    // Otherwise it's a normal form event
    const e = eOrForm as React.FormEvent;
    e.preventDefault();
    if (!editing) return;
    const payload: any = { ...editing };
    // if id is empty string, remove it so backend can create a new record
    if (payload.id === '') delete payload.id;
    // description nullable
    if (payload.description === '') payload.description = null;
    const method = editing.id ? 'PUT' : 'POST';
    const url = editing.id ? `${apiBase}/items/${editing.id}` : `${apiBase}/items`;
    const token = localStorage.getItem('token');
    const headers: any = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch(url, { method, headers, body: JSON.stringify(payload) });
    if (res.status === 401) {
      localStorage.removeItem('token');
      navigate('/login');
      return;
    }
    setEditing(null);
    fetchItems();
  }

  function startNew() {
    setEditing({ id: '', name: '', available: true, description: null });
  }

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      <h1 style={{ marginBottom: 8 }}>Gestione prodotti</h1>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center' }}>
        <input placeholder="Cerca..." value={query} onChange={e => setQuery(e.target.value)} className="form-input" style={{ flex: 1 }} />
        <button onClick={startNew} style={{ padding: '8px 12px', borderRadius: 8, background: '#111827', color: '#fff' }}>Aggiungi prodotto</button>
      </div>

      {loading ? (
        <div>Caricamento...</div>
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          {/* If creating a new item, show the form at the top */}
          {editing && editing.id === '' && (
            <div style={{ marginBottom: 8, padding: 12, borderRadius: 8, background: '#fff', boxShadow: '0 6px 18px rgba(2,6,23,0.04)' }}>
              <EditForm editing={editing} setEditing={setEditing} saveEdit={saveEdit} cancelEdit={cancelEdit} />
            </div>
          )}

          {filtered.map(it => (
            <div key={it.id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 12, background: '#fff', borderRadius: 8, boxShadow: '0 6px 18px rgba(2,6,23,0.04)' }}>
                <div>
                  <div style={{ fontWeight: 700 }}>{it.name}</div>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <div style={{ fontSize: 13, color: '#666' }}>{it.available ? 'Disponibile' : 'Non disponibile'}</div>
                  <button onClick={() => startEdit(it)} style={{ padding: '6px 10px', borderRadius: 6, color: 'white' }}>Modifica</button>
                  <button onClick={() => removeItem(it.id || '')} style={{ padding: '6px 10px', borderRadius: 6, background: '#ef4444', color: '#fff' }}>Rimuovi</button>
                </div>
              </div>
              {/* If editing this item, render the edit form immediately under this row */}
              {editing && editing.id && editing.id === it.id && (
                <div style={{ marginTop: 8, padding: 12, borderRadius: 8, background: '#fff', boxShadow: '0 6px 18px rgba(2,6,23,0.04)' }}>
                  <EditForm editing={editing} setEditing={setEditing} saveEdit={saveEdit} cancelEdit={cancelEdit} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default EditProducts;

function EditForm({ editing, setEditing, saveEdit, cancelEdit }: {
  editing: Item | null;
  setEditing: (v: Item | null) => void;
  saveEdit: (e: React.FormEvent | FormData) => Promise<void>;
  cancelEdit: () => void;
}) {
  if (!editing) return null;
  const [newFiles, setNewFiles] = React.useState<File[]>([]);
  const [removedUrls, setRemovedUrls] = React.useState<string[]>([]);

  const existingImages: string[] = Array.isArray(editing.images) ? editing.images.filter(Boolean).map((i: any) => (typeof i === 'string' ? i : i.url || '')) : [];

  function onFilesChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files) return;
    setNewFiles(prev => [...prev, ...Array.from(files)]);
    e.currentTarget.value = '';
  }

  function removeExisting(url: string) {
    setRemovedUrls(prev => [...prev, url]);
  }

  function removeNewFile(index: number) {
    setNewFiles(prev => prev.filter((_, i) => i !== index));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    const form = new FormData();
    form.append('name', editing.name || '');
    form.append('available', editing.available ? 'true' : 'false');
    form.append('description', editing.description ?? '');

    const kept = existingImages.filter(u => !removedUrls.includes(u));
    if (kept.length) {
      form.append('images', JSON.stringify(kept));
    } else {
      form.append('images', JSON.stringify([]));
    }

    newFiles.forEach(f => form.append('images', f));

    if (editing.id) form.append('id', String(editing.id));

    await saveEdit(form);
  }

  return (
    <form onSubmit={onSubmit}>
      <h3 style={{ marginTop: 0 }}>{editing.id ? 'Modifica prodotto' : 'Nuovo prodotto'}</h3>
      <div style={{ marginBottom: 12 }}>
        <label style={{ display: 'block', marginBottom: 6 }}>Nome</label>
        <input value={editing.name || ''} onChange={e => setEditing({ ...editing, name: e.target.value })} required className="form-input" />
      </div>
      <div style={{ marginBottom: 12 }}>
        <label style={{ display: 'block', marginBottom: 6 }}>Disponibile</label>
        <input type="checkbox" checked={!!editing.available} onChange={e => setEditing({ ...editing, available: e.target.checked })} />
      </div>
      <div style={{ marginBottom: 12 }}>
        <label style={{ display: 'block', marginBottom: 6 }}>Descrizione</label>
        <textarea value={editing.description ?? ''} onChange={e => setEditing({ ...editing, description: e.target.value })} className="form-input" />
      </div>

      <div style={{ marginBottom: 12 }}>
        <label style={{ display: 'block', marginBottom: 6 }}>Immagini correnti</label>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {existingImages.length === 0 && <div style={{ color: '#666' }}>Nessuna immagine</div>}
          {existingImages.map(url => (
            <div key={url} style={{ position: 'relative' }}>
              {!removedUrls.includes(url) && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <img src={url} alt="img" style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 6 }} />
                  <button type="button" onClick={() => removeExisting(url)} style={{ marginTop: 6, fontSize: 12, color: 'white' }}>Rimuovi</button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: 12 }}>
        <label style={{ display: 'block', marginBottom: 6 }}>Aggiungi immagini</label>
        <input type="file" accept="image/*" multiple onChange={onFilesChange} />
        <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
          {newFiles.map((f, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <img src={URL.createObjectURL(f)} alt={f.name} style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 6 }} />
              <button type="button" onClick={() => removeNewFile(i)} style={{ marginTop: 6, fontSize: 12, color: 'white' }}>Rimuovi</button>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <button type="submit" style={{ padding: '8px 12px', borderRadius: 8, background: '#111827', color: '#fff' }}>Salva</button>
        <button type="button" onClick={cancelEdit} style={{ padding: '8px 12px', borderRadius: 8, color: 'white' }}>Annulla</button>
      </div>
    </form>
  );
}
