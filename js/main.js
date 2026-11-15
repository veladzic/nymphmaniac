// Nymphmaniac – Spiellogik: Wurf, Drift, Biss, Drill, Fortschritt, UI
import { T, LANGS, getLang, setLang, loc } from './i18n.js';
import { World } from './world.js';
import { SPECIES, FLIES, INSECTS, REVIERE, SEASONS, PAGES, BEADS, TIPPETS, LEVEL_UNLOCKS, MAX_LEVEL, xpNeed, CLARITY, LIGHTS } from './data.js';
import { LANE_X, Z_MIN, Z_MAX } from './river.js';
import { drawFish, drawFly } from './fishart.js';
import { Sfx } from './audio.js';

const $ = id => document.getElementById(id);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const pick = a => a[(Math.random() * a.length) | 0];
const fmt = (n, d = 1) => n.toFixed(d).replace('.', ',');

// ---------- Spielstand ----------
const KEY = 'nymphmaniac_v1';
function newSave() {
  return { level: 1, xp: 0, material: 4, flies: { pt: 4, perdigon: 4, walt: 4 }, sel: { fly: 'pt', bead: 3.0, tippet: 0.14 },
    unlocked: 1, revier: 0, quests: {}, log: {}, stats: {}, pages: ['intro'], tut: 0, set: { help: true, vib: true, sound: true, assist: true, gfx: true, clear: false }, total: 0, started: false };
}
let save;
try { save = JSON.parse(localStorage.getItem(KEY)); } catch (e) { save = null; }
if (!save || !save.sel) save = newSave();
save.set = Object.assign({ help: true, vib: true, sound: true, assist: true, gfx: true, clear: false }, save.set);
const persist = () => { try { localStorage.setItem(KEY, JSON.stringify(save)); } catch (e) { /* privat */ } };
const stats = id => save.stats[id] || (save.stats[id] = { n: 0, sp: {}, spMax: {}, maxLen: 0, matched: 0, pocket: 0, heavy: 0, fine: 0, big42: 0, old: 0 });
const curFly = () => FLIES.find(f => f.id === save.sel.fly);
const curBead = () => BEADS.find(b => b.mm === save.sel.bead);
const curTippet = () => TIPPETS.find(t => t.d === save.sel.tippet);

// ---------- Welt & Zustand ----------
const canvas = $('gl');
const world = new World(canvas);
const sfx = new Sfx(); sfx.on = save.set.sound;
if (!save.set.gfx) world.setQuality(false);
world.setClearView(save.set.clear);
let river, cond, fish = [], respawn = [];
const S = {
  mode: 'title', yaw: 0, yb: 0, pitch: 0, px: LANE_X, pz: 0, t: 0, joy: { x: 0, z: 0 }, face: 0, walk: 0, moveDir: 0, tip: { x: LANE_X - 0.6, z: -1.6 }, nymph: { x: 0, d: 0, z: 0 }, L: 4, s: 1, pullS: 0, g: 0, q: 1,
  kick: 0, driftT: 0, onBottom: false, tickT: 0, bite: null, snag: false, snagT: 0, fight: null, hold: false, wade: null,
  cast: null, maxFrac: 0, swingT: 0, sinkRate: 0.2, snagHint: false, aim: null, press: 0, rodX: -0.5,
};
const groundY = () => 0.56 + (river ? clamp(river.heightAt(S.px, S.pz), -1.05, 1.2) : -0.56);
const onLand = (x = S.px, z = S.pz) => Math.abs(river.off(x, z)) >= river.halfW || river.depthAt(x, z) < 0.03;
const hand = () => { const c = Math.cos(S.face), sn = Math.sin(S.face), lx = 0.2, lz = -0.4; return { x: S.px + lx * c + lz * sn, y: 0.8 + groundY(), z: S.pz - lx * sn + lz * c }; };
function tip3() {
  const h = hand();
  let dx = S.tip.x - h.x, dz = S.tip.z - h.z, l = Math.hypot(dx, dz);
  if (l < 1e-3) { dz = -0.5; l = 0.5; }
  const c = clamp(l, 0.5, 2.95);
  dx *= c / l; dz *= c / l;
  S.tip.x = h.x + dx; S.tip.z = h.z + dz;
  return { x: S.tip.x, y: h.y + Math.sqrt(3.05 * 3.05 - c * c), z: S.tip.z };
}
function restTip() { const h = hand(), a = S.face + 0.25; S.tip.x = h.x - Math.sin(a) * 2.0; S.tip.z = h.z - Math.cos(a) * 2.0; }
const vibrate = p => { if (save.set.vib && navigator.vibrate) { try { navigator.vibrate(p); } catch (e) { /* */ } } };

// ---------- Revier ----------
function enterRevier(i) {
  save.revier = i;
  const rv = REVIERE[i];
  cond = { clarity: pick(rv.clarity), light: pick(LIGHTS), sampled: false };
  const ins = [...rv.insects].sort(() => Math.random() - 0.5);
  if (cond.clarity === 2 && ins.includes('worm')) { ins.splice(ins.indexOf('worm'), 1); ins.unshift('worm'); }
  cond.i1 = ins[0]; cond.i2 = ins[1];
  river = world.buildRevier(rv, cond);
  world.setPolar(save.level >= 2);
  S.px = LANE_X; S.pz = 0; world.camZ = 0; world.camX = LANE_X; S.wade = null; S.fight = null; S.bite = null; S.snag = false;
  fish = []; respawn = [];
  const lies = river.lies.filter(l => !l.big).sort(() => Math.random() - 0.5).slice(0, rv.fishN);
  for (const l of lies) fish.push(makeFish(l));
  checkOld(false);
  if (S.mode !== 'title') S.mode = 'idle';
  restTip();
  sfx.setRiver(rv.speed);
  const f = curFly(); world.setFlyLook(f.col, f.bead);
  updateHUD(); updateTip();
  persist();
}
function makeFish(lie, old) {
  const rv = REVIERE[save.revier];
  let species, len;
  if (old) { species = 'marmorata'; len = 92; }
  else {
    const tot = Object.values(rv.species).reduce((a, b) => a + b, 0);
    let r = Math.random() * tot;
    for (const k in rv.species) { r -= rv.species[k]; if (r <= 0) { species = k; break; } }
    const sp = SPECIES[species];
    const bonus = lie.type === 'Gumpen' ? 0.18 : 0;
    len = Math.round(sp.min + (sp.max - sp.min) * clamp(Math.pow(Math.random(), 1.9) * rv.sizeMul + bonus * Math.random() + rv.sizeMul * 0.12, 0, 1));
  }
  const f = { lie, x: lie.x, z: lie.z, species, len, wary: 0, spooked: 0, old: !!old, phase: Math.random() * 6, match: 1 };
  f.mesh = world.makeFish(len, species);
  placeFish(f);
  return f;
}
function placeFish(f) { f.ry = Math.atan(river.dcx(f.z)); f.mesh.position.set(f.x, -Math.max(0.2, river.depthAt(f.x, f.z) - 0.12), f.z); f.mesh.rotation.set(0, f.ry, 0); }   // Kopf gegen die Stroemung
function checkOld(announce) {
  const rv = REVIERE[save.revier];
  if (rv.id !== 'gumpen' || !save.quests.g1 || !save.quests.g2 || fish.some(f => f.old)) return;
  const lie = river.lies.find(l => l.big);
  if (!lie) return;
  fish.push(makeFish(lie, true));
  if (announce) setTimeout(() => toast(T('Im tiefsten Teil des Gumpens bewegt sich ein großer Schatten …'), 5000), 1500);
}

function flyMatch(fly, f) {
  let m = 0.45;
  if (fly.imitates.includes(cond.i1)) m += 0.75; else if (fly.imitates.includes(cond.i2)) m += 0.4;
  m += fly.attractor * (cond.clarity - 0.6) * 0.35;
  if (fly.loves && fly.loves.includes(f.species)) m += 0.3;
  if (f.len > 45) m += fly.big || 0;
  return clamp(m, 0.12, 1.6);
}

