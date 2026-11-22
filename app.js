import { balance, suggestCaptains, teamTotal, scoreTeams } from './balance.js';

/* ---------- config ---------- */
const SB_URL = 'https://folqzngvhdmvbruzokaa.supabase.co';
const SB_KEY = 'sb_publishable_yp0mybtfScxcdDaV80TmEA_me4hUt-Z';
const TEAM_SIZE = 5;
const VESTS = [
  { name: 'צהובים', color: '#FFD60A' },
  { name: 'כחולים', color: '#0A84FF' },
  { name: 'אדומים', color: '#FF453A' },
  { name: 'לבנים', color: '#FFFFFF' },
];
const WAIT_VEST = { name: 'שחורים', color: '#1C1C1E' };
const EXTRA_VESTS = [WAIT_VEST, { name: 'כתומים', color: '#FF9F0A' }, { name: 'סגולים', color: '#BF5AF2' }];
const POS = { D: 'הגנה', A: 'התקפה', B: 'שניהם' };
const POS_HINT = { D: 'בלם, מגן, מחזיק מאחור', A: 'חלוץ, כנף, מבקיע', B: 'משחק בכל המגרש' };

/* ---------- icons ---------- */
const I = {
  plus: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
  link: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/></svg>',
  back: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg>',
  chev: '<svg class="chev" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 6-6 6 6 6"/></svg>',
  close: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>',
  search: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
  share: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 15V3M7 8l5-5 5 5"/><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/></svg>',
  shuffle: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M16 3h5v5M4 20 21 3M21 16v5h-5M15 15l6 6M4 4l5 5"/></svg>',
  split: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4v16M4 8h16M6 8l-3 7h6zM18 8l-3 7h6z"/></svg>',
  check: '<svg class="check" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12 5 5 9-10"/></svg>',
  D: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true"><path d="M12 3 5 6v5c0 4.5 3 8 7 10 4-2 7-5.5 7-10V6z"/></svg>',
  A: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 12H5M11 6l-6 6 6 6"/></svg>',
  B: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 8h14l-3-3M20 16H6l3 3"/></svg>',
  queue: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1.2" fill="currentColor"/><circle cx="4.5" cy="12" r="1.2" fill="currentColor"/><circle cx="4.5" cy="18" r="1.2" fill="currentColor"/></svg>',
  tabPlayers: '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 19c.6-3.4 3.2-5.5 6.5-5.5s5.9 2.1 6.5 5.5z"/><circle cx="17" cy="9" r="2.6"/><path d="M16.2 13.6c2.9-.2 4.9 1.6 5.3 4.4h-4.6c-.2-1.7-.4-3.1-.7-4.4z"/></svg>',
  tabGame: '<svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="currentColor"/><path d="m12 7.5 3.2 2.3-1.2 3.7h-4l-1.2-3.7z" fill="var(--bg)"/></svg>',
  tabHistory: '<svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="currentColor"/><path d="M12 7v5l3 2" fill="none" stroke="var(--bg)" stroke-width="2" stroke-linecap="round"/></svg>',
  vest: (c) => `<svg width="26" height="28" viewBox="0 0 34 36" aria-hidden="true"><path d="M10 2 L4 6 L1 34 H33 L30 6 L24 2 Q17 10 10 2 Z" fill="${c}" stroke="var(--vest-stroke)" stroke-width="1.2"/></svg>`,
};

