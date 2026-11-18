// Tiere am Fluss: Voegel in der Luft, Eichhoernchen am Ufer.
//
// Was ein Tier lebendig macht, ist nicht seine Form, sondern seine Bewegung - aus zehn
// Metern sieht man von einem Vogel ohnehin nur die Silhouette. Darum steckt hier wenig
// Geometrie und viel Verhalten:
//
//   Kleinvoegel fliegen in Wellen. Sie schlagen nur, solange sie steigen, und legen die
//   Fluegel beim Sinken an - daher der Auf-und-ab-Flug jedes Spatzen. Ein Vogel, der
//   gleichmaessig durch die Luft schlaegt, sieht aus wie ein Spielzeug.
//
//   Der Greifvogel schlaegt fast nie. Er kreist auf dem Aufwind ueber dem Tal, legt sich
//   in die Kurve und schlaegt nur alle paar Sekunden ein paar Mal nach.
//
//   Eichhoernchen gehen nicht, sie springen: beide Hinterbeine zugleich, der Ruecken
//   macht dabei einen Buckel. Dazwischen sitzen sie aufrecht, zucken mit dem Schwanz und
//   drehen den Kopf ruckartig. Das Sitzen ist die halbe Zeit - ein durchgehend laufendes
//   Eichhoernchen wirkt falsch, auch wenn niemand sagen kann, warum.
import * as THREE from './three.module.min.js';

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const TAU = Math.PI * 2;
const _v = new THREE.Vector3();

// ---------- Geometrie ----------

// Mehrere Teile zu einer Geometrie zusammenlegen. Schnabel, Nase und Ohren bewegen sich
// nie fuer sich - als eigene Meshes kosteten sie nur Zeichenaufrufe, einen je Tier und Teil.
function merge(geos) {
  const pos = [], nor = [];
  for (const g of geos) {
    const q = g.index ? g.toNonIndexed() : g;
    pos.push(...q.attributes.position.array);
    nor.push(...q.attributes.normal.array);
    if (q !== g) q.dispose();
    g.dispose();
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  return out;
}

// Ein Fluegel aus zwei Dreiecken: vorn fast gerade, hinten zurueckgeschwungen, zur Spitze
// hin schmal. Mehr Punkte brauchte es nur fuer eine Nahaufnahme, die es hier nie gibt.
// Die Spannweite darf negativ sein - das ergibt den anderen Fluegel.
function wingGeo(span, chord) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute([
    0, 0, chord * 0.5,
    0, 0, -chord * 0.5,
    span, 0, -chord * 0.34,
    span, 0, chord * 0.06,
  ], 3));
  g.setIndex(span > 0 ? [0, 1, 2, 0, 2, 3] : [0, 2, 1, 0, 3, 2]);
  g.computeVertexNormals();
  return g;
}

// Vogel: Rumpf, Kopf, Schnabel, Schwanz und zwei Fluegel an eigenen Drehpunkten.
// Vorn ist +z, oben +y, rechts +x.
function birdMesh(span, bodyL, mat) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.SphereGeometry(1, 8, 6), mat);
  body.scale.set(bodyL * 0.34, bodyL * 0.3, bodyL * 0.5);
  g.add(body);
  const head = new THREE.Mesh(merge([
    new THREE.SphereGeometry(bodyL * 0.21, 7, 5),
    new THREE.ConeGeometry(bodyL * 0.055, bodyL * 0.17, 5).rotateX(Math.PI / 2).translate(0, -bodyL * 0.03, bodyL * 0.18),
  ]), mat);
  head.position.set(0, bodyL * 0.16, bodyL * 0.42);
  g.add(head);
  // Der Schwanz traegt die Silhouette im Gleitflug mehr als der Rumpf
  const tail = new THREE.Mesh(wingGeo(bodyL * 0.52, bodyL * 0.34), mat);
  tail.rotation.z = Math.PI / 2;                 // aus der Fluegelform wird ein Schwanzfaecher
  tail.position.set(0, 0, -bodyL * 0.42);
  g.add(tail);
  const chord = span * 0.3;
  const wR = new THREE.Mesh(wingGeo(span * 0.5, chord), mat);
  const wL = new THREE.Mesh(wingGeo(-span * 0.5, chord), mat);
  for (const w of [wR, wL]) { w.position.set(0, bodyL * 0.08, bodyL * 0.05); g.add(w); }
  for (const m of [body, head, tail, wR, wL]) m.frustumCulled = false;
  return { g, wR, wL, tail, head };
}