// ---------- Wurf ----------
function castTarget(pt) {
  const h = hand();
  let dx = pt.x - h.x, dz = pt.z - h.z, d = Math.hypot(dx, dz);
  if (d < 0.4) return null;
  const dd = clamp(d, 2.6, 7.6); dx *= dd / d; dz *= dd / d;
  if (dz > 1.0) dz = 1.0;
  const tx = h.x + dx, tz = h.z + dz;
  return { tx, tz, dx, dz, ok: river.depthAt(tx, tz) >= 0.1 };
}
function doCast(pt) {
  if (S.mode !== 'idle' || S.wade) return;
  const fly = curFly();
  if (!(save.flies[fly.id] > 0)) { toast(T('Keine {0} mehr – öffne die Fliegendose.', fly.name)); return; }
  const h = hand(), ct = castTarget(pt);
  if (!ct) return;
  if (!ct.ok) { toast(T('Dort ist kein Wasser.')); return; }
  const { tx, tz, dx, dz } = ct;
  const l = Math.hypot(dx, dz);
  S.tip.x = h.x + dx / l * 2.6; S.tip.z = h.z + dz / l * 2.6;
  const TP = tip3();
  S.cast = { t: 0, fx: TP.x, fy: TP.y - 1.2, fz: TP.z + 0.6, tx, tz };
  S.mode = 'cast';
  sfx.whip();
}
function updateCast(dt) {
  const c = S.cast; c.t += dt / 0.6;
  if (c.t >= 1) {
    const n = S.nymph; n.x = c.tx; n.z = c.tz; n.d = 0.02;
    const TP = tip3();
    S.L = Math.hypot(TP.x - n.x, TP.y, TP.z - n.z) * 1.07;
    const tp = curTippet(), fly = curFly();
    S.sinkRate = curBead().sink * fly.sink * tp.sink;
    for (const f of fish) f.match = flyMatch(fly, f);
    S.mode = 'drift'; S.driftT = 0; S.bite = null; S.snag = false; S.snagHint = false; S.onBottom = false; S.maxFrac = 0; S.swingT = 0; S.pullS = 0; S.g = 0; S.kick = 0; S.tickT = 0.3;
    world.splash(n.x, n.z, 0.5); sfx.plop();
    if (save.tut < 2) { save.tut = Math.max(save.tut, 1); }
    updateTip();
  }
}

// ---------- Drift ----------
function updateDrift(dt) {
  const n = S.nymph;
  S.driftT += dt;
  const bottom = Math.max(0.06, river.depthAt(n.x, n.z));
  const v = river.speedAt(n.x, n.z);
  if (save.set.assist && !S.bite && !S.snag && S.s < 0.96 && S.pullS < 0.05) {
    const T0 = tip3(), ax = T0.x - n.x, az = T0.z - n.z, al = Math.hypot(ax, az) || 1;
    const st = Math.min(1.4, 1.7 * (0.96 - S.s) * S.L) * dt;
    S.tip.x += ax / al * st; S.tip.z += az / al * st;
  }
  const TP = tip3();
  const held = S.snag || S.bite;
  if (!held) {
    const frac = Math.min(1, n.d / bottom);
    let vz = Math.max(0.16, v * (1 - 0.5 * frac)); if (S.onBottom) vz *= 0.75;
    n.z += vz * dt; n.x += river.dcx(n.z) * vz * dt;   // die Stroemung folgt dem Flusslauf
    for (const k of river.rocks) {
      const dx = n.x - k.x, dz = n.z - k.z, d = Math.hypot(dx, dz);
      if (d < k.r * 0.95) n.x += (dx >= 0 ? 1 : -1) * (k.r * 0.95 - d);
    }
  }
  let pull = 0;
  const constrain = count => {
    const dx = TP.x - n.x, dy = TP.y + n.d, dz = TP.z - n.z, d = Math.hypot(dx, dy, dz);
    if (d > S.L) {
      const ex = d - S.L;
      if (held) { if (count) pull = 0.9; }
      else { n.x += dx / d * ex; n.z += dz / d * ex; n.d = Math.max(0, n.d - dy / d * ex); if (count) pull = ex / dt; }
      return 1;
    }
    return d / S.L;
  };
  S.s = constrain(true);
  if (!held) {
    // Kontakt (Anzeige mittig) hält die Nymphe knapp über Grund in der Schwebe; nur lose Schnur lässt sie aufsetzen, Zug hebt sie
    const sink = S.sinkRate / (1 + 0.9 * v), lift = Math.min(1.1, Math.max(0, S.pullS - 0.08) * 1.3);
    const floor = S.g > -0.4 ? bottom - Math.min(0.25, bottom * 0.3) : bottom;
    let nd = n.d + (sink - lift) * dt;
    if (n.d <= floor) nd = Math.min(nd, floor); else nd = Math.max(floor, Math.min(nd, n.d - 0.3 * dt));
    n.d = clamp(nd, 0, bottom);
    constrain(false);
    if (river.depthAt(n.x, n.z) < 0.05) return endDrift();
  }
  S.pullS += (pull - S.pullS) * Math.min(1, dt * 8);
  const g = S.pullS > 0.06 ? Math.min(1, S.pullS / 0.55) : -clamp((0.97 - S.s) / 0.22, 0, 1);
  S.g += (g - S.g) * Math.min(1, dt * 10);
  const ag = Math.abs(S.g);
  S.q = ag < 0.4 ? 1 : Math.max(0.1, 1 - (ag - 0.4) / 0.6 * 0.9);
  S.onBottom = !S.snag && n.d >= bottom - 0.03;
  S.maxFrac = Math.max(S.maxFrac, n.d / bottom);

  if (S.onBottom && !S.bite) {
    S.tickT -= dt;
    if (S.tickT <= 0) {
      S.tickT = 0.3 + Math.random() * 0.5; S.kick = Math.max(S.kick, 0.32); sfx.tick();
      const over = (S.sinkRate / (1 + 0.9 * v)) / (bottom / 2.5);
      if (Math.random() < 0.006 + 0.022 * Math.min(2, over)) { S.snag = true; S.snagT = 0; sfx.bite(); }
    }
  }
  if (S.snag) {
    S.snagT += dt; S.kick += (1 - S.kick) * Math.min(1, dt * 20);
    if (S.snagT > 1.6 && !S.snagHint) { S.snagHint = true; toast(T('Hänger! ANHIEB drücken, um die Nymphe zu lösen.'), 3500); }
    return;
  }
  if (S.bite) {
    const b = S.bite; b.t += dt; S.kick += (1 - S.kick) * Math.min(1, dt * 22);
    if (b.t > b.win) {
      b.fish.wary = 22; S.bite = null; $('lupeWrap').classList.remove('bite');
      toast(save.set.help ? T('Biss verpasst! Wenn der Sighter stoppt oder abtaucht: sofort ANHIEB.') : T('Da war etwas …'));
      updateTip();
    }
    return;
  }
  S.kick *= Math.exp(-dt * 7);

  // Biss?
  if (S.driftT > 0.5) {
    for (const f of fish) {
      if (f.wary > 0 || f.spooked > 0) continue;
      const fx = f.x - n.x, fz = f.z - n.z, R = 0.7 + f.len / 100 * 0.6;
      if (fx * fx + fz * fz > R * R) continue;
      const zone = 0.28 + 0.14 * cond.light.act + (f.len > 45 ? 0.06 : 0);
      if (bottom - n.d > zone) continue;
      if (f.old && (f.match < 1.0 || S.q < 0.9)) continue;
      const sp = SPECIES[f.species], tp = curTippet();
      const take = 1 + (tp.take - 1) * (0.5 + sp.shy) * (1 - cond.clarity * 0.4);
      const rate = 1.5 * f.match * S.q * S.q * cond.light.act * take * (1.15 - sp.shy * 0.3);
      if (Math.random() < rate * dt) { startBite(f); return; }
    }
  }
  // Ende der Drift
  if (S.pullS > 0.5) S.swingT += dt; else S.swingT = Math.max(0, S.swingT - dt);
  if (n.z > S.pz + 3.2 || S.swingT > 1.3) endDrift();
}
function startBite(f) {
  const sp = SPECIES[f.species];
  S.bite = { fish: f, t: 0, win: (0.95 - sp.shy * 0.3) * (save.set.help ? 1.2 : 1) + (save.revier === 0 ? 0.3 : 0) };
  sfx.bite();
  if (save.set.help) { vibrate(60); $('lupeWrap').classList.add('bite'); }
  if (save.tut < 3) save.tut = 2;
  updateTip();
}
function endDrift(silent) {
  if (!silent && S.mode === 'drift') {
    if (S.maxFrac < 0.62 && S.driftT > 2) toast(T('Die Nymphe kam nicht auf Tiefe. Schwerere Perle wählen oder weiter stromauf einwerfen.'), 4200);
  }
  S.mode = 'idle'; S.bite = null; S.snag = false; S.s = 1; S.g = 0; S.kick = 0;
  $('lupeWrap').classList.remove('bite');
  restTip(); updateTip(); updateHUD();
}
function loseFly(msg) {
  const id = save.sel.fly;
  save.flies[id] = Math.max(0, (save.flies[id] || 0) - 1);
  sfx.snap(); vibrate([30, 40, 30]);
  if (save.flies[id] === 0) {
    const other = FLIES.find(f => save.flies[f.id] > 0);
    if (other) { save.sel.fly = other.id; msg += ' ' + T('Neue Fliege: {0}.', other.name); world.setFlyLook(other.col, other.bead); }
    else if (save.material < 2) { save.flies.pt = 2; save.sel.fly = 'pt'; msg += ' ' + T('In der Westentasche findest du noch zwei Pheasant Tails von Opa.'); }
    else msg += ' ' + T('Binde dir neue in der Fliegendose.');
  }
  toast(msg, 4200); persist();
}

