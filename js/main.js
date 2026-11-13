// Nymphmaniac – Spiellogik: Wurf, Drift, Biss, Drill, Fortschritt, UI
import { World } from './world.js';
import { SPECIES, FLIES, INSECTS, REVIERE, PAGES, BEADS, TIPPETS, LEVEL_UNLOCKS, MAX_LEVEL, xpNeed, CLARITY, LIGHTS } from './data.js';
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
    unlocked: 1, revier: 0, quests: {}, log: {}, stats: {}, pages: ['intro'], tut: 0, set: { help: true, vib: true, sound: true, assist: true, gfx: true }, total: 0, started: false };
}
let save;
try { save = JSON.parse(localStorage.getItem(KEY)); } catch (e) { save = null; }
if (!save || !save.sel) save = newSave();
save.set = Object.assign({ help: true, vib: true, sound: true, assist: true, gfx: true }, save.set);
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
let river, cond, fish = [], respawn = [];
const S = {
  mode: 'title', px: LANE_X, pz: 0, t: 0, joy: { x: 0, z: 0 }, face: 0, walk: 0, moveDir: 0, tip: { x: LANE_X - 0.6, z: -1.6 }, nymph: { x: 0, d: 0, z: 0 }, L: 4, s: 1, pullS: 0, g: 0, q: 1,
  kick: 0, driftT: 0, onBottom: false, tickT: 0, bite: null, snag: false, snagT: 0, fight: null, hold: false, wade: null,
  cast: null, maxFrac: 0, swingT: 0, sinkRate: 0.2, snagHint: false, aim: null, press: 0, rodX: -0.5,
};
const groundY = () => 0.56 - clamp(river ? river.depthAt(S.px, S.pz) : 0.56, 0.22, 1.05);
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
function placeFish(f) { f.mesh.position.set(f.x, -Math.max(0.2, river.depthAt(f.x, f.z) - 0.12), f.z); f.mesh.rotation.set(0, 0, 0); }
function checkOld(announce) {
  const rv = REVIERE[save.revier];
  if (rv.id !== 'gumpen' || !save.quests.g1 || !save.quests.g2 || fish.some(f => f.old)) return;
  const lie = river.lies.find(l => l.big);
  if (!lie) return;
  fish.push(makeFish(lie, true));
  if (announce) setTimeout(() => toast('Im tiefsten Teil des Gumpens bewegt sich ein großer Schatten …', 5000), 1500);
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
  if (!(save.flies[fly.id] > 0)) { toast('Keine ' + fly.name + ' mehr – öffne die Fliegendose.'); return; }
  const h = hand(), ct = castTarget(pt);
  if (!ct) return;
  if (!ct.ok) { toast('Dort ist kein Wasser.'); return; }
  const { tx, tz, dx, dz } = ct;
  const l = Math.hypot(dx, dz);
  S.tip.x = h.x + dx / l * 2.6; S.tip.z = h.z + dz / l * 2.6;
  const T = tip3();
  S.cast = { t: 0, fx: T.x, fy: T.y - 1.2, fz: T.z + 0.6, tx, tz };
  S.mode = 'cast';
  sfx.whip();
}
function updateCast(dt) {
  const c = S.cast; c.t += dt / 0.6;
  if (c.t >= 1) {
    const n = S.nymph; n.x = c.tx; n.z = c.tz; n.d = 0.02;
    const T = tip3();
    S.L = Math.hypot(T.x - n.x, T.y, T.z - n.z) * 1.07;
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
  const T = tip3();
  const held = S.snag || S.bite;
  if (!held) {
    const frac = Math.min(1, n.d / bottom);
    let vz = Math.max(0.16, v * (1 - 0.5 * frac)); if (S.onBottom) vz *= 0.75;
    n.z += vz * dt;
    for (const k of river.rocks) {
      const dx = n.x - k.x, dz = n.z - k.z, d = Math.hypot(dx, dz);
      if (d < k.r * 0.95) n.x += (dx >= 0 ? 1 : -1) * (k.r * 0.95 - d);
    }
  }
  let pull = 0;
  const constrain = count => {
    const dx = T.x - n.x, dy = T.y + n.d, dz = T.z - n.z, d = Math.hypot(dx, dy, dz);
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
    n.d = Math.min(bottom, n.d + S.sinkRate / (1 + 0.9 * v) * dt);
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
    if (S.snagT > 1.6 && !S.snagHint) { S.snagHint = true; toast('Hänger! ANHIEB drücken, um die Nymphe zu lösen.', 3500); }
    return;
  }
  if (S.bite) {
    const b = S.bite; b.t += dt; S.kick += (1 - S.kick) * Math.min(1, dt * 22);
    if (b.t > b.win) {
      b.fish.wary = 22; S.bite = null; $('lupeWrap').classList.remove('bite');
      toast(save.set.help ? 'Biss verpasst! Wenn der Sighter stoppt oder abtaucht: sofort ANHIEB.' : 'Da war etwas …');
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
    if (S.maxFrac < 0.62 && S.driftT > 2) toast('Die Nymphe kam nicht auf Tiefe. Schwerere Perle wählen oder weiter stromauf einwerfen.', 4200);
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
    if (other) { save.sel.fly = other.id; msg += ' Neue Fliege: ' + other.name + '.'; world.setFlyLook(other.col, other.bead); }
    else if (save.material < 2) { save.flies.pt = 2; save.sel.fly = 'pt'; msg += ' In der Westentasche findest du noch zwei Pheasant Tails von Opa.'; }
    else msg += ' Binde dir neue in der Fliegendose.';
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
      f.wary = 20; toast('Zu viel lose Schnur – der Anhieb kam nicht durch.'); endDrift(true); return;
    }
    startFight(f); return;
  }
  if (S.snag) {
    const lose = Math.random() < 0.16 + (save.sel.tippet <= 0.12 ? 0.14 : 0);
    if (lose) loseFly('Abriss am Hänger – Fliege verloren.'); else toast('Hänger gelöst.');
    endDrift(true); return;
  }
  const n = S.nymph;
  for (const f of fish) if ((f.x - n.x) ** 2 + (f.z - n.z) ** 2 < 2.5) f.wary = Math.max(f.wary, 7);
  if (S.kick > 0.15) toast('Nur ein Grundkontakt. Ticks sind kurz – ein Biss hält den Sighter fest.');
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
  $('hud').classList.add('fighting'); $('strike').textContent = 'DRILL';
  toast(f.old ? 'Die Rute biegt sich bis ins Handteil. DAS IST ER!' : 'Fisch hängt!', 1800);
  updateTip();
}
function fightPos() { const F = S.fight, w = river.halfW - 0.9; return { x: clamp(S.px - Math.sin(F.ang) * F.dist, -w, w), z: S.pz - Math.cos(F.ang) * F.dist }; }
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
      if (F.jumpT <= 0 && F.jump <= 0 && F.stam > 0.25) { F.jump = 0.7; F.jumpT = 4 + Math.random() * 5; world.splash(p.x, p.z, 1.4); sfx.splash(); toast('Sie springt – Druck raus!', 1200); }
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
    if (F.stam <= 0) { F.landing = 0.001; toast('Kescher!', 1200); }
  }
  p = fightPos();
  const jy = F.jump > 0 ? Math.sin((0.7 - F.jump) / 0.7 * Math.PI) * 0.9 : 0;
  f.mesh.visible = true;
  f.mesh.position.set(p.x, jy > 0 ? jy : -0.12, p.z);
  f.mesh.rotation.y = F.ang + F.side * 0.9;
  f.mesh.rotation.x = jy > 0 ? -0.6 : 0; f.mesh.rotation.z = jy > 0 ? 0.5 : Math.sin(S.t * 3) * 0.5 * (1 - F.stam);
  world.animFish(f.mesh, S.t * (10 + F.surge * 14) + f.phase, 1.2 + F.surge * 2);
}
function endFightUI() { $('hud').classList.remove('fighting'); $('strike').textContent = 'ANHIEB'; S.hold = false; S.press = 0; S.fight = null; }
function lostFish(kind) {
  const f = S.fight.f;
  endFightUI();
  f.spooked = 80; f.mesh.visible = false; placeFish(f);
  if (kind === 'snap') loseFly('Vorfach gerissen! Bei Fluchten den Druck rausnehmen.');
  else if (kind === 'jump') { toast('Im Sprung ausgehakt. Beim Sprung nicht gegenhalten!', 3500); sfx.snap(); }
  else { toast('Ausgeschlitzt – zu wenig Spannung. Schonhaken verzeihen keine lose Schnur.', 3800); sfx.snap(); }
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
  if (f.lie.type === 'Tasche') st.pocket++;
  if (save.sel.bead >= 3.5) st.heavy++;
  if (save.sel.tippet <= 0.12) st.fine++;
  if (f.len >= 42) st.big42++;
  if (f.old) st.old++;
  const lg = save.log[f.species] || (save.log[f.species] = { n: 0, max: 0 });
  const rec = f.len > lg.max && lg.n > 0, first = lg.n === 0;
  lg.n++; lg.max = Math.max(lg.max, f.len); save.total++;
  let xp = Math.round(f.len * sp.xp * (save.set.help ? 1 : 1.25) * (save.set.assist ? 1 : 1.15)) + (f.old ? 300 : 0);
  const mat = 1 + (f.len > 35 ? 1 : 0) + (f.len > 50 ? 1 : 0);
  save.material += mat;
  const done = [];
  for (const q of rv.quests) if (!save.quests[q.id] && q.test(st)) { save.quests[q.id] = true; done.push(q.text); xp += 60; }
  const ups = addXP(xp);
  let newPage = null;
  const i = save.revier;
  if (rv.quests.every(q => save.quests[q.id])) {
    if (i + 1 < REVIERE.length && save.unlocked < i + 2) { save.unlocked = i + 2; newPage = REVIERE[i + 1].id; }
  }
  if (f.old && !save.pages.includes('ende')) newPage = 'ende';
  if (newPage && !save.pages.includes(newPage)) save.pages.push(newPage);
  if (save.tut < 4) save.tut = 4;
  world.removeFish(f.mesh); fish = fish.filter(x => x !== f);
  if (!f.old) respawn.push({ lie: f.lie, t: 100 });
  world.setPolar(save.level >= 2);
  persist();
  if (f.old) sfx.fanfare(); else sfx.chime();
  vibrate([40, 60, 40, 60, 120]);

  let h = `<div class="catch"><div class="kicker">${f.old ? 'Der Alte vom Smaragdgumpen' : first ? 'Neue Art im Fangbuch!' : rec ? 'Neuer persönlicher Rekord!' : 'Gefangen'}</div>
    <canvas id="catchCv" width="640" height="260"></canvas>
    <h2>${sp.name}</h2><div class="latin">${sp.latin}</div>
    <div class="big">${f.len} cm <span>· ${w >= 1000 ? fmt(w / 1000, 2) + ' kg' : w + ' g'}</span></div>
    <div class="meta">${fly.name} · ${fmt(save.sel.bead)} mm · ${fmt(save.sel.tippet, 2)} mm · ${f.lie.type}</div>
    <div class="chips"><span class="chip xp">+${xp} XP</span><span class="chip">+${mat} Bindematerial</span></div>`;
  for (const q of done) h += `<div class="qdone">✓ Aufgabe erfüllt: ${q}</div>`;
  for (const l of ups) h += `<div class="lvl">Stufe ${l}!${LEVEL_UNLOCKS[l] ? ' Neu: ' + LEVEL_UNLOCKS[l] : ''}</div>`;
  h += `<button class="primary" data-act="release">Zurücksetzen</button></div>`;
  openModal(h, { lock: true });
  drawFish($('catchCv'), f.species, { seed: f.len * 13 + 1 });
  S.afterRelease = () => {
    S.mode = 'idle'; restTip(); updateHUD(); updateTip();
    world.splash(S.px - 0.6, S.pz - 0.6, 1); sfx.plop();
    checkOld(true);
    if (newPage) showPage(newPage, true);
    else toast(pick(['Sie schwimmt davon.', 'Zurück im Fluss.', 'Petri Heil!', 'Ein Schwanzschlag – weg ist sie.']));
  };
}