// Eichhoernchen: Der Schwanz ist das Erkennungszeichen, nicht der Koerper. Er ist deshalb
// so lang wie das Tier und steht in einem Bogen ueber dem Ruecken.
function squirrelMesh(mat, bellyMat, tailMat) {
  const g = new THREE.Group();
  const L = 0.22;                                 // Kopf-Rumpf-Laenge in Metern
  // Alles, was sich beim Aufrichten mitbewegt, haengt an der Hufte. Ein Eichhoernchen
  // richtet sich um die Hinterbeine auf - Ruecken, Bauch, Kopf und Schwanz gehen dabei
  // gemeinsam hoch. Dreht man nur den Rumpf, bleibt der Bauch stehen und das Tier faellt
  // sichtbar auseinander.
  const hip = new THREE.Group();
  hip.position.set(0, L * 0.17, -L * 0.2);
  g.add(hip);
  const body = new THREE.Mesh(new THREE.SphereGeometry(1, 9, 7), mat);
  body.scale.set(L * 0.22, L * 0.24, L * 0.42);
  body.position.set(0, L * 0.13, L * 0.22);
  hip.add(body);
  const belly = new THREE.Mesh(new THREE.SphereGeometry(1, 8, 6), bellyMat);
  belly.scale.set(L * 0.16, L * 0.17, L * 0.3);
  belly.position.set(0, L * 0.06, L * 0.25);
  hip.add(belly);
  // Die Ohren sind nach dem Schwanz das zweite Erkennungszeichen - ohne sie koennte es
  // auch eine Ratte sein. Sie bewegen sich nie fuer sich, also gehoeren sie in den Schaedel.
  const ear = r => new THREE.ConeGeometry(L * 0.045, L * 0.16, 5)
    .rotateX(-0.15).rotateZ(r * 0.28).translate(r * L * 0.085, L * 0.17, -L * 0.03);
  const head = new THREE.Mesh(merge([
    new THREE.SphereGeometry(L * 0.16, 8, 6).scale(1, 1, 1.3),
    new THREE.ConeGeometry(L * 0.055, L * 0.1, 5).rotateX(Math.PI / 2).translate(0, -L * 0.03, L * 0.2),
    ear(1), ear(-1),
  ]), mat);
  head.position.set(0, L * 0.28, L * 0.44);
  hip.add(head);
  // Der Schwanz als Rohr entlang einer Kurve: an der Hufte los, dann hoch und in einem
  // Bogen ueber den Ruecken nach vorn. Flachgedrueckt, weil ein Eichhoernchenschwanz
  // keine Wurst ist, sondern eine Fahne.
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, L * 0.3, -L * 0.26),
    new THREE.Vector3(0, L * 0.66, -L * 0.26),
    new THREE.Vector3(0, L * 0.84, -L * 0.04),
    new THREE.Vector3(0, L * 0.78, L * 0.14),
  ]);
  const tail = new THREE.Group();
  const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 12, L * 0.12, 6, false), tailMat);
  tube.scale.x = 0.5;
  tail.add(tube);
  tail.position.set(0, 0, -L * 0.06);
  hip.add(tail);
  const legs = [];
  for (let i = 0; i < 4; i++) {
    const hind = i < 2, r = i % 2 ? 1 : -1;
    const leg = new THREE.Mesh(new THREE.CapsuleGeometry(L * 0.033, L * (hind ? 0.13 : 0.1), 2, 5), mat);
    leg.userData.hind = hind;
    if (hind) { leg.position.set(r * L * 0.12, L * 0.09, -L * 0.14); g.add(leg); }   // Hinterbeine bleiben am Boden
    else { leg.position.set(r * L * 0.1, L * 0.02, L * 0.4); hip.add(leg); }         // Vorderbeine gehen mit hoch
    legs.push(leg);
  }
  for (const m of [body, belly, head, tube]) m.castShadow = true;
  return { g, hip, head, tail, legs };
}


