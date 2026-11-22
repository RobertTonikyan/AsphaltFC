import { POS, LIMITS, bib, bibStyle, plan, balance, shuffle, makeDraw, applyWin, applyTie } from './teams.js';
import { DEMO, serverNow, createGroup, loadGroup, saveGroup, viewGroup, errText } from './api.js';

const $app = document.getElementById('app');
const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clamp = (v, [lo, hi]) => Math.min(hi, Math.max(lo, v));
const MIN = 60000;
const demoQ = DEMO ? '?demo' : '';

/* ---------- local storage (per device conveniences only) ---------- */
function store(key, val) {
  try {
    if (val === undefined) return JSON.parse(localStorage.getItem('asphalt.' + key) || 'null');
    localStorage.setItem('asphalt.' + key, JSON.stringify(val));
  } catch (e) { return null; }
  return val;
}
function rememberGroup(g) {
  const list = (store('groups') || []).filter((x) => x.id !== g.id);
  list.unshift(g);
  store('groups', list.slice(0, 12));
}

/* ---------- toast ---------- */
let toastTimer;
function toast(msg, isErr) {
  document.querySelectorAll('.toast').forEach((n) => n.remove());
  const t = document.createElement('div');
  t.className = 'toast' + (isErr ? ' err' : '');
  t.setAttribute('role', isErr ? 'alert' : 'status');
  t.textContent = msg;
  document.body.appendChild(t);
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.remove(), 3000);
}
async function copy(text, okMsg) {
  try { await navigator.clipboard.writeText(text); toast(okMsg || 'הקישור הועתק'); }
  catch (e) { toast('לא הצלחתי להעתיק. אפשר לסמן את הקישור ולהעתיק ידנית.', true); }
}

/* ---------- shared pieces ---------- */
const fmt = (ms) => {
  const t = Math.max(0, Math.ceil(ms / 1000));
  return Math.floor(t / 60) + ':' + String(t % 60).padStart(2, '0');
};
const newGame = (dur) => ({ dur, remaining: dur * MIN, endAt: null, running: false, over: false, extra: 0, started: false, pens: false });
const leftOf = (g) => (g.running ? Math.max(0, g.endAt - serverNow()) : g.remaining);

function band({ title, sub, tabs, status }) {
  return `<header class="band ${tabs ? '' : 'notabs'}"><div class="gut">
    <div class="band-top"><a class="brand" href="/${demoQ}">Asphalt FC</a>${status ? `<span class="sync ${status.cls}" role="status">${status.text}</span>` : ''}</div>
    <h1>${esc(title)}</h1>${sub ? `<p class="band-sub">${sub}</p>` : ''}
    ${tabs || ''}
  </div></header>`;
}

function drawHtml(S, opts) {
  const d = S.result.draw;
  const t = S.result.teams;
  const A = bib(t[d.first[0]].bib);
  const B = bib(t[d.first[1]].bib);
  return `<section class="draw" aria-live="polite"><h2>${(d.n || 1) === 1 ? 'המשחק הראשון' : 'משחק ' + d.n}</h2>
    <div class="match ${opts.revealed ? 'revealed' : ''}" id="match">
      <div class="side" style="${bibStyle(A)}">${A.name}</div><div class="vs">נגד</div><div class="side" style="${bibStyle(B)}">${B.name}</div>
    </div>
    ${d.queue.length ? `<div class="queue"><b>הבאות בתור</b><ol>${d.queue.map((i) => { const b = bib(t[i].bib); return `<li><span class="dot" style="${bibStyle(b)}"></span>${t[i].waiting ? 'מזמינה · ' : ''}${b.name}</li>`; }).join('')}</ol></div>` : ''}
    ${opts.redraw ? '<div class="actions"><button class="btn ghost light" data-act="draw">הגרל שוב</button></div>' : ''}
  </section>`;
}

