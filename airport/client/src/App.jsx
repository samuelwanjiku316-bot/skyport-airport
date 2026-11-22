import { useEffect, useState, useCallback } from 'react'; import Scene from './Scene.jsx';
const api = async (url, opts = {}, tok) => {
  const r = await fetch('/api' + url, { ...opts, headers: { 'Content-Type': 'application/json', ...(tok ? { Authorization: 'Bearer ' + tok } : {}) }, body: opts.body && JSON.stringify(opts.body) });
  const d = await r.json().catch(() => ({})); if (!r.ok) throw new Error(d.error || 'Request failed'); return d;
};
const hm = d => new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
const kes = n => 'KES ' + n.toLocaleString();

function Flights() {
  const [list, setList] = useState([]); const [type, setType] = useState('departure'); const [q, setQ] = useState('');
  const load = useCallback(() => api(`/flights?type=${type}&q=${encodeURIComponent(q)}`).then(setList).catch(() => {}), [type, q]);
  useEffect(() => { load(); const t = setInterval(load, 15000); return () => clearInterval(t); }, [load]);
  return (<section id="flights"><h2>Live Flights</h2>
    <div className="bar"><div className="tabs">{['departure', 'arrival'].map(t => <button key={t} className={type === t ? 'on' : ''} onClick={() => setType(t)}>{t === 'departure' ? 'Departures' : 'Arrivals'}</button>)}</div>
      <input placeholder="Search flight, airline or city…" value={q} onChange={e => setQ(e.target.value)} /></div>
    <div className="card table"><div className="row head"><span>Time</span><span>Flight</span><span>{type === 'departure' ? 'To' : 'From'}</span><span>Gate</span><span>Status</span></div>
      {list.map(f => <div className="row" key={f.id}><span>{hm(f.scheduled)}{f.delay > 0 && <small> → {hm(f.estimated)}</small>}</span><span>{f.number}<small>{f.airline}</small></span><span>{f.city}</span><span>T{f.terminal} · {f.gate}</span>
        <span><b className={'st ' + f.status.replace(/\s/g, '')}>{f.status}</b></span></div>)}
      {!list.length && <p className="muted">No flights match your search.</p>}</div></section>);
}

function Services({ auth, openAuth }) {
  const [svc, setSvc] = useState([]); const [pick, setPick] = useState(null); const [f, setF] = useState({ date: '', quantity: 1, notes: '' }); const [msg, setMsg] = useState(''); const [mine, setMine] = useState([]);
  useEffect(() => { api('/services').then(setSvc); }, []);
  const loadMine = useCallback(() => auth && api('/bookings', {}, auth.token).then(setMine).catch(() => {}), [auth]);
  useEffect(() => { loadMine(); }, [loadMine]);
  const book = async e => { e.preventDefault(); try { const b = await api('/bookings', { method: 'POST', body: { serviceId: pick.id, ...f } }, auth.token); setMsg(`Booked! Reference ${b.id} — total ${kes(b.total)}. Pay at the service desk or by M-Pesa.`); setPick(null); loadMine(); } catch (er) { setMsg(er.message); } };
  return (<section id="services"><h2>Airport Services</h2>
    <div className="grid">{svc.map(s => <div className="card svc" key={s.id}><div className="ico">{s.icon}</div><h3>{s.name}</h3><p className="muted">{s.desc}</p><p className="price">{kes(s.price)} <small>{s.unit}</small></p>
      <button className="btn" onClick={() => auth ? (setPick(s), setMsg('')) : openAuth()}>Book now</button></div>)}</div>
    {msg && <p className="notice">{msg}</p>}
    {pick && <form className="card form" onSubmit={book}><h3>Book {pick.name}</h3>
      <label>Date<input type="date" required min={new Date().toISOString().slice(0, 10)} value={f.date} onChange={e => setF({ ...f, date: e.target.value })} /></label>
      <label>Quantity / days<input type="number" min="1" max="30" value={f.quantity} onChange={e => setF({ ...f, quantity: e.target.value })} /></label>
      <label>Notes<input value={f.notes} onChange={e => setF({ ...f, notes: e.target.value })} placeholder="Flight number, plate number…" /></label>
      <p className="price">Total {kes(pick.price * f.quantity)}</p><div><button className="btn">Confirm</button> <button type="button" className="ghost" onClick={() => setPick(null)}>Cancel</button></div></form>}
    {auth && mine.length > 0 && <div className="card"><h3>My bookings</h3>{mine.map(b => <div className="row3" key={b.id}><span>{b.id}</span><span>{b.service} ×{b.quantity}</span><span>{b.date}</span><span>{kes(b.total)}</span><b className="st Delayed">{b.status}</b></div>)}</div>}
  </section>);
}

