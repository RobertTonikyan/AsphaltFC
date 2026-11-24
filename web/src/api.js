// Server access. All reads and writes go through Supabase RPC functions
// (see supabase/migrations); the table itself is never exposed.
// `?demo` in the URL swaps in a local sample group, used for previews and screenshots.

const SB_URL = 'https://folqzngvhdmvbruzokaa.supabase.co';
const SB_KEY = 'sb_publishable_yp0mybtfScxcdDaV80TmEA_me4hUt-Z';

export const DEMO = new URLSearchParams(location.search).has('demo');

/** Milliseconds to add to Date.now() to get server time. Shared clocks use server time. */
let offset = 0;
export const serverNow = () => Date.now() + offset;
function syncClock(res) {
  if (res && res.now) offset = new Date(res.now).getTime() - Date.now();
  return res;
}

async function rpc(fn, args) {
  const res = await fetch(`${SB_URL}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: { apikey: SB_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify(args),
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const err = new Error((data && data.message) || 'error');
    err.code = data && data.message;
    throw err;
  }
  return syncClock(data);
}

/* ---------- demo adapter ---------- */
const SAMPLE = [
  ['אבי', 8, 'att'], ['משה', 6, 'mid'], ['דני', 9, 'att'], ['יוסי', 5, 'def'], ['רועי', 7, 'def'],
  ['עומר', 4, 'mid'], ['איתי', 7, 'att'], ['נועם', 6, 'mid'], ['גיל', 3, 'att'], ['שחר', 8, 'mid'],
  ['טל', 6, 'def'], ['אורי', 5, 'att'], ['ליאור', 7, 'mid'], ['בן', 4, 'att'], ['עידו', 9, 'mid'],
  ['רז', 5, 'def'], ['אלון', 6, 'att'], ['תומר', 2, 'def'], ['יונתן', 6, 'mid'], ['אסף', 7, 'att'],
  ['קובי', 5, 'mid'], ['ניר', 8, 'def'],
];
const DEMO_KEY = 'asphalt.demo';
function demoRow() {
  try {
    const v = JSON.parse(localStorage.getItem(DEMO_KEY));
    if (v) return v;
  } catch (e) { /* storage unavailable */ }
  return {
    id: 'demo', secret: 'demo', view_code: 'demo', name: 'כדורגל של שישי',
    state: {
      players: SAMPLE.map(([name, rating, pos], i) => ({ id: 's' + i, name, rating, pos, here: i < 21 })),
      teams: 4, size: 5, dur: 8, result: null, game: null,
    },
    signups: [
      { id: 'rd1', name: 'אליה', pos: 'att' },
      { id: 'rd2', name: 'מתן', pos: 'def' },
      { id: 'rd3', name: 'שגיא', pos: 'mid' },
    ],
  };
}
const norm = (n) => String(n || '').trim().toLowerCase();
const publicSignups = (r) => (r.signups || []).map(({ id, name, pos }) => ({ id, name, pos }));
function demoSave(row) { try { localStorage.setItem(DEMO_KEY, JSON.stringify(row)); } catch (e) { /* ignore */ } }
const nowIso = () => new Date().toISOString();
function publicState(s) {
  return {
    players: (s.players || []).map(({ id, name, pos, here }) => ({ id, name, pos, here: !!here })),
    result: s.result ? (({ spread, ...r }) => r)(s.result) : null,
    game: s.game || null,
  };
}

/* ---------- public API ---------- */
export async function createGroup(name) {
  if (DEMO) { const r = demoRow(); r.name = name; demoSave(r); return { id: r.id, secret: r.secret, view_code: r.view_code }; }
  return rpc('asphalt_create', { p_name: name });
}

export async function loadGroup(id, secret) {
  if (DEMO) { const r = demoRow(); return { id: r.id, name: r.name, view_code: r.view_code, state: r.state, signups: r.signups || [], now: nowIso() }; }
  return rpc('asphalt_admin_get', { p_id: id, p_secret: secret });
}

/** `taken`: ids of sign-ups handled in this save (added to the squad or dismissed). */
export async function saveGroup(id, secret, state, name, taken) {
  if (DEMO) {
    const r = demoRow(); r.state = state; if (name) r.name = name;
    if (taken && taken.length) r.signups = (r.signups || []).filter((x) => !taken.includes(x.id));
    demoSave(r); return { now: nowIso() };
  }
  return rpc('asphalt_admin_save', { p_id: id, p_secret: secret, p_state: state, p_name: name || null, p_taken: taken && taken.length ? taken : null });
}

export async function viewGroup(code) {
  if (DEMO) { const r = demoRow(); return { name: r.name, state: publicState(r.state), signups: publicSignups(r), now: nowIso() }; }
  return rpc('asphalt_view', { p_code: code });
}

/** A player signs up from the player link with a name and a position. */
export async function registerPlayer(code, name, pos) {
  if (DEMO) {
    const r = demoRow();
    r.signups = r.signups || [];
    const known = (r.state.players || []).find((p) => norm(p.name) === norm(name));
    const same = r.signups.find((x) => norm(x.name) === norm(name));
    const shown = known ? known.name : name.trim();
    let id;
    if (same) { same.pos = pos; id = same.id; }
    else { id = 'r' + Math.random().toString(36).slice(2, 10); r.signups.push({ id, name: shown, pos, pid: known && known.id }); }
    demoSave(r);
    return { id, name: shown, pos, known: !!known, now: nowIso() };
  }
  return rpc('asphalt_register', { p_code: code, p_name: name, p_pos: pos });
}

export async function unregisterPlayer(code, id) {
  if (DEMO) { const r = demoRow(); r.signups = (r.signups || []).filter((x) => x.id !== id); demoSave(r); return { now: nowIso() }; }
  return rpc('asphalt_unregister', { p_code: code, p_id: id });
}

export const ERR = {
  not_admin: 'קישור הניהול לא תקף. בדקו שהעתקתם אותו במלואו.',
  bad_link: 'הקישור לא תקף. בקשו מהמארגן קישור חדש.',
  bad_input: 'משהו בפרטים לא תקין. בדקו את השם ונסו שוב.',
  full: 'רשימת ההרשמה מלאה. דברו עם המארגן.',
};
export const errText = (e) =>
  ERR[e && e.code] || (navigator.onLine === false ? 'אין חיבור לאינטרנט. מנסה שוב.' : 'משהו השתבש. נסו שוב.');