function teamsHtml(S, { ratings, dealt }) {
  const byId = Object.fromEntries(S.players.map((p) => [p.id, p]));
  return `<div class="teams ${dealt ? 'dealt' : ''}">` + S.result.teams.map((t) => {
    const b = bib(t.bib);
    const ps = t.ids.map((id) => byId[id]).filter(Boolean);
    const a = ratings && ps.length ? ps.reduce((s, p) => s + p.rating, 0) / ps.length : 0;
    return `<section class="team ${t.waiting ? 'waiting' : ''}" style="${bibStyle(b)}" aria-label="קבוצה ${b.name}">
      <div class="team-head"><h3>${t.waiting ? '<span class="sub">קבוצה מזמינה</span>' : ''}קבוצה ${b.name}</h3>
      ${ratings ? `<div class="avg"><b class="num">${a.toFixed(1)}</b><span>ממוצע</span></div>` : `<div class="avg"><span class="num">${ps.length} שחקנים</span></div>`}</div>
      <ol>${ps.map((p) => `<li><span class="who"><span class="tag ${p.pos === 'gk' ? 'gk' : ''}">${POS[p.pos] || ''}</span><span>${esc(p.name)}</span></span>${ratings ? `<span class="r num">${p.rating}</span>` : ''}</li>`).join('')}</ol>
    </section>`;
  }).join('') + '</div>';
}

function clockHtml(S, isManager) {
  const g = S.game;
  const d = S.result.draw;
  const t = S.result.teams;
  const hasQueue = d.queue.length > 0;
  const left = leftOf(g);
  const over = g.over || (g.running && left <= 0);
  const st = over ? 'הזמן נגמר' : g.running ? 'המשחק רץ' : g.started ? 'המשחק עצור' : 'מוכן לפתיחה';
  let h = `<section class="clock ${g.running && !over ? 'running' : ''} ${over ? 'over' : ''}" aria-label="שעון משחק">
    <p class="state">${st}</p>
    <div class="time" id="clockTime" role="timer">${fmt(over ? 0 : left)}</div>
    <p class="extra">${g.extra ? `כולל ${g.extra} ${g.extra === 1 ? 'דקת' : 'דקות'} הארכה` : ''}</p>`;
  if (isManager) {
    if (!g.started) {
      h += `<div class="dur"><label>זמן משחק בדקות</label><div class="stepper"><button data-act="g-dur" data-arg="-1" aria-label="פחות דקות" ${g.dur <= LIMITS.minutes[0] ? 'disabled' : ''}>−</button><output class="num">${g.dur}</output><button data-act="g-dur" data-arg="1" aria-label="יותר דקות" ${g.dur >= LIMITS.minutes[1] ? 'disabled' : ''}>+</button></div></div>
      <div class="row"><button class="btn hi" data-act="g-start">התחל משחק</button></div>`;
    } else {
      h += `<div class="row">${over ? '' : g.running ? '<button class="btn hi" data-act="g-pause">עצור</button>' : '<button class="btn hi" data-act="g-resume">המשך</button>'}
        <button class="btn ghost" data-act="g-reset">התחל מחדש</button></div>`;
      if (hasQueue) h += '<div class="row"><button class="btn" data-act="g-extra">הארכה: דקה נוספת</button></div>';
      if (over || !g.running) {
        const winBtns = d.first.map((i) => { const b = bib(t[i].bib); return `<button class="btn" style="${bibStyle(b)}" data-act="g-win" data-arg="${i}">${b.name}</button>`; }).join('');
        if (g.pens) h += `<div class="winner"><p>תיקו, ויש קבוצה מזמינה אחת: פנדלים. מי ניצחה בפנדלים?</p><div class="row">${winBtns}</div></div>`;
        else h += `<div class="winner"><p>${over ? 'מי ניצחה?' : 'סיום מוקדם? מי ניצחה'}</p><div class="row">${winBtns}</div>
          ${hasQueue ? `<div class="row"><button class="btn ghost" data-act="g-tie">תיקו${d.queue.length >= 2 ? ': שתי הקבוצות הבאות עולות' : ': פנדלים'}</button></div>` : ''}</div>`;
      }
    }
  }
  return h + '</section>';
}

