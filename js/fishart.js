// Prozedurale 2D-Fischporträts für Fangbild und Fangbuch
import { mulberry32 } from './river.js';

const LOOK = {
  bachforelle: { back: '#5a4a22', side: '#c9a544', belly: '#f2e2a8', fin: '#b98a3a',
    spots: [{ c: '#1d1a14', n: 64, r: 0.011, halo: 'rgba(255,240,200,.45)' }, { c: '#d43a1e', n: 18, r: 0.009, halo: 'rgba(255,240,220,.7)', band: [0.4, 0.75] }] },
  regenbogen: { back: '#4a5f52', side: '#c8d0cc', belly: '#f4f4f0', fin: '#a8a89a', stripe: 'rgba(226,84,120,.6)',
    spots: [{ c: '#17191a', n: 110, r: 0.009, tail: true }] },
  aesche: { back: '#56606a', side: '#aeb8bd', belly: '#eef0ee', fin: '#8a6a8a', dorsalBig: true, scales: true,
    spots: [{ c: '#22262a', n: 12, r: 0.009, front: true }] },
  saibling: { back: '#2d4630', side: '#6a7a48', belly: '#e88a3a', fin: '#d8552a', whiteEdge: true, worm: true,
    spots: [{ c: '#e8e0a0', n: 50, r: 0.013 }, { c: '#e0402a', n: 12, r: 0.01, halo: 'rgba(120,170,255,.9)', band: [0.45, 0.8] }] },
  barbe: { back: '#5e5630', side: '#b89e58', belly: '#f0e4b8', fin: '#c8643a', scales: true, barbel: true, slim: true, spots: [] },
  marmorata: { back: '#4c5136', side: '#a9a37a', belly: '#ece4c4', fin: '#8e8a62', marble: true, bigHead: true, spots: [] },
  seeforelle: { back: '#3f4c58', side: '#b9c4cb', belly: '#f4f5f3', fin: '#8f9aa0',
    spots: [{ c: '#15181b', n: 70, r: 0.01 }] },
  huchen: { back: '#5a3f33', side: '#b98468', belly: '#efe2d6', fin: '#a8644a', slim: true, bigHead: true,
    spots: [{ c: '#1c1512', n: 90, r: 0.007 }] },
};

function bodyPath(c, L, H, o) {
  const top = o.slim ? 0.36 : 0.4, bot = o.slim ? 0.33 : 0.42;
  c.beginPath();
  c.moveTo(0.03 * L, 0);
  c.bezierCurveTo(0.1 * L, -top * H * 0.9, 0.3 * L, -top * H * 1.15, 0.5 * L, -top * H);
  c.bezierCurveTo(0.68 * L, -top * H * 0.85, 0.8 * L, -0.13 * H, 0.86 * L, -0.1 * H);
  c.lineTo(0.86 * L, 0.1 * H);
  c.bezierCurveTo(0.8 * L, 0.13 * H, 0.66 * L, bot * H * 0.85, 0.46 * L, bot * H);
  c.bezierCurveTo(0.28 * L, bot * H * 1.1, 0.1 * L, bot * H * 0.8, 0.03 * L, 0.06 * H);
  c.closePath();
}

