// Team balancing for Tiko.
// players: [{id, rating (1-10, null = 5), pos: 'D' | 'A' | 'B'}]
// opts: {captains: [id...] (one per team), sizes: [n...] (one per team), restarts, rng}
// Returns up to `keep` distinct best splits: [{teams: [[id...]...], score}]

const POS_WEIGHT = 3;

function rate(p) {
  return p.rating == null ? 5 : p.rating;
}

function posD(p) { return p.pos === 'D' ? 1 : p.pos === 'B' ? 0.5 : 0; }
function posA(p) { return p.pos === 'A' ? 1 : p.pos === 'B' ? 0.5 : 0; }

export function scoreTeams(teams, byId, sizes) {
  const base = Math.min(...sizes);
  let minS = Infinity, maxS = -Infinity, minD = Infinity, maxD = -Infinity, minA = Infinity, maxA = -Infinity;
  teams.forEach((t) => {
    let s = 0, d = 0, a = 0;
    t.forEach((id) => { const p = byId[id]; s += rate(p); d += posD(p); a += posA(p); });
    // Normalise larger teams (substitutes) to the base size so a 6th man doesn't skew the comparison.
    const k = t.length ? base / t.length : 1;
    s *= k; d *= k; a *= k;
    minS = Math.min(minS, s); maxS = Math.max(maxS, s);
    minD = Math.min(minD, d); maxD = Math.max(maxD, d);
    minA = Math.min(minA, a); maxA = Math.max(maxA, a);
  });
  return (maxS - minS) + POS_WEIGHT * ((maxD - minD) + (maxA - minA));
}

function shuffle(arr, rng) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function oneRun(players, byId, captains, sizes, rng) {
  const T = sizes.length;
  const teams = sizes.map(() => []);
  const capSet = new Set(captains);
  captains.forEach((c, i) => teams[i].push(c));
  const sums = teams.map((t) => t.reduce((s, id) => s + rate(byId[id]), 0));
  // Random order among equal ratings, then strongest first.
  const rest = shuffle(players.filter((p) => !capSet.has(p.id)), rng)
    .sort((a, b) => rate(b) - rate(a));
  rest.forEach((p) => {
    let best = -1;
    for (let i = 0; i < T; i++) {
      if (teams[i].length >= sizes[i]) continue;
      if (best < 0 || sums[i] / sizes[i] < sums[best] / sizes[best]) best = i;
    }
    teams[best].push(p.id);
    sums[best] += rate(p);
  });

  // Local search: swap any two non-captains across teams while the score drops.
  let score = scoreTeams(teams, byId, sizes);
  let improved = true;
  let guard = 0;
  while (improved && guard++ < 200) {
    improved = false;
    for (let i = 0; i < T; i++) {
      for (let j = i + 1; j < T; j++) {
        for (let x = 0; x < teams[i].length; x++) {
          if (capSet.has(teams[i][x])) continue;
          for (let y = 0; y < teams[j].length; y++) {
            if (capSet.has(teams[j][y])) continue;
            const a = teams[i][x], b = teams[j][y];
            teams[i][x] = b; teams[j][y] = a;
            const s = scoreTeams(teams, byId, sizes);
            if (s < score - 1e-9) { score = s; improved = true; }
            else { teams[i][x] = a; teams[j][y] = b; }
          }
        }
      }
    }
  }
  return { teams, score };
}

function signature(teams) {
  return teams.map((t) => [...t].sort().join(',')).sort().join('|');
}

export function balance(players, { captains, sizes, restarts = 150, keep = 12, rng = Math.random }) {
  const byId = Object.fromEntries(players.map((p) => [p.id, p]));
  const runs = [];
  for (let r = 0; r < restarts; r++) runs.push(oneRun(players, byId, captains, sizes, rng));
  const best = Math.min(...runs.map((r) => r.score));
  const seen = new Set();
  const out = [];
  runs
    .filter((r) => r.score <= best + 1e-6)
    .forEach((r) => {
      const sig = signature(r.teams);
      if (seen.has(sig) || out.length >= keep) return;
      seen.add(sig);
      out.push(r);
    });
  return out;
}

export function teamTotal(ids, byId) {
  return ids.reduce((s, id) => s + rate(byId[id]), 0);
}

export function suggestCaptains(players, T) {
  return [...players].sort((a, b) => rate(b) - rate(a)).slice(0, T).map((p) => p.id);
}