/* ---------- sound and screen ---------- */
let audioCtx = null;
function unlockAudio() { try { audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { /* no audio */ } }
function whistle() {
  try {
    unlockAudio();
    [0, 0.35, 0.7].forEach((t) => {
      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      o.frequency.value = 880;
      o.connect(g); g.connect(audioCtx.destination);
      g.gain.setValueAtTime(0.25, audioCtx.currentTime + t);
      g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + t + 0.3);
      o.start(audioCtx.currentTime + t); o.stop(audioCtx.currentTime + t + 0.3);
    });
  } catch (e) { /* no audio */ }
  try { navigator.vibrate && navigator.vibrate([300, 150, 300]); } catch (e) { /* no vibration */ }
}
let wake = null;
async function keepAwake(on) {
  try {
    if (on && !wake && navigator.wakeLock) wake = await navigator.wakeLock.request('screen');
    else if (!on && wake) { await wake.release(); wake = null; }
  } catch (e) { /* not supported */ }
}

/* =========================================================
   HOME
   ========================================================= */
function home() {
  const mine = store('groups') || [];
  $app.innerHTML = band({ title: 'קבוצות הוגנות למגרש', sub: 'מכניסים שחקנים ודירוג, מקבלים קבוצות מאוזנות, מגרילים מי פותח ומפעילים שעון. בלי הרשמה.' }) +
  `<main class="gut">
    <form class="add create" id="createForm" autocomplete="off">
      <label for="groupName" class="lbl">שם הקבוצה השכונתית</label>
      <input type="text" id="groupName" placeholder="למשל: כדורגל של שישי" maxlength="60" required>
      <button class="btn hi" type="submit">צור קבוצה</button>
    </form>
    ${mine.length ? `<h2 class="sec">הקבוצות שלי</h2><ul class="mine">${mine.map((g) => `<li><a href="/m/${encodeURIComponent(g.id)}${demoQ}#${encodeURIComponent(g.secret)}"><b>${esc(g.name)}</b><span>ניהול</span></a></li>`).join('')}</ul>` : ''}
    <p class="note">הקבוצה נשמרת בשרת. מי שמחזיק בקישור הניהול יכול לערוך אותה, ולשחקנים שולחים קישור צפייה נפרד שלא מראה דירוגים.</p>
  </main>`;
  $('#createForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = $('#groupName').value.trim();
    if (!name) return;
    const btn = e.target.querySelector('button');
    btn.disabled = true;
    try {
      const r = await createGroup(name);
      rememberGroup({ id: r.id, secret: r.secret, name, code: r.view_code });
      location.href = `/m/${encodeURIComponent(r.id)}${demoQ}#${encodeURIComponent(r.secret)}`;
    } catch (err) {
      btn.disabled = false;
      toast(errText(err), true);
    }
  });
}

/* =========================================================
   MANAGER
   ========================================================= */
const M = { id: null, secret: null, name: '', code: '', S: null, tab: 'roster', newPos: 'mid', newRate: 5, pendingDel: null, dealt: false, drawn: false, rolling: false, sync: 'saved' };

function freshState() { return { players: [], teams: 3, size: 5, dur: 8, result: null, game: null }; }

async function startManager(id) {
  M.id = id;
  M.secret = decodeURIComponent(location.hash.slice(1));
  M.tab = store('tab') || 'roster';
  $app.innerHTML = '<div class="spinner" role="progressbar" aria-label="טוען"></div>';
  try {
    const r = await loadGroup(M.id, M.secret);
    M.name = r.name; M.code = r.view_code;
    M.S = Object.assign(freshState(), r.state || {});
    rememberGroup({ id: M.id, secret: M.secret, name: M.name, code: M.code });
    renderManager();
  } catch (e) {
    $app.innerHTML = band({ title: 'אין גישה' }) + `<main class="gut"><div class="empty"><h2>לא הצלחתי לפתוח</h2><p>${esc(errText(e))}</p><button class="btn" data-act="reload">ניסיון חוזר</button></div></main>`;
  }
}