export function drawFish(cv, species, opts = {}) {
  const o = LOOK[species] || LOOK.bachforelle;
  const c = cv.getContext('2d'), W = cv.width, Hh = cv.height;
  c.clearRect(0, 0, W, Hh);
  const L = W * 0.92, H = Math.min(Hh * 0.8, L * 0.29);
  const rnd = mulberry32(opts.seed || species.length * 97 + 5);
  c.save();
  c.translate(W * 0.04, Hh * 0.52);
  if (opts.silhouette) {
    bodyPath(c, L, H, o); c.fillStyle = 'rgba(40,50,45,.35)'; c.fill();
    c.beginPath(); c.moveTo(0.85 * L, 0); c.lineTo(0.99 * L, -0.3 * H); c.lineTo(0.95 * L, 0); c.lineTo(0.99 * L, 0.3 * H); c.closePath(); c.fill();
    c.restore(); return;
  }
  const fin = (pts, col) => { c.beginPath(); c.moveTo(pts[0] * L, pts[1] * H); for (let i = 2; i < pts.length; i += 2) c.lineTo(pts[i] * L, pts[i + 1] * H); c.closePath(); c.fillStyle = col; c.fill(); c.strokeStyle = 'rgba(0,0,0,.25)'; c.lineWidth = 1; c.stroke(); };
  // Schwanz
  c.beginPath(); c.moveTo(0.84 * L, -0.09 * H); c.quadraticCurveTo(0.93 * L, -0.2 * H, 0.995 * L, -0.34 * H);
  c.quadraticCurveTo(0.955 * L, 0, 0.995 * L, 0.34 * H); c.quadraticCurveTo(0.93 * L, 0.2 * H, 0.84 * L, 0.09 * H); c.closePath();
  c.fillStyle = o.fin; c.fill(); c.strokeStyle = 'rgba(0,0,0,.25)'; c.stroke();
  // Flossen
  if (o.dorsalBig) {
    c.beginPath(); c.moveTo(0.33 * L, -0.4 * H); c.bezierCurveTo(0.36 * L, -0.95 * H, 0.56 * L, -1.0 * H, 0.66 * L, -0.62 * H); c.lineTo(0.62 * L, -0.32 * H); c.closePath();
    const g = c.createLinearGradient(0, -H, 0, -0.3 * H); g.addColorStop(0, '#b0406a'); g.addColorStop(0.6, '#7a5a9a'); g.addColorStop(1, '#5a6a7a');
    c.fillStyle = g; c.fill(); c.strokeStyle = 'rgba(0,0,0,.3)'; c.stroke();
    c.fillStyle = 'rgba(40,20,60,.55)';
    for (let i = 0; i < 16; i++) { c.beginPath(); c.ellipse((0.38 + rnd() * 0.24) * L, (-0.45 - rnd() * 0.4) * H, 0.012 * L, 0.02 * H, 0, 0, 7); c.fill(); }
  } else fin([0.4, -0.4, 0.45, -0.68, 0.56, -0.6, 0.57, -0.36], o.fin);
  fin([0.7, -0.2, 0.73, -0.33, 0.77, -0.17], o.fin);                       // Fettflosse
  const edge = o.whiteEdge ? '#f8f8f0' : null;
  const lowFin = pts => { fin(pts, o.fin); if (edge) { c.beginPath(); c.moveTo(pts[0] * L, pts[1] * H); c.lineTo(pts[2] * L, pts[3] * H); c.strokeStyle = edge; c.lineWidth = Math.max(2, H * 0.035); c.stroke(); } };
  lowFin([0.2, 0.3, 0.22, 0.62, 0.31, 0.5, 0.29, 0.34]);
  lowFin([0.47, 0.4, 0.5, 0.68, 0.57, 0.55, 0.55, 0.36]);
  lowFin([0.68, 0.25, 0.71, 0.48, 0.77, 0.36, 0.75, 0.17]);
  // Körper
  bodyPath(c, L, H, o);
  const g = c.createLinearGradient(0, -0.45 * H, 0, 0.45 * H);
  g.addColorStop(0, o.back); g.addColorStop(0.45, o.side); g.addColorStop(0.72, o.side); g.addColorStop(1, o.belly);
  c.fillStyle = g; c.fill();
  c.save(); bodyPath(c, L, H, o); c.clip();
  if (o.stripe) { const s = c.createLinearGradient(0, -0.1 * H, 0, 0.14 * H); s.addColorStop(0, 'rgba(0,0,0,0)'); s.addColorStop(0.5, o.stripe); s.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = s; c.fillRect(0.05 * L, -0.1 * H, 0.82 * L, 0.24 * H); }
  if (o.scales) { c.strokeStyle = 'rgba(0,0,0,.13)'; c.lineWidth = 1; for (let x = 0.2; x < 0.86; x += 0.028) for (let y = -0.36; y < 0.36; y += 0.1) { c.beginPath(); c.arc((x + (Math.round(y * 10) % 2) * 0.014) * L, y * H, 0.016 * L, -1.2, 1.2); c.stroke(); } }
  if (o.marble || o.worm) {
    c.strokeStyle = o.marble ? 'rgba(42,46,28,.75)' : 'rgba(200,205,130,.5)'; c.lineWidth = Math.max(1.5, H * (o.marble ? 0.05 : 0.03)); c.lineCap = 'round';
    const n = o.marble ? 70 : 22;
    for (let i = 0; i < n; i++) {
      let x = (0.04 + rnd() * 0.8) * L, y = (o.marble ? -0.4 + rnd() * 0.62 : -0.42 + rnd() * 0.2) * H, a = rnd() * 6.3;
      c.beginPath(); c.moveTo(x, y);
      for (let k = 0; k < 5; k++) { a += (rnd() - 0.5) * 2.4; x += Math.cos(a) * 0.022 * L; y += Math.sin(a) * 0.06 * H; c.lineTo(x, y); }
      c.stroke();
    }
  }
  for (const s of o.spots) for (let i = 0; i < s.n; i++) {
    let x = (s.front ? 0.2 + rnd() * 0.25 : 0.18 + rnd() * (s.tail ? 0.8 : 0.66)) * L;
    let y = (s.band ? -0.5 + s.band[0] + rnd() * (s.band[1] - s.band[0]) : -0.38 + rnd() * 0.48) * H * (s.band ? 0.8 : 1);
    const r = s.r * L * (0.7 + rnd() * 0.6);
    if (s.halo) { c.beginPath(); c.arc(x, y, r * 1.7, 0, 7); c.fillStyle = s.halo; c.fill(); }
    c.beginPath(); c.arc(x, y, r, 0, 7); c.fillStyle = s.c; c.fill();
  }
  const sh = c.createLinearGradient(0, -0.4 * H, 0, 0); sh.addColorStop(0, 'rgba(255,255,255,0)'); sh.addColorStop(0.6, 'rgba(255,255,255,.16)'); sh.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = sh; c.fillRect(0, -0.4 * H, L, 0.4 * H);
  c.restore();
  bodyPath(c, L, H, o); c.strokeStyle = 'rgba(0,0,0,.35)'; c.lineWidth = 1.5; c.stroke();
  // Kopf
  const hx = o.bigHead ? 0.24 : 0.2;
  c.beginPath(); c.moveTo(hx * L, -0.33 * H); c.quadraticCurveTo((hx + 0.035) * L, 0, hx * L, 0.3 * H); c.strokeStyle = 'rgba(0,0,0,.3)'; c.stroke();
  c.beginPath(); c.moveTo(0.032 * L, 0.03 * H); c.lineTo((o.bigHead ? 0.12 : 0.09) * L, 0.07 * H); c.stroke();
  c.beginPath(); c.arc(0.1 * L, -0.1 * H, 0.045 * H + 2, 0, 7); c.fillStyle = '#e8c860'; c.fill();
  c.beginPath(); c.arc(0.1 * L, -0.1 * H, 0.026 * H + 1, 0, 7); c.fillStyle = '#111'; c.fill();
  if (o.barbel) { c.strokeStyle = '#8a7040'; c.lineWidth = 2; c.beginPath(); c.moveTo(0.04 * L, 0.06 * H); c.quadraticCurveTo(0.03 * L, 0.2 * H, 0.055 * L, 0.24 * H); c.moveTo(0.06 * L, 0.1 * H); c.quadraticCurveTo(0.06 * L, 0.24 * H, 0.085 * L, 0.27 * H); c.stroke(); }
  c.restore();
}