function strike() {
  if (S.mode !== 'drift') return;
  sfx.whip();
  S.strikeT = 0.25;
  if (S.bite) {
    const f = S.bite.fish;
    if (S.s < 0.8 && Math.random() < 0.55) {
      f.wary = 20; toast(T('Zu viel lose Schnur – der Anhieb kam nicht durch.')); endDrift(true); return;
    }
    startFight(f); return;
  }
  if (S.snag) {
    const lose = Math.random() < 0.16 + (save.sel.tippet <= 0.12 ? 0.14 : 0);
    if (lose) loseFly(T('Abriss am Hänger – Fliege verloren.')); else toast(T('Hänger gelöst.'));
    endDrift(true); return;
  }
  const n = S.nymph;
  for (const f of fish) if ((f.x - n.x) ** 2 + (f.z - n.z) ** 2 < 2.5) f.wary = Math.max(f.wary, 7);
  if (S.kick > 0.15) toast(T('Nur ein Grundkontakt. Ticks sind kurz – ein Biss hält den Sighter fest.'));
  endDrift();
}

// ---------- Drill ----------
function startFight(f) {
  const n = S.nymph, sp = SPECIES[f.species];
  S.bite = null; $('lupeWrap').classList.remove('bite');
  S.mode = 'fight'; S.hold = false; S.press = 0; S.rodX = -0.5; ptr.ax = ptr.x; ptr.ay = ptr.y;
  const str = sp.fight * Math.pow(f.len / 40, 1.1);
  S.fight = { f, str, stam: 1, ten: 0.55, surge: 0.9, runT: 1.2, side: Math.random() < 0.5 ? 1 : -1, breakT: 0, slackT: 0,
    ang: Math.atan2(-(n.x - S.px), -(n.z - S.pz)), dist: Math.max(2, Math.hypot(n.x - S.px, n.z - S.pz)), jump: 0, jumpT: 2.5 + Math.random() * 3, landing: 0, reelT: 0 };
  world.splash(n.x, n.z, 1.2); sfx.splash(); vibrate([50, 40, 80]);
  if (save.tut < 4) save.tut = 3;
  $('hud').classList.add('fighting'); $('strike').textContent = T('DRILL');
  toast(f.old ? T('Die Rute biegt sich bis ins Handteil. DAS IST ER!') : T('Fisch hängt!'), 1800);
  updateTip();
}
function fightPos() { const F = S.fight, w = river.halfW - 0.9, z = S.pz - Math.cos(F.ang) * F.dist, c = river.cx(z); return { x: clamp(S.px - Math.sin(F.ang) * F.dist, c - w, c + w), z }; }
function updateFight(dt) {
  const F = S.fight, f = F.f, sp = SPECIES[f.species], lim = curTippet().limit;
  let p = fightPos();
  if (F.landing > 0) {
    F.landing += dt; F.dist = Math.max(1.3, F.dist - dt * 3.5); F.ten += (0.45 - F.ten) * dt * 4;
    if (F.landing > 1.2) return landed(f);
  } else {
    F.runT -= dt;
    if (F.runT <= 0) {
      F.surge = (0.55 + Math.random() * 0.6) * Math.min(1.35, 0.45 + F.str * 0.4) * (0.45 + F.stam * 0.55);
      F.runT = 1.1 + Math.random() * 2.2; if (Math.random() < 0.6) F.side *= -1;
      world.splash(p.x, p.z, 0.7 + f.len / 60); sfx.splash(); vibrate(25);
    }
    F.surge *= Math.exp(-dt * 1.1);
    const pr = Math.max(S.hold ? 0.8 : 0, S.press); F.p = pr;
    const hh = hand(); S.tip.x = hh.x + S.rodX; S.tip.z = hh.z - 1.6 + pr * 2.3;
    const rodSide = S.rodX;
    F.good = (F.side > 0 && rodSide > 0.45) || (F.side < 0 && rodSide < -0.45);
    const target = pr * 0.72 + F.surge * 0.62 - (F.good ? 0.04 : 0);
    F.ten += (target - F.ten) * Math.min(1, dt * (target > F.ten ? 6 : 3.5));
    if (F.ten > lim) { F.breakT += dt; if (F.breakT > 0.75) return lostFish('snap'); } else F.breakT = Math.max(0, F.breakT - dt * 0.6);
    if (F.ten < 0.16) { F.slackT += dt; if (F.slackT > 1.7) return lostFish('slack'); } else F.slackT = Math.max(0, F.slackT - dt * 1.5);
    if (F.ten > 0.28 && F.ten <= lim) F.stam -= dt * F.ten * 0.17 / F.str * (F.good ? 1.5 : 1);
    if (sp.jumps) {
      F.jumpT -= dt;
      if (F.jumpT <= 0 && F.jump <= 0 && F.stam > 0.25) { F.jump = 0.7; F.jumpT = 4 + Math.random() * 5; world.splash(p.x, p.z, 1.4); sfx.splash(); toast(T('Sie springt – Druck raus!'), 1200); }
      if (F.jump > 0) {
        F.jump -= dt;
        if (F.p > 0.45 && F.ten > 0.5 && Math.random() < dt * 0.9) return lostFish('jump');
        if (F.jump <= 0) { world.splash(p.x, p.z, 1.6); sfx.splash(); }
      }
    }
    F.ang += F.side * dt * 0.35 * (0.3 + F.surge);
    if (F.ang > 1.3) { F.ang = 1.3; F.side = -1; } if (F.ang < -1.3) { F.ang = -1.3; F.side = 1; }
    F.dist = clamp(F.dist + (F.surge * 2.2 * (1 - 0.55 * F.p) - (0.1 + F.p) * (1.15 - F.stam * 0.6)) * dt, 1.6, 10.5);
    if (F.p > 0.3) { F.reelT -= dt; if (F.reelT <= 0) { F.reelT = 0.09; sfx.reel(); } }
    if (F.stam <= 0) { F.landing = 0.001; toast(T('Kescher!'), 1200); }
  }
  p = fightPos();
  const jy = F.jump > 0 ? Math.sin((0.7 - F.jump) / 0.7 * Math.PI) * 0.9 : 0;
  f.mesh.visible = true;
  f.mesh.position.set(p.x, jy > 0 ? jy : -0.12, p.z);
  f.mesh.rotation.y = F.ang + F.side * 0.9;
  f.mesh.rotation.x = jy > 0 ? -0.6 : 0; f.mesh.rotation.z = jy > 0 ? 0.5 : Math.sin(S.t * 3) * 0.5 * (1 - F.stam);
  world.animFish(f.mesh, S.t * (10 + F.surge * 14) + f.phase, 1.2 + F.surge * 2);
}
function endFightUI() { $('hud').classList.remove('fighting'); $('strike').textContent = T('ANHIEB'); S.hold = false; S.press = 0; S.fight = null; }
function lostFish(kind) {
  const f = S.fight.f;
  endFightUI();
  f.spooked = 80; f.mesh.visible = false; placeFish(f);
  if (kind === 'snap') loseFly(T('Vorfach gerissen! Bei Fluchten den Druck rausnehmen.'));
  else if (kind === 'jump') { toast(T('Im Sprung ausgehakt. Beim Sprung nicht gegenhalten!'), 3500); sfx.snap(); }
  else { toast(T('Ausgeschlitzt – zu wenig Spannung. Schonhaken verzeihen keine lose Schnur.'), 3800); sfx.snap(); }
  S.mode = 'idle'; restTip(); updateTip(); updateHUD();
}