/* saving: debounced, retried while offline */
let saveTimer = null;
let retryTimer = null;
function persist() {
  M.sync = 'saving';
  paintSync();
  clearTimeout(saveTimer);
  saveTimer = setTimeout(flush, 400);
}
async function flush() {
  clearTimeout(retryTimer);
  try {
    await saveGroup(M.id, M.secret, M.S);
    M.sync = 'saved';
  } catch (e) {
    M.sync = 'error';
    retryTimer = setTimeout(flush, 5000);
  }
  paintSync();
}
const SYNC = { saved: { cls: 'ok', text: 'נשמר' }, saving: { cls: '', text: 'שומר…' }, error: { cls: 'err', text: 'אין חיבור, מנסה שוב' } };
function paintSync() { const el = $('.sync'); if (el) { el.className = 'sync ' + SYNC[M.sync].cls; el.textContent = SYNC[M.sync].text; } }

const here = () => M.S.players.filter((p) => p.here);

function renderManager() {
  const tabs = `<nav class="tabs" role="tablist">
    ${[['roster', 'סגל'], ['split', 'חלוקה'], ['links', 'קישורים']].map(([k, v]) => `<button role="tab" data-tab="${k}" aria-selected="${M.tab === k}">${v}</button>`).join('')}
  </nav>`;
  const body = M.tab === 'roster' ? rosterView() : M.tab === 'split' ? splitView() : linksView();
  $app.innerHTML = band({ title: M.name, tabs, status: SYNC[M.sync] }) + `<main class="gut">${body}</main>`;
  M.dealt = false; M.drawn = false;
}

function rosterView() {
  const S = M.S;
  const n = here().length;
  let h = `<div class="summary"><span class="big num">${n}</span><small>מגיעים היום, מתוך ${S.players.length} בסגל</small></div>
    <form class="add" id="addForm" autocomplete="off">
      <input type="text" id="newName" placeholder="שם השחקן" aria-label="שם השחקן" maxlength="30" required>
      <button class="btn" type="submit">הוסף</button>
      <div class="row2"><span class="poslab">עמדה</span><div class="chips" role="group" aria-label="עמדה">
        ${Object.entries(POS).map(([k, v]) => `<button type="button" class="chip" data-newpos="${k}" aria-pressed="${M.newPos === k}">${v}</button>`).join('')}
      </div><span class="poslab push">דירוג</span>
      <div class="rate"><button type="button" data-newrate="-1" aria-label="הורד דירוג">−</button><output class="num">${M.newRate}</output><button type="button" data-newrate="1" aria-label="העלה דירוג">+</button></div></div>
    </form>`;
  if (!S.players.length) return h + '<div class="empty"><h2>הסגל ריק</h2><p>הוסף את השחקנים הקבועים פעם אחת, והם יישמרו למשחקים הבאים.</p></div>';
  const list = [...S.players].sort((a, b) => (b.here - a.here) || a.name.localeCompare(b.name, 'he'));
  h += '<ul class="roster">' + list.map((p) => `<li class="${p.here ? '' : 'away'}">
      <input type="checkbox" class="here" data-here="${p.id}" ${p.here ? 'checked' : ''} aria-label="${esc(p.name)} מגיע היום">
      <span class="name">${esc(p.name)}</span>
      <span class="pos"><select data-pos="${p.id}" aria-label="עמדה של ${esc(p.name)}">${Object.entries(POS).map(([k, v]) => `<option value="${k}" ${p.pos === k ? 'selected' : ''}>${v}</option>`).join('')}</select></span>
      <span class="rate"><button type="button" data-rate="${p.id}" data-d="-1" aria-label="הורד דירוג ל${esc(p.name)}" ${p.rating <= 1 ? 'disabled' : ''}>−</button><output class="num">${p.rating}</output><button type="button" data-rate="${p.id}" data-d="1" aria-label="העלה דירוג ל${esc(p.name)}" ${p.rating >= 10 ? 'disabled' : ''}>+</button></span>
      <button type="button" class="del ${M.pendingDel === p.id ? 'confirm' : ''}" data-del="${p.id}">${M.pendingDel === p.id ? 'למחוק? לחץ שוב' : 'מחק'}</button>
    </li>`).join('') + '</ul>';
  h += `<div class="bar"><div class="in"><button class="btn" data-tab="split">המשך לחלוקה (${n} מגיעים)</button></div></div>`;
  return h;
}