// Katze: laenger und flacher als alles andere hier, und das ist genau das Erkennungszeichen.
// Ein Hund steht hoch auf den Beinen, eine Katze haelt den Ruecken waagrecht und den Kopf
// ruhig - selbst im Gehen wackelt bei ihr fast nichts.
function catMesh(mat, bellyMat) {
  const g = new THREE.Group();
  const L = 0.46;                                 // Kopf-Rumpf-Laenge in Metern
  const H = 0.27;                                 // Schulterhoehe
  const rumpf = new THREE.Group();
  rumpf.position.y = H * 0.86;
  g.add(rumpf);
  const body = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 7), mat);
  body.scale.set(L * 0.115, L * 0.145, L * 0.46);   // lang und schmal - rund waere ein Seehund
  rumpf.add(body);
  const belly = new THREE.Mesh(new THREE.SphereGeometry(1, 8, 6), bellyMat);
  belly.scale.set(L * 0.095, L * 0.1, L * 0.34);
  belly.position.y = -L * 0.08;
  rumpf.add(belly);
  // Schultern etwas hoeher als die Hufte - eine Katze haengt vorn nicht durch
  const brust = new THREE.Mesh(new THREE.SphereGeometry(1, 8, 6), mat);
  brust.scale.set(L * 0.115, L * 0.135, L * 0.15);
  brust.position.set(0, L * 0.02, L * 0.3);
  rumpf.add(brust);
  const hals = new THREE.Group();
  hals.position.set(0, L * 0.07, L * 0.4);
  rumpf.add(hals);
  const ohr = r => new THREE.ConeGeometry(L * 0.05, L * 0.17, 4)
    .rotateZ(r * 0.22).translate(r * L * 0.065, L * 0.15, -L * 0.015);
  const head = new THREE.Mesh(merge([
    new THREE.SphereGeometry(L * 0.125, 8, 6).scale(0.92, 0.95, 1.0),
    new THREE.SphereGeometry(L * 0.065, 7, 5).scale(0.9, 0.75, 1).translate(0, -L * 0.045, L * 0.105),   // Schnauze
    ohr(1), ohr(-1),
  ]), mat);
  // Der Kopf sitzt vor dem Halsgelenk - sonst dreht sich der Hals, und der Kopf bleibt
  // auf derselben Hoehe stehen. Genau daran scheiterte das Trinken in der ersten Fassung.
  head.position.set(0, 0, L * 0.19);
  hals.add(head);
  // Der Schwanz ist fast so lang wie der Rumpf und haengt im Gehen leicht nach unten,
  // mit einem Bogen nach oben an der Spitze.
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, -L * 0.03, -L * 0.18),
    new THREE.Vector3(0, -L * 0.04, -L * 0.36),
    new THREE.Vector3(0, L * 0.02, -L * 0.5),
    new THREE.Vector3(0, L * 0.12, -L * 0.56),
  ]);
  const tail = new THREE.Group();
  const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 12, L * 0.026, 6, false), mat);
  tail.add(tube);
  tail.position.set(0, L * 0.03, -L * 0.42);
  rumpf.add(tail);
  // Beine: Reihenfolge VL, VR, HL, HR - die Diagonalen schwingen gemeinsam
  const legs = [];
  for (let i = 0; i < 4; i++) {
    const vorn = i < 2, r = i % 2 ? 1 : -1;
    const leg = new THREE.Group();
    const o = new THREE.Mesh(new THREE.CapsuleGeometry(L * 0.028, H * 0.42, 2, 6), mat);
    o.position.y = -H * 0.3;
    leg.add(o);
    const u = new THREE.Mesh(new THREE.CapsuleGeometry(L * 0.022, H * 0.34, 2, 6), mat);
    u.position.y = -H * 0.72;
    leg.add(u);
    leg.position.set(r * L * 0.1, H * 0.86, vorn ? L * 0.26 : -L * 0.26);
    leg.userData.vorn = vorn;
    g.add(leg);
    legs.push(leg);
    o.castShadow = u.castShadow = true;
  }
  for (const m of [body, brust, head, tube]) m.castShadow = true;
  return { g, rumpf, hals, head, tail, legs, L, H };
}

// ---------- Verhalten ----------