function addXP(x) {
  const ups = [];
  save.xp += x;
  while (save.level < MAX_LEVEL && save.xp >= xpNeed(save.level)) {
    save.xp -= xpNeed(save.level); save.level++;
    for (const f of FLIES) if (f.level === save.level) save.flies[f.id] = (save.flies[f.id] || 0) + 3;
    ups.push(save.level);
  }
  return ups;
}
function landed(f) {
  const sp = SPECIES[f.species], rv = REVIERE[save.revier], st = stats(rv.id), fly = curFly();
  endFightUI();
  S.mode = 'landed';
  const w = Math.round(0.0105 * f.len ** 3 / 10) * 10;
  st.n++; st.sp[f.species] = (st.sp[f.species] || 0) + 1;
  st.spMax[f.species] = Math.max(st.spMax[f.species] || 0, f.len); st.maxLen = Math.max(st.maxLen, f.len);
  if (cond.sampled && fly.imitates.includes(cond.i1)) st.matched++;
  if (f.lie.rock) st.pocket++;
  if (save.sel.bead >= 3.5) st.heavy++;
  if (save.sel.tippet <= 0.12) st.fine++;
  if (f.len >= 42) st.big42++;
  const inc = k => { st[k] = (st[k] || 0) + 1; };
  if (save.sel.bead <= 2.5) inc('light');
  if (f.lie.type === 'Gumpen') inc('pool');
  if (cond.clarity >= 1) inc('murky');
  if (fly.attractor >= 0.5) inc('attr');
  if (save.sel.tippet <= 0.10) inc('ultra');
  if (f.len >= 50) inc('big50');
  if (f.len >= 55) inc('big55');
  if (f.old) st.old++;
  const lg = save.log[f.species] || (save.log[f.species] = { n: 0, max: 0 });
  const rec = f.len > lg.max && lg.n > 0, first = lg.n === 0;
  lg.n++; lg.max = Math.max(lg.max, f.len); save.total++;
  let xp = Math.round(f.len * sp.xp * (save.set.help ? 1 : 1.25) * (save.set.assist ? 1 : 1.15)) + (f.old ? 300 : 0) + (save.set.clear ? 0 : 35);
  const mat = 1 + (f.len > 35 ? 1 : 0) + (f.len > 50 ? 1 : 0);
  save.material += mat;
  const done = [];
  for (const q of rv.quests) if (!save.quests[q.id] && q.test(st)) { save.quests[q.id] = true; done.push(q.text); xp += 60; }
  const ups = addXP(xp);
  let newPage = null;
  const i = save.revier;
  if (rv.quests.every(q => save.quests[q.id])) {
    if (i + 1 < REVIERE.length && save.unlocked < i + 2) { save.unlocked = i + 2; newPage = REVIERE[i + 1].id; }
    else if (i + 1 === REVIERE.length && !save.pages.includes('ende2')) newPage = 'ende2';
  }
  if (f.old && !save.pages.includes('ende')) { if (newPage && !save.pages.includes(newPage)) save.pages.push(newPage); newPage = 'ende'; }   // erst das Ende von Staffel 1, die neue Seite liegt schon im Tagebuch
  if (newPage && !save.pages.includes(newPage)) save.pages.push(newPage);
  if (save.tut < 4) save.tut = 4;
  world.removeFish(f.mesh); fish = fish.filter(x => x !== f);
  if (!f.old) respawn.push({ lie: f.lie, t: 100 });
  world.setPolar(save.level >= 2);
  persist();
  if (f.old) sfx.fanfare(); else sfx.chime();
  vibrate([40, 60, 40, 60, 120]);

  let h = `<div class="catch"><div class="kicker">${f.old ? T('Der Alte vom Smaragdgumpen') : first ? T('Neue Art im Fangbuch!') : rec ? T('Neuer persönlicher Rekord!') : T('Gefangen')}</div>
    <canvas id="catchCv" width="640" height="260"></canvas>
    <h2>${sp.name}</h2><div class="latin">${sp.latin}</div>
    <div class="big">${f.len} cm <span>· ${w >= 1000 ? fmt(w / 1000, 2) + ' kg' : w + ' g'}</span></div>
    <div class="meta">${fly.name} · ${fmt(save.sel.bead)} mm · ${fmt(save.sel.tippet, 2)} mm · ${T(f.lie.type)}</div>
    <div class="chips"><span class="chip xp">+${xp} XP</span><span class="chip">+${mat} ${T('Bindematerial')}</span></div>`;
  for (const q of done) h += `<div class="qdone">✓ ${T('Aufgabe erfüllt:')} ${q}</div>`;
  for (const l of ups) h += `<div class="lvl">${T('Stufe {0}!', l)}${LEVEL_UNLOCKS[l] ? ' ' + T('Neu:') + ' ' + LEVEL_UNLOCKS[l] : ''}</div>`;
  h += `<button class="primary" data-act="release">${T('Zurücksetzen')}</button></div>`;
  openModal(h, { lock: true });
  drawFish($('catchCv'), f.species, { seed: f.len * 13 + 1 });
  S.afterRelease = () => {
    S.mode = 'idle'; restTip(); updateHUD(); updateTip();
    world.splash(S.px - 0.6, S.pz - 0.6, 1); sfx.plop();
    checkOld(true);
    if (newPage) showPage(newPage, true);
    else toast(pick([T('Sie schwimmt davon.'), T('Zurück im Fluss.'), T('Petri Heil!'), T('Ein Schwanzschlag – weg ist sie.')]));
  };
}

// ---------- Waten & Stein ----------
const K = { up: 0, down: 0, left: 0, right: 0, tl: 0, tr: 0 };
const KEYMAP = { KeyW: 'up', ArrowUp: 'up', KeyS: 'down', ArrowDown: 'down', KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right', KeyQ: 'tl', KeyE: 'tr' };
let moveMsgT = 0;
function updateMove(dt) {
  moveMsgT -= dt;
  if (S.mode !== 'idle' || modalOpen()) return;
  let mx = S.joy.x + (K.right - K.left), mz = S.joy.z + (K.down - K.up);
  const ml = Math.hypot(mx, mz);
  if (ml < 0.12) return;
  if (ml > 1) { mx /= ml; mz /= ml; }
  { const c = Math.cos(S.yaw + S.yb), sn = Math.sin(S.yaw + S.yb), rx = mx * c + mz * sn; mz = -mx * sn + mz * c; mx = rx; }   // Stick relativ zur Blickrichtung
  const f = Math.min(1, ml), sp = (onLand() ? 1.5 : 1.3 * (1 - 0.42 * Math.min(1, river.depthAt(S.px, S.pz)))) * dt;
  const ok = (x, z) => {
    const d = river.depthAt(x, z);
    if (d > 1.05 || z < Z_MIN || z > Z_MAX) return false;
    if (Math.abs(river.off(x, z)) > river.halfW + 1.0 || river.heightAt(x, z) > 0.9) return false;   // höchstens 1 m Uferstreifen
    for (const k of river.rocks) if (Math.hypot(x - k.x, z - k.z) < k.r + 0.3) return false;
    return true;
  };
  const ox = S.px, oz = S.pz;
  if (ok(S.px + mx * sp, S.pz + mz * sp)) { S.px += mx * sp; S.pz += mz * sp; }
  else if (Math.abs(mx) > 0.05 && ok(S.px + mx * sp, S.pz)) S.px += mx * sp;
  else if (Math.abs(mz) > 0.05 && ok(S.px, S.pz + mz * sp)) S.pz += mz * sp;
  else if (moveMsgT <= 0) {
    moveMsgT = 3;
    const tx = S.px + mx * 0.4, tz = S.pz + mz * 0.4, d = river.depthAt(tx, tz);
    toast(tz < Z_MIN ? T('Hier endet die Strecke. Oben kannst du sie von vorn beginnen.') : tz > Z_MAX ? T('Weiter unten ist die Brücke. Fisch stromauf!') : d > 1 ? T('Zu tief zum Waten.') : Math.abs(river.off(tx, tz)) > river.halfW ? T('Weiter weg vom Wasser kommst du nicht an die Fische.') : T('Da liegt ein Fels im Weg.'));
  }
  if (ox === S.px && oz === S.pz) return;
  S.walk = f; S.moveDir = Math.atan2(-(S.px - ox), -(S.pz - oz));
  S.aim = null;
  const land = onLand();
  if (!land && Math.random() < dt * 6 * f) world.splash(S.px + (Math.random() - 0.5) * 0.3, S.pz + 0.1, 0.3 + f * 0.25);
  const rad = land ? 0.5 + 0.4 * f : 1.5 + 1.3 * f; let spk = 0;   // am Ufer sieht und hört dich der Fisch kaum
  for (const fi of fish) {
    const d = Math.hypot(fi.x - S.px, fi.z - S.pz);
    if (d < rad && fi.spooked <= 0) { fi.spooked = 70; spk++; } else if (d < rad + (land ? 0.8 : 2.5)) fi.wary = Math.max(fi.wary, 5);
  }
  if (spk) toast(T('Fisch vergrämt! Langsam waten und Abstand zu den Standplätzen halten.'), 3800);
  if (save.tut === 0 || save.tut === 1) { /* Tipp bleibt */ }
}
function kickSample() {
  if (S.mode !== 'idle') return;
  cond.sampled = true;
  const a = INSECTS[cond.i1], b = INSECTS[cond.i2];
  const good = FLIES.filter(f => f.imitates.includes(cond.i1)).map(f => f.name + (save.level >= f.level ? '' : ' 🔒')).join(', ');
  openModal(`<h2>${T('Stein umgedreht')}</h2>
    <p>${T('Du hebst einen faustgroßen Stein aus der Strömung und drehst ihn um.')}</p>
    <div class="sample"><b>${T('Massenhaft {0}', a.name)}</b><br><i>${a.hint}</i></div>
    <div class="sample minor"><b>${T('Vereinzelt {0}', b.name)}</b><br><i>${b.hint}</i></div>
    <p>${T('Passende Muster:')} <b>${good}</b></p>
    <p class="small">${T('Wasser:')} ${CLARITY[cond.clarity]}. ${cond.clarity > 0 ? T('Bei angetrübtem Wasser dürfen Fliegen auffälliger sein (Hotspot).') : T('Bei klarem Wasser lieber natürlich und fein fischen.')}</p>
    <button class="primary" data-act="close">${T('Stein zurücklegen')}</button>`);
  updateHUD();
}

// ---------- UI ----------
let toastT = 0;
function toast(msg, ms = 2800) { const t = $('toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), ms); }
function updateTip() {
  const el = $('tip'); let s = '';
  if (save.tut < 4) {
    if (S.mode === 'idle') s = save.tut === 0 ? T('Finger aufs Wasser legen, Zielring stromauf schieben, loslassen = Wurf. Fische stehen vor, neben und hinter Steinen, in Gumpen und tiefen Rinnen.') : T('Neuer Wurf: Zielring setzen und loslassen. Mit dem Stick unten links watest du frei durch den Fluss – langsam, sonst flüchten die Fische.');
    else if (S.mode === 'drift') s = S.bite ? T('Der Sighter stoppt – nach oben wischen oder ANHIEB drücken!') : T('Finger nach unten ziehen und die Rute mit der Drift führen. Ring am Sighter grün = Kontakt, blau = zu lose, rot = du ziehst.');
    else if (S.mode === 'fight') s = T('Finger nach unten ziehen = Druck, je weiter desto mehr. Bei Fluchten nachgeben, nie ganz locker lassen. Seitlich ziehen = Seitendruck.');
  }
  if (tipGone.has(s)) s = '';
  el.textContent = s; el.classList.toggle('show', !!s);
}
const tipGone = new Set();   // weggedrückte Tipps bleiben für diese Sitzung aus
$('tip').addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); tipGone.add($('tip').textContent); updateTip(); });
function updateHUD() {
  const rv = REVIERE[save.revier], fly = curFly();
  $('rvName').textContent = rv.name;
  $('rvCond').textContent = `${CLARITY[cond.clarity]} · ${cond.light.name}` + (cond.sampled ? ` · ${INSECTS[cond.i1].name}` : '');
  $('xpfill').style.width = (save.level >= MAX_LEVEL ? 100 : save.xp / xpNeed(save.level) * 100) + '%';
  $('xptext').textContent = T('Stufe {0}', save.level);
  $('rig').innerHTML = `<b>${fly.name}</b> ×${save.flies[fly.id] || 0}<br>${fmt(save.sel.bead)} mm · ${fmt(save.sel.tippet, 2)} mm`;
  const open = rv.quests.filter(q => !save.quests[q.id]);
  $('quest').textContent = open.length ? '◦ ' + open[0].text : T('✓ Alle Aufgaben hier erfüllt');
}

