// 3D-Welt v2: realistischeres Wasser, Licht & Schatten, Vegetation, Felsen, Berge, Angler, Fische
import * as THREE from './three.module.min.js';
import { makeRiver, mulberry32, vnoise, LANE_X } from './river.js';

const UP = new THREE.Vector3(0, 1, 0);
const _d = new THREE.Vector3(), _a = new THREE.Vector3(), _b = new THREE.Vector3();
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
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
const FISH_COL = {
  bachforelle: [0x4a4020, 0xb89448, 0xe8d8a0], regenbogen: [0x3c5046, 0xb8a8b0, 0xeeeeea], aesche: [0x4a545c, 0x9aa6ac, 0xe6e8e6],
  saibling: [0x263a2a, 0x66743e, 0xe07a30], barbe: [0x554e2c, 0xa89050, 0xe8dcb0], marmorata: [0x44482e, 0x9a946c, 0xe4dcbc],
};
function fishGeo(species) {
  const [cb, cs, cv] = (FISH_COL[species] || FISH_COL.bachforelle).map(h => new THREE.Color(h));
  const NS = 15, NR = 10, pos = [], col = [], idx = [], t3 = new THREE.Color();
  const hw = t => 0.012 + 0.1 * Math.pow(Math.sin(Math.PI * Math.pow(t, 0.58)), 0.8) + 0.016 * t;
  for (let s = 0; s <= NS; s++) {
    const t = s / NS, h = hw(t), w = h * 0.56, z = -0.5 + t * 0.87;
    for (let j = 0; j < NR; j++) {
      const a = j / NR * Math.PI * 2, sy = Math.sin(a);
      pos.push(Math.cos(a) * w, sy * h - 0.01, z);
      if (sy > 0.35) t3.copy(cb); else if (sy > -0.45) t3.copy(cb).lerp(cs, clamp((0.35 - sy) / 0.5, 0, 1)); else t3.copy(cs).lerp(cv, clamp((-0.45 - sy) / 0.4, 0, 1));
      col.push(t3.r, t3.g, t3.b);
    }
  }
  for (let s = 0; s < NS; s++) for (let j = 0; j < NR; j++) {
    const a = s * NR + j, b = s * NR + (j + 1) % NR, c = a + NR, d = b + NR;
    idx.push(a, c, b, b, c, d);
  }
  const fin = (pts, c) => { const o = pos.length / 3; for (let i = 0; i < pts.length; i += 3) { pos.push(pts[i], pts[i + 1], pts[i + 2]); col.push(c.r, c.g, c.b); } for (let i = 1; i < pts.length / 3 - 1; i++) idx.push(o, o + i, o + i + 1); };
  const fc = cb.clone().lerp(cs, 0.5);
  fin([0, 0.027, 0.36, 0, 0.125, 0.5, 0, 0, 0.445, 0, -0.125, 0.5, 0, -0.027, 0.36], fc);
  const dh = species === 'aesche' ? 0.15 : 0.07;
  fin([0, 0.1, -0.1, 0, 0.1 + dh, 0.0, 0, 0.1 + dh * 0.8, 0.1, 0, 0.085, 0.14], species === 'aesche' ? new THREE.Color(0x7a4a7a) : fc);
  for (const sx of [-1, 1]) fin([sx * 0.05, -0.04, -0.27, sx * 0.14, -0.07, -0.17, sx * 0.05, -0.05, -0.19], fc);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
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
  float ff=smoothstep(uFogNear,uFogFar,length(cameraPosition-vW));
  col=mix(col,uFog,ff);
  gl_FragColor=vec4(col,a);
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
  gl_FragColor=vec4(col,1.);
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
    const R = this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.mobile = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
    this.hi = true;
    R.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.mobile ? 1.75 : 2));
    R.toneMapping = THREE.ACESFilmicToneMapping; R.toneMappingExposure = 1.02;
    R.shadowMap.enabled = true; R.shadowMap.type = THREE.PCFSoftShadowMap;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(60, 1, 0.1, 1200);
    this.scene.fog = new THREE.Fog(0xcfe8f0, 25, 230);
    this.hemi = new THREE.HemisphereLight(0xdcecff, 0x55683a, 1.5);
    this.sun = new THREE.DirectionalLight(0xfff1dc, 3.0);
    this.sun.castShadow = true;
    const sh = this.sun.shadow; sh.mapSize.set(this.mobile ? 1024 : 2048, this.mobile ? 1024 : 2048);
    sh.camera.left = -26; sh.camera.right = 26; sh.camera.top = 26; sh.camera.bottom = -26; sh.camera.near = 1; sh.camera.far = 170;
    sh.bias = -0.0006; sh.normalBias = 0.05;
    this.sunDir = new THREE.Vector3(-0.3, 0.85, -0.4).normalize();
    this.scene.add(this.hemi, this.sun, this.sun.target);

    this.timeU = { value: 0 };
    this.noiseTex = makeNoiseTex();
    const TL = this.loader = new THREE.TextureLoader();
    const load = (f, srgb) => { const t = TL.load('assets/' + f); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; if (srgb) t.colorSpace = THREE.SRGBColorSpace; return t; };
    const loadA = f => { const t = TL.load('assets/' + f); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; };   // freigestellte Fotos (Poly Haven, CC0)
    this.tex = { grass: load('grass_d.jpg', 1), grassN: load('grass_n.jpg'), peb: load('peb_d.jpg', 1), pebN: load('peb_n.jpg'), cliff: load('cliff_d.jpg', 1), cliffN: load('cliff_n.jpg'),
      rock: load('rock_d.jpg', 1), rockN: load('rock_n.jpg'), bark: load('bark_d.jpg', 1), barkN: load('bark_n.jpg'), tuft: loadA('tuft.png'), branch: loadA('branch.png'), leaf: loadA('leaf.png'), fern: loadA('fern.png'), reed: loadA('reed.png') };
    this.skyTex = {};
    this.skyU = { uSky: { value: null }, uRot: { value: 0 }, uGain: { value: 1.2 }, uFogC: { value: new THREE.Color() } };
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(900, 48, 24), new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false, uniforms: this.skyU,
      vertexShader: 'varying vec3 vP; void main(){vP=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}', fragmentShader: SKY_FS,
    }));
    this.sky.renderOrder = -10; this.scene.add(this.sky);

    this.env = new THREE.Group(); this.scene.add(this.env);
    this.fishGroup = new THREE.Group(); this.scene.add(this.fishGroup);
    this.fishMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.45, metalness: 0.1, side: THREE.DoubleSide });
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
    this.buildAngler();
    this.buildRig();
    this.buildFx();
    this.ray = new THREE.Raycaster();
    this.plane = new THREE.Plane(UP, 0);
    this.camZ = 0; this.camX = LANE_X;
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  setQuality(hi) {
    this.hi = hi; this.fxWater = hi; this._slow = 0;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, hi ? (this.mobile ? 1.75 : 2) : 1.2));
    this.renderer.shadowMap.enabled = hi; this.sun.castShadow = hi;
    this.scene.traverse(o => { if (o.material) o.material.needsUpdate = true; });
    if (this.grass) this.grass.visible = hi;
    this.resize();
  }

  resize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.renderer.setSize(w, h, false);
    const asp = w / h;
    this.camera.aspect = asp;
    let vf = 50;
    if (asp < 1.25) vf = Math.min(78, 2 * Math.atan(Math.tan(30 * Math.PI / 180) / asp) * 180 / Math.PI);
    this.camera.fov = Math.max(50, vf);
    this.camera.updateProjectionMatrix();
    this.portrait = asp < 1;
    this.makeTargets();
  }

  makeTargets() {
    const sz = this.renderer.getDrawingBufferSize(new THREE.Vector2()), U = this.waterU;
    if (!U) return;
    U.uInv.value.set(1 / sz.x, 1 / sz.y);
    const ks = this.mobile ? 0.5 : 0.75, kr = this.mobile ? 0.35 : 0.5;
    const mk = (k, depth) => {
      const w = Math.max(64, Math.round(sz.x * k)), h = Math.max(64, Math.round(sz.y * k));
      const rt = new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, generateMipmaps: false });
      if (depth) { rt.depthTexture = new THREE.DepthTexture(w, h); rt.depthTexture.minFilter = rt.depthTexture.magFilter = THREE.NearestFilter; }
      return rt;
    };
    if (this.sceneRT) { this.sceneRT.dispose(); this.reflRT.dispose(); }
    this.sceneRT = mk(ks, true); this.reflRT = mk(kr, false);
    U.uScene.value = this.sceneRT.texture; U.uDepthT.value = this.sceneRT.depthTexture; U.uRefl.value = this.reflRT.texture;
  }

  buildAngler() {
    const root = new THREE.Group(), body = new THREE.Group();
    body.position.y = -0.56; root.add(body);
    const M = (c, r = 0.85, m = 0) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: m });
    const wader = M(0x6b6a55, 0.75), jacket = M(0x3e525c, 0.9), skin = M(0xc8987a, 0.65), cap = M(0x5c6140, 0.95), pack = M(0x4a4a3c, 0.9),
      wood = M(0x8a5a30, 0.55), boot = M(0x2e2a25, 0.9), dark = M(0x1c1c1c, 0.4), buff = M(0x8c4a38, 0.95), hair = M(0x3a2c20, 0.95), strap = M(0x2c2e28, 0.8);
    const add = (par, geo, mat, x, y, z, rx = 0, ry = 0, rz = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); m.castShadow = true; par.add(m); return m; };
    // Beine mit Hüft- und Kniegelenk
    this.legs = [-1, 1].map(sx => {
      const hip = new THREE.Group(); hip.position.set(sx * 0.1, 0.94, 0); body.add(hip);
      add(hip, new THREE.CapsuleGeometry(0.082, 0.32, 5, 12), wader, 0, -0.22, 0);
      const knee = new THREE.Group(); knee.position.set(0, -0.45, 0); hip.add(knee);
      add(knee, new THREE.SphereGeometry(0.072, 10, 8), wader, 0, 0, 0);
      add(knee, new THREE.CapsuleGeometry(0.063, 0.31, 5, 12), wader, 0, -0.21, 0.005);
      add(knee, new THREE.CapsuleGeometry(0.058, 0.15, 4, 10), boot, 0, -0.44, -0.055, Math.PI / 2);
      add(knee, new THREE.BoxGeometry(0.105, 0.03, 0.27), dark, 0, -0.49, -0.05);
      return { hip, knee, sx };
    });
    // Rumpf (Rotationskörper, flachgedrückt)
    const lathe = pts => new THREE.LatheGeometry(pts.map(q => new THREE.Vector2(q[0], q[1])), 22);
    this.torso = new THREE.Group(); this.torso.position.y = 0.96; body.add(this.torso);
    const T = this.torso;
    add(T, lathe([[0, -0.1], [0.13, -0.09], [0.168, -0.02], [0.176, 0.07], [0.168, 0.17], [0.184, 0.3], [0.2, 0.42], [0.185, 0.5], [0.1, 0.555], [0.055, 0.57], [0, 0.575]]), jacket, 0, 0, 0).scale.set(1.04, 1, 0.68);
    add(T, lathe([[0, -0.11], [0.14, -0.1], [0.178, -0.02], [0.186, 0.07], [0.178, 0.17], [0.192, 0.3], [0.19, 0.335]]), wader, 0, 0, 0).scale.set(1.04, 1, 0.7);   // Wathose bis zur Brust
    add(T, new THREE.CylinderGeometry(0.19, 0.188, 0.04, 20), strap, 0, 0.085, 0).scale.set(1.04, 1, 0.71);                                                       // Watgürtel
    for (const sx of [-1, 1]) {
      add(T, new THREE.BoxGeometry(0.036, 0.3, 0.02), strap, sx * 0.085, 0.44, -0.118, 0.2);
      add(T, new THREE.BoxGeometry(0.036, 0.3, 0.02), strap, sx * 0.085, 0.44, 0.122, -0.2);
      add(T, new THREE.SphereGeometry(0.08, 12, 10), jacket, sx * 0.212, 0.475, 0).scale.set(1, 0.9, 0.95);
    }
    add(T, new THREE.BoxGeometry(0.2, 0.13, 0.07), pack, 0, 0.3, -0.155);                       // Brusttasche
    add(T, new THREE.BoxGeometry(0.16, 0.012, 0.075), strap, 0, 0.34, -0.157);
    add(T, new THREE.CylinderGeometry(0.012, 0.012, 0.05, 6), M(0xb0b4b8, 0.3, 0.9), 0.075, 0.25, -0.2); // Zange / Tippetspule
    add(T, new THREE.CapsuleGeometry(0.07, 0.24, 4, 10), pack, 0.02, 0.26, 0.165, 0, 0, 0.35).scale.set(1.5, 1, 0.75); // Sling-Pack
    const hoop = add(T, new THREE.TorusGeometry(0.125, 0.011, 6, 24), wood, -0.07, 0.02, 0.2, 0.1, 0, 0.1); hoop.scale.set(0.85, 1.3, 1);
    add(T, new THREE.CylinderGeometry(0.012, 0.015, 0.22, 6), wood, -0.085, 0.29, 0.185, 0.1, 0, 0.1);
    const bag = add(T, new THREE.ConeGeometry(0.1, 0.22, 10, 2, true), new THREE.MeshBasicMaterial({ color: 0x151512, wireframe: true, transparent: true, opacity: 0.45 }), -0.07, -0.02, 0.26, -1.35); bag.castShadow = false;
    // Hals & Kopf
    add(T, new THREE.CylinderGeometry(0.05, 0.058, 0.08, 12), skin, 0, 0.6, 0);
    add(T, new THREE.CylinderGeometry(0.062, 0.07, 0.07, 12), buff, 0, 0.585, 0);
    this.head = new THREE.Group(); this.head.position.set(0, 0.7, -0.005); T.add(this.head);
    const Hd = this.head;
    add(Hd, new THREE.SphereGeometry(0.098, 20, 16), skin, 0, 0, 0).scale.set(0.9, 1.1, 1.0);
    add(Hd, new THREE.SphereGeometry(0.082, 14, 10), skin, 0, -0.05, -0.022).scale.set(0.82, 0.9, 0.95);                                   // Kiefer
    add(Hd, new THREE.SphereGeometry(0.084, 14, 10), hair, 0, -0.058, -0.03).scale.set(0.84, 0.72, 0.9);                                    // Bart
    add(Hd, new THREE.SphereGeometry(0.1, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.62), hair, 0, 0.002, 0.014).scale.set(0.92, 1.08, 1.0);    // Haare
    add(Hd, new THREE.ConeGeometry(0.018, 0.045, 6), skin, 0, -0.012, -0.102, -1.25);                                                      // Nase
    add(Hd, new THREE.BoxGeometry(0.155, 0.036, 0.022), dark, 0, 0.012, -0.088);                                                           // Polbrille
    for (const sx of [-1, 1]) { add(Hd, new THREE.BoxGeometry(0.008, 0.012, 0.1), dark, sx * 0.082, 0.014, -0.04); add(Hd, new THREE.SphereGeometry(0.022, 8, 6), skin, sx * 0.088, -0.005, 0.0).scale.set(0.5, 1, 0.8); }
    add(Hd, new THREE.SphereGeometry(0.103, 18, 10, 0, Math.PI * 2, 0, Math.PI * 0.5), cap, 0, 0.022, 0.0).scale.set(0.94, 1.02, 1.04);     // Kappe
    add(Hd, new THREE.CylinderGeometry(0.088, 0.088, 0.012, 16, 1, false, Math.PI / 2, Math.PI), cap, 0, 0.03, -0.075, 0.12).scale.set(1, 1, 1.25); // Schirm
    // Arme (IK in Weltkoordinaten)
    const unit = new THREE.CylinderGeometry(1, 0.86, 1, 10), jg = new THREE.SphereGeometry(1, 10, 8);
    this.arms = [1, -1].map(sx => {
      const a = { sx, up: new THREE.Mesh(unit, jacket), fo: new THREE.Mesh(unit, jacket), el: new THREE.Mesh(jg, jacket), hand: new THREE.Mesh(jg, skin), sh: new THREE.Vector3(), tg: new THREE.Vector3(), e: new THREE.Vector3() };
      for (const m of [a.up, a.fo, a.el, a.hand]) { m.castShadow = true; m.frustumCulled = false; this.scene.add(m); }
      a.el.scale.setScalar(0.05); a.hand.scale.set(0.043, 0.05, 0.043);
      return a;
    });
    this.angler = root; this.body = body; this.walkPh = 0; this.walkAmp = 0;
    this.scene.add(root);
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
    if (st.look) hy = clamp(Math.atan2(-(st.look.x - st.px), -(st.look.z - st.pz)) - st.face, -0.9, 0.9);
    this.head.rotation.y += (hy - this.head.rotation.y) * Math.min(1, dt * 6);
    this.head.rotation.x = -lean * 0.6 + 0.06;
    g.updateMatrixWorld(true);
    for (const a of this.arms) {
      a.sh.set(a.sx * 0.225, 0.47, 0); this.torso.localToWorld(a.sh);
      if (a.sx < 0) { a.tg.set(-0.11, st.fight ? 0.36 : 0.16, st.fight ? -0.33 : -0.25); a.tg.x += Math.sin(ph) * 0.03 * A; this.torso.localToWorld(a.tg); }
    }
  }
  _arm(a, target) {
    const S = a.sh, d = _d.subVectors(target, S), U = 0.3, F = 0.275, raw = d.length() || 1e-4, L = clamp(raw, 0.08, U + F - 0.004);
    d.multiplyScalar(1 / raw);
    const x = (U * U - F * F + L * L) / (2 * L), h = Math.sqrt(Math.max(0, U * U - x * x));
    const pole = new THREE.Vector3(a.sx * 0.5, -1, 0.35).applyQuaternion(this.angler.quaternion);
    pole.addScaledVector(d, -pole.dot(d)).normalize();
    a.e.copy(S).addScaledVector(d, x).addScaledVector(pole, h);
    const hp = new THREE.Vector3().copy(S).addScaledVector(d, L);
    placeSeg(a.up, a.e, S, 0.058); placeSeg(a.fo, hp, a.e, 0.046);
    a.el.position.copy(a.e); a.hand.position.copy(hp);
  }

  buildRig() {
    const unit = new THREE.CylinderGeometry(1, 1, 1, 6);
    this.rodSegs = [];
    const rodMat = new THREE.MeshStandardMaterial({ color: 0x23282c, roughness: 0.35, metalness: 0.3 });
    const corkMat = new THREE.MeshStandardMaterial({ color: 0xc8a06c, roughness: 0.9 });
    for (let i = 0; i < 14; i++) { const m = new THREE.Mesh(unit, i === 0 ? corkMat : rodMat); m.frustumCulled = false; m.castShadow = i < 6; this.scene.add(m); this.rodSegs.push(m); }
    this.reel = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.028, 16).rotateZ(Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x8a9096, roughness: 0.3, metalness: 0.8 }));
    this.reel.frustumCulled = false; this.scene.add(this.reel);
    this.NL = 26;
    const lg = new THREE.BufferGeometry();
    lg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(this.NL * 3), 3));
    this.line = new THREE.Line(lg, new THREE.LineBasicMaterial({ color: 0xf6f4e0, transparent: true, opacity: 0.8 }));
    this.line.frustumCulled = false; this.scene.add(this.line);
    this.sighter = [0xff2f7a, 0xf8e71c, 0xff2f7a].map(c => { const m = new THREE.Mesh(unit, new THREE.MeshBasicMaterial({ color: c })); m.frustumCulled = false; this.scene.add(m); return m; });
    const ny = new THREE.Group();
    this.beadMat = new THREE.MeshStandardMaterial({ color: 0xe0b040, roughness: 0.25, metalness: 0.9 });
    this.bodyMat = new THREE.MeshStandardMaterial({ color: 0x7a4a25, roughness: 0.8 });
    const bead = new THREE.Mesh(new THREE.SphereGeometry(0.026, 10, 8), this.beadMat);
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.02, 8, 6), this.bodyMat); body.scale.set(1, 1, 2.6); body.position.z = 0.05;
    ny.add(bead, body); this.nymph = ny; this.scene.add(ny);
    this._pts = Array.from({ length: 15 }, () => new THREE.Vector3());
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
    this.entryRing = ring(0.13, 0.19, 0x57d68d);
    // Insekten über dem Wasser
    const IN = 70, ig = new THREE.BufferGeometry(), ip = new Float32Array(IN * 3);
    this.bugSeed = Array.from({ length: IN }, () => [Math.random() * 14 - 9, 0.3 + Math.random() * 2.2, Math.random() * 22 - 16, Math.random() * 6, 0.5 + Math.random()]);
    ig.setAttribute('position', new THREE.BufferAttribute(ip, 3));
    this.bugs = new THREE.Points(ig, new THREE.PointsMaterial({ color: 0xfff6d8, size: 0.035, transparent: true, opacity: 0.8, depthWrite: false }));
    this.bugs.frustumCulled = false; this.scene.add(this.bugs);
  }

  setFlyLook(body, bead) { this.bodyMat.color.set(body); this.beadMat.color.set(bead); }

  // hand, tip, target: {x,y,z}; s = Spannung 0..1 (1 = straff); bend 0..1
  setRig(hand, tip, target, s, bend) {
    const H = _a.set(hand.x, hand.y, hand.z), T = _b.set(tip.x, tip.y, tip.z);
    const dir = new THREE.Vector3().subVectors(T, H); const len = dir.length(); dir.multiplyScalar(1 / len);
    const toT = new THREE.Vector3(target.x - tip.x, target.y - tip.y, target.z - tip.z).normalize();
    const perp = toT.addScaledVector(dir, -toT.dot(dir));
    if (perp.lengthSq() > 1e-6) perp.normalize();
    perp.multiplyScalar(bend * len * 0.45);
    const P = this._pts, NSEG = 14;
    for (let i = 0; i <= NSEG; i++) { const t = i / NSEG; P[i].copy(H).addScaledVector(dir, len * (t - 0.06) * (1 - bend * 0.1 * t)).addScaledVector(perp, t * t * t * 0.4 + t * t * 0.6); }
    for (let i = 0; i < NSEG; i++) placeSeg(this.rodSegs[i], P[i], P[i + 1], i === 0 ? 0.017 : 0.0125 - i * 0.0007);
    this.reel.position.copy(P[0]).addScaledVector(dir, 0.04); this.reel.position.y -= 0.05;
    this._arm(this.arms[0], H);
    if (this._fightGrip) this.arms[1].tg.copy(P[0]).addScaledVector(dir, 0.1).add(_d.set(0, -0.06, 0));
    this._arm(this.arms[1], this.arms[1].tg);
    // Schnur
    const tp = P[NSEG], pos = this.line.geometry.attributes.position, N = this.NL;
    const sag = Math.min(1.2, (1 - Math.min(1, s)) * 3.2);
    const at = (t, out) => out.set(tp.x + (target.x - tp.x) * t, tp.y + (target.y - tp.y) * t - sag * 2 * t * (1 - t), tp.z + (target.z - tp.z) * t);
    const v = new THREE.Vector3();
    for (let i = 0; i < N; i++) { at(i / (N - 1), v); pos.setXYZ(i, v.x, v.y, v.z); }
    pos.needsUpdate = true;
    let t0 = 0.62, t1 = 0.9;
    if (target.y < 0.05 && tp.y > 0.5) { const span = tp.y - target.y; t1 = (tp.y - 0.1) / span; t0 = Math.max(0.05, (tp.y - Math.min(tp.y - 0.1, 0.85)) / span); }
    const q0 = new THREE.Vector3(), q1 = new THREE.Vector3();
    for (let i = 0; i < 3; i++) { at(t0 + (t1 - t0) * i / 3, q0); at(t0 + (t1 - t0) * (i + 1) / 3, q1); placeSeg(this.sighter[i], q0, q1, 0.011); }
    this.nymph.position.set(target.x, target.y, target.z);
  }

  setAim(a) {
    const v = !!a; this.aimRing.visible = this.aimDot.visible = v;
    if (!v) return;
    this.aimRing.position.set(a.tx, 0.03, a.tz); this.aimDot.position.set(a.tx, 0.03, a.tz);
    const c = a.ok ? 0xffffff : 0xff5a4f; this.aimRing.material.color.setHex(c); this.aimDot.material.color.setHex(c);
    const k = 1 + Math.sin(this.timeU.value * 6) * 0.08; this.aimRing.scale.setScalar(k);
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
    this.clearFish();
    const river = makeRiver(rv);
    this.river = river;
    const rnd = mulberry32(rv.seed * 7 + 3);
    const pal = rv.pal, tint = cond.light.tint, lid = cond.light.id;
    const C = hex => { const c = new THREE.Color(hex); c.r *= tint[0]; c.g *= tint[1]; c.b *= tint[2]; return c; };
    const murk = cond.clarity / 2;
    const sunK = cond.light.sun, overcast = lid === 'bedeckt';

    // Licht & Himmel
    const sd = SUNS[lid] || SUNS.mittag, sk = SKY[lid] || SKY.mittag;
    const hl = Math.hypot(sd.dir[0], sd.dir[2]), ce = Math.cos(sk.el);
    this.sunDir.set(sd.dir[0] / hl * ce, Math.sin(sk.el), sd.dir[2] / hl * ce).normalize();
    const sunCol = new THREE.Color(1, lid === 'abend' ? 0.74 : lid === 'morgen' ? 0.84 : 0.96, lid === 'abend' ? 0.52 : lid === 'morgen' ? 0.7 : 0.88);
    this.sun.color.copy(sunCol); this.sun.intensity = overcast ? 0.8 : 3.1 * sunK;
    this.hemi.intensity = overcast ? 2.5 : 1.75 + 0.3 * sunK;
    this.hemi.color.setRGB(sk.mid[0], sk.mid[1], sk.mid[2], THREE.SRGBColorSpace).lerp(new THREE.Color(1, 1, 1), 0.45); this.hemi.groundColor.copy(C(0x5a6a3c));
    if (!this.skyTex[lid]) { const t = this.loader.load('assets/sky_' + lid + '.jpg'); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.RepeatWrapping; t.wrapT = THREE.ClampToEdgeWrapping; t.minFilter = THREE.LinearFilter; t.generateMipmaps = false; this.skyTex[lid] = t; }
    this.skyU.uSky.value = this.skyTex[lid];
    this.skyU.uRot.value = sk.u - (Math.atan2(this.sunDir.z, this.sunDir.x) / (Math.PI * 2) + 0.5);
    const fog = new THREE.Color().setRGB(sk.hor[0], sk.hor[1], sk.hor[2], THREE.SRGBColorSpace).multiplyScalar(this.skyU.uGain.value);
    this.skyU.uFogC.value.copy(fog);
    this.scene.fog.color.copy(fog);
    this.scene.fog.near = lid === 'morgen' ? 10 : 30; this.scene.fog.far = lid === 'morgen' ? 190 : 330;
    this.bugs.visible = lid === 'morgen' || lid === 'abend';

    // Gelände
    const NX = 116, NZ = 262, W = 84, Z0 = -150, Z1 = 72;
    const tg = new THREE.PlaneGeometry(1, 1, NX, NZ);
    const tp = tg.attributes.position, tuv = tg.attributes.uv;
    const cols = new Float32Array(tp.count * 3), wgt = new Float32Array(tp.count * 3);
    const cGr = new THREE.Color(pal.grass), cGr2 = new THREE.Color(pal.grass).multiplyScalar(0.7), cRock = new THREE.Color(pal.rock),
      cGrav = new THREE.Color(pal.gravel), cBed = new THREE.Color(pal.bed), tmp = new THREE.Color();
    const bedTint = new THREE.Color(clamp(cBed.r / cGrav.r, 0, 1), clamp(cBed.g / cGrav.g, 0, 1), clamp(cBed.b / cGrav.b, 0, 1)).lerp(new THREE.Color(1, 1, 1), 0.32), grassTint = new THREE.Color(0.86, 1.28, 0.74);
    for (let i = 0; i < tp.count; i++) {
      const u = tp.getX(i) * 2, vz = tp.getY(i) + 0.5;
      const x = Math.sign(u) * Math.pow(Math.abs(u), 1.8) * W / 2, z = Z0 + (1 - vz) * (Z1 - Z0);
      const h = river.heightAt(x, z);
      tp.setXYZ(i, x, h, z); tuv.setXY(i, x * 0.5, z * 0.5);
      const n = vnoise(x * 0.7, z * 0.7);
      let wG = 0, wP = 0, wR = 0;
      if (h < 0.03) { tmp.setRGB(1, 1, 1).lerp(bedTint, Math.min(1, -h / 1.3)).multiplyScalar(0.95 + n * 0.2); wP = 1; }
      else if (rv.cliff && h > 1.0) { const top = h > rv.bankMax * 0.86 ? 0.85 : 0; tmp.setRGB(1, 1, 1).multiplyScalar(0.7 + n * 0.3 + vnoise(x * 0.2, h * 0.9) * 0.3).lerp(grassTint, top); wR = 1 - top; wG = top; }
      else { const g = smooth(0.22, 0.5, h + (n - 0.5) * 0.25); tmp.setRGB(1.04, 1.02, 0.98).lerp(_c.copy(grassTint).multiplyScalar(0.8 + fbm(x * 0.12, z * 0.12) * 0.45), g); wG = g; wP = 1 - g; }
      cols[i * 3] = tmp.r * tint[0]; cols[i * 3 + 1] = tmp.g * tint[1]; cols[i * 3 + 2] = tmp.b * tint[2];
      wgt[i * 3] = wG; wgt[i * 3 + 1] = wP; wgt[i * 3 + 2] = wR;
    }
    tg.setAttribute('color', new THREE.BufferAttribute(cols, 3));
    tg.setAttribute('aW', new THREE.BufferAttribute(wgt, 3));
    tg.computeVertexNormals();
    const tm = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 0, map: this.tex.grass });
    tm.onBeforeCompile = s => {
      const T = this.tex;
      Object.assign(s.uniforms, { uPeb: { value: T.peb }, uRockT: { value: T.cliff }, uGrassN: { value: T.grassN }, uPebN: { value: T.pebN }, uRockN: { value: T.cliffN }, uNz: { value: this.noiseTex }, uTime: this.timeU, uCaust: { value: overcast ? 0.3 : 1 } });
      s.vertexShader = s.vertexShader.replace('#include <common>', '#include <common>\nattribute vec3 aW; varying vec3 vWgt; varying vec3 vTp;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvWgt=aW; vTp=position;');
      s.fragmentShader = s.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vWgt; varying vec3 vTp; uniform sampler2D uPeb,uRockT,uGrassN,uPebN,uRockN,uNz; uniform float uTime,uCaust;')
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
          else if(vTp.y<0.16) diffuseColor.rgb*=mix(0.6,1.,vTp.y/0.16);`)
        .replace('#include <normal_fragment_maps>', `
          vec3 nmT=(texture2D(uGrassN,uvG).xyz*2.-1.)*vWgt.x+(texture2D(uPebN,uvP).xyz*2.-1.)*vWgt.y*1.4+(texture2D(uRockN,uvR).xyz*2.-1.)*vWgt.z*1.6;
          normal=normalize(normal+mat3(viewMatrix)*vec3(nmT.x,0.,-nmT.y)*0.95);`);
    };
    const terrain = new THREE.Mesh(tg, tm); terrain.receiveShadow = true;
    this.env.add(terrain);

    // Hintergrund: Hügel & Berge
    const bg = new THREE.PlaneGeometry(1000, 700, 150, 105); bg.rotateX(-Math.PI / 2); bg.translate(0, 0, -260);
    const bp = bg.attributes.position, bc = new Float32Array(bp.count * 3), so = rv.seed * 3.7;
    const cFor = new THREE.Color(0x2e4a2c), cFor2 = new THREE.Color(0x466a3a), cAlp = new THREE.Color(0x6f7f52), cSt = new THREE.Color(0x74777c), cSn = new THREE.Color(0xf4f7fb);
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
      tmp.lerp(cSn, smooth(104, 128, rel + n * 34));
      bc[i * 3] = tmp.r * tint[0]; bc[i * 3 + 1] = tmp.g * tint[1]; bc[i * 3 + 2] = tmp.b * tint[2];
    }
    bg.setAttribute('color', new THREE.BufferAttribute(bc, 3)); bg.computeVertexNormals();
    this.env.add(new THREE.Mesh(bg, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 })));

    // Wasser
    const WX = 64, WZ = 500;
    const wg = new THREE.PlaneGeometry(rv.width + 0.4, Z1 - Z0, WX, WZ);
    wg.rotateX(-Math.PI / 2); wg.translate(0, 0, (Z0 + Z1) / 2);
    const wp = wg.attributes.position;
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
      aB[i] = smooth(river.halfW * 0.35, river.halfW, Math.abs(x)) * clamp(rv.trees + (rv.cliff ? 0.6 : 0), 0.3, 1);
    }
    wg.setAttribute('aDepth', new THREE.BufferAttribute(aD, 1)); wg.setAttribute('aSpeed', new THREE.BufferAttribute(aS, 1));
    wg.setAttribute('aFoam', new THREE.BufferAttribute(aF, 1)); wg.setAttribute('aBank', new THREE.BufferAttribute(aB, 1));
    const U = this.waterU;
    U.uShallow.value.copy(C(pal.shallow)); U.uDeep.value.copy(C(pal.deep)); U.uSkyBot.value.copy(C(pal.skyBot)); U.uFog.value.copy(fog);
    U.uFogNear.value = this.scene.fog.near; U.uFogFar.value = this.scene.fog.far; U.uMurk.value = murk; U.uSun.value = overcast ? 0.12 : sunK; U.uSunCol.value.copy(sunCol);
    U.uBankCol.value.copy(C(rv.cliff ? pal.rock : pal.grass)).multiplyScalar(0.32);
    const water = new THREE.Mesh(wg, new THREE.ShaderMaterial({ uniforms: U, vertexShader: WATER_VS, fragmentShader: WATER_FS, transparent: true, depthWrite: false }));
    water.renderOrder = 2; this.env.add(water); this.water = water; this._needLayers = true;

    // Felsen
    const rockMat = new THREE.MeshStandardMaterial({ color: C(pal.rock).lerp(new THREE.Color(1, 1, 1), 0.55).multiplyScalar(1.5), roughness: 0.95, vertexColors: true, map: this.tex.rock, normalMap: this.tex.rockN, normalScale: new THREE.Vector2(1.3, 1.3) });
    const wetG = [0, 1, 2].map(k => rockGeo(k, true)), dryG = [3, 4, 5].map(k => rockGeo(k, false));
    for (const g of [...wetG, ...dryG]) { const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 2, uv.getY(i) * 1.2); }
    const addRock = (geos, x, y, z, r, flat = 1) => {
      const m = new THREE.Mesh(geos[(rnd() * geos.length) | 0], rockMat);
      m.position.set(x, y, z); m.scale.set(r * (1 + rnd() * 0.25), r * (0.85 + rnd() * 0.35) * flat, r * (1 + rnd() * 0.25)); m.rotation.y = rnd() * 6.3;
      m.castShadow = m.receiveShadow = true; this.env.add(m);
    };
    for (const k of river.rocks) addRock(wetG, k.x, -0.12, k.z, k.r);
    for (let i = 0; i < 110; i++) {
      const side = rnd() < 0.5 ? -1 : 1, x = side * (river.halfW - 0.9 + Math.pow(rnd(), 1.6) * 7), z = Z0 + 40 + rnd() * (Z1 - Z0 - 44);
      const h = river.heightAt(x, z);
      addRock(h < 0.05 ? wetG : dryG, x, h - 0.04, z, 0.12 + Math.pow(rnd(), 2) * 0.7, 0.8);
    }
    // Treibholz
    const logMat = new THREE.MeshStandardMaterial({ color: C(0xd8cdbc), roughness: 1, map: this.tex.bark, normalMap: this.tex.barkN });
    for (let i = 0; i < 7; i++) {
      const side = rnd() < 0.5 ? -1 : 1, x = side * (river.halfW + 0.3 + rnd() * 1.6), z = -70 + rnd() * 80, len = 1.5 + rnd() * 3;
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
        if (o.color) { lc.copy(q.c); lc.r *= tint[0]; lc.g *= tint[1]; lc.b *= tint[2]; im.setColorAt(k, lc); }
      });
      im.count = list.length; im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true;
      im.castShadow = o.shadow !== false; if (o.depth) im.customDepthMaterial = o.depth;
      this.env.add(im); return im;
    };
    const spots = (n, place) => { const l = []; for (let i = 0; i < n * 4 && l.length < n; i++) { const q = place(); if (q) { q.ry = rnd() * 6.3; l.push(q); } } return l; };
    const bankSpot = (minO, maxO, pw, zMin = Z0 + 4) => {
      const side = rnd() < 0.5 ? -1 : 1, x = side * (river.halfW + minO + Math.pow(rnd(), pw) * (maxO - minO)), z = zMin + rnd() * (Z1 - zMin - 3);
      const h = river.heightAt(x, z);
      if (rv.cliff && h > 1.3 && h < rv.bankMax * 0.84) return null;
      return { x, z, y: h, side };
    };
    const shade = () => { const b = 0.78 + rnd() * 0.4; return new THREE.Color(b * (0.88 + rnd() * 0.2), b, b * (0.8 + rnd() * 0.25)); };
    const barkMat = new THREE.MeshStandardMaterial({ map: this.tex.bark, normalMap: this.tex.barkN, roughness: 1, color: C(0xddd2c4) });
    const cardMat = tex => new THREE.MeshLambertMaterial({ map: tex, alphaTest: 0.5, side: THREE.DoubleSide, vertexColors: true });
    const cardDepth = tex => new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: tex, alphaTest: 0.5, side: THREE.DoubleSide });
    const needleMat = cardMat(this.tex.branch), needleDepth = cardDepth(this.tex.branch), leafMat = cardMat(this.tex.leaf), leafDepth = cardDepth(this.tex.leaf);
    const leafShare = rv.cliff ? 0.08 : rv.id === 'wiese' || rv.id === 'aeschenzug' ? 0.5 : 0.25;
    const nT = Math.floor(300 * rv.trees * vk), nL = Math.floor(nT * leafShare), nC = nT - nL;
    for (let v = 0; v < 2; v++) {
      const list = spots(Math.ceil(nC / 2), () => { const q = bankSpot(3.2, 40, 1.3); if (!q) return null; q.y -= 0.2; q.s = 1.0 + rnd() * 1.15; q.sy = 0.9 + rnd() * 0.4; q.c = shade(); return q; });
      inst(spruceTrunk(), barkMat, list); inst(spruceGeo(rnd), needleMat, list, { color: true, depth: needleDepth });
    }
    if (nL) for (let v = 0; v < 2; v++) {
      const list = spots(Math.ceil(nL / 2), () => { const q = bankSpot(3.4, 32, 1.5); if (!q) return null; q.y -= 0.15; q.s = 1.0 + rnd() * 0.9; q.sy = 0.9 + rnd() * 0.3; q.c = shade(); return q; });
      inst(leafTrunk(rnd), barkMat, list); inst(crownGeo(rnd, 2.2, 4.7, 90, 1.5), leafMat, list, { color: true, depth: leafDepth });
    }
    inst(crownGeo(rnd, 0.72, 0.5, 18, 0.9), leafMat, spots(Math.floor(190 * clamp(rv.trees + 0.3, 0.4, 1.2) * vk), () => {
      const q = bankSpot(0.9, 17, 1.7); if (!q || q.y < 0.3) return null;
      q.y -= 0.05; q.s = 0.7 + rnd() * 1.1; q.sy = 0.8 + rnd() * 0.4; q.c = shade(); return q;
    }), { color: true, depth: leafDepth });
    // Bodenbewuchs: Grasbueschel, Farne unter den Baeumen, hohes Gras an der Wasserkante
    const sway = (tex, amp) => {
      const m = new THREE.MeshLambertMaterial({ map: tex, alphaTest: 0.42, side: THREE.DoubleSide });
      m.onBeforeCompile = sh => {
        sh.uniforms.uTime = this.timeU;
        sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float uTime;')
          .replace('#include <begin_vertex>', '#include <begin_vertex>\n#ifdef USE_INSTANCING\ntransformed.x+=sin(uTime*1.8+instanceMatrix[3].x*0.9+instanceMatrix[3].z*0.6)*' + amp.toFixed(3) + '*uv.y*uv.y;\n#endif');
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
        const bb = 0.8 + rnd() * 0.45; lc.setRGB(bb * col[0] * tint[0] * (0.95 + rnd() * 0.15), bb * col[1] * tint[1], bb * col[2] * tint[2] * (0.9 + rnd() * 0.2)); im.setColorAt(k, lc); k++;
      }
      im.count = k; im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true;
      im.receiveShadow = true; veg.add(im); return im;
    };
    const mob = this.mobile ? 0.55 : 1;
    scatter(tuftGeo(), sway(this.tex.tuft, 0.07), Math.round(4800 * mob), () => { const q = bankSpot(-0.4, 15, 1.9, -78); return !q || q.y < 0.28 || (rv.cliff && q.y > 1.2) ? null : q; },
      () => { const z = 0.7 + rnd() * 1.1; return [z, z * (0.7 + rnd() * 0.8)]; }, [1.3, 1.36, 1.0]);
    scatter(fernGeo(rnd), sway(this.tex.fern, 0.03), Math.round(520 * clamp(rv.trees + 0.3, 0.4, 1.2) * mob), () => { const q = bankSpot(0.7, 11, 1.5, -78); return !q || q.y < 0.3 || (rv.cliff && q.y > 1.6) ? null : q; },
      () => { const z = 0.8 + rnd() * 0.9; return [z, z * (0.8 + rnd() * 0.5)]; }, [1.2, 1.3, 0.98]);
    let rc = null;
    scatter(tuftGeo(0.5, 0.92), sway(this.tex.reed, 0.09), rv.cliff ? 0 : Math.round(420 * mob), () => {   // in Horsten an ruhigen Uferstellen
      if (!rc || rnd() < 0.12) { rc = bankSpot(-0.9, 0.5, 1, -78); if (rc && river.speedAt(rc.x - rc.side * 0.8, rc.z) > rv.speed * 0.55) rc = null; }
      if (!rc) return null;
      const x = rc.x + (rnd() - 0.5) * 1.6, z = rc.z + (rnd() - 0.5) * 3.2, h = river.heightAt(x, z);
      return h < -0.1 || h > 0.22 ? null : { x, z, y: h };
    }, () => { const z = 0.75 + rnd() * 0.6; return [z, z * (0.7 + rnd() * 0.5)]; }, [1.45, 1.5, 1.12]);
    veg.visible = this.hi; this.grass = veg; this.env.add(veg);
    return river;
  }

  setClearView(on) { this.waterU.uNoRefl.value = on ? 1 : 0; }   // Spiegelung ausblenden (Sichthilfe)
  setPolar(on) { this.waterU.uClear.value = on ? 1 : 0; }

  makeFish(len, species) {
    const base = this.fishGeos[species] || (this.fishGeos[species] = fishGeo(species));
    const g = base.clone();
    const m = new THREE.Mesh(g, this.fishMat);
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
    this.timeU.value = t;
    const kk = Math.min(1, dt * 3);
    this.camZ += (pz - this.camZ) * kk; this.camX += (px - this.camX) * kk;
    const cz = this.camZ, cxp = this.camX, por = this.portrait;
    // Umschauen: yaw dreht Kamera und Blickpunkt um den Angler, pitch hebt/senkt den Blick
    const yaw = this.yaw || 0, pit = this.pitch || 0, yc = Math.cos(yaw), ys = Math.sin(yaw), fw = Math.max(0, yc);
    const ox = clamp(cxp * (por ? 0.13 : 0.42), -1.6, 1.6) * fw, cy = (por ? 2.75 : 2.25) - pit * 1.3, back = por ? 3.7 : 3.9;
    const camX = cxp + ox * yc + back * ys, camZ = cz - ox * ys + back * yc;
    const gh = this.river ? Math.max(0, this.river.heightAt(camX, camZ)) : 0;
    this.camera.position.set(camX + Math.sin(t * 0.4) * 0.025, Math.max(cy, gh + 0.7) + Math.sin(t * 0.7) * 0.018, camZ);
    this._look = this._look || new THREE.Vector3(px - 2, 0.3, -4);
    const lo = (-clamp(cxp * (por ? 0.42 : 0.68), -2.4, 2.4) + (focus ? (focus.x - cxp) * 0.12 : 0)) * fw;
    const turned = yaw !== this._yawPrev || pit !== this._pitPrev; this._yawPrev = yaw; this._pitPrev = pit;
    this._look.lerp(_d.set(cxp + lo * yc - 4.6 * ys, 0.45 + pit * 7, cz - lo * ys - 4.6 * yc), turned ? Math.min(1, dt * 14) : kk);
    this.camera.lookAt(this._look);
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
    const R = this.renderer, U = this.waterU, cam = this.camera;
    if (this._needLayers) {   // alles, was unter Wasser sichtbar sein kann, zusaetzlich auf Ebene 1
      this._needLayers = false;
      this.env.traverse(o => { if (o.isMesh && !o.isInstancedMesh && o !== this.water) o.layers.enable(1); });
      for (const o of this.scene.children) if (o !== this.env && o !== this.sky) o.traverse(c => c.layers.enable(1));   // Angler, Rute, Schnur, Fische, Licht
    }
    // Bugwelle: Position des Anglers, ob er im Wasser steht, wie schnell er watet
    const wet = this.river && Math.abs(px) < this.river.halfW && this.river.depthAt(px, pz) > 0.06 ? 1 : 0;
    U.uWader.value.set(px, pz, wet, this.walkAmp || 0);
    // Ruckelt es dauerhaft, die teuren Wasser-Durchgaenge abschalten
    if (this.fxWater) { this._slow = dt > 0.042 ? this._slow + dt : Math.max(0, this._slow - dt * 2); if (this._slow > 4) this.fxWater = false; }
    const fx = this.fxWater && this.water && this.sceneRT;
    U.uFx.value = fx ? 1 : 0;
    if (fx) {
      U.uNear.value = cam.near; U.uFar.value = cam.far;
      // 1) Szene unter Wasser: nur Ebene 1 (Grund, Steine, Fische, Angler) - Baeume und Gras braucht es dafuer nicht
      this.water.visible = false; R.shadowMap.autoUpdate = false;
      cam.layers.set(1); R.setRenderTarget(this.sceneRT); R.render(this.scene, cam); cam.layers.set(0);
      // 2) Bild auf den Schirm (Schatten werden hier aktualisiert; Spiegelbild stammt vom vorigen Durchgang)
      this.water.visible = true; R.shadowMap.autoUpdate = true;
      R.setRenderTarget(null); R.render(this.scene, cam);
      // 3) Spiegelbild fuer die naechsten Bilder: nur jedes zweite Bild, ohne Gras, nur ueber der Wasserlinie
      if (((this._frame = (this._frame || 0) + 1) & 1) && U.uNoRefl.value < 0.5) {
        const gv = this.grass ? this.grass.visible : false;
        this.water.visible = false; R.shadowMap.autoUpdate = false;
        if (this.grass) this.grass.visible = false;
        const m = this.mirror; m.fov = cam.fov; m.aspect = cam.aspect; m.near = cam.near; m.far = cam.far; m.updateProjectionMatrix();
        m.position.set(cam.position.x, -cam.position.y, cam.position.z); m.lookAt(this._look.x, -this._look.y, this._look.z);
        R.clippingPlanes = this.clipUp;
        R.setRenderTarget(this.reflRT); R.render(this.scene, m);
        R.clippingPlanes = this.noClip; R.setRenderTarget(null);
        if (this.grass) this.grass.visible = gv;
        this.water.visible = true; R.shadowMap.autoUpdate = true;
      }
    } else R.render(this.scene, cam);
  }
}
const _c = new THREE.Color();
