// 3D-Welt v2: realistischeres Wasser, Licht & Schatten, Vegetation, Felsen, Berge, Angler, Fische
import * as THREE from './three.module.min.js';
import { makeRiver, mulberry32, vnoise, LANE_X } from './river.js';
import { LOOK as FISH_LOOK } from './fishart.js';
import { Fauna } from './fauna.js';

const UP = new THREE.Vector3(0, 1, 0);
const _d = new THREE.Vector3(), _a = new THREE.Vector3(), _b = new THREE.Vector3();
const _q4 = new THREE.Quaternion(), _q5 = new THREE.Quaternion();
const _rl0 = new THREE.Vector3(), _rl1 = new THREE.Vector3(), _rl2 = new THREE.Vector3();
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const _q1 = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _q3 = new THREE.Quaternion(), _v1 = new THREE.Vector3(), _v2 = new THREE.Vector3(), _XA = new THREE.Vector3(1, 0, 0);
// Knochen aus der Ruhehaltung heraus um eine Welt-Achse drehen (relativ zum aktuell gestellten Elternknochen)
// Wie boneSwing, aber mit einer fertigen Drehung - fuer Gelenke, die sich um mehr als
// eine Achse bewegen muessen (ein Arm, der aus der T-Haltung herunter und nach vorn geht).
function boneTurn(b, q) {
  b.parent.getWorldQuaternion(_q1);
  _q2.copy(q).multiply(_q1).multiply(b.userData.rq);
  b.quaternion.copy(_q1.invert()).multiply(_q2);
  b.updateMatrixWorld(true);
}
function boneSwing(b, axisW, ang) {
  b.parent.getWorldQuaternion(_q1);
  _q2.setFromAxisAngle(axisW, ang).multiply(_q1).multiply(b.userData.rq);
  b.quaternion.copy(_q1.invert()).multiply(_q2);
  b.updateMatrixWorld(true);
}
// Knochen (Laengsachse = lokales +x) auf eine Welt-Richtung ausrichten, mit kuerzestem Weg aus der Ruhehaltung
function boneAim(b, dirW) {
  b.parent.getWorldQuaternion(_q1);
  _q2.copy(_q1).multiply(b.userData.rq);
  _v1.copy(_XA).applyQuaternion(_q2);
  _q3.setFromUnitVectors(_v1, _v2.copy(dirW).normalize()).multiply(_q2);
  b.quaternion.copy(_q1.invert()).multiply(_q3);
  b.updateMatrixWorld(true);
}
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const fallHk = h => h * 0.2;   // Lautstaerke eines Falls aus seiner Hoehe
const fbm = (x, y) => vnoise(x, y) * 0.55 + vnoise(x * 2.1 + 5, y * 2.1) * 0.28 + vnoise(x * 4.3, y * 4.3 + 9) * 0.17;

function placeSeg(m, a, b, r) {
  _d.subVectors(b, a);
  const len = _d.length() || 1e-4;
  m.position.copy(a).addScaledVector(_d, 0.5);
  m.scale.set(r, len, r);
  m.quaternion.setFromUnitVectors(UP, _d.multiplyScalar(1 / len));
}