// kleine Fliegen-Vignette
export function drawFly(cv, fly) {
  const c = cv.getContext('2d'), W = cv.width, H = cv.height;
  c.clearRect(0, 0, W, H);
  c.save(); c.translate(W / 2, H / 2); c.scale(W / 100, W / 100);
  if (fly.dry) {   // Trockenfliege: Haken, Koerper, Hechelkranz, Fluegel, Schwanzfibern
    c.lineCap = 'round'; c.strokeStyle = '#2a2a2a'; c.lineWidth = 3;
    c.beginPath(); c.moveTo(-24, 2); c.lineTo(16, 2); c.arc(16, 15, 13, -Math.PI / 2, Math.PI * 0.75); c.stroke();
    c.strokeStyle = fly.col; c.lineWidth = 9; c.beginPath(); c.moveTo(-10, 2); c.lineTo(20, 2); c.stroke();
    c.lineWidth = 1.4; c.beginPath(); for (const a of [-0.25, 0, 0.25]) { c.moveTo(22, 2); c.lineTo(42, 2 + a * 30); } c.stroke();
    c.strokeStyle = fly.id === 'wulff' || fly.id === 'adams' ? '#6a4a2a' : '#8a6a3a'; c.lineWidth = 1.3;
    c.beginPath(); for (let i = 0; i < 22; i++) { const a = i / 22 * 6.283; c.moveTo(-14, 2); c.lineTo(-14 + Math.cos(a) * 7, 2 + Math.sin(a) * 19); } c.stroke();
    c.fillStyle = fly.id === 'elk' || fly.id === 'stimu' ? '#d8c08a' : '#f4f4f0';
    c.beginPath(); if (fly.id === 'elk' || fly.id === 'stimu') { c.moveTo(-18, -2); c.quadraticCurveTo(6, -24, 30, -8); c.quadraticCurveTo(8, -6, -18, -2); } else { c.moveTo(-16, -2); c.lineTo(-22, -30); c.lineTo(-8, -30); c.closePath(); } c.fill();
    c.restore(); return;
  }
  c.strokeStyle = '#2a2a2a'; c.lineWidth = 3; c.lineCap = 'round';
  c.beginPath(); c.moveTo(-26, -6); c.lineTo(18, -6); c.arc(18, 8, 14, -Math.PI / 2, Math.PI * 0.75); c.stroke();
  c.beginPath(); c.moveTo(-12, -6); c.lineTo(22, -6);
  c.strokeStyle = fly.col; c.lineWidth = fly.id === 'perdigon' ? 9 : 13; c.stroke();
  if (fly.id === 'squirmy') { c.strokeStyle = fly.col; c.lineWidth = 5; c.beginPath(); c.moveTo(-40, 6); c.quadraticCurveTo(-20, -24, 0, -6); c.quadraticCurveTo(24, 10, 44, -14); c.stroke(); }
  if (fly.id === 'stone') { c.strokeStyle = '#1a1208'; c.lineWidth = 2; for (const x of [-4, 6, 16]) { c.beginPath(); c.moveTo(x, -2); c.lineTo(x - 6, 14); c.moveTo(x, -10); c.lineTo(x + 4, -22); c.stroke(); } }
  if (fly.id === 'walt' || fly.id === 'caddis') { c.strokeStyle = fly.col; c.lineWidth = 1.5; for (let i = 0; i < 14; i++) { const x = -10 + i * 2.4; c.beginPath(); c.moveTo(x, -6); c.lineTo(x + (i % 2 ? 3 : -3), i % 2 ? 6 : -17); c.stroke(); } }
  if (fly.id === 'pt' || fly.id === 'frenchie' || fly.id === 'redtag') { c.strokeStyle = fly.id === 'redtag' ? '#e02020' : fly.col; c.lineWidth = fly.id === 'redtag' ? 4 : 1.5; c.beginPath(); c.moveTo(22, -6); c.lineTo(36, -12); c.moveTo(22, -6); c.lineTo(36, -3); c.stroke(); }
  if (fly.hot && fly.id !== 'redtag') { c.fillStyle = fly.hot; c.fillRect(-14, -12, 6, 12); }
  c.beginPath(); c.arc(-20, -6, 8.5, 0, 7); c.fillStyle = fly.bead; c.fill();
  c.beginPath(); c.arc(-22, -9, 2.5, 0, 7); c.fillStyle = 'rgba(255,255,255,.7)'; c.fill();
  c.restore();
}
