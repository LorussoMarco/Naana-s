require('dotenv').config();
const express = require('express');
const cors = require('cors');
const supabase = require('./supabaseClient');
const userRoutes = require('./routes/users');
const authRoutes = require('./routes/auth');
const orderRoutes = require('./routes/orders');
const itemRoutes = require('./routes/items');
const clientRoutes = require('./routes/clients');
const contactRoutes = require('./routes/contact');


const app = express();

// Abilita CORS per frontend: legge domini da env CORS_ORIGINS (comma-separated), fallback localhost
const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use(cors({
  origin: allowedOrigins,
}));

app.use(express.json());

// Supabase/Postgres client inizializzato in `supabaseClient.js`
// facoltativo: semplice healthcheck per verificare la connessione alla tabella `users`
app.get('/db-health', async (req, res) => {
  try {
    const { data, error } = await supabase.from('users').select('id').limit(1);
    if (error) return res.status(500).json({ ok: false, error: error.message });
    return res.json({ ok: true, sample: data });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
});

// Endpoint di test
app.get('/', (req, res) => {
  res.send('API is running');
});

// Health check endpoint - pubblico, leggero, per ping esterni
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/users', userRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/items', itemRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/contact', contactRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