let modalOpts = null;
function openModal(html, opts = {}) {
  modalOpts = opts;
  $('modalBody').innerHTML = html;
  $('modalClose').style.display = opts.lock ? 'none' : '';
  $('modal').classList.remove('hidden');
  $('modalBody').scrollTop = 0;
}
function closeModal() { $('modal').classList.add('hidden'); modalOpts = null; }
const modalOpen = () => !$('modal').classList.contains('hidden');

function showPage(key, fresh) {
  const p = PAGES.find(p => p.key === key); if (!p) return;
  const idx = REVIERE.findIndex(r => r.id === key);
  let h = `<article class="paper"><div class="date">${p.date}</div><h2>${p.title}</h2>${p.text.map(t => `<p>${t}</p>`).join('')}</article>`;
  const nextS = key === 'ende' ? REVIERE.findIndex(r => r.season === 2) : -1;
  if (fresh && nextS > 0 && save.unlocked > nextS) h += `<div class="lvl">${T('Neue Staffel freigeschaltet:')} ${T(SEASONS[1])}</div><button class="primary" data-act="goto" data-i="${nextS}" data-p="1">${T('Staffel beginnen')}</button><button class="ghost" data-act="close">${T('Hier weiterfischen')}</button>`;
  else if (fresh && idx > 0) h += `<div class="lvl">${idx > 0 && REVIERE[idx].season !== REVIERE[idx - 1].season ? T('Neue Staffel freigeschaltet:') + ' ' + T(SEASONS[REVIERE[idx].season - 1]) + '<br>' : ''}${T('Neues Revier freigeschaltet:')} ${REVIERE[idx].name}</div><button class="primary" data-act="goto" data-i="${idx}">${T('Zum Revier wandern')}</button><button class="ghost" data-act="close">${T('Hier weiterfischen')}</button>`;
  else h += `<button class="primary" data-act="close">${key === 'intro' && fresh ? T('Ans Wasser') : T('Schließen')}</button>`;
  openModal(h);
}
function showJournal(tab = 'rev') {
  let h = `<h2>${T('Tagebuch')}</h2><div class="tabs"><button data-act="jtab" data-t="rev" class="${tab === 'rev' ? 'on' : ''}">${T('Reviere & Aufgaben')}</button><button data-act="jtab" data-t="pages" class="${tab === 'pages' ? 'on' : ''}">${T('Opas Seiten')}</button></div>`;
  if (tab === 'rev') {
    REVIERE.forEach((rv, i) => {
      const locked = i >= save.unlocked, here = i === save.revier;
      if (i === 0 || rv.season !== REVIERE[i - 1].season) h += `<h3 class="season">${T(SEASONS[rv.season - 1])}</h3>`;
      h += `<div class="card ${locked ? 'locked' : ''}"><div class="row"><div><b>${locked ? '🔒 ' : ''}${rv.name}</b><div class="small">${rv.sub}</div></div>`;
      if (!locked) h += here ? `<span class="chip">${T('Du bist hier')}</span>` : `<button class="mini" data-act="goto" data-i="${i}">${T('Hier fischen')}</button>`;
      h += `</div>`;
      if (locked) h += `<div class="small">${T('Erfülle alle Aufgaben in „{0}".', REVIERE[i - 1].name)}</div>`;
      else h += `<ul class="quests">${rv.quests.map(q => `<li class="${save.quests[q.id] ? 'ok' : ''}">${save.quests[q.id] ? '✓' : '○'} ${q.text}</li>`).join('')}</ul>`;
      h += `</div>`;
    });
  } else {
    for (const key of [...save.pages].reverse()) {
      const p = PAGES.find(p => p.key === key);
      if (p) h += `<article class="paper"><div class="date">${p.date}</div><h3>${p.title}</h3>${p.text.map(t => `<p>${t}</p>`).join('')}</article>`;
    }
  }
  openModal(h);
}
function showBox() {
  let h = `<h2>${T('Fliegendose')}</h2><div class="small">${T('Bindematerial:')} <b>${save.material}</b> · ${T('eine Fliege binden kostet 2')}</div><div class="flies">`;
  for (const f of FLIES) {
    const locked = save.level < f.level, n = save.flies[f.id] || 0, sel = save.sel.fly === f.id;
    h += `<div class="fly ${sel ? 'sel' : ''} ${locked ? 'locked' : ''}"><canvas width="96" height="96" data-fly="${f.id}"></canvas><div class="fi"><b>${f.name}</b> ${locked ? `<span class="chip">${T('ab Stufe {0}', f.level)}</span>` : `<span class="chip">×${n}</span>`}
      <div class="small">${f.desc}</div><div class="small im">${T('Imitiert:')} ${f.imitates.map(i => INSECTS[i].name).join(', ')}</div>`;
    if (!locked) h += `<div class="row2"><button class="mini" data-act="selfly" data-id="${f.id}" ${n > 0 && !sel ? '' : 'disabled'}>${sel ? T('Angeknotet') : T('Anknoten')}</button><button class="mini" data-act="tie" data-id="${f.id}" ${save.material >= 2 ? '' : 'disabled'}>${T('Binden (−2)')}</button></div>`;
    h += `</div></div>`;
  }
  h += `</div><h3>${T('Tungstenperle')}</h3><div class="seg">${BEADS.map(b => `<button data-act="bead" data-v="${b.mm}" class="${save.sel.bead === b.mm ? 'on' : ''}">${fmt(b.mm)} mm</button>`).join('')}</div>
    <div class="small">${T('Schwerer = schneller am Grund, aber mehr Hänger. Faustregel: so leicht wie möglich, so schwer wie nötig.')}</div>
    <h3>${T('Vorfachspitze')}</h3><div class="seg">${TIPPETS.map(t => `<button data-act="tippet" data-v="${t.d}" class="${save.sel.tippet === t.d ? 'on' : ''}" ${save.level < t.level ? 'disabled' : ''}>${fmt(t.d, 2)}${save.level < t.level ? ' 🔒' : ''}</button>`).join('')}</div>
    <div class="small">${T('Dünner = mehr Bisse und schnelleres Absinken, reißt aber früher.')}</div>
    <button class="primary" data-act="close">${T('Zurück ans Wasser')}</button>`;
  openModal(h);
  $('modalBody').querySelectorAll('canvas[data-fly]').forEach(c => drawFly(c, FLIES.find(f => f.id === c.dataset.fly)));
}
function showLog() {
  let h = `<h2>${T('Fangbuch')}</h2><div class="small">${T('Gesamt:')} <b>${save.total}</b> ${T('Fische gefangen und zurückgesetzt')}</div>`;
  for (const id in SPECIES) {
    const sp = SPECIES[id], lg = save.log[id];
    h += `<div class="card"><canvas width="420" height="150" data-sp="${id}" data-sil="${lg ? '' : '1'}"></canvas><div class="row"><div><b>${lg ? sp.name : '???'}</b><div class="small latin">${lg ? sp.latin : T('noch nicht gefangen')}</div></div>${lg ? `<div class="rec">${lg.max} cm<div class="small">${lg.n}× ${T('gefangen')}</div></div>` : ''}</div>${lg ? `<div class="small">${sp.note}</div>` : ''}</div>`;
  }
  openModal(h);
  $('modalBody').querySelectorAll('canvas[data-sp]').forEach(c => drawFish(c, c.dataset.sp, { silhouette: !!c.dataset.sil }));
}
function showSettings() {
  const tg = (k, label, sub) => `<label class="toggle"><input type="checkbox" data-set="${k}" ${save.set[k] ? 'checked' : ''}><span><b>${label}</b><br><span class="small">${sub}</span></span></label>`;
  openModal(`<h2>${T('Einstellungen')}</h2>
    ${tg('help', T('Bisshilfe'), T('Lupe leuchtet und Handy vibriert beim Biss. Ohne Hilfe: +25 % XP.'))}
    ${tg('assist', T('Führungshilfe'), T('Die Rute folgt der Drift ein Stück von selbst; in schnellem Wasser musst du nachhelfen. Ohne: +15 % XP.'))}
    ${tg('clear', T('Klare Sicht'), T('Blendet die Spiegelung auf dem Wasser aus, damit du die Fische besser siehst. Ohne: +35 XP pro Fisch.'))}
    ${tg('gfx', T('Hohe Grafikqualität'), T('Schatten, Gras und volle Auflösung. Ausschalten, wenn es ruckelt.'))}
    ${tg('vib', T('Vibration'), T('Haptik bei Biss und Drill (nur am Handy).'))}
    ${tg('sound', T('Ton'), T('Flussrauschen und Effekte.'))}
    <h3>${T('Steuerung')}</h3>
    <p class="small">${T('<b>Handy:</b> Finger aufs Wasser, Zielring schieben, loslassen = Wurf · nach unten ziehen = Rute führen · nach oben wischen (oder ANHIEB) = anschlagen · im Drill nach unten ziehen = Druck, seitlich = Seitendruck · Stick unten links = waten · am Himmel oder Ufer ziehen = umschauen.')}</p>
    <p class="small">${T('<b>PC:</b> wie am Handy mit gedrückter Maustaste · Leertaste / Rechtsklick = Anhieb, im Drill halten = Druck · W/A/S/D = waten, im Drill A/D = Seitendruck · Rechtsklick ziehen oder Q/E = umschauen · F = Fliegendose · T = Tagebuch.')}</p>
    <button class="ghost danger" data-act="reset">${T('Spielstand löschen')}</button>
    <button class="primary" data-act="close">${T('Schließen')}</button>`);
}