export class Fauna {
  // parent: Gruppe des Reviers (wird beim Revierwechsel samt Inhalt geraeumt)
  // o: { rnd, river, trees, C, win, mobile }
  constructor(parent, o) {
    this.o = o;
    const rnd = this.rnd = o.rnd, C = o.C;
    this.group = new THREE.Group();
    this.group.frustumCulled = false;
    parent.add(this.group);
    this.trees = o.trees || [];

    const M = (hex, rough = 0.9) => new THREE.MeshStandardMaterial({ color: C(hex), roughness: rough });
    const darkM = M(0x3a3732), lightM = M(0x6f6a5f);
    const sqM = M(o.win ? 0x7a5540 : 0x8d4f28), sqBelly = M(0xd2c6b2), sqTail = M(o.win ? 0x8a6750 : 0x9e5c33, 1);

    // Im Winter ist weniger unterwegs, aber nicht nichts: Kraehen fliegen, Eichhoernchen
    // graben ihre Verstecke aus. Nur die Schwaerme sind kleiner.
    const k = (o.mobile ? 0.55 : 1) * (o.win ? 0.55 : 1);
    const nSmall = Math.max(3, Math.round(9 * k)), nBig = o.win ? 1 : Math.max(1, Math.round(2 * k)), nSq = Math.max(1, Math.round(3 * k));

    // Kleinvoegel: Schwarm, der zwischen den Baeumen wechselt
    this.small = [];
    for (let i = 0; i < nSmall; i++) {
      const m = birdMesh(0.26 + rnd() * 0.06, 0.15 + rnd() * 0.03, rnd() < 0.5 ? darkM : lightM);
      m.g.rotation.order = 'YXZ';
      this.group.add(m.g);
      this.small.push({
        m, pos: new THREE.Vector3(), vel: new THREE.Vector3(), st: 'sitzen',
        t: rnd() * 4, ud: rnd() * TAU, ph: rnd() * TAU, hp: rnd() * TAU, yaw: rnd() * TAU, roll: 0,
        perch: null, sp: 6.5 + rnd() * 2.5,
      });
    }

    // Greifvoegel: kreisen hoch oben auf dem Aufwind
    this.big = [];
    for (let i = 0; i < nBig; i++) {
      const m = birdMesh(1.15 + rnd() * 0.25, 0.42 + rnd() * 0.06, darkM);
      m.g.rotation.order = 'YXZ';
      this.group.add(m.g);
      this.big.push({
        m, a: rnd() * TAU, r: 13 + rnd() * 10, cx: 0, cz: 0, y: 24 + rnd() * 16, set: false,
        w: (0.055 + rnd() * 0.04) * (rnd() < 0.5 ? -1 : 1), ph: rnd() * TAU, burst: 3 + rnd() * 14,
      });
    }

    // Eichhoernchen am Ufer
    this.sq = [];
    for (let i = 0; i < nSq; i++) {
      const m = squirrelMesh(sqM, sqBelly, sqTail);
      m.g.rotation.order = 'YXZ';
      this.group.add(m.g);
      this.sq.push({
        m, pos: new THREE.Vector3(), st: 'sitzen', t: rnd() * 2, yaw: rnd() * TAU, hp: 0,
        hop: 0, hops: 0, from: new THREE.Vector3(), to: new THREE.Vector3(),
        tree: null, heim: null, climb: 0, up: true, placed: false,
      });
    }

    // Eine Katze kommt ans Wasser, trinkt und geht wieder. Sie ist nicht immer da - ein
    // Tier, das dauernd herumsteht, ist Kulisse; eines, das man manchmal erwischt, ist
    // ein Ereignis.
    const cm = catMesh(M(o.win ? 0x6e675c : 0x6b6257), M(0xbdb3a4));
    cm.g.rotation.order = 'YXZ';
    cm.g.visible = false;
    this.group.add(cm.g);
    this.cat = {
      m: cm, st: 'weg', t: 8 + rnd() * 25, pos: new THREE.Vector3(), yaw: 0,
      ziel: new THREE.Vector3(), heim: new THREE.Vector3(), gang: 0, lap: 0, blick: 0,
    };
  }

  // Ein Eichhoernchen wohnt im Baum, nicht auf der Wiese. Es setzt sich deshalb an den
  // Fuss eines Baumes in Sichtweite - und bleibt in dessen Naehe. Das ist nicht nur
  // richtiger, es ist auch das Einzige, was man sieht: Im Ufergras von einem Meter Hoehe
  // verschwindet ein 22 cm langes Tier vollstaendig.
  _home(px, pz) {
    const rnd = this.rnd, river = this.o.river, t = this.trees;
    for (let i = 0; i < 30 && t.length; i++) {
      const q = t[(rnd() * t.length) | 0];
      const d = Math.hypot(q.x - px, q.z - pz);
      if (d < 5 || d > 26) continue;
      const a = rnd() * TAU, rr = 0.6 + rnd() * 1.4;
      const x = q.x + Math.cos(a) * rr, z = q.z + Math.sin(a) * rr;
      const y = river.heightAt(x, z);
      if (y < 0.25 || y > 2.8) continue;
      if (Math.abs(river.off(x, z)) < river.halfW + 0.8) continue;
      return { p: new THREE.Vector3(x, y, z), tree: q };
    }
    return null;
  }

  // Ein Ast in der Naehe: Kleinvoegel sitzen im unteren Kronenbereich
  _perch(px, pz) {
    const t = this.trees, rnd = this.rnd;
    if (!t.length) return null;
    for (let i = 0; i < 18; i++) {
      const q = t[(rnd() * t.length) | 0];
      if (Math.abs(q.z - pz) > 34 || Math.abs(q.x - px) > 34) continue;
      const h = q.y + (q.leaf ? 3.6 : 2.9) * q.s * (0.8 + rnd() * 0.35);
      const a = rnd() * TAU, rr = (q.leaf ? 1.1 : 0.9) * q.s * rnd();
      return new THREE.Vector3(q.x + Math.cos(a) * rr, h, q.z + Math.sin(a) * rr);
    }
    return null;
  }

  _nearTree(p) {
    let best = null, bd = 49;
    for (const q of this.trees) {
      const d = (q.x - p.x) ** 2 + (q.z - p.z) ** 2;
      if (d < bd) { bd = d; best = q; }
    }
    return best;
  }

  update(dt, t, px, pz) {
    dt = Math.min(dt, 0.05);
    this._small(dt, px, pz);
    this._big(dt, px, pz);
    this._squirrel(dt, px, pz);
    this._cat(dt, px, pz);
  }