function planText() {
  const S = M.S;
  const n = here().length;
  const P = plan(n, S.teams, S.size);
  if (n < S.size * 2) return { warn: true, t: `צריך לפחות ${S.size * 2} שחקנים מגיעים כדי לחלק לקבוצות של ${S.size}.`, ok: false };
  let t = `${n} מגיעים: ${P.full} קבוצות של ${S.size}`;
  if (P.wait) t += ` + קבוצה מזמינה של ${P.wait}`;
  if (P.short) return { warn: true, t: `${t}. חסרים ${P.short} שחקנים ל־${S.teams} קבוצות מלאות.`, ok: true };
  if (P.wait >= S.size) return { warn: true, t: `${t}. יש מספיק שחקנים לקבוצה נוספת.`, ok: true };
  return { warn: false, t, ok: true };
}

function splitView() {
  const S = M.S;
  const pt = planText();
  let h = `<div class="field"><label>מספר קבוצות<small>בין 3 ל־10</small></label><div class="stepper"><button data-step="teams" data-d="-1" aria-label="פחות קבוצות" ${S.teams <= LIMITS.teams[0] ? 'disabled' : ''}>−</button><output class="num">${S.teams}</output><button data-step="teams" data-d="1" aria-label="יותר קבוצות" ${S.teams >= LIMITS.teams[1] ? 'disabled' : ''}>+</button></div></div>
  <div class="field"><label>שחקנים בכל קבוצה</label><div class="stepper"><button data-step="size" data-d="-1" aria-label="פחות שחקנים" ${S.size <= LIMITS.size[0] ? 'disabled' : ''}>−</button><output class="num">${S.size}</output><button data-step="size" data-d="1" aria-label="יותר שחקנים" ${S.size >= LIMITS.size[1] ? 'disabled' : ''}>+</button></div></div>
  <div class="plan ${pt.warn ? 'warn' : ''}">${pt.t}</div>`;
  if (S.result) {
    const fullCount = S.result.teams.filter((t) => !t.waiting).length;
    if (S.result.draw) {
      if (!S.game) S.game = newGame(S.dur || 8);
      h += drawHtml(S, { revealed: M.drawn, redraw: !S.game.started && (S.result.draw.n || 1) === 1 }) + clockHtml(S, true);
    } else if (fullCount >= 2) h += '<button class="btn hi draw-cta" data-act="draw">הגרל מי משחק ראשון</button>';
    h += teamsHtml(S, { ratings: true, dealt: M.dealt }) + `<p class="fair">הפרש הממוצע בין הקבוצות המלאות: <b class="num">${S.result.spread.toFixed(1)}</b></p>`;
  }
  h += `<div class="bar"><div class="in">${S.result ? '<button class="btn ghost" data-tab="links">שלח לשחקנים</button>' : ''}<button class="btn" data-act="deal" ${pt.ok ? '' : 'disabled'}>${S.result ? 'חלק מחדש' : 'חלק קבוצות'}</button></div></div>`;
  return h;
}

function linksView() {
  const origin = location.origin;
  const viewUrl = `${origin}/v/${M.code}${demoQ}`;
  const adminUrl = `${origin}/m/${M.id}${demoQ}#${M.secret}`;
  const wa = 'https://wa.me/?text=' + encodeURIComponent(`הקבוצות של ${M.name}:\n${viewUrl}`);
  return `<section class="linkbox">
      <h2>קישור לשחקנים</h2>
      <p>רואים את הקבוצות, מי משחק עכשיו, התור והשעון. בלי דירוגים.</p>
      <input type="text" readonly value="${esc(viewUrl)}" aria-label="קישור לשחקנים" id="viewUrl">
      <div class="row"><button class="btn hi" data-copy="${esc(viewUrl)}">העתק קישור</button><a class="btn ghost" href="${esc(wa)}" target="_blank" rel="noopener">שלח בוואטסאפ</a></div>
    </section>
    <section class="linkbox private">
      <h2>קישור הניהול שלך</h2>
      <p>מי שמחזיק בקישור הזה יכול לערוך הכול, כולל דירוגים. שמור אותו לעצמך כדי לנהל מכל מכשיר.</p>
      <input type="text" readonly value="${esc(adminUrl)}" aria-label="קישור ניהול" id="adminUrl">
      <div class="row"><button class="btn ghost" data-copy="${esc(adminUrl)}">העתק קישור ניהול</button></div>
    </section>
    <form class="add rename" id="renameForm" autocomplete="off">
      <label for="renameInput" class="lbl">שם הקבוצה</label>
      <input type="text" id="renameInput" value="${esc(M.name)}" maxlength="60" required>
      <button class="btn" type="submit">שמור</button>
    </form>`;
}