function Help() {
  const [f, setF] = useState({ kind: 'lost-found', name: '', contact: '', message: '' }); const [msg, setMsg] = useState('');
  const send = async e => { e.preventDefault(); try { const r = await api('/reports', { method: 'POST', body: f }); setMsg('Received. Your reference is ' + r.reference); setF({ ...f, message: '' }); } catch (er) { setMsg(er.message); } };
  return (<section id="help"><h2>Help Desk</h2><div className="two">
    <form className="card form" onSubmit={send}>
      <label>I need<select value={f.kind} onChange={e => setF({ ...f, kind: e.target.value })}><option value="lost-found">Report lost item</option><option value="assistance">Special assistance</option><option value="contact">General enquiry</option></select></label>
      <label>Name<input required value={f.name} onChange={e => setF({ ...f, name: e.target.value })} /></label>
      <label>Phone or email<input required value={f.contact} onChange={e => setF({ ...f, contact: e.target.value })} /></label>
      <label>Details<textarea required rows="4" value={f.message} onChange={e => setF({ ...f, message: e.target.value })} placeholder="Item description, flight, wheelchair/escort needs, question…" /></label>
      <button className="btn">Submit</button>{msg && <p className="notice">{msg}</p>}</form>
    <div className="card info"><h3>Good to know</h3><ul><li>🛂 Arrive 3 hours before international and 2 hours before domestic flights.</li><li>💧 Liquids over 100ml are not allowed in hand luggage.</li><li>♿ Wheelchair and escort service is free — request it 24h ahead.</li><li>📞 24/7 info desk: +254 700 000 000</li><li>📍 Terminals 1–3, 15 min from the city centre.</li></ul></div></div></section>);
}

function Admin({ auth }) {
  const [d, setD] = useState(null); const load = useCallback(() => api('/admin/overview', {}, auth.token).then(setD), [auth]); useEffect(() => { load(); }, [load]);
  if (!d) return null;
  const setStatus = async (id, status) => { await api('/admin/flights/' + id, { method: 'POST', body: { status } }, auth.token); load(); };
  const close = async id => { await api('/admin/reports/' + id, { method: 'POST', body: { status: 'Resolved' } }, auth.token); load(); };
  return (<section id="admin"><h2>Admin Dashboard</h2><div className="grid"><div className="card"><h3>{d.users}</h3><p className="muted">Users</p></div><div className="card"><h3>{d.bookings.length}</h3><p className="muted">Bookings</p></div><div className="card"><h3>{d.reports.filter(r => r.status === 'Open').length}</h3><p className="muted">Open requests</p></div></div>
    <div className="card"><h3>Flight status override</h3>{d.flights.slice(0, 10).map(f => <div className="row3" key={f.id}><span>{f.number}</span><span>{f.city}</span><b className={'st ' + f.status.replace(/\s/g, '')}>{f.status}</b>
      <select value="" onChange={e => setStatus(f.id, e.target.value)}><option value="">Change…</option>{['Cancelled', 'Delayed', 'Boarding', 'On Time', 'Departed'].map(s => <option key={s}>{s}</option>)}<option value="">Reset</option></select></div>)}</div>
    <div className="card"><h3>Requests</h3>{d.reports.map(r => <div className="row3" key={r.id}><span>{r.kind}</span><span>{r.name} · {r.contact}</span><span>{r.message}</span>{r.status === 'Open' ? <button className="ghost" onClick={() => close(r.id)}>Resolve</button> : <b>Done</b>}</div>)}</div>
    <div className="card"><h3>Bookings</h3>{d.bookings.map(b => <div className="row3" key={b.id}><span>{b.id}</span><span>{b.service} ×{b.quantity}</span><span>{b.date}</span><span>{kes(b.total)}</span></div>)}</div></section>);
}

function AuthModal({ onClose, onAuth }) {
  const [mode, setMode] = useState('login'); const [f, setF] = useState({ name: '', email: '', password: '' }); const [err, setErr] = useState('');
  const go = async e => { e.preventDefault(); try { onAuth(await api('/' + mode, { method: 'POST', body: f })); onClose(); } catch (er) { setErr(er.message); } };
  return (<div className="modal" onClick={onClose}><form className="card form" onClick={e => e.stopPropagation()} onSubmit={go}><h3>{mode === 'login' ? 'Sign in' : 'Create account'}</h3>
    {mode === 'register' && <label>Name<input required value={f.name} onChange={e => setF({ ...f, name: e.target.value })} /></label>}
    <label>Email<input type="email" required value={f.email} onChange={e => setF({ ...f, email: e.target.value })} /></label>
    <label>Password<input type="password" required minLength="6" value={f.password} onChange={e => setF({ ...f, password: e.target.value })} /></label>
    {err && <p className="notice">{err}</p>}<button className="btn">{mode === 'login' ? 'Sign in' : 'Register'}</button>
    <button type="button" className="ghost" onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>{mode === 'login' ? 'New here? Register' : 'Have an account? Sign in'}</button></form></div>);
}

export default function App() {
  const [auth, setAuth] = useState(() => JSON.parse(localStorage.getItem('auth') || 'null')); const [modal, setModal] = useState(false);
  const set = a => { setAuth(a); a ? localStorage.setItem('auth', JSON.stringify(a)) : localStorage.removeItem('auth'); };
  return (<>
    <Scene />
    <nav><b className="logo">✈ SKYPORT</b><div><a href="#flights">Flights</a><a href="#services">Services</a><a href="#help">Help</a>{auth?.user.role === 'admin' && <a href="#admin">Admin</a>}
      {auth ? <button className="ghost" onClick={() => set(null)}>Sign out ({auth.user.name})</button> : <button className="btn" onClick={() => setModal(true)}>Sign in</button>}</div></nav>
    <header className="hero"><h1>Welcome to <span>SkyPort</span> International</h1><p>Track flights live, book parking, lounges and transfers, and get help — all in one place.</p><a className="btn" href="#flights">View flights ↓</a></header>
    <main><Flights /><Services auth={auth} openAuth={() => setModal(true)} /><Help />{auth?.user.role === 'admin' && <Admin auth={auth} />}</main>
    <footer>© {new Date().getFullYear()} SkyPort International Airport</footer>
    {modal && <AuthModal onClose={() => setModal(false)} onAuth={set} />}
  </>);
}