  // ---------- Kleinvoegel ----------
  _small(dt, px, pz) {
    const rnd = this.rnd;
    for (const b of this.small) {
      const g = b.m.g;
      if (!b.perch) {                                   // noch kein Platz: einen suchen
        b.perch = this._perch(px, pz);
        if (!b.perch) { g.visible = false; continue; }
        b.pos.copy(b.perch); b.st = 'sitzen'; b.t = rnd() * 6;
      }
      g.visible = true;
      b.t -= dt; b.hp += dt;

      if (b.st === 'sitzen') {
        // Sitzen heisst nicht stillstehen: der Kopf dreht sich, der Schwanz wippt
        b.m.wR.rotation.set(0, 0.95, -0.28); b.m.wL.rotation.set(0, -0.95, 0.28);
        b.m.head.rotation.y = Math.sin(b.hp * 2.6) * 0.7;
        b.m.tail.rotation.x = Math.sin(b.hp * 3.1) * 0.12;
        g.position.copy(b.pos);
        g.rotation.set(0.1, b.yaw, 0);
        if (b.t <= 0) {                                 // auffliegen
          const next = this._perch(px, pz);
          if (!next) { b.t = 2; continue; }
          b.perch = next; b.st = 'fliegen';
          b.vel.set(Math.sin(b.yaw), 1.6, Math.cos(b.yaw)).multiplyScalar(2);
          b.t = 14;                                     // Notbremse, falls der Platz unerreichbar ist
        }
        continue;
      }

      // Fliegen: auf den Platz zuhalten, dabei in Wellen
      _v.copy(b.perch).sub(b.pos);
      const dist = _v.length();
      if (dist < 0.45 || b.t <= 0) {
        b.pos.copy(b.perch); b.st = 'sitzen'; b.t = 3 + rnd() * 9;
        b.yaw = Math.atan2(b.vel.x, b.vel.z);
        continue;
      }
      _v.multiplyScalar(b.sp / dist);
      // Kurz vor dem Ast abbremsen, sonst schiesst der Vogel durch die Krone
      if (dist < 3) _v.multiplyScalar(0.3 + dist / 4.3);
      b.vel.lerp(_v, Math.min(1, dt * 2.6));
      b.pos.addScaledVector(b.vel, dt);

      // Die Welle: steigen, solange geschlagen wird, sinken mit angelegten Fluegeln
      b.ud += dt * 3.4;
      const steigt = Math.cos(b.ud) > 0;
      b.ph += dt * (steigt ? 27 : 5);
      const schlag = steigt ? Math.sin(b.ph) * 1.2 : -0.45 + Math.sin(b.ph) * 0.1;
      const sweep = steigt ? 0.12 : 0.75;               // angelegt wird nach hinten, nicht nur nach unten
      b.m.wR.rotation.set(0, sweep, -schlag); b.m.wL.rotation.set(0, -sweep, schlag);
      b.m.head.rotation.y = 0;
      b.m.tail.rotation.x = steigt ? 0.06 : 0.3;        // der Schwanz faechert beim Sinken auf

      const yaw = Math.atan2(b.vel.x, b.vel.z);
      const dy = ((yaw - b.yaw + Math.PI * 3) % TAU) - Math.PI;
      b.yaw += dy;
      b.roll += (clamp(-dy / Math.max(dt, 1e-3) * 0.22, -0.9, 0.9) - b.roll) * Math.min(1, dt * 7);
      const sp = b.vel.length() || 1;
      g.position.set(b.pos.x, b.pos.y + Math.sin(b.ud) * 0.2, b.pos.z);
      g.rotation.set(-Math.asin(clamp(b.vel.y / sp, -1, 1)) * 0.8, b.yaw, b.roll);
    }
  }

  // ---------- Greifvoegel ----------
  _big(dt, px, pz) {
    const rnd = this.rnd;
    for (const b of this.big) {
      if (!b.set || Math.hypot(b.cx - px, b.cz - pz) > 70) {   // der Kreis folgt dem Angler, aber nur weitraeumig
        b.cx = px + (rnd() * 2 - 1) * 24; b.cz = pz - 10 - rnd() * 30; b.set = true;
      }
      b.a += b.w * dt;
      const x = b.cx + Math.cos(b.a) * b.r, z = b.cz + Math.sin(b.a) * b.r;
      const y = b.y + Math.sin(b.a * 0.7) * 1.8;        // der Aufwind traegt ungleichmaessig
      b.burst -= dt;
      // Ein Greifvogel gleitet; alle paar Sekunden schlaegt er ein paar Mal nach
      let schlag;
      if (b.burst < 0) {
        b.ph += dt * 9;
        schlag = Math.sin(b.ph) * 0.65;
        if (b.burst < -1.4) { b.burst = 6 + rnd() * 16; b.ph = 0; }
      } else {
        schlag = 0.1;                                   // im Gleitflug stehen die Fluegel leicht angehoben
      }
      b.m.wR.rotation.set(0, 0.06, -schlag); b.m.wL.rotation.set(0, -0.06, schlag);
      b.m.tail.rotation.x = 0.05;
      const g = b.m.g, s = Math.sign(b.w);
      g.position.set(x, y, z);
      // Fliegt auf der Kreisbahn voran und legt sich in die Kurve
      g.rotation.set(0, Math.atan2(-Math.sin(b.a) * s, -Math.cos(b.a) * s) + Math.PI, s * 0.34);
    }
  }