/* ---------- draw animation ---------- */
function runDraw() {
  if (M.rolling) return;
  const S = M.S;
  const final = makeDraw(S.result);
  S.game = newGame(S.dur || 8);
  const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce || !S.result.draw) { S.result.draw = final; M.drawn = true; persist(); renderManager(); if (reduce) return; }
  M.rolling = true;
  const full = S.result.teams.map((x, i) => i).filter((i) => !S.result.teams[i].waiting);
  const sides = document.querySelectorAll('#match .side');
  let ticks = 0;
  const iv = setInterval(() => {
    const p = shuffle(full);
    [0, 1].forEach((k) => { const b = bib(S.result.teams[p[k]].bib); sides[k].style.cssText = bibStyle(b); sides[k].textContent = b.name; });
    if (++ticks >= 14) {
      clearInterval(iv);
      M.rolling = false;
      S.result.draw = final;
      M.drawn = true;
      persist();
      renderManager();
    }
  }, 80);
}

/* ---------- match clock actions ---------- */
function gameAction(a, arg) {
  const S = M.S;
  if (!S.game) S.game = newGame(S.dur || 8);
  const g = S.game;
  if (a === 'dur') { S.dur = clamp((S.dur || 8) + +arg, LIMITS.minutes); S.game = newGame(S.dur); return; }
  if (a === 'start' || a === 'resume') {
    unlockAudio();
    Object.assign(g, { started: true, running: true, over: false, endAt: serverNow() + g.remaining });
    keepAwake(true); return;
  }
  if (a === 'pause') { g.remaining = leftOf(g); g.running = false; keepAwake(false); return; }
  if (a === 'reset') { S.game = newGame(g.dur); keepAwake(false); return; }
  if (a === 'extra') {
    if (g.running) g.endAt += MIN; else g.remaining += MIN;
    g.extra++;
    if (g.over) Object.assign(g, { over: false, started: true, running: true, endAt: serverNow() + g.remaining });
    return;
  }
  if (a === 'tie') {
    const next = applyTie(S.result.draw);
    if (!next) { g.pens = true; return; }
    S.result.draw = next; S.game = newGame(g.dur); keepAwake(false); return;
  }
  if (a === 'win') { S.result.draw = applyWin(S.result.draw, +arg); S.game = newGame(g.dur); keepAwake(false); }
}

function managerTick() {
  const S = M.S;
  const g = S && S.game;
  if (!g || !g.running) return;
  const ms = leftOf(g);
  const el = document.getElementById('clockTime');
  if (el) el.textContent = fmt(ms);
  if (ms <= 0) {
    Object.assign(g, { running: false, remaining: 0, over: true });
    whistle(); keepAwake(false); persist();
    if (M.tab === 'split') renderManager();
  }
}

