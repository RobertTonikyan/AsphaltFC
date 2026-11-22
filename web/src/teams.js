// Team building: bibs, positions, fair split and the opening draw.

export const BIBS = [
  { id: 'orange', name: 'כתומה', c: '#ff6a1a', ink: '#1d0b00' },
  { id: 'yellow', name: 'צהובה', c: '#ffd23f', ink: '#1d1600' },
  { id: 'blue', name: 'כחולה', c: '#1f4fff', ink: '#ffffff' },
  { id: 'red', name: 'אדומה', c: '#e0193a', ink: '#ffffff' },
  { id: 'white', name: 'לבנה', c: '#ffffff', ink: '#0c0f30' },
  { id: 'black', name: 'שחורה', c: '#15151c', ink: '#ffffff' },
  { id: 'lime', name: 'ירוקה', c: '#8be04e', ink: '#0d1a00' },
  { id: 'pink', name: 'ורודה', c: '#ff4fa3', ink: '#24000f' },
  { id: 'purple', name: 'סגולה', c: '#7b3ff2', ink: '#ffffff' },
  { id: 'sky', name: 'תכלת', c: '#3cc8f5', ink: '#001a24' },
];

export const POS = { gk: 'שוער', mid: 'אמצע', att: 'התקפה' };

export const LIMITS = { teams: [3, 10], size: [2, 11], rating: [1, 10], minutes: [1, 30] };

export const bib = (id) => BIBS.find((b) => b.id === id) || BIBS[0];
export const bibStyle = (b) => `--bib:${b.c};--bib-ink:${b.ink}`;

/** How n players fit into T teams of `size`: full teams, leftover (waiting team) and shortfall. */
export function plan(n, T, size) {
  if (n >= T * size) return { full: T, wait: n - T * size, short: 0 };
  const full = Math.floor(n / size);
  return { full, wait: n - full * size, short: T * size - n };
}

const avg = (t) => (t.ps.length ? t.ps.reduce((a, p) => a + p.rating, 0) / t.ps.length : 0);

/**
 * Splits players into balanced teams.
 * Goalkeepers are spread first (one per full team), then everyone else is placed greedily
 * by rating with a penalty for stacking one position, and finally same-position swaps
 * reduce the variance of team averages. Small noise makes every reshuffle different.
 */
export function balance(players, T, size, rand = Math.random) {
  const P = plan(players.length, T, size);
  const caps = Array(P.full).fill(size);
  if (P.wait > 0) caps.push(P.wait);
  const teams = caps.map((c) => ({ cap: c, ps: [], sum: 0 }));
  const noisy = (p) => p.rating + (rand() - 0.5) * 0.9;
  const load = (t) => t.sum / t.cap;
  const fullIdx = teams.map((t, i) => i).filter((i) => i < P.full);
  const allIdx = teams.map((t, i) => i);
  const hasGk = (t) => t.ps.some((p) => p.pos === 'gk');

  const extraGk = [];
  players
    .filter((p) => p.pos === 'gk')
    .sort((a, b) => noisy(b) - noisy(a))
    .forEach((g) => {
      let open = fullIdx.filter((i) => !hasGk(teams[i])).sort((a, b) => load(teams[a]) - load(teams[b]));
      if (!open.length) open = allIdx.filter((i) => teams[i].ps.length < teams[i].cap && !hasGk(teams[i]));
      if (open.length) {
        const t = teams[open[0]];
        t.ps.push(g);
        t.sum += g.rating;
      } else extraGk.push(g);
    });

  players
    .filter((p) => p.pos !== 'gk')
    .concat(extraGk)
    .map((p) => ({ p, k: noisy(p) }))
    .sort((a, b) => b.k - a.k)
    .forEach(({ p }) => {
      let best = null;
      let bestScore = Infinity;
      for (const t of teams) {
        if (t.ps.length >= t.cap) continue;
        const same = t.ps.filter((q) => q.pos === p.pos).length;
        const score = t.sum / t.cap + same * 0.8 + rand() * 0.05;
        if (score < bestScore) { bestScore = score; best = t; }
      }
      best.ps.push(p);
      best.sum += p.rating;
    });

  const variance = () => {
    const a = teams.map(avg);
    const m = a.reduce((x, y) => x + y, 0) / a.length;
    return a.reduce((s, v) => s + (v - m) ** 2, 0);
  };
  for (let iter = 0; iter < 300; iter++) {
    let bestGain = 1e-9;
    let move = null;
    const base = variance();
    for (let i = 0; i < teams.length; i++) {
      for (let j = i + 1; j < teams.length; j++) {
        for (let x = 0; x < teams[i].ps.length; x++) {
          for (let y = 0; y < teams[j].ps.length; y++) {
            const a = teams[i].ps[x];
            const b = teams[j].ps[y];
            if (a.pos !== b.pos || a.rating === b.rating) continue;
            teams[i].ps[x] = b; teams[j].ps[y] = a;
            const gain = base - variance();
            teams[i].ps[x] = a; teams[j].ps[y] = b;
            if (gain > bestGain) { bestGain = gain; move = [i, x, j, y]; }
          }
        }
      }
    }
    if (!move) break;
    const [i, x, j, y] = move;
    [teams[i].ps[x], teams[j].ps[y]] = [teams[j].ps[y], teams[i].ps[x]];
  }

  const order = { gk: 0, mid: 1, att: 2 };
  const out = teams.map((t, i) => ({
    bib: BIBS[i].id,
    waiting: i >= P.full,
    ids: t.ps.sort((a, b) => order[a.pos] - order[b.pos] || b.rating - a.rating).map((p) => p.id),
  }));
  const fullAvgs = teams.filter((t, i) => i < P.full).map(avg);
  return { teams: out, spread: fullAvgs.length > 1 ? Math.max(...fullAvgs) - Math.min(...fullAvgs) : 0, size };
}

export function shuffle(a, rand = Math.random) {
  a = a.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Draws two full teams to open; the other full teams queue in random order, the waiting team last. */
export function makeDraw(result, rand = Math.random) {
  const t = result.teams;
  const full = shuffle(t.map((x, i) => i).filter((i) => !t[i].waiting), rand);
  const wait = t.map((x, i) => i).filter((i) => t[i].waiting);
  return { first: [full[0], full[1]], queue: full.slice(2).concat(wait), n: 1 };
}

/** Winner stays, loser goes to the back, next team comes on. */
export function applyWin(draw, winner) {
  const d = structuredClone(draw);
  const loser = d.first.find((i) => i !== winner);
  if (d.queue.length) {
    const next = d.queue.shift();
    d.queue.push(loser);
    d.first = [winner, next];
  }
  d.n = (d.n || 1) + 1;
  return d;
}

/**
 * A draw: with exactly one team waiting it goes to penalties (returns null, caller asks for the
 * shootout winner); with two or more waiting both drawn teams go to the back and the next two come on.
 */
export function applyTie(draw) {
  const d = structuredClone(draw);
  if (d.queue.length === 1) return null;
  if (d.queue.length >= 2) {
    const [x, y] = d.first;
    d.first = [d.queue.shift(), d.queue.shift()];
    d.queue.push(x, y);
  }
  d.n = (d.n || 1) + 1;
  return d;
}