// ---------- Geometrie-Helfer ----------
function mergeGeos(list) {
  let n = 0;
  const parts = list.map(g => { const q = g.index ? g.toNonIndexed() : g; n += q.attributes.position.count; return q; });
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), col = new Float32Array(n * 3).fill(1), uv = new Float32Array(n * 2);
  let o = 0;
  for (const q of parts) {
    const c = q.attributes.position.count;
    pos.set(q.attributes.position.array, o * 3);
    if (q.attributes.normal) nor.set(q.attributes.normal.array, o * 3);
    if (q.attributes.color) col.set(q.attributes.color.array, o * 3);
    if (q.attributes.uv) uv.set(q.attributes.uv.array, o * 2);
    o += c;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return g;
}
function paint(g, hex, fn) {
  const p = g.attributes.position, c = new Float32Array(p.count * 3), base = new THREE.Color(hex);
  for (let i = 0; i < p.count; i++) {
    const k = fn ? fn(p.getX(i), p.getY(i), p.getZ(i)) : 1;
    c[i * 3] = base.r * k; c[i * 3 + 1] = base.g * k; c[i * 3 + 2] = base.b * k;
  }
  g.setAttribute('color', new THREE.BufferAttribute(c, 3));
  return g;
}
function blob(rnd, r, det = 1) {
  const g = new THREE.SphereGeometry(r, 11 + det * 3, 8 + det * 2), p = g.attributes.position, s = rnd() * 50;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const f = 0.8 + vnoise(x * 2.2 / r + s + z * 1.5 / r, y * 2.2 / r - z * 1.1 / r) * 0.42;
    p.setXYZ(i, x * f, y * f * 0.85, z * f);
  }
  g.computeVertexNormals();
  return g;
}
function cardGeo(build) {
  const P = [], N = [], C = [], U = [];
  const add = (o, ax, ay, len, wid, nrm, b) => {
    const v = [[0, -0.5], [0, 0.5], [1, 0.5], [1, -0.5]].map(([a, w]) => [o[0] + ax[0] * len * a + ay[0] * wid * w, o[1] + ax[1] * len * a + ay[1] * wid * w, o[2] + ax[2] * len * a + ay[2] * wid * w, a, w + 0.5]);
    for (const i of [0, 1, 2, 0, 2, 3]) { const q = v[i], n = nrm(q); P.push(q[0], q[1], q[2]); N.push(n[0], n[1], n[2]); C.push(b, b, b); U.push(q[3], q[4]); }
  };
  build(add);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(C, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2));
  return g;
}
const nrm3 = (x, y, z) => { const l = Math.hypot(x, y, z) || 1; return [x / l, y / l, z / l]; };
function spruceGeo(rnd) {
  return cardGeo(add => {
    const H = 7.2, levels = 15;
    const nrm = q => nrm3(q[0] * 0.6, 0.75, q[2] * 0.6);
    for (let l = 0; l < levels; l++) {
      const t = l / (levels - 1), y = 1.3 + t * (H - 1.7), len = (2.3 * (1 - t * 0.86) + 0.3) * (0.85 + rnd() * 0.3), nb = t > 0.8 ? 4 : 6, rot = rnd() * 6.3;
      const pitch = -0.42 + t * 1.15, cp = Math.cos(pitch), sp = Math.sin(pitch);
      for (let b = 0; b < nb; b++) {
        const a = rot + b / nb * 6.283 + (rnd() - 0.5) * 0.4, ca = Math.cos(a), sa = Math.sin(a);
        const ax = [ca * cp, sp, sa * cp], side = [-sa, 0, ca], up = [-ca * sp, cp, -sa * sp];
        const o = [ca * 0.04, y + (rnd() - 0.5) * 0.2, sa * 0.04], br = 0.55 + 0.45 * t + (rnd() - 0.5) * 0.15;
        add(o, ax, side, len, len * 0.62, nrm, br); add(o, ax, up, len, len * 0.5, nrm, br * 0.9);
      }
    }
    for (let k = 0; k < 3; k++) { const a = k * 1.05; add([0, H - 1.2, 0], [0, 1, 0], [Math.cos(a), 0, Math.sin(a)], 1.5, 0.7, () => [0, 1, 0], 1.05); }
  });
}
function spruceTrunk() {
  const g = new THREE.CylinderGeometry(0.03, 0.17, 7.0, 7, 1, true).translate(0, 3.5, 0), uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setY(i, uv.getY(i) * 4);
  return g;
}
function crownGeo(rnd, R, cy, n, size) {
  return cardGeo(add => {
    for (let i = 0; i < n; i++) {
      const u = rnd() * 2 - 1, a = rnd() * 6.283, rr = Math.sqrt(1 - u * u), rad = R * (0.5 + 0.5 * Math.cbrt(rnd()));
      const d = [rr * Math.cos(a), u * 0.8, rr * Math.sin(a)], c = [d[0] * rad, cy + d[1] * rad, d[2] * rad];
      const dj = nrm3(d[0] + (rnd() - 0.5) * 0.9, d[1] + (rnd() - 0.5) * 0.9, d[2] + (rnd() - 0.5) * 0.9);
      const r0 = nrm3(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5);
      const ax = nrm3(dj[1] * r0[2] - dj[2] * r0[1], dj[2] * r0[0] - dj[0] * r0[2], dj[0] * r0[1] - dj[1] * r0[0]);
      const ay = [dj[1] * ax[2] - dj[2] * ax[1], dj[2] * ax[0] - dj[0] * ax[2], dj[0] * ax[1] - dj[1] * ax[0]];
      const sz = size * (0.8 + rnd() * 0.5), o = [c[0] - ax[0] * sz / 2, c[1] - ax[1] * sz / 2, c[2] - ax[2] * sz / 2];
      add(o, ax, ay, sz, sz, q => nrm3(q[0], (q[1] - cy) + R * 0.45, q[2]), 0.5 + 0.55 * clamp((d[1] + 0.7) / 1.5, 0, 1));
    }
  });
}
function leafTrunk(rnd) {
  const parts = [new THREE.CylinderGeometry(0.1, 0.2, 3.8, 7, 1, true).translate(0, 1.9, 0)];
  for (let i = 0; i < 4; i++) {
    const b = new THREE.CylinderGeometry(0.035, 0.085, 2.1, 5, 1, true).translate(0, 1.05, 0);
    b.rotateZ(0.5 + rnd() * 0.5); b.rotateY(i * 1.57 + rnd()); b.translate(0, 2.5 + rnd() * 1.0, 0); parts.push(b);
  }
  const g = mergeGeos(parts), uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setY(i, uv.getY(i) * 2.5);
  return g;
}
function tuftGeo(w = 0.78, h = 0.7) {
  const parts = [];
  for (let i = 0; i < 3; i++) { const p = new THREE.PlaneGeometry(w, h).translate(0, h * 0.48, 0).rotateY(i * Math.PI / 3); parts.push(p); }
  const g = mergeGeos(parts), n = g.attributes.normal;
  for (let i = 0; i < n.count; i++) n.setXYZ(i, 0, 1, 0);
  return g;
}
// Farn: Wedel als gebogene Streifen rund um die Mitte
function fernGeo(rnd) {
  const P = [], N = [], U = [], I = [], SEG = 5, nf = 9;
  for (let f = 0; f < nf; f++) {
    const a = f / nf * 6.283 + rnd() * 0.5, L = 0.62 + rnd() * 0.3, lift = 0.5 + rnd() * 0.35, ca = Math.cos(a), sa = Math.sin(a), w = 0.085 + rnd() * 0.03, base = P.length / 3;
    for (let k = 0; k <= SEG; k++) {
      const t = k / SEG, r = L * (0.06 + t * 0.94), y = lift * Math.sin(t * 2.0) * (1 - t * 0.25);
      for (const sd of [-1, 1]) { P.push(ca * r - sa * w * sd, y, sa * r + ca * w * sd); N.push(ca * 0.3, 1, sa * 0.3); U.push(sd * 0.5 + 0.5, t); }
    }
    for (let k = 0; k < SEG; k++) { const i = base + k * 2; I.push(i, i + 1, i + 2, i + 1, i + 3, i + 2); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2)); g.setIndex(I);
  return g;
}
function rockGeo(k, wet) {
  const g = new THREE.SphereGeometry(1, 22, 14), p = g.attributes.position, c = new Float32Array(p.count * 3), moss = new THREE.Color(0x66753a), t = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const n1 = vnoise(x * 1.3 + k * 9 + z * 0.9, y * 1.3 - z * 0.7 + k), n2 = vnoise(x * 3.7 + z * 2.9 + k, y * 3.7 - z * 2.1);
    const f = 0.72 + n1 * 0.46 + n2 * 0.13;
    const ny = y * f * 0.78;
    p.setXYZ(i, x * f, ny, z * f);
    let b = 0.72 + n2 * 0.45;
    t.setRGB(b, b, b * 0.98);
    if (y > 0.45 && n1 > 0.45) t.lerp(moss, clamp((y - 0.45) * 2.2 * (n1 - 0.3), 0, 0.75));
    if (wet && ny < 0.3) t.multiplyScalar(0.42 + 0.58 * smooth(0.12, 0.3, ny));
    c[i * 3] = t.r; c[i * 3 + 1] = t.g; c[i * 3 + 2] = t.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(c, 3));
  g.computeVertexNormals();
  return g;
}
// ---------- Fischmodell ----------
// Haut je Art als Textur (dieselben Farben und Zeichnungen wie das gezeichnete Portraet): oben der Koerper abgewickelt
// (links Kopf, rechts Schwanzwurzel; oberer Rand Ruecken, unterer Rand Bauch - beide Flanken teilen sich das Bild), unten drei Flossenfelder.
const SKIN_W = 512, SKIN_H = 256, SKIN_B = 176;
function fishSkin(species) {
  const o = FISH_LOOK[species] || FISH_LOOK.bachforelle, W = SKIN_W, BH = SKIN_B, FH = SKIN_H - SKIN_B, CW = W / 3;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = SKIN_H;
  const c = cv.getContext('2d'), rnd = mulberry32(species.length * 131 + species.charCodeAt(0) * 7 + 3);
  const g = c.createLinearGradient(0, 0, 0, BH);
  g.addColorStop(0, o.back); g.addColorStop(0.2, o.back); g.addColorStop(0.42, o.side); g.addColorStop(0.68, o.side); g.addColorStop(0.9, o.belly); g.addColorStop(1, o.belly);
  c.fillStyle = g; c.fillRect(0, 0, W, BH);
  if (o.stripe) { const st = c.createLinearGradient(0, 0.36 * BH, 0, 0.64 * BH); st.addColorStop(0, 'rgba(0,0,0,0)'); st.addColorStop(0.5, o.stripe); st.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = st; c.fillRect(0.08 * W, 0.36 * BH, 0.92 * W, 0.28 * BH); }
  if (o.scales) { c.lineWidth = 1.2; for (let y = 5, r = 0; y < BH * 0.86; y += 10, r++) for (let x = 0.2 * W + (r % 2) * 6; x < W; x += 12) { c.strokeStyle = 'rgba(0,0,0,.2)'; c.beginPath(); c.arc(x, y, 7, -1.2, 1.2); c.stroke(); c.strokeStyle = 'rgba(255,255,255,.1)'; c.beginPath(); c.arc(x - 1.5, y, 7, -1.2, 1.2); c.stroke(); } }
  if (o.marble || o.worm) {
    c.strokeStyle = o.marble ? 'rgba(42,46,28,.8)' : 'rgba(200,205,130,.55)'; c.lineWidth = o.marble ? 5 : 3; c.lineCap = 'round';
    for (let i = 0, n = o.marble ? 95 : 30; i < n; i++) {
      let x = rnd() * W, y = (o.marble ? rnd() * 0.74 : rnd() * 0.3) * BH, an = rnd() * 6.3;
      c.beginPath(); c.moveTo(x, y);
      for (let k = 0; k < 5; k++) { an += (rnd() - 0.5) * 2.4; x += Math.cos(an) * 11; y += Math.sin(an) * 9; c.lineTo(x, y); }
      c.stroke();
    }
  }
  for (const sp of o.spots) for (let i = 0, n = Math.round(sp.n * 1.4); i < n; i++) {
    const x = (sp.front ? 0.2 + rnd() * 0.3 : 0.17 + rnd() * (sp.tail ? 0.83 : 0.74)) * W, y = (sp.band ? 0.4 + rnd() * 0.26 : 0.03 + rnd() * 0.58) * BH, r = sp.r * W * 1.2 * (0.7 + rnd() * 0.6);
    if (sp.halo) { c.beginPath(); c.arc(x, y, r * 1.8, 0, 7); c.fillStyle = sp.halo; c.fill(); }
    c.beginPath(); c.arc(x, y, r, 0, 7); c.fillStyle = sp.c; c.fill();
  }
  for (let i = 0; i < 700; i++) { c.fillStyle = rnd() < 0.5 ? 'rgba(0,0,0,.07)' : 'rgba(255,255,255,.07)'; c.fillRect(rnd() * W, rnd() * BH, 1.5, 1.5); }   // feine Schuppung
  // Kopf: Kiemendeckel, Auge, Maulspalte
  const hx = (o.bigHead ? 0.235 : 0.2) * W;
  c.fillStyle = 'rgba(0,0,0,.07)'; c.fillRect(0, 0, hx, BH);
  c.fillStyle = 'rgba(255,255,255,.1)'; c.beginPath(); c.ellipse(hx * 0.72, 0.52 * BH, hx * 0.2, 0.2 * BH, 0, 0, 7); c.fill();
  c.strokeStyle = 'rgba(0,0,0,.45)'; c.lineWidth = 2.5; c.beginPath(); c.moveTo(hx, 0.1 * BH); c.quadraticCurveTo(hx + 0.035 * W, 0.5 * BH, hx, 0.86 * BH); c.stroke();
  c.lineWidth = 2; c.beginPath(); c.moveTo(0, 0.55 * BH); c.lineTo((o.bigHead ? 0.11 : 0.085) * W, 0.6 * BH); c.stroke();
  const ex = 0.088 * W, ey = 0.4 * BH;
  c.beginPath(); c.arc(ex, ey, 10, 0, 7); c.fillStyle = '#e8c860'; c.fill(); c.strokeStyle = 'rgba(0,0,0,.4)'; c.lineWidth = 1; c.stroke();
  c.beginPath(); c.arc(ex, ey, 6, 0, 7); c.fillStyle = '#0c0c0c'; c.fill();
  c.beginPath(); c.arc(ex - 2.5, ey - 2.5, 1.8, 0, 7); c.fillStyle = 'rgba(255,255,255,.85)'; c.fill();
  const tr = c.createLinearGradient(0.9 * W, 0, W, 0); tr.addColorStop(0, 'rgba(0,0,0,0)'); tr.addColorStop(1, 'rgba(0,0,0,.18)'); c.fillStyle = tr; c.fillRect(0.9 * W, 0, 0.1 * W, BH);
  // Flossenfelder: 0 = paarige und kleine Flossen, 1 = Schwanzflosse, 2 = Rueckenflosse (bei der Aesche die Fahne)
  const rays = (x0, n, horiz) => { c.strokeStyle = 'rgba(0,0,0,.28)'; c.lineWidth = 1.2; for (let i = 0; i <= n; i++) { const k = i / n; c.beginPath(); if (horiz) { c.moveTo(x0, BH + FH * (0.5 + (k - 0.5) * 0.25)); c.lineTo(x0 + CW, BH + FH * k); } else { c.moveTo(x0 + CW * (0.15 + k * 0.7), SKIN_H); c.lineTo(x0 + CW * k, BH); } c.stroke(); } };
  const shade = x0 => { const sh = c.createLinearGradient(0, SKIN_H, 0, BH); sh.addColorStop(0, 'rgba(0,0,0,.28)'); sh.addColorStop(1, 'rgba(255,255,255,.2)'); c.fillStyle = sh; c.fillRect(x0, BH, CW, FH); };
  c.fillStyle = o.fin; c.fillRect(0, BH, W, FH);
  shade(0); rays(0, 16, false);
  if (o.whiteEdge) { c.fillStyle = '#f6f6ee'; c.fillRect(0, BH, 13, FH); c.fillStyle = '#16181a'; c.fillRect(13, BH, 6, FH); }
  { const sh = c.createLinearGradient(CW, 0, 2 * CW, 0); sh.addColorStop(0, 'rgba(0,0,0,.3)'); sh.addColorStop(1, 'rgba(255,255,255,.12)'); c.fillStyle = sh; c.fillRect(CW, BH, CW, FH); rays(CW, 16, true); }
  if (o.spots.some(q => q.tail)) { c.fillStyle = '#17191a'; for (let i = 0; i < 46; i++) { c.beginPath(); c.arc(CW + rnd() * CW, BH + rnd() * FH, 2 + rnd() * 1.5, 0, 7); c.fill(); } }
  if (o.dorsalBig) {
    const dg = c.createLinearGradient(0, BH, 0, SKIN_H); dg.addColorStop(0, '#c2386a'); dg.addColorStop(0.45, '#8a5aa6'); dg.addColorStop(1, '#55687c'); c.fillStyle = dg; c.fillRect(2 * CW, BH, CW, FH);
    rays(2 * CW, 20, false);
    for (let r = 0; r < 4; r++) for (let i = 0; i < 9; i++) {
      const x = 2 * CW + (0.07 + i / 9 * 0.9 + (r % 2) * 0.04) * CW, y = BH + FH * (0.16 + r * 0.2);
      c.beginPath(); c.ellipse(x, y, 7, 5, 0, 0, 7); c.fillStyle = 'rgba(130,190,235,.55)'; c.fill();
      c.beginPath(); c.ellipse(x, y, 4.5, 3.2, 0, 0, 7); c.fillStyle = 'rgba(70,14,52,.9)'; c.fill();
    }
    c.fillStyle = 'rgba(226,70,90,.75)'; c.fillRect(2 * CW, BH, CW, 5);   // roter Saum
  } else {
    shade(2 * CW); rays(2 * CW, 14, false);
    if (o.spots.length && !o.whiteEdge) { c.fillStyle = o.spots[0].c; for (let i = 0; i < 14; i++) { c.beginPath(); c.arc(2 * CW + rnd() * CW, BH + FH * (0.25 + rnd() * 0.7), 2.4 + rnd() * 1.6, 0, 7); c.fill(); } }
    if (o.worm) { c.strokeStyle = 'rgba(20,24,18,.7)'; c.lineWidth = 3; for (let i = 0; i < 6; i++) { const x = 2 * CW + (0.1 + i / 6 * 0.85) * CW; c.beginPath(); c.moveTo(x, BH + FH * 0.2); c.quadraticCurveTo(x + 9, BH + FH * 0.55, x - 3, BH + FH * 0.9); c.stroke(); } }
  }
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}
function fishGeo(species) {
  const o = FISH_LOOK[species] || FISH_LOOK.bachforelle;
  const NS = 30, NR = 14, pos = [], uv = [], idx = [], BV = SKIN_B / SKIN_H, FV = (SKIN_H - SKIN_B) / SKIN_H;
  const slim = o.slim ? 0.86 : 1, bh = o.bigHead ? 0.13 : 0;
  const hw = t => (0.012 + 0.1 * Math.pow(Math.sin(Math.PI * Math.pow(t, 0.58)), 0.8) + 0.016 * t) * slim * (1 + bh * clamp(1 - t / 0.28, 0, 1));
  const tz = z => clamp((z + 0.5) / 0.87, 0, 1), top = z => hw(tz(z)) - 0.01, bot = z => -hw(tz(z)) - 0.01, wid = z => hw(tz(z)) * 0.56;
  for (let s = 0; s <= NS; s++) {
    const t = s / NS, h = hw(t), w = h * 0.56, z = -0.5 + t * 0.87;
    for (let j = 0; j < NR; j++) {
      const a = j / NR * Math.PI * 2, sy = Math.sin(a), ang = Math.abs(((a - Math.PI / 2 + Math.PI * 3) % (Math.PI * 2)) - Math.PI) / Math.PI;   // 0 = Ruecken, 1 = Bauch
      pos.push(Math.cos(a) * w * (sy < 0 ? 1 + 0.12 * -sy : 1), sy * h - 0.01, z);                                                                   // unten etwas voller
      uv.push(0.004 + t * 0.992, 1 - (0.012 + ang * 0.976) * BV);
    }
  }
  for (let s = 0; s < NS; s++) for (let j = 0; j < NR; j++) {
    const a = s * NR + j, b = s * NR + (j + 1) % NR, c = a + NR, d = b + NR;
    idx.push(a, c, b, b, c, d);
  }
  // Flosse als Faecher: Punkte [x, y, z, s, t] mit s = entlang der Flossenbasis, t = Basis (0) bis Saum (1) im Flossenfeld
  const fin = (cell, P) => { const o0 = pos.length / 3; for (const q of P) { pos.push(q[0], q[1], q[2]); uv.push((cell + 0.04 + q[3] * 0.92) / 3, (0.04 + q[4] * 0.92) * FV); } for (let i = 1; i < P.length - 1; i++) idx.push(o0, o0 + i, o0 + i + 1); };
  // Schwanzflosse, gegabelt
  fin(1, [[0, 0, 0.352, 0, 0.5], [0, 0.034, 0.36, 0.03, 0.63], [0, 0.085, 0.43, 0.5, 0.86], [0, 0.135, 0.5, 1, 1], [0, 0.055, 0.468, 0.8, 0.7], [0, 0, 0.45, 0.68, 0.5],
    [0, -0.055, 0.468, 0.8, 0.3], [0, -0.135, 0.5, 1, 0], [0, -0.085, 0.43, 0.5, 0.14], [0, -0.034, 0.36, 0.03, 0.37]]);
  // Rueckenflosse; bei der Aesche die Fahne: lang, hoch, nach hinten gerundet
  if (o.dorsalBig) { const z0 = -0.17, z1 = 0.21, y = z => top(z) - 0.012, k = z => (z - z0) / (z1 + 0.06 - z0);
    fin(2, [[0, y(z0), z0, 0, 0], [0, y(z0) + 0.1, z0 + 0.02, k(z0 + 0.02), 0.55], [0, y(z0) + 0.155, z0 + 0.09, k(z0 + 0.09), 0.9], [0, y(0) + 0.175, z0 + 0.2, k(z0 + 0.2), 1], [0, y(0.1) + 0.18, z0 + 0.31, k(z0 + 0.31), 1],
      [0, y(z1) + 0.15, z1 + 0.04, k(z1 + 0.04), 0.85], [0, y(z1) + 0.07, z1 + 0.06, 1, 0.4], [0, y(z1), z1, k(z1), 0], [0, y(0.02), 0.02, k(0.02), 0]]);
  } else { const z0 = -0.1, z1 = 0.13, y = z => top(z) - 0.012;
    fin(2, [[0, y(z0), z0, 0, 0], [0, y(z0) + 0.078, z0 + 0.045, 0.12, 1], [0, y(0) + 0.07, z0 + 0.13, 0.6, 1], [0, y(z1) + 0.032, z1 + 0.03, 1, 0.55], [0, y(z1), z1, 1, 0], [0, y(0.015), 0.015, 0.5, 0]]); }
  if (!o.barbel) fin(0, [[0, top(0.225) - 0.006, 0.225, 0.4, 0], [0, top(0.25) + 0.034, 0.282, 0.5, 0.8], [0, top(0.268) - 0.006, 0.268, 0.6, 0]]);   // Fettflosse (Salmoniden und Aesche)
  fin(0, [[0, bot(0.14) + 0.01, 0.14, 0, 0], [0, bot(0.16) - 0.066, 0.2, 0.03, 1], [0, bot(0.24) - 0.038, 0.262, 1, 0.8], [0, bot(0.25) + 0.01, 0.25, 1, 0]]);   // Afterflosse
  for (const sx of [-1, 1]) {
    fin(0, [[sx * 0.018, bot(-0.02) + 0.022, -0.02, 0, 0], [sx * 0.062, bot(0) - 0.036, 0.05, 0.03, 1], [sx * 0.046, bot(0.04) - 0.03, 0.092, 1, 0.8], [sx * 0.018, bot(0.06) + 0.022, 0.06, 1, 0]]);   // Bauchflossen
    const w = wid(-0.28);
    fin(0, [[sx * w * 0.85, -0.04, -0.29, 0, 0], [sx * (w + 0.075), -0.078, -0.2, 0.03, 1], [sx * (w + 0.052), -0.088, -0.158, 1, 0.85], [sx * w * 0.85, -0.055, -0.24, 1, 0]]);                   // Brustflossen
    if (o.barbel) for (const dz of [0, 0.022]) fin(0, [[sx * 0.01, -0.022, -0.492 + dz, 0.5, 0], [sx * 0.02, -0.062, -0.47 + dz, 0.5, 0.2], [sx * 0.015, -0.022, -0.478 + dz, 0.55, 0]]);             // Barteln
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals();
  return g;
}

// ---------- Prozedurale Texturen ----------
function makeNoiseTex() {
  const N = 256, H = new Float32Array(N * N), A = new Float32Array(N * N);
  const lat = (per, seed) => { const r = mulberry32(seed), a = new Float32Array(per * per); for (let i = 0; i < a.length; i++) a[i] = r(); return a; };
  const oct = (out, per, amp, seed) => {
    const L = lat(per, seed), s = per / N;
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const fx = x * s, fy = y * s, ix = Math.floor(fx), iy = Math.floor(fy);
      let tx = fx - ix, ty = fy - iy; tx = tx * tx * (3 - 2 * tx); ty = ty * ty * (3 - 2 * ty);
      const x1 = (ix + 1) % per, y1 = (iy + 1) % per;
      const a = L[iy * per + ix], b = L[iy * per + x1], c = L[y1 * per + ix], d = L[y1 * per + x1];
      out[y * N + x] += amp * (a + (b - a) * tx + (c - a) * ty + (a - b - c + d) * tx * ty);
    }
  };
  oct(H, 6, 0.5, 1); oct(H, 13, 0.27, 2); oct(H, 29, 0.15, 3); oct(H, 61, 0.08, 4);
  oct(A, 9, 0.5, 5); oct(A, 21, 0.3, 6); oct(A, 47, 0.2, 7);
  const data = new Uint8Array(N * N * 4);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const i = y * N + x, xl = y * N + (x + N - 1) % N, xr = y * N + (x + 1) % N, yu = ((y + N - 1) % N) * N + x, yd = ((y + 1) % N) * N + x;
    data[i * 4] = clamp(128 + (H[xl] - H[xr]) * 900, 0, 255);
    data[i * 4 + 1] = clamp(128 + (H[yu] - H[yd]) * 900, 0, 255);
    data[i * 4 + 2] = clamp(H[i] * 255, 0, 255);
    data[i * 4 + 3] = clamp(A[i] * 255, 0, 255);
  }
  const t = new THREE.DataTexture(data, N, N, THREE.RGBAFormat);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter; t.generateMipmaps = true; t.needsUpdate = true;
  return t;
}
// Kahles Geaest fuer den Winter. Im Code gezeichnet statt als Foto geladen: rekursiv
// verzweigte Linien, die vom Mittelpunkt nach aussen immer duenner werden. Aus der
// Entfernung - und dort stehen diese Karten - liest sich das als Krone ohne Laub.
function twigTex(S = 256) {
  return canvasTex(S, (g, s) => {
    g.clearRect(0, 0, s, s);
    g.lineCap = 'round';
    const r = mulberry32(31);
    const branch = (x, y, ang, len, w, d) => {
      if (w < 0.45 || d > 8) return;
      const x2 = x + Math.cos(ang) * len, y2 = y + Math.sin(ang) * len;
      const v = 52 + d * 10;
      g.strokeStyle = `rgba(${v | 0},${(v * 0.86) | 0},${(v * 0.72) | 0},${Math.min(1, 0.5 + w * 0.22)})`;
      g.lineWidth = w;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x2, y2); g.stroke();
      for (let i = 0, n = d < 2 ? 3 : 2; i < n; i++) branch(x2, y2, ang + (r() - 0.5) * 1.45, len * (0.64 + r() * 0.2), w * (0.58 + r() * 0.2), d + 1);
    };
    // vom Mittelpunkt in alle Richtungen, damit die Karte in jeder Lage als Geaest liest
    for (let i = 0; i < 9; i++) branch(s * 0.5, s * 0.56, (i / 9) * 6.283 + r() * 0.5, s * 0.17, 5.5, 0);
  }, true);
}
// Eine Figur mit Skelett laesst sich nicht einfach klonen: object.clone() haengt beide
// Kopien an dieselben Knochen, und dann bewegen sie sich im Gleichschritt. Dieses Verfahren
// klont den Knochenbaum mit und bindet die Kopie an ihre eigenen Knochen (wie SkeletonUtils
// aus den Three.js-Beispielen, hier in kurz, damit keine weitere Datei noetig ist).
function parallelTraverse(a, b, fn) {
  fn(a, b);
  for (let i = 0; i < a.children.length; i++) parallelTraverse(a.children[i], b.children[i], fn);
}
function cloneSkinned(source) {
  const srcOf = new Map(), cloneOf = new Map();
  const clone = source.clone(true);
  parallelTraverse(source, clone, (s, c) => { srcOf.set(c, s); cloneOf.set(s, c); });
  clone.traverse(n => {
    if (!n.isSkinnedMesh) return;
    const src = srcOf.get(n);
    n.skeleton = src.skeleton.clone();
    n.bindMatrix.copy(src.bindMatrix);
    n.skeleton.bones = src.skeleton.bones.map(b => cloneOf.get(b));
    n.bind(n.skeleton, n.bindMatrix);
  });
  // Object3D.copy schickt userData durch JSON. Aus der Ruhelage-Quaternion wird dabei ein
  // gewoehnliches Objekt, und jede Rechnung damit ergibt NaN - die Figur kollabiert dann
  // lautlos. Also die Ruhelage aus der geklonten Lage neu festhalten.
  clone.traverse(n => { if (n.isBone) n.userData.rq = n.quaternion.clone(); });
  return clone;
}
// Das Hemd des zweiten Spielers gruen: In der Textur ist das Hemd der einzige blaue
// Bereich (Hose khaki, Haut orange, Schuhe dunkel), also faerbt ein gezielter Dreh
// genau das Hemd und sonst nichts. Helligkeit bleibt, damit die Falten erhalten bleiben.
function greenShirt(img) {
  const cv = document.createElement('canvas');
  cv.width = img.width; cv.height = img.height;
  const g = cv.getContext('2d');
  g.drawImage(img, 0, 0);
  const d = g.getImageData(0, 0, cv.width, cv.height), a = d.data;
  for (let i = 0; i < a.length; i += 4) {
    const r = a[i], gr = a[i + 1], b = a[i + 2];
    if (b <= gr || b - r < 14) continue;                 // nur wo Blau wirklich fuehrt
    const mx = Math.max(r, gr, b), mn = Math.min(r, gr, b);
    if (mx - mn < 12) continue;                          // Grau bleibt Grau
    a[i] = Math.round(r * 0.72);                         // Blau nach Gruen: Blau runter, Gruen rauf
    a[i + 1] = Math.min(255, Math.round(b * 0.96));
    a[i + 2] = Math.round(gr * 0.62);
  }
  g.putImageData(d, 0, 0);
  const t = new THREE.CanvasTexture(cv);
  // flipY bleibt auf dem Vorgabewert: Die Ladetextur der Figur benutzt ihn auch, und
  // gespiegelt landet das Hemd auf der Hose.
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}
function canvasTex(S, draw, srgb) {
  const cv = document.createElement('canvas'); cv.width = cv.height = S;
  draw(cv.getContext('2d'), S);
  const t = new THREE.CanvasTexture(cv);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
const wrap9 = (S, x, y, r, fn) => { for (const ox of [-S, 0, S]) for (const oy of [-S, 0, S]) if (x + ox > -r && x + ox < S + r && y + oy > -r && y + oy < S + r) fn(x + ox, y + oy); };
function detailTex(kind) {
  const rnd = mulberry32(kind.length * 31 + 7);
  return canvasTex(512, (c, S) => {
    if (kind === 'pebble') {
      c.fillStyle = '#8f8f8f'; c.fillRect(0, 0, S, S);
      for (let i = 0; i < 2600; i++) {
        const x = rnd() * S, y = rnd() * S, r = 4 + Math.pow(rnd(), 2.2) * 26, v = 135 + rnd() * 120 | 0, rot = rnd() * 3, e = 0.55 + rnd() * 0.45;
        wrap9(S, x, y, r, (px, py) => {
          c.beginPath(); c.ellipse(px, py, r, r * e, rot, 0, 7); c.fillStyle = `rgb(${v},${v},${v})`; c.fill();
          c.strokeStyle = 'rgba(0,0,0,.35)'; c.lineWidth = 1.5; c.stroke();
          c.beginPath(); c.ellipse(px - r * 0.2, py - r * 0.2 * e, r * 0.45, r * 0.3 * e, rot, 0, 7); c.fillStyle = 'rgba(255,255,255,.12)'; c.fill();
        });
      }
    } else if (kind === 'grass') {
      c.fillStyle = '#b4b4b4'; c.fillRect(0, 0, S, S);
      for (let i = 0; i < 380; i++) { const x = rnd() * S, y = rnd() * S, r = 20 + rnd() * 50, v = rnd() < 0.5 ? 0 : 255; wrap9(S, x, y, r, (px, py) => { const g = c.createRadialGradient(px, py, 0, px, py, r); g.addColorStop(0, `rgba(${v},${v},${v},.16)`); g.addColorStop(1, `rgba(${v},${v},${v},0)`); c.fillStyle = g; c.fillRect(px - r, py - r, r * 2, r * 2); }); }
      c.lineCap = 'round';
      for (let i = 0; i < 9000; i++) {
        const x = rnd() * S, y = rnd() * S, l = 5 + rnd() * 12, a = -1.57 + (rnd() - 0.5) * 1.6, v = 120 + rnd() * 135 | 0;
        c.strokeStyle = `rgba(${v},${v},${v},.55)`; c.lineWidth = 1 + rnd() * 1.2;
        wrap9(S, x, y, l, (px, py) => { c.beginPath(); c.moveTo(px, py); c.lineTo(px + Math.cos(a) * l, py + Math.sin(a) * l); c.stroke(); });
      }
    } else {
      c.fillStyle = '#b0b0b0'; c.fillRect(0, 0, S, S);
      for (let i = 0; i < 500; i++) { const x = rnd() * S, y = rnd() * S, r = 10 + rnd() * 60, v = rnd() < 0.5 ? 0 : 255; wrap9(S, x, y, r, (px, py) => { const g = c.createRadialGradient(px, py, 0, px, py, r); g.addColorStop(0, `rgba(${v},${v},${v},.2)`); g.addColorStop(1, `rgba(${v},${v},${v},0)`); c.fillStyle = g; c.fillRect(px - r, py - r, r * 2, r * 2); }); }
      for (let i = 0; i < 260; i++) {
        let x = rnd() * S, y = rnd() * S, a = rnd() * 6.3; c.strokeStyle = `rgba(0,0,0,${0.15 + rnd() * 0.3})`; c.lineWidth = 0.8 + rnd() * 1.6; c.beginPath(); c.moveTo(x, y);
        for (let k = 0; k < 8; k++) { a += (rnd() - 0.5) * 1.1; x += Math.cos(a) * 12; y += Math.sin(a) * 12; c.lineTo(x, y); } c.stroke();
      }
      for (let i = 0; i < 5000; i++) { const v = rnd() < 0.5 ? 0 : 255; c.fillStyle = `rgba(${v},${v},${v},.12)`; c.fillRect(rnd() * S, rnd() * S, 2, 2); }
    }
  });
}
function tuftTex() {
  const rnd = mulberry32(99);
  const t = canvasTex(128, (c, S) => {
    for (let i = 0; i < 46; i++) {
      const x = 14 + rnd() * 100, tx = x + (rnd() - 0.5) * 56, ty = S - (40 + rnd() * 84), w = 2.2 + rnd() * 2.5;
      c.beginPath(); c.moveTo(x - w, S); c.quadraticCurveTo(x + (tx - x) * 0.25, S - (S - ty) * 0.6, tx, ty); c.quadraticCurveTo(x + (tx - x) * 0.35 + w, S - (S - ty) * 0.5, x + w, S); c.closePath();
      c.fillStyle = `hsl(${68 + rnd() * 34},${38 + rnd() * 22}%,${40 + rnd() * 30}%)`; c.fill();
    }
  }, true);
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}

function branchTex() {
  const rnd = mulberry32(321);
  const t = canvasTex(512, (c, S) => {
    const H = S / 2; c.lineCap = 'round';
    const needles = (x0, y0, x1, y1, len) => {
      const L = Math.hypot(x1 - x0, y1 - y0), a = Math.atan2(y1 - y0, x1 - x0);
      for (let d = 0; d < L; d += 2.2) for (const sg of [-1, 1]) {
        const px = x0 + Math.cos(a) * d, py = y0 + Math.sin(a) * d, na = a + sg * (0.75 + rnd() * 0.5), l = len * (0.7 + rnd() * 0.6) * (1 - d / L * 0.35);
        c.strokeStyle = `hsl(${92 + rnd() * 36},${28 + rnd() * 20}%,${19 + rnd() * 24}%)`; c.lineWidth = 1.3 + rnd() * 1.2;
        c.beginPath(); c.moveTo(px, py); c.lineTo(px + Math.cos(na) * l, py + Math.sin(na) * l); c.stroke();
      }
    };
    const twig = (x0, y0, x1, y1, w) => { c.strokeStyle = '#3a2a1c'; c.lineWidth = w; c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke(); };
    for (let i = 0; i < 13; i++) {
      const px = 14 + i * 36, len = 190 * (1 - px / 540) + 26;
      for (const sg of [-1, 1]) {
        const a = sg * (0.5 + rnd() * 0.25), ex = px + Math.cos(a) * len, ey = H + Math.sin(a) * len;
        twig(px, H, ex, ey, 2.5); needles(px, H, ex, ey, 17);
        const mx = px + Math.cos(a) * len * 0.45, my = H + Math.sin(a) * len * 0.45, a2 = a + sg * 0.55;
        needles(mx, my, mx + Math.cos(a2) * len * 0.4, my + Math.sin(a2) * len * 0.4, 13);
      }
    }
    twig(0, H, 500, H, 5); needles(0, H, 506, H, 20);
  }, true);
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}
function leafTex() {
  const rnd = mulberry32(654);
  const t = canvasTex(256, (c, S) => {
    const leaves = [];
    for (let i = 0; i < 150; i++) { const a = rnd() * 6.283, r = Math.pow(rnd(), 0.6) * 108; leaves.push([S / 2 + Math.cos(a) * r, S / 2 + Math.sin(a) * r * 0.9, rnd() * 6.3, 13 + rnd() * 10, rnd()]); }
    leaves.sort((a, b) => a[4] - b[4]);
    for (const [x, y, rot, sz, l] of leaves) {
      c.save(); c.translate(x, y); c.rotate(rot);
      c.beginPath(); c.moveTo(-sz, 0); c.quadraticCurveTo(0, -sz * 0.62, sz, 0); c.quadraticCurveTo(0, sz * 0.62, -sz, 0); c.closePath();
      c.fillStyle = `hsl(${76 + rnd() * 32},${34 + rnd() * 20}%,${24 + l * 28}%)`; c.fill();
      c.strokeStyle = 'rgba(210,230,150,.22)'; c.lineWidth = 1; c.beginPath(); c.moveTo(-sz, 0); c.lineTo(sz, 0); c.stroke();
      c.restore();
    }
  }, true);
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}

// ---------- Shader ----------
const WATER_VS = `
attribute float aDepth; attribute float aSpeed; attribute float aFoam; attribute float aBank;
varying float vDepth; varying float vSpeed; varying float vFoam; varying float vBank; varying vec3 vW;
void main(){ vDepth=aDepth; vSpeed=aSpeed; vFoam=aFoam; vBank=aBank; vec4 w=modelMatrix*vec4(position,1.); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }`;
const WATER_FS = `
precision highp float;
uniform sampler2D uN,uSkyT,uRefl,uScene,uDepthT;
uniform float uTime,uClear,uMurk,uFogNear,uFogFar,uSun,uRot,uGain,uFx,uNear,uFar,uNoRefl;
uniform vec3 uShallow,uDeep,uSkyTop,uSkyBot,uFog,uSunDir,uSunCol,uBankCol;
uniform vec2 uInv; uniform vec4 uWader;
varying float vDepth; varying float vSpeed; varying float vFoam; varying float vBank; varying vec3 vW;
vec4 lay(vec2 p, float ph, vec2 o){
  vec2 q=vec2(p.x, p.y-vSpeed*ph*3.33);
  return texture2D(uN,q*vec2(0.17,0.085)+o)*0.55+texture2D(uN,q*vec2(0.53,0.29)+o*1.7)*0.45;
}
float linZ(float z){ float n=z*2.-1.; return 2.*uNear*uFar/(uFar+uNear-n*(uFar-uNear)); }
void main(){
  float ph1=fract(uTime*0.3), ph2=fract(uTime*0.3+0.5), w2=abs(1.-2.*ph1);
  vec4 m=mix(lay(vW.xz,ph1,vec2(0.)), lay(vW.xz,ph2,vec2(0.37,0.61)), w2);
  vec4 fine=texture2D(uN, vW.xz*vec2(1.3,0.8)+vec2(0.,-uTime*(0.25+vSpeed*0.5)));
  float rough=0.22+clamp(vSpeed,0.,1.7)*0.62;
  vec2 nxz=((m.rg-0.5)*2.2+(fine.rg-0.5)*0.7)*rough;
  // Bugwelle: Stauring um die Beine, Kielwasser-V und Schaumfahne stromab
  vec2 wp=vW.xz-uWader.xy; float wr=length(wp), wk=0.;
  if(uWader.z>0. && wr<6.){
    float flow=(clamp(vSpeed,0.2,1.6)+uWader.w*0.9)*uWader.z;
    float ring=sin(wr*24.-uTime*7.)*exp(-wr*2.4);
    float arm=abs(wp.x)-(0.17+max(wp.y,0.)*0.4);
    float vee=exp(-arm*arm*80.)*smoothstep(0.,0.3,wp.y)*exp(-wp.y*0.7);
    float trail=exp(-wp.x*wp.x*26.)*smoothstep(0.05,0.4,wp.y)*exp(-wp.y*1.2);
    float collar=exp(-pow((wr-0.24)/0.08,2.));
    wk=(vee*0.8+trail*0.65+collar*0.9)*flow;
    nxz+=(wp/(wr+1e-3))*ring*0.4*flow+vec2(sign(wp.x),0.)*vee*0.55*sin(wp.y*16.-uTime*6.)*flow;
  }
  vec3 N=normalize(vec3(nxz.x,1.,nxz.y));
  vec3 V=normalize(cameraPosition-vW);
  float fres=0.02+0.98*pow(1.-max(dot(N,V),0.),mix(5.,3.6,step(0.5,uFx)));
  fres*=mix(1.,0.42,uClear)*mix(1.,0.07,uNoRefl);
  vec3 R=reflect(-V,N); R.y=abs(R.y);
  vec3 sky=texture2D(uSkyT,vec2(atan(R.z,R.x)*0.15915494+0.5+uRot, asin(clamp(max(R.y,0.04),0.,1.))*0.31830989+0.5)).rgb*uGain;
  float d=vDepth;
  vec3 body=mix(uShallow,uDeep,smoothstep(0.05,1.5,d));
  body=mix(body,vec3(0.26,0.23,0.12),uMurk*0.65);
  vec3 col; float a; float efoam=0.; vec3 refl;
  if(uFx>0.5){
    vec2 suv=gl_FragCoord.xy*uInv;
    // echte Spiegelung: gespiegelte Kamera, Bild vertikal gekippt, mit der Wellennormale verzerrt
    vec2 ruv=vec2(suv.x,1.-suv.y)+nxz*vec2(0.045,0.1);
    refl=mix(texture2D(uRefl,clamp(ruv,0.002,0.998)).rgb,sky,0.18*rough);
    // Lichtbrechung: Szene unter Wasser mit Versatz, Wasserdicke aus dem Tiefenpuffer
    float fz=linZ(gl_FragCoord.z);
    float t0=linZ(texture2D(uDepthT,suv).r)-fz;
    vec2 duv=suv+nxz*0.04*clamp(t0,0.,1.);
    float t1=linZ(texture2D(uDepthT,duv).r)-fz;
    if(t1<0.){ duv=suv; t1=t0; }
    vec3 sc=texture2D(uScene,clamp(duv,0.001,0.999)).rgb;
    float th=clamp(t1,0.,9.);
    vec3 ext=vec3(0.6,0.23,0.19)*mix(0.85,5.,uMurk)*mix(1.,0.72,uClear);
    vec3 T=exp(-ext*th);
    vec3 under=sc*T+body*(1.-T);
    col=mix(under,refl,clamp(fres,0.,1.));
    col+=(nxz.x+nxz.y)*0.05*refl;
    a=1.;
    float tv=t0*max(V.y,0.18);
    efoam=smoothstep(0.11,0.012,tv)*step(0.,t0)*clamp(vSpeed*1.3,0.18,1.)*smoothstep(0.3,0.62,fine.b*0.6+m.a*0.6);
  } else {
    float bank=clamp(vBank+(m.b-0.5)*0.5,0.,1.)*smoothstep(0.55,0.05,R.y);
    refl=mix(sky,uBankCol,bank*0.85);
    a=mix(0.34,0.93,smoothstep(0.0,1.5,d));
    a=mix(a,0.97,uMurk*0.75);
    a*=mix(1.,0.8,uClear);
    col=mix(body,refl,clamp(fres*0.9+0.07,0.,1.));
    col+=(nxz.x+nxz.y)*0.07*mix(vec3(1.),refl,0.5);
    a=max(a,fres*0.92);
  }
  float sp=pow(max(dot(R,uSunDir),0.),220.)*3.5*uSun*mix(1.,0.5,uClear)*mix(1.,0.25,uNoRefl);
  col+=uSunCol*sp; a=max(a,clamp(sp,0.,1.));
  float riffle=smoothstep(0.85,1.6,vSpeed)*smoothstep(0.52,0.72,m.b)*smoothstep(1.1,0.3,d);
  float foam=smoothstep(0.42,0.75,vFoam*1.15+(m.a-0.5)*1.1+(fine.b-0.5)*0.5)*step(0.02,vFoam);
  foam=max(foam,riffle*0.85);
  foam=max(foam,efoam*0.9);
  foam=max(foam,smoothstep(0.38,0.85,wk*1.1+(fine.b-0.5)*0.8)*0.85);
  col=mix(col,vec3(0.93,0.96,0.97)*(0.55+0.45*uSun),foam); a=max(a,foam*0.95);
  if(uFx<0.5) a*=smoothstep(0.0,0.06,d);
  // Wasserfall: wo die Flaeche ueber eine Stufe kippt, laufen weisse Straehnen in der Fallrichtung herab
  float fall=smoothstep(1.25,1.7,vFoam);
  if(fall>0.){
    float st=texture2D(uN,vec2(vW.x*0.5,vW.y*0.15+uTime*0.5)).r*0.6+texture2D(uN,vec2(vW.x*1.6,vW.y*0.4+uTime*0.85)).g*0.4;
    vec3 fc=mix(body*0.95+vec3(0.06),vec3(0.95,0.97,0.98),smoothstep(0.36,0.66,st))*(0.6+0.4*uSun);
    col=mix(col,fc,fall); a=max(a,fall);
  }
  float ff=smoothstep(uFogNear,uFogFar,length(cameraPosition-vW));
  col=mix(col,uFog,ff);
  gl_FragColor=vec4(col,a);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;
// Gischt: Tropfenwolken, die aus dem Fuss eines Falls aufsteigen und zurueckfallen (Bahn rein aus der Zeit berechnet)
const SPRAY_VS = `
attribute vec3 aV; attribute float aP; uniform float uTime,uScale; varying float vA; varying float vD;
void main(){ float t=fract(uTime*0.42*(0.7+0.6*fract(aP*7.3))+aP);
  vec3 p=position+aV*t+vec3(0.,-2.4*t*t,0.); vA=sin(t*3.1416)*(0.35+0.65*fract(aP*5.7));
  vec4 mv=modelViewMatrix*vec4(p,1.); vD=-mv.z;
  gl_PointSize=min(220.,(0.3+1.1*t)*(0.7+fract(aP*3.1))*uScale/max(0.6,-mv.z)); gl_Position=projectionMatrix*mv; }`;
const SPRAY_FS = `
uniform vec3 uCol,uFog; uniform float uOp,uFogNear,uFogFar; varying float vA; varying float vD;
void main(){ float d=length(gl_PointCoord-0.5); float a=smoothstep(0.5,0.08,d)*vA*uOp; if(a<0.004) discard;
  gl_FragColor=vec4(mix(uCol,uFog,smoothstep(uFogNear,uFogFar,vD)),a);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;
// Seitlicher Wasserfall: ein Band, das der Uferwand folgt; weisse Straehnen laufen daran herab
const FALL_VS = `
attribute float aFade; varying vec2 vUv; varying float vFade; varying float vD;
void main(){ vUv=uv; vFade=aFade; vec4 mv=modelViewMatrix*vec4(position,1.); vD=-mv.z; gl_Position=projectionMatrix*mv; }`;
const FALL_FS = `
uniform sampler2D uN; uniform float uTime,uOff,uFogNear,uFogFar; uniform vec3 uLight,uFog; varying vec2 vUv; varying float vFade; varying float vD;
void main(){
  float st=texture2D(uN,vec2(vUv.x*0.33+uOff,vUv.y*0.06-uTime*0.42)).r*0.6+texture2D(uN,vec2(vUv.x*0.85+uOff,vUv.y*0.17-uTime*0.8)).g*0.4;
  float edge=smoothstep(0.,0.3,vUv.x)*smoothstep(1.,0.7,vUv.x);
  float a=edge*smoothstep(0.2,0.55,st+0.22*edge)*vFade; if(a<0.01) discard;
  vec3 col=mix(vec3(0.55,0.72,0.76),vec3(0.96,0.98,0.99),smoothstep(0.38,0.72,st))*uLight;
  gl_FragColor=vec4(mix(col,uFog,smoothstep(uFogNear,uFogFar,vD)),a*0.94);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;
const SKY_FS = `
uniform sampler2D uSky; uniform float uRot,uGain; uniform vec3 uFogC; varying vec3 vP;
void main(){
  vec3 d=normalize(vP);
  vec2 uv=vec2(atan(d.z,d.x)*0.15915494+0.5+uRot, asin(clamp(d.y,-1.,1.))*0.31830989+0.5);
  vec3 col=texture2D(uSky,uv).rgb*uGain;
  col=mix(uFogC,col,smoothstep(-0.01,0.1,d.y));
  gl_FragColor=vec4(col,0.);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;
// ---------- Nachbearbeitung: Bloom, Sonnenstrahlen, Vignette ----------
const POST_VS = 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.,1.); }';
const BRIGHT_FS = `
uniform sampler2D tD; uniform vec2 uPx; uniform float uThr; varying vec2 vUv;
void main(){
  vec4 c=(texture2D(tD,vUv+uPx*vec2(-1.,-1.))+texture2D(tD,vUv+uPx*vec2(1.,-1.))+texture2D(tD,vUv+uPx*vec2(-1.,1.))+texture2D(tD,vUv+uPx*vec2(1.,1.)))*0.25;
  vec3 col=min(c.rgb,vec3(10.));
  float l=max(col.r,max(col.g,col.b));
  // rgb: was ueberstrahlt; a: freier, heller Himmel als Quelle der Sonnenstrahlen
  gl_FragColor=vec4(col*smoothstep(uThr,uThr+0.7,l),(1.-clamp(c.a,0.,1.))*smoothstep(0.25,0.95,l));
}`;
const BLUR_FS = `
uniform sampler2D tD; uniform vec2 uDir; varying vec2 vUv;
void main(){
  vec4 c=texture2D(tD,vUv)*0.227027;
  c+=(texture2D(tD,vUv+uDir*1.384615)+texture2D(tD,vUv-uDir*1.384615))*0.316216;
  c+=(texture2D(tD,vUv+uDir*3.230769)+texture2D(tD,vUv-uDir*3.230769))*0.070270;
  gl_FragColor=c;
}`;
// Umgebungsverdeckung aus der Tiefe. Es gibt keinen Normalenpuffer, also wird die Normale
// aus der Ableitung der wiedergewonnenen Position gebildet. Um jeden Punkt werden zwoelf
// Proben in einer Halbkugel genommen; liegt eine Probe naeher an der Kamera als die dort
// gemessene Tiefe, verdeckt sie. uRange begrenzt, wie weit eine Verdeckung reichen darf -
// sonst dunkelt ein naher Felsen den ganzen Hintergrund ab.
const AO_FS = `
precision highp float;
uniform sampler2D tDep; uniform vec2 uPx; uniform float uNear,uFar,uRadius,uBias,uRange,uTanHalf,uAspect;
varying vec2 vUv;
float linZ(float d){ float n=d*2.-1.; return 2.*uNear*uFar/(uFar+uNear-n*(uFar-uNear)); }
vec3 viewPos(vec2 uv){
  float z=linZ(texture2D(tDep,uv).r);
  vec2 n=uv*2.-1.;
  return vec3(n.x*uTanHalf*uAspect*z, n.y*uTanHalf*z, -z);
}
void main(){
  float d=texture2D(tDep,vUv).r;
  if(d>=0.9999){ gl_FragColor=vec4(1.); return; }           // Himmel wird nicht verdeckt
  vec3 p=viewPos(vUv);
  vec3 n=normalize(cross(dFdx(p),dFdy(p)));
  if(n.z<0.) n=-n;
  float ang=fract(sin(dot(gl_FragCoord.xy,vec2(12.9898,78.233)))*43758.5453)*6.2831853;
  float ca=cos(ang), sa=sin(ang);
  // Bildschirmradius aus dem Weltradius: was weiter weg ist, braucht weniger Pixel
  float r=uRadius/max(0.3,-p.z)/(2.*uTanHalf);
  float occ=0.;
  for(int i=0;i<12;i++){
    float fi=float(i);
    float a=fi*2.3999632+ang;                                 // goldener Winkel, gleichmaessig verteilt
    float rad=r*sqrt((fi+0.5)/12.);
    vec2 o=vec2(cos(a),sin(a))*rad;
    o.x/=uAspect;                                             // der Kreis soll rund bleiben
    vec2 suv=vUv+o;
    if(suv.x<0.||suv.x>1.||suv.y<0.||suv.y>1.) continue;
    vec3 sp=viewPos(suv);
    vec3 dir=sp-p;
    float len=length(dir);
    if(len<1e-4) continue;
    float ndl=max(0.,dot(n,dir/len)-uBias);
    occ+=ndl*(uRange/(uRange+len*len));                       // weit entfernte Proben zaehlen kaum
  }
  float ao=clamp(1.-occ/12.*2.6,0.,1.);
  // in der Ferne ausblenden: dort ist die Tiefe zu grob und es flimmert sonst
  ao=mix(ao,1.,smoothstep(28.,55.,-p.z));
  gl_FragColor=vec4(vec3(ao),1.);
}`;
const RAYS_FS = `
uniform sampler2D tD; uniform vec2 uSunPos; uniform float uAsp; uniform vec3 uCol; varying vec2 vUv;
void main(){
  vec2 st=(uSunPos-vUv)*(0.92/26.), p=vUv; float acc=0., w=1., ws=0.;
  for(int i=0;i<26;i++){
    p+=st;
    vec2 q=(p-uSunPos)*vec2(uAsp,1.);
    float inS=step(0.,p.x)*step(p.x,1.)*step(0.,p.y)*step(p.y,1.);
    acc+=texture2D(tD,p).a*exp(-dot(q,q)*2.6)*w*inS; ws+=w; w*=0.965;
  }
  gl_FragColor=vec4(uCol*acc/ws,1.);
}`;
// Kantenglaettung im Abschluss-Durchgang (FXAA): billiger als 4x-MSAA auf dem HDR-Ziel,
// das bei hohen Aufloesungen rund ein Viertel der Bildzeit gekostet hat.
const FINAL_FS = `
uniform sampler2D tD,tB1,tB2,tR,tAo; uniform float uBloom,uRays,uTime,uAA,uSharp,uAo; uniform vec2 uPx; varying vec2 vUv;
// Helligkeit nach Tonwertkurve: im HDR-Bild wuerde ein heller Himmel sonst jede Kante uebertoenen
float lum(vec3 c){ c=c/(1.+c); return dot(c,vec3(0.299,0.587,0.114)); }
vec3 fxaa(vec2 uv){
  vec3 m=texture2D(tD,uv).rgb;
  if(uAA<0.5) return m;
  vec3 nw=texture2D(tD,uv+vec2(-1.,-1.)*uPx).rgb, ne=texture2D(tD,uv+vec2(1.,-1.)*uPx).rgb,
       sw=texture2D(tD,uv+vec2(-1.,1.)*uPx).rgb, se=texture2D(tD,uv+vec2(1.,1.)*uPx).rgb;
  float lnw=lum(nw),lne=lum(ne),lsw=lum(sw),lse=lum(se),lm=lum(m);
  float lo=min(lm,min(min(lnw,lne),min(lsw,lse))), hi=max(lm,max(max(lnw,lne),max(lsw,lse)));
  if(hi-lo<max(0.035,hi*0.145)) return m;                       // ebene Flaeche: nichts zu glaetten
  vec2 dir=vec2(-((lnw+lne)-(lsw+lse)),(lnw+lsw)-(lne+lse));
  float red=max((lnw+lne+lsw+lse)*0.03125,0.0078125);
  float sc=1./(min(abs(dir.x),abs(dir.y))+red);
  dir=clamp(dir*sc,-8.,8.)*uPx;
  vec3 a=0.5*(texture2D(tD,uv+dir*(1./3.-0.5)).rgb+texture2D(tD,uv+dir*(2./3.-0.5)).rgb);
  vec3 b=a*0.5+0.25*(texture2D(tD,uv-dir*0.5).rgb+texture2D(tD,uv+dir*0.5).rgb);
  float lb=lum(b);
  return (lb<lo||lb>hi)?a:b;
}
void main(){
  vec3 c=fxaa(vUv);
  // Wird unterhalb der Schirmaufloesung gerendert, zieht das Hochskalieren das Bild weich.
  // Ein leichtes Nachschaerfen davor holt die Kanten zurueck und kostet vier Abgriffe.
  if(uSharp>0.001){
    vec3 r=(texture2D(tD,vUv+vec2(uPx.x,0.)).rgb+texture2D(tD,vUv-vec2(uPx.x,0.)).rgb
           +texture2D(tD,vUv+vec2(0.,uPx.y)).rgb+texture2D(tD,vUv-vec2(0.,uPx.y)).rgb)*0.25;
    c=max(vec3(0.),c+(c-r)*uSharp);
  }
  // Verdeckung wirkt auf das Bild, bevor Bloom und Strahlen daraufkommen: Licht darf
  // eine Ecke ueberstrahlen, aber eine Ecke darf das Licht nicht schlucken.
  if(uAo>0.5) c*=mix(1.,texture2D(tAo,vUv).r,0.85);
  c+=(texture2D(tB1,vUv).rgb*0.55+texture2D(tB2,vUv).rgb*0.45)*uBloom;
  c+=texture2D(tR,vUv).rgb*uRays;
  vec2 q=vUv-0.5; c*=1.-dot(q,q)*0.38;
  gl_FragColor=vec4(c,1.);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  gl_FragColor.rgb+=(fract(sin(dot(gl_FragCoord.xy+uTime*60.,vec2(12.9898,78.233)))*43758.5453)-0.5)/255.;
}`;
const MIST_VS = 'attribute float aK; varying float vK; varying vec3 vW; void main(){ vK=aK; vec4 w=modelMatrix*vec4(position,1.); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }';
const MIST_FS = `
uniform sampler2D uN; uniform float uTime,uOp,uOff; uniform vec3 uCol; varying float vK; varying vec3 vW;
void main(){
  vec2 p=vW.xz*0.035+uOff;
  float n=texture2D(uN,p+vec2(0.004,0.011)*uTime).r*0.6+texture2D(uN,p*2.3-vec2(0.007,-0.016)*uTime).r*0.4;
  float dc=length(cameraPosition-vW);
  float a=smoothstep(0.36,0.74,n)*uOp*vK*smoothstep(2.5,10.,dc)*(1.-smoothstep(110.,190.,dc));
  gl_FragColor=vec4(uCol,a);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;
const SKY = {
  mittag: { u: 0.5938, el: 0.847, hor: [0.6, 0.631, 0.706], mid: [0.424, 0.502, 0.671] },
  morgen: { u: 0.5996, el: 0.368, hor: [0.722, 0.765, 0.792], mid: [0.502, 0.608, 0.733] },
  abend: { u: 0.584, el: 0.319, hor: [0.647, 0.573, 0.627], mid: [0.651, 0.643, 0.757] },
  bedeckt: { u: 0.582, el: 0.393, hor: [0.529, 0.549, 0.588], mid: [0.643, 0.667, 0.714] },
};

const SUNS = {
  morgen: { dir: [0.55, 0.34, -0.76], cloud: 0.5 }, mittag: { dir: [-0.32, 0.86, -0.4], cloud: 0.44 },
  abend: { dir: [-0.68, 0.27, -0.68], cloud: 0.5 }, bedeckt: { dir: [-0.2, 0.9, -0.3], cloud: 0.9 },
};

export class World {
  constructor(canvas) {
    // Kein MSAA am Bildschirmpuffer: geglaettet wird im Abschluss-Durchgang (FXAA)
    const R = this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
    this.mobile = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
    this.hi = true;
    R.toneMapping = THREE.ACESFilmicToneMapping; R.toneMappingExposure = 1.02;
    // Bildbasiertes Licht: der Himmel beleuchtet die Szene selbst, statt dass ein
    // Halbkugellicht ihn mit zwei Farben nachstellt. Die Himmelsbilder liegen ohnehin
    // schon als Kugelprojektion vor; PMREM macht daraus eine vorgefilterte Umgebung.
    this.pmrem = new THREE.PMREMGenerator(R);
    this.envMaps = {}; this.envK = 1; this.envOn = true;
    R.shadowMap.enabled = true; R.shadowMap.type = THREE.PCFShadowMap;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(60, 1, 0.1, 1200);
    this.scene.fog = new THREE.Fog(0xcfe8f0, 25, 230);
    this.hemi = new THREE.HemisphereLight(0xdcecff, 0x55683a, 1.5);
    this.sun = new THREE.DirectionalLight(0xfff1dc, 3.0);
    this.sun.castShadow = true;
    // Engere Schattenkamera (40 statt 52 m) bei kleinerer Karte: gleiche Kantenschaerfe, weniger zu zeichnen.
    // Dazu einfaches PCF statt weichem - der Unterschied faellt bei dieser Texeldichte kaum auf.
    const sh = this.sun.shadow, SM = this.mobile ? 1024 : 1536; sh.mapSize.set(SM, SM);
    sh.camera.left = -20; sh.camera.right = 20; sh.camera.top = 20; sh.camera.bottom = -20; sh.camera.near = 1; sh.camera.far = 150;
    sh.bias = -0.0006; sh.normalBias = 0.05;
    this.sunDir = new THREE.Vector3(-0.3, 0.85, -0.4).normalize();
    this.scene.add(this.hemi, this.sun, this.sun.target);

    this.timeU = { value: 0 };
    this.noiseTex = makeNoiseTex();
    // Staerke der Kaustiken, haengt am Licht des Reviers. Liegt hier und nicht im Revieraufbau,
    // weil Fischmaterialien ueber Reviergrenzen hinweg bestehen bleiben.
    this.causticU = { value: 1 };
    // Schneedecke: 0 im Sommer, 1 im Winter. Liegt neben den Kaustiken, weil dieselben
    // Materialien betroffen sind und sie ueber Reviergrenzen hinweg bestehen bleiben.
    this.snowU = { value: 0 };
    // Staerke der Fussverschattung beim Bodenbewuchs, zum Abstimmen zur Laufzeit
    this.aoU = { value: 0.45 };
    const TL = this.loader = new THREE.TextureLoader();
    const load = (f, srgb) => { const t = TL.load('assets/' + f); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; if (srgb) t.colorSpace = THREE.SRGBColorSpace; return t; };
    const loadA = f => { const t = TL.load('assets/' + f); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; };   // freigestellte Fotos (Poly Haven, CC0)
    this.tex = { grass: load('grass_d.jpg', 1), grassN: load('grass_n.jpg'), peb: load('peb_d.jpg', 1), pebN: load('peb_n.jpg'), cliff: load('cliff_d.jpg', 1), cliffN: load('cliff_n.jpg'),
      rock: load('rock_d.jpg', 1), rockN: load('rock_n.jpg'), bark: load('bark_d.jpg', 1), barkN: load('bark_n.jpg'), tuft: loadA('tuft.png'), branch: loadA('branch.png'), leaf: loadA('leaf.png'), fern: loadA('fern.png'), reed: loadA('reed.png'), twig: twigTex() };
    this.skyTex = {};
    this.skyU = { uSky: { value: null }, uRot: { value: 0 }, uGain: { value: 1.2 }, uFogC: { value: new THREE.Color() } };
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(900, 48, 24), new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false, uniforms: this.skyU,
      vertexShader: 'varying vec3 vP; void main(){vP=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}', fragmentShader: SKY_FS,
    }));
    // zuletzt zeichnen, nicht zuerst: so laeuft der Himmels-Shader nur ueber die Pixel, die frei geblieben sind,
    // statt ueber den ganzen Schirm, der danach ohnehin uebermalt wird
    this.sky.renderOrder = 10; this.scene.add(this.sky);

    this.env = new THREE.Group(); this.scene.add(this.env);
    this.fishGroup = new THREE.Group(); this.scene.add(this.fishGroup);
    this.fishMats = {};   // je Art ein Material mit eigener Haut
    this.fishGeos = {};

    this.waterU = {
      uN: { value: this.noiseTex }, uSkyT: this.skyU.uSky, uRot: this.skyU.uRot, uGain: this.skyU.uGain, uTime: this.timeU, uClear: { value: 0 }, uMurk: { value: 0 }, uSun: { value: 1 },
      uShallow: { value: new THREE.Color() }, uDeep: { value: new THREE.Color() }, uSkyTop: { value: new THREE.Color() }, uSkyBot: { value: new THREE.Color() },
      uFog: { value: new THREE.Color() }, uFogNear: { value: 25 }, uFogFar: { value: 230 }, uSunDir: { value: this.sunDir }, uSunCol: { value: new THREE.Color(1, 0.95, 0.85) }, uBankCol: { value: new THREE.Color() },
      uRefl: { value: null }, uScene: { value: null }, uDepthT: { value: null }, uFx: { value: 0 }, uNear: { value: 0.1 }, uFar: { value: 1200 },
      uNoRefl: { value: 0 }, uInv: { value: new THREE.Vector2(1, 1) }, uWader: { value: new THREE.Vector4(0, 0, 0, 0) },
    };
    // Wasser-Effekte: Spiegelbild (gespiegelte Kamera) und Szene unter Wasser (Farbe + Tiefe) in eigene Ziele rendern
    this.fxWater = true; this.mirror = new THREE.PerspectiveCamera(); this.clipUp = [new THREE.Plane(new THREE.Vector3(0, 1, 0), 0.04)]; this.noClip = [];
    this._slow = 0;
    // Aufloesungsregler: rs ist der Faktor auf die Renderskala, rsCeil die Decke, bis zu der er sich wieder hocharbeiten darf
    this.rs = 1; this.rsAuto = true; this._rsCeil = 1; this._rsAcc = []; this._rsCool = 120; this._rsGood = 0; this._rsBad = 0; this._rsWas = 0;
    // Nachbearbeitung
    this.fxPost = true; this.rayK = 0.5;
    this.pScene = new THREE.Scene(); this.pCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.pQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2)); this.pQuad.frustumCulled = false; this.pScene.add(this.pQuad);
    const pm = (fs, u) => new THREE.ShaderMaterial({ uniforms: u, vertexShader: POST_VS, fragmentShader: fs, depthTest: false, depthWrite: false });
    this.pm = {
      bright: pm(BRIGHT_FS, { tD: { value: null }, uPx: { value: new THREE.Vector2() }, uThr: { value: 1.25 } }),
      blur: pm(BLUR_FS, { tD: { value: null }, uDir: { value: new THREE.Vector2() } }),
      rays: pm(RAYS_FS, { tD: { value: null }, uSunPos: { value: new THREE.Vector2(0.5, 0.8) }, uAsp: { value: 1 }, uCol: { value: new THREE.Color(1, 0.95, 0.85) } }),
      ao: pm(AO_FS, { tDep: { value: null }, uPx: { value: new THREE.Vector2() }, uNear: { value: 0.1 }, uFar: { value: 500 },
        uRadius: { value: 0.45 }, uBias: { value: 0.035 }, uRange: { value: 0.9 }, uTanHalf: { value: 0.5 }, uAspect: { value: 1 } }),
      final: pm(FINAL_FS, { tD: { value: null }, tB1: { value: null }, tB2: { value: null }, tR: { value: null }, tAo: { value: null }, uAo: { value: 0 }, uBloom: { value: 0.38 }, uRays: { value: 0 }, uTime: this.timeU, uAA: { value: 1 }, uSharp: { value: 0 }, uPx: { value: new THREE.Vector2() } }),
    };
    // Umgebungsverdeckung: aus, bis der Spieler sie einschaltet
    this.aoOn = false;
    this.buildAngler();
    this.buildRig();
    this.buildFx();
    this.ray = new THREE.Raycaster();
    this.plane = new THREE.Plane(UP, 0);
    this.camZ = 0; this.camX = LANE_X;
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  setPov(on) { this.pov = !!on; this.resize(); }

  setQuality(hi) {
    // auch sparsam bleibt die Nachbearbeitung an: sie glaettet die Kanten (FXAA), nur Bloom und Strahlen entfallen
    this.hi = hi; this.fxWater = hi; this.fxPost = true; this._cheap = !hi; this._slow = 0;
    this.renderer.shadowMap.enabled = hi; this.sun.castShadow = hi;
    this.scene.traverse(o => { if (o.material) o.material.needsUpdate = true; });
    if (this.grass) this.grass.visible = hi;
    if (this.mist) this.mist.visible = hi;
    this.resize();
  }

  // Deckel nach Pixelflaeche statt nach Geraetedichte: ein 4K-Schirm ergaebe sonst acht Millionen Pixel,
  // und die Bildzeit haengt fast genau an der Pixelzahl.
  maxPixels() { return this.hi ? (this.mobile ? 1.2e6 : 2.3e6) : (this.mobile ? 0.8e6 : 1.4e6); }

  // Grafikstufe: 'auto' regelt die Aufloesung selbst, die uebrigen stellen sie fest ein
  setGfxMode(m) {
    this.gq = m = ['auto', 'hoch', 'mittel', 'niedrig'].includes(m) ? m : 'auto';
    this.rsAuto = m === 'auto';
    this.rs = m === 'mittel' ? 0.75 : m === 'niedrig' ? 0.65 : 1;
    this._rsCeil = 1; this._rsGood = 0;
    this.setQuality(m !== 'niedrig');   // ruft resize()
  }

  setScale(s) {
    s = Math.max(0.75, Math.min(this._rsCeil, Math.round(s * 20) / 20));   // unter 75 % wird das hochskalierte Bild sichtbar weich
    if (Math.abs(s - this.rs) < 0.001) return false;
    this.rs = s; this._rsCool = 20; this._rsAcc = []; this._rsGood = 0;
    this.resize();
    return true;
  }

  // Haelt die Bildzeit nahe an 60 Bildern je Sekunde, indem die Renderskala in Stufen nachgefuehrt wird.
  // Das ist der sanfteste Hebel: die Bildzeit haengt fast genau an der Pixelzahl, und das HUD bleibt scharf, weil es HTML ist.
  _autoScale() {
    const now = performance.now(), ms = now - (this._rsLast || now); this._rsLast = now;
    if (!this.rsAuto) return;
    if (this._rsCool > 0) { this._rsCool--; return; }
    if (ms > 200 || ms <= 0) return;   // Ladehaenger, Dialoge und Revierwechsel nicht mitzaehlen
    const a = this._rsAcc; a.push(ms);
    if (a.length < 45) return;         // Fenster von rund einer Dreiviertelsekunde
    // Gezaehlt wird, wie viele Bilder wirklich ankommen. Mittelwerte und Mediane der Bildabstaende taeuschen hier:
    // ein ausgelassenes Bild haelt den Takt des Schirms, 16,7 ms bleiben der haeufigste Abstand, und trotzdem sind
    // es nur noch 45 Bilder je Sekunde. Ein einzelner Haenger wird auf 50 ms gedeckelt, damit er das Fenster nicht kippt.
    let sum = 0; for (const v of a) sum += Math.min(50, v);
    const fps = a.length * 1000 / sum; a.length = 0;
    if (fps < 54) {
      this._rsGood = 0;
      if (++this._rsBad < 2) return;   // zwei schlechte Fenster, erst dann absenken
      this._rsBad = 0;
      // Hat die letzte Absenkung etwas gebracht? Wenn nicht, liegt es nicht an den Pixeln, sondern am Rechner
      // (anderes Fenster im Vordergrund, Rechenlast, gedrosselte Grafik). Dann zurueck und eine Weile Ruhe geben,
      // sonst frisst sich der Regler bis zum Anschlag hinunter und das Bild wird weich, ohne dass es schneller wird.
      if (this._rsWas && fps < this._rsWas + 3) {
        this._rsCeil = Math.min(1, this._rsCeil + 0.1); this.setScale(this.rs + 0.1);
        this._rsCool = 900; this._rsWas = 0; return;   // rund 15 s Ruhe, dann darf er es wieder versuchen
      }
      this._rsWas = fps;
      if (this.setScale(this.rs - 0.1)) this._rsCeil = Math.min(1, this.rs + 0.05);   // nur knapp unter den Punkt zurueck, an dem es geruckelt hat
    } else {
      this._rsBad = 0; this._rsWas = 0;
      if (fps > 58) {
        this._rsCeil = Math.min(1, this._rsCeil + 0.05);   // die Decke waechst wieder, sonst haengt ein alter Haenger dem Spiel ewig nach
        if (this.rs < this._rsCeil && ++this._rsGood >= 2) this.setScale(this.rs + 0.05);   // zwei ruhige Fenster, erst dann hinauf
      } else this._rsGood = 0;
    }
  }

  resize() {
    const w = window.innerWidth, h = window.innerHeight;
    const dpr = window.devicePixelRatio || 1;
    // Untergrenze 0.5: auf einem 4K-Schirm bleibt damit noch volles HD, hochskaliert und von FXAA geglaettet
    const fit = Math.sqrt(this.maxPixels() / Math.max(1, w * h));
    const base = Math.max(0.5, Math.min(dpr, this.mobile ? 1.75 : 2, fit));
    this.renderer.setPixelRatio(Math.max(0.35, base * this.rs));
    this.renderer.setSize(w, h, false);
    const asp = w / h;
    this.camera.aspect = asp;
    let vf = 50;
    if (asp < 1.25) vf = Math.min(78, 2 * Math.atan(Math.tan(30 * Math.PI / 180) / asp) * 180 / Math.PI);
    this.camera.fov = Math.max(50, vf) + (this.pov ? 14 : 0);   // aus den Augen des Anglers etwas weitwinkliger
    this.camera.updateProjectionMatrix();
    this.portrait = asp < 1;
    this.makeTargets();
  }

  makeTargets() {
    const sz = this.renderer.getDrawingBufferSize(new THREE.Vector2()), U = this.waterU;
    if (!U) return;
    U.uInv.value.set(1 / sz.x, 1 / sz.y);
    // Unterwasserbild und Spiegelbild brauchen keine volle Schaerfe: das eine wird gebrochen und eingefaerbt,
    // das andere auf bewegtem Wasser verzerrt. Gemessen kosteten beide Durchgaenge zusammen 6,4 ms bei 6,3 Megapixeln.
    // Zusaetzlich ein fester Deckel, damit sie auf grossen Schirmen nicht mitwachsen.
    const ks = this.mobile ? 0.4 : 0.5, kr = this.mobile ? 0.3 : 0.35, cap = this.mobile ? 0.5e6 : 1.1e6;
    const lim = Math.min(1, Math.sqrt(cap / Math.max(1, sz.x * sz.y)));
    const mk = (k0, depth) => {
      const k = Math.min(k0, lim);
      const w = Math.max(64, Math.round(sz.x * k)), h = Math.max(64, Math.round(sz.y * k));
      const rt = new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, generateMipmaps: false });
      if (depth) { rt.depthTexture = new THREE.DepthTexture(w, h); rt.depthTexture.minFilter = rt.depthTexture.magFilter = THREE.NearestFilter; }
      return rt;
    };
    if (this.sceneRT) { this.sceneRT.dispose(); this.reflRT.dispose(); }
    this.sceneRT = mk(ks, true); this.reflRT = mk(kr, false);
    U.uScene.value = this.sceneRT.texture; U.uDepthT.value = this.sceneRT.depthTexture; U.uRefl.value = this.reflRT.texture;
    // Hauptbild (HDR, kantengeglaettet) und kleine Ziele fuer Bloom / Strahlen
    if (this.mainRT) for (const t of [this.mainRT, ...this.pRT]) t.dispose();
    const opt = { type: THREE.HalfFloatType, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, generateMipmaps: false };
    // MSAA nur, solange es billig ist; darueber uebernimmt FXAA im Abschluss-Durchgang
    const px = sz.x * sz.y;
    this.pm.final.uniforms.uPx.value.set(1 / sz.x, 1 / sz.y);
    // Gemessen: schon bei 1,7 Megapixeln kostet zweifaches MSAA auf dem Halbgleitkomma-Ziel rund 8 ms,
    // FXAA dagegen unter 0,5 ms. MSAA bleibt nur fuer kleine Fenster, wo es die Kanten sauberer trennt.
    // Mit eingeschalteter Verdeckung faellt MSAA weg: die Tiefe liesse sich sonst nicht lesen,
    // und ein Schalter, der in kleinen Fenstern stumm bleibt, ist schlimmer als kein Schalter.
    const ms = (this.aoOn || px > 0.9e6) ? 0 : 4;
    this.pm.final.uniforms.uAA.value = ms ? 0 : 1;
    // Wird kleiner gerendert als der Schirm darstellt - durch den Flaechendeckel oder den Regler -, davor nachschaerfen
    const up = this.renderer.getPixelRatio() / (window.devicePixelRatio || 1);
    this.pm.final.uniforms.uSharp.value = up < 0.99 ? Math.min(0.5, (1 - up) * 1.6) : 0;
    this.mainRT = new THREE.WebGLRenderTarget(sz.x, sz.y, { ...opt, samples: ms });
    // Die Verdeckung liest die Tiefe des Hauptbildes. Bei MSAA laesst sie sich nicht sauber
    // aufloesen, deshalb gibt es die Tiefentextur nur ohne MSAA - also ab 0,9 Megapixeln,
    // und damit ueberall dort, wo die Verdeckung ueberhaupt in Frage kommt.
    this.aoReady = !ms;
    if (this.aoReady) { const dt = new THREE.DepthTexture(sz.x, sz.y); dt.minFilter = dt.magFilter = THREE.NearestFilter; this.mainRT.depthTexture = dt; }
    const q = k => new THREE.WebGLRenderTarget(Math.max(32, Math.round(sz.x / k)), Math.max(32, Math.round(sz.y / k)), { ...opt, depthBuffer: false });
    this.pRT = [q(4), q(4), q(8), q(8), q(4)];   // hell, Zwischenbild, klein a/b, Strahlen
    if (this.aoRT) { this.aoRT.dispose(); this.aoRT2.dispose(); }
    // halbe Kantenlaenge: ein Viertel der Pixel, danach weichgezeichnet - Verdeckung ist grossflaechig
    const half = k => new THREE.WebGLRenderTarget(Math.max(32, Math.round(sz.x / 2)), Math.max(32, Math.round(sz.y / 2)), { type: THREE.UnsignedByteType, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, generateMipmaps: false, depthBuffer: false });
    this.aoRT = half(); this.aoRT2 = half();
    const A = this.pm.ao.uniforms;
    A.uPx.value.set(2 / sz.x, 2 / sz.y); A.uAspect.value = sz.x / sz.y;
  }

  buildAngler() {
    const root = new THREE.Group(), body = new THREE.Group();
    body.position.y = -0.56; root.add(body);
    // Stoffstruktur (Gewebe) als Relief fuer Kleidung
    const weave = canvasTex(128, (c, S) => {
      c.fillStyle = '#808080'; c.fillRect(0, 0, S, S);
      for (let y = 0; y < S; y += 4) for (let x = 0; x < S; x += 4) {
        const v = 110 + Math.floor(Math.random() * 50) + (((x + y) / 4) & 1 ? 26 : -26);
        c.fillStyle = `rgb(${v},${v},${v})`; c.fillRect(x, y, 4, 4);
      }
    });
    const M = (c, r = 0.85, m = 0) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: m });
    const cloth = (c, r, rep = 7, bs = 1.4) => { const m = M(c, r); const t = weave.clone(); t.repeat.set(rep, rep); t.needsUpdate = true; m.bumpMap = t; m.bumpScale = bs; return m; };
    const wader = cloth(0x77745c, 0.8, 9), waderWet = cloth(0x4a493a, 0.38, 9, 0.8), jacket = cloth(0x3d5560, 0.92, 8), fleece = cloth(0x33464f, 1, 5, 2.2),
      skin = M(0xc59373, 0.62), cap = cloth(0x5a6040, 0.95, 6), pack = cloth(0x45463a, 0.9, 6), packLt = cloth(0x5d5e4e, 0.9, 6),
      wood = M(0x8a5a30, 0.5), boot = M(0x3a352d, 0.85), rubber = M(0x191817, 0.7), dark = M(0x15171a, 0.25, 0.3), buff = cloth(0x8c4a38, 0.95, 5),
      hair = M(0x35281d, 1), beard = M(0x54422f, 1), strap = M(0x26282a, 0.75), metal = M(0xb4b8bc, 0.3, 0.9), felt = M(0x8f8d80, 1), lace = M(0xb9b29a, 0.9), neo = M(0x2a2c2b, 0.95);
    const add = (par, geo, mat, x, y, z, rx = 0, ry = 0, rz = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); m.castShadow = true; par.add(m); return m; };
    const lathe = (pts, seg = 22) => new THREE.LatheGeometry(pts.map(q => new THREE.Vector2(q[0], q[1])), seg);
    // Sohle: Fussumriss, Zehen zeigen nach -z
    const soleShape = new THREE.Shape();
    soleShape.moveTo(0, -0.1); soleShape.bezierCurveTo(0.042, -0.1, 0.046, -0.04, 0.042, 0.01); soleShape.bezierCurveTo(0.06, 0.07, 0.056, 0.165, 0, 0.17);
    soleShape.bezierCurveTo(-0.056, 0.165, -0.06, 0.07, -0.042, 0.01); soleShape.bezierCurveTo(-0.046, -0.04, -0.042, -0.1, 0, -0.1);
    const soleGeo = new THREE.ExtrudeGeometry(soleShape, { depth: 0.022, bevelEnabled: true, bevelSize: 0.005, bevelThickness: 0.005, bevelSegments: 2, curveSegments: 10 }).rotateX(-Math.PI / 2);
    // Beine mit Hueft- und Kniegelenk
    this.legs = [-1, 1].map(sx => {
      const hip = new THREE.Group(); hip.position.set(sx * 0.1, 0.94, 0); body.add(hip);
      add(hip, lathe([[0, -0.46], [0.066, -0.455], [0.074, -0.36], [0.088, -0.2], [0.097, -0.07], [0.092, 0.02], [0, 0.05]], 14), wader, 0, 0, 0).scale.set(1, 1, 1.08);   // Oberschenkel
      const knee = new THREE.Group(); knee.position.set(0, -0.45, 0); hip.add(knee);
      add(knee, new THREE.SphereGeometry(0.073, 12, 10), wader, 0, 0, -0.004);
      add(knee, lathe([[0, -0.4], [0.056, -0.395], [0.058, -0.3], [0.07, -0.16], [0.076, -0.09], [0.07, -0.01], [0, 0.02]], 14), wader, 0, 0, 0.006).scale.set(1, 1, 1.1); // Wade
      add(knee, lathe([[0.059, -0.31], [0.0605, -0.3], [0.068, -0.2], [0.0745, -0.13]], 14), waderWet, 0, 0, 0.006).scale.set(1, 1, 1.1);                                   // nasser Bereich ueber dem Schuh
      add(knee, new THREE.CylinderGeometry(0.069, 0.079, 0.1, 14, 1, true), neo, 0, -0.355, 0.004);                                                                         // Gravel Guard
      // Watschuh
      add(knee, new THREE.CapsuleGeometry(0.062, 0.07, 4, 12), boot, 0, -0.415, 0.012).scale.set(1, 1, 1.1);                                                                // Schaft
      add(knee, new THREE.SphereGeometry(1, 14, 10), boot, 0, -0.452, -0.062).scale.set(0.054, 0.042, 0.1);                                                                 // Rist
      add(knee, new THREE.SphereGeometry(1, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), rubber, 0, -0.468, -0.128, -0.25).scale.set(0.054, 0.04, 0.05);                      // Zehenkappe
      add(knee, new THREE.SphereGeometry(1, 10, 8), rubber, 0, -0.455, 0.07).scale.set(0.05, 0.04, 0.035);                                                                  // Fersenkappe
      for (let k = 0; k < 4; k++) add(knee, new THREE.BoxGeometry(0.05 - k * 0.003, 0.006, 0.008), lace, 0, -0.418 - k * 0.012, -0.062 - k * 0.022, -0.45);                 // Schnuerung
      add(knee, soleGeo, rubber, 0, -0.512, 0.02);
      add(knee, soleGeo, felt, 0, -0.52, 0.02).scale.set(0.94, 0.4, 0.96);                                                                                                  // Filzsohle
      return { hip, knee, sx };
    });
    add(body, new THREE.SphereGeometry(1, 18, 12), wader, 0, 0.9, 0.008).scale.set(0.172, 0.105, 0.118);                                                                     // Becken
    // Rumpf
    this.torso = new THREE.Group(); this.torso.position.y = 0.96; body.add(this.torso);
    const T = this.torso;
    add(T, lathe([[0, -0.1], [0.13, -0.09], [0.166, -0.02], [0.172, 0.07], [0.166, 0.17], [0.182, 0.3], [0.2, 0.41], [0.196, 0.47], [0.15, 0.535], [0.085, 0.565], [0.06, 0.575], [0, 0.578]]), jacket, 0, 0, 0).scale.set(1.04, 1, 0.66);
    add(T, new THREE.CapsuleGeometry(0.074, 0.29, 6, 14), jacket, 0, 0.482, 0.008, 0, 0, Math.PI / 2).scale.set(1, 1, 0.98);                                                // Schultern
    add(T, new THREE.SphereGeometry(1, 14, 10), fleece, 0, 0.5, 0.088).scale.set(0.105, 0.07, 0.04);                                                                       // Kapuze im Nacken
    add(T, new THREE.TorusGeometry(0.066, 0.02, 8, 18), fleece, 0, 0.585, 0.004, Math.PI / 2).scale.set(1, 0.9, 1);                                                         // Kragen
    add(T, lathe([[0, -0.11], [0.14, -0.1], [0.176, -0.02], [0.183, 0.07], [0.176, 0.17], [0.19, 0.3], [0.192, 0.345], [0.184, 0.35]]), wader, 0, 0, 0).scale.set(1.04, 1, 0.685);   // Wathose bis zur Brust
    add(T, new THREE.TorusGeometry(0.19, 0.008, 6, 28), strap, 0, 0.345, 0, Math.PI / 2).scale.set(1.04, 0.685, 1);                                                         // Saum
    add(T, new THREE.CylinderGeometry(0.187, 0.185, 0.042, 22, 1, true), strap, 0, 0.085, 0).scale.set(1.045, 1, 0.7);                                                      // Watguertel
    add(T, new THREE.BoxGeometry(0.05, 0.05, 0.014), rubber, 0, 0.085, -0.134);                                                                                             // Schnalle
    for (const sx of [-1, 1]) {
      add(T, new THREE.BoxGeometry(0.034, 0.26, 0.012), strap, sx * 0.085, 0.455, -0.112, 0.27);                                                                            // Traeger vorn
      add(T, new THREE.BoxGeometry(0.04, 0.03, 0.016), metal, sx * 0.09, 0.345, -0.134);
      add(T, new THREE.BoxGeometry(0.034, 0.36, 0.012), strap, sx * 0.03, 0.44, 0.128, -0.2, 0, sx * 0.42);                                                                 // Traeger hinten, gekreuzt
    }
    // Brusttasche mit Zubehoer
    const gear0 = T.children.length;
    add(T, new THREE.CapsuleGeometry(0.052, 0.1, 4, 12), pack, 0, 0.275, -0.16, 0, 0, Math.PI / 2).scale.set(1.15, 1, 0.72);
    add(T, new THREE.BoxGeometry(0.15, 0.006, 0.01), rubber, 0, 0.31, -0.198);                                                                                              // Reissverschluss
    add(T, new THREE.BoxGeometry(0.06, 0.045, 0.012), packLt, -0.045, 0.262, -0.2);                                                                                         // Fliegenpatch
    for (let k = 0; k < 3; k++) add(T, new THREE.CylinderGeometry(0.017, 0.017, 0.011, 12), k === 1 ? metal : M(0x2f6f9f, 0.5), 0.062, 0.225, -0.2 - k * 0.012, Math.PI / 2); // Tippetspulen
    add(T, new THREE.CylinderGeometry(0.004, 0.004, 0.09, 5), metal, 0.1, 0.25, -0.17, 0, 0, 0.15);                                                                         // Zange
    add(T, new THREE.BoxGeometry(0.034, 0.5, 0.012), strap, 0.035, 0.36, -0.118, 0.12, 0, -0.62);                                                                           // Sling-Gurt quer ueber die Brust
    // Ruecken: Sling-Pack und Kescher am Magnet
    add(T, new THREE.CapsuleGeometry(0.078, 0.2, 6, 14), pack, 0.03, 0.27, 0.158, 0, 0, 0.42).scale.set(1.25, 0.9, 0.62);
    add(T, new THREE.CapsuleGeometry(0.05, 0.1, 4, 10), packLt, 0.035, 0.25, 0.2, 0, 0, 0.42).scale.set(1.15, 0.9, 0.42);                                                     // Aussentasche
    // Kescher: Holzrahmen in Tropfenform, Griff mit Korkwicklung, gummiertes Netz; haengt am Magnet zwischen den Schulterblaettern
    const net = new THREE.Group(); net.position.set(-0.115, 0.4, 0.15); net.rotation.set(-0.07, 0, 0.16); T.add(net); this.backNet = net;
    const NW = 0.27, NL = 0.4, HL = 0.2;
    const hoopAt = a => new THREE.Vector3(NW / 2 * Math.sin(a) * (1 - 0.35 * Math.cos(a)) / 1.06, -HL - NL * (1 - Math.cos(a)) / 2, 0);
    const hoopPts = []; for (let k = 0; k < 40; k++) hoopPts.push(hoopAt(k / 40 * Math.PI * 2));
    add(net, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(hoopPts, true), 80, 0.0095, 8, true), wood, 0, 0, 0);
    add(net, new THREE.CylinderGeometry(0.0125, 0.016, HL, 10), wood, 0, -HL / 2, 0);                                   // Griff
    add(net, new THREE.CylinderGeometry(0.0175, 0.0175, 0.1, 12), M(0xb98f5e, 0.95), 0, -0.07, 0);                     // Korkwicklung
    add(net, new THREE.SphereGeometry(0.02, 10, 8), wood, 0, -HL - 0.006, 0).scale.set(1.5, 1, 0.7);                   // Joch
    add(net, new THREE.SphereGeometry(0.014, 10, 8), metal, 0, 0.004, 0);                                              // Magnetkappe
    add(net, new THREE.TorusGeometry(0.012, 0.0025, 6, 14), metal, 0, 0.02, 0);                                        // Oese
    // Netzsack: haengt vom Rahmen nach unten, Maschen als Textur
    const meshTex = canvasTex(128, (c, S) => {
      c.clearRect(0, 0, S, S); c.strokeStyle = '#1b211c'; c.lineWidth = 5;
      for (let k = 0; k <= 4; k++) { c.beginPath(); c.moveTo(k * S / 4, 0); c.lineTo(k * S / 4, S); c.stroke(); c.beginPath(); c.moveTo(0, k * S / 4); c.lineTo(S, k * S / 4); c.stroke(); }
    }, true);
    meshTex.repeat.set(9, 5);
    const NU = 32, NV = 10, bp = [], bu = [], bi = [], low = new THREE.Vector3(0, -HL - NL - 0.2, 0.035);
    for (let v = 0; v <= NV; v++) for (let u = 0; u <= NU; u++) {
      const t = v / NV, q = hoopAt(u / NU * Math.PI * 2), k = Math.pow(t, 1.4);
      q.lerp(low, k); q.z += Math.sin(Math.PI * t) * 0.03 * (0.4 + 0.6 * Math.abs(Math.sin(u / NU * Math.PI * 2)));   // leicht bauchig
      bp.push(q.x, q.y, q.z); bu.push(u / NU, t);
    }
    for (let v = 0; v < NV; v++) for (let u = 0; u < NU; u++) { const a = v * (NU + 1) + u, b = a + NU + 1; bi.push(a, b, a + 1, a + 1, b, b + 1); }
    const bagGeo = new THREE.BufferGeometry(); bagGeo.setAttribute('position', new THREE.Float32BufferAttribute(bp, 3)); bagGeo.setAttribute('uv', new THREE.Float32BufferAttribute(bu, 2)); bagGeo.setIndex(bi); bagGeo.computeVertexNormals();
    add(net, bagGeo, new THREE.MeshLambertMaterial({ map: meshTex, alphaTest: 0.5, side: THREE.DoubleSide }), 0, 0, 0);
    for (let i = gear0; i < T.children.length; i++) { const c = T.children[i], keep = !(c.geometry && c.geometry.parameters.height === 0.5); c.traverse(m => { m.userData.gear = keep; }); }   // bleibt auch an der geladenen Figur sichtbar
    // Hals & Kopf
    add(T, lathe([[0.066, 0.545], [0.056, 0.6], [0.05, 0.65]], 14), skin, 0, 0, 0.006);
    add(T, new THREE.CylinderGeometry(0.058, 0.07, 0.075, 14, 1, true), buff, 0, 0.598, 0.004);
    this.head = new THREE.Group(); this.head.position.set(0, 0.7, -0.005); T.add(this.head);
    const Hd = this.head;
    add(Hd, new THREE.SphereGeometry(0.098, 22, 16), skin, 0, 0.004, 0.004).scale.set(0.9, 1.08, 1.02);                                         // Schaedel
    add(Hd, new THREE.SphereGeometry(0.08, 16, 12), skin, 0, -0.05, -0.024).scale.set(0.84, 0.9, 0.95);                                         // Kiefer
    add(Hd, new THREE.SphereGeometry(0.082, 16, 12), beard, 0, -0.062, -0.026).scale.set(0.85, 0.66, 0.92);                                       // Bart
    add(Hd, new THREE.SphereGeometry(0.1, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.66), hair, 0, -0.004, 0.018).scale.set(0.93, 1.08, 1.0);       // Haare bis in den Nacken
    add(Hd, new THREE.SphereGeometry(1, 8, 6), skin, 0, -0.016, -0.1).scale.set(0.014, 0.024, 0.02);                                            // Nase
    for (const sx of [-1, 1]) {
      add(Hd, new THREE.SphereGeometry(1, 12, 8), dark, sx * 0.038, 0.012, -0.086).scale.set(0.034, 0.022, 0.012);                              // Brillenglas
      add(Hd, new THREE.BoxGeometry(0.006, 0.01, 0.105), dark, sx * 0.08, 0.016, -0.036);                                                       // Buegel
      add(Hd, new THREE.SphereGeometry(1, 10, 8), skin, sx * 0.087, -0.006, 0.006).scale.set(0.011, 0.026, 0.017);                              // Ohr
    }
    add(Hd, new THREE.BoxGeometry(0.02, 0.006, 0.008), dark, 0, 0.018, -0.094);                                                                 // Brillensteg
    add(Hd, new THREE.SphereGeometry(0.104, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.5), cap, 0, 0.024, 0.002).scale.set(0.95, 1.0, 1.05);        // Kappe
    add(Hd, new THREE.TorusGeometry(0.1, 0.006, 6, 24), cap, 0, 0.026, 0.002, Math.PI / 2).scale.set(0.95, 1.05, 1);
    add(Hd, new THREE.SphereGeometry(0.01, 8, 6), cap, 0, 0.128, 0.002);                                                                        // Knopf
    add(Hd, new THREE.CylinderGeometry(0.09, 0.09, 0.008, 18, 1, false, Math.PI / 2, Math.PI), cap, 0, 0.03, -0.08, 0.16).scale.set(0.98, 1, 1.3);  // Schirm
    // Arme (IK in Weltkoordinaten): Aermel mit Form, Haende als greifende Faust
    const upGeo = lathe([[0.78, -0.5], [0.9, -0.3], [1.08, 0.05], [1.14, 0.32], [1.02, 0.5]], 12), foGeo = lathe([[0.74, -0.5], [0.8, -0.38], [0.98, -0.05], [1.14, 0.3], [1.06, 0.5]], 12), jg = new THREE.SphereGeometry(1, 12, 10);
    this.arms = [1, -1].map(sx => {
      const hand = new THREE.Group();
      add(hand, new THREE.CylinderGeometry(0.036, 0.033, 0.035, 12), fleece, 0, 0.062, 0);                       // Buendchen
      add(hand, new THREE.CylinderGeometry(0.027, 0.024, 0.04, 10), skin, 0, 0.04, 0);                           // Handgelenk
      add(hand, jg, skin, 0, 0, 0.004).scale.set(0.04, 0.046, 0.03);                                             // Handruecken
      for (let k = 0; k < 4; k++) add(hand, new THREE.CapsuleGeometry(0.0105, 0.03, 3, 8), skin, 0, 0.022 - k * 0.02, -0.027, 0, 0, Math.PI / 2).scale.set(1, 1 - k * 0.06, 1.25);   // Finger um den Griff
      add(hand, new THREE.CapsuleGeometry(0.012, 0.026, 3, 8), skin, sx * -0.03, 0.02, -0.012, 0.5, 0, sx * 0.5);   // Daumen
      const a = { sx, up: new THREE.Mesh(upGeo, jacket), fo: new THREE.Mesh(foGeo, jacket), el: new THREE.Mesh(jg, jacket), sd: new THREE.Mesh(jg, jacket), hand, sh: new THREE.Vector3(), tg: new THREE.Vector3(), e: new THREE.Vector3() };
      for (const m of [a.up, a.fo, a.el, a.sd]) { m.castShadow = true; m.frustumCulled = false; this.scene.add(m); }
      hand.traverse(o => { o.frustumCulled = false; }); this.scene.add(hand);
      a.el.scale.setScalar(0.046); a.sd.scale.setScalar(0.066);
      return a;
    });
    this.angler = root; this.body = body; this.walkPh = 0; this.walkAmp = 0;
    this.scene.add(root);
    this.loadAnglerModel();
  }

  // Realistische Figur (Microsoft Rocketbox, MIT-Lizenz) laden; bis dahin - oder wenn das Laden scheitert - bleibt die gebaute Figur
  loadAnglerModel() {
    this.anglerPending = true;   // der Ladebildschirm wartet auf die Figur
    const mgr = new THREE.LoadingManager(); mgr.addHandler(/\.tga$/i, { setPath() { return this; }, load: () => new THREE.Texture() });   // TGA-Verweise der Datei ignorieren, Texturen kommen als JPG
    import('./vendor/FBXLoader.js').then(({ FBXLoader }) => new FBXLoader(mgr).load('assets/angler.fbx', o => {
      this.anglerPending = false;
      const tex = f => { const t = this.loader.load('assets/' + f); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; };
      // auch die Beine des Anglers: er steht mitten im Wasser, da laeuft das Netz ueber die Wathose
      const mats = [this.caustic(new THREE.MeshStandardMaterial({ map: tex('angler_body.jpg'), roughness: 0.9 }), 1.0, 0.88), new THREE.MeshStandardMaterial({ map: tex('angler_head.jpg'), roughness: 0.78 })];
      const rm = [];
      o.traverse(n => {
        if (n.isLight) rm.push(n);
        if (n.isSkinnedMesh) { n.material = mats; n.castShadow = true; n.frustumCulled = false; }
        if (n.isBone) n.userData.rq = n.quaternion.clone();
        n.layers.enable(1);
      });
      rm.forEach(n => n.parent.remove(n));
      o.scale.setScalar(0.01); o.rotation.y = Math.PI; o.position.y = -0.56;   // cm -> m, Blick nach -z, Fuesse auf den Boden
      this.angler.add(o);
      const B = n => o.getObjectByName('Bip01_' + n);
      const side = k => ({ up: B(k + '_UpperArm'), fo: B(k + '_Forearm'), hand: B(k + '_Hand'), thigh: B(k + '_Thigh'), calf: B(k + '_Calf'), foot: B(k + '_Foot') });
      this.rig = { o, spine: B('Spine'), spine1: B('Spine1'), spine2: B('Spine2'), neck: B('Neck'), head: B('Head'), R: side('R'), L: side('L') };
      // Finger zum Griff kruemmen
      for (const k of ['R', 'L']) for (let f = 0; f < 5; f++) for (const j of ['', '1', '2']) {
        const b = B(k + '_Finger' + f + j); if (!b) continue;
        b.quaternion.copy(b.userData.rq).multiply(_q1.setFromAxisAngle(_v1.set(0, 0, 1), f === 0 ? (j === '' ? 0.2 : 0.4) : 0.95));
      }
      // gebaute Figur ausblenden, Ausruestung bleibt
      this.body.traverse(m => { if (!m.isMesh) return; if (!m.userData.gear) m.visible = false; else if (m.parent === this.torso && m.position.z < 0) m.position.z += 0.045; });   // Brusttasche an die schmalere Brust ruecken
      for (const a of this.arms) { for (const m of [a.up, a.fo, a.el, a.sd, a.hand]) m.visible = false; a.bones = a.sx > 0 ? this.rig.R : this.rig.L; }
      this.buildRemoteFigure(o, mats);   // dieselbe Figur fuer den zweiten Spieler, nur im gruenen Hemd
    }, undefined, () => { this.anglerPending = false; })).catch(() => { this.anglerPending = false; });
  }

  // st: {px,pz,gy,face,walk,ten,look,fight}
  poseAngler(dt, t, st) {
    const g = this.angler;
    g.position.set(st.px, st.gy, st.pz); g.rotation.y = st.face;
    this.walkAmp += ((st.walk || 0) - this.walkAmp) * Math.min(1, dt * 8);
    const A = this.walkAmp; this.walkPh += dt * (5 + 5 * A);
    const ph = this.walkPh;
    for (const L of this.legs) {
      const q = ph + (L.sx > 0 ? Math.PI : 0);
      L.hip.rotation.x = Math.sin(q) * 0.5 * A; L.hip.rotation.z = L.sx * 0.035;
      L.knee.rotation.x = -(0.08 + Math.max(0, Math.sin(q + 0.9)) * 0.85) * A - 0.04;
    }
    const lean = (st.ten || 0) * 0.16;
    this.body.position.y = -0.56 + Math.abs(Math.sin(ph)) * 0.03 * A;
    this.torso.rotation.set(lean - 0.05 * A + Math.sin(t * 1.3) * 0.008, Math.sin(ph) * 0.07 * A, Math.cos(ph) * 0.03 * A);
    this.torso.position.y = 0.96 + Math.sin(t * 1.3) * 0.004;
    let hy = 0;
    let hp = 0;
    const sg = st.track && this.sighter ? this.sighter[1].position : null;   // Schnur ist draussen: der Blick folgt dem Sighter, auch in der Hoehe
    if (sg) {
      const dx = sg.x - st.px, dz = sg.z - st.pz, yw = Math.atan2(-dx, -dz) - st.face;
      hy = clamp(Math.atan2(Math.sin(yw), Math.cos(yw)), -1.1, 1.1);
      hp = clamp(Math.atan2(sg.y - (st.gy + 1.05), Math.hypot(dx, dz)), -0.6, 0.7);
    } else if (st.look) hy = clamp(Math.atan2(-(st.look.x - st.px), -(st.look.z - st.pz)) - st.face, -0.9, 0.9);
    this._hp = (this._hp || 0) + (hp - (this._hp || 0)) * Math.min(1, dt * 6);
    this.head.rotation.y += (hy - this.head.rotation.y) * Math.min(1, dt * 6);
    this.head.rotation.x = -lean * 0.6 + 0.06 + this._hp;
    g.updateMatrixWorld(true);
    const rig = this.rig;
    if (rig) {
      const Xw = _a.set(1, 0, 0).applyQuaternion(g.quaternion), tr = this.torso.rotation;
      rig.o.position.y = this.body.position.y;
      boneSwing(rig.spine, Xw, tr.x * 0.4);
      boneSwing(rig.spine1, Xw, tr.x * 0.6);
      boneSwing(rig.spine2, UP, tr.y);
      boneSwing(rig.neck, Xw, this.head.rotation.x * 0.4);
      rig.head.parent.getWorldQuaternion(_q1);
      _q2.setFromAxisAngle(UP, this.head.rotation.y).multiply(_q3.setFromAxisAngle(Xw, this.head.rotation.x * 0.6)).multiply(_q1).multiply(rig.head.userData.rq);
      rig.head.quaternion.copy(_q1.invert()).multiply(_q2); rig.head.updateMatrixWorld(true);
      for (const L of this.legs) {
        const k = L.sx > 0 ? rig.R : rig.L;
        boneSwing(k.thigh, Xw, L.hip.rotation.x);
        boneSwing(k.calf, Xw, L.knee.rotation.x);
        boneSwing(k.foot, Xw, -(L.hip.rotation.x + L.knee.rotation.x) * 0.6);
      }
    }
    for (const a of this.arms) {
      a.sh.set(a.sx * 0.225, 0.47, 0); this.torso.localToWorld(a.sh);
      if (a.bones) a.bones.up.getWorldPosition(a.sh);
      if (a.sx < 0) { a.tg.set(-0.11, st.fight ? 0.36 : 0.16, st.fight ? -0.33 : -0.25); a.tg.x += Math.sin(ph) * 0.03 * A; this.torso.localToWorld(a.tg); }
    }
  }
  _arm(a, target) {
    const S = a.sh, d = _d.subVectors(target, S), U = a.bones ? 0.286 : 0.3, F = a.bones ? 0.335 : 0.275,   // Skelett: Unterarm bis zur Griffmitte der Hand
      raw = d.length() || 1e-4, L = clamp(raw, 0.08, U + F - 0.004);
    d.multiplyScalar(1 / raw);
    const x = (U * U - F * F + L * L) / (2 * L), h = Math.sqrt(Math.max(0, U * U - x * x));
    const pole = new THREE.Vector3(a.sx * 0.5, -1, 0.35).applyQuaternion(this.angler.quaternion);
    pole.addScaledVector(d, -pole.dot(d)).normalize();
    a.e.copy(S).addScaledVector(d, x).addScaledVector(pole, h);
    const hp = new THREE.Vector3().copy(S).addScaledVector(d, L);
    placeSeg(a.up, a.e, S, 0.051); placeSeg(a.fo, hp, a.e, 0.042);
    if (a.bones) { boneAim(a.bones.up, _b.subVectors(a.e, S)); boneAim(a.bones.fo, _b.subVectors(hp, a.e)); boneSwing(a.bones.hand, UP, 0); return; }
    a.el.position.copy(a.e); a.sd.position.copy(S); a.hand.position.copy(hp); a.hand.quaternion.copy(a.fo.quaternion);
  }

  buildRig() {
    const unit = new THREE.CylinderGeometry(1, 1, 1, 8);
    const SM = (c, r, m = 0) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: m });
    const add = (par, geo, mat, x = 0, y = 0, z = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; m.frustumCulled = false; par.add(m); return m; };
    const lathe = pts => new THREE.LatheGeometry(pts.map(q => new THREE.Vector2(q[0], q[1])), 16);
    // Blank: 14 Segmente, dunkles Graphit mit Lackglanz
    this.rodSegs = [];
    const blankMat = SM(0x1d2a25, 0.2, 0.35);
    for (let i = 0; i < 14; i++) { const m = new THREE.Mesh(unit, blankMat); m.frustumCulled = false; m.castShadow = i < 7; this.scene.add(m); this.rodSegs.push(m); }
    // Griffteil: Kampfknauf, Rollenhalter, Korkgriff (Achse = lokales y, Rolle haengt bei -z)
    const cork = SM(0xc9a472, 0.95), seat = SM(0x2b3136, 0.35, 0.85), silver = SM(0xb8bdc2, 0.28, 0.9), wood = SM(0x6a4326, 0.45);
    const hg = this.handle = new THREE.Group(); this.scene.add(hg);
    add(hg, lathe([[0, -0.034], [0.013, -0.03], [0.0155, -0.014], [0.012, 0]]), cork);                                   // Kampfknauf
    add(hg, new THREE.CylinderGeometry(0.0105, 0.0105, 0.086, 14), wood, 0, 0.043, 0);                                    // Rollenhalter mit Holzeinsatz
    add(hg, new THREE.CylinderGeometry(0.0128, 0.0128, 0.012, 14), seat, 0, 0.008, 0);
    add(hg, new THREE.CylinderGeometry(0.0128, 0.0128, 0.02, 14), seat, 0, 0.074, 0);
    add(hg, new THREE.TorusGeometry(0.0128, 0.0018, 6, 16).rotateX(Math.PI / 2), silver, 0, 0.062, 0);
    add(hg, lathe([[0.0118, 0.085], [0.0165, 0.098], [0.0172, 0.15], [0.0148, 0.2], [0.0162, 0.25], [0.0132, 0.287], [0.0085, 0.297]]), cork);   // Korkgriff (Half Wells)
    for (let k = 0; k < 9; k++) add(hg, new THREE.TorusGeometry(0.0157 + (k === 2 || k === 7 ? 0.0012 : 0), 0.0005, 4, 14).rotateX(Math.PI / 2), SM(0x9a7a50, 1), 0, 0.1 + k * 0.022, 0);   // Korkringe
    add(hg, new THREE.CylinderGeometry(0.0072, 0.0086, 0.01, 12), silver, 0, 0.302, 0);                                   // Abschlussring
    // Rolle
    const reel = new THREE.Group(); reel.position.set(0, 0.043, -0.05); hg.add(reel);
    add(reel, new THREE.BoxGeometry(0.011, 0.07, 0.005), seat, 0, 0, 0.037);                                              // Rollenfuss
    add(reel, new THREE.BoxGeometry(0.008, 0.012, 0.016), seat, 0, 0, 0.03);
    const frameG = new THREE.TorusGeometry(0.041, 0.0032, 8, 28).rotateY(Math.PI / 2);
    add(reel, frameG, seat, -0.0125, 0, 0); add(reel, frameG, seat, 0.0125, 0, 0);
    for (let k = 0; k < 3; k++) { const a = k * 2.094 + 0.5; add(reel, new THREE.CylinderGeometry(0.0022, 0.0022, 0.025, 6).rotateZ(Math.PI / 2), seat, 0, Math.cos(a) * 0.041, Math.sin(a) * 0.041); }
    add(reel, new THREE.CylinderGeometry(0.037, 0.037, 0.003, 24).rotateZ(Math.PI / 2), silver, 0.0118, 0, 0);            // Spulenflansch
    add(reel, new THREE.CylinderGeometry(0.037, 0.037, 0.003, 24).rotateZ(Math.PI / 2), silver, -0.0118, 0, 0);
    for (let k = 0; k < 8; k++) { const a = k * 0.785; add(reel, new THREE.CylinderGeometry(0.006, 0.006, 0.0036, 10).rotateZ(Math.PI / 2), seat, 0.0118, Math.cos(a) * 0.024, Math.sin(a) * 0.024); }   // Bohrungen
    this.flyLineMat = SM(0xdff06a, 0.6);
    add(reel, new THREE.CylinderGeometry(0.03, 0.03, 0.02, 20).rotateZ(Math.PI / 2), this.flyLineMat);                    // aufgespulte Schnur
    add(reel, new THREE.CylinderGeometry(0.008, 0.008, 0.03, 10).rotateZ(Math.PI / 2), silver);
    add(reel, new THREE.CylinderGeometry(0.0042, 0.005, 0.016, 8).rotateZ(Math.PI / 2), SM(0x1a1a1a, 0.6), 0.023, 0.024, 0.012);   // Kurbelknauf
    // Ringe: ein Leitring, Schlangenringe, Spitzenring (Ringebene quer zur Rute)
    this.guides = [];
    const ringG = new THREE.TorusGeometry(1, 0.17, 5, 12).rotateX(Math.PI / 2);
    for (const [i, r] of [[3, 0.0085], [5, 0.0058], [6, 0.0052], [7, 0.0048], [8, 0.0044], [9, 0.004], [10, 0.0037], [11, 0.0034], [12, 0.0031], [13, 0.0028], [14, 0.0026]]) {
      const m = new THREE.Mesh(ringG, silver); m.frustumCulled = false; m.scale.setScalar(r); this.scene.add(m); this.guides.push({ m, i, r });
    }
    // Schnur: an der Rute entlang durch die Ringe, dann als dicke Flugschnur mit duennem Vorfach hinaus
    this.leaderMat = new THREE.MeshStandardMaterial({ color: 0xe9e9da, roughness: 0.4, transparent: true, opacity: 0.6 });
    this.inLine = []; for (let i = 0; i < 12; i++) { const m = new THREE.Mesh(unit, this.flyLineMat); m.frustumCulled = false; this.scene.add(m); this.inLine.push(m); }
    this.NL = 64;
    this.lineSegs = []; for (let i = 0; i < this.NL - 1; i++) { const m = new THREE.Mesh(unit, this.flyLineMat); m.frustumCulled = false; this.scene.add(m); this.lineSegs.push(m); }
    const lg = new THREE.BufferGeometry();
    lg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(this.NL * 3), 3));
    this.line = new THREE.Line(lg, new THREE.LineBasicMaterial({ color: 0xf6f4e0, transparent: true, opacity: 0.6 }));   // haarfeine Linie, damit die Schnur auch in der Ferne sichtbar bleibt
    this.line.frustumCulled = false; this.scene.add(this.line);
    this._lp = Array.from({ length: this.NL }, () => new THREE.Vector3());
    this.sighter = [0xff2f7a, 0xf8e71c, 0xff2f7a].map(c => { const m = new THREE.Mesh(unit, new THREE.MeshBasicMaterial({ color: c })); m.frustumCulled = false; this.scene.add(m); return m; });
    this.rigMode = 'euro'; this.flyFrac = 0;

    // ---- Nymphe: Jighaken, Tungstenperle, Kragen, geripptes Abdomen, Schwanzfibern, Beinchen. Oese zeigt nach +z (zur Schnur) ----
    this.beadMat = SM(0xe0b040, 0.22, 0.95); this.bodyMat = SM(0x7a4a25, 0.85); this.hotMat = SM(0x3a2a1a, 0.7);
    const hookMat = SM(0x25272a, 0.3, 0.9), wire = SM(0xb87333, 0.3, 0.9), fib = SM(0x4a3520, 0.9);
    const hookPath = pts => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(0, p[0], p[1]))), 24, 0.0032, 6, false);
    const ny = new THREE.Group();
    const bead = add(ny, new THREE.SphereGeometry(0.024, 14, 10), this.beadMat);
    add(ny, hookPath([[0.02, 0.016], [0.006, 0.006], [0, -0.03], [0, -0.1], [-0.012, -0.128], [-0.04, -0.132], [-0.058, -0.105], [-0.05, -0.072]]), hookMat);
    add(ny, new THREE.SphereGeometry(1, 10, 8), this.hotMat, 0, 0, -0.028).scale.set(0.02, 0.02, 0.016);                 // Kragen / Hotspot
    add(ny, new THREE.CylinderGeometry(0.0185, 0.007, 0.085, 10).rotateX(Math.PI / 2), this.bodyMat, 0, 0, -0.078);       // Abdomen, zum Schwanz hin duenner
    for (let k = 0; k < 6; k++) { const z = -0.045 - k * 0.013, r = 0.0182 - k * 0.0018; add(ny, new THREE.TorusGeometry(r, 0.0016, 4, 12), wire, 0, 0, z); }   // Drahtrippung
    for (const a of [-0.3, 0, 0.3]) { const m = add(ny, new THREE.CylinderGeometry(0.0012, 0.0012, 0.06, 4).rotateX(Math.PI / 2), fib, Math.sin(a) * 0.03, 0.004, -0.145); m.rotation.y = a; }   // Schwanz
    for (let k = 0; k < 6; k++) { const sx = k % 2 ? 1 : -1, m = add(ny, new THREE.CylinderGeometry(0.001, 0.001, 0.04, 4), fib, sx * 0.018, -0.014, -0.03 - (k >> 1) * 0.008); m.rotation.set(0.5, 0, sx * 1.0); }   // Beinchen
    this.nymph = ny; this.beadMesh = bead; this.scene.add(ny);

    // ---- Trockenfliege: Haken, schlanker Koerper, Hechelkranz, Fluegel, Schwanz ----
    this.wingMat = SM(0xf4f4ee, 0.9); this.hackleMat = SM(0x6a4a2a, 0.95);
    const dr = new THREE.Group();
    add(dr, hookPath([[0.004, 0.012], [0, 0], [0, -0.085], [-0.012, -0.108], [-0.036, -0.11], [-0.05, -0.088], [-0.044, -0.064]]), hookMat);
    add(dr, new THREE.CylinderGeometry(0.009, 0.0045, 0.075, 8).rotateX(Math.PI / 2), this.bodyMat, 0, 0.002, -0.05);
    for (let k = 0; k < 18; k++) { const a = k / 18 * 6.283, m = add(dr, new THREE.CylinderGeometry(0.0009, 0.0009, 0.05, 3), this.hackleMat, Math.cos(a) * 0.025, 0.002 + Math.sin(a) * 0.025, -0.008 - (k % 3) * 0.004); m.rotation.z = a - Math.PI / 2; }   // Hechel
    add(dr, new THREE.CylinderGeometry(0.004, 0.006, 0.05, 6), this.wingMat, 0, 0.03, -0.012);                             // Sichtfluegel
    const wing = add(dr, new THREE.ConeGeometry(0.014, 0.085, 6).rotateX(-Math.PI / 2), this.wingMat, 0, 0.014, -0.05); wing.scale.set(1, 0.45, 1); this.elkWing = wing;
    for (const a of [-0.25, 0, 0.25]) { const m = add(dr, new THREE.CylinderGeometry(0.0009, 0.0009, 0.055, 3).rotateX(Math.PI / 2), this.hackleMat, Math.sin(a) * 0.027, 0.004, -0.113); m.rotation.y = a; }
    dr.visible = false; this.dryFly = dr; this.scene.add(dr);

    this.indMesh = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 10), new THREE.MeshStandardMaterial({ color: 0xff7a1a, roughness: 0.7 }));   // schwimmender Bissanzeiger
    this.indMesh.visible = false; this.indMesh.frustumCulled = false; this.scene.add(this.indMesh);
    this._pts = Array.from({ length: 15 }, () => new THREE.Vector3());
    this._mB = new THREE.Matrix4(); this._vx = new THREE.Vector3(); this._vy = new THREE.Vector3(); this._vz = new THREE.Vector3();
  }

  buildFx() {
    this.splashes = [];
    const sg = new THREE.RingGeometry(0.8, 1, 32); sg.rotateX(-Math.PI / 2);
    for (let i = 0; i < 12; i++) {
      const m = new THREE.Mesh(sg, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false }));
      m.visible = false; m.renderOrder = 5; this.scene.add(m); this.splashes.push({ m, t: 1, size: 1 });
    }
    const DN = this.dropN = 220;
    const dg = new THREE.BufferGeometry(), dp = new Float32Array(DN * 3).fill(-100);
    dg.setAttribute('position', new THREE.BufferAttribute(dp, 3));
    this.drops = new THREE.Points(dg, new THREE.PointsMaterial({ color: 0xf2fbff, size: 0.055, transparent: true, opacity: 0.85, depthWrite: false }));
    this.drops.frustumCulled = false; this.drops.renderOrder = 6; this.scene.add(this.drops);
    this.dropV = new Float32Array(DN * 3); this.dropI = 0;
    const ring = (r0, r1, col) => { const g = new THREE.RingGeometry(r0, r1, 40); g.rotateX(-Math.PI / 2); const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.9, depthWrite: false, depthTest: false })); m.renderOrder = 8; m.visible = false; this.scene.add(m); return m; };
    this.aimRing = ring(0.26, 0.33, 0xffffff); this.aimDot = ring(0, 0.07, 0xffffff);
    this.entryRing = ring(0.13, 0.19, 0x57d68d); this.entryRing.material.depthTest = true;   // wird von Steinen verdeckt, sonst sieht es aus, als laege die Fliege auf dem Stein
    // Insekten über dem Wasser
    // Groesse in Weltmass: 12 mm ist die Koerperlaenge einer Eintagsfliege. Vorher waren es
    // 35 mm - das sah aus der Naehe nach Hummeln aus. Weil sie jetzt so klein sind, schwaermen
    // sie enger um den Angler: weiter draussen faellt ein Punkt unter einen Bildpunkt und
    // funkelt nur noch, statt zu fliegen. Dafuer sind es mehr.
    const IN = 110, ig = new THREE.BufferGeometry(), ip = new Float32Array(IN * 3);
    this.bugSeed = Array.from({ length: IN }, () => [Math.random() * 11 - 7, 0.3 + Math.random() * 2.0, Math.random() * 15 - 11, Math.random() * 6, 0.5 + Math.random()]);
    ig.setAttribute('position', new THREE.BufferAttribute(ip, 3));
    this.bugs = new THREE.Points(ig, new THREE.PointsMaterial({ color: 0xfff6d8, size: 0.012, transparent: true, opacity: 0.75, depthWrite: false }));
    this.bugs.frustumCulled = false; this.scene.add(this.bugs);
    // Schneefall: eine Wolke um den Angler, die mit ihm mitwandert. Jede Flocke faellt,
    // driftet seitlich und setzt oben wieder an, sobald sie unten ankommt - so reichen 900.
    const SN = 900, flakeG = new THREE.BufferGeometry(), flakeP = new Float32Array(SN * 3);
    this.snowSeed = Array.from({ length: SN }, () => [Math.random() * 44 - 22, Math.random() * 15, Math.random() * 44 - 22, 0.5 + Math.random() * 0.9, Math.random() * 6.3]);
    for (let i = 0; i < SN; i++) { flakeP[i * 3] = this.snowSeed[i][0]; flakeP[i * 3 + 1] = this.snowSeed[i][1]; flakeP[i * 3 + 2] = this.snowSeed[i][2]; }
    flakeG.setAttribute('position', new THREE.BufferAttribute(flakeP, 3));
    this.snow = new THREE.Points(flakeG, new THREE.PointsMaterial({ color: 0xffffff, size: 0.075, transparent: true, opacity: 0.85, depthWrite: false, sizeAttenuation: true }));
    this.snow.frustumCulled = false; this.snow.visible = false; this.scene.add(this.snow);
  }

  setFlyLook(body, bead, hot, id) {
    this.bodyMat.color.set(body); this.beadMat.color.set(bead); this.hotMat.color.set(hot || body);
    if (hot) this.hotMat.color.multiplyScalar(1); else this.hotMat.color.multiplyScalar(0.6);
    this.elkWing.visible = id === 'elk' || id === 'stimu';                       // Haarfluegel nach hinten statt Sichtfluegel
    this.wingMat.color.set(id === 'elk' || id === 'stimu' ? '#d8c08a' : '#f4f4ee');
  }
  // Methode: Euro (Sighter in der Schnur), Indikator (Kugel auf dem Wasser) oder Trockenfliege (Fliege schwimmt)
  setRigStyle(mode, col, size) {
    this.rigMode = mode;
    for (const m of this.sighter) m.visible = mode === 'euro';
    const lc = mode === 'euro' ? 0xf0eedc : mode === 'dry' ? 0xcfe08a : 0xff9a3a;   // Mono / helle Trockenschnur / leuchtend orange Nymphenschnur
    this.flyLineMat.color.setHex(lc); this.line.material.color.setHex(lc);
    this.flyFrac = mode === 'euro' ? 0 : 0.62;                                   // Anteil dicke Flugschnur, der Rest ist Vorfach
    this.indMesh.material.color.set(col || '#ff7a1a'); this.indMesh.scale.set(size || 0.05, (size || 0.05) * 0.85, size || 0.05);
    this.nymph.visible = mode !== 'dry'; this.dryFly.visible = mode === 'dry';
  }
  // Hoehe der Steinoberflaeche an einer Stelle (Strahl von oben auf das echte Steinmodell); null, wenn dort kein Stein ist
  rockTop(k, x, z) {
    if (!k.mesh) return null;
    this.ray.set(_d.set(x, 8, z), _a.set(0, -1, 0));
    const h = this.ray.intersectObject(k.mesh, false);
    return h.length ? h[0].point.y : null;
  }
  setIndicator(p, y) {
    const m = this.indMesh; m.visible = !!p;
    if (!this.dropSeg) { this.dropSeg = new THREE.Mesh(this.lineSegs[0].geometry, this.leaderMat); this.dropSeg.frustumCulled = false; this.scene.add(this.dropSeg); }
    this.dropSeg.visible = !!p;
    if (p) { m.position.set(p.x, y, p.z); placeSeg(this.dropSeg, this.nymph.position, m.position, 0.0012); }   // Vorfach vom Indikator hinunter zur Nymphe
  }

  // Lokales Achsenkreuz an einem Rutenpunkt: y = Rutenachse, x = seitlich, z = oben (Rolle und Ringe sitzen bei -z)
  _rodFrame(dir) {
    const y = this._vy.copy(dir).normalize(), x = this._vx.crossVectors(y, UP);
    if (x.lengthSq() < 1e-6) x.set(1, 0, 0); else x.normalize();
    const z = this._vz.crossVectors(x, y);
    return this._mB.makeBasis(x, y, z);
  }

  // hand, tip, target: {x,y,z}; s = Spannung 0..1 (1 = straff); bend 0..1
  setRig(hand, tip, target, s, bend) {
    const H = _a.set(hand.x, hand.y, hand.z), T = _b.set(tip.x, tip.y, tip.z);
    const dir = new THREE.Vector3().subVectors(T, H); const len = dir.length(); dir.multiplyScalar(1 / len);
    const toT = new THREE.Vector3(target.x - tip.x, target.y - tip.y, target.z - tip.z).normalize();
    const perp = toT.addScaledVector(dir, -toT.dot(dir));
    if (perp.lengthSq() > 1e-6) perp.normalize();
    perp.multiplyScalar(bend * len * 0.45);
    const P = this._pts, NSEG = 14, rodR = i => 0.0072 - i * 0.00036;
    for (let i = 0; i <= NSEG; i++) { const t = i / NSEG; P[i].copy(H).addScaledVector(dir, len * (t - 0.06) * (1 - bend * 0.1 * t)).addScaledVector(perp, t * t * t * 0.4 + t * t * 0.6); }
    for (let i = 0; i < NSEG; i++) placeSeg(this.rodSegs[i], P[i], P[i + 1], rodR(i));
    // Griff und Rolle
    const d0 = _d.subVectors(P[1], P[0]);
    this.handle.position.copy(P[0]); this.handle.quaternion.setFromRotationMatrix(this._rodFrame(d0));
    // Ringe und die Schnur durch die Ringe
    const q0 = new THREE.Vector3(), q1 = new THREE.Vector3(), under = (i, out) => {
      const a = Math.min(i, NSEG - 1); _d.subVectors(P[a + 1], P[a]); this._rodFrame(_d);
      return out.copy(P[i]).addScaledVector(this._vz, -(rodR(Math.min(i, 13)) + 0.006));
    };
    for (const g of this.guides) {
      const a = Math.min(g.i, NSEG - 1); _d.subVectors(P[a + 1], P[a]);
      g.m.quaternion.setFromRotationMatrix(this._rodFrame(_d));
      g.m.position.copy(P[g.i]).addScaledVector(this._vz, -(rodR(Math.min(g.i, 13)) + g.r));
    }
    const inR = this.rigMode === 'euro' ? 0.0011 : 0.0024;
    for (let i = 0; i < 12; i++) { under(i + 2, q0); under(i + 3, q1); if (i === 0) { q0.copy(P[0]).addScaledVector(d0.subVectors(P[1], P[0]).normalize(), 0.06); this._rodFrame(d0); q0.addScaledVector(this._vz, -0.03); } placeSeg(this.inLine[i], q0, q1, inR); }
    this._arm(this.arms[0], H);
    if (this._fightGrip) this.arms[1].tg.copy(P[0]).addScaledVector(dir, 0.1).add(_d.set(0, -0.06, 0));
    this._arm(this.arms[1], this.arms[1].tg);
    // Schnur von der Spitze zum Ziel
    const tp = P[NSEG], N = this.NL, L = this._lp;
    const sag = Math.min(1.2, (1 - Math.min(1, s)) * 3.2);
    for (let i = 0; i < N; i++) { const t = i / (N - 1); L[i].set(tp.x + (target.x - tp.x) * t, tp.y + (target.y - tp.y) * t - sag * 2 * t * (1 - t), tp.z + (target.z - tp.z) * t); }
    let t0 = 0.62, t1 = 0.9;
    if (target.y < 0.05 && tp.y > 0.5) { const span = tp.y - target.y; t1 = (tp.y - 0.1) / span; t0 = Math.max(0.05, (tp.y - Math.min(tp.y - 0.1, 0.85)) / span); }
    this._drawLine(t0, t1);
  }

  // Schnur als frei geformter Pfad (Wurfschlaufe): pts = Vector3-Liste von der Rutenspitze bis zur Fliege
  setLinePath(pts) {
    const N = this.NL, L = this._lp, M = pts.length - 1;
    for (let i = 0; i < N; i++) { const f = i / (N - 1) * M, a = Math.min(M - 1, Math.floor(f)); L[i].copy(pts[a]).lerp(pts[a + 1], f - a); }
    this._drawLine(0.66, 0.9);
  }

  _drawLine(t0, t1) {
    const N = this.NL, L = this._lp, pos = this.line.geometry.attributes.position;
    // Die Schnur geht nie durch einen Stein: wo sie einen kreuzt, legt sie sich auf dessen Oberflaeche (gilt fuer jede Rute, auch im Drill)
    if (this.river) for (let i = 1; i < N - 1; i++) {
      const p = L[i];
      for (const k of this.river.rocks) {
        if (!k.mesh || p.y > k.top + 0.02) continue;
        const dx = p.x - k.x, dz = p.z - k.z, R = k.vr + 0.02; if (dx * dx + dz * dz > R * R) continue;
        const top = this.rockTop(k, p.x, p.z); if (top !== null && p.y < top + 0.012) p.y = top + 0.012;
      }
    }
    for (let i = 0; i < N; i++) pos.setXYZ(i, L[i].x, L[i].y, L[i].z);
    pos.needsUpdate = true;
    const cut = Math.round(this.flyFrac * (N - 1));
    for (let i = 0; i < N - 1; i++) {
      const m = this.lineSegs[i], fly = i < cut;
      if (m.material !== (fly ? this.flyLineMat : this.leaderMat)) m.material = fly ? this.flyLineMat : this.leaderMat;
      const k = fly ? 0 : (i - cut) / Math.max(1, N - 1 - cut);
      placeSeg(m, L[i], L[i + 1], fly ? 0.0042 - 0.0012 * (i / Math.max(1, cut)) : 0.0019 - 0.0009 * k);   // Flugschnur verjuengt sich, Vorfach laeuft duenn aus
    }
    const at = (t, out) => { const f = clamp(t, 0, 1) * (N - 1), a = Math.min(N - 2, Math.floor(f)); return out.copy(L[a]).lerp(L[a + 1], f - a); };
    const q0 = new THREE.Vector3(), q1 = new THREE.Vector3();
    for (let i = 0; i < 3; i++) { at(t0 + (t1 - t0) * i / 3, q0); at(t0 + (t1 - t0) * (i + 1) / 3, q1); placeSeg(this.sighter[i], q0, q1, 0.007); }
    const e = L[N - 1], p = L[N - 3];
    this.nymph.position.copy(e); if (e.distanceToSquared(p) > 1e-6) this.nymph.lookAt(p);                                 // Oese zeigt zur Schnur
    this.dryFly.position.copy(e); this.dryFly.lookAt(p.x, e.y, p.z);                                                      // sitzt aufrecht auf dem Wasser
  }

  setAim(a) {
    const v = !!a; this.aimRing.visible = this.aimDot.visible = v;
    if (!v) return;
    this.aimRing.position.set(a.tx, 0.03, a.tz); this.aimDot.position.set(a.tx, 0.03, a.tz);
    // Der Punkt ist das Ziel, der Ring die Streuung: je weiter der Wurf ueber der bequemen Weite
    // der Rute liegt, desto groesser wird er - man sieht die Unsicherheit, bevor man loslaesst.
    // Er faerbt sich dabei von Weiss nach Orange.
    const sp = a.spread === undefined ? 0.1 : a.spread;
    const c = !a.ok ? 0xff5a4f : a.over > 0.55 ? 0xffa23a : 0xffffff;
    this.aimRing.material.color.setHex(c); this.aimDot.material.color.setHex(c);
    const k = 1 + Math.sin(this.timeU.value * 6) * 0.08;
    this.aimRing.scale.setScalar(k * (0.7 + sp * 2.2));   // waechst von der ersten Streuung an, nicht erst ab einer Schwelle
  }
  setEntry(x, z, state) {
    const m = this.entryRing; m.visible = !!state;
    if (!state) return;
    m.position.set(x, 0.03, z);
    m.material.color.setHex(state === 'ok' ? 0x57d68d : state === 'slack' ? 0x6aa0ff : state === 'bite' ? 0xff2f7a : 0xff5a4f);
    m.scale.setScalar(state === 'bite' ? 1.6 + Math.sin(this.timeU.value * 30) * 0.5 : 1);
  }

  buildRevier(rv, cond) {
    for (const c of [...this.env.children]) { this.env.remove(c); c.traverse?.(o => { o.geometry?.dispose?.(); o.material?.dispose?.(); }); }
    this.fauna = null;   // die Tiere haengen in env und sind mit ihm gerade weggeraeumt
    this._catch = null; this._cv = 0; if (this.catchNet) this.catchNet.visible = false; if (this.backNet) this.backNet.visible = true;
    this.clearFish();
    const river = makeRiver(rv);
    this.river = river;
    const rnd = mulberry32(rv.seed * 7 + 3);
    const pal = rv.pal, tint = cond.light.tint, lid = cond.light.id;
    const C = hex => { const c = new THREE.Color(hex); c.r *= tint[0]; c.g *= tint[1]; c.b *= tint[2]; return c; };
    const murk = cond.clarity / 2;
    const sunK = cond.light.sun, overcast = lid === 'bedeckt';
    // Jahreszeit aus der Staffel: 3 ist Herbst, 4 Winter. Steht hier oben, weil schon das
    // Licht davon abhaengt - Schnee wirft anders zurueck als eine Wiese.
    const aut = rv.season === 3, win = rv.season === 4;

    // Licht & Himmel
    const sd = SUNS[lid] || SUNS.mittag, sk = SKY[lid] || SKY.mittag;
    const hl = Math.hypot(sd.dir[0], sd.dir[2]), ce = Math.cos(sk.el);
    this.sunDir.set(sd.dir[0] / hl * ce, Math.sin(sk.el), sd.dir[2] / hl * ce).normalize();
    const sunCol = new THREE.Color(1, lid === 'abend' ? 0.74 : lid === 'morgen' ? 0.84 : 0.96, lid === 'abend' ? 0.52 : lid === 'morgen' ? 0.7 : 0.88);
    this.sun.color.copy(sunCol); this.sun.intensity = overcast ? 0.8 : 3.1 * sunK;
    this.causticU.value = overcast ? 0.3 : 1;   // bedeckt buendelt die Oberflaeche kaum noch Licht
    // Das Halbkugellicht stellte bisher den ganzen Himmel mit zwei Farben nach. Das macht
    // jetzt die Umgebung aus dem Himmelsbild; geblieben ist der Anteil, den die Umgebung
    // nicht kennt: das Licht, das vom Boden zurueckkommt.
    this.hemi.intensity = (overcast ? 1.1 : 0.62 + 0.14 * sunK) * (this.envOn ? 1 : 2.6);
    this.hemi.color.setRGB(sk.mid[0], sk.mid[1], sk.mid[2], THREE.SRGBColorSpace).lerp(new THREE.Color(1, 1, 1), 0.45);
    // Was der Boden zurueckwirft, haengt davon ab, was dort liegt: Schnee wirft hell und
    // kuehl zurueck, Herbstlaub warm, Wiese gruen.
    this.hemi.groundColor.copy(C(win ? 0xcfd8e4 : aut ? 0x7a6230 : 0x5a6a3c));
    // Belichtung nach Lichtstimmung statt einem festen Wert fuer alles
    this.renderer.toneMappingExposure = overcast ? 1.12 : lid === 'mittag' ? 0.98 : 1.06;
    if (!this.skyTex[lid]) { const t = this.loader.load('assets/sky_' + lid + '.jpg', () => this.applyEnv(lid)); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.RepeatWrapping; t.wrapT = THREE.ClampToEdgeWrapping; t.minFilter = THREE.LinearFilter; t.generateMipmaps = false; this.skyTex[lid] = t; }
    this.envLid = lid; this.applyEnv(lid);
    this.skyU.uSky.value = this.skyTex[lid];
    this.skyU.uRot.value = sk.u - (Math.atan2(this.sunDir.z, this.sunDir.x) / (Math.PI * 2) + 0.5);
    const fog = new THREE.Color().setRGB(sk.hor[0], sk.hor[1], sk.hor[2], THREE.SRGBColorSpace).multiplyScalar(this.skyU.uGain.value);
    this.skyU.uFogC.value.copy(fog);
    this.scene.fog.color.copy(fog);
    this.scene.fog.near = lid === 'morgen' ? 10 : 30; this.scene.fog.far = lid === 'morgen' ? 190 : 330;
    if (rv.fog) { this.scene.fog.near = rv.fog[0]; this.scene.fog.far = rv.fog[1]; }   // Revier mit eigenem, dichterem Nebel
    this.bugs.visible = lid === 'morgen' || lid === 'abend';
    this.snowU.value = win ? 1 : 0;
    this.snow.visible = win && lid !== 'mittag';
    this.bugs.visible = this.bugs.visible && !win;   // im Winter schwaermt nichts

    // Gelände
    const NX = 124, NZ = 262, W = 96, Z0 = -150, Z1 = 72;
    const tg = new THREE.PlaneGeometry(1, 1, NX, NZ);
    const tp = tg.attributes.position, tuv = tg.attributes.uv;
    const cols = new Float32Array(tp.count * 3), wgt = new Float32Array(tp.count * 3);
    const cGr = new THREE.Color(pal.grass), cGr2 = new THREE.Color(pal.grass).multiplyScalar(0.7), cRock = new THREE.Color(pal.rock),
      cGrav = new THREE.Color(pal.gravel), cBed = new THREE.Color(pal.bed), tmp = new THREE.Color();
    const bedTint = new THREE.Color(clamp(cBed.r / cGrav.r, 0, 1), clamp(cBed.g / cGrav.g, 0, 1), clamp(cBed.b / cGrav.b, 0, 1)).lerp(new THREE.Color(1, 1, 1), 0.32), gt = rv.ground || [1, 1, 1], grassTint = new THREE.Color(0.86 * gt[0], 1.28 * gt[1], 0.74 * gt[2]);   // Herbst / Winter faerben den Boden
    for (let i = 0; i < tp.count; i++) {
      const u = tp.getX(i) * 2, vz = tp.getY(i) + 0.5;
      const z = Z0 + (1 - vz) * (Z1 - Z0), x = river.cx(z) + Math.sign(u) * Math.pow(Math.abs(u), 1.8) * W / 2;   // dichtes Gitter folgt dem Flusslauf
      const h = river.heightAt(x, z);
      tp.setXYZ(i, x, h, z); tuv.setXY(i, x * 0.5, z * 0.5);
      const n = vnoise(x * 0.7, z * 0.7);
      let wG = 0, wP = 0, wR = 0;
      const hl = z < -60 ? h - river.lift(z, -0.6, x) : h, face = z < -60 && river.falls.some(f => Math.abs(z - (f.z - 0.6)) < 2.3) && hl < 1.2;   // Hoehe ueber dem oertlichen Wasserspiegel; an der Stufe steht blanker Fels
      if (face) { tmp.setRGB(1, 1, 1).multiplyScalar(0.62 + n * 0.3 + vnoise(x * 0.3, h * 1.1) * 0.25); wR = 1; }
      else if (hl < 0.03) { tmp.setRGB(1, 1, 1).lerp(bedTint, Math.min(1, -hl / 1.3)).multiplyScalar(0.95 + n * 0.2); wP = 1; }
      else if (rv.cliff && hl > 1.0) { const top = hl > rv.bankMax * 0.86 ? 0.85 : 0; tmp.setRGB(1, 1, 1).multiplyScalar(0.7 + n * 0.3 + vnoise(x * 0.2, h * 0.9) * 0.3).lerp(grassTint, top); wR = 1 - top; wG = top; }
      else { const g = smooth(0.22, 0.5, hl + (n - 0.5) * 0.25); tmp.setRGB(1.04, 1.02, 0.98).lerp(_c.copy(grassTint).multiplyScalar(0.8 + fbm(x * 0.12, z * 0.12) * 0.45), g); wG = g; wP = 1 - g; }
      cols[i * 3] = tmp.r * tint[0]; cols[i * 3 + 1] = tmp.g * tint[1]; cols[i * 3 + 2] = tmp.b * tint[2];
      wgt[i * 3] = wG; wgt[i * 3 + 1] = wP; wgt[i * 3 + 2] = wR;
    }
    tg.setAttribute('color', new THREE.BufferAttribute(cols, 3));
    tg.setAttribute('aW', new THREE.BufferAttribute(wgt, 3));
    tg.computeVertexNormals();
    const tm = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 0, map: this.tex.grass });
    tm.onBeforeCompile = s => {
      const T = this.tex;
      Object.assign(s.uniforms, { uPeb: { value: T.peb }, uRockT: { value: T.cliff }, uGrassN: { value: T.grassN }, uPebN: { value: T.pebN }, uRockN: { value: T.cliffN }, uNz: { value: this.noiseTex }, uTime: this.timeU, uCaust: this.causticU, uSnow: this.snowU });
      s.vertexShader = s.vertexShader.replace('#include <common>', '#include <common>\nattribute vec3 aW; varying vec3 vWgt; varying vec3 vTp;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvWgt=aW; vTp=position;');
      s.fragmentShader = s.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vWgt; varying vec3 vTp; uniform sampler2D uPeb,uRockT,uGrassN,uPebN,uRockN,uNz; uniform float uTime,uCaust,uSnow;')
        .replace('#include <map_fragment>', `
          vec2 uvG=vMapUv*0.62, uvP=vMapUv*0.95, uvR=vec2(vTp.x+vTp.z, vTp.y*1.4)*0.13;
          vec3 cG=mix(texture2D(map,uvG).rgb, texture2D(map,uvG*0.23).rgb, 0.4);
          vec3 cP=mix(texture2D(uPeb,uvP).rgb, texture2D(uPeb,uvP*0.27).rgb, 0.3);
          vec3 cR=texture2D(uRockT,uvR).rgb;
          diffuseColor.rgb*=(cG*vWgt.x+cP*vWgt.y+cR*vWgt.z)*1.25;
          if(vTp.y<0.0){ float shw=smoothstep(-1.8,-0.04,vTp.y); float tt=uTime*0.5;
            float c1=texture2D(uNz,vTp.xz*0.11+vec2(0.02*tt,-0.05*tt)).b, c2=texture2D(uNz,vTp.xz*0.14+vec2(0.31-0.03*tt,0.17-0.07*tt)).a;
            float ca=pow(clamp(1.-abs(c1-c2)*3.4,0.,1.),7.);
            diffuseColor.rgb*=0.8+ca*1.5*shw*uCaust; }
          else {
            if(vTp.y<0.16) diffuseColor.rgb*=mix(0.6,1.,vTp.y/0.16);
            // Schneedecke: haelt auf Gras und Kies, kaum an der blanken Felswand, und
            // setzt erst ein Stueck ueber der Wasserlinie an - der Saum bleibt nass.
            if(uSnow>0.001){
              float dry=smoothstep(0.03,0.5,vTp.y);
              float lay=vWgt.x+vWgt.y*0.85+vWgt.z*0.45;
              float pat=0.52+0.48*texture2D(uNz,vTp.xz*0.5).b;
              diffuseColor.rgb=mix(diffuseColor.rgb,vec3(0.94,0.96,1.0),clamp(dry*lay*pat*uSnow*1.35,0.,1.));
            }
          }`)
        .replace('#include <normal_fragment_maps>', `
          vec3 nmT=(texture2D(uGrassN,uvG).xyz*2.-1.)*vWgt.x+(texture2D(uPebN,uvP).xyz*2.-1.)*vWgt.y*1.4+(texture2D(uRockN,uvR).xyz*2.-1.)*vWgt.z*1.6;
          normal=normalize(normal+mat3(viewMatrix)*vec3(nmT.x,0.,-nmT.y)*0.95);`);
    };
    const terrain = new THREE.Mesh(tg, tm); terrain.receiveShadow = true;
    this.env.add(terrain);

    // Hintergrund: Hügel & Berge
    const bg = new THREE.PlaneGeometry(1000, 700, 150, 105); bg.rotateX(-Math.PI / 2); bg.translate(0, 0, -260);
    const bp = bg.attributes.position, bc = new Float32Array(bp.count * 3), so = rv.seed * 3.7;
    // Der Hintergrundwald stand bisher in jeder Jahreszeit sommergruen, obwohl er die Haelfte
    // des Bildes fuellt. Jetzt faerbt ihn die Staffel mit, und im Winter rueckt die Schneegrenze
    // weit herunter.
    const fTint = win ? [0.85, 0.88, 0.95] : aut ? [1.5, 1.12, 0.52] : [1, 1, 1];
    const FC = hex => { const c = new THREE.Color(hex); c.r *= fTint[0]; c.g *= fTint[1]; c.b *= fTint[2]; return c; };
    const cFor = FC(0x2e4a2c), cFor2 = FC(0x466a3a), cAlp = FC(0x6f7f52), cSt = new THREE.Color(0x74777c), cSn = new THREE.Color(0xf4f7fb);
    const snowLine = win ? 34 : 104, snowBand = win ? 58 : 128;
    for (let i = 0; i < bp.count; i++) {
      const x = bp.getX(i), z = bp.getZ(i), ax = Math.abs(x);
      const base = ax < 37 && z > Z0 - 3 ? -8 : rv.bankMax - 0.8;
      const m = Math.max(smooth(44, 200, ax), smooth(160, 340, -z));
      const rid = 1 - Math.abs(2 * fbm(x * 0.0065 + so, z * 0.0065) - 1);
      const rel = m * (22 + 190 * rid * rid * (0.45 + 0.75 * vnoise(x * 0.003 + so, z * 0.003 + 4))) + smooth(38, 90, ax) * 11 * fbm(x * 0.03, z * 0.03 + so);
      bp.setY(i, base + rel);
      const n = vnoise(x * 0.05, z * 0.05), n2 = vnoise(x * 0.21, z * 0.21);
      tmp.copy(cFor).lerp(cFor2, n2);
      tmp.lerp(cAlp, smooth(34, 62, rel + n * 22));
      tmp.lerp(cSt, smooth(58, 92, rel + n * 30));
      tmp.lerp(cSn, smooth(snowLine, snowBand, rel + n * 34));
      bc[i * 3] = tmp.r * tint[0]; bc[i * 3 + 1] = tmp.g * tint[1]; bc[i * 3 + 2] = tmp.b * tint[2];
    }
    bg.setAttribute('color', new THREE.BufferAttribute(bc, 3)); bg.computeVertexNormals();
    this.env.add(new THREE.Mesh(bg, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 })));

    // Wasser
    const WX = 64, WZ = 500;
    const wg = new THREE.PlaneGeometry(rv.width + 0.4, Z1 - Z0, WX, WZ);
    wg.rotateX(-Math.PI / 2); wg.translate(0, 0, (Z0 + Z1) / 2);
    const wp = wg.attributes.position;
    for (let i = 0; i < wp.count; i++) { const z = wp.getZ(i); const x = wp.getX(i) + river.cx(z); wp.setX(i, x); wp.setY(i, river.lift(z, 0, x)); }   // Wasserflaeche folgt dem Maeander und kippt ueber die Stufen
    const aD = new Float32Array(wp.count), aS = new Float32Array(wp.count), aF = new Float32Array(wp.count), aB = new Float32Array(wp.count);
    for (let i = 0; i < wp.count; i++) {
      const x = wp.getX(i), z = wp.getZ(i);
      const d = aD[i] = river.depthAt(x, z), v = aS[i] = river.speedAt(x, z);
      let f = 0;
      for (const k of river.rocks) {
        const dx = x - k.x, dz = z - k.z; if (Math.abs(dx) > k.r * 2.5 || dz < -k.r * 2.5 || dz > k.r * 6) continue;
        const dist = Math.hypot(dx, dz);
        f = Math.max(f, Math.exp(-(((dist - k.r * 0.95) / 0.28) ** 2)) * (dz < 0 ? 1 : 0.75));
        if (dz > 0) f = Math.max(f, 0.62 * Math.exp(-dz / (k.r * 2.4)) * Math.exp(-(((Math.abs(dx) - k.r * 0.8) / 0.3) ** 2)));
      }
      if (d < 0.12 && d > 0.01) f = Math.max(f, 0.35 * v / Math.max(0.3, rv.speed));
      aF[i] = f * clamp(0.45 + v / Math.max(0.4, rv.speed), 0.4, 1.2);
      // Wasserfaelle: die kippende Flaeche selbst (Wert 2 = Fallstraehnen im Shader), darunter kochendes Weisswasser, das stromab auslaeuft
      for (const fl of river.falls) {
        const dz = z - fl.z;
        if (Math.abs(dz) < 2 && river.lift(z - 0.25, 0, x) - river.lift(z + 0.25, 0, x) > fl.h * 0.07) { aF[i] = 2; aS[i] = Math.max(v, 2.2); }
        else if (dz > 0 && dz < 14) { aF[i] = Math.max(aF[i], 1.15 * Math.exp(-Math.max(0, dz - 1.4) / (1.4 + fl.h * 0.9)) * (d > 0.02 ? 1 : 0)); aS[i] = Math.max(v, 1.4 * Math.exp(-dz / 5)); }
        else if (dz < 0 && dz > -2.5) aF[i] = Math.max(aF[i], 0.5 * (1 + dz / 2.5));   // Zug auf die Kante zu
      }
      for (const sf of river.sideFalls) { const ex = river.cx(sf.z) + sf.side * (river.halfW - 0.6), dd = (x - ex) ** 2 + (z - sf.z - 0.3) ** 2; if (dd < 9 && d > 0.02) aF[i] = Math.max(aF[i], 1.1 * Math.exp(-dd / 1.3)); }
      aB[i] = smooth(river.halfW * 0.35, river.halfW, Math.abs(river.off(x, z))) * clamp(rv.trees + (rv.cliff ? 0.6 : 0), 0.3, 1);
    }
    wg.setAttribute('aDepth', new THREE.BufferAttribute(aD, 1)); wg.setAttribute('aSpeed', new THREE.BufferAttribute(aS, 1));
    wg.setAttribute('aFoam', new THREE.BufferAttribute(aF, 1)); wg.setAttribute('aBank', new THREE.BufferAttribute(aB, 1));
    const U = this.waterU;
    U.uShallow.value.copy(C(pal.shallow)); U.uDeep.value.copy(C(pal.deep)); U.uSkyBot.value.copy(C(pal.skyBot)); U.uFog.value.copy(fog);
    U.uFogNear.value = this.scene.fog.near; U.uFogFar.value = this.scene.fog.far; U.uMurk.value = murk; U.uSun.value = overcast ? 0.12 : sunK; U.uSunCol.value.copy(sunCol);
    U.uBankCol.value.copy(C(rv.cliff ? pal.rock : pal.grass)).multiplyScalar(0.32);
    const water = new THREE.Mesh(wg, new THREE.ShaderMaterial({ uniforms: U, vertexShader: WATER_VS, fragmentShader: WATER_FS, transparent: true, depthWrite: false }));
    water.renderOrder = 2; this.env.add(water); this.water = water; this._needLayers = true;
    this._rsCool = 120; this._rsAcc = []; this._rsGood = 0;   // nach dem Aufbau erst einmal einschwingen lassen

    // Dunst ueber dem Wasser: morgens dicht, abends und bei Bewoelkung ein Hauch
    const mistK = lid === 'morgen' ? 1 : lid === 'abend' ? 0.45 : overcast ? 0.3 : 0;
    this.mist = new THREE.Group(); this.mist.visible = this.hi; this.env.add(this.mist);
    this.rayK = overcast ? 0 : lid === 'morgen' ? 1.0 : lid === 'abend' ? 0.85 : 0.4;
    this.pm.rays.uniforms.uCol.value.copy(sunCol);
    for (let L = 0; L < 3 && mistK > 0; L++) {
      const y = 0.3 + L * 0.5, mg = new THREE.PlaneGeometry(rv.width + 24, Z1 - Z0, 20, 110).rotateX(-Math.PI / 2).translate(0, y, (Z0 + Z1) / 2);
      const mp = mg.attributes.position, aK = new Float32Array(mp.count);
      for (let i = 0; i < mp.count; i++) mp.setX(i, mp.getX(i) + river.cx(mp.getZ(i)));
      for (let i = 0; i < mp.count; i++) aK[i] = smooth(0.12, 0.5, -river.heightAt(mp.getX(i), mp.getZ(i)));   // nur ueber tieferem Wasser, sonst schneidet der Dunst Schilf und Ufer in Streifen
      mg.setAttribute('aK', new THREE.BufferAttribute(aK, 1));
      const mm = new THREE.Mesh(mg, new THREE.ShaderMaterial({ uniforms: { uN: { value: this.noiseTex }, uTime: this.timeU, uCol: { value: fog.clone().lerp(new THREE.Color(1, 1, 1), 0.25) }, uOp: { value: mistK * (0.36 - L * 0.07) }, uOff: { value: L * 0.37 } },
        vertexShader: MIST_VS, fragmentShader: MIST_FS, transparent: true, depthWrite: false }));
      mm.renderOrder = 3 + L; mm.userData.air = true; this.mist.add(mm);
    }

    // Felsen
    const rockMat = this.caustic(new THREE.MeshStandardMaterial({ color: C(pal.rock).lerp(new THREE.Color(1, 1, 1), 0.55).multiplyScalar(1.5), roughness: 0.95, vertexColors: true, map: this.tex.rock, normalMap: this.tex.rockN, normalScale: new THREE.Vector2(1.3, 1.3) }));
    const wetG = [0, 1, 2].map(k => rockGeo(k, true)), dryG = [3, 4, 5].map(k => rockGeo(k, false));
    for (const g of [...wetG, ...dryG]) { const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 2, uv.getY(i) * 1.2); }
    const addRock = (geos, x, y, z, r, flat = 1) => {
      const m = new THREE.Mesh(geos[(rnd() * geos.length) | 0], rockMat);
      m.position.set(x, y, z); m.scale.set(r * (1 + rnd() * 0.25), r * (0.85 + rnd() * 0.35) * flat, r * (1 + rnd() * 0.25)); m.rotation.y = rnd() * 6.3;
      m.castShadow = m.receiveShadow = true; this.env.add(m); return m;
    };
    for (const k of river.rocks) { const m = addRock(wetG, k.x, -0.12, k.z, k.r); // tatsaechlicher Umriss des Steins ab der Wasserlinie aufwaerts, in 32 Richtungen: daran legen sich Schnur und Fliege an
      m.updateMatrix(); const pa = m.geometry.attributes.position, prof = new Float32Array(32), v = new THREE.Vector3(); let top = 0;
      for (let i = 0; i < pa.count; i++) {
        v.fromBufferAttribute(pa, i).applyMatrix4(m.matrix); if (v.y < -0.03) continue;
        const ox = v.x - k.x, oz = v.z - k.z, b = ((Math.round(Math.atan2(oz, ox) / 6.2832 * 32) % 32) + 32) % 32;
        prof[b] = Math.max(prof[b], Math.hypot(ox, oz)); if (v.y > top) top = v.y;
      }
      for (let b = 0; b < 32; b++) if (!prof[b]) prof[b] = Math.max(prof[(b + 31) % 32], prof[(b + 1) % 32]) || k.r;
      k.prof = prof; k.vr = Math.max(...prof); k.top = top; m.updateMatrixWorld(true); k.mesh = m; }
    // Ufersteine, reine Zier: als Instanzen statt 110 einzelner Netze. Sie stehen in drei Durchgaengen
    // (Schatten, unter Wasser, Bild) und kosteten so ueber 300 Zeichenaufrufe je Bild.
    const deco = new Map(), _mx = new THREE.Matrix4(), _qt = new THREE.Quaternion(), _po = new THREE.Vector3(), _sc = new THREE.Vector3(), _eu = new THREE.Euler();
    for (let i = 0; i < 110; i++) {
      const side = rnd() < 0.5 ? -1 : 1, z = Z0 + 40 + rnd() * (Z1 - Z0 - 44), x = river.cx(z) + side * (river.halfW - 0.9 + Math.pow(rnd(), 1.6) * 7);
      const h = river.heightAt(x, z), r = 0.12 + Math.pow(rnd(), 2) * 0.7;   // gleiche Reihenfolge der Zufallszahlen wie zuvor, damit die Reviere gleich aussehen
      const gs = h < 0.05 ? wetG : dryG, g = gs[(rnd() * gs.length) | 0];
      _po.set(x, h - 0.04, z);
      _sc.set(r * (1 + rnd() * 0.25), r * (0.85 + rnd() * 0.35) * 0.8, r * (1 + rnd() * 0.25));
      _qt.setFromEuler(_eu.set(0, rnd() * 6.3, 0));
      (deco.get(g) || deco.set(g, []).get(g)).push(_mx.clone().compose(_po, _qt, _sc));
    }
    for (const [g, list] of deco) {
      const im = new THREE.InstancedMesh(g, rockMat, list.length);
      for (let i = 0; i < list.length; i++) im.setMatrixAt(i, list[i]);
      im.instanceMatrix.needsUpdate = true; im.castShadow = im.receiveShadow = true;
      im.layers.enable(1);   // sollen auch unter Wasser zu sehen sein; die Sammelschleife ueberspringt Instanzen
      this.env.add(im);
    }
    // Wasserfaelle: Bloecke teilen die Kante in Rinnen, am Fuss liegt Sturzgeroell; Gischt steigt auf
    const fogU = { uFog: { value: fog }, uFogNear: { value: this.scene.fog.near }, uFogFar: { value: this.scene.fog.far } };
    const sprayCol = new THREE.Color(1, 1, 1).lerp(sunCol, 0.25).multiplyScalar(overcast ? 0.75 : 0.72 + 0.28 * Math.min(1, sunK));
    const spray = (list, op) => {   // list: [{x,y,z, w (Breite quer), dir (Flussrichtung des Sprungs: x,z), h}]
      const per = this.mobile ? 34 : 70, N = list.reduce((a, q) => a + Math.round(per * q.n), 0);
      const P = new Float32Array(N * 3), V = new Float32Array(N * 3), A = new Float32Array(N); let k = 0;
      for (const q of list) for (let j = 0, m = Math.round(per * q.n); j < m; j++, k++) {
        const u = (rnd() - 0.5) * q.w, up = (0.9 + rnd() * 1.6) * q.pow, out = (0.3 + rnd() * 1.3) * q.pow;
        P[k * 3] = q.x + q.ax * u; P[k * 3 + 1] = q.y + rnd() * 0.15; P[k * 3 + 2] = q.z + q.az * u;
        V[k * 3] = q.dx * out + (rnd() - 0.5) * 0.7; V[k * 3 + 1] = up; V[k * 3 + 2] = q.dz * out + (rnd() - 0.5) * 0.7; A[k] = rnd();
      }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(P, 3)); g.setAttribute('aV', new THREE.BufferAttribute(V, 3)); g.setAttribute('aP', new THREE.BufferAttribute(A, 1));
      const pts = new THREE.Points(g, new THREE.ShaderMaterial({ uniforms: { uTime: this.timeU, uScale: { value: window.innerHeight * 0.95 }, uCol: { value: sprayCol }, uOp: { value: op }, ...fogU }, vertexShader: SPRAY_VS, fragmentShader: SPRAY_FS, transparent: true, depthWrite: false }));
      pts.frustumCulled = false; pts.renderOrder = 7; this.env.add(pts);
    };
    const sp = [];
    for (const fl of river.falls) {
      const top = river.lift(fl.z - 3), bot = river.lift(fl.z + 3);
      for (let u = -river.halfW + 0.6; u < river.halfW - 0.4; u += 1.1 + rnd() * 1.4) {
        if (rnd() < 0.42) continue;   // Luecken: dort stuerzt das Wasser durch
        const z = fl.z - 0.5 + rnd() * 0.5, r = 0.5 + rnd() * 0.55 + fl.h * 0.07;
        addRock(dryG, river.cx(z) + u, top - 0.5 - rnd() * 0.15, z, r, 1.05);
      }
      for (let j = 0; j < 7; j++) { const u = (rnd() - 0.5) * (rv.width - 1.5), z = fl.z + 1.0 + rnd() * 1.6; addRock(wetG, river.cx(z) + u, bot - 0.2, z, 0.3 + rnd() * 0.5, 0.75); }
      for (const side of [-1, 1]) for (let j = 0; j < 3; j++) { const z = fl.z - 1.2 + j * 0.9, x = river.cx(z) + side * (river.halfW + 0.2 + rnd() * 0.8); addRock(dryG, x, river.heightAt(x, z) - 0.1, z, 0.6 + rnd() * 0.7 + fl.h * 0.08, 1); }
      sp.push({ x: river.cx(fl.z + 0.9), y: bot + 0.05, z: fl.z + 0.9, w: rv.width - 1.2, ax: 1, az: 0, dx: 0, dz: 1, pow: 0.7 + Math.min(1.3, fl.h * 0.3), n: clamp(rv.width / 10 * (0.6 + fl.h * 0.25), 0.8, 3) });
    }
    // seitliche Faelle
    this.fallSpots = [{ x: river.cx(river.falls[0].z), z: river.falls[0].z, k: clamp(0.5 + fallHk(river.falls[0].h), 0.5, 1.4) }];
    const lightU = { value: new THREE.Color(1, 1, 1).lerp(sunCol, 0.3).multiplyScalar(overcast ? 0.7 : 0.6 + 0.4 * Math.min(1, sunK)) };
    for (const sf of river.sideFalls) {
      const pos = [], uvs = [], fade = [], idx = []; let len = 0, px = 0, py = 0, pz = 0, n = 0, topY = 0, topX = 0;
      const hTop = Math.min(rv.bankMax * 0.8, 10), wob = rnd() * 6;
      for (let o = 9; o >= -0.5; o -= 0.12) {
        const zc = sf.z + Math.sin(o * 0.9 + wob) * 0.25, x = river.cx(zc) + sf.side * (river.halfW + o), h = river.heightAt(x, zc);
        if (!n && h > hTop) continue;                                    // beginnt dort, wo die Wand die Fallhoehe erreicht
        const y = Math.max(h, 0) + 0.07; if (n) len += Math.hypot(x - px, y - py, zc - pz); else { topY = y; topX = x; }
        const w = sf.w * (0.75 + 0.5 * smooth(0, 3, len));               // unten faechert das Band auf
        pos.push(x, y, zc - w / 2, x, y, zc + w / 2); uvs.push(0, len, 1, len); fade.push(0, 0);
        px = x; py = y; pz = zc; n++;
      }
      if (n < 4) continue;
      for (let j = 0; j < n; j++) { const f = smooth(0, 3, j) * (1 - smooth(n - 4, n - 1, j) * 0.35); fade[j * 2] = fade[j * 2 + 1] = f; if (j < n - 1) idx.push(j * 2, j * 2 + 1, j * 2 + 2, j * 2 + 1, j * 2 + 3, j * 2 + 2); }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2)); g.setAttribute('aFade', new THREE.Float32BufferAttribute(fade, 1)); g.setIndex(idx);
      const m = new THREE.Mesh(g, new THREE.ShaderMaterial({ uniforms: { uN: { value: this.noiseTex }, uTime: this.timeU, uOff: { value: rnd() }, uLight: lightU, ...fogU }, vertexShader: FALL_VS, fragmentShader: FALL_FS, transparent: true, depthWrite: false, side: THREE.DoubleSide }));
      m.renderOrder = 6; m.userData.air = true; m.frustumCulled = false; this.env.add(m);
      for (const dz of [-1, 1]) { const rz = sf.z + dz * (sf.w * 0.5 + 0.3), rx = topX + sf.side * 0.15; addRock(dryG, rx, river.heightAt(rx, rz) - 0.15, rz, 0.4 + rnd() * 0.35, 0.9); }   // Quellfassung oben
      for (let j = 0; j < 4; j++) { const z = sf.z + (rnd() - 0.5) * 2.4, x = river.cx(z) + sf.side * (river.halfW - 0.2 + rnd() * 0.9); addRock(wetG, x, river.heightAt(x, z) - 0.08, z, 0.25 + rnd() * 0.3, 0.8); }
      const ex = river.cx(sf.z) + sf.side * (river.halfW - 0.5);
      sp.push({ x: ex, y: 0.05, z: sf.z, w: sf.w * 1.3, ax: 0, az: 1, dx: -sf.side * 0.6, dz: 0.3, pow: 0.45 + Math.min(0.6, topY * 0.06), n: 0.5 });
      this.fallSpots.push({ x: ex, z: sf.z, k: 0.45 + Math.min(0.5, topY * 0.05) });
    }
    spray(sp, overcast ? 0.4 : 0.5);

    // Treibholz
    const logMat = this.caustic(new THREE.MeshStandardMaterial({ color: C(0xd8cdbc), roughness: 1, map: this.tex.bark, normalMap: this.tex.barkN }));
    for (let i = 0; i < 7; i++) {
      const side = rnd() < 0.5 ? -1 : 1, z = -70 + rnd() * 80, x = river.cx(z) + side * (river.halfW + 0.3 + rnd() * 1.6), len = 1.5 + rnd() * 3;
      const m = new THREE.Mesh(new THREE.CylinderGeometry(0.07 + rnd() * 0.05, 0.11 + rnd() * 0.07, len, 7), logMat);
      m.position.set(x, river.heightAt(x, z) + 0.08, z); m.rotation.set(Math.PI / 2 + (rnd() - 0.5) * 0.15, 0, (rnd() - 0.5) * 1.6); m.rotation.order = 'YXZ'; m.rotation.y = rnd() * 3;
      m.castShadow = m.receiveShadow = true; this.env.add(m);
    }

    // Vegetation aus Nadel- und Blattkarten
    const vk = this.mobile ? 0.6 : 1;
    const dm = new THREE.Object3D(), lc = new THREE.Color();
    const inst = (geo, mat, list, o = {}) => {
      const im = new THREE.InstancedMesh(geo, mat, Math.max(1, list.length));
      list.forEach((q, k) => {
        dm.position.set(q.x, q.y, q.z); dm.scale.set(q.s, q.s * (q.sy || 1), q.s); dm.rotation.y = q.ry; dm.updateMatrix(); im.setMatrixAt(k, dm.matrix);
        if (o.color) { lc.copy(q.c); const m = o.mul || [1, 1, 1]; lc.r *= tint[0] * m[0]; lc.g *= tint[1] * m[1]; lc.b *= tint[2] * m[2]; im.setColorAt(k, lc); }
      });
      im.count = list.length; im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true;
      im.castShadow = o.shadow !== false; if (o.depth) im.customDepthMaterial = o.depth;
      this.env.add(im); return im;
    };
    const obst = this.obst = [];   // Baeume und Buesche als Kreise: die Kamera weicht ihnen aus
    const block = (list, r) => { for (const q of list) obst.push({ x: q.x, z: q.z, r2: (r * q.s + 0.45) ** 2 }); return list; };
    const clearOf = (q, r, m = 1.2) => Math.abs(river.off(q.x, q.z)) - river.halfW >= m + r * q.s + 0.45;   // der Angler (bis 1 m an Land) steht nie im Laub; im Wald darf es enger zugehen
    const spots = (n, place) => { const l = []; for (let i = 0; i < n * 4 && l.length < n; i++) { const q = place(); if (q) { q.ry = rnd() * 6.3; l.push(q); } } return l; };
    const bankSpot = (minO, maxO, pw, zMin = Z0 + 4) => {
      const side = rnd() < 0.5 ? -1 : 1, z = zMin + rnd() * (Z1 - zMin - 3), x = river.cx(z) + side * (river.halfW + minO + Math.pow(rnd(), pw) * (maxO - minO));
      const h = river.heightAt(x, z);
      if (rv.cliff && h > 1.3 && h < rv.bankMax * 0.84) return null;
      return { x, z, y: h, side };
    };
    const shade = () => { const b = 0.78 + rnd() * 0.4; return new THREE.Color(b * (0.88 + rnd() * 0.2), b, b * (0.8 + rnd() * 0.25)); };
    const barkMat = new THREE.MeshStandardMaterial({ map: this.tex.bark, normalMap: this.tex.barkN, roughness: 1, color: C(0xddd2c4) });
    const cardMat = tex => new THREE.MeshLambertMaterial({ map: tex, alphaTest: 0.5, side: THREE.DoubleSide, vertexColors: true });
    const cardDepth = tex => new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: tex, alphaTest: 0.5, side: THREE.DoubleSide });
    const needleMat = cardMat(this.tex.branch), needleDepth = cardDepth(this.tex.branch);
    // Im Winter tragen die Laubbaeume Geaest statt Laub - dieselbe Krone, andere Karte.
    const crownTex = win ? this.tex.twig : this.tex.leaf;
    const leafMat = cardMat(crownTex), leafDepth = cardDepth(crownTex);
    // Herbst: kraeftig gelb. Winter: das Geaest bleibt holzfarben, der Laubfaktor des Reviers
    // wuerde es sonst einfaerben.
    // Die Laubkarte ist gruen; um daraus Gelb zu machen, muss Rot weit ueber Gruen liegen
    // und Blau fast verschwinden. Ein sanfter Faktor ergibt nur Oliv.
    const crownMul = win ? [1.0, 0.95, 0.9] : aut ? [3.1, 2.0, 0.16] : rv.leaf;
    // Die Winterreviere stehen in den Daten auf leafShare 0 - das war bisher die einzige Art,
    // "kein Laub" zu sagen. Jetzt gibt es kahles Geaest, also duerfen dort wieder Laubbaeume
    // stehen; sie tragen eben keine Blaetter.
    const leafShare = win ? (rv.cliff ? 0.1 : 0.45) : rv.leafShare !== undefined ? rv.leafShare : rv.cliff ? 0.08 : rv.id === 'wiese' || rv.id === 'aeschenzug' ? 0.5 : 0.25;
    // Waldreviere: dieselben Baeume, nur viel mehr davon - und ein Band Jungwuchs, das
    // bis dicht ans Wasser reicht. Erst das macht den Unterschied zwischen "Baeume am
    // Ufer" und "der Bach laeuft durch den Wald".
    // Am Handy faellt der Wald duenner aus: Die Waldreviere zeichnen 1,3 Millionen
    // Dreiecke statt 0,56 - das traegt ein Telefon nicht in voller Dichte.
    const forest = (rv.forest || 1) * (this.mobile ? 0.6 : 1);
    const nT = Math.floor(300 * rv.trees * vk * forest), nL = Math.floor(nT * leafShare), nC = nT - nL;
    // Wo die Baeume stehen, merken wir uns: Voegel setzen sich hinein, Eichhoernchen
    // klettern daran hoch. Ein Tier, das an einem Baum hochlaeuft, der nicht da ist,
    // waere schlimmer als gar keines.
    const treeSpots = [];
    for (let v = 0; v < 2; v++) {
      const list = spots(Math.ceil(nC / 2), () => { const q = bankSpot(3.2, 40, 1.3); if (!q) return null; q.y -= 0.2; q.s = 1.0 + rnd() * 1.15; q.sy = 0.9 + rnd() * 0.4; q.c = shade(); return clearOf(q, 2.4) ? q : null; });
      block(list, 2.4); inst(spruceTrunk(), barkMat, list); inst(spruceGeo(rnd), needleMat, list, { color: true, depth: needleDepth });
      for (const q of list) treeSpots.push({ x: q.x, z: q.z, y: q.y, s: q.s, leaf: false });
    }
    if (nL) for (let v = 0; v < 2; v++) {
      const list = spots(Math.ceil(nL / 2), () => { const q = bankSpot(3.4, 32, 1.5); if (!q) return null; q.y -= 0.15; q.s = 1.0 + rnd() * 0.9; q.sy = 0.9 + rnd() * 0.3; q.c = shade(); return clearOf(q, 2.0) ? q : null; });
      block(list, 2.0); inst(leafTrunk(rnd), barkMat, list); inst(crownGeo(rnd, 2.2, 4.7, 90, 1.5), leafMat, list, { color: true, depth: leafDepth, mul: crownMul });
      for (const q of list) treeSpots.push({ x: q.x, z: q.z, y: q.y, s: q.s, leaf: true });
    }
    // Jungwuchs: kleine Fichten, die naeher ans Wasser duerfen. Ein kleiner Baum hat eine
    // kleine Krone, also laesst ihn dieselbe Freihalteregel von selbst dichter heran -
    // der Angler steht trotzdem nie im Geaest.
    if (rv.forest) {
      const list = spots(Math.round(130 * vk * forest), () => {
        const q = bankSpot(1.4, 15, 1.4); if (!q) return null;
        q.y -= 0.12; q.s = 0.45 + rnd() * 0.5; q.sy = 0.85 + rnd() * 0.45; q.c = shade();
        return clearOf(q, 2.4, 0.6) ? q : null;
      });
      block(list, 2.0); inst(spruceTrunk(), barkMat, list); inst(spruceGeo(rnd), needleMat, list, { color: true, depth: needleDepth });
      for (const q of list) treeSpots.push({ x: q.x, z: q.z, y: q.y, s: q.s, leaf: false });
      // Wo Laubholz steht, gehoert es ans Wasser: Weiden und Pappeln wurzeln im Ufer.
      // Ohne diesen Guertel bleibt zwischen Wasser und Wald ein offener Streifen stehen,
      // und ein Auwald sieht aus wie eine Wiese mit Wald am Horizont.
      if (leafShare > 0.3) {
        const nah = spots(Math.round(110 * vk * forest), () => {
          const q = bankSpot(1.6, 13, 1.5); if (!q) return null;
          q.y -= 0.12; q.s = 0.62 + rnd() * 0.5; q.sy = 0.95 + rnd() * 0.35; q.c = shade();
          return clearOf(q, 2.0, 0.6) ? q : null;
        });
        block(nah, 1.7); inst(leafTrunk(rnd), barkMat, nah); inst(crownGeo(rnd, 2.2, 4.7, 90, 1.5), leafMat, nah, { color: true, depth: leafDepth, mul: crownMul });
        for (const q of nah) treeSpots.push({ x: q.x, z: q.z, y: q.y, s: q.s, leaf: true });
      }
    }
    this.fauna = new Fauna(this.env, { rnd, river, trees: treeSpots, C, win, mobile: this.mobile });
    inst(crownGeo(rnd, 0.72, 0.5, 18, 0.9), leafMat, block(spots(Math.floor(190 * clamp(rv.trees + 0.3, 0.4, 1.2) * vk * forest * (win ? 0.35 : 1)), () => {
      const q = bankSpot(0.9, 17, 1.7); if (!q || q.y < 0.3) return null;
      q.y -= 0.05; q.s = 0.7 + rnd() * 1.1; q.sy = 0.8 + rnd() * 0.4; q.c = shade(); return clearOf(q, 1.1) ? q : null;
    }), 1.1), { color: true, depth: leafDepth, mul: crownMul });
    // Bodenbewuchs: Grasbueschel, Farne unter den Baeumen, hohes Gras an der Wasserkante
    const sway = (tex, amp) => {
      const m = new THREE.MeshLambertMaterial({ map: tex, alphaTest: 0.42, side: THREE.DoubleSide });
      m.onBeforeCompile = sh => {
        sh.uniforms.uTime = this.timeU;
        sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float uTime;')
          .replace('#include <begin_vertex>', '#include <begin_vertex>\n#ifdef USE_INSTANCING\ntransformed.x+=sin(uTime*1.8+instanceMatrix[3].x*0.9+instanceMatrix[3].z*0.6)*' + amp.toFixed(3) + '*uv.y*uv.y;\n#endif');
        // Verschattung am Fuss: zwischen den Halmen kommt unten kaum Licht an. Ohne das
        // sitzt jeder Grasbuschel wie aufgeklebt auf dem Boden - das ist der deutlichste
        // Unterschied zwischen gerechnetem und wirklichem Bewuchs, und er kostet nichts.
        sh.uniforms.uAo = this.aoU;
        sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform float uAo;')
          .replace('#include <color_fragment>', '#include <color_fragment>\n          diffuseColor.rgb*=1.-uAo*(1.-smoothstep(0.0,0.5,vMapUv.y));');
      };
      return m;
    };
    const veg = new THREE.Group();
    const scatter = (geo, mat, n, place, sc, col) => {
      const im = new THREE.InstancedMesh(geo, mat, n); let k = 0;
      for (let i = 0; i < n * 6 && k < n; i++) {
        const q = place(); if (!q) continue;
        const sz = sc();
        dm.position.set(q.x, q.y - 0.03, q.z); dm.scale.set(sz[0], sz[1], sz[0]); dm.rotation.y = rnd() * 6.3; dm.updateMatrix(); im.setMatrixAt(k, dm.matrix);
        const bb = 0.8 + rnd() * 0.45; const vg = rv.veg || [1, 1, 1]; lc.setRGB(bb * col[0] * vg[0] * tint[0] * (0.95 + rnd() * 0.15), bb * col[1] * vg[1] * tint[1], bb * col[2] * vg[2] * tint[2] * (0.9 + rnd() * 0.2)); im.setColorAt(k, lc); k++;
      }
      im.count = k; im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true;
      im.receiveShadow = true; veg.add(im); return im;
    };
    const mob = this.mobile ? 0.55 : 1;
    // Im Winter steht kaum noch etwas und was steht, ist grau und niedrig; im Herbst ist das
    // Gras welk und schon duenner. Farne sterben als Erstes ab, Schilf bleibt als Horst stehen.
    const grassN = win ? 0.28 : aut ? 0.4 : 1, grassCol = win ? [1.25, 1.2, 1.05] : aut ? [2.0, 1.45, 0.42] : [1.3, 1.36, 1.0];
    const grassH = win ? 0.55 : aut ? 0.85 : 1;
    // Die Bueschel standen zwischen 0,49 m und 1,89 m hoch - das ist kein Ufergras, das ist
    // ein Schilfguertel, und der Angler watete bis zur Brust darin. Jetzt 0,18 bis 0,73 m,
    // im Mittel gut 40 cm. Dafuer die Haelfte mehr Bueschel, sonst liegt der Boden frei.
    scatter(tuftGeo(), sway(this.tex.tuft, 0.07), Math.round(7000 * mob * grassN), () => { const q = bankSpot(-0.4, 15, 1.9, -78); return !q || q.y < 0.28 || (rv.cliff && q.y > 1.2) ? null : q; },
      () => { const z = (0.34 + rnd() * 0.46) * grassH; return [z, z * (0.75 + rnd() * 0.55)]; }, grassCol);
    scatter(fernGeo(rnd), sway(this.tex.fern, 0.03), Math.round(520 * clamp(rv.trees + 0.3, 0.4, 1.2) * mob * Math.min(forest, 1.8) * (win ? 0 : aut ? 0.45 : 1)), () => { const q = bankSpot(0.7, 11, 1.5, -78); return !q || q.y < 0.3 || (rv.cliff && q.y > 1.6) ? null : q; },
      () => { const z = 0.8 + rnd() * 0.9; return [z, z * (0.8 + rnd() * 0.5)]; }, aut ? [1.55, 1.18, 0.6] : [1.2, 1.3, 0.98]);
    let rc = null;
    scatter(tuftGeo(0.5, 0.92), sway(this.tex.reed, 0.09), rv.cliff ? 0 : Math.round(420 * mob * (win ? 0.5 : 1)), () => {   // in Horsten an ruhigen Uferstellen
      if (!rc || rnd() < 0.12) { rc = bankSpot(-0.9, 0.5, 1, -78); if (rc && river.speedAt(rc.x - rc.side * 0.8, rc.z) > rv.speed * 0.55) rc = null; }
      if (!rc) return null;
      const x = rc.x + (rnd() - 0.5) * 1.6, z = rc.z + (rnd() - 0.5) * 3.2, h = river.heightAt(x, z);
      return h < -0.1 || h > 0.22 ? null : { x, z, y: h };
    }, () => { const z = 0.52 + rnd() * 0.42; return [z, z * (0.75 + rnd() * 0.5)]; }, win ? [1.5, 1.38, 1.05] : aut ? [1.6, 1.3, 0.7] : [1.45, 1.5, 1.12]);   // hoeher als das Gras, aber kein Kamm aus schwarzen Spitzen mehr
    // Herbst: ein Laubteppich am Ufer. Dieselbe Laubkarte, flach hingelegt und leicht gedreht.
    if (aut) {
      const litter = new THREE.PlaneGeometry(0.55, 0.55); litter.rotateX(-Math.PI / 2);
      scatter(litter, cardMat(this.tex.leaf), Math.round(2600 * mob), () => { const q = bankSpot(-0.2, 13, 1.7, -78); return !q || q.y < 0.26 ? null : q; },
        () => { const z = 0.8 + rnd() * 1.4; return [z, 1]; }, [3.0, 1.9, 0.18]);
    }
    veg.visible = this.hi; this.grass = veg; this.env.add(veg);
    // bedeckt streut der Himmel diffus und traegt mehr, pralle Sonne weniger
    this.setEnvK(overcast ? 1.15 : 0.85);
    return river;
  }

  // Kaustiken auf ein beliebiges Material legen: das Sonnenlicht, das die bewegte Oberflaeche
  // buendelt, wandert als helles Netz ueber alles unter Wasser - nicht nur ueber den Grund.
  // Dieselben zwei gegenlaeufigen Rauschabgriffe wie im Bettshader, damit das Muster durchlaeuft:
  // ein Stein im Flussbett traegt genau die Strahlen weiter, die neben ihm auf dem Kies liegen.
  // Gerechnet wird in Weltkoordinaten, weil Steine, Fische und Treibholz anders als das Bett
  // verschoben und gedreht sind; bei Instanzen kommt die Instanzmatrix dazu.
  caustic(mat, k = 1.3, floor = 0.84) {
    const prev = mat.onBeforeCompile;
    // Die Staerke bleibt am Material haengen, damit sie sich spaeter noch drehen laesst
    mat.userData.uCk = { value: k };
    mat.onBeforeCompile = s => {
      if (prev) prev(s);
      Object.assign(s.uniforms, { uNz: { value: this.noiseTex }, uTime: this.timeU, uCaust: this.causticU, uCk: mat.userData.uCk, uCf: { value: floor } });
      s.uniforms.uSnow = this.snowU;
      s.vertexShader = s.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vCW; varying vec3 vCN;')
        .replace('#include <begin_vertex>', `#include <begin_vertex>
          #ifdef USE_INSTANCING
            vCW=(modelMatrix*instanceMatrix*vec4(transformed,1.)).xyz;
            vCN=normalize(mat3(modelMatrix)*mat3(instanceMatrix)*objectNormal);
          #else
            vCW=(modelMatrix*vec4(transformed,1.)).xyz;
            vCN=normalize(mat3(modelMatrix)*objectNormal);
          #endif`);
      s.fragmentShader = s.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vCW; varying vec3 vCN; float vWet=0.; uniform sampler2D uNz; uniform float uTime,uCaust,uCk,uCf,uSnow;')
        .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\n          roughnessFactor=mix(roughnessFactor,0.16,vWet);')
        .replace('#include <map_fragment>', `#include <map_fragment>
          if(vCW.y<0.0){
            float shw=smoothstep(-1.8,-0.04,vCW.y), tt=uTime*0.5;
            float c1=texture2D(uNz,vCW.xz*0.11+vec2(0.02*tt,-0.05*tt)).b;
            float c2=texture2D(uNz,vCW.xz*0.14+vec2(0.31-0.03*tt,0.17-0.07*tt)).a;
            float ca=pow(clamp(1.-abs(c1-c2)*3.4,0.,1.),7.)*shw;
            diffuseColor.rgb*=uCf+ca*uCk*uCaust;
          }
          // Nasser Saum: was gerade aus dem Wasser ragt, ist dunkel und glaenzt, trockener
          // Fels darueber bleibt matt. Bisher war alles gleich matt - das ist der Grund,
          // warum das Ufer leblos aussah, und das Umgebungslicht hatte dort nichts zu spiegeln.
          else if(vCW.y<0.34){
            vWet=1.-smoothstep(0.02,0.34,vCW.y);
            diffuseColor.rgb*=mix(1.,0.6,vWet);
          }
          // Schnee liegt nur, wo es nach oben zeigt und ueber dem Wasser ist.
          else if(uSnow>0.001){
            float up=smoothstep(0.32,0.82,vCN.y);
            float dry=smoothstep(0.02,0.3,vCW.y);
            float pat=0.55+0.45*texture2D(uNz,vCW.xz*0.7).b;
            float sn=clamp(up*dry*pat*uSnow,0.,1.);
            diffuseColor.rgb=mix(diffuseColor.rgb,vec3(0.93,0.95,0.99),sn);
          }`);
    };
    mat.customProgramCacheKey = () => 'caust' + k + '_' + floor;
    return mat;
  }

  // Umgebungslicht aus dem Himmelsbild. Einmal je Lichtstimmung gerechnet und behalten -
  // PMREM kostet beim Bauen ein paar Millisekunden, danach nichts mehr.
  applyEnv(lid) {
    if (lid !== this.envLid) return;
    if (!this.envOn) { this.scene.environment = null; return; }
    let e = this.envMaps[lid];
    if (!e) {
      const t = this.skyTex[lid];
      if (!t || !t.image) return;                     // Bild noch unterwegs; der Ladehaken ruft erneut
      e = this.envMaps[lid] = this.pmrem.fromEquirectangular(t).texture;
    }
    this.scene.environment = e;
    this.setEnvK(this.envK);
  }
  // r160 kennt scene.environmentIntensity noch nicht, also je Material setzen
  setEnvK(k) {
    this.envK = k;
    this.scene.traverse(o => { if (!o.material) return; for (const m of [].concat(o.material)) if (m.envMapIntensity !== undefined) m.envMapIntensity = k; });
  }

  // Umgebungsverdeckung ein- oder ausschalten. Eigener Schalter, nicht an die Grafikstufe
  // gebunden: sie ist der einzige Posten, der echte Millisekunden kostet, und ob einem das
  // Bild das wert ist, entscheidet man selbst.
  setAo(on) { on = !!on; if (on === this.aoOn) return; this.aoOn = on; this.makeTargets(); }   // Ziele neu bauen: MSAA und Tiefentextur haengen daran

  // Ein zweiter Angler. Bewusst nicht dieselbe Figur wie die eigene: die ist ein einzelner
  // Skinned-Mesh mit Knochen, und poseAngler setzt sie ueber Einzelstuecke (this.rig,
  // this.arms, this.legs). Ein zweites Exemplar braeuchte SkeletonUtils und einen Umbau
  // der ganzen Posenrechnung. Der Fremde steht meist 5 bis 30 m weit weg - dort zaehlt,
  // dass man ihn als Angler erkennt und sieht, was er tut, nicht sein Reissverschluss.
  buildRemote() {
    if (this.remote) return this.remote;
    const g = new THREE.Group(); g.visible = false;
    const M = (c, r = 0.85, me = 0) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: me });
    const wader = this.caustic(M(0x5a6450, 0.75), 1.0, 0.88);   // steht im Wasser, also Kaustiken und Schnee
    const jacket = M(0x2f4858, 0.9), skin = M(0xc49a74, 0.85), cap = M(0x7a8a3a, 0.9);
    const add = (p, geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; p.add(m); return m; };
    add(g, new THREE.CapsuleGeometry(0.1, 0.42, 4, 10), wader, -0.085, 0.36, 0);        // Beine
    add(g, new THREE.CapsuleGeometry(0.1, 0.42, 4, 10), wader, 0.085, 0.36, 0);
    add(g, new THREE.CapsuleGeometry(0.2, 0.34, 4, 12), wader, 0, 0.84, 0).scale.set(1, 1, 0.72);   // Huefte und Wathose
    add(g, new THREE.CapsuleGeometry(0.21, 0.36, 4, 12), jacket, 0, 1.2, 0).scale.set(1, 1, 0.66);  // Oberkoerper
    const head = new THREE.Group(); head.position.set(0, 1.58, 0); g.add(head);
    add(head, new THREE.SphereGeometry(0.105, 14, 10), skin, 0, 0, 0);
    add(head, new THREE.SphereGeometry(0.108, 14, 8, 0, 6.3, 0, Math.PI * 0.55), cap, 0, 0.02, 0);
    add(head, new THREE.CylinderGeometry(0.095, 0.095, 0.008, 14, 1, false, Math.PI / 2, Math.PI), cap, 0, 0.026, -0.08).scale.set(1, 1, 1.35);
    this.remoteHead = head;
    // Arme: einer haelt die Rute, einer haengt. Beide werden auf die Rutenspitze ausgerichtet.
    this.remoteArm = add(g, new THREE.CapsuleGeometry(0.052, 0.4, 4, 8), jacket, 0, 0, 0);
    add(g, new THREE.CapsuleGeometry(0.052, 0.38, 4, 8), jacket, -0.2, 1.17, 0.02);
    // Rute: ein Segment vom Griff zur Spitze, in Weltkoordinaten gestellt
    this.remoteRod = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.011, 1, 6), M(0x1d1d20, 0.5));
    this.remoteRod.castShadow = true; this.scene.add(this.remoteRod);
    // Schnur: eine feine Linie allein verschwindet auf Entfernung, deshalb zusaetzlich
    // ein duenner Zylinder - dasselbe, was die eigene Schnur macht.
    const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(14 * 3), 3));
    this.remoteLine = new THREE.Line(lg, new THREE.LineBasicMaterial({ color: 0xf6f4e0, transparent: true, opacity: 0.7 }));
    this.remoteLine.frustumCulled = false; this.scene.add(this.remoteLine);
    // Vierzehn Abschnitte: Indikator und Trockenfliege brauchen einen Verlauf, keine
    // Gerade - zwoelf Stuecke fuer den Bogen aufs Wasser, dazu der Schenkel hinunter
    // zur Nymphe. Die Euro-Montage kommt mit fuenf aus (drei davon der Sighter).
    this.remoteSegs = [];
    this._rpts = Array.from({ length: 13 }, () => new THREE.Vector3());
    for (let i = 0; i < 14; i++) {
      const m = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 5), this.flyLineMat || M(0xdff06a, 0.6));
      m.frustumCulled = false; m.visible = false; this.scene.add(m); this.remoteSegs.push(m);
    }
    this.remoteLineSeg = this.remoteSegs[0];
    // Dieselben Farben wie an der eigenen Montage, damit man sie wiedererkennt - aber
    // eigene Materialien. Vorher teilte sich die fremde Schnur das Material mit der
    // eigenen, und setRigStyle faerbt das um: Die fremde Flugschnur trug dann die Farbe
    // der eigenen Montage, nicht die der fremden.
    const LM = c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.6 });
    this.remoteMats = {
      euro: LM(0xf0eedc), indi: LM(0xff9a3a), dry: LM(0xcfe08a),                 // dicke Flugschnur je Montage
      lead: LM(0xe9e9da),                                                        // duennes Vorfach
      pink: new THREE.MeshBasicMaterial({ color: 0xff2f7a }),
      gelb: new THREE.MeshBasicMaterial({ color: 0xf8e71c }),
    };
    this.remoteMats.fly = this.remoteMats.euro;
    this.remoteInd = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), M(0xff7a1a, 0.7));
    this.remoteInd.frustumCulled = false; this.remoteInd.visible = false; this.scene.add(this.remoteInd);
    // Was am Ende der Schnur haengt: Nymphe mit Perle, oder die Trockenfliege obenauf
    this.remoteFly = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), M(0x4a3520, 0.8));
    this.remoteBead = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 6), M(0xe0b040, 0.25, 0.9));
    for (const m of [this.remoteFly, this.remoteBead]) { m.frustumCulled = false; m.visible = false; this.scene.add(m); }
    g.traverse(o => { o.frustumCulled = false; o.layers.enable(1); });
    this.scene.add(g);
    this.remote = g; this.remoteWalk = 0;
    return g;
  }

  // Dieselbe Figur wie die eigene fuer den zweiten Spieler. Sie bekommt ein eigenes
  // Skelett (sonst bewegen sich beide im Gleichschritt) und ein eigenes Koerpermaterial
  // mit gruenem Hemd. Bis das Modell geladen ist, steht die einfache Kapselfigur da.
  buildRemoteFigure(src, mats) {
    const o = cloneSkinned(src);
    const head = mats[1];
    const green = this.caustic(new THREE.MeshStandardMaterial({ map: null, roughness: 0.9 }), 1.0, 0.88);
    // Eigenes Bild laden, statt auf die schon laufende Texturladung zu hoffen: zum Zeitpunkt
    // des Klonens ist sie meist noch unterwegs, und dann bliebe das Hemd blau.
    const img = new Image();
    img.onload = () => { green.map = greenShirt(img); green.needsUpdate = true; };
    img.src = 'assets/angler_body.jpg';
    o.traverse(n => { if (n.isSkinnedMesh) { n.material = [green, head]; n.castShadow = true; n.frustumCulled = false; } n.layers.enable(1); });
    const g = new THREE.Group(); g.add(o); g.visible = false;
    this.scene.add(g);
    this.remoteFig = g;
    const B = n => o.getObjectByName('Bip01_' + n);
    const side = k => ({ up: B(k + '_UpperArm'), fo: B(k + '_Forearm'), hand: B(k + '_Hand'), thigh: B(k + '_Thigh'), calf: B(k + '_Calf'), foot: B(k + '_Foot') });
    this.remoteRig = { o, spine: B('Spine'), spine1: B('Spine1'), neck: B('Neck'), head: B('Head'), R: side('R'), L: side('L') };
    if (this.remote) this.remote.visible = false;          // Kapselfigur abloesen
    this._remoteWalkPh = 0;
    return g;
  }

  // r: was net.lerped() liefert, oder null, wenn gerade niemand da ist.
  // gy ist die Gelaendehoehe am fremden Ort - nicht groundY(), das traegt schon
  // den Versatz der eigenen Figur in sich.
  poseRemote(r, dt, gy) {
    // Rute und Schnur entstehen in buildRemote - die braucht es auch dann, wenn die
    // geklonte Figur den Kapselkoerper schon abgeloest hat.
    if (!this.remoteRod) this.buildRemote();
    const fig = this.remoteFig;                       // die echte Figur, sobald das Modell da ist
    const g = fig || this.remote;
    const on = !!r;
    g.visible = this.remoteRod.visible = this.remoteLine.visible = on;
    if (!on) { for (const m of this.remoteSegs) m.visible = false; this.remoteInd.visible = this.remoteFly.visible = this.remoteBead.visible = false; }
    if (this.remote && fig) this.remote.visible = false;
    if (!on) return;
    if (fig) return this.poseRemoteFigure(r, dt, gy);
    g.position.set(r.px, gy - 0.05, r.pz); g.rotation.y = r.face;   // 0,05: der Fuss der untersten Kapsel
    // Watschritt: dieselbe Schaukel wie bei der eigenen Figur, nur aus der Ferne betrachtet
    this.remoteWalk += dt * (5 + 5 * r.walk);
    g.position.y = gy - 0.05 + Math.sin(this.remoteWalk * 2) * 0.02 * r.walk;
    this.remoteHead.rotation.x = r.mode === 'drift' || r.mode === 'fight' ? -0.25 : 0;
    // Rute vom Griff (vor der Brust) zur uebertragenen Spitze
    const hx = r.px + Math.sin(r.face) * -0.25, hz = r.pz + Math.cos(r.face) * -0.25, hy = gy + 1.1;
    _a.set(r.tip.x - hx, r.tip.y - hy, r.tip.z - hz);
    const len = Math.max(0.3, _a.length());
    this.remoteRod.scale.set(1, len, 1);
    this.remoteRod.position.set(hx + _a.x / 2, hy + _a.y / 2, hz + _a.z / 2);
    this.remoteRod.quaternion.setFromUnitVectors(UP, _a.normalize());
    this.remoteArm.position.set(Math.sin(r.face) * -0.12 + 0.17 * Math.cos(r.face), 1.17, Math.cos(r.face) * -0.12 - 0.17 * Math.sin(r.face));
    this.remoteArm.quaternion.copy(this.remoteRod.quaternion);
    // Schnur: nur wenn sie im Wasser ist, sonst haengt sie an der Spitze
    this._remoteLine(r);
  }

  // Die geklonte Figur stellen. Bewusst knapper als poseAngler: Es gibt keinen Sighter
  // der Gegenseite, dem der Blick folgen koennte, und aus 5 bis 30 m zaehlt der Watschritt
  // und die Haltung an der Rute, nicht jeder Wirbel.
  poseRemoteFigure(r, dt, gy) {
    const g = this.remoteFig, rig = this.remoteRig;
    g.position.set(r.px, gy + 0.56, r.pz); g.rotation.y = r.face;   // wie die eigene Figur: Wurzel auf groundY
    const A = this._remoteWalkA = (this._remoteWalkA || 0) + ((r.walk || 0) - (this._remoteWalkA || 0)) * Math.min(1, dt * 8);
    this._remoteWalkPh += dt * (5 + 5 * A);
    const ph = this._remoteWalkPh;
    rig.o.position.y = -0.56 + Math.abs(Math.sin(ph)) * 0.03 * A;
    g.updateMatrixWorld(true);
    const Xw = _a.set(1, 0, 0).applyQuaternion(g.quaternion);
    const drill = r.mode === 'fight', drift = r.mode === 'drift' || r.mode === 'cast';
    const lean = drill ? 0.2 : drift ? 0.08 : 0;
    boneSwing(rig.spine, Xw, lean * 0.4 - 0.05 * A);
    boneSwing(rig.spine1, Xw, lean * 0.6);
    boneSwing(rig.neck, Xw, (drift || drill ? -0.18 : 0) * 0.4);
    for (const sx of [1, -1]) {
      const k = sx > 0 ? rig.R : rig.L, q = ph + (sx > 0 ? Math.PI : 0);
      const hip = Math.sin(q) * 0.5 * A, knee = -(0.08 + Math.max(0, Math.sin(q + 0.9)) * 0.85) * A - 0.04;
      boneSwing(k.thigh, Xw, hip);
      boneSwing(k.calf, Xw, knee);
      boneSwing(k.foot, Xw, -(hip + knee) * 0.6);
    }
    // Der Griffpunkt muss derselbe sein, den der Absender fuer seine eigene Rute benutzt
    // (hand() in main.js), sonst schwebt die Rute neben der Figur statt in ihrer Hand.
    const c = Math.cos(r.face), sn = Math.sin(r.face), lx = 0.2, lz = -0.4;
    const hx = r.px + lx * c + lz * sn, hy = gy + 1.36, hz = r.pz - lx * sn + lz * c;
    // Die Arme werden auf den Griff gezielt, nicht auf feste Winkel gestellt: Die Ruhelage
    // des Modells ist eine T-Haltung, und was danach natuerlich aussieht, haengt davon ab,
    // wo die Rute gerade steht. Zweigliedrige Kette, Ellenbogen ueber den Kosinussatz.
    this._aimArm(rig.R, hx, hy, hz, g, 1);
    // Zweite Hand: beim Drill an den Griff, sonst neben die Hoefte. Auch das ueber die
    // Zielrechnung - mit festen Winkeln klappte der Arm in den Koerper, weil die Drehachse
    // fuer die linke Seite spiegelverkehrt liegt.
    if (drill) this._aimArm(rig.L, hx + sn * 0.12, hy - 0.2, hz + c * 0.12, g, -1);
    else this._aimArm(rig.L, r.px - 0.26 * c + 0.1 * sn, gy + 0.92, r.pz + 0.26 * sn + 0.1 * c, g, -1);
    _a.set(r.tip.x - hx, r.tip.y - hy, r.tip.z - hz);
    const len = Math.max(0.3, _a.length());
    this.remoteRod.scale.set(1, len, 1);
    this.remoteRod.position.set(hx + _a.x / 2, hy + _a.y / 2, hz + _a.z / 2);
    this.remoteRod.quaternion.setFromUnitVectors(UP, _a.normalize());
    this._remoteLine(r);
  }

  // Zweigliedrige Kette auf einen Punkt zielen: Oberarm und Unterarm so drehen, dass die
  // Hand dort landet. Der Ellenbogen weicht seitlich aus (Kosinussatz), sonst knickt der
  // Arm in die Figur hinein.
  _aimArm(k, tx, ty, tz, g, sx) {
    const up = k.up, fo = k.fo, hd = k.hand;
    if (!up || !fo || !hd) return;
    // erst in die Ruhelage, damit die gemessenen Laengen stimmen
    boneTurn(up, _q4.identity()); boneTurn(fo, _q4.identity());
    const S = new THREE.Vector3(), E = new THREE.Vector3(), H = new THREE.Vector3();
    up.getWorldPosition(S); fo.getWorldPosition(E); hd.getWorldPosition(H);
    const U = E.distanceTo(S), F = H.distanceTo(E);
    const T = _d.set(tx, ty, tz), toT = _a.copy(T).sub(S);
    const raw = toT.length() || 1e-4, L = clamp(raw, 0.08, U + F - 0.004);
    toT.multiplyScalar(1 / raw);
    const x = (U * U - F * F + L * L) / (2 * L), h = Math.sqrt(Math.max(0, U * U - x * x));
    // Ellenbogen nach aussen und unten, wie bei der eigenen Figur
    const pole = _b.set(sx * 0.5, -1, 0.35).applyQuaternion(g.quaternion);
    pole.addScaledVector(toT, -pole.dot(toT)).normalize();
    const EW = new THREE.Vector3().copy(S).addScaledVector(toT, x).addScaledVector(pole, h);
    // Oberarm von der Ruherichtung auf die Ellenbogenrichtung drehen
    boneTurn(up, _q4.setFromUnitVectors(E.clone().sub(S).normalize(), EW.clone().sub(S).normalize()));
    fo.getWorldPosition(E); hd.getWorldPosition(H);
    boneTurn(fo, _q4.setFromUnitVectors(H.clone().sub(E).normalize(), T.clone().sub(E).normalize()));
  }

  // Schnur der Gegenseite, je nach Montage verschieden. Ohne das sieht jede Rute gleich
  // aus - ein glatter Strang, an dem man nicht erkennt, was der andere ueberhaupt fischt.
  // Gezeichnet wird mit denselben Farben wie an der eigenen Montage:
  //   Euro-Nymphe:   duennes Vorfach mit Sighter (pink-gelb-pink) ueber dem Wasser,
  //                  darunter die Nymphe mit Perle am Grund
  //   Indikator:     dicke Flugschnur zum schwimmenden Anzeiger, dann duenn zur Nymphe
  //   Trockenfliege: dicke Flugschnur mit Durchhang, die Fliege sitzt obenauf
  _remoteLine(r) {
    const Mt = this.remoteMats, segs = this.remoteSegs;
    const wet = r.mode === 'drift' || r.mode === 'fight';
    const T = _rl0.set(r.tip.x, r.tip.y, r.tip.z);
    const plan = [];                                     // {a, b, mat, r}
    Mt.fly = Mt[r.rig] || Mt.euro;
    this.remoteInd.visible = this.remoteFly.visible = this.remoteBead.visible = false;

    // Im Wurf fliegt die Schnur. Das Ende der Schlaufe kommt mit dem Paket; gezeichnet
    // wird von der Rutenspitze dorthin. Vorher fiel der Wurf hier unter "Leerlauf" - die
    // Montage haengte still unter der Spitze, und vom Wurf war nichts zu sehen.
    if (r.mode === 'cast') {
      const E = _rl2.set(r.fly.x, Math.max(0.05, r.fly.d), r.fly.z);
      // Euro wirft nur Vorfach, die anderen beiden die dicke Flugschnur mit etwas Durchhang
      if (r.rig === 'euro') { this._remoteEuro(T, E, plan, Mt); this._remoteNymph(E); }
      else { this._remoteSag(T, E, 0.14, plan, Mt); this.remoteFly.position.copy(E); this.remoteFly.visible = true; }
    }
    // Im Leerlauf haengt dieselbe Montage unter der Rutenspitze, wie bei der eigenen Figur
    // auch - vorher war dort nur ein nackter Strang bis zum Wasser, an dem man nicht
    // erkennen konnte, womit der andere ueberhaupt fischt.
    else if (!wet) {
      // eigener Vektor, nicht _rl1: _remoteEuro rechnet darin weiter und wuerde den
      // Endpunkt ueberschreiben - die Nymphe haengt dann auf Hoehe der Rutenspitze
      const E = new THREE.Vector3(r.tip.x + (r.tip.x - r.px) * 0.06, Math.max(0.1, r.tip.y - 1.9), r.tip.z + (r.tip.z - r.pz) * 0.06);
      if (r.rig === 'euro') { this._remoteEuro(T, E, plan, Mt); this._remoteNymph(E); }
      else {
        plan.push([T.clone(), E.clone(), Mt.fly, 0.004]);
        this.remoteFly.position.copy(E); this.remoteFly.visible = true;
        if (r.rig === 'indi') { this.remoteBead.position.set(E.x, E.y + 0.035, E.z); this.remoteBead.visible = true; }
      }
    } else if (r.mode === 'fight' && r.rig !== 'euro') {
      // Im Drill liegt nichts mehr auf dem Wasser: die Schnur zieht zum Fisch, mit dem
      // Durchhang, den die Spannung zulaesst
      const F = _rl2.set(r.fly.x, -0.05, r.fly.z);
      this._remoteSag(T, F, Math.min(1.2, (1 - Math.min(1, r.s)) * 3.2), plan, Mt);
    } else if (r.rig === 'indi' || r.rig === 'dry') {
      const P = this._remotePath(r, T);
      this._remoteStrand(P, plan, Mt);
      if (r.rig === 'indi') {
        const I = P[P.length - 1];
        this.remoteInd.position.set(I.x, 0.05, I.z); this.remoteInd.visible = true;
        const N = _rl2.set(r.fly.x, -r.fly.d, r.fly.z);
        plan.push([new THREE.Vector3(I.x, 0.05, I.z), N.clone(), Mt.lead, 0.0012]);
        this._remoteNymph(N);
      } else {
        this.remoteFly.position.set(r.fly.x, 0.03, r.fly.z); this.remoteFly.visible = true;
      }
    } else {
      const N = _rl2.set(r.fly.x, -r.fly.d, r.fly.z);
      this._remoteEuro(T, N, plan, Mt);
      this._remoteNymph(N);
    }

    for (let i = 0; i < segs.length; i++) {
      const m = segs[i], e = plan[i];
      if (!e) { m.visible = false; continue; }
      m.visible = true; m.material = e[2];
      placeSeg(m, e[0], e[1], e[3]);
    }
    // feine Linie obendrauf, damit die Schnur auch aus der Ferne sichtbar bleibt.
    // Sie folgt jedem Abschnitt - bei vier festen Punkten schnitt sie den Bogen ab.
    const pos = this.remoteLine.geometry.attributes.position, np = pos.count;
    for (let i = 0; i < np; i++) {
      const e = plan[Math.min(i, plan.length - 1)], q = i < plan.length ? e[0] : e[1];
      pos.setXYZ(i, q.x, q.y, q.z);
    }
    pos.needsUpdate = true;
  }

  // Der Verlauf der Flugschnur bei Indikator und Trockenfliege, genau wie bei der eigenen
  // Figur: Sie faellt von der Rutenspitze aufs Wasser und treibt von dort lose in einem
  // Bogen stromab. Vorher war es ein schnurgerader Strang von der Spitze zur Fliege.
  _remotePath(r, T) {
    const P = this._rpts, N = P.length;
    const D = Math.hypot(r.fly.x - T.x, r.fly.z - T.z) || 1;
    const td = Math.min(D * 0.45, 2.6);                       // Strecke, auf der sie herunterkommt
    const slack = Math.min(1.2, (1 - Math.min(1, r.s)) * 2.2);
    for (let i = 0; i < N; i++) {
      const dist = i / (N - 1) * D, u = dist / D, q = P[i];
      q.set(T.x + (r.fly.x - T.x) * u, 0.015, T.z + (r.fly.z - T.z) * u);
      if (dist < td) q.y = 0.015 + T.y * Math.pow(1 - dist / td, 1.7);
      else q.z += Math.sin(Math.PI * (dist - td) / Math.max(0.01, D - td)) * slack * 0.55;
      if (this.river) for (const k of this.river.rocks) {   // nicht durch den Stein, sondern darauf
        if (Math.hypot(q.x - k.x, q.z - k.z) > (k.vr || k.r * 1.3) + 0.02) continue;
        const top = this.rockTop(k, q.x, q.z);
        if (top !== null && q.y < top + 0.012) q.y = top + 0.012;
      }
    }
    return P;
  }

  // Gerade Strecke mit Durchhang - im Drill, wo nichts mehr auf dem Wasser liegt
  _remoteSag(T, F, sag, plan, Mt) {
    const P = this._rpts, N = P.length;
    for (let i = 0; i < N; i++) {
      const t = i / (N - 1);
      P[i].set(T.x + (F.x - T.x) * t, T.y + (F.y - T.y) * t - sag * 2 * t * (1 - t), T.z + (F.z - T.z) * t);
    }
    this._remoteStrand(P, plan, Mt);
  }

  // Aus einem Verlauf werden Abschnitte: die ersten 62 % dicke Flugschnur, die sich
  // verjuengt, der Rest duennes Vorfach, das duenn auslaeuft - dieselben Masse wie an
  // der eigenen Schnur. Vorher war alles gleich dick und gleich farbig.
  _remoteStrand(P, plan, Mt) {
    const n = P.length - 1, cut = Math.round(0.62 * n);
    for (let i = 0; i < n; i++) {
      const fly = i < cut, k = fly ? 0 : (i - cut) / Math.max(1, n - cut);
      plan.push([P[i].clone(), P[i + 1].clone(), fly ? Mt.fly : Mt.lead,
        fly ? 0.0042 - 0.0012 * (i / Math.max(1, cut)) : 0.0019 - 0.0009 * k]);
    }
  }
  // Euro-Montage zwischen zwei Punkten: duennes Vorfach, der Sighter im oberen Drittel
  _remoteEuro(T, N, plan, Mt) {
    const q = u => _rl1.copy(T).lerp(N, u).clone();
    const p0 = T.clone(), p1 = q(0.3), p2 = q(0.42), p3 = q(0.54), p4 = q(0.66);
    plan.push([p0, p1, Mt.lead, 0.0025],
      [p1, p2, Mt.pink, 0.0045], [p2, p3, Mt.gelb, 0.0045], [p3, p4, Mt.pink, 0.0045],
      [p4, N.clone(), Mt.lead, 0.0025]);
  }
  _remoteNymph(N) {
    this.remoteFly.position.copy(N); this.remoteFly.visible = true;
    this.remoteBead.position.set(N.x, N.y + 0.035, N.z); this.remoteBead.visible = true;
  }

  setClearView(on) { this.waterU.uNoRefl.value = on ? 1 : 0; }   // Spiegelung ausblenden (Sichthilfe)
  setPolar(on) { this.waterU.uClear.value = on ? 1 : 0; }

  makeFish(len, species) {
    const base = this.fishGeos[species] || (this.fishGeos[species] = fishGeo(species));
    const g = base.clone();
    const m = new THREE.Mesh(g, this.fishMats[species] || // Fische bekommen nur Licht dazu, nie weniger (Grundwert 1.0): einen Fisch zu entdecken ist Spielinhalt,
// und der Grund um ihn herum steht im Bettshader schon auf 0.8 - ein Fisch darf davor nicht absaufen
(this.fishMats[species] = this.caustic(new THREE.MeshStandardMaterial({ map: fishSkin(species), roughness: 0.4, metalness: 0.1, side: THREE.DoubleSide, envMapIntensity: this.envK }), 0.8, 1.0)));
    m.userData.base = Float32Array.from(base.attributes.position.array);
    m.scale.setScalar(len / 100 * 1.15);
    m.castShadow = true; m.frustumCulled = false; m.layers.enable(1);
    this.fishGroup.add(m);
    return m;
  }
  animFish(m, ph, amp) {
    const b = m.userData.base, p = m.geometry.attributes.position, a = p.array;
    for (let i = 0; i < b.length; i += 3) { const k = b[i + 2] + 0.5; a[i] = b[i] + Math.sin(b[i + 2] * 6.5 - ph) * amp * 0.11 * k * k; }
    p.needsUpdate = true;
  }
  removeFish(m) { this.fishGroup.remove(m); m.geometry.dispose(); }

  // ---------- Fang im Kescher ----------
  // Nach dem Landen liegt der Fisch im Kescher am Wasser; die Kamera geht nah heran, bis er zurueckgesetzt wird.
  _buildCatchNet() {
    const g = new THREE.Group(); g.visible = false; this.scene.add(g);
    const wood = new THREE.MeshStandardMaterial({ color: 0x7a5230, roughness: 0.65 }), cork = new THREE.MeshStandardMaterial({ color: 0xb98f5e, roughness: 0.95 });
    const NW = 0.4, NL = 0.6, HL = 0.34;   // Rahmen liegt flach, Spitze bei -z, Griff bei +z
    const hoopAt = a => new THREE.Vector3(NW / 2 * Math.sin(a) * (1 - 0.35 * Math.cos(a)) / 1.06, 0, -NL * (1 - Math.cos(a)) / 2);
    const pts = []; for (let k = 0; k < 40; k++) pts.push(hoopAt(k / 40 * Math.PI * 2));
    g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true), 80, 0.012, 8, true), wood));
    const h = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.018, HL, 10), wood); h.rotation.x = Math.PI / 2; h.position.z = HL / 2; g.add(h);
    const c = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.14, 12), cork); c.rotation.x = Math.PI / 2; c.position.z = HL - 0.09; g.add(c);
    const tex = canvasTex(128, (c2, S) => {
      c2.clearRect(0, 0, S, S); c2.strokeStyle = '#1b211c'; c2.lineWidth = 5;
      for (let k = 0; k <= 4; k++) { c2.beginPath(); c2.moveTo(k * S / 4, 0); c2.lineTo(k * S / 4, S); c2.stroke(); c2.beginPath(); c2.moveTo(0, k * S / 4); c2.lineTo(S, k * S / 4); c2.stroke(); }
    }, true);
    tex.repeat.set(11, 4);
    const NU = 36, NV = 8, bp = [], bu = [], bi = [], low = new THREE.Vector3(0, -0.15, -NL / 2);
    for (let v = 0; v <= NV; v++) for (let u = 0; u <= NU; u++) {
      const t = v / NV, q = hoopAt(u / NU * Math.PI * 2), k = Math.pow(t, 1.25);
      q.x += (low.x - q.x) * k; q.z += (low.z - q.z) * k; q.y = -0.15 * Math.sin(t * Math.PI / 2);   // flacher Sack: der Fisch liegt knapp unter dem Rahmen
      bp.push(q.x, q.y, q.z); bu.push(u / NU, t);
    }
    for (let v = 0; v < NV; v++) for (let u = 0; u < NU; u++) { const a = v * (NU + 1) + u, b = a + NU + 1; bi.push(a, b, a + 1, a + 1, b, b + 1); }
    const bg = new THREE.BufferGeometry(); bg.setAttribute('position', new THREE.Float32BufferAttribute(bp, 3)); bg.setAttribute('uv', new THREE.Float32BufferAttribute(bu, 2)); bg.setIndex(bi); bg.computeVertexNormals();
    g.add(new THREE.Mesh(bg, new THREE.MeshLambertMaterial({ map: tex, alphaTest: 0.5, side: THREE.DoubleSide })));
    g.traverse(o => { o.layers.enable(1); if (o.isMesh) o.castShadow = true; });
    g.userData.NL = NL;
    return g;
  }
  // mesh: Fisch aus makeFish; (px, pz): Standort des Anglers; wide: Infoleiste steht rechts (sonst unten)
  showCatch(mesh, len, px, pz, wide) {
    if (this._catch) { this.removeFish(this._catch.mesh); this._catch = null; }
    const net = this.catchNet || (this.catchNet = this._buildCatchNet()), rv = this.river;
    // Platz fuer den Kescher: flaches Wasser neben dem Angler, nicht in einem Stein
    let best = null;
    for (let k = 0; k < 12; k++) {
      const a = k / 12 * Math.PI * 2, x = px + Math.sin(a) * 0.95, z = pz + Math.cos(a) * 0.95, d = rv.depthAt(x, z);
      let sc = d > 0.04 ? -Math.abs(d - 0.22) : -1.5 - rv.heightAt(x, z);
      sc -= Math.abs(x - rv.cx(z)) * 0.02 + (z > pz ? 0.05 : 0);                       // im Zweifel zur Flussmitte und stromauf
      for (const r of rv.rocks) if (Math.hypot(x - r.x, z - r.z) < (r.vr || r.r * 1.3) + 0.45) sc -= 9;
      if (!best || sc > best.sc) best = { sc, x, z, d };
    }
    const cx = best.x, cz = best.z, wy = best.d > 0.04 ? 0 : rv.heightAt(cx, cz) + 0.02;
    let dx = cx - px, dz = cz - pz; const dl = Math.hypot(dx, dz) || 1; dx /= dl; dz /= dl;   // Blickrichtung vom Angler zum Kescher
    const L = len / 100 * 1.15, sc = clamp(L / 0.5, 0.6, 1.45), NL = net.userData.NL * sc;
    // Hochformat: der Fisch liegt laengs zur Blickrichtung (hoch im Bild); Querformat: quer dazu
    const ax = wide ? -dz : dx, az = wide ? dx : dz, yaw = Math.atan2(-ax, -az);
    net.scale.setScalar(sc); net.rotation.set(0, yaw, 0); net.position.set(cx - ax * NL / 2, wy + 0.035, cz - az * NL / 2); net.visible = true;
    if (this.backNet) this.backNet.visible = false;
    mesh.visible = true; mesh.rotation.order = 'YZX';
    const D = Math.max(0.8, L * (wide ? 1.75 : 2.3) + 0.25);
    this._cvPos = (this._cvPos || new THREE.Vector3()).set(cx - dx * D * 0.42, wy + D * 0.92, cz - dz * D * 0.42);
    // Blickpunkt versetzt, damit der Fisch nicht unter der Infoleiste liegt
    this._cvLook = (this._cvLook || new THREE.Vector3()).set(cx, wy, cz);
    if (wide) this._cvLook.x += -dz * D * 0.2, this._cvLook.z += dx * D * 0.2; else this._cvLook.x -= dx * D * 0.2, this._cvLook.z -= dz * D * 0.2;
    this._catch = { mesh, x: cx, y: wy + 0.03 + 0.025 * L, z: cz, yaw, s: L, view: true, ph: 0.6, seed: Math.random() * 6, ax, az, sp: false, rel: 0 };
    this.splash(cx, cz, 0.5);
  }
  releaseCatch() { const C = this._catch; if (C && !C.rel) { C.rel = 1e-4; C.view = false; this.splash(C.x, C.z, 0.6); } }
  _tickCatch(dt, t) {
    const C = this._catch, m = C.mesh, net = this.catchNet;
    if (!C.rel) {
      C.ph += dt;
      const cyc = (C.ph % 4.4) / 4.4, b = cyc < 0.3 ? Math.sin(cyc / 0.3 * Math.PI) : 0;   // alle gut vier Sekunden ein paar kraeftige Schlaege, dazwischen liegt er ruhig und atmet
      if (b > 0.5 && !C.sp) { C.sp = true; this.splash(C.x, C.z, 0.35); } else if (b === 0) C.sp = false;
      this.animFish(m, t * (4 + 18 * b) + C.seed, 0.45 + 2.8 * b);
      m.position.set(C.x + Math.sin(t * 17) * 0.012 * b, C.y + Math.abs(Math.sin(t * 19)) * 0.04 * b * C.s, C.z + Math.cos(t * 15) * 0.012 * b);
      m.rotation.set(Math.sin(t * 9) * 0.05 * b, C.yaw + Math.sin(t * 11) * 0.14 * b, Math.PI / 2 + Math.sin(t * 13) * 0.25 * b + Math.sin(t * 1.3) * 0.04);
      net.rotation.z = Math.sin(t * 15) * 0.035 * b;
    } else {
      C.rel += dt; const k = Math.min(1, C.rel / 1.4), up = Math.min(1, C.rel / 0.4), go = Math.max(0, k - 0.2) / 0.8;
      this.animFish(m, t * (10 + 12 * go) + C.seed, 0.8 + 1.6 * go);
      const dist = 3.4 * go * go;
      m.position.set(C.x + C.ax * dist, C.y - 0.2 * Math.min(1, go * 3) * (C.y < 0.01 ? 1 : 0), C.z + C.az * dist);
      m.rotation.set(0, C.yaw, Math.PI / 2 * (1 - up));
      net.rotation.z = 0;
      if (k >= 1) { this.removeFish(m); this._catch = null; net.visible = false; if (this.backNet) this.backNet.visible = true; }
    }
  }
  clearFish() { for (const c of [...this.fishGroup.children]) this.removeFish(c); }

  splash(x, z, size = 1) {
    const s = this.splashes.find(s => s.t >= 1) || this.splashes[0];
    s.t = 0; s.size = size; s.m.position.set(x, 0.03, z); s.m.visible = true;
    const p = this.drops.geometry.attributes.position.array, v = this.dropV, n = Math.round(9 + size * 14);
    for (let i = 0; i < n; i++) {
      const k = (this.dropI = (this.dropI + 1) % this.dropN) * 3, a = Math.random() * 6.3, sp = (0.3 + Math.random() * 1.3) * size;
      p[k] = x + Math.cos(a) * 0.08; p[k + 1] = 0.05; p[k + 2] = z + Math.sin(a) * 0.08;
      v[k] = Math.cos(a) * sp; v[k + 1] = (1.4 + Math.random() * 2.4) * Math.sqrt(size); v[k + 2] = Math.sin(a) * sp;
    }
  }

  screenToWater(cx, cy) {
    const ndc = new THREE.Vector2(cx / window.innerWidth * 2 - 1, -(cy / window.innerHeight) * 2 + 1);
    this.ray.setFromCamera(ndc, this.camera);
    const out = new THREE.Vector3();
    return this.ray.ray.intersectPlane(this.plane, out) ? out : null;
  }

  update(dt, t, px, pz, gy, focus) {
    this._autoScale();
    this.timeU.value = t;
    const kk = Math.min(1, dt * 3);
    this.camZ += (pz - this.camZ) * kk; this.camX += (px - this.camX) * kk;
    const cz = this.camZ, cxp = this.camX, por = this.portrait;
    // Umschauen: yaw dreht Kamera und Blickpunkt um den Angler, pitch hebt/senkt den Blick
    const yaw = this.yaw || 0, pit = this.pitch || 0, yc = Math.cos(yaw), ys = Math.sin(yaw), fw = Math.max(0, yc);
    const cu = cxp - (this.river ? this.river.cx(cz) : 0);   // Abstand des Anglers von der Flussmitte
    const ox = clamp(cu * (por ? 0.13 : 0.42), -1.6, 1.6) * fw, back0 = por ? 3.7 : 3.9;
    // Drift und Drill: Kamera steigt und schaut steiler aufs Wasser - sonst verdeckt der Angler die Fliege, und die Spiegelung den Fisch darunter
    this._lift = (this._lift || 0) + ((this.lift || 0) - (this._lift || 0)) * Math.min(1, dt * 2.2);
    const lift = this._lift, cy = (por ? 2.75 : 2.25) - pit * 1.3 + lift * (por ? 2.3 : 1.9);
    // Steht hinter dem Angler ein Baum oder Busch, rueckt die Kamera naeher heran statt ins Laub zu geraten
    let want = back0;
    if (this.obst && this.obst.length) {
      // Sichtlinie Angler -> Kamera: bis zum ersten Baum, der sie schneidet
      for (const o of this.obst) {
        const mx = cxp - o.x, mz = cz - o.z, c = mx * mx + mz * mz - o.r2;
        if (c <= 0) { want = 0; break; }
        const bb = mx * ys + mz * yc, disc = bb * bb - c;
        if (bb < 0 && disc > 0) want = Math.min(want, -bb - Math.sqrt(disc) - 0.3);
      }
      want = Math.max(1.2, want);
    }
    if (this._back === undefined) this._back = back0;
    this._back += (want - this._back) * Math.min(1, dt * (want < this._back ? 18 : 3));
    const back = this._back;
    const camX = cxp + ox * yc + back * ys, camZ = cz - ox * ys + back * yc;
    const gh = this.river ? Math.max(0, this.river.heightAt(camX, camZ)) : 0;
    this.camera.position.set(camX + Math.sin(t * 0.4) * 0.025, Math.max(cy, gh + 0.7) + Math.sin(t * 0.7) * 0.018, camZ);
    this._look = this._look || new THREE.Vector3(px - 2, 0.3, -4);
    const lo = (-clamp(cu * (por ? 0.42 : 0.68), -2.4, 2.4) + (focus ? (focus.x - cxp) * 0.12 : 0)) * fw;
    const turned = yaw !== this._yawPrev || pit !== this._pitPrev; this._yawPrev = yaw; this._pitPrev = pit;
    _d.set(cxp + lo * yc - 4.6 * ys, 0.45 + pit * 7 - lift * 0.45, cz - lo * ys - 4.6 * yc);
    if (focus && lift > 0.01) { const b = lift * 0.75; _d.x += (focus.x - _d.x) * b; _d.z += (focus.z - _d.z) * b; }   // Blickpunkt wandert zur Fliege bzw. zum Fisch
    this._look.lerp(_d, turned ? Math.min(1, dt * 14) : kk);
    if (this.pov) {   // Sicht des Anglers: Kamera knapp vor dem Gesicht, damit Arme und Rute im Bild sind, der eigene Kopf aber nicht
      const g = this.angler.position;
      this.camera.position.set(g.x - ys * 0.2, g.y + 1.16 + Math.sin(t * 0.7) * 0.006, g.z - yc * 0.2);
      this._look.set(g.x - ys * 6, g.y - 0.2 + pit * 8, g.z - yc * 6);
    }
    // Fang im Kescher: weich zur Nahaufnahme und zurueck
    const lk = this._lk || (this._lk = new THREE.Vector3()); lk.copy(this._look);
    if (this._catch) this._tickCatch(dt, t);
    this._cv = (this._cv || 0) + ((this._catch && this._catch.view ? 1 : 0) - (this._cv || 0)) * Math.min(1, dt * 3.4);
    if (this._cv > 0.002 && this._cvPos) { const e = this._cv * this._cv * (3 - 2 * this._cv); this.camera.position.lerp(this._cvPos, e); lk.lerp(this._cvLook, e); }
    // in der Nahaufnahme liegt die Rute beiseite, sonst ragt die Rolle gross ins Bild
    const hid = this._cv > 0.35;
    if (hid !== !!this._rodHid) { this._rodHid = hid; for (const m of [...this.rodSegs, ...this.inLine, ...this.lineSegs, ...this.guides.map(g => g.m), this.handle, this.line, this.angler]) if (m) m.visible = !hid; }   // auch der Angler: bei grossen Fischen steht die Kamera hoeher und saehe sonst seinen Kopf
    this.camera.lookAt(lk);
    this.sky.position.copy(this.camera.position);
    // Sonne & Schatten folgen dem Angler
    this.sun.target.position.set(cxp - 1, 0, cz - 9); this.sun.target.updateMatrixWorld();
    this.sun.position.copy(this.sun.target.position).addScaledVector(this.sunDir, 80);
    for (const s of this.splashes) {
      if (s.t >= 1) continue;
      s.t += dt * 1.5;
      const k = Math.min(1, s.t);
      s.m.scale.setScalar(0.08 + k * s.size); s.m.material.opacity = 0.7 * (1 - k);
      if (s.t >= 1) s.m.visible = false;
    }
    const p = this.drops.geometry.attributes.position.array, v = this.dropV;
    for (let i = 0; i < this.dropN * 3; i += 3) {
      if (p[i + 1] < -50) continue;
      v[i + 1] -= 9.8 * dt; p[i] += v[i] * dt; p[i + 1] += v[i + 1] * dt; p[i + 2] += v[i + 2] * dt;
      if (p[i + 1] < 0) p[i + 1] = -100;
    }
    this.drops.geometry.attributes.position.needsUpdate = true;
    if (this.bugs.visible) {
      const b = this.bugs.geometry.attributes.position.array;
      this.bugSeed.forEach((s, i) => {
        b[i * 3] = cxp + s[0] + Math.sin(t * s[4] + s[3]) * 0.8 + Math.sin(t * 3.1 * s[4] + i) * 0.15;
        b[i * 3 + 1] = s[1] + Math.sin(t * 1.7 * s[4] + s[3] * 2) * 0.35;
        b[i * 3 + 2] = cz + s[2] + Math.cos(t * 0.8 * s[4] + s[3]) * 0.9;
      });
      this.bugs.geometry.attributes.position.needsUpdate = true;
    }
    if (this.fauna) this.fauna.update(dt, t, px, pz);
    if (this.snow.visible) {
      const a = this.snow.geometry.attributes.position.array, H = 15;
      for (let i = 0; i < this.snowSeed.length; i++) {
        const s = this.snowSeed[i];
        s[1] -= dt * (0.55 + s[3] * 0.5);                         // leichte Flocken fallen langsamer
        if (s[1] < -0.5) { s[1] = H; s[0] = Math.random() * 44 - 22; s[2] = Math.random() * 44 - 22; }
        a[i * 3] = cxp + s[0] + Math.sin(t * 0.5 * s[3] + s[4]) * 1.1;   // seitliches Treiben
        a[i * 3 + 1] = s[1];
        a[i * 3 + 2] = cz + s[2] + Math.cos(t * 0.38 * s[3] + s[4]) * 0.9;
      }
      this.snow.geometry.attributes.position.needsUpdate = true;
    }
    const R = this.renderer, U = this.waterU, cam = this.camera;
    if (this._needLayers) {   // alles, was unter Wasser sichtbar sein kann, zusaetzlich auf Ebene 1
      this._needLayers = false;
      this.env.traverse(o => { if (o.isMesh && !o.isInstancedMesh && o !== this.water && !o.userData.air) o.layers.enable(1); });
      for (const o of this.scene.children) if (o !== this.env && o !== this.sky) o.traverse(c => c.layers.enable(1));   // Angler, Rute, Schnur, Fische, Licht
    }
    // Bugwelle: Position des Anglers, ob er im Wasser steht, wie schnell er watet
    const wet = this.river && Math.abs(this.river.off(px, pz)) < this.river.halfW && this.river.depthAt(px, pz) > 0.06 ? 1 : 0;
    U.uWader.value.set(px, pz, wet, this.walkAmp || 0);
    // Ruckelt es dauerhaft, die teuren Wasser-Durchgaenge abschalten
    if (this.fxWater || this.fxPost) {
      this._slow = dt > 0.042 ? this._slow + dt : Math.max(0, this._slow - dt * 2);
      // Notbremse, erst wenn der Aufloesungsregler am Anschlag ist: erst Bloom und Strahlen, dann das Wasser,
      // die Kantenglaettung bleibt bis zuletzt
      if (this._slow > 4 && (!this.rsAuto || this.rs <= 0.77)) {
        if (!this._cheap) { this._cheap = true; this._slow = 0; } else if (this.fxWater) { this.fxWater = false; this._slow = 0; } else this.fxPost = false;
      }
    }
    const post = this.fxPost && this.mainRT, out = post ? this.mainRT : null;
    const fx = this.fxWater && this.water && this.sceneRT;
    U.uFx.value = fx ? 1 : 0;
    if (fx) {
      U.uNear.value = cam.near; U.uFar.value = cam.far;
      // 1) Szene unter Wasser: nur Ebene 1 (Grund, Steine, Fische, Angler) - Baeume und Gras braucht es dafuer nicht
      this.water.visible = false; R.shadowMap.autoUpdate = false;
      cam.layers.set(1); R.setRenderTarget(this.sceneRT); R.render(this.scene, cam); cam.layers.set(0);
      // 2) Bild auf den Schirm (Schatten werden hier aktualisiert; Spiegelbild stammt vom vorigen Durchgang)
      this.water.visible = true; R.shadowMap.autoUpdate = true;
      R.setRenderTarget(out); R.render(this.scene, cam);
      // 3) Spiegelbild fuer die naechsten Bilder: nur jedes zweite Bild, ohne Gras, nur ueber der Wasserlinie
      if (((this._frame = (this._frame || 0) + 1) & 1) && U.uNoRefl.value < 0.5) {
        const gv = this.grass ? this.grass.visible : false;
        this.water.visible = false; R.shadowMap.autoUpdate = false;
        if (this.grass) this.grass.visible = false;
        const m = this.mirror; m.fov = cam.fov; m.aspect = cam.aspect; m.near = cam.near; m.far = cam.far; m.updateProjectionMatrix();
        m.position.set(cam.position.x, -cam.position.y, cam.position.z); m.lookAt(this._lk.x, -this._lk.y, this._lk.z);
        R.clippingPlanes = this.clipUp;
        R.setRenderTarget(this.reflRT); R.render(this.scene, m);
        R.clippingPlanes = this.noClip; R.setRenderTarget(null);
        if (this.grass) this.grass.visible = gv;
        this.water.visible = true; R.shadowMap.autoUpdate = true;
      }
    } else { R.setRenderTarget(out); R.render(this.scene, cam); }
    if (post) this.runPost();
  }

  // Bloom (zwei Stufen), Sonnenstrahlen aus dem freien Himmel, dann Tonwerte + Vignette auf den Schirm
  runPost() {
    const R = this.renderer, M = this.pm, T = this.pRT, cam = this.camera, q = this.pQuad;
    const pass = (m, tex, to) => { m.uniforms.tD.value = tex; q.material = m; R.setRenderTarget(to); R.render(this.pScene, this.pCam); };
    const blur = (a, b) => {
      M.blur.uniforms.uDir.value.set(1 / a.width, 0); pass(M.blur, a.texture, b);
      M.blur.uniforms.uDir.value.set(0, 1 / a.height); pass(M.blur, b.texture, a);
    };
    R.shadowMap.autoUpdate = false;
    // Umgebungsverdeckung: aus der Tiefe des Hauptbildes, auf halber Kantenlaenge,
    // danach zweimal weichgezeichnet - sonst rauscht sie sichtbar.
    const aoOn = this.aoOn && this.aoReady && this.mainRT.depthTexture;
    if (aoOn) {
      const A = M.ao.uniforms;
      A.tDep.value = this.mainRT.depthTexture;
      A.uNear.value = cam.near; A.uFar.value = cam.far;
      A.uTanHalf.value = Math.tan(cam.fov * Math.PI / 360);
      q.material = M.ao; R.setRenderTarget(this.aoRT); R.render(this.pScene, this.pCam);
      blur(this.aoRT, this.aoRT2);
      M.final.uniforms.tAo.value = this.aoRT.texture;
    }
    M.final.uniforms.uAo.value = aoOn ? 1 : 0;
    if (this._cheap) {   // sparsam: nur Kantenglaettung, Tonwerte und Vignette
      const F = M.final.uniforms; F.uBloom.value = 0; F.uRays.value = 0;
      F.tB1.value = F.tB2.value = F.tR.value = T[2].texture;
      pass(M.final, this.mainRT.texture, null);
      R.shadowMap.autoUpdate = true; return;
    }
    M.final.uniforms.uBloom.value = 0.38;
    M.bright.uniforms.uPx.value.set(1 / this.mainRT.width, 1 / this.mainRT.height);
    pass(M.bright, this.mainRT.texture, T[0]);
    // Sonnenstrahlen: nur wenn die Sonne vor der Kamera steht
    cam.getWorldDirection(_a);
    const facing = _a.dot(this.sunDir), amt = this.rayK * this.waterU.uSun.value * clamp((facing - 0.05) / 0.4, 0, 1);
    if (amt > 0.01) {
      _b.copy(cam.position).addScaledVector(this.sunDir, 500).project(cam);
      M.rays.uniforms.uSunPos.value.set(_b.x * 0.5 + 0.5, _b.y * 0.5 + 0.5); M.rays.uniforms.uAsp.value = cam.aspect;
      pass(M.rays, T[0].texture, T[4]);
    }
    M.final.uniforms.uRays.value = amt > 0.01 ? amt * 0.9 : 0;
    pass(M.blur, T[0].texture, T[2]);   // verkleinern (uDir vom letzten Bild, unkritisch)
    blur(T[0], T[1]); blur(T[2], T[3]); blur(T[2], T[3]);
    const F = M.final.uniforms; F.tB1.value = T[0].texture; F.tB2.value = T[2].texture; F.tR.value = T[4].texture;
    pass(M.final, this.mainRT.texture, null);
    R.shadowMap.autoUpdate = true;
  }
}
const _c = new THREE.Color();
