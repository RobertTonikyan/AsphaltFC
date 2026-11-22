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
  ['אבי', 8, 'att'], ['משה', 6, 'mid'], ['דני', 9, 'att'], ['יוסי', 5, 'mid'], ['רועי', 7, 'gk'],
  ['עומר', 4, 'mid'], ['איתי', 7, 'att'], ['נועם', 6, 'mid'], ['גיל', 3, 'att'], ['שחר', 8, 'mid'],
  ['טל', 6, 'gk'], ['אורי', 5, 'att'], ['ליאור', 7, 'mid'], ['בן', 4, 'att'], ['עידו', 9, 'mid'],
  ['רז', 5, 'gk'], ['אלון', 6, 'att'], ['תומר', 2, 'mid'], ['יונתן', 6, 'mid'], ['אסף', 7, 'att'],
  ['קובי', 5, 'mid'], ['ניר', 8, 'gk'],
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
  };
}
function demoSave(row) { try { localStorage.setItem(DEMO_KEY, JSON.stringify(row)); } catch (e) { /* ignore */ } }
const nowIso = () => new Date().toISOString();
function publicState(s) {
  return {
    players: (s.players || []).map(({ id, name, pos }) => ({ id, name, pos })),
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
  if (DEMO) { const r = demoRow(); return { id: r.id, name: r.name, view_code: r.view_code, state: r.state, now: nowIso() }; }
  return rpc('asphalt_admin_get', { p_id: id, p_secret: secret });
}

export async function saveGroup(id, secret, state, name) {
  if (DEMO) { const r = demoRow(); r.state = state; if (name) r.name = name; demoSave(r); return { now: nowIso() }; }
  return rpc('asphalt_admin_save', { p_id: id, p_secret: secret, p_state: state, p_name: name || null });
}

export async function viewGroup(code) {
  if (DEMO) { const r = demoRow(); return { name: r.name, state: publicState(r.state), now: nowIso() }; }
  return rpc('asphalt_view', { p_code: code });
}

export const ERR = {
  not_admin: 'קישור הניהול לא תקף. בדקו שהעתקתם אותו במלואו.',
  bad_link: 'הקישור לא תקף. בקשו מהמארגן קישור חדש.',
  bad_input: 'משהו בפרטים לא תקין. בדקו את השם ונסו שוב.',
};
export const errText = (e) =>
  ERR[e && e.code] || (navigator.onLine === false ? 'אין חיבור לאינטרנט. מנסה שוב.' : 'משהו השתבש. נסו שוב.');