$('modalBody').addEventListener('click', e => {
  const b = e.target.closest('[data-act]'); if (!b || b.disabled) return;
  const a = b.dataset.act;
  if (a === 'close') closeModal();
  else if (a === 'release') { closeModal(); const f = S.afterRelease; S.afterRelease = null; f && f(); }
  else if (a === 'goto') { closeModal(); enterRevier(+b.dataset.i); toast(REVIERE[save.revier].name + ' – ' + REVIERE[save.revier].sub); if (b.dataset.p) showPage(REVIERE[save.revier].id, false); }
  else if (a === 'jtab') showJournal(b.dataset.t);
  else if (a === 'selfly') { save.sel.fly = b.dataset.id; const f = curFly(); world.setFlyLook(f.col, f.bead); persist(); showBox(); updateHUD(); }
  else if (a === 'tie') { if (save.material >= 2) { save.material -= 2; save.flies[b.dataset.id] = (save.flies[b.dataset.id] || 0) + 1; sfx.tick(); persist(); const sc = $('modalBody').scrollTop; showBox(); $('modalBody').scrollTop = sc; updateHUD(); } }
  else if (a === 'bead') { save.sel.bead = +b.dataset.v; persist(); const sc = $('modalBody').scrollTop; showBox(); $('modalBody').scrollTop = sc; updateHUD(); }
  else if (a === 'tippet') { save.sel.tippet = +b.dataset.v; persist(); const sc = $('modalBody').scrollTop; showBox(); $('modalBody').scrollTop = sc; updateHUD(); }
  else if (a === 'reset') { if (confirm(T('Wirklich den gesamten Spielstand löschen?'))) { localStorage.removeItem(KEY); location.reload(); } }
});
$('modalBody').addEventListener('change', e => {
  const k = e.target.dataset && e.target.dataset.set; if (!k) return;
  save.set[k] = e.target.checked; if (k === 'sound') sfx.setOn(save.set.sound); if (k === 'gfx') world.setQuality(save.set.gfx); if (k === 'clear') world.setClearView(save.set.clear); persist();
});
$('modalClose').addEventListener('click', closeModal);
$('modal').addEventListener('pointerdown', e => { if (e.target === $('modal') && modalOpts && !modalOpts.lock) closeModal(); });
const canMenu = () => S.mode === 'idle' && !modalOpen();
$('btnJournal').addEventListener('click', () => canMenu() && showJournal());
$('btnBox').addEventListener('click', () => canMenu() && showBox());
$('rig').addEventListener('click', () => canMenu() && showBox());
$('btnLog').addEventListener('click', () => canMenu() && showLog());
$('btnSet').addEventListener('click', () => canMenu() && showSettings());
const joy = $('joy'), knob = $('joyKnob'); let joyId = null;
const joySet = e => {
  const r = joy.getBoundingClientRect(), Rr = r.width / 2;
  let x = (e.clientX - r.left - Rr) / Rr, y = (e.clientY - r.top - Rr) / Rr; const l = Math.hypot(x, y);
  if (l > 1) { x /= l; y /= l; }
  S.joy.x = x; S.joy.z = y; knob.style.transform = `translate(${x * Rr * 0.55}px,${y * Rr * 0.55}px)`;
};
joy.addEventListener('pointerdown', e => { e.preventDefault(); sfx.start(); joyId = e.pointerId; try { joy.setPointerCapture(e.pointerId); } catch (err) { /* */ } joySet(e); });
joy.addEventListener('pointermove', e => { if (e.pointerId === joyId) joySet(e); });
for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) joy.addEventListener(ev, () => { joyId = null; S.joy.x = S.joy.z = 0; knob.style.transform = ''; });
$('btnStone').addEventListener('click', () => canMenu() && kickSample());
$('btnRestart').addEventListener('click', () => { if (S.mode !== 'idle') return; S.yaw = 0; S.pitch = 0; enterRevier(save.revier); toast(T('Zurück am Einstieg. Die Fische stehen neu.'), 2600); });

// Anhieb / Drill
function pressDown() { sfx.start(); if (S.mode === 'fight') S.hold = true; else if (S.mode === 'drift') strike(); }
function pressUp() { S.hold = false; }
const sb = $('strike');
sb.addEventListener('pointerdown', e => { e.preventDefault(); sb.setPointerCapture?.(e.pointerId); sb.classList.add('down'); pressDown(); });
for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) sb.addEventListener(ev, () => { sb.classList.remove('down'); pressUp(); });