  // ---------- Eichhoernchen ----------
  _squirrel(dt, px, pz) {
    const rnd = this.rnd, river = this.o.river, L = 0.22;
    for (const s of this.sq) {
      const g = s.m.g, r = s.m;
      // Zu weit weg? Dann taucht es neu auf, wo man es sehen kann
      if (!s.placed || Math.hypot(s.pos.x - px, s.pos.z - pz) > 42) {
        const h = this._home(px, pz);
        if (!h) { g.visible = false; continue; }
        s.pos.copy(h.p); s.heim = h.tree; s.placed = true; s.st = 'sitzen'; s.t = rnd() * 2; s.tree = null;
      }
      g.visible = true;
      s.t -= dt; s.hp += dt;

      if (s.st === 'sitzen') {
        // Aufrecht, Schwanz zuckt. Der Kopf dreht ruckartig - ein Eichhoernchen schaut
        // nicht, es zuckt hin.
        r.hip.rotation.x = -0.95;                        // um die Hinterbeine aufgerichtet
        r.head.rotation.x = 0.35;                        // der Kopf bleibt dabei waagrecht
        r.head.rotation.y = Math.round(Math.sin(s.hp * 1.7) * 2.2) * 0.45;
        r.tail.rotation.x = Math.sin(s.hp * 7) * 0.2 + 0.5;
        for (const l of r.legs) l.rotation.x = l.userData.hind ? 0.2 : -1.1;
        g.position.set(s.pos.x, s.pos.y, s.pos.z);
        g.rotation.set(0, s.yaw, 0);
        if (s.t <= 0) {
          const tree = s.heim || this._nearTree(s.pos);
          // Oft den Stamm hinauf - das ist es, was man von einem Eichhoernchen erwartet,
          // und oben am Stamm steht es frei ueber dem Gras statt darin zu verschwinden
          if (tree && rnd() < 0.55) { s.tree = tree; s.st = 'zumBaum'; s.hops = 20; s.hop = 0; this._aim(s, tree.x, tree.z, river); }
          else { s.st = 'huepfen'; s.hops = 3 + ((rnd() * 7) | 0); s.hop = 0; this._wander(s, river, px, pz); }
        }
        continue;
      }

      if (s.st === 'klettern') {
        const tree = s.tree;
        const top = 2.2 + tree.s * 1.4;
        if (!s.up && s.t > 0) s.t -= dt;                 // oben kurz verharren
        else s.climb += dt * (s.up ? 1.7 : -2.3);
        if (s.up && s.climb > top) { s.up = false; s.t = 0.6 + rnd() * 1.2; s.climb = top; }
        if (!s.up && s.climb <= 0) { s.climb = 0; s.st = 'sitzen'; s.t = 1 + rnd() * 2.5; s.tree = null; continue; }
        const rad = 0.17 * tree.s + L * 0.22, a = s.yaw;
        g.position.set(tree.x + Math.sin(a) * rad, tree.y + s.climb, tree.z + Math.cos(a) * rad);
        // Senkrecht am Stamm, Kopf nach oben oder nach unten, Bauch zum Holz
        g.rotation.set(s.up ? -1.5 : 1.5, a + Math.PI, 0);
        r.hip.rotation.x = 0;
        r.head.rotation.set(0, 0, 0);
        r.tail.rotation.x = -0.45 + Math.sin(s.climb * 6) * 0.15;   // am Stamm haengt er gerade nach unten
        const gang = Math.sin(s.climb * 9);
        r.legs.forEach((l, i) => { l.rotation.x = gang * (i % 2 ? 0.7 : -0.7) * (l.userData.hind ? 1 : -1); });
        continue;
      }

      // Springen: beide Hinterbeine zugleich, der Ruecken macht einen Buckel
      s.hop += dt / 0.3;
      if (s.hop >= 1) {
        s.hop = 0; s.hops--;
        s.pos.copy(s.to);
        if (s.hops <= 0) {
          if (s.st === 'zumBaum' && s.tree) {
            s.st = 'klettern'; s.up = true; s.climb = 0;
            s.yaw = Math.atan2(s.pos.x - s.tree.x, s.pos.z - s.tree.z);
          } else { s.st = 'sitzen'; s.t = 1.2 + rnd() * 3.4; }
          continue;
        }
        if (s.st === 'zumBaum' && s.tree) this._aim(s, s.tree.x, s.tree.z, river);
        else this._wander(s, river, px, pz);
      }
      const u = s.hop, bogen = Math.sin(Math.PI * u);
      s.pos.copy(s.from).lerp(s.to, u);
      g.position.set(s.pos.x, s.pos.y + bogen * 0.1, s.pos.z);
      g.rotation.set(0, s.yaw, 0);
      r.hip.rotation.x = -0.12 + bogen * 0.5;           // der Buckel im Sprung
      r.head.rotation.set(0.1 - bogen * 0.4, 0, 0);
      r.tail.rotation.x = 0.2 - bogen * 0.55;           // der Schwanz schwingt dem Koerper nach
      r.legs.forEach(l => { l.rotation.x = l.userData.hind ? -0.3 + bogen * 1.5 : 0.6 - bogen * 1.3; });
    }
  }


