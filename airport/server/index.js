import express from 'express'; import cors from 'cors'; import bcrypt from 'bcryptjs'; import jwt from 'jsonwebtoken';
import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB = path.join(__dirname, 'db.json');
const SECRET = process.env.JWT_SECRET || 'change-this-secret';
const PORT = process.env.PORT || 4000;
let db = fs.existsSync(DB) ? JSON.parse(fs.readFileSync(DB)) : { users: [], bookings: [], reports: [], overrides: {} };
const save = () => fs.writeFileSync(DB, JSON.stringify(db, null, 1));
const id = () => Math.random().toString(36).slice(2, 9).toUpperCase();
const ADMIN = process.env.ADMIN_EMAIL || 'admin@skyport.local';
if (!db.users.find(u => u.email === ADMIN)) {
  db.users.push({ id: id(), name: 'Admin', email: ADMIN, role: 'admin', hash: bcrypt.hashSync(process.env.ADMIN_PASSWORD || 'admin123', 10) }); save();
}

// ---- Flights (simulated schedule; replace buildFlights() with a real API such as AeroDataBox/AviationStack)
const CITIES = ['Nairobi','Mombasa','Kisumu','Addis Ababa','Kigali','Dar es Salaam','Dubai','Doha','London','Johannesburg','Lagos','Cairo'];
const AIRLINES = [['KQ','Skyline Air'],['ET','Horn Airways'],['EK','Gulf Wings'],['BA','Albion Air'],['QR','Desert Jet'],['SA','Savannah Air']];
const flights = Array.from({ length: 28 }, (_, i) => {
  const [code, airline] = AIRLINES[i % AIRLINES.length];
  return { id: 'F' + i, number: code + (100 + i * 37), airline, city: CITIES[(i * 5) % CITIES.length], type: i % 2 ? 'arrival' : 'departure',
    offset: -90 + i * 25, gate: 'ABCD'[i % 4] + (1 + (i * 3) % 18), terminal: (i % 3) + 1, delay: i % 5 === 0 ? 20 + (i % 4) * 15 : 0 };
});
const view = f => {
  const now = Date.now(), base = new Date(); base.setSeconds(0, 0);
  const time = new Date(base.getTime() + f.offset * 60000), eta = new Date(time.getTime() + f.delay * 60000);
  const m = (eta - now) / 60000; let status;
  if (f.type === 'departure') status = m < -15 ? 'Departed' : m < 0 ? 'Gate Closed' : m < 40 ? 'Boarding' : f.delay ? 'Delayed' : 'On Time';
  else status = m < -10 ? 'Landed' : m < 0 ? 'Landing' : f.delay ? 'Delayed' : 'On Time';
  return { ...f, scheduled: time, estimated: eta, status: db.overrides[f.id] || status };
};

// ---- Services catalogue
const SERVICES = [
  { id: 'parking', name: 'Parking', price: 1500, unit: 'per day', icon: '🅿️', desc: 'Covered, guarded parking steps from the terminal.' },
  { id: 'lounge', name: 'VIP Lounge', price: 4500, unit: 'per person', icon: '🛋️', desc: 'Food, drinks, showers and quiet workspaces.' },
  { id: 'fasttrack', name: 'Fast-Track Security', price: 1500, unit: 'per person', icon: '⚡', desc: 'Skip the queue at security.' },
  { id: 'transfer', name: 'Airport Transfer', price: 3000, unit: 'per trip', icon: '🚖', desc: 'Pre-booked taxi to or from the airport.' },
  { id: 'porter', name: 'Porter & Assistance', price: 800, unit: 'per trip', icon: '🧳', desc: 'Bags carried and guided assistance.' },
  { id: 'sim', name: 'SIM & Wi-Fi Pack', price: 1000, unit: 'per pack', icon: '📶', desc: 'Data SIM or pocket Wi-Fi ready at arrival.' },
];

const app = express(); app.use(cors()); app.use(express.json());
const auth = (req, res, next) => { try { req.user = jwt.verify((req.headers.authorization || '').slice(7), SECRET); next(); } catch { res.status(401).json({ error: 'Please sign in' }); } };
const admin = (req, res, next) => req.user.role === 'admin' ? next() : res.status(403).json({ error: 'Admins only' });
const token = u => ({ token: jwt.sign({ id: u.id, name: u.name, email: u.email, role: u.role }, SECRET, { expiresIn: '7d' }), user: { id: u.id, name: u.name, email: u.email, role: u.role } });

app.post('/api/register', (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password || password.length < 6) return res.status(400).json({ error: 'Name, email and a 6+ character password are required' });
  if (db.users.find(u => u.email === email.toLowerCase())) return res.status(409).json({ error: 'Email already registered' });
  const u = { id: id(), name, email: email.toLowerCase(), role: 'user', hash: bcrypt.hashSync(password, 10) };
  db.users.push(u); save(); res.json(token(u));
});
app.post('/api/login', (req, res) => {
  const u = db.users.find(x => x.email === (req.body.email || '').toLowerCase());
  if (!u || !bcrypt.compareSync(req.body.password || '', u.hash)) return res.status(401).json({ error: 'Wrong email or password' });
  res.json(token(u));
});
app.get('/api/flights', (req, res) => {
  const { q = '', type } = req.query; const s = q.toLowerCase();
  res.json(flights.map(view).filter(f => (!type || f.type === type) && (!s || [f.number, f.city, f.airline].some(v => v.toLowerCase().includes(s)))).sort((a, b) => a.scheduled - b.scheduled));
});
app.get('/api/services', (_, res) => res.json(SERVICES));
app.post('/api/bookings', auth, (req, res) => {
  const s = SERVICES.find(x => x.id === req.body.serviceId); const qty = Math.max(1, Math.min(30, +req.body.quantity || 1));
  if (!s || !req.body.date) return res.status(400).json({ error: 'Service and date are required' });
  const b = { id: id(), userId: req.user.id, service: s.name, date: req.body.date, quantity: qty, notes: req.body.notes || '', total: s.price * qty, status: 'Pending payment', created: new Date() };
  db.bookings.push(b); save(); res.json(b);
});
app.get('/api/bookings', auth, (req, res) => res.json(db.bookings.filter(b => b.userId === req.user.id).reverse()));
app.post('/api/reports', (req, res) => {
  const { kind, name, contact, message } = req.body;
  if (!['lost-found', 'assistance', 'contact'].includes(kind) || !name || !contact || !message) return res.status(400).json({ error: 'Please fill in all fields' });
  const r = { id: id(), kind, name, contact, message, status: 'Open', created: new Date() }; db.reports.push(r); save(); res.json({ ok: true, reference: r.id });
});
app.get('/api/admin/overview', auth, admin, (_, res) => res.json({ bookings: db.bookings.slice().reverse(), reports: db.reports.slice().reverse(), users: db.users.length, flights: flights.map(view) }));
app.post('/api/admin/flights/:id', auth, admin, (req, res) => { db.overrides[req.params.id] = req.body.status; if (!req.body.status) delete db.overrides[req.params.id]; save(); res.json({ ok: true }); });
app.post('/api/admin/reports/:id', auth, admin, (req, res) => { const r = db.reports.find(x => x.id === req.params.id); if (r) { r.status = req.body.status; save(); } res.json({ ok: true }); });

const dist = path.join(__dirname, '../client/dist');
if (fs.existsSync(dist)) { app.use(express.static(dist)); app.get('*', (_, res) => res.sendFile(path.join(dist, 'index.html'))); }
app.listen(PORT, () => console.log(`SkyPort API on http://localhost:${PORT}`));
