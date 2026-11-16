// Flussmodell: Tiefe, Strömung, Gelände, Standplätze – reine Logik, von Welt und Spiel geteilt

export const LANE_X = 3.4;   // Watspur des Anglers
export const Z_MIN = -56;    // am weitesten stromauf
export const Z_MAX = 2;

export function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function hash(x, y) { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); }
export function vnoise(x, y) {
  const ix = Math.floor(x), iy = Math.floor(y);
  let fx = x - ix, fy = y - iy;
  fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy);
  const a = hash(ix, iy), b = hash(ix + 1, iy), c = hash(ix, iy + 1), d = hash(ix + 1, iy + 1);
  return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
}
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

export function makeRiver(rv) {
  const rnd = mulberry32(rv.seed);
  const halfW = rv.width / 2;

  // Maeander: Mittellinie des Flusses als Funktion von z. Alles Weitere rechnet quer zur Mittellinie (u = x - cx(z)).
  const bend = rv.bend || [3.5, 0.05];
  const rawC = z => bend[0] * Math.sin(z * bend[1] + rv.seed * 0.7) + bend[0] * 0.35 * Math.sin(z * bend[1] * 2.3 + rv.seed * 1.9);
  const c0 = rawC(0);
  const cx = z => rawC(z) - c0;                    // am Einstieg (z = 0) liegt die Mitte bei x = 0
  const dcx = z => cx(z + 0.5) - cx(z - 0.5);      // Steigung dx/dz
  const off = (x, z) => x - cx(z);

  const rocks = [];
  for (let i = 0; i < rv.rocks; i++) {
    const u = -halfW + 1 + rnd() * (halfW * 2 - 2);
    const z = -64 + rnd() * 70;
    const r = 0.35 + rnd() * rv.rockSize;
    if (Math.hypot(u - LANE_X, z) < r + 1.5) continue;
    rocks.push({ x: cx(z) + u, z, r });
  }
  const pools = [];
  for (let i = 0; i < rv.pools; i++) {
    const u = -3.5 + rnd() * 4, z = -54 + rnd() * 48;
    pools.push({ x: cx(z) + u, z, r: 2 + rnd() * 1.5, d: rv.poolDepth * (0.7 + rnd() * 0.5) });
  }
  if (rv.bigPool) pools.push({ ...rv.bigPool, x: cx(rv.bigPool.z) + rv.bigPool.x, big: true });

  const chan = z => Math.sin(z * 0.09 + rv.seed) * 1.6 - 1.0 - Math.max(-1.2, Math.min(1.2, dcx(z) * 5));   // Stromrinne drueckt in die Aussenkurve
  const bankF = u => 1 - smooth(0.55, 1.0, Math.abs(u) / halfW);

  function depthAt(xw, z) {
    const x = xw - cx(z);
    const b = bankF(x);
    if (b <= 0) return 0;
    const c = Math.exp(-(((x - chan(z)) / 2.4) ** 2));
    let d = rv.depth * (0.38 + 0.62 * c);
    for (const p of pools) d += p.d * Math.exp(-((xw - p.x) ** 2 + (z - p.z) ** 2) / (p.r * p.r));
    for (const k of rocks) {
      const dx = xw - k.x, dz = z - (k.z + k.r * 1.9);
      d += 0.3 * Math.exp(-(dx * dx + dz * dz) / (k.r * k.r * 2.2));
    }
    d += (vnoise(xw * 0.9, z * 0.9) - 0.5) * 0.14;
    return Math.max(0, d * b);
  }

  function speedAt(xw, z) {
    const x = xw - cx(z);
    const b = bankF(x);
    const c = Math.exp(-(((x - chan(z)) / 2.4) ** 2));
    let v = rv.speed * (0.4 + 0.6 * c) * (0.3 + 0.7 * b);
    for (const p of pools) v *= 1 - 0.5 * Math.exp(-((xw - p.x) ** 2 + (z - p.z) ** 2) / (p.r * p.r));
    for (const k of rocks) {
      const dx = (xw - k.x) / (k.r * 1.1), dz = (z - (k.z + k.r * 2)) / (k.r * 2.3);
      v *= 1 - 0.78 * Math.exp(-(dx * dx + dz * dz));
    }
    return Math.max(0.06, v);
  }

  // Wasserfaelle: oberhalb der befischbaren Strecke kommt der Fluss ueber zwei Stufen herab. Stromauf davon liegen Bett, Ufer und
  // Wasserspiegel um die Fallhoehe hoeher; die Strecke selbst (z >= Z_MIN) bleibt eben, damit Drift und Drill unveraendert rechnen.
  const fallH = rv.fall !== undefined ? rv.fall : rv.cliff ? 3.4 : Math.min(2.2, Math.max(0.9, 0.6 + rv.speed * 1.1));
  const falls = [{ z: Z_MIN - 12, h: fallH }, { z: Z_MIN - 27, h: fallH * 0.65 }];
  // x: die Kante laeuft nicht schnurgerade quer, sondern springt je nach Stelle bis 0,7 m vor und zurueck
  const lift = (z, sh = 0, x) => { if (x !== undefined) z += (vnoise(x * 0.55, 7.3) - 0.5) * 1.4; let a = 0; for (const f of falls) a += f.h * (1 - smooth(f.z + sh - 0.7, f.z + sh + 0.7, z)); return a; };
  // Seitliche Faelle ueber die Uferwand, nur wo das Ufer hoch genug ist. Eigener Zufall, damit Steine und Standplaetze unveraendert bleiben.
  const sideFalls = [];
  if (rv.bankMax >= 4) {
    const r2 = mulberry32(rv.seed * 13 + 5), z1 = -20 - r2() * 26;
    sideFalls.push({ z: z1, side: -1, w: 0.7 + r2() * 0.5 });                       // gegenueber der Watspur, also immer im Blick
    if (rv.bankMax >= 7) sideFalls.push({ z: z1 < -33 ? z1 + 15 + r2() * 6 : z1 - 15 - r2() * 6, side: r2() < 0.6 ? 1 : -1, w: 0.5 + r2() * 0.4 });
  }

  function heightAt(x, z) {
    const ax = Math.abs(x - cx(z)), lf = z < Z_MIN - 8 ? lift(z, -0.6, x) : 0;   // die Felsstufe liegt knapp hinter dem fallenden Wasser
    if (ax < halfW) return lf - depthAt(x, z);
    const o = ax - halfW;
    let h = rv.bankMax * (1 - Math.exp(-o * rv.bankSlope / rv.bankMax));
    h += (vnoise(x * 0.25 + 9, z * 0.25) - 0.3) * Math.min(o * 0.5, rv.cliff ? 4 : 1.6);
    return lf + Math.max(0.02, h);
  }

  const lies = [];
  const valid = (x, z) => depthAt(x, z) > 0.38 && Math.hypot(x - LANE_X, z) > 3.2 && Math.abs(off(x, z)) < halfW - 0.6 && z > Z_MIN - 4 && z < Z_MAX - 2.5;
  const far = (x, z) => lies.every(l => (l.x - x) ** 2 + (l.z - z) ** 2 > 2.2);
  for (const p of pools) {
    if (p.big) { lies.push({ x: p.x, z: p.z, type: 'Gumpen', big: true }); continue; }
    // Gumpen: Einlauf und Auslauf – frei anwerfbar, kein Stein im Weg
    const x = p.x + 0.4, z = p.z - p.r * 0.2;
    if (valid(x, z) && far(x, z)) lies.push({ x, z, type: 'Gumpen' });
    const x2 = p.x - 0.5, z2 = p.z + p.r * 0.55;
    if (valid(x2, z2) && far(x2, z2)) lies.push({ x: x2, z: z2, type: 'Gumpen' });
  }
  // Steine: nicht immer die Tasche dahinter – auch das Kissen davor und die Strömungskante daneben
  for (const k of rocks) {
    const side = rnd() < 0.5 ? -1 : 1;
    const opts = [
      { x: k.x, z: k.z + k.r * 2.1 + 0.3, type: 'Tasche' },
      { x: k.x + side * 0.15, z: k.z - k.r - 0.75, type: 'Kissen' },
      { x: k.x + side * (k.r + 0.7), z: k.z + k.r * 0.5, type: 'Kante' },
    ];
    const r = rnd(), first = r < 0.3 ? 0 : r < 0.62 ? 1 : 2;
    for (let i = 0; i < 3; i++) {
      const o = opts[(first + i) % 3];
      if (valid(o.x, o.z) && far(o.x, o.z) && rocks.every(q => q === k || Math.hypot(o.x - q.x, o.z - q.z) > q.r + 0.45)) { lies.push({ ...o, rock: true }); break; }
    }
  }
  for (let z = Z_MIN; z < Z_MAX - 4; z += 6) {
    const zz = z + rnd() * 3, x = cx(zz) + chan(zz) + (rnd() < 0.5 ? -1 : 1) * (0.6 + rnd() * 0.9);
    if (valid(x, zz) && far(x, zz)) lies.push({ x, z: zz, type: 'Rinne' });
  }

  return { rv, rocks, pools, lies, halfW, chan, cx, dcx, off, depthAt, speedAt, heightAt, falls, lift, sideFalls };
}