// Zeiger auf der Wasserfläche: zielen, Rute führen, Wisch-Anhieb, analoger Drill
const ptr = { id: null, x: 0, y: 0, ax: 0, ay: 0, hist: [], look: false };
// Umschauen: Ziehen, das nicht auf befischbarem Wasser beginnt (Himmel, Ufer, weit weg), oder Rechtsklick-Ziehen
function isLookStart(e) {
  if (S.mode !== 'idle' && S.mode !== 'landed') return false;
  if (e.button === 2) return true;
  const pt = world.screenToWater(e.clientX, e.clientY);
  return !pt || river.depthAt(pt.x, pt.z) < 0.05 || Math.hypot(pt.x - S.px, pt.z - S.pz) > 15 || pt.z < Z_MIN - 6 || pt.z > Z_MAX + 20;
}
function aimAt(cx, cy) { const pt = world.screenToWater(cx, cy); S.aim = pt ? castTarget(pt) : null; }
canvas.addEventListener('pointerdown', e => {
  sfx.start();
  if (modalOpen() || S.mode === 'title') return;
  const lk = isLookStart(e);
  if (e.button === 2 && !lk) return;
  if (ptr.id !== null) { if (S.mode === 'drift') strike(); return; }
  ptr.id = e.pointerId; ptr.x = ptr.ax = e.clientX; ptr.y = ptr.ay = e.clientY; ptr.hist.length = 0;
  try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* */ }
  ptr.look = lk;
  if (!lk && S.mode === 'idle' && !S.wade) aimAt(e.clientX, e.clientY);
});
canvas.addEventListener('pointermove', e => {
  if (e.pointerId !== ptr.id) return;
  const dx = e.clientX - ptr.x, dy = e.clientY - ptr.y; ptr.x = e.clientX; ptr.y = e.clientY;
  if (ptr.look) {
    const k = 3.2 / Math.min(window.innerWidth, 900), sg = e.pointerType === 'mouse' ? -1 : 1;   // Finger schiebt die Szene, Maus dreht den Blick
    S.yaw += dx * k * sg; S.pitch = clamp(S.pitch + dy * k * 0.7 * sg, -0.12, 0.55);
  }
  else if (S.mode === 'idle') { if (!S.wade) aimAt(e.clientX, e.clientY); }
  else if (S.mode === 'drift') {
    const K = 3.6 / (Math.min(window.innerHeight, 900) * 0.42);
    const c = Math.cos(S.yaw + S.yb), sn = Math.sin(S.yaw + S.yb);
    S.tip.x += (dx * c + dy * sn) * K; S.tip.z += (-dx * sn + dy * c) * K;
    const now = performance.now(), hs = ptr.hist;
    hs.push({ t: now, x: e.clientX, y: e.clientY });
    while (hs.length && now - hs[0].t > 150) hs.shift();
    const up = hs[0].y - e.clientY;
    if (up > Math.max(46, window.innerHeight * 0.065) && up > Math.abs(hs[0].x - e.clientX) * 1.3) { hs.length = 0; strike(); }
  } else if (S.mode === 'fight') {
    if (e.clientY < ptr.ay) ptr.ay = e.clientY;
    S.press = clamp((e.clientY - ptr.ay) / (window.innerHeight * 0.17), 0, 1);
    S.rodX = clamp((e.clientX - ptr.ax) / (window.innerWidth * 0.24), -1, 1) * 1.9;
  }
});
const ptrEnd = e => {
  if (e.pointerId !== ptr.id) return;
  ptr.id = null; S.press = 0;
  if (ptr.look) { ptr.look = false; return; }
  const a = S.aim; S.aim = null;
  if (S.mode === 'idle' && a && e.type === 'pointerup') { if (a.ok) doCast({ x: a.tx, z: a.tz }); else toast(T('Dort ist kein Wasser.')); }
};
canvas.addEventListener('pointerup', ptrEnd);
canvas.addEventListener('pointercancel', ptrEnd);
canvas.addEventListener('contextmenu', e => { e.preventDefault(); if (S.mode === 'drift') strike(); });
window.addEventListener('keydown', e => {
  if (e.repeat) return;
  if (e.code === 'Escape' && modalOpen() && modalOpts && !modalOpts.lock) return closeModal();
  if (modalOpen() || S.mode === 'title') return;
  if (e.code === 'Space') { e.preventDefault(); pressDown(); }
  else if (KEYMAP[e.code]) { const k = KEYMAP[e.code]; K[k] = 1; if (S.mode === 'fight') { if (k === 'left') S.rodX = -1.6; if (k === 'right') S.rodX = 1.6; } }
  else if (e.code === 'KeyF') canMenu() && showBox();
  else if (e.code === 'KeyT') canMenu() && showJournal();
});
window.addEventListener('keyup', e => { if (e.code === 'Space') pressUp(); if (KEYMAP[e.code]) K[KEYMAP[e.code]] = 0; });
window.addEventListener('blur', () => { K.up = K.down = K.left = K.right = 0; });

// ---------- Anzeigen ----------
const lupe = $('lupe'), lc = lupe.getContext('2d');
function drawLupe() {
  const W = 220, wy = 150, c = lc;
  c.clearRect(0, 0, W, W);
  c.save(); c.beginPath(); c.arc(110, 110, 108, 0, 7); c.clip();
  const g = c.createLinearGradient(0, 0, 0, wy); g.addColorStop(0, '#9fc7c0'); g.addColorStop(1, '#5e9488');
  c.fillStyle = g; c.fillRect(0, 0, W, wy);
  c.fillStyle = '#1c5f58'; c.fillRect(0, wy, W, W - wy);
  c.strokeStyle = 'rgba(255,255,255,.35)'; c.lineWidth = 2;
  for (let i = 0; i < 4; i++) { const x = ((S.t * 40 + i * 70) % 300) - 40; c.beginPath(); c.moveTo(x, wy + 4 + i * 14); c.lineTo(x + 26, wy + 4 + i * 14); c.stroke(); }
  const drift = S.mode === 'drift', TP = tip3(), n = S.nymph;
  const a = drift ? clamp((TP.z - n.z) / 4, -1, 1) : 0;
  const slack = drift ? clamp((0.97 - S.s) / 0.2, 0, 1) : (S.mode === 'fight' ? 0 : 0.5);
  const kick = S.mode === 'fight' ? 1 : S.kick;
  const jit = kick > 0.05 ? Math.sin(S.t * 70) * kick * 3 : 0;
  const x0 = 118 + a * 34 + jit, xe = 104 - a * 40;
  const off = kick * 0.24;
  const P = t => ({ x: x0 + (xe - x0) * t + Math.sin(Math.PI * t) * slack * 34, y: -12 + (wy + 12) * t });
  const seg = (t0, t1, col, lw) => {
    c.beginPath(); for (let i = 0; i <= 8; i++) { const p = P(clamp(t0 + (t1 - t0) * i / 8, 0, 1.25)); i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y); }
    c.strokeStyle = col; c.lineWidth = lw; c.lineCap = 'butt'; c.stroke();
  };
  seg(0, 1.25, 'rgba(240,240,220,.8)', 2);
  seg(0.28 + off, 0.5 + off, '#ff2f7a', 8); seg(0.5 + off, 0.72 + off, '#f8e71c', 8); seg(0.72 + off, 0.92 + off, '#ff2f7a', 8);
  c.fillStyle = 'rgba(28,95,88,.72)'; c.fillRect(0, wy, W, W - wy);
  c.strokeStyle = 'rgba(255,255,255,.6)'; c.lineWidth = 2; c.beginPath(); c.arc(xe, wy, 6 + kick * 8, Math.PI, 0); c.stroke();
  c.restore();
}
function updateGauges() {
  const drift = S.mode === 'drift';
  $('btnRestart').classList.toggle('show', S.mode === 'idle' && S.pz < Z_MIN + 4 && !modalOpen());
  $('read').classList.toggle('off', !drift);
  $('gauge').classList.toggle('off', !drift);
  $('strike').classList.toggle('off', !drift && S.mode !== 'fight');
  $('gMark').style.left = (50 + (drift ? S.g : 0) * 46) + '%';
  $('gauge').classList.toggle('bad', drift && Math.abs(S.g) > 0.4);
  const bottom = drift ? Math.max(0.06, river.depthAt(S.nymph.x, S.nymph.z)) : 1;
  const fr = drift ? clamp(S.nymph.d / bottom, 0, 1) : 0;
  const dot = $('depthDot'); dot.style.top = (fr * 92) + '%';
  dot.className = S.onBottom && drift ? 'bottom' : (fr > 0.68 ? 'zone' : '');
  $('depthTxt').textContent = drift ? fmt(bottom) + ' m' : '';
  if (S.fight) {
    const F = S.fight, lim = curTippet().limit;
    $('tFill').style.width = clamp(F.ten, 0, 1) * 100 + '%';
    $('tFill').className = F.ten > lim ? 'red' : F.ten < 0.16 ? 'low' : F.ten > lim - 0.12 ? 'warn' : '';
    $('tLimit').style.left = lim * 100 + '%';
    $('sFill').style.width = clamp(F.stam, 0, 1) * 100 + '%';
    // Pfeil statt Text: im Drill schaut man auf den Fisch, nicht auf Wörter
    const dir = F.landing > 0 ? '' : F.jump > 0 ? 'up' : (F.p || 0) < 0.08 ? 'down' : F.side > 0 ? 'right' : 'left';
    $('fightArrow').className = dir + (F.good && (dir === 'left' || dir === 'right') ? ' good' : '');
  }
}