/* ---------- manager events ---------- */
function bindManager() {
  document.addEventListener('click', (e) => {
    const t = e.target.closest('button');
    if (!t || M.rolling) return;
    const d = t.dataset;
    const S = M.S;
    if (d.act === 'reload') { location.reload(); return; }
    if (d.copy) { copy(d.copy); return; }
    if (d.del) {
      if (M.pendingDel === d.del) {
        S.players = S.players.filter((p) => p.id !== d.del);
        M.pendingDel = null; S.result = null; S.game = null; persist();
      } else M.pendingDel = d.del;
      renderManager(); return;
    }
    M.pendingDel = null;
    if (d.act === 'draw') { runDraw(); return; }
    let changed = true;
    if (d.tab) { M.tab = d.tab; store('tab', d.tab); window.scrollTo(0, 0); changed = false; }
    else if (d.rate) { const p = S.players.find((x) => x.id === d.rate); p.rating = clamp(p.rating + +d.d, LIMITS.rating); }
    else if (d.newpos) { M.newPos = d.newpos; changed = false; }
    else if (d.newrate) { M.newRate = clamp(M.newRate + +d.newrate, LIMITS.rating); changed = false; }
    else if (d.step) { S[d.step] = clamp(S[d.step] + +d.d, LIMITS[d.step]); }
    else if (d.act === 'deal') { S.result = balance(here(), S.teams, S.size); S.game = null; M.dealt = true; }
    else if (d.act && d.act.startsWith('g-')) gameAction(d.act.slice(2), d.arg);
    else return;
    if (changed) persist();
    renderManager();
  });
  document.addEventListener('change', (e) => {
    const t = e.target;
    const S = M.S;
    if (t.dataset.here) S.players.find((p) => p.id === t.dataset.here).here = t.checked;
    else if (t.dataset.pos) S.players.find((p) => p.id === t.dataset.pos).pos = t.value;
    else return;
    persist(); renderManager();
  });
  document.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (e.target.id === 'addForm') {
      const name = $('#newName').value.trim();
      if (!name) return;
      M.S.players.push({ id: 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), name, rating: M.newRate, pos: M.newPos, here: true });
      persist(); renderManager();
      const f = $('#newName'); if (f) f.focus();
    } else if (e.target.id === 'renameForm') {
      const name = $('#renameInput').value.trim();
      if (!name) return;
      try {
        await saveGroup(M.id, M.secret, M.S, name);
        M.name = name; rememberGroup({ id: M.id, secret: M.secret, name, code: M.code });
        toast('השם נשמר'); renderManager();
      } catch (err) { toast(errText(err), true); }
    }
  });
  setInterval(managerTick, 250);
}

/* =========================================================
   PLAYER VIEW (read only, no ratings)
   ========================================================= */
const V = { code: null, data: null, stamp: null };

async function startPlayer(code) {
  V.code = code;
  $app.innerHTML = '<div class="spinner" role="progressbar" aria-label="טוען"></div>';
  await pollPlayer();
  setInterval(pollPlayer, 3000);
  setInterval(playerTick, 250);
}
async function pollPlayer() {
  try {
    const r = await viewGroup(V.code);
    const stamp = JSON.stringify(r.state) + r.name;
    if (stamp !== V.stamp) { V.stamp = stamp; V.data = r; renderPlayer(); }
  } catch (e) {
    if (!V.data) $app.innerHTML = band({ title: 'Asphalt FC' }) + `<main class="gut"><div class="empty"><h2>לא הצלחתי לפתוח</h2><p>${esc(errText(e))}</p></div></main>`;
  }
}
function renderPlayer() {
  const { name, state } = V.data;
  const S = { players: state.players || [], result: state.result, game: state.game };
  let body;
  if (!S.result) body = '<div class="empty"><h2>עוד אין קבוצות</h2><p>המארגן עדיין לא חילק קבוצות. הן יופיעו כאן ברגע שיחולקו.</p></div>';
  else {
    body = '<h2 class="player-title">הקבוצות להיום</h2>';
    if (S.result.draw) body += drawHtml(S, {}) + (S.game && S.game.started ? clockHtml(S, false) : '');
    body += teamsHtml(S, { ratings: false });
  }
  $app.innerHTML = band({ title: name }) + `<main class="gut">${body}</main>`;
}
function playerTick() {
  const g = V.data && V.data.state.game;
  if (!g || !g.running) return;
  const el = document.getElementById('clockTime');
  const ms = leftOf(g);
  if (el) el.textContent = fmt(ms);
  if (ms <= 0 && !V.overShown) { V.overShown = true; renderPlayer(); }
  if (ms > 0) V.overShown = false;
}

/* =========================================================
   ROUTER
   ========================================================= */
const [, kind, key] = location.pathname.split('/');
if (kind === 'm' && key) { bindManager(); startManager(decodeURIComponent(key)); }
else if (kind === 'v' && key) startPlayer(decodeURIComponent(key));
else home();