  // ---------- Katze ----------
  //
  // Sie kommt aus dem Baumsaum, geht ans Wasser, trinkt und geht wieder. Zwischen zwei
  // Besuchen vergeht eine gute Minute: Ein Tier, das dauernd herumsteht, ist Kulisse.
  //
  // Im Gehen haelt eine Katze den Ruecken waagrecht und den Kopf ruhig - daran erkennt
  // man sie noch auf dreissig Meter. Die Beine schwingen ueber Kreuz: vorn links mit
  // hinten rechts. Wer alle vier gleich schwingen laesst, baut ein Schaukelpferd.
  _cat(dt, px, pz) {
    const c = this.cat, m = c.m, g = m.g, rnd = this.rnd, river = this.o.river;
    const L = m.L, H = m.H;
    c.t -= dt;

    if (c.st === 'weg') {
      g.visible = false;
      if (c.t > 0) return;
      const ziel = this._tränke(px, pz);
      if (!ziel) { c.t = 6; return; }
      c.ziel.copy(ziel.p); c.heim.copy(ziel.start);
      c.pos.copy(ziel.start);
      c.yaw = Math.atan2(c.ziel.x - c.pos.x, c.ziel.z - c.pos.z);
      c.st = 'kommt'; c.t = 60; c.gang = 0;
      g.visible = true;
    }

    const grund = river.heightAt(c.pos.x, c.pos.z);

    if (c.st === 'kommt' || c.st === 'geht') {
      const sp = c.st === 'kommt' ? 0.85 : 1.35;        // auf dem Rueckweg hat sie es eiliger
      const dx = c.ziel.x - c.pos.x, dz = c.ziel.z - c.pos.z;
      const d = Math.hypot(dx, dz);
      if (d < 0.25 || c.t <= 0) {
        if (c.st === 'kommt') {
          // Genau auf den geprueften Platz treten: ein paar Zentimeter daneben steht sie
          // schon wieder auf der Boeschung und trinkt Luft
          c.pos.copy(c.ziel);
          c.st = 'trinkt'; c.t = 7 + rnd() * 9; c.lap = 0; c.blick = 2 + rnd() * 2;
        }
        else { c.st = 'weg'; c.t = 50 + rnd() * 80; g.visible = false; }
        return;
      }
      const schritt = Math.min(d, sp * dt);
      c.pos.x += dx / d * schritt; c.pos.z += dz / d * schritt;
      c.pos.y = river.heightAt(c.pos.x, c.pos.z);
      // Die Drehung laeuft der Richtung nach, sie springt nicht
      const soll = Math.atan2(dx, dz);
      c.yaw += (((soll - c.yaw + Math.PI * 3) % TAU) - Math.PI) * Math.min(1, dt * 3.2);
      c.gang += schritt / 0.42;                          // ein Schritt je 42 cm
      const w = c.gang * TAU, versatz = [0, Math.PI, Math.PI, 0];
      m.legs.forEach((l, i) => { l.rotation.x = Math.sin(w + versatz[i]) * 0.42; });
      m.rumpf.position.y = H * 0.86 + Math.sin(w * 2) * 0.006;   // kaum Bewegung: das ist der Punkt
      m.rumpf.rotation.x = 0;
      m.hals.rotation.set(0.08, Math.sin(c.gang * 0.7) * 0.12, 0);
      m.head.rotation.x = -0.08;                          // der Kopf bleibt waagrecht
      m.tail.rotation.set(0.1, Math.sin(c.gang * 1.3) * 0.18, 0);
      g.position.set(c.pos.x, c.pos.y, c.pos.z);
      g.rotation.set(0, c.yaw, 0);
      return;
    }

    // Trinken: tief geduckt, der Hals lang nach unten, der Kopf tupft aufs Wasser.
    // Dazwischen hebt sie den Kopf und schaut - laenger als zehn Sekunden saeuft keine
    // Katze am Stueck.
    c.blick -= dt;
    const schaut = c.blick < 0;
    if (schaut && c.blick < -1.6) c.blick = 2.5 + rnd() * 3;
    c.lap += dt * (schaut ? 0 : 7.5);
    m.legs.forEach((l, i) => { l.rotation.x = l.userData.vorn ? 0.25 : -0.3; });
    // Vorn tief, hinten hoch - eine trinkende Katze knickt in der Brust ein, nicht im
    // ganzen Koerper. Das Vorzeichen der Drehung ist hier entscheidend: Bei negativem
    // Winkel hebt sich der Kopf, statt sich zu senken, und das Tier trinkt Luft.
    m.rumpf.position.y = H * 0.5;
    m.rumpf.rotation.x = 0.3;
    m.tail.rotation.set(-0.15, Math.sin(c.lap * 0.12) * 0.25, 0);
    if (schaut) {
      m.hals.rotation.set(-0.45, Math.sin(c.blick * 2.2) * 0.5, 0);
      m.head.rotation.x = 0;
    } else {
      m.hals.rotation.set(1.42 + Math.sin(c.lap) * 0.08, 0, 0);
      m.head.rotation.x = 0;
    }
    g.position.set(c.pos.x, grund, c.pos.z);
    g.rotation.set(0, c.yaw, 0);
    if (c.t <= 0) { c.st = 'geht'; c.ziel.copy(c.heim); c.t = 60; }
  }