/* ---------- helpers ---------- */
const $app = document.getElementById('app');
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmtDate = (iso) => new Intl.DateTimeFormat('he-IL', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
const fmtShort = (iso) => new Intl.DateTimeFormat('he-IL', { weekday: 'long', day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
const rateOf = (p) => (p.rating == null ? 5 : p.rating);

function store(key, val) {
  try {
    if (val === undefined) return JSON.parse(localStorage.getItem('tiko.' + key) || 'null');
    localStorage.setItem('tiko.' + key, JSON.stringify(val));
  } catch (e) { return null; }
  return val;
}

function deviceId() {
  let d = store('device');
  if (!d) {
    const a = new Uint8Array(16);
    crypto.getRandomValues(a);
    d = Array.from(a, (b) => b.toString(16).padStart(2, '0')).join('');
    store('device', d);
  }
  return d;
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
    const err = new Error((data && data.message) || 'שגיאה');
    err.code = data && data.message;
    throw err;
  }
  return data;
}

const ERR = {
  not_admin: 'אין לך הרשאת ניהול לקבוצה הזו.',
  bad_link: 'הקישור לא תקף. בקשו קישור חדש מהמנהל.',
  closed: 'ההרשמה למשחק הזה נסגרה.',
  need_identity: 'צריך לבחור מי אתה מהרשימה.',
  blocked: 'בגלל קנס מהמשחק הקודם אי אפשר להירשם למשחק הזה.',
  too_many_players: 'הגעתם למספר המרבי של שחקנים בקבוצה.',
  bad_input: 'משהו בפרטים לא תקין. בדקו את השם והעמדה.',
};
const errText = (e) => ERR[e.code] || (navigator.onLine === false ? 'אין חיבור לאינטרנט. נסו שוב בעוד רגע.' : 'משהו השתבש. נסו שוב.');

let toastTimer;
function toast(msg, isErr) {
  document.querySelectorAll('.toast').forEach((n) => n.remove());
  const t = document.createElement('div');
  t.className = 'toast glass' + (isErr ? ' err' : '');
  t.setAttribute('role', isErr ? 'alert' : 'status');
  t.textContent = msg;
  document.body.appendChild(t);
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.remove(), 3200);
}

async function shareText(text, url) {
  const full = url ? `${text}\n${url}` : text;
  if (navigator.share) {
    try { await navigator.share({ text: full }); return; } catch (e) { if (e.name === 'AbortError') return; }
  }
  window.open('https://wa.me/?text=' + encodeURIComponent(full), '_blank');
}

async function copy(text) {
  try { await navigator.clipboard.writeText(text); toast('הקישור הועתק'); }
  catch (e) { toast('לא הצלחתי להעתיק. אפשר לסמן את הקישור ולהעתיק ידנית.', true); }
}

/* =========================================================
   MANAGER
   ========================================================= */
const S = {
  gid: null, secret: null, data: null,
  tab: 'players', view: null, sheet: null,
  search: '',
  teamCount: null, extrasMode: 'wait', captains: null,
  options: null, optIdx: 0, swapSel: null,
};

function startManager() {
  const groups = store('groups') || [];
  const cur = store('current');
  const g = groups.find((x) => x.id === cur) || groups[0];
  if (!g) return welcome();
  S.gid = g.id; S.secret = g.secret;
  S.tab = store('tab') || 'players';
  $app.innerHTML = '<div class="spinner" role="progressbar" aria-label="טוען"></div>';
  load().then(render).catch((e) => {
    if (e.code === 'not_admin') {
      store('groups', groups.filter((x) => x.id !== g.id));
      store('current', null);
      toast(ERR.not_admin, true);
      return welcome();
    }
    $app.innerHTML = `<div class="wrap no-tabs"><div class="large" style="padding-top:60px"><h1>אין חיבור</h1><p>${esc(errText(e))}</p></div><div class="card"><button class="btn primary" data-a="reload">ניסיון חוזר</button></div></div>`;
  });
}

async function load() {
  S.data = await rpc('admin_state', { p_group: S.gid, p_secret: S.secret });
  const groups = store('groups') || [];
  const me = groups.find((x) => x.id === S.gid);
  if (me && me.name !== S.data.group.name) { me.name = S.data.group.name; store('groups', groups); }
}

async function act(fn, args, okMsg) {
  try {
    const r = await rpc(fn, { p_group: S.gid, p_secret: S.secret, ...args });
    await load();
    render();
    if (okMsg) toast(okMsg);
    return r;
  } catch (e) {
    toast(errText(e), true);
    throw e;
  }
}

function welcome(withBack) {
  $app.innerHTML = `
  <div class="wrap no-tabs">
    <div class="hero">
      <svg viewBox="0 0 390 120" aria-hidden="true" fill="none" stroke="#fff" stroke-width="2"><circle cx="195" cy="120" r="60"/><path d="M0 119h390"/></svg>
      <div class="brand">תיקו</div>
      <h1>קבוצות הוגנות<br>לכדורגל השכונתי</h1>
      <p>מוסיפים שחקנים, מדרגים, והמערכת מחלקת לקבוצות שוות.</p>
    </div>
    <form class="pp" data-form="create" style="margin-top:8px">
      <div class="field">
        <label for="gname">שם הקבוצה</label>
        <input id="gname" class="input" name="name" required maxlength="60" placeholder="למשל: כדורגל שישי · פארק הנחל" autocomplete="off">
      </div>
      <div style="margin-top:20px"><button class="btn primary" type="submit">יצירת קבוצה</button></div>
      <p class="hint" style="margin-top:16px">כבר יש קבוצה? פתחו את קישור הניהול שהמנהל שלח לכם, והיא תתווסף כאן.</p>
      ${withBack ? '<div style="margin-top:8px"><button type="button" class="btn secondary" data-a="backToGroup">חזרה לקבוצה שלי</button></div>' : ''}
    </form>
  </div>`;
}

/* ---------- derived data ---------- */
function players() { return S.data.players.filter((p) => p.active); }
function byId() { return Object.fromEntries(S.data.players.map((p) => [p.id, p])); }
function rsvpMap() { return Object.fromEntries(S.data.rsvps.map((r) => [r.player_id, r])); }
// Everyone who said "in", in place order: penalised players last, then by sign-up time (server order).
function coming() {
  const B = byId();
  return S.data.rsvps.filter((r) => r.answer === 'in' && !r.noshow && B[r.player_id] && B[r.player_id].active).map((r) => B[r.player_id]);
}
function capacity() { return S.data.group.capacity || 20; }
function gamePenalty(id) { return (S.data.game_penalties || []).find((g) => g.player_id === id); }
const PEN_TXT = { bench: 'נכנס למזמינים במשחק הבא', block: 'לא יכול להירשם למשחק הבא' };
function plan(n) {
  const auto = Math.max(2, Math.min(4, Math.floor(Math.min(n, capacity()) / TEAM_SIZE)));
  let T = S.teamCount || auto;
  T = Math.max(2, Math.min(4, T));
  const size = Math.min(TEAM_SIZE, Math.floor(n / T));
  const extras = Math.max(0, n - T * size);
  return { T, size, extras, auto };
}
function currentCaptains(list, T) {
  const ids = new Set(list.map((p) => p.id));
  if (S.captains) return S.captains.filter((id) => ids.has(id));
  return suggestCaptains(list, T);
}

/* ---------- render ---------- */
function render() {
  if (!S.data) return;
  let body = '';
  if (S.tab === 'players') body = viewPlayers();
  else if (S.tab === 'game') body = S.view === 'teams' && S.data.game && S.data.game.result ? viewTeams() : S.view === 'queue' && S.data.game && S.data.game.result ? viewQueue() : viewGame();
  else body = viewHistory();
  $app.innerHTML = `<div class="wrap">${body}</div>${tabbar()}${S.sheet ? sheetHtml() : ''}`;
  if (S.sheet && S.sheet.focus) {
    const f = document.getElementById(S.sheet.focus);
    if (f) f.focus();
    S.sheet.focus = null;
  }
}

function tabbar() {
  const t = (id, label, icon) => `<button data-a="tab" data-tab="${id}" ${S.tab === id ? 'aria-current="page"' : ''}>${icon}<span>${label}</span></button>`;
  return `<nav class="tabbar glass" aria-label="לשוניות">${t('players', 'שחקנים', I.tabPlayers)}${t('game', 'משחק', I.tabGame)}${t('history', 'היסטוריה', I.tabHistory)}</nav>`;
}

function posLine(p) {
  return `<span class="s">${I[p.position]}${POS[p.position]}</span>`;
}

function viewPlayers() {
  const all = players();
  const pending = all.filter((p) => p.rating == null);
  return `
  <div class="topbar">
    <button class="circle glass" data-a="newPlayer" aria-label="הוספת שחקן">${I.plus}</button>
    <button class="capsule glass" data-a="invite">${I.link}הזמנה בקישור</button>
  </div>
  <header class="large"><h1>שחקנים</h1><p>${esc(S.data.group.name)} · ${all.length} שחקנים</p></header>
  <label class="search">${I.search}<input type="search" placeholder="חיפוש" aria-label="חיפוש שחקן" data-input="search" value="${esc(S.search)}"></label>
  ${pending.length ? `<h2 class="sec-h">ממתינים לדירוג · ${pending.length}</h2>
  <div class="group">${pending.map((p) => `
    <button class="row" data-a="editPlayer" data-id="${p.id}">
      <div class="main"><span class="t">${esc(p.name)}</span><span class="s">${p.source === 'link' ? 'הצטרף בקישור · ' : ''}${POS[p.position]}</span></div>
      <span class="chip pending">דירוג</span>
    </button>`).join('')}</div>` : ''}
  <div id="plist">${playerList()}</div>`;
}

function playerList() {
  const q = S.search.trim();
  const list = players().filter((p) => p.rating != null && (!q || p.name.includes(q)));
  const total = players().filter((p) => p.rating != null).length;
  if (!players().length) {
    return `<h2 class="sec-h">כל השחקנים</h2><div class="empty"><b>עוד אין שחקנים</b>שלחו קישור הצטרפות לקבוצת הוואטסאפ, או הוסיפו שחקן בכפתור הפלוס.</div>
    <div style="margin:14px 16px 0"><button class="btn primary" data-a="invite">${I.link}הזמנת שחקנים בקישור</button></div>`;
  }
  return `<h2 class="sec-h">${q ? 'תוצאות' : 'כל השחקנים'} · ${q ? list.length : total}</h2>
  ${list.length ? `<div class="group">${list.map((p) => `
    <button class="row" data-a="editPlayer" data-id="${p.id}">
      <div class="main"><span class="t">${esc(p.name)}</span>${posLine(p)}</div>
      ${p.penalty || gamePenalty(p.id) ? '<span class="chip pending" style="height:26px;font-size:13px;padding:0 10px">קנס</span>' : ''}
      <span class="num" aria-label="דירוג ${p.rating}">${p.rating}</span>${I.chev}
    </button>`).join('')}</div>` : `<div class="empty">אין שחקן בשם הזה.</div>`}`;
}

function viewGame() {
  const g = S.data.game;
  if (!g) {
    return `
    <header class="large" style="padding-top:64px"><h1>משחק</h1><p>${esc(S.data.group.name)}</p></header>
    <div class="empty" style="margin-top:16px"><b>אין משחק פתוח</b>פותחים משחק, שולחים לקבוצה את הקישור "מי בא?", וביום המשחק מחלקים.</div>
    <div style="margin:14px 16px 0"><button class="btn primary" data-a="newGame">${I.plus}משחק חדש</button></div>`;
  }
  const m = rsvpMap();
  const all = players();
  const inList = coming();
  const cap = capacity();
  const playing = inList.slice(0, cap);
  const overflow = inList.slice(cap);
  const outN = all.filter((p) => m[p.id] && m[p.id].answer === 'out').length;
  const noAns = all.filter((p) => !m[p.id]);
  const noshows = all.filter((p) => m[p.id] && m[p.id].noshow);
  const blocked = (S.data.game_penalties || []).filter((g) => g.kind === 'block').map((g) => byId()[g.player_id]).filter(Boolean);
  const left = Math.max(0, cap - inList.length);
  const pl = plan(inList.length);
  const caps = currentCaptains(playing, pl.T);
  const capIdx = Object.fromEntries(caps.map((id, i) => [id, i]));
  const canSplit = inList.length >= 4;
  const row = (p, state) => {
    const r = m[p.id];
    const ci = capIdx[p.id];
    const isCap = state === 'in' && ci !== undefined;
    return `
    <div class="row">
      <button class="hit" data-a="cycle" data-id="${p.id}" aria-label="${esc(p.name)}: ${state === 'in' ? 'בא' : state === 'out' ? 'לא בא' : 'לא ענה'}. הקשה משנה">
        ${state === 'in' ? '<svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="11" fill="var(--accent)"/><path d="m7 12.5 3.2 3.2L17 9" fill="none" stroke="var(--on-accent)" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>'
          : state === 'out' ? '<svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="11" fill="var(--fill)"/><path d="M8 8l8 8M16 8l-8 8" stroke="var(--secondary)" stroke-width="2.2" stroke-linecap="round"/></svg>'
          : '<svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10.25" fill="none" stroke="var(--sep)" stroke-width="1.5"/></svg>'}
      </button>
      <div class="main"><span class="t">${esc(p.name)}</span><span class="s">${POS[p.position]}${p.rating == null ? ' · ממתין לדירוג' : ''}${r && r.source === 'link' ? ' · אישר בקישור' : ''}${r && r.benched ? ' · <b style="color:var(--pending)">קנס: למזמינים</b>' : ''}</span></div>
      ${state === 'in' ? `<button class="hit" data-a="captain" data-id="${p.id}" aria-pressed="${isCap}">
        ${isCap ? `<span class="chip dark" style="height:32px;font-size:13px"><span class="sw" style="background:${VESTS[ci] ? VESTS[ci].color : '#888'}"></span>קפטן${VESTS[ci] ? ' · ' + VESTS[ci].name : ''}</span>` : '<span class="chip outline" style="height:32px;font-size:13px">קפטן</span>'}
      </button>` : ''}
    </div>`;
  };
  return `
  <div class="topbar">
    <button class="capsule glass" data-a="guest">${I.plus}שחקן</button>
    ${g.result ? `<button class="capsule glass" data-a="openTeams">הקבוצות${I.chev}</button>` : '<span></span>'}
  </div>
  <header class="large"><h1>המשחק הקרוב</h1><p>${esc(fmtDate(g.starts_at))}</p></header>
  <section class="card stats" aria-label="אישורי הגעה" style="padding:12px 0">
    <div><b style="color:var(--accent)">${playing.length}/${cap}</b><span>רשומים</span></div>
    <div><b>${overflow.length}</b><span>מזמינים</span></div>
    <div><b style="color:var(--secondary)">${noAns.length}</b><span>לא ענו</span></div>
  </section>
  <p class="hint" style="margin:8px 32px 0">${left ? `נשארו ${left} מקומות פנויים.` : `המקומות מלאים. מי שנרשם עכשיו נכנס למזמינים, ומי שמבטל מפנה מקום לראשון בתור.`}${outN ? ` · ${outN} לא באים` : ''}</p>
  <div style="margin:12px 16px 0"><button class="btn tinted" data-a="shareRsvp">${I.share}שליחת "מי בא?" לקבוצה…</button></div>

  <div class="card" style="display:flex;flex-direction:column;gap:12px">
    <div class="line"><div><div>מספר קבוצות</div><div class="hint" style="padding:0">${pl.size} בכל קבוצה${pl.extras ? ` · ${pl.extras} עודפים` : ''}</div></div>
      <div class="seg" role="group" aria-label="מספר קבוצות" style="width:156px">${[2, 3, 4].map((n) => `<button data-a="teams" data-n="${n}" aria-pressed="${pl.T === n}">${n}</button>`).join('')}</div>
    </div>
    ${pl.extras ? `<div>
      <div class="seg" role="group" aria-label="מה עושים עם העודפים"><button data-a="extras" data-m="wait" aria-pressed="${S.extrasMode === 'wait'}">קבוצה בהמתנה</button><button data-a="extras" data-m="subs" aria-pressed="${S.extrasMode === 'subs'}">מחליפים</button></div>
      <p class="hint" style="margin:8px 0 0">${S.extrasMode === 'wait' ? `${pl.extras} שאישרו אחרונים מחכים כקבוצה חמישית עד שמגיעים עוד שחקנים.` : 'העודפים נכנסים כשחקן שישי לקבוצות המזמינות ומתחלפים בתוכן.'}</p>
    </div>` : ''}
  </div>

  <h2 class="sec-h">משחקים · ${playing.length} מתוך ${cap}${playing.length ? ` · ${caps.length === pl.T ? 'קפטנים מוצעים, אפשר לשנות' : `נבחרו ${caps.length} מתוך ${pl.T} קפטנים`}` : ''}</h2>
  ${playing.length ? `<div class="group">${playing.map((p) => row(p, 'in')).join('')}</div>` : '<div class="empty">עוד אף אחד לא אישר. שלחו את הקישור "מי בא?", או סמנו כאן מי מגיע.</div>'}
  ${overflow.length ? `<h2 class="sec-h">מזמינים · ${overflow.length} · נכנסים לפי הסדר כשמתפנה מקום</h2><div class="group">${overflow.map((p) => row(p, 'in')).join('')}</div>` : ''}
  ${noAns.length ? `<h2 class="sec-h">לא ענו · ${noAns.length} · הקשה מסמנת שהגיע</h2><div class="group">${noAns.map((p) => row(p, 'none')).join('')}</div>` : ''}
  ${outN ? `<h2 class="sec-h">לא באים · ${outN}</h2><div class="group">${all.filter((p) => m[p.id] && m[p.id].answer === 'out').map((p) => row(p, 'out')).join('')}</div>` : ''}
  ${noshows.length ? `<h2 class="sec-h">לא הגיעו · ${noshows.length} · קיבלו קנס למשחק הבא</h2><div class="group">${noshows.map((p) => `<div class="row"><div class="main"><span class="t">${esc(p.name)}</span><span class="s">${PEN_TXT[S.data.group.penalty_mode]}</span></div></div>`).join('')}</div>` : ''}
  ${blocked.length ? `<h2 class="sec-h">חסומים במשחק הזה בגלל קנס · ${blocked.length}</h2><div class="group">${blocked.map((p) => `<button class="row" data-a="editPlayer" data-id="${p.id}"><div class="main"><span class="t">${esc(p.name)}</span><span class="s">${esc((gamePenalty(p.id) || {}).reason || '')}</span></div>${I.chev}</button>`).join('')}</div>` : ''}
  <div style="margin:22px 16px 0;display:flex;flex-direction:column;gap:6px">
    <button class="btn secondary" data-a="noshowSheet">מי לא הגיע?</button>
    <button class="btn danger" data-a="finishGame">סיום המשחק והעברה להיסטוריה</button>
  </div>
  <div style="height:90px"></div>
  <div class="edge"></div>
  <div class="actions"><div class="in"><button class="btn primary" data-a="split" ${canSplit ? '' : 'disabled'}>${I.split}חלוקת קבוצות</button></div></div>`;
}

/* ---------- teams view ---------- */
function resultTeams() { return S.data.game.result; }

function viewTeams() {
  const R = resultTeams();
  const B = byId();
  const totals = R.teams.map((t) => teamTotal(t.players, B));
  const fieldIdx = R.queue.slice(0, 2);
  const [ia, ib] = fieldIdx;
  const ya = totals[ia], yb = totals[ib];
  const maxDiff = Math.max(...totals) - Math.min(...totals);
  const deg = Math.max(-8, Math.min(8, (yb - ya) * -3));
  const rad = (deg * Math.PI) / 180;
  const r = 150;
  const rx = 179 + r * Math.cos(rad), ry = 56 + r * Math.sin(rad);
  const lx = 179 - r * Math.cos(rad), ly = 56 - r * Math.sin(rad);
  const status = (i) => {
    const q = R.queue.indexOf(i);
    return q < 2 ? '<span class="badge on">משחקת</span>' : `<span class="badge">מזמינה · ${q - 1}</span>`;
  };
  const card = (t, i) => `
    <section class="team" aria-label="${esc(t.name)}">
      <div class="team-h"><div class="l1"><span class="sw" style="background:${t.color}"></span><span class="nm">${esc(t.name)}</span><span class="tot">${totals[i]}</span></div>${status(i)}</div>
      ${t.players.map((id) => {
        const p = B[id] || { name: 'שחקן שנמחק', position: 'B' };
        const isCap = id === t.captain;
        const sel = S.swapSel === id;
        return `<button class="tp" data-a="swap" data-id="${id}" aria-pressed="${sel}"><span class="n">${esc(p.name)}</span>${isCap ? '<span class="c-badge" aria-label="קפטן">C</span>' : ''}<span class="p">${POS[p.position] || ''}</span></button>`;
      }).join('')}
    </section>`;
  const W = R.waiting;
  return `
  <div class="topbar center">
    <button class="circle glass" data-a="closeTeams" aria-label="חזרה למשחק">${I.back}</button>
    <h1 class="inline">הקבוצות</h1>
    <button class="circle glass" data-a="openQueue" aria-label="התור למגרש">${I.queue}</button>
  </div>
  <section class="scale" aria-label="משחק פתיחה: ${esc(R.teams[ia].name)} ${ya} מול ${esc(R.teams[ib].name)} ${yb}">
    <div class="cap"><b>משחק פתיחה</b><span style="color:var(--secondary)">הפרש מרבי בין ${R.teams.length} הקבוצות: ${maxDiff === 1 ? 'נקודה אחת' : maxDiff + ' נקודות'}</span></div>
    <svg class="beamsvg" width="358" height="172" viewBox="0 0 358 172" aria-hidden="true">
      <line x1="${rx}" y1="${ry}" x2="${rx}" y2="${ry + 22}" stroke="var(--beam)" stroke-width="1.5"/>
      <line x1="${lx}" y1="${ly}" x2="${lx}" y2="${ly + 22}" stroke="var(--beam)" stroke-width="1.5"/>
      <g class="beam" style="transform:rotate(${deg}deg)"><rect x="29" y="53" width="300" height="6" rx="3" fill="var(--beam)"/></g>
      <circle cx="179" cy="56" r="7" fill="var(--surface)" stroke="var(--beam)" stroke-width="3"/>
      <path d="M179 63 L194 162 L164 162 Z" fill="var(--post)"/>
      <path d="M152 162 h54" stroke="var(--beam)" stroke-width="3" stroke-linecap="round"/>
    </svg>
    <div class="pan" style="top:${ry + 22}px;left:calc(50% - 179px + ${rx - 42}px)">${I.vest(R.teams[ia].color)}<span style="font-size:13px;font-weight:600">${esc(R.teams[ia].name)}</span><span class="sc">${ya}</span></div>
    <div class="pan" style="top:${ly + 22}px;left:calc(50% - 179px + ${lx - 42}px)">${I.vest(R.teams[ib].color)}<span style="font-size:13px;font-weight:600">${esc(R.teams[ib].name)}</span><span class="sc">${yb}</span></div>
  </section>
  <div class="teams">${R.teams.map(card).join('')}</div>
  ${W ? `<section class="team waiting" style="margin:10px 16px 0" aria-label="${esc(WAIT_VEST.name)}">
    <div class="team-h"><div class="l1"><span class="sw" style="background:${WAIT_VEST.color}"></span><span class="nm">${WAIT_VEST.name} · בהמתנה</span><span class="badge warn">חסרים ${TEAM_SIZE - W.players.length}</span></div></div>
    <div style="padding:8px 12px 12px;display:flex;flex-direction:column;gap:10px">
      <div class="names">${W.players.map((id) => `<span>${esc((B[id] || {}).name || '')}</span>`).join('')}</div>
      <button class="btn tinted" style="height:44px" data-a="addLate">${I.plus}הוספת שחקן שהגיע</button>
    </div>
  </section>` : ''}
  <p class="hint" style="text-align:center;margin:12px 16px 0">${S.swapSel ? 'עכשיו הקישו על שחקן בקבוצה אחרת כדי להחליף.' : 'הקישו על שחקן ואז על שחקן בקבוצה אחרת כדי להחליף ביניהם.'}</p>
  <div style="height:90px"></div>
  <div class="edge"></div>
  <div class="actions"><div class="in">
    <button class="btn secondary" data-a="reshuffle">${I.shuffle}ערבוב מחדש</button>
    <button class="btn primary" data-a="shareTeams">${I.share}שיתוף</button>
  </div></div>`;
}

function viewQueue() {
  const R = resultTeams();
  const B = byId();
  const totals = R.teams.map((t) => teamTotal(t.players, B));
  const [a, b, ...rest] = R.queue;
  const W = R.waiting;
  return `
  <div class="topbar center">
    <button class="circle glass" data-a="openTeams" aria-label="חזרה לקבוצות">${I.back}</button>
    <h1 class="inline">התור למגרש</h1><span class="spacer"></span>
  </div>
  <h2 class="sec-h">על המגרש</h2>
  <div class="group"><div class="row" style="justify-content:space-between">
    <span style="display:flex;align-items:center;gap:8px"><span class="sw" style="background:${R.teams[a].color}"></span><b>${esc(R.teams[a].name)}</b><span class="s">${totals[a]}</span></span>
    <span class="s">נגד</span>
    <span style="display:flex;align-items:center;gap:8px"><span class="s">${totals[b]}</span><b>${esc(R.teams[b].name)}</b><span class="sw" style="background:${R.teams[b].color}"></span></span>
  </div></div>
  <h2 class="sec-h">בתור · המנצחת נשארת</h2>
  <div class="group">${rest.map((i, k) => `
    <div class="row"><span class="chip outline" style="height:26px;padding:0 9px">${k + 1}</span><span class="sw" style="background:${R.teams[i].color}"></span>
      <div class="main"><span class="t">${esc(R.teams[i].name)}</span><span class="s">${R.teams[i].players.length} שחקנים${R.teams[i].players.length > TEAM_SIZE ? ' · כולל מחליף' : ''}</span></div><span class="num">${totals[i]}</span></div>`).join('')}
    ${W ? `<div class="row"><span class="chip outline" style="height:26px;padding:0 9px">${rest.length + 1}</span><span class="sw" style="background:${WAIT_VEST.color}"></span>
      <div class="main"><span class="t">${WAIT_VEST.name}</span><span class="s">${W.players.length} מתוך ${TEAM_SIZE}</span></div><span class="chip pending" style="height:26px;font-size:13px">חסרים ${TEAM_SIZE - W.players.length}</span></div>` : ''}
  </div>
  <div style="margin:14px 16px 0;display:flex;flex-direction:column;gap:10px">
    <button class="btn secondary" data-a="rotateQueue">המנצחת נשארה · הבאה בתור עולה</button>
    ${W ? `<button class="btn tinted" data-a="addLate">${I.plus}הוספת שחקן שהגיע</button>` : ''}
  </div>`;
}

function viewHistory() {
  const H = S.data.history;
  const B = byId();
  return `
  <header class="large" style="padding-top:64px"><h1>היסטוריה</h1><p>${esc(S.data.group.name)}</p></header>
  ${H.length ? H.map((h) => `
    <h2 class="sec-h">${esc(fmtShort(h.starts_at))}</h2>
    <div class="group">${h.result && h.result.teams ? h.result.teams.map((t) => `
      <div class="row"><span class="sw" style="background:${t.color}"></span><div class="main"><span class="t">${esc(t.name)}</span><span class="s">${t.players.map((id) => esc((B[id] || {}).name || '')).filter(Boolean).join(', ')}</span></div></div>`).join('') : '<div class="row"><div class="main"><span class="s">לא חולקו קבוצות</span></div></div>'}</div>`).join('')
    : '<div class="empty" style="margin-top:16px"><b>עוד אין משחקים</b>משחקים שהסתיימו יופיעו כאן עם הקבוצות שלהם.</div>'}
  <h2 class="sec-h">ניהול</h2>
  <div class="group">
    <button class="row" data-a="rules"><div class="main"><span class="t">כללי הרשמה וקנסות</span><span class="s">${capacity()} מקומות · ${PEN_TXT[S.data.group.penalty_mode]}</span></div>${I.chev}</button>
    <button class="row" data-a="deputy"><div class="main"><span class="t">שליחת קישור ניהול לנציג</span><span class="s">מי שמקבל אותו יכול לנהל את הקבוצה כמוך</span></div>${I.chev}</button>
    <button class="row" data-a="rename"><div class="main"><span class="t">שינוי שם הקבוצה</span></div>${I.chev}</button>
    ${(store('groups') || []).length > 1 ? `<button class="row" data-a="switchGroup"><div class="main"><span class="t">מעבר לקבוצה אחרת</span></div>${I.chev}</button>` : ''}
    <button class="row" data-a="newGroup"><div class="main"><span class="t">פתיחת קבוצה נוספת</span></div>${I.chev}</button>
  </div>`;
}

/* ---------- sheets ---------- */
function sheetHtml() {
  const sh = S.sheet;
  const head = (title) => `<div class="grabber" aria-hidden="true"></div><div class="sheet-head"><button class="close" data-a="closeSheet" aria-label="סגירה">${I.close}</button><h2 id="sheet-title">${title}</h2><span></span></div>`;
  let inner = '';
  if (sh.type === 'player') {
    const d = sh.draft;
    inner = `${head(sh.id ? 'עריכת שחקן' : 'שחקן חדש')}
      <div class="field"><label for="pname">שם</label><input id="pname" class="input" data-input="pname" value="${esc(d.name)}" maxlength="40" autocomplete="off"></div>
      <div class="field"><span class="lbl">עמדה</span><div class="opts">${['D', 'A', 'B'].map((k) => `
        <button class="opt" data-a="pickPos" data-v="${k}" aria-pressed="${d.position === k}"><span class="ic">${I[k]}</span><span style="flex:1;display:flex;flex-direction:column"><span>${POS[k]}</span><span class="hint" style="padding:0">${POS_HINT[k]}</span></span>${I.check}</button>`).join('')}</div></div>
      <div class="field"><span class="lbl">דירוג <span class="hint" style="font-weight:400">· גלוי רק למנהלים</span></span>
        <div class="ratings" role="group" aria-label="דירוג 1 עד 10">${[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => `<button data-a="pickRating" data-v="${n}" aria-pressed="${d.rating === n}">${n}</button>`).join('')}</div>
        <p class="hint">1 = מתחיל, 10 = הכי חזק בקבוצה.</p></div>
      ${sh.id ? (() => {
        const pp = byId()[sh.id] || {};
        const gp = gamePenalty(sh.id);
        if (!pp.penalty && !gp) return '';
        const txt = gp ? `במשחק הזה: ${gp.kind === 'block' ? 'לא יכול להירשם' : 'נכנס למזמינים'} (${esc(gp.reason || '')})` : `${esc(pp.penalty_reason || '')} · במשחק הבא ${pp.penalty === 'block' ? 'לא יוכל להירשם' : 'ייכנס למזמינים'}`;
        return `<div class="field"><span class="lbl">קנס</span><div class="opts" style="padding:12px 16px;display:flex;align-items:center;gap:12px"><span style="flex:1;font-size:15px;color:var(--pending)">${txt}</span><button class="chip tint" data-a="clearPenalty">ביטול הקנס</button></div></div>`;
      })() : ''}
      <div style="margin-top:22px;display:flex;flex-direction:column;gap:6px">
        <button class="btn primary" data-a="savePlayer">${sh.markIn ? 'שמירה וסימון שהגיע' : 'שמירה'}</button>
        ${sh.id ? '<button class="btn danger" data-a="deletePlayer">מחיקת השחקן</button>' : ''}
      </div>`;
  } else if (sh.type === 'invite') {
    const url = `${location.origin}/j/${S.data.group.invite_code}`;
    inner = `${head('הזמנת שחקנים')}
      <p style="margin:4px 4px 0;font-size:17px;line-height:23px;color:var(--label2)">שלחו קישור אחד לקבוצת הוואטסאפ. כל שחקן נרשם בעצמו עם שם ועמדה, ואתם רק מדרגים.</p>
      <div class="linkbox">${I.link}<span>${esc(url.replace(/^https?:\/\//, ''))}</span><button class="chip tint" data-a="copy" data-v="${esc(url)}">העתקה</button></div>
      <div style="margin-top:20px"><button class="btn primary" data-a="shareInvite">${I.share}שיתוף הקישור…</button></div>
      <p class="hint" style="text-align:center;margin-top:12px">בחלון השיתוף בוחרים וואטסאפ ואת קבוצת הכדורגל.</p>
      <div style="margin-top:8px"><button class="btn danger" data-a="rotateInvite">ביטול הקישור והנפקת חדש</button></div>`;
  } else if (sh.type === 'newGame') {
    inner = `${head('משחק חדש')}
      <div class="field"><label for="gdate">מתי?</label><input id="gdate" class="input" type="datetime-local" data-input="gdate" value="${esc(sh.value)}"></div>
      <p class="hint" style="margin-top:8px">אחרי היצירה תוכלו לשלוח לקבוצה את הקישור "מי בא?".</p>
      <div style="margin-top:20px"><button class="btn primary" data-a="createGame">פתיחת המשחק</button></div>`;
  } else if (sh.type === 'late') {
    const R = resultTeams();
    const used = new Set(R.teams.flatMap((t) => t.players).concat(R.waiting ? R.waiting.players : []));
    const cand = players().filter((p) => !used.has(p.id));
    inner = `${head('מי הגיע?')}
      ${cand.length ? `<div class="opts" style="margin-top:8px">${cand.map((p) => `<button class="opt" data-a="pickLate" data-id="${p.id}"><span style="flex:1">${esc(p.name)}</span><span class="hint">${POS[p.position]}</span></button>`).join('')}</div>` : '<div class="empty" style="margin:8px 0 0">כל השחקנים כבר בקבוצות.</div>'}
      <div style="margin-top:14px"><button class="btn tinted" data-a="newPlayerLate">${I.plus}שחקן שלא ברשימה</button></div>`;
  } else if (sh.type === 'text') {
    inner = `${head(sh.title)}
      <div class="field"><label for="tval" class="sr">${sh.title}</label><input id="tval" class="input" data-input="tval" value="${esc(sh.value)}" maxlength="60"></div>
      <div style="margin-top:20px"><button class="btn primary" data-a="${sh.action}">שמירה</button></div>`;
  } else if (sh.type === 'switch') {
    const groups = store('groups') || [];
    inner = `${head('הקבוצות שלי')}<div class="opts" style="margin-top:8px">${groups.map((g) => `<button class="opt" data-a="pickGroup" data-id="${g.id}" aria-pressed="${g.id === S.gid}"><span style="flex:1">${esc(g.name || 'קבוצה')}</span>${I.check}</button>`).join('')}</div>`;
  } else if (sh.type === 'noshow') {
    const m = rsvpMap();
    const list = players().filter((p) => m[p.id] && m[p.id].answer === 'in');
    inner = `${head('מי לא הגיע?')}
      <p class="hint" style="margin:0 4px 10px">מי שמסומן כאן מקבל קנס למשחק הבא: ${PEN_TXT[S.data.group.penalty_mode]}. אפשר לבטל בהקשה נוספת.</p>
      <div class="opts">${list.map((p) => `<button class="opt" data-a="toggleNoshow" data-id="${p.id}" aria-pressed="${!!m[p.id].noshow}"><span style="flex:1">${esc(p.name)}</span>${m[p.id].noshow ? '<span class="chip pending" style="height:26px;font-size:13px">לא הגיע</span>' : ''}</button>`).join('')}</div>`;
  } else if (sh.type === 'rules') {
    const d = sh.draft;
    inner = `${head('כללי הרשמה וקנסות')}
      <div class="field"><span class="lbl">כמה משחקים?</span>
        <div class="seg" role="group" aria-label="מספר מקומות">${[10, 15, 20, 25].map((n) => `<button data-a="ruleCap" data-v="${n}" aria-pressed="${d.capacity === n}">${n}</button>`).join('')}</div>
        <p class="hint">מעבר למספר הזה, מי שנרשם נכנס לרשימת המזמינים לפי הסדר.</p></div>
      <div class="field"><span class="lbl">ביטול מאוחר</span>
        <div class="seg" role="group" aria-label="חלון ביטול מאוחר">${[[30, 'חצי שעה'], [60, 'שעה'], [120, 'שעתיים']].map(([n, l]) => `<button data-a="ruleLate" data-v="${n}" aria-pressed="${d.late === n}">${l}</button>`).join('')}</div>
        <p class="hint">מי שמבטל בזמן הזה לפני המשחק, כשאין מזמין שיחליף אותו, מקבל קנס. גם מי שמסומן "לא הגיע".</p></div>
      <div class="field"><span class="lbl">הקנס</span><div class="opts">
        <button class="opt" data-a="ruleMode" data-v="bench" aria-pressed="${d.mode === 'bench'}"><span style="flex:1;display:flex;flex-direction:column"><span>נכנס למזמינים במשחק הבא</span><span class="hint" style="padding:0">יכול להירשם, אבל אחרון בתור</span></span>${I.check}</button>
        <button class="opt" data-a="ruleMode" data-v="block" aria-pressed="${d.mode === 'block'}"><span style="flex:1;display:flex;flex-direction:column"><span>לא יכול להירשם למשחק הבא</span><span class="hint" style="padding:0">חסום לפעם אחת</span></span>${I.check}</button>
      </div></div>
      <div style="margin-top:22px"><button class="btn primary" data-a="saveRules">שמירה</button></div>`;
  } else if (sh.type === 'confirm') {
    inner = `${head(sh.title)}<p style="margin:4px 4px 0;color:var(--label2)">${sh.body}</p>
      <div style="margin-top:20px;display:flex;flex-direction:column;gap:8px"><button class="btn primary" style="background:var(--danger)" data-a="${sh.action}">${sh.ok}</button><button class="btn secondary" data-a="closeSheet">ביטול</button></div>`;
  }
  return `<div class="dim" data-a="closeSheet"></div><section class="sheet" role="dialog" aria-modal="true" aria-labelledby="sheet-title">${inner}</section>`;
}

function openSheet(s) { S.sheet = s; render(); }
function closeSheet() { S.sheet = null; render(); }

/* ---------- splitting ---------- */
function shuffleArr(a) {
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

function buildResult(option, T, sizes, caps, waitingIds, mode) {
  const teams = option.teams.map((ids, i) => ({ name: VESTS[i].name, color: VESTS[i].color, captain: caps[i], players: ids }));
  // Teams carrying a substitute go to the back of the queue; the rest are drawn at random.
  const idx = teams.map((_, i) => i);
  let queue;
  if (mode === 'subs') {
    const normal = shuffleArr(idx.filter((i) => sizes[i] === Math.min(...sizes)));
    const big = shuffleArr(idx.filter((i) => sizes[i] !== Math.min(...sizes)));
    queue = normal.concat(big);
  } else queue = shuffleArr(idx);
  // Players penalised with "goes to the waiting players" never kick off: their teams start in the queue.
  const benched = new Set(S.data.rsvps.filter((r) => r.benched).map((r) => r.player_id));
  if (benched.size) {
    const cnt = (i) => teams[i].players.filter((id) => benched.has(id)).length;
    queue = queue.map((i, k) => [i, k]).sort((a, b) => cnt(a[0]) - cnt(b[0]) || a[1] - b[1]).map((x) => x[0]);
  }
  return { v: 1, teams, queue, waiting: waitingIds && waitingIds.length ? { players: waitingIds } : null, mode, size: Math.min(...sizes) };
}

function runSplit() {
  const list = coming().map((p) => ({ id: p.id, rating: p.rating, pos: p.position }));
  const pl = plan(list.length);
  let caps = currentCaptains(coming(), pl.T);
  if (caps.length !== pl.T) {
    toast(`צריך לבחור בדיוק ${pl.T} קפטנים (נבחרו ${caps.length}).`, true);
    return null;
  }
  let pool = list;
  let waitingIds = [];
  let sizes = Array(pl.T).fill(pl.size);
  if (pl.extras) {
    if (S.extrasMode === 'wait') {
      // The last to confirm wait as a fifth team; captains never wait.
      const capSet = new Set(caps);
      const order = [...list].reverse().filter((p) => !capSet.has(p.id));
      waitingIds = order.slice(0, pl.extras).map((p) => p.id).reverse();
      const w = new Set(waitingIds);
      pool = list.filter((p) => !w.has(p.id));
    } else {
      for (let i = 0; i < pl.extras; i++) sizes[pl.T - 1 - (i % pl.T)] += 1;
    }
  }
  const options = balance(pool, { captains: caps, sizes });
  S.options = { list: options, sizes, caps, waitingIds, mode: pl.extras ? S.extrasMode : 'none', T: pl.T };
  S.optIdx = 0;
  return completeWaiting(buildResult(options[0], pl.T, sizes, caps, waitingIds, S.options.mode));
}

// When the waiting list reaches a full team, it becomes a team at the back of the queue,
// and only the teams that are not on the pitch are rebalanced with it.
function completeWaiting(R) {
  const B = byId();
  let made = 0;
  while (R.waiting && R.waiting.players.length >= TEAM_SIZE) {
    const ids = R.waiting.players.slice(0, TEAM_SIZE);
    const rest = R.waiting.players.slice(TEAM_SIZE);
    const vest = EXTRA_VESTS[Math.min(R.teams.length - 4, EXTRA_VESTS.length - 1)] || WAIT_VEST;
    const newCap = [...ids].sort((a, b) => rateOf(B[b]) - rateOf(B[a]))[0];
    R.teams.push({ name: vest.name, color: vest.color, captain: newCap, players: ids });
    const ni = R.teams.length - 1;
    const group = R.queue.slice(2).concat([ni]);
    const pool = group.flatMap((i) => R.teams[i].players).map((id) => ({ id, rating: (B[id] || {}).rating, pos: (B[id] || {}).position || 'B' }));
    const sizes = group.map((i) => R.teams[i].players.length);
    const caps = group.map((i) => R.teams[i].captain);
    const best = balance(pool, { captains: caps, sizes, restarts: 80 })[0];
    group.forEach((ti, k) => { R.teams[ti].players = best.teams[k]; });
    R.queue.push(ni);
    R.waiting = rest.length ? { players: rest } : null;
    made++;
  }
  R._made = made;
  return R;
}

async function saveResult(result) {
  await act('admin_save_result', { p_game: S.data.game.id, p_result: result });
}

function recomputeFromResult() {
  // After a reload the options are gone: rebuild them from the saved teams.
  const R = resultTeams();
  const B = byId();
  const ids = R.teams.flatMap((t) => t.players);
  const pool = ids.map((id) => ({ id, rating: (B[id] || {}).rating, pos: (B[id] || {}).position || 'B' }));
  const sizes = R.teams.map((t) => t.players.length);
  const caps = R.teams.map((t) => t.captain);
  const options = balance(pool, { captains: caps, sizes });
  S.options = { list: options, sizes, caps, waitingIds: R.waiting ? R.waiting.players : [], mode: R.mode, T: R.teams.length };
  const cur = R.teams.map((t) => [...t.players].sort().join(',')).sort().join('|');
  S.optIdx = Math.max(0, options.findIndex((o) => o.teams.map((t) => [...t].sort().join(',')).sort().join('|') === cur));
}

async function absorbLate(pid) {
  const R = JSON.parse(JSON.stringify(resultTeams()));
  if (!R.waiting) {
    // No waiting team: add as a substitute to the weakest team in the queue.
    const B = byId();
    const waitingIdx = R.queue.slice(2);
    const target = (waitingIdx.length ? waitingIdx : R.queue).reduce((best, i) => (teamTotal(R.teams[i].players, B) < teamTotal(R.teams[best].players, B) ? i : best));
    R.teams[target].players.push(pid);
    await saveResult(R);
    toast('השחקן נכנס כמחליף');
    return;
  }
  R.waiting.players.push(pid);
  completeWaiting(R);
  const made = R._made; delete R._made;
  await saveResult(R);
  if (made) toast('קבוצת המזמינים מלאה ונכנסה לתור. הקבוצות בתור אוזנו מחדש.');
}

function shareTeamsText() {
  const R = resultTeams();
  const B = byId();
  const g = S.data.game;
  const lines = [`הקבוצות · ${S.data.group.name}`, fmtDate(g.starts_at), ''];
  R.queue.forEach((i, k) => {
    const t = R.teams[i];
    lines.push(`${t.name} · ${k < 2 ? 'משחקת' : 'מזמינה ' + (k - 1)}`);
    lines.push(t.players.map((id) => (B[id] ? B[id].name : '') + (id === t.captain ? ' (קפטן)' : '')).join(', '));
    lines.push('');
  });
  if (R.waiting) {
    lines.push(`${WAIT_VEST.name} · בהמתנה (חסרים ${TEAM_SIZE - R.waiting.players.length})`);
    lines.push(R.waiting.players.map((id) => (B[id] ? B[id].name : '')).join(', '));
  }
  return lines.join('\n').trim();
}

function nextFriday() {
  const d = new Date();
  const add = (5 - d.getDay() + 7) % 7 || 7;
  d.setDate(d.getDate() + add);
  d.setHours(8, 0, 0, 0);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T08:00`;
}

/* ---------- events ---------- */
const A = {
  reload: () => location.reload(),
  tab: (el) => { S.tab = el.dataset.tab; store('tab', S.tab); S.view = null; S.swapSel = null; render(); window.scrollTo(0, 0); },
  newPlayer: () => openSheet({ type: 'player', id: null, draft: { name: '', position: 'A', rating: 5 }, focus: 'pname' }),
  editPlayer: (el) => {
    const p = byId()[el.dataset.id];
    openSheet({ type: 'player', id: p.id, draft: { name: p.name, position: p.position, rating: p.rating } });
  },
  guest: () => openSheet({ type: 'player', id: null, markIn: true, draft: { name: '', position: 'A', rating: 5 }, focus: 'pname' }),
  pickPos: (el) => { S.sheet.draft.position = el.dataset.v; render(); },
  pickRating: (el) => { S.sheet.draft.rating = Number(el.dataset.v); render(); },
  savePlayer: async () => {
    const d = S.sheet.draft;
    if (!d.name.trim()) { toast('צריך שם לשחקן.', true); return; }
    if (d.rating == null) { toast('בחרו דירוג.', true); return; }
    const sh = S.sheet;
    const id = await act('admin_save_player', { p_id: sh.id, p_name: d.name.trim(), p_position: d.position, p_rating: d.rating });
    if (sh.markIn && S.data.game) await act('admin_set_rsvp', { p_game: S.data.game.id, p_player: id, p_answer: 'in' });
    if (sh.late && id) { S.sheet = null; await absorbLate(id); return; }
    S.sheet = null; render(); toast('נשמר');
  },
  deletePlayer: () => {
    const p = byId()[S.sheet.id];
    openSheet({ type: 'confirm', id: p.id, title: 'מחיקת שחקן', body: `למחוק את ${esc(p.name)}? אי אפשר לבטל את זה.`, ok: 'מחיקה', action: 'confirmDelete' });
  },
  confirmDelete: async () => { const id = S.sheet.id; S.sheet = null; await act('admin_delete_player', { p_id: id }, 'השחקן נמחק'); },
  invite: () => openSheet({ type: 'invite' }),
  copy: (el) => copy(el.dataset.v),
  shareInvite: () => shareText(`נרשמים פעם אחת לקבוצה "${S.data.group.name}", ומאשרים הגעה בלחיצה:`, `${location.origin}/j/${S.data.group.invite_code}`),
  rotateInvite: () => openSheet({ type: 'confirm', title: 'הנפקת קישור חדש', body: 'הקישור הישן יפסיק לעבוד. שחקנים שכבר נרשמו נשארים.', ok: 'הנפקה', action: 'confirmRotate' }),
  confirmRotate: async () => { await act('admin_rotate_invite', {}, 'נוצר קישור חדש'); S.sheet = { type: 'invite' }; render(); },
  newGame: () => openSheet({ type: 'newGame', value: nextFriday() }),
  createGame: async () => {
    const v = S.sheet.value;
    if (!v) { toast('בחרו תאריך ושעה.', true); return; }
    S.sheet = null;
    S.captains = null; S.teamCount = null; S.options = null;
    await act('admin_new_game', { p_starts_at: new Date(v).toISOString() }, 'המשחק נפתח');
  },
  shareRsvp: () => shareText(`מי בא לכדורגל ${fmtDate(S.data.game.starts_at)}? ${capacity()} מקומות, ומעבר לזה נכנסים למזמינים. סמנו כאן:`, `${location.origin}/r/${S.data.game.rsvp_code}`),
  cycle: async (el) => {
    const id = el.dataset.id;
    const r = rsvpMap()[id];
    const next = !r ? 'in' : r.answer === 'in' ? 'out' : null;
    if (S.captains && next !== 'in') S.captains = S.captains.filter((c) => c !== id);
    await act('admin_set_rsvp', { p_game: S.data.game.id, p_player: id, p_answer: next });
  },
  captain: (el) => {
    const list = coming();
    const pl = plan(list.length);
    const caps = currentCaptains(list, pl.T);
    const id = el.dataset.id;
    S.captains = caps.includes(id) ? caps.filter((c) => c !== id) : caps.concat([id]);
    render();
  },
  teams: (el) => { S.teamCount = Number(el.dataset.n); S.captains = null; render(); },
  extras: (el) => { S.extrasMode = el.dataset.m; render(); },
  split: async () => {
    const res = runSplit();
    if (!res) return;
    S.swapSel = null;
    delete res._made;
    await saveResult(res);
    S.view = 'teams'; render(); window.scrollTo(0, 0);
  },
  openTeams: () => { S.view = 'teams'; S.swapSel = null; render(); window.scrollTo(0, 0); },
  closeTeams: () => { S.view = null; S.swapSel = null; render(); },
  openQueue: () => { S.view = 'queue'; render(); window.scrollTo(0, 0); },
  reshuffle: async () => {
    if (!S.options) recomputeFromResult();
    const o = S.options;
    if (o.list.length < 2) { toast('זו החלוקה ההוגנת היחידה עם הקפטנים האלה.'); return; }
    S.optIdx = (S.optIdx + 1) % o.list.length;
    const R = resultTeams();
    const res = buildResult(o.list[S.optIdx], o.T, o.sizes, o.caps, R.waiting ? R.waiting.players : [], o.mode);
    // Keep vest names stable to the captains, re-draw the queue.
    S.swapSel = null;
    await saveResult(res);
  },
  swap: async (el) => {
    const id = el.dataset.id;
    const R = JSON.parse(JSON.stringify(resultTeams()));
    const ti = R.teams.findIndex((t) => t.players.includes(id));
    if (R.teams[ti].captain === id) { toast('קפטן נשאר בקבוצה שלו. אפשר להחליף קפטן במסך המשחק.'); return; }
    if (!S.swapSel) { S.swapSel = id; render(); return; }
    if (S.swapSel === id) { S.swapSel = null; render(); return; }
    const tj = R.teams.findIndex((t) => t.players.includes(S.swapSel));
    if (ti === tj) { S.swapSel = id; render(); return; }
    R.teams[ti].players[R.teams[ti].players.indexOf(id)] = S.swapSel;
    R.teams[tj].players[R.teams[tj].players.indexOf(S.swapSel)] = id;
    S.swapSel = null;
    S.options = null;
    await saveResult(R);
  },
  rotateQueue: async () => {
    const R = JSON.parse(JSON.stringify(resultTeams()));
    if (R.queue.length < 3) { toast('אין קבוצות בתור.'); return; }
    // Winner stays: the losing side (second on the pitch) goes to the back.
    const [win, lose, ...rest] = R.queue;
    R.queue = [win, rest[0], ...rest.slice(1), lose];
    await saveResult(R);
    toast(`${R.teams[rest[0]].name} עולים למגרש`);
  },
  addLate: () => openSheet({ type: 'late' }),
  pickLate: async (el) => {
    const id = el.dataset.id;
    S.sheet = null;
    if (!rsvpMap()[id] || rsvpMap()[id].answer !== 'in') {
      try { await rpc('admin_set_rsvp', { p_group: S.gid, p_secret: S.secret, p_game: S.data.game.id, p_player: id, p_answer: 'in' }); } catch (e) { /* not essential */ }
    }
    await load();
    await absorbLate(id);
  },
  newPlayerLate: () => openSheet({ type: 'player', id: null, markIn: true, late: true, draft: { name: '', position: 'A', rating: 5 }, focus: 'pname' }),
  shareTeams: () => shareText(shareTeamsText()),
  finishGame: () => openSheet({ type: 'confirm', title: 'סיום המשחק', body: 'המשחק יעבור להיסטוריה, ואפשר יהיה לפתוח משחק חדש.', ok: 'סיום', action: 'confirmFinish' }),
  confirmFinish: async () => { const id = S.data.game.id; S.sheet = null; S.view = null; S.captains = null; S.options = null; await act('admin_finish_game', { p_game: id }, 'המשחק הועבר להיסטוריה'); },
  deputy: () => shareText(`קישור ניהול לקבוצה "${S.data.group.name}" בתיקו. מי שפותח אותו יכול לנהל את הקבוצה, אז שלחו רק לנציג:`, `${location.origin}/m/${S.gid}#${S.secret}`),
  rename: () => openSheet({ type: 'text', title: 'שם הקבוצה', value: S.data.group.name, action: 'saveName', focus: 'tval' }),
  saveName: async () => { const v = S.sheet.value.trim(); if (!v) return; S.sheet = null; await act('admin_rename_group', { p_name: v }, 'השם עודכן'); },
  switchGroup: () => openSheet({ type: 'switch' }),
  pickGroup: (el) => { store('current', el.dataset.id); S.sheet = null; S.data = null; startManager(); },
  newGroup: () => { store('current', null); const groups = store('groups') || []; S.data = null; S.sheet = null; welcomeWithBack(groups.length > 0); },
  closeSheet: () => closeSheet(),
  noshowSheet: () => openSheet({ type: 'noshow' }),
  toggleNoshow: async (el) => {
    const id = el.dataset.id;
    const r = rsvpMap()[id];
    await act('admin_mark_noshow', { p_game: S.data.game.id, p_player: id, p_noshow: !r.noshow }, r.noshow ? 'הסימון בוטל' : 'סומן: לא הגיע · קנס למשחק הבא');
  },
  clearPenalty: async () => { await act('admin_clear_penalty', { p_player: S.sheet.id }, 'הקנס בוטל'); },
  rules: () => openSheet({ type: 'rules', draft: { capacity: capacity(), late: S.data.group.late_minutes || 60, mode: S.data.group.penalty_mode || 'bench' } }),
  ruleCap: (el) => { S.sheet.draft.capacity = Number(el.dataset.v); render(); },
  ruleLate: (el) => { S.sheet.draft.late = Number(el.dataset.v); render(); },
  ruleMode: (el) => { S.sheet.draft.mode = el.dataset.v; render(); },
  saveRules: async () => {
    const d = S.sheet.draft;
    S.sheet = null;
    await act('admin_settings', { p_capacity: d.capacity, p_penalty_mode: d.mode, p_late_minutes: d.late }, 'הכללים נשמרו');
  },
  backToGroup: () => { const g = (store('groups') || [])[0]; if (g) { store('current', g.id); startManager(); } },
};

function welcomeWithBack() { welcome(true); }

document.addEventListener('click', async (e) => {
  const el = e.target.closest('[data-a]');
  if (!el || !A[el.dataset.a]) return;
  if (el.tagName === 'A') e.preventDefault();
  if (el.dataset.busy) return;
  el.dataset.busy = '1';
  try { await A[el.dataset.a](el); } catch (err) { /* toast already shown */ } finally { delete el.dataset.busy; }
});

document.addEventListener('input', (e) => {
  const k = e.target.dataset && e.target.dataset.input;
  if (!k) return;
  const v = e.target.value;
  if (k === 'search') { S.search = v; const pl = document.getElementById('plist'); if (pl) pl.innerHTML = playerList(); }
  else if (k === 'pname') S.sheet.draft.name = v;
  else if (k === 'gdate' || k === 'tval') S.sheet.value = v;
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && S.sheet) closeSheet();
});

document.addEventListener('submit', async (e) => {
  const f = e.target.closest('[data-form]');
  if (!f) return;
  e.preventDefault();
  const kind = f.dataset.form;
  const btn = f.querySelector('button[type=submit]');
  if (btn) btn.disabled = true;
  try {
    if (kind === 'create') {
      const name = f.querySelector('[name=name]').value.trim();
      if (!name) return;
      const g = await rpc('create_group', { p_name: name });
      const groups = store('groups') || [];
      groups.push({ id: g.group_id, secret: g.admin_secret, name: g.name });
      store('groups', groups);
      store('current', g.group_id);
      store('tab', 'players');
      startManager();
      setTimeout(() => toast('הקבוצה נוצרה. עכשיו מזמינים שחקנים.'), 400);
    } else if (kind === 'join') {
      await submitJoin(f);
    }
  } catch (err) {
    toast(errText(err), true);
  } finally {
    if (btn) btn.disabled = false;
  }
});

/* =========================================================
   PLAYER PAGES
   ========================================================= */
const field = (inner) => `<div class="wrap no-tabs">${inner}</div>`;

function hero(title, sub) {
  return `<div class="hero">
    <svg viewBox="0 0 390 120" aria-hidden="true" fill="none" stroke="#fff" stroke-width="2"><circle cx="195" cy="120" r="60"/><path d="M0 119h390"/></svg>
    <div class="brand">תיקו</div><h1>${esc(title)}</h1>${sub ? `<p>${esc(sub)}</p>` : ''}</div>`;
}

let J = { pos: 'A', name: '' };

async function joinPage(code) {
  $app.innerHTML = '<div class="spinner" role="progressbar" aria-label="טוען"></div>';
  let info;
  try { info = await rpc('join_info', { p_code: code, p_device: deviceId() }); }
  catch (e) { $app.innerHTML = field(`${hero('אין חיבור')}<p class="pp hint" style="margin-top:16px">${esc(errText(e))}</p>`); return; }
  if (!info) { $app.innerHTML = field(`${hero('הקישור לא תקף')}<p class="pp hint" style="margin-top:16px">${ERR.bad_link}</p>`); return; }
  if (info.me) { J = { pos: info.me.position, name: info.me.name }; }
  const next = new URLSearchParams(location.search).get('next');
  const renderJoin = () => {
    $app.innerHTML = field(`
      ${hero(info.name, `${info.count} שחקנים רשומים`)}
      <form class="pp" data-form="join" data-code="${esc(code)}" data-next="${esc(next || '')}">
        ${info.me ? `<p class="hint" style="margin-top:16px">כבר נרשמת בתור <b>${esc(info.me.name)}</b>. אפשר לעדכן את הפרטים.</p>` : ''}
        <div class="field"><label for="jname">איך קוראים לך?</label>
          <input id="jname" name="name" class="input" required maxlength="40" autocomplete="name" value="${esc(J.name)}" data-input-join="name">
          <span class="hint">שם פרטי ושם משפחה, כמו שהחבר'ה מכירים אותך</span></div>
        <div class="field"><span class="lbl">איפה אתה משחק?</span><div class="opts">${['D', 'A', 'B'].map((k) => `
          <button type="button" class="opt" data-join-pos="${k}" aria-pressed="${J.pos === k}"><span class="ic">${I[k]}</span><span style="flex:1;display:flex;flex-direction:column"><span>${POS[k]}</span><span class="hint" style="padding:0">${POS_HINT[k]}</span></span>${I.check}</button>`).join('')}</div></div>
        <div style="margin-top:22px"><button class="btn primary" type="submit">${info.me ? 'עדכון' : 'הצטרפות לקבוצה'}</button></div>
        <p class="hint" style="text-align:center;margin-top:12px">המנהל יראה את השם והעמדה שלך. לא צריך להתקין כלום ולא צריך סיסמה.</p>
      </form>`);
  };
  renderJoin();
  $app.addEventListener('click', (e) => {
    const b = e.target.closest('[data-join-pos]');
    if (!b) return;
    J.name = document.getElementById('jname').value;
    J.pos = b.dataset.joinPos;
    renderJoin();
  });
}

async function submitJoin(f) {
  const name = f.querySelector('[name=name]').value.trim();
  if (!name) { toast('צריך שם.', true); return; }
  const r = await rpc('join_group', { p_code: f.dataset.code, p_device: deviceId(), p_name: name, p_position: J.pos });
  const next = f.dataset.next;
  if (next && /^\/r\/[a-z0-9]+$/.test(next)) { location.href = next; return; }
  $app.innerHTML = field(`${hero('נרשמת!', r.group_name)}
    <div class="card" style="text-align:center"><b style="font-size:20px">${esc(name)}</b><p class="hint">מעכשיו כשיגיע קישור "מי בא?" בוואטסאפ, תספיק לחיצה אחת.</p></div>`);
}

async function rsvpPage(code) {
  $app.innerHTML = '<div class="spinner" role="progressbar" aria-label="טוען"></div>';
  let v;
  const loadV = async () => { v = await rpc('rsvp_view', { p_code: code, p_device: deviceId() }); };
  try { await loadV(); }
  catch (e) { $app.innerHTML = field(`${hero('אין חיבור')}<p class="pp hint" style="margin-top:16px">${esc(errText(e))}</p>`); return; }
  if (!v) { $app.innerHTML = field(`${hero('הקישור לא תקף')}<p class="pp hint" style="margin-top:16px">${ERR.bad_link}</p>`); return; }
  let picked = null;
  let confirmLate = false;
  const PEN_NEXT = { bench: 'במשחק הבא תיכנס אוטומטית למזמינים', block: 'לא תוכל להירשם למשחק הבא' };

  const draw = () => {
    const closed = v.status !== 'open';
    const waitingPos = v.my_answer === 'in' && v.my_rank > v.capacity ? v.my_rank - v.capacity : 0;
    const pen = v.my_penalty;
    let body = '';
    if (closed) {
      body = `<div class="card"><b>ההרשמה למשחק הזה נסגרה.</b></div>`;
    } else if (!v.me && !picked) {
      body = `<h2 class="sec-h">מי אתה?</h2>
        ${v.unclaimed.length ? `<div class="opts" style="margin:0 16px">${v.unclaimed.map((p) => `<button class="opt" data-pick="${p.id}"><span style="flex:1">${esc(p.name)}</span>${I.chev}</button>`).join('')}</div>` : ''}
        <div style="margin:14px 16px 0"><a class="btn tinted" href="/j/${esc(v.invite_code)}?next=${encodeURIComponent('/r/' + code)}">אני לא ברשימה · הרשמה</a></div>`;
    } else if (confirmLate) {
      body = `<div class="card" role="alertdialog" aria-labelledby="late-t" style="display:flex;flex-direction:column;gap:12px">
          <b id="late-t" style="font-size:17px;color:var(--pending)">ביטול מאוחר יגרור קנס</b>
          <p style="margin:0;font-size:15px;line-height:21px">נשארו פחות מ-${v.late_minutes} דקות למשחק, ואין מזמינים שיכולים להחליף אותך. אם תבטל עכשיו, ${PEN_NEXT[v.penalty_mode]}.</p>
          <button class="btn secondary" data-late="keep">נשאר, אני בא</button>
          <button class="btn danger" data-late="cancel">לבטל בכל זאת</button>
        </div>`;
    } else {
      const ans = v.my_answer;
      const meName = v.me ? v.me.name : (v.unclaimed.find((p) => p.id === picked) || {}).name;
      const blocked = pen && pen.kind === 'block';
      body = `<div class="card" style="display:flex;flex-direction:column;gap:12px">
          <p style="margin:0;font-size:17px">היי ${esc(meName || '')}, מגיע?</p>
          ${pen ? `<p style="margin:0;padding:10px 12px;border-radius:10px;background:var(--pending-bg);color:var(--pending);font-size:15px;line-height:20px">${blocked ? 'בגלל קנס מהמשחק הקודם' : 'בגלל קנס מהמשחק הקודם, אתה נכנס הפעם לסוף רשימת המזמינים'}${pen.reason ? ` (${esc(pen.reason)})` : ''}${blocked ? ', אי אפשר להירשם למשחק הזה.' : '.'}</p>` : ''}
          <div class="big2">
            <button class="btn ${ans === 'in' ? 'primary' : 'secondary'}" data-ans="in" aria-pressed="${ans === 'in'}" ${blocked ? 'disabled' : ''}>אני בא</button>
            <button class="btn ${ans === 'out' ? 'primary' : 'secondary'}" style="${ans === 'out' ? 'background:var(--label);color:var(--bg)' : ''}" data-ans="out" aria-pressed="${ans === 'out'}">לא הפעם</button>
          </div>
          ${ans === 'in' && !waitingPos ? '<p style="margin:0;color:var(--accent);font-size:15px">יש לך מקום. נתראה במגרש.</p>' : ''}
          ${waitingPos ? `<p style="margin:0;font-size:15px;line-height:20px"><b>אתה ברשימת המזמינים, מקום ${waitingPos}.</b> אם מישהו מבטל, תיכנס אוטומטית.</p>` : ''}
          ${ans === 'out' ? '<p class="hint" style="margin:0">רשמנו. אם תשנה את דעתך, הקישור עדיין עובד.</p>' : ''}
          ${ans === 'in' && v.late && v.would_penalize ? `<p class="hint" style="margin:0">נשארו פחות מ-${v.late_minutes} דקות למשחק: ביטול עכשיו יגרור קנס.</p>` : ''}
        </div>`;
    }
    const spots = v.spots_left > 0
      ? `<p style="margin:0;font-size:17px"><b style="color:var(--accent);font-size:22px">${v.spots_left}</b> מקומות פנויים מתוך ${v.capacity}</p>`
      : `<p style="margin:0;font-size:17px"><b>המקומות מלאים</b> · מי שנרשם עכשיו נכנס למזמינים${v.waiting_count ? ` (${v.waiting_count} כבר בתור)` : ''}</p>`;
    $app.innerHTML = field(`${hero('מי בא?', `${v.group_name} · ${fmtDate(v.starts_at)}`)}
      <div class="card" style="margin-top:12px">${spots}</div>
      ${body}
      <h2 class="sec-h">משחקים · ${v.coming.length} מתוך ${v.capacity}</h2>
      <div class="card" style="margin-top:0">${v.coming.length ? `<div class="names">${v.coming.map((n) => `<span>${esc(n)}</span>`).join('')}</div>` : '<span class="hint">עוד אף אחד. תהיה הראשון.</span>'}</div>
      ${v.waiting.length ? `<h2 class="sec-h">מזמינים · ${v.waiting.length} · לפי הסדר</h2><div class="card" style="margin-top:0"><div class="names">${v.waiting.map((n, i) => `<span>${i + 1}. ${esc(n)}</span>`).join('')}</div></div>` : ''}
      <div style="height:30px"></div>`);
  };
  draw();

  const answer = async (ans) => {
    const was = v.my_answer;
    const r = await rpc('rsvp_answer', { p_code: code, p_device: deviceId(), p_answer: ans, p_player: v.me ? null : picked });
    await loadV();
    picked = null;
    confirmLate = false;
    draw();
    if (r && r.penalized) toast(`בוטל. ${PEN_NEXT[r.penalty_mode]}.`, true);
    else if (ans === 'in') toast(v.my_rank > v.capacity ? `נרשמת למזמינים, מקום ${v.my_rank - v.capacity}` : (was === 'in' ? 'המקום שלך שמור' : 'יש לך מקום!'));
    else toast('סומן: לא הפעם');
  };

  $app.addEventListener('click', async (e) => {
    const p = e.target.closest('[data-pick]');
    if (p) { picked = p.dataset.pick; draw(); return; }
    const l = e.target.closest('[data-late]');
    if (l) {
      if (l.dataset.late === 'keep') { confirmLate = false; draw(); return; }
      try { await answer('out'); } catch (err) { toast(errText(err), true); }
      return;
    }
    const a = e.target.closest('[data-ans]');
    if (!a || a.dataset.busy) return;
    if (a.dataset.ans === 'out' && v.my_answer === 'in' && v.would_penalize) { confirmLate = true; draw(); return; }
    a.dataset.busy = '1';
    try {
      await answer(a.dataset.ans);
    } catch (err) {
      toast(errText(err), true);
      if (err.code === 'need_identity') { picked = null; await loadV(); draw(); }
    } finally { delete a.dataset.busy; }
  });
}

/* ---------- router (runs last, after everything is defined) ---------- */
const path = location.pathname.replace(/\/+$/, '');
const parts = path.split('/').filter(Boolean);

if (parts[0] === 'm' && parts[1] && location.hash.length > 1) {
  const groups = store('groups') || [];
  const id = parts[1];
  const secret = location.hash.slice(1);
  if (!groups.find((g) => g.id === id)) groups.push({ id, secret, name: '' });
  else groups.find((g) => g.id === id).secret = secret;
  store('groups', groups);
  store('current', id);
  history.replaceState(null, '', '/');
  startManager();
} else if (parts[0] === 'j' && parts[1]) {
  joinPage(parts[1]);
} else if (parts[0] === 'r' && parts[1]) {
  rsvpPage(parts[1]);
} else {
  startManager();
}