// ---------- Waten & Stein ----------
const K = { up: 0, down: 0, left: 0, right: 0 };
const KEYMAP = { KeyW: 'up', ArrowUp: 'up', KeyS: 'down', ArrowDown: 'down', KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right' };
let moveMsgT = 0;
function updateMove(dt) {
  moveMsgT -= dt;
  if (S.mode !== 'idle' || modalOpen()) return;
  let mx = S.joy.x + (K.right - K.left), mz = S.joy.z + (K.down - K.up);
  const ml = Math.hypot(mx, mz);
  if (ml < 0.12) return;
  if (ml > 1) { mx /= ml; mz /= ml; }
  const f = Math.min(1, ml), sp = 1.3 * (1 - 0.42 * Math.min(1, river.depthAt(S.px, S.pz))) * dt;
  const ok = (x, z) => {
    const d = river.depthAt(x, z);
    if (d < 0.14 || d > 1.05 || z < Z_MIN || z > Z_MAX) return false;
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
    toast(tz < Z_MIN ? 'Hier endet die Strecke – weiter oben ist Schongebiet.' : tz > Z_MAX ? 'Weiter unten ist die Brücke. Fisch stromauf!' : d > 1 ? 'Zu tief zum Waten.' : d < 0.14 ? 'Bleib im Wasser.' : 'Da liegt ein Fels im Weg.');
  }
  if (ox === S.px && oz === S.pz) return;
  S.walk = f; S.moveDir = Math.atan2(-(S.px - ox), -(S.pz - oz));
  S.aim = null;
  if (Math.random() < dt * 6 * f) world.splash(S.px + (Math.random() - 0.5) * 0.3, S.pz + 0.1, 0.3 + f * 0.25);
  const rad = 1.5 + 1.3 * f; let spk = 0;
  for (const fi of fish) {
    const d = Math.hypot(fi.x - S.px, fi.z - S.pz);
    if (d < rad && fi.spooked <= 0) { fi.spooked = 70; spk++; } else if (d < rad + 2.5) fi.wary = Math.max(fi.wary, 5);
  }
  if (spk) toast('Fisch vergrämt! Langsam waten und Abstand zu den Standplätzen halten.', 3800);
  if (save.tut === 0 || save.tut === 1) { /* Tipp bleibt */ }
}
function kickSample() {
  if (S.mode !== 'idle') return;
  cond.sampled = true;
  const a = INSECTS[cond.i1], b = INSECTS[cond.i2];
  const good = FLIES.filter(f => f.imitates.includes(cond.i1)).map(f => f.name + (save.level >= f.level ? '' : ' 🔒')).join(', ');
  openModal(`<h2>Stein umgedreht</h2>
    <p>Du hebst einen faustgroßen Stein aus der Strömung und drehst ihn um.</p>
    <div class="sample"><b>Massenhaft ${a.name}</b><br><i>${a.hint}</i></div>
    <div class="sample minor"><b>Vereinzelt ${b.name}</b><br><i>${b.hint}</i></div>
    <p>Passende Muster: <b>${good}</b></p>
    <p class="small">Wasser: ${CLARITY[cond.clarity]}. ${cond.clarity > 0 ? 'Bei angetrübtem Wasser dürfen Fliegen auffälliger sein (Hotspot).' : 'Bei klarem Wasser lieber natürlich und fein fischen.'}</p>
    <button class="primary" data-act="close">Stein zurücklegen</button>`);
  updateHUD();
}

// ---------- UI ----------
let toastT = 0;
function toast(msg, ms = 2800) { const t = $('toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), ms); }
function updateTip() {
  const el = $('tip'); let s = '';
  if (save.tut < 4) {
    if (S.mode === 'idle') s = save.tut === 0 ? 'Finger aufs Wasser legen, Zielring stromauf schieben, loslassen = Wurf. Fische stehen hinter Steinen und in tiefen Rinnen.' : 'Neuer Wurf: Zielring setzen und loslassen. Mit dem Stick unten links watest du frei durch den Fluss – langsam, sonst flüchten die Fische.';
    else if (S.mode === 'drift') s = S.bite ? 'Der Sighter stoppt – nach oben wischen oder ANHIEB drücken!' : 'Finger nach unten ziehen und die Rute mit der Drift führen. Ring am Sighter grün = Kontakt, blau = zu lose, rot = du ziehst.';
    else if (S.mode === 'fight') s = 'Finger nach unten ziehen = Druck, je weiter desto mehr. Bei Fluchten nachgeben, nie ganz locker lassen. Seitlich ziehen = Seitendruck.';
  }
  el.textContent = s; el.classList.toggle('show', !!s);
}
function updateHUD() {
  const rv = REVIERE[save.revier], fly = curFly();
  $('rvName').textContent = rv.name;
  $('rvCond').textContent = `${CLARITY[cond.clarity]} · ${cond.light.name}` + (cond.sampled ? ` · ${INSECTS[cond.i1].name}` : '');
  $('xpfill').style.width = (save.level >= MAX_LEVEL ? 100 : save.xp / xpNeed(save.level) * 100) + '%';
  $('xptext').textContent = 'Stufe ' + save.level;
  $('rig').innerHTML = `<b>${fly.name}</b> ×${save.flies[fly.id] || 0}<br>${fmt(save.sel.bead)} mm · ${fmt(save.sel.tippet, 2)} mm`;
  const open = rv.quests.filter(q => !save.quests[q.id]);
  $('quest').textContent = open.length ? '◦ ' + open[0].text : '✓ Alle Aufgaben hier erfüllt';
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
  if (fresh && idx > 0) h += `<div class="lvl">Neues Revier freigeschaltet: ${REVIERE[idx].name}</div><button class="primary" data-act="goto" data-i="${idx}">Zum Revier wandern</button><button class="ghost" data-act="close">Hier weiterfischen</button>`;
  else h += `<button class="primary" data-act="close">${key === 'intro' && fresh ? 'Ans Wasser' : 'Schließen'}</button>`;
  openModal(h);
}
function showJournal(tab = 'rev') {
  let h = `<h2>Tagebuch</h2><div class="tabs"><button data-act="jtab" data-t="rev" class="${tab === 'rev' ? 'on' : ''}">Reviere & Aufgaben</button><button data-act="jtab" data-t="pages" class="${tab === 'pages' ? 'on' : ''}">Opas Seiten</button></div>`;
  if (tab === 'rev') {
    REVIERE.forEach((rv, i) => {
      const locked = i >= save.unlocked, here = i === save.revier;
      h += `<div class="card ${locked ? 'locked' : ''}"><div class="row"><div><b>${locked ? '🔒 ' : ''}${rv.name}</b><div class="small">${rv.sub}</div></div>`;
      if (!locked) h += here ? `<span class="chip">Du bist hier</span>` : `<button class="mini" data-act="goto" data-i="${i}">Hier fischen</button>`;
      h += `</div>`;
      if (locked) h += `<div class="small">Erfülle alle Aufgaben in „${REVIERE[i - 1].name}".</div>`;
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
  let h = `<h2>Fliegendose</h2><div class="small">Bindematerial: <b>${save.material}</b> · eine Fliege binden kostet 2</div><div class="flies">`;
  for (const f of FLIES) {
    const locked = save.level < f.level, n = save.flies[f.id] || 0, sel = save.sel.fly === f.id;
    h += `<div class="fly ${sel ? 'sel' : ''} ${locked ? 'locked' : ''}"><canvas width="96" height="96" data-fly="${f.id}"></canvas><div class="fi"><b>${f.name}</b> ${locked ? `<span class="chip">ab Stufe ${f.level}</span>` : `<span class="chip">×${n}</span>`}
      <div class="small">${f.desc}</div><div class="small im">Imitiert: ${f.imitates.map(i => INSECTS[i].name).join(', ')}</div>`;
    if (!locked) h += `<div class="row2"><button class="mini" data-act="selfly" data-id="${f.id}" ${n > 0 && !sel ? '' : 'disabled'}>${sel ? 'Angeknotet' : 'Anknoten'}</button><button class="mini" data-act="tie" data-id="${f.id}" ${save.material >= 2 ? '' : 'disabled'}>Binden (−2)</button></div>`;
    h += `</div></div>`;
  }
  h += `</div><h3>Tungstenperle</h3><div class="seg">${BEADS.map(b => `<button data-act="bead" data-v="${b.mm}" class="${save.sel.bead === b.mm ? 'on' : ''}">${fmt(b.mm)} mm</button>`).join('')}</div>
    <div class="small">Schwerer = schneller am Grund, aber mehr Hänger. Faustregel: so leicht wie möglich, so schwer wie nötig.</div>
    <h3>Vorfachspitze</h3><div class="seg">${TIPPETS.map(t => `<button data-act="tippet" data-v="${t.d}" class="${save.sel.tippet === t.d ? 'on' : ''}" ${save.level < t.level ? 'disabled' : ''}>${fmt(t.d, 2)}${save.level < t.level ? ' 🔒' : ''}</button>`).join('')}</div>
    <div class="small">Dünner = mehr Bisse und schnelleres Absinken, reißt aber früher.</div>
    <button class="primary" data-act="close">Zurück ans Wasser</button>`;
  openModal(h);
  $('modalBody').querySelectorAll('canvas[data-fly]').forEach(c => drawFly(c, FLIES.find(f => f.id === c.dataset.fly)));
}
function showLog() {
  let h = `<h2>Fangbuch</h2><div class="small">Gesamt: <b>${save.total}</b> Fische gefangen und zurückgesetzt</div>`;
  for (const id in SPECIES) {
    const sp = SPECIES[id], lg = save.log[id];
    h += `<div class="card"><canvas width="420" height="150" data-sp="${id}" data-sil="${lg ? '' : '1'}"></canvas><div class="row"><div><b>${lg ? sp.name : '???'}</b><div class="small latin">${lg ? sp.latin : 'noch nicht gefangen'}</div></div>${lg ? `<div class="rec">${lg.max} cm<div class="small">${lg.n}× gefangen</div></div>` : ''}</div>${lg ? `<div class="small">${sp.note}</div>` : ''}</div>`;
  }
  openModal(h);
  $('modalBody').querySelectorAll('canvas[data-sp]').forEach(c => drawFish(c, c.dataset.sp, { silhouette: !!c.dataset.sil }));
}
function showSettings() {
  const tg = (k, label, sub) => `<label class="toggle"><input type="checkbox" data-set="${k}" ${save.set[k] ? 'checked' : ''}><span><b>${label}</b><br><span class="small">${sub}</span></span></label>`;
  openModal(`<h2>Einstellungen</h2>
    ${tg('help', 'Bisshilfe', 'Lupe leuchtet und Handy vibriert beim Biss. Ohne Hilfe: +25 % XP.')}
    ${tg('assist', 'Führungshilfe', 'Die Rute folgt der Drift ein Stück von selbst; in schnellem Wasser musst du nachhelfen. Ohne: +15 % XP.')}
    ${tg('gfx', 'Hohe Grafikqualität', 'Schatten, Gras und volle Auflösung. Ausschalten, wenn es ruckelt.')}
    ${tg('vib', 'Vibration', 'Haptik bei Biss und Drill (nur am Handy).')}
    ${tg('sound', 'Ton', 'Flussrauschen und Effekte.')}
    <h3>Steuerung</h3>
    <p class="small"><b>Handy:</b> Finger aufs Wasser, Zielring schieben, loslassen = Wurf · nach unten ziehen = Rute führen · nach oben wischen (oder ANHIEB) = anschlagen · im Drill nach unten ziehen = Druck, seitlich = Seitendruck · Stick unten links = waten in alle Richtungen.</p>
    <p class="small"><b>PC:</b> wie am Handy mit gedrückter Maustaste · Leertaste / Rechtsklick = Anhieb, im Drill halten = Druck · W/A/S/D = waten, im Drill A/D = Seitendruck · F = Fliegendose · T = Tagebuch.</p>
    <button class="ghost danger" data-act="reset">Spielstand löschen</button>
    <button class="primary" data-act="close">Schließen</button>`);
}

$('modalBody').addEventListener('click', e => {
  const b = e.target.closest('[data-act]'); if (!b || b.disabled) return;
  const a = b.dataset.act;
  if (a === 'close') closeModal();
  else if (a === 'release') { closeModal(); const f = S.afterRelease; S.afterRelease = null; f && f(); }
  else if (a === 'goto') { closeModal(); enterRevier(+b.dataset.i); toast(REVIERE[save.revier].name + ' – ' + REVIERE[save.revier].sub); }
  else if (a === 'jtab') showJournal(b.dataset.t);
  else if (a === 'selfly') { save.sel.fly = b.dataset.id; const f = curFly(); world.setFlyLook(f.col, f.bead); persist(); showBox(); updateHUD(); }
  else if (a === 'tie') { if (save.material >= 2) { save.material -= 2; save.flies[b.dataset.id] = (save.flies[b.dataset.id] || 0) + 1; sfx.tick(); persist(); const sc = $('modalBody').scrollTop; showBox(); $('modalBody').scrollTop = sc; updateHUD(); } }
  else if (a === 'bead') { save.sel.bead = +b.dataset.v; persist(); const sc = $('modalBody').scrollTop; showBox(); $('modalBody').scrollTop = sc; updateHUD(); }
  else if (a === 'tippet') { save.sel.tippet = +b.dataset.v; persist(); const sc = $('modalBody').scrollTop; showBox(); $('modalBody').scrollTop = sc; updateHUD(); }
  else if (a === 'reset') { if (confirm('Wirklich den gesamten Spielstand löschen?')) { localStorage.removeItem(KEY); location.reload(); } }
});
$('modalBody').addEventListener('change', e => {
  const k = e.target.dataset && e.target.dataset.set; if (!k) return;
  save.set[k] = e.target.checked; if (k === 'sound') sfx.setOn(save.set.sound); if (k === 'gfx') world.setQuality(save.set.gfx); persist();
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

// Anhieb / Drill
function pressDown() { sfx.start(); if (S.mode === 'fight') S.hold = true; else if (S.mode === 'drift') strike(); }
function pressUp() { S.hold = false; }
const sb = $('strike');
sb.addEventListener('pointerdown', e => { e.preventDefault(); sb.setPointerCapture?.(e.pointerId); sb.classList.add('down'); pressDown(); });
for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) sb.addEventListener(ev, () => { sb.classList.remove('down'); pressUp(); });

// Zeiger auf der Wasserfläche: zielen, Rute führen, Wisch-Anhieb, analoger Drill
const ptr = { id: null, x: 0, y: 0, ax: 0, ay: 0, hist: [] };
function aimAt(cx, cy) { const pt = world.screenToWater(cx, cy); S.aim = pt ? castTarget(pt) : null; }
canvas.addEventListener('pointerdown', e => {
  sfx.start();
  if (modalOpen() || S.mode === 'title' || e.button === 2) return;
  if (ptr.id !== null) { if (S.mode === 'drift') strike(); return; }
  ptr.id = e.pointerId; ptr.x = ptr.ax = e.clientX; ptr.y = ptr.ay = e.clientY; ptr.hist.length = 0;
  try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* */ }
  if (S.mode === 'idle' && !S.wade) aimAt(e.clientX, e.clientY);
});
canvas.addEventListener('pointermove', e => {
  if (e.pointerId !== ptr.id) return;
  const dx = e.clientX - ptr.x, dy = e.clientY - ptr.y; ptr.x = e.clientX; ptr.y = e.clientY;
  if (S.mode === 'idle') { if (!S.wade) aimAt(e.clientX, e.clientY); }
  else if (S.mode === 'drift') {
    const K = 3.6 / (Math.min(window.innerHeight, 900) * 0.42);
    S.tip.x += dx * K; S.tip.z += dy * K;
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
  const a = S.aim; S.aim = null;
  if (S.mode === 'idle' && a && e.type === 'pointerup') { if (a.ok) doCast({ x: a.tx, z: a.tz }); else toast('Dort ist kein Wasser.'); }
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
  const drift = S.mode === 'drift', T = tip3(), n = S.nymph;
  const a = drift ? clamp((T.z - n.z) / 4, -1, 1) : 0;
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
    $('fightHint').textContent = F.landing > 0 ? 'Kescher!' : F.jump > 0 ? 'Druck raus!' : ((F.p || 0) < 0.08 ? '▼ nach unten ziehen = Druck' : F.side > 0 ? 'Rute nach rechts ➡' : '⬅ Rute nach links');
    $('fightHint').classList.toggle('good', !!F.good);
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
      f.mesh.rotation.y = Math.sin(S.t * 0.9 + f.phase) * 0.1;
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
  world.poseAngler(dt, S.t, { px: S.px, pz: S.pz, gy: groundY(), face: S.face, walk: S.mode === 'idle' ? S.walk : 0, ten: S.fight ? S.fight.ten : 0, look, fight: S.mode === 'fight' });
  world._fightGrip = S.mode === 'fight';
  // Rute & Schnur
  const h = hand(), T = tip3();
  if (S.strikeT > 0) { S.strikeT -= dt; T.y += 0.5; }
  let target, s = 1, bend = 0.04, focus = null;
  if (S.mode === 'cast') {
    const c = S.cast, k = Math.min(1, c.t);
    target = { x: c.fx + (c.tx - c.fx) * k, y: c.fy + (0 - c.fy) * k + Math.sin(Math.PI * k) * 1.6, z: c.fz + (c.tz - c.fz) * k }; bend = 0.25 * (1 - k);
    const w = Math.sin(Math.PI * Math.min(1, k * 1.5)) * 0.75;   // Wurfbewegung: Rute schwingt zurück und nach vorn
    T.x += (h.x + Math.sin(S.face) * 0.5 - T.x) * w; T.z += (h.z + Math.cos(S.face) * 0.5 - T.z) * w; T.y += (h.y + 2.95 - T.y) * w;
  } else if (S.mode === 'drift') {
    target = { x: S.nymph.x, y: -S.nymph.d, z: S.nymph.z }; s = S.s; bend = 0.05 + Math.min(0.35, S.pullS * 0.3) + (S.bite || S.snag ? 0.25 : 0);
    focus = target;
  } else if (S.mode === 'fight') {
    const p = fightPos(); target = { x: p.x, y: -0.05, z: p.z }; bend = clamp(S.fight.ten, 0.1, 1); focus = p;
  } else {
    target = { x: T.x + Math.sin(S.t * 1.3) * 0.06, y: Math.max(0.25, T.y - 1.9), z: T.z + 0.15 + Math.cos(S.t * 1.1) * 0.05 };
  }
  world.setRig(h, T, target, s, bend);
  world.setAim(S.mode === 'idle' ? S.aim : null);
  if (S.mode === 'drift') {
    const k = T.y / (T.y + S.nymph.d + 1e-4);
    world.setEntry(T.x + (S.nymph.x - T.x) * k, T.z + (S.nymph.z - T.z) * k, S.bite && save.set.help ? 'bite' : Math.abs(S.g) < 0.4 ? 'ok' : S.g < 0 ? 'slack' : 'drag');
  } else world.setEntry(0, 0, null);
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
$('btnNew').addEventListener('click', () => { if (!save.started || confirm('Neues Spiel beginnen? Der alte Spielstand geht verloren.')) startGame(true); });
if (save.started) { $('btnStart').textContent = 'Weiterfischen'; $('btnNew').classList.remove('hidden'); }
else $('btnStart').textContent = 'Ans Wasser';

enterRevier(Math.min(save.revier, save.unlocked - 1));
requestAnimationFrame(frame);
window.__nm = { S, world, get save() { return save; }, get fish() { return fish; }, get river() { return river; }, get cond() { return cond; }, doCast, strike, startFight, landed, enterRevier, hand };