  // Ein Platz zum Trinken: dort, wo der Boden gerade eben aus dem Wasser kommt. Die Kante
  // wird gesucht, nicht geraten - das Ufer faellt in jedem Revier anders ab.
  _tränke(px, pz) {
    const rnd = this.rnd, river = this.o.river;
    for (let i = 0; i < 20; i++) {
      const side = rnd() < 0.5 ? -1 : 1;
      const z = pz + (rnd() * 2 - 1) * 16;
      // Halbierung: innen im Wasser, aussen trocken - dazwischen liegt die Kante
      let lo = river.halfW - 0.6, hi = river.halfW + 5;
      for (let k = 0; k < 18; k++) {
        const mid = (lo + hi) / 2;
        if (river.heightAt(river.cx(z) + side * mid, z) < 0.02) lo = mid; else hi = mid;
      }
      const x = river.cx(z) + side * (hi + 0.05);
      const y = river.heightAt(x, z);
      // Sie muss bis ans Wasser reichen: steht sie auf einer Kante von 20 cm, trinkt sie
      // Luft. Ueber 12 cm wird der Platz verworfen.
      if (y < 0.0 || y > 0.12) continue;
      if (Math.hypot(x - px, z - pz) < 5) continue;        // nicht dem Angler auf die Fuesse
      if (Math.hypot(x - px, z - pz) > 24) continue;        // und nicht so weit weg, dass man sie nie sieht
      // Woher sie kommt: vom selben Ufer, acht Meter landeinwaerts
      const sx = river.cx(z) + side * (river.halfW + 9), sy = river.heightAt(sx, z);
      if (sy < 0.2 || sy > 3.2) continue;
      return { p: new THREE.Vector3(x, y, z), start: new THREE.Vector3(sx, sy, z) };
    }
    return null;
  }

  // Naechster Sprung in Richtung eines Ziels
  _aim(s, tx, tz, river) {
    const d = Math.hypot(tx - s.pos.x, tz - s.pos.z) || 1;
    const step = Math.min(0.5, Math.max(0.12, d));
    s.from.copy(s.pos);
    s.to.set(s.pos.x + (tx - s.pos.x) / d * step, 0, s.pos.z + (tz - s.pos.z) / d * step);
    s.to.y = river.heightAt(s.to.x, s.to.z);
    s.yaw = Math.atan2(s.to.x - s.from.x, s.to.z - s.from.z);
    if (d < 0.6) s.hops = 1;
  }

  // Naechster Sprung ins Blaue - aber nicht ins Wasser und nicht dem Angler ins Gesicht
  _wander(s, river, px, pz) {
    const rnd = this.rnd;
    for (let i = 0; i < 10; i++) {
      const a = s.yaw + (rnd() - 0.5) * (i < 6 ? 1.1 : 6.3), step = 0.34 + rnd() * 0.2;
      const x = s.pos.x + Math.sin(a) * step, z = s.pos.z + Math.cos(a) * step;
      const y = river.heightAt(x, z);
      if (y < 0.25 || y > 2.8) continue;
      if (Math.abs(river.off(x, z)) < river.halfW + 0.8) continue;
      if (Math.hypot(x - px, z - pz) < 1.6) continue;
      if (s.heim && Math.hypot(x - s.heim.x, z - s.heim.z) > 4.5) continue;   // nie weit vom eigenen Baum
      s.from.copy(s.pos); s.to.set(x, y, z); s.yaw = a;
      return;
    }
    s.from.copy(s.pos); s.to.copy(s.pos); s.hops = 0;
  }
}