// ---------- Hauptschleife ----------
let last = performance.now();
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  S.t += dt;
  const paused = modalOpen() && S.mode !== 'landed' && S.mode !== 'title';
  if (!paused) {
    S.walk = 0; updateMove(dt);
    if (S.mode === 'cast') updateCast(dt);
    else if (S.mode === 'drift') updateDrift(dt);
    else if (S.mode === 'fight') updateFight(dt);
    for (const f of fish) {
      if (f.wary > 0) f.wary -= dt;
      if (f.spooked > 0) { f.spooked -= dt; f.mesh.visible = false; if (f.spooked <= 0) { f.mesh.visible = true; placeFish(f); } continue; }
      if (S.fight && S.fight.f === f) continue;
      f.mesh.visible = true;
      f.mesh.rotation.y = (f.ry || 0) + Math.sin(S.t * 0.9 + f.phase) * 0.1;
      f.mesh.position.x = f.x + Math.sin(S.t * 0.7 + f.phase) * 0.12;
      if (Math.abs(f.z - S.pz) < 14) world.animFish(f.mesh, S.t * 5 + f.phase, 1);
    }
    for (const r of respawn) r.t -= dt;
    const due = respawn.filter(r => r.t <= 0 && Math.abs(r.lie.z - S.pz) > 7);
    for (const r of due) { fish.push(makeFish(r.lie)); respawn.splice(respawn.indexOf(r), 1); }
  }
  // Blickrichtung des Anglers
  let look = null;
  if (S.mode === 'fight') look = fightPos();
  else if (S.mode === 'drift') look = S.nymph;
  else if (S.mode === 'cast') look = { x: S.cast.tx, z: S.cast.tz };
  else if (S.aim) look = { x: S.aim.tx, z: S.aim.tz };
  let ft = 0;
  if (S.walk > 0.1 && S.mode === 'idle') ft = S.moveDir;
  else if (look) ft = clamp(Math.atan2(-(look.x - S.px), -(look.z - S.pz)), -1.0, 1.0) * 0.8;
  const fd = ((ft - S.face + Math.PI * 3) % (Math.PI * 2)) - Math.PI, hOld = hand();
  S.face += fd * Math.min(1, dt * (S.walk > 0.1 ? 6 : 3.5));
  if (S.mode === 'idle' || S.mode === 'title' || S.mode === 'landed') { if (Math.abs(fd) > 0.002 || S.walk > 0) restTip(); }
  else { const hn = hand(); S.tip.x += hn.x - hOld.x; S.tip.z += hn.z - hOld.z; }
  world.poseAngler(dt, S.t, { px: S.px, pz: S.pz, gy: groundY(), face: S.face, walk: S.mode === 'idle' ? S.walk : 0, ten: S.fight ? S.fight.ten : 0, look, fight: S.mode === 'fight', track: S.mode === 'cast' || S.mode === 'drift' });
  world._fightGrip = S.mode === 'fight';
  // Rute & Schnur
  const h = hand(), TP = tip3();
  if (S.strikeT > 0) { S.strikeT -= dt; TP.y += 0.5; }
  let target, s = 1, bend = 0.04, focus = null;
  if (S.mode === 'cast') {
    const c = S.cast, k = Math.min(1, c.t);
    target = { x: c.fx + (c.tx - c.fx) * k, y: c.fy + (0 - c.fy) * k + Math.sin(Math.PI * k) * 1.6, z: c.fz + (c.tz - c.fz) * k }; bend = 0.25 * (1 - k);
    const w = Math.sin(Math.PI * Math.min(1, k * 1.5)) * 0.75;   // Wurfbewegung: Rute schwingt zurück und nach vorn
    TP.x += (h.x + Math.sin(S.face) * 0.5 - TP.x) * w; TP.z += (h.z + Math.cos(S.face) * 0.5 - TP.z) * w; TP.y += (h.y + 2.95 - TP.y) * w;
  } else if (S.mode === 'drift') {
    target = { x: S.nymph.x, y: -S.nymph.d, z: S.nymph.z }; s = S.s; bend = 0.05 + Math.min(0.35, S.pullS * 0.3) + (S.bite || S.snag ? 0.25 : 0);
    focus = target;
  } else if (S.mode === 'fight') {
    const p = fightPos(); target = { x: p.x, y: -0.05, z: p.z }; bend = clamp(S.fight.ten, 0.1, 1); focus = p;
  } else {
    target = { x: TP.x + Math.sin(S.t * 1.3) * 0.06, y: Math.max(0.25, TP.y - 1.9), z: TP.z + 0.15 + Math.cos(S.t * 1.1) * 0.05 };
  }
  world.setRig(h, TP, target, s, bend);
  world.setAim(S.mode === 'idle' ? S.aim : null);
  if (S.mode === 'drift') {
    const k = TP.y / (TP.y + S.nymph.d + 1e-4);
    world.setEntry(TP.x + (S.nymph.x - TP.x) * k, TP.z + (S.nymph.z - TP.z) * k, S.bite && save.set.help ? 'bite' : Math.abs(S.g) < 0.4 ? 'ok' : S.g < 0 ? 'slack' : 'drag');
  } else world.setEntry(0, 0, null);
  S.yaw += (K.tl - K.tr) * 1.7 * dt;
  if (S.mode === 'fight') {   // im Drill dreht die Kamera zurück stromauf – links/rechts muss stimmen
    S.yaw = ((S.yaw + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
    const k = Math.min(1, dt * 4); S.yaw -= S.yaw * k; S.pitch -= S.pitch * k;
    if (Math.abs(S.yaw) < 0.002) S.yaw = 0;
  }
  S.yb += (Math.atan(river.dcx(S.pz)) * 0.85 - S.yb) * Math.min(1, dt * 2);   // Grundblick folgt dem Flusslauf
  world.yaw = S.yaw + S.yb; world.pitch = S.pitch;
  world.update(dt, S.t, S.px, S.pz, groundY(), focus);
  if (S.mode !== 'title') { drawLupe(); updateGauges(); }
}

// ---------- Start ----------
function startGame(fresh) {
  sfx.start();
  if (fresh) { save = newSave(); sfx.on = true; }
  const isNew = !save.started;
  save.started = true;
  $('title').classList.add('hidden'); $('hud').classList.remove('hidden');
  S.mode = 'idle';
  enterRevier(Math.min(save.revier, save.unlocked - 1));
  if (isNew) showPage('intro', true);
}
$('btnStart').addEventListener('click', () => startGame(false));
$('btnNew').addEventListener('click', () => { if (!save.started || confirm(T('Neues Spiel beginnen? Der alte Spielstand geht verloren.'))) startGame(true); });
// ---------- Sprache ----------
function applyLang() {
  const set = (sel, de, i = 0) => { const el = document.querySelectorAll(sel)[i]; if (el) el.textContent = T(de); };
  set('.tbox .pre', 'Ein Euro-Nymphing-Abenteuer'); set('.tbox .sub', 'Das Erbe der Smaragda');
  set('.tbox p', 'Opas Rute. Opas Fliegendose. Fünf Strecken eines smaragdgrünen Flusses – und ein Fisch, den er nie landen konnte.');
  set('#btnStart', save.started ? 'Weiterfischen' : 'Ans Wasser'); set('#btnNew', 'Neues Spiel');
  set('#gauge .l', 'lose'); set('#gauge .c', 'Kontakt'); set('#gauge .r', 'Zug');
  set('#fightUI .lab', 'Schnurspannung', 0); set('#fightUI .lab', 'Kraft des Fisches', 1);
  set('#btnRestart', '↺ Strecke von vorn beginnen'); set('#joy small', 'waten'); set('#btnStone small', 'Stein');
  set('#strike', S.mode === 'fight' ? 'DRILL' : 'ANHIEB');
  document.title = 'Nymphmaniac – ' + T('Das Erbe der Smaragda');
  for (const v of Object.values(SPECIES)) loc(v, 'name', 'note');
  for (const v of Object.values(INSECTS)) loc(v, 'name', 'hint');
  for (const f of FLIES) loc(f, 'name', 'desc');
  for (const l of LIGHTS) loc(l, 'name');
  for (const r of REVIERE) { loc(r, 'name', 'sub'); for (const q of r.quests) loc(q, 'text'); }
  for (const pg of PAGES) loc(pg, 'title', 'date', 'text');
  if (!applyLang.de) applyLang.de = { cl: [...CLARITY], lu: { ...LEVEL_UNLOCKS } };
  applyLang.de.cl.forEach((x, i) => { CLARITY[i] = T(x); });
  for (const k in applyLang.de.lu) LEVEL_UNLOCKS[k] = T(applyLang.de.lu[k]);
  for (const b of document.querySelectorAll('#langs button')) b.classList.toggle('on', b.dataset.lang === getLang());
  if (river) { updateHUD(); updateTip(); }
}
$('langs').innerHTML = LANGS.map(([id, name]) => `<button data-lang="${id}">${name}</button>`).join('');
$('langs').addEventListener('click', e => { const b = e.target.closest('[data-lang]'); if (b) { setLang(b.dataset.lang); applyLang(); } });
// Spielstaende von vor den neuen Staffeln: abgeschlossene Reviere schalten das naechste frei
(function migrate() {
  let ch = false;
  while (save.unlocked < REVIERE.length && REVIERE[save.unlocked - 1].quests.every(q => save.quests[q.id])) {
    const id = REVIERE[save.unlocked].id; save.unlocked++; ch = true;
    if (!save.pages.includes(id)) save.pages.push(id);
  }
  if (ch) persist();
})();
setLang(getLang()); applyLang();

enterRevier(Math.min(save.revier, save.unlocked - 1));
requestAnimationFrame(frame);
window.__nm = { S, world, get save() { return save; }, get fish() { return fish; }, get river() { return river; }, get cond() { return cond; }, doCast, strike, startFight, landed, enterRevier, hand };
