// Nymphmaniac – Spiellogik: Wurf, Drift, Biss, Drill, Fortschritt, UI
import { T, LANGS, getLang, setLang, loc } from './i18n.js';
import { World } from './world.js';
import { SPECIES, FLIES, INSECTS, REVIERE, SEASONS, RIGS, INDICATORS, PAGES, BEADS, TIPPETS, LEVEL_UNLOCKS, MAX_LEVEL, xpNeed, CLARITY, LIGHTS } from './data.js';
import { Net } from './net.js';
import { LANE_X, Z_MIN, Z_MAX } from './river.js';
import { Vector3 as THREE_V3, DefaultLoadingManager } from './three.module.min.js';
import { drawFish, drawFly } from './fishart.js';
import { Sfx } from './audio.js';

const $ = id => document.getElementById(id);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const pick = a => a[(Math.random() * a.length) | 0];
const fmt = (n, d = 1) => n.toFixed(d).replace('.', ',');

// ---------- Spielstand ----------
const KEY = 'nymphmaniac_v1';
function newSave() {
  return { level: 1, xp: 0, material: 4, flies: { pt: 4, walt: 4 }, sel: { fly: 'pt', dry: 'adams', bead: 3.0, tippet: 0.14 }, rig: { mode: 'euro', ind: 'nz', depth: 1.0 },
    unlocked: 1, revier: 0, quests: {}, log: {}, stats: {}, pages: ['intro'], v: 3, tut: 0, set: { help: true, vib: true, sound: true, vol: 0.8, assist: true, castAid: false, ao: false, gq: 'auto', clear: false }, total: 0, started: false };
}
let save;
try { save = JSON.parse(localStorage.getItem(KEY)); } catch (e) { save = null; }
if (!save || !save.sel) save = newSave();
save.set = Object.assign({ help: true, vib: true, sound: true, vol: 0.8, assist: true, castAid: false, ao: false, gq: 'auto', clear: false }, save.set);
// aus dem alten Ja/Nein-Schalter: wer die hohe Qualitaet abgeschaltet hatte, landet auf der niedrigen Stufe
if (!save.set.gq || typeof save.set.gfx === 'boolean') { save.set.gq = save.set.gfx === false ? 'niedrig' : 'auto'; delete save.set.gfx; }
save.rig = Object.assign({ mode: 'euro', ind: 'nz', depth: 1.0 }, save.rig);
if (!save.sel.dry) save.sel.dry = 'adams';
const persist = () => { try { localStorage.setItem(KEY, JSON.stringify(save)); } catch (e) { /* privat */ } };
const stats = id => save.stats[id] || (save.stats[id] = { n: 0, sp: {}, spMax: {}, maxLen: 0, matched: 0, pocket: 0, heavy: 0, fine: 0, big42: 0, old: 0 });
const rigMode = () => save.rig.mode, isDry = () => save.rig.mode === 'dry', isEuro = () => save.rig.mode === 'euro';
const flyKey = () => isDry() ? 'dry' : 'fly';
const curFly = () => FLIES.find(f => f.id === save.sel[flyKey()]) || FLIES[0];
const curInd = () => INDICATORS.find(k => k.id === save.rig.ind) || INDICATORS[0];
const curBead = () => BEADS.find(b => b.mm === save.sel.bead);
const curTippet = () => TIPPETS.find(t => t.d === save.sel.tippet);
// ---------- Freischaltung ----------
const seasonOpen = () => REVIERE[Math.min(save.unlocked, REVIERE.length) - 1].season;
const rigOpen = id => (RIGS.find(r => r.id === id).season || 1) <= seasonOpen();
const hasDry = () => rigOpen('dry');
const tieCost = () => save.level >= 27 ? 1 : 2;
function unlocksAt(l) {
  const a = [];
  if (LEVEL_UNLOCKS[l]) a.push(LEVEL_UNLOCKS[l]);
  for (const f of FLIES) if (f.level === l) a.push(f.name);
  for (const b of BEADS) if (b.level === l) a.push(T('Perle') + ' ' + fmt(b.mm) + ' mm');
  for (const t of TIPPETS) if (t.level === l) a.push(T('Vorfach') + ' ' + fmt(t.d, 2) + ' mm');
  for (const k of INDICATORS) if (k.level === l) a.push(T(k.name));
  return a;
}
function seasonGift() {   // mit Staffel 2 liegen die ersten Trockenfliegen in der Dose
  if (!hasDry() || save.s2gift) return false;
  save.s2gift = true; for (const id of ['adams', 'elk']) save.flies[id] = Math.max(save.flies[id] || 0, 4);
  return true;
}
function fixSel() {       // nichts montiert lassen, was (noch) gesperrt ist
  if (!rigOpen(save.rig.mode)) save.rig.mode = 'euro';
  if (!curBead() || save.level < curBead().level) save.sel.bead = 3.0;
  if (!curTippet() || save.level < curTippet().level) save.sel.tippet = 0.14;
  if (save.level < curInd().level) save.rig.ind = 'nz';
  for (const k of ['fly', 'dry']) { const f = FLIES.find(f => f.id === save.sel[k]); if (!f || save.level < f.level) save.sel[k] = k === 'dry' ? 'adams' : 'pt'; }
}
const rigTag = m => m === 'dry' ? 'Dry Rig' : m === 'indi' ? T('Indikator Rig') : 'Nymph Rig';
// Schnellwechsel: zurueck zur zuletzt gefischten Rute; gab es noch keine, zwischen Nymphe und Trockenfliege
const swapTarget = () => { const l = save.rig.last; return l && l !== save.rig.mode && rigOpen(l) ? l : isDry() ? 'euro' : 'dry'; };
function swapRig() {
  if (!hasDry()) return;
  const to = swapTarget(); save.rig.last = save.rig.mode; save.rig.mode = to;
  fixSel(); applyRig(); persist(); sfx.tick(); updateHUD(); updateTip();
  toast(T('Rute gewechselt: {0}', rigTag(to)), 1800);
}
function xpBarHtml() {
  const mx = save.level >= MAX_LEVEL, need = xpNeed(save.level);
  let nx = save.level + 1; while (nx <= MAX_LEVEL && !unlocksAt(nx).length) nx++;
  return `<div class="xpn"><div class="row"><b>${T('Stufe {0}', save.level)}</b><span>${mx ? T('höchste Stufe erreicht') : save.xp + ' / ' + need + ' XP'}</span></div><div class="xb"><i style="width:${mx ? 100 : Math.round(save.xp / need * 100)}%"></i></div>${nx <= MAX_LEVEL ? `<div class="small">${T('Nächste Freischaltung – Stufe {0}:', nx)} ${unlocksAt(nx).join(', ')}</div>` : ''}</div>`;
}

// ---------- Ladebildschirm ----------
// Deckt den Start und jeden Revierwechsel ab, bis Texturen, Figur und die ersten Bilder da sind. Der Balken zeigt die wirklich geladenen Dateien.
const LD_TIPS = ['Fische stehen vor, neben und hinter Steinen – dort, wo die Strömung ihnen Futter bringt und wenig Kraft kostet.', 'Dreh einen Stein um, bevor du die Fliege wählst.',
  'Langsam waten. Wer hastet, fischt in leerem Wasser.', 'Trübes Wasser verzeiht auffällige Fliegen, klares verlangt feines Zeug.', 'Bei Fluchten nachgeben – aber nie ganz locker lassen.', 'Stoppt der Sighter, sofort anschlagen.'];
const Load = { on: true, busy: false, n: 0, tot: 0, n0: 0, tot0: 0, t0: performance.now(), frames: 0, p: 0, min: 700 };
DefaultLoadingManager.onStart = () => { Load.busy = true; };
DefaultLoadingManager.onProgress = (u, n, tot) => { Load.n = n; Load.tot = tot; };
DefaultLoadingManager.onLoad = () => { Load.busy = false; };
function showLoader(pre, title, sub, status, boot) {
  const el = $('loader');
  $('ldPre').textContent = pre || '\u00a0'; $('ldSub').textContent = sub || '\u00a0'; $('ldStatus').textContent = status;
  if (title) $('ldTitle').textContent = title; else $('ldTitle').innerHTML = 'NYMPH<span>MANIAC</span>';
  $('ldTip').innerHTML = `<b>${T('Opas Rat')}</b>${T(pick(LD_TIPS))}`;
  if (boot) return;   // beim Start steht er schon seit dem ersten Bild da
  Object.assign(Load, { on: true, n0: Load.n, tot0: Load.tot, t0: performance.now(), frames: 0, p: 0, min: 900 });
  $('ldFill').style.transition = 'none'; $('ldFill').style.width = '0'; $('ldPct').textContent = '0 %';
  el.classList.remove('hidden', 'out'); el.classList.add('in'); void el.offsetWidth; el.classList.remove('in'); $('ldFill').style.transition = '';
}
function loadTick() {   // jedes Bild: Fortschritt nachfuehren und ausblenden, sobald alles da ist
  if (!Load.on) return;
  Load.frames++;
  const el = performance.now() - Load.t0, tot = Load.tot - Load.tot0, files = tot > 0 ? (Load.n - Load.n0) / tot : 1;
  const ready = (!Load.hold && !Load.busy && !world.anglerPending && Load.frames > 3 && el > Load.min) || el > 20000;
  // ohne neue Dateien (Revier schon im Speicher) laeuft der Balken ueber die Zeit; fertig ist erst, wenn auch ein paar Bilder gezeichnet sind
  const p = ready ? 1 : Math.min(0.96, 0.9 * Math.min(files, tot > 0 ? 1 : el / Load.min) + 0.06 * Math.min(1, Load.frames / 4));
  if (p > Load.p) { Load.p = p; $('ldFill').style.width = (p * 100).toFixed(1) + '%'; $('ldPct').textContent = Math.round(p * 100) + ' %'; }
  if (ready) { Load.on = false; const e = $('loader'); e.classList.add('out'); setTimeout(() => { if (!Load.on) e.classList.add('hidden'); }, 600); }
}
// Revierwechsel hinter dem Ladebildschirm: erst einblenden, dann die Strecke bauen (das Bauen haelt das Bild kurz an)
function travel(i, fn) {
  const rv = REVIERE[i];
  showLoader(T(SEASONS[rv.season - 1]), rv.name, rv.sub, T('Unterwegs zum Revier …'));
  Load.hold = true;
  setTimeout(() => { fn(); Load.hold = false; Load.frames = 0; }, 600);
}

// ---------- Welt & Zustand ----------
const canvas = $('gl');
const world = new World(canvas);
const sfx = new Sfx(); sfx.on = save.set.sound; sfx.vol = save.set.vol;
// Mehrspieler: Stufe A - man sieht einander, fischt aber jeder seinen eigenen Besatz.
// netRevier ist das Revier der Gegenseite; nur wenn es mit dem eigenen uebereinstimmt,
// wird die fremde Figur ueberhaupt gezeichnet.
const net = new Net();
let netRevier = -1, netName = '', netNote = '';
net.onEvent = m => {
  if (m.type === 'hallo') { netName = (m.name || '').slice(0, 24); netRevier = m.revier; toast(T('{0} ist am Wasser.', netName || T('Jemand')), 3200); netHello(); }
  else if (m.type === 'revier') { netRevier = m.i; toast(T('{0} fischt jetzt: {1}', netName || T('Jemand'), T(REVIERE[m.i] ? REVIERE[m.i].name : '?')), 3000); }
  else if (m.type === 'wurf') { if (netRevier === save.revier) { world.splash(m.x, m.z, 0.5 + (m.hart || 0) * 1.6); sfx.plop(m.x, m.z); } }
  else if (m.type === 'fang') { toast(T('{0} hat {1} mit {2} cm gelandet.', netName || T('Jemand'), T(SPECIES[m.art] ? SPECIES[m.art].name : '?'), m.len), 4200); if (netRevier === save.revier) { world.splash(m.x, m.z, 1.2); sfx.splash(m.x, m.z, 1.2); } }
  else if (m.type === 'tschuess') { netRevier = -1; toast(T('{0} hat aufgehört.', netName || T('Jemand')), 3000); }
};
let netSaidHello = false;
const netHello = () => { if (netSaidHello) return; netSaidHello = true; net.send('hallo', { name: save.netName || '', revier: save.revier }); };
net.onState = st => {
  if (st === 'verbunden') { netSaidHello = false; netNote = ''; netHello(); }
  if (st === 'weg') { netRevier = -1; netName = ''; netNote = T('Die Verbindung ist abgerissen.'); toast(T('Verbindung verloren.'), 3200); }
  // Steht der Dialog offen, soll er den neuen Zustand zeigen. Bei 'weg' bleibt er sonst
  // auf "Kennung wird geholt" stehen und es geht nie mehr weiter - darum wird dort eine
  // neue Kennung geholt. Bei 'warten' wird nichts angefasst: das waere eine Schleife.
  if ((st === 'verbunden' || st === 'weg')
    && ($('netStep') || document.querySelector('#modalBody [data-act="netoff"]'))) showMulti(st === 'verbunden');
};
world.setGfxMode(save.set.gq); world.setAo(save.set.ao);
world.setClearView(save.set.clear);
let river, cond, fish = [], respawn = [], sndRocks = [];
const S = {
  mode: 'title', yaw: 0, yb: 0, pitch: 0, px: LANE_X, pz: 0, t: 0, joy: { x: 0, z: 0 }, face: 0, walk: 0, moveDir: 0, tip: { x: LANE_X - 0.6, z: -1.6 }, nymph: { x: 0, d: 0, z: 0 }, L: 4, s: 1, pullS: 0, g: 0, q: 1,
  kick: 0, driftT: 0, onBottom: false, tickT: 0, bite: null, snag: false, snagT: 0, fight: null, hold: false, wade: null,
  cast: null, maxFrac: 0, swingT: 0, sinkRate: 0.2, snagHint: false, aim: null, press: 0, rodX: -0.5,
  sndT: 0, stepD: 0.55, sx: LANE_X, sz: 0, aimU: null, aimP0: null, aimBase: 0, netT: 0,
};
function gaugeLabels() {
  const q = (s, v) => { const e = document.querySelector(s); if (e) e.textContent = v; };
  if (isEuro()) { q('#gauge .l', T('lose')); q('#gauge .c', T('Kontakt')); q('#gauge .r', T('Zug')); }
  else { q('#gauge .l', T("treibt frei")); q('#gauge .c', ''); q('#gauge .r', isDry() ? T("furcht") : T('Zug')); }
}
// Radius eines Steins in einer Richtung (aus seinem echten Umriss), sonst grob aus dem Flussmodell
function rockR(k, ox, oz) {
  if (!k.prof) return k.r * 1.2;
  const f = (Math.atan2(oz, ox) / 6.2832 * 32 + 32) % 32, i = Math.floor(f), t = f - i;
  return k.prof[i % 32] * (1 - t) + k.prof[(i + 1) % 32] * t;
}
function applyRig() { gaugeLabels(); const f = curFly(), k = curInd(); world.setRigStyle(rigMode(), k.col, k.size); world.setFlyLook(f.col, isDry() ? f.col : f.bead, f.hot, f.id); }
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
function enterRevier(i, keep) {
  save.revier = i;
  const rv = REVIERE[i];
  // verlangt eine offene Aufgabe ein bestimmtes Licht, herrscht es bei jedem Besuch - sonst waere sie nur mit Glueck loesbar
  const ql = rv.quests.find(q => q.light && !save.quests[q.id]), lset = ql ? ql.light : rv.lights;
  cond = { clarity: pick(rv.clarity), light: pick(lset ? LIGHTS.filter(l => lset.includes(l.id)) : LIGHTS), sampled: false };
  const ins = [...rv.insects].sort(() => Math.random() - 0.5);
  if (cond.clarity === 2 && ins.includes('worm')) { ins.splice(ins.indexOf('worm'), 1); ins.unshift('worm'); }
  cond.i1 = ins[0]; cond.i2 = ins[1];
  // Beim Neuladen der Seite bleiben Wasser, Licht, Insekten und der umgedrehte Stein erhalten; nur ein neuer Besuch wuerfelt neu
  const sc = save.cond;
  if (keep && sc && sc.revier === i && rv.insects.includes(sc.i1) && LIGHTS.some(l => l.id === sc.light)) cond = { clarity: sc.clarity, light: LIGHTS.find(l => l.id === sc.light), sampled: !!sc.sampled, i1: sc.i1, i2: sc.i2 };
  save.cond = { revier: i, clarity: cond.clarity, light: cond.light.id, i1: cond.i1, i2: cond.i2, sampled: cond.sampled };
  river = world.buildRevier(rv, cond);
  world.setPolar(save.level >= 2);
  S.px = LANE_X; S.pz = 0; world.camZ = 0; world.camX = LANE_X; S.wade = null; S.fight = null; S.bite = null; S.snag = false;
  fish = []; respawn = [];
  // Besatz: 40 % mehr als frueher und gleichmaessig ueber die Strecke verteilt, damit nicht zufaellig ganze Abschnitte leer bleiben
  const all = river.lies.filter(l => !l.big).sort((a, b) => b.z - a.z), want = Math.min(all.length, Math.round(rv.fishN * 1.4)), lies = [];
  for (let i = 0; i < want; i++) { const a = Math.floor(i * all.length / want), b = Math.max(a + 1, Math.floor((i + 1) * all.length / want)); lies.push(all[a + ((Math.random() * (b - a)) | 0)]); }
  // jede Art von Standplatz ist mit mindestens zwei Fischen besetzt (soweit vorhanden), damit Standplatz-Aufgaben bei jedem Besuch loesbar sind
  for (const t of new Set(all.map(l => l.type))) { const pool = all.filter(l => l.type === t && !lies.includes(l)); for (let k = lies.filter(l => l.type === t).length; k < 2 && pool.length; k++) lies.push(pool.splice((Math.random() * pool.length) | 0, 1)[0]); }
  for (const l of lies) fish.push(makeFish(l));
  checkOld(false);
  if (S.mode !== 'title') S.mode = 'idle';
  restTip();
  net.send('revier', { i });
  sfx.setRiver(rv.speed, cond.light.id);
  // Rauschquellen des Reviers: jeder Stein im stroemenden Wasser, gewichtet nach Groesse und Stroemung,
  // dazu die Wasserfaelle. Einmal je Revier gerechnet, der Klang fuehrt sie dann nur noch nach.
  sndRocks = river.rocks.map(k => ({ x: k.x, z: k.z, k: Math.min(1, k.r * 1.6) * Math.min(1.4, river.speedAt(k.x, k.z) + 0.2) }));
  applyRig();
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
  const f = { lie, x: lie.x, z: lie.z, species, len, wary: 0, spooked: 0, old: !!old, phase: Math.random() * 6, match: 1, rise: false, riseT: 0, ringT: 1 + Math.random() * 3 };
  // nicht jeder Fisch steigt: Barben bleiben am Grund, Huchen und Marmorata kommen selten hoch, Aeschen fast immer
  f.riser = hasDry() && !old && Math.random() < ({ barbe: 0, huchen: 0.25, marmorata: 0.45, seeforelle: 0.6, aesche: 0.9 }[species] ?? 0.72);
  f.rise = f.riser && Math.random() < 0.35;
  // zufaellige Phase im jeweiligen Abschnitt, sonst steigen kurz nach dem Betreten des Reviers alle Fische gleichzeitig
  f.riseT = f.rise ? 20 + Math.random() * 280 : (20 + Math.random() * 380) / (cond ? cond.light.act : 1);
  f.mesh = world.makeFish(len, species);
  placeFish(f);
  return f;
}
// Flucht: der Fisch schiesst vom Angler weg die Rinne entlang und verschwindet erst in der Ferne
function fleeFish(f, dur) {
  const p = f.mesh.position;
  f.spooked = dur; f.mesh.visible = true; f.dx = f.dz = 0;
  f.flee = { t: 0, x: p.x, z: p.z, dir: p.z <= S.pz ? -1 : 1 };
  f.flee.off = p.x - river.cx(p.z);
  world.splash(p.x, p.z, 0.5);
}
function placeFish(f) { f.ry = Math.atan(river.dcx(f.z)); f.by = -Math.max(0.2, river.depthAt(f.x, f.z) - 0.12); f.mesh.position.set(f.x, f.rise ? -0.16 : f.by, f.z); f.mesh.rotation.set(0, f.ry, 0); }   // Kopf gegen die Stroemung
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
  const dd = clamp(d, 2.6, isEuro() ? 7.6 : isDry() ? 12 : 10.5); dx *= dd / d; dz *= dd / d;   // mit Flugschnur geht es weiter hinaus
  if (dz > 1.0) dz = 1.0;
  const tx = h.x + dx, tz = h.z + dz;
  return { tx, tz, dx, dz, ok: river.depthAt(tx, tz) >= 0.1 };
}
// Wurf ohne Wurfhilfe: die Richtung kommt vom angetippten Punkt, die Weite aus der Laenge des Zugs.
// Ein blosser Tipper wirft genau dorthin, wie frueher - erst das Ziehen aendert die Weite.
const castBand = () => (RIGS.find(r => r.id === rigMode()) || {}).cast || { best: 5.5, max: 7.6 };
const castAid = () => !!save.set.castAid;
const MPP = () => 8 / Math.max(240, window.innerHeight * 0.35);   // Meter je Bildpunkt Zugweg
function castAim(dist) {
  const u = S.aimU; if (!u) return null;
  const h = hand(), b = castBand();
  const dd = clamp(dist, 2.6, b.max);
  const tx = h.x + u.ux * dd, tz = h.z + u.uz * dd;
  // Je weiter ueber der bequemen Weite der Rute, desto weniger genau - quadratisch, nicht linear
  const over = Math.max(0, dd - b.best) / Math.max(0.1, b.max - b.best);
  return { tx, tz, dd, over, spread: 0.1 + over * over * 0.6, ok: river.depthAt(tx, tz) >= 0.1 };
}
function aimStart(cx, cy) {
  const pt = world.screenToWater(cx, cy);
  if (!pt) { S.aimU = null; S.aim = null; return; }
  const h = hand();
  let dx = pt.x - h.x, dz = pt.z - h.z;
  if (dz > 0.3) dz = 0.3;                                   // stromab wirft hier niemand
  const l = Math.hypot(dx, dz) || 1;
  S.aimU = { ux: dx / l, uz: dz / l }; S.aimP0 = { x: cx, y: cy }; S.aimBase = l;
  S.aim = castAim(l);
}
function doCast(a, vy = 0) {
  if (S.mode !== 'idle' || S.wade) return;
  const fly = curFly();
  if (!(save.flies[fly.id] > 0)) { toast(T('Keine {0} mehr – öffne die Fliegendose.', fly.name)); return; }
  if (a && a.tx === undefined) a = castTarget(a);           // alter Aufruf mit einem Punkt (Konsole, Bot)
  if (!a) return;
  if (!a.ok) { toast(T('Dort ist kein Wasser.')); return; }
  const h = hand();
  // Streuung um den Zielpunkt: Richtung gleichverteilt, Abstand glockenfoermig
  let tx = a.tx, tz = a.tz;
  const sp = a.spread || 0;
  if (sp > 0.001) {
    const ang = Math.random() * 6.2832, r = sp * Math.sqrt(-2 * Math.log(1 - Math.random() * 0.9));
    tx += Math.cos(ang) * r; tz += Math.sin(ang) * r;
    if (river.depthAt(tx, tz) < 0.05) { tx = a.tx; tz = a.tz; }   // nicht ans Ufer streuen
  }
  // Haerte des Aufsetzens: ein gerissener Zug und eine ueberzogene Weite klatschen
  // Die volle Weite allein klatscht noch nicht - sie liegt knapp unter der Schwelle.
  // Erst ein gerissener Zug obendrauf laesst es aufschlagen.
  const hard = clamp((a.over || 0) * 0.45 + Math.max(0, vy - 1400) / 2600, 0, 1);
  const dx = tx - h.x, dz = tz - h.z;
  const l = Math.hypot(dx, dz);
  S.tip.x = h.x + dx / l * 2.6; S.tip.z = h.z + dz / l * 2.6;
  const TP = tip3();
  // Wurfablauf: Rueckschwung, bei der Trockenfliege ein bis zwei Leerwuerfe (zufaellig), dann ablegen
  const rm = rigMode(), nFalse = rm === 'dry' ? 1 + (Math.random() < 0.5 ? 1 : 0) : 0, st = [];
  st.push({ dir: -1, dur: rm === 'euro' ? 0.26 : 0.4 });
  for (let i = 0; i < nFalse; i++) { st.push({ dir: 1, dur: 0.38 }); st.push({ dir: -1, dur: 0.4 }); }
  st.push({ dir: 1, dur: rm === 'euro' ? 0.44 : 0.56, fin: true });
  const full = Math.hypot(tx - TP.x, tz - TP.z, TP.y);
  st.forEach((q, i) => { q.len = Math.max(2.2, full * (rm === 'euro' ? 1 : 0.45 + 0.55 * (i + 1) / st.length)); });   // beim Leerwurf wird Schnur verlaengert
  S.castOver = a.over || 0;
  S.cast = { t: 0, T: st.reduce((a, q) => a + q.dur, 0), st, k: -1, ux: dx / l, uz: dz / l, tx, tz, hard, loop: rm === 'euro' ? 0.3 : rm === 'dry' ? 0.5 : 0.85, hang: { x: TP.x, y: Math.max(0.3, TP.y - 1.9), z: TP.z } };
  S.mode = 'cast';
}
// Haltung von Rute und Schnur waehrend des Wurfs. Jeder Schlag bewegt die Rute zwischen 10 und 1 Uhr;
// die Schnur rollt als Schlaufe ab: das untere Bein liegt schon gestreckt, das obere holt noch auf.
const _cpts = Array.from({ length: 64 }, () => new THREE_V3());
function castPose(h, TP0) {
  const c = S.cast, tt = Math.min(c.t, 1) * c.T;
  let acc = 0, k = 0;
  while (k < c.st.length - 1 && tt > acc + c.st[k].dur) { acc += c.st[k].dur; k++; }
  const st = c.st[k], p = clamp((tt - acc) / st.dur, 0, 1), sm = x => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
  if (c.k !== k) { c.k = k; sfx.whip(clamp(Math.hypot(c.tx - S.px, c.tz - S.pz) / 9, 0.2, 1)); }   // weiter geworfen heisst schaerfer gepfiffen
  const RL = 3.05, thF = 0.92, thB = 1.92;                      // Stopp vorn (10 Uhr) und hinten (1 Uhr), Winkel ueber der Waagrechten
  const a0 = k === 0 ? 0.7 : st.dir > 0 ? thB : thF, a1 = st.dir > 0 ? thF : thB, th = a0 + (a1 - a0) * sm(p / 0.6);
  const tip = { x: h.x + c.ux * Math.cos(th) * RL, y: h.y + Math.sin(th) * RL, z: h.z + c.uz * Math.cos(th) * RL };
  const land = st.fin ? sm((p - 0.5) / 0.5) : 0;
  if (land > 0) { tip.x += (TP0.x - tip.x) * land; tip.y += (TP0.y - tip.y) * land; tip.z += (TP0.z - tip.z) * land; }   // Rute senkt sich beim Ablegen in die Drifthaltung
  // Flugrichtung der Schnur: Rueckwurf leicht ansteigend, Leerwurf ueber dem Wasser, letzter Wurf auf das Ziel
  const el = st.dir < 0 ? 0.3 : st.fin ? -0.12 : 0.1, ce = Math.cos(el) * st.dir;
  const d = { x: c.ux * ce, y: Math.sin(el), z: c.uz * ce };
  const Lc = st.len, xn = Lc * Math.pow(p, 1.35), hL = c.loop * (1 - p * p * p), N = _cpts.length;
  const first = k === 0 ? 1 - sm(p * 1.6) : 0;                   // am Anfang haengt die Fliege noch unter der Rutenspitze
  for (let i = 0; i < N; i++) {
    const f = i / (N - 1), sl = Lc * f, q = _cpts[i];
    if (sl <= xn) q.set(tip.x + d.x * sl, tip.y + d.y * sl - 0.25 * f * (1 - f), tip.z + d.z * sl);
    else { const r = sl - xn, o = xn - r + 0.2 * Math.sin(Math.PI * clamp(r / 0.7, 0, 1)); q.set(tip.x + d.x * o, tip.y + d.y * o + hL * (1 - Math.exp(-r / 0.32)), tip.z + d.z * o); }
    if (first > 0) { q.x += (tip.x + (c.hang.x - tip.x) * f - q.x) * first; q.y += (tip.y + (c.hang.y - tip.y) * f - q.y) * first; q.z += (tip.z + (c.hang.z - tip.z) * f - q.z) * first; }
    if (land > 0) { const sy = tip.y * (1 - f) - 0.5 * f * (1 - f) * (1 - land); q.x += (tip.x + (c.tx - tip.x) * f - q.x) * land; q.y += (Math.max(0.02, sy) - q.y) * land; q.z += (tip.z + (c.tz - tip.z) * f - q.z) * land; }
    if (q.y < 0.04) q.y = 0.04;
  }
  const load = Math.sin(Math.PI * clamp(p / 0.62, 0, 1));        // die Rute laedt sich gegen die Schnur auf
  return { tip, pts: _cpts, bend: 0.06 + 0.3 * load, pull: { x: tip.x - d.x * 3, y: tip.y - d.y * 3 - 0.5, z: tip.z - d.z * 3 } };
}
function updateCast(dt) {
  const c = S.cast; c.t += dt / c.T;
  if (c.t >= 1) {
    const n = S.nymph; n.x = c.tx; n.z = c.tz; n.d = 0.02;
    const TP = tip3();
    S.L = Math.hypot(TP.x - n.x, TP.y, TP.z - n.z) * 1.07;
    const tp = curTippet(), fly = curFly();
    S.sinkRate = curBead().sink * fly.sink * tp.sink;
    for (const f of fish) f.match = flyMatch(fly, f);
    S.indSunk = false; S.indLow = false; S.rockHold = null; S.rockTouch = null;
    if (rigMode() === 'indi') {   // traegt der Indikator die Nymphe? Und wie laut setzt er auf?
      const k = curInd(), load = curBead().sink * fly.sink;
      S.indSunk = load > k.cap; S.indLow = !S.indSunk && load > k.cap * 0.85;
      for (const f of fish) if (Math.hypot(f.x - n.x, f.z - n.z) < k.splash) f.wary = Math.max(f.wary, 9);
      if (S.indSunk) toast(T("Der Indikator säuft ab – die Perle ist zu schwer für ihn. Nimm einen tragfähigeren oder eine leichtere Perle."), 4200);
    }
    if (isDry()) n.d = 0;
    S.mode = 'drift'; S.driftT = 0; S.bite = null; S.snag = false; S.snagHint = false; S.onBottom = false; S.maxFrac = 0; S.swingT = 0; S.pullS = 0; S.g = 0; S.kick = 0; S.tickT = 0.3;
    // Geklatscht: der Vorfachbogen faellt zusammen, statt sich zu strecken. Die Fische in der Naehe ducken sich.
    const hd = c.hard || 0;
    net.send('wurf', { x: +n.x.toFixed(2), z: +n.z.toFixed(2), hart: +hd.toFixed(2) });
    world.splash(n.x, n.z, 0.5 + hd * 1.8); sfx.plop(n.x, n.z);
    if (hd > 0.45) {
      sfx.splash(n.x, n.z, 0.6 + hd);
      const rad = 0.8 + hd * 1.8;
      let sp = 0;
      for (const f of fish) if (Math.hypot(f.x - n.x, f.z - n.z) < rad) { f.wary = Math.max(f.wary, 8 + hd * 8); sp++; }
      toast(sp ? T('Geklatscht – die Fische hier sind jetzt misstrauisch. Kürzer werfen oder näher heranwaten.')
               : T('Geklatscht – zu viel Weite für die Rute. Näher heranwaten.'), 3600);
    }
    // Beim ersten Wurf jenseits der bequemen Weite einmal erklaeren, warum der Ring aufgegangen ist
    if ((a0 => a0 > 0.5 && !save.wideHint)(S.castOver || 0)) {
      save.wideHint = true; persist();
      toast(T('Das war weiter, als die Rute sauber trägt – deshalb ging der Zielring auf. Näher heranwaten trifft genauer als weiter werfen.'), 5200);
    }
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
  if (save.set.assist && !S.bite && !S.snag) {
    const T0 = tip3(), ax = T0.x - n.x, az = T0.z - n.z, al = Math.hypot(ax, az) || 1;
    let st = 0;
    if (isEuro()) { if (S.s < 0.96 && S.pullS < 0.05) st = Math.min(1.4, 1.7 * (0.96 - S.s) * Math.min(S.L, 4.5)) * dt; }
    // Indikator / Trockenfliege: lose Schnur ist erlaubt. Nur sehr lose Schnur sanft aufnehmen, bei Zug nachgeben - unabhaengig von der Schnurlaenge, sonst zittert die Rute bei weiten Wuerfen
    else if (S.pullS > 0.05) st = -Math.min(1.0, S.pullS * 2.5) * dt;
    else if (S.s < 0.72) st = Math.min(0.7, 2.2 * (0.72 - S.s)) * dt;
    S.tip.x += ax / al * st; S.tip.z += az / al * st;
  }
  const TP = tip3();
  const held = S.snag || S.bite;
  const euro = isEuro(), dry = isDry(), indi = !euro && !dry;
  if (!held) {
    const frac = euro ? Math.min(1, n.d / bottom) : 0;   // Indikator und Trockenfliege treiben mit der Oberflaeche
    let vz = Math.max(0.16, v * (1 - 0.5 * frac)); if (S.onBottom) vz *= 0.75;
    n.z += vz * dt; n.x += river.dcx(n.z) * vz * dt;   // die Stroemung folgt dem Flusslauf
  }
  let pull = 0;
  const constrain = count => {
    const dx = TP.x - n.x, dy = TP.y + (euro ? n.d : 0), dz = TP.z - n.z, d = Math.hypot(dx, dy, dz);
    if (d > S.L) {
      const ex = d - S.L;
      if (held) { if (count) pull = 0.9; }
      else { n.x += dx / d * ex; n.z += dz / d * ex; if (euro) n.d = Math.max(0, n.d - dy / d * ex); if (count) pull = ex / dt; }
      return 1;
    }
    return d / S.L;
  };
  S.s = constrain(true);
  // Indikator / Trockenfliege: die Schnur liegt auf dem Wasser. Kreuzt sie einen Stein, bleibt sie dort haengen;
  // die Fliege kann dann nur noch so weit treiben, wie Schnur hinter dem Stein liegt - danach wird sie gebremst und furcht.
  if (!held) {
    const ax = TP.x + (n.x - TP.x) * 0.3, az = TP.z + (n.z - TP.z) * 0.3, vx = n.x - ax, vz = n.z - az, ll = vx * vx + vz * vz || 1;
    let hit = null, hx = 0, hz = 0;
    for (const k of river.rocks) {
      const t = clamp(((k.x - ax) * vx + (k.z - az) * vz) / ll, 0, 1), cx = ax + vx * t, cz = az + vz * t;
      const dc = Math.hypot(cx - k.x, cz - k.z);
      if (t < 0.96 && dc < (k.vr || k.r * 1.2) && dc < rockR(k, cx - k.x, cz - k.z) * 0.95) {
        // nur wenn die Schnur dort wirklich aufliegt: nahe der Rutenspitze haengt sie noch hoch in der Luft ueber dem Stein
        const Dl = Math.hypot(n.x - TP.x, n.z - TP.z) || 1, tdl = Math.min(Dl * 0.45, 2.6), sl = Math.hypot(cx - TP.x, cz - TP.z), yl = euro ? TP.y - (TP.y + n.d) * (0.3 + 0.7 * t) : sl < tdl ? TP.y * Math.pow(1 - sl / tdl, 1.7) : 0, top = world.rockTop(k, cx, cz);   // Euro: die Schnur laeuft gerade von der Spitze zur Nymphe
        if (top !== null && yl <= top + 0.05) { hit = k; hx = cx; hz = cz; break; }
      }   // die Schnur liegt quer ueber diesem Stein
    }
    if (!hit) S.rockHold = null;
    else {
      if (!S.rockHold || S.rockHold.k !== hit) S.rockHold = { k: hit, x: hx, z: hz, len: Math.hypot(n.x - hx, n.z - hz) + 0.25 };
      const h = S.rockHold, dx = h.x - n.x, dz = h.z - n.z, d = Math.hypot(dx, dz);
      if (d > h.len) {
        const ex = d - h.len; n.x += dx / d * ex; n.z += dz / d * ex; pull = Math.max(pull, Math.min(1.5, ex / dt));
        if (!S.rockHint) { S.rockHint = true; toast(euro ? T("Die Schnur liegt über einem Stein und hält die Nymphe fest. Rute heben oder so stellen, dass kein Stein zwischen dir und der Nymphe liegt.") : T("Die Schnur liegt über einem Stein und hält die Fliege fest – sie furcht. Rute heben und so werfen, dass kein Stein dazwischen liegt."), 5200); }
      }
    }
  }
  if (!held) {
    // Kontakt (Anzeige mittig) hält die Nymphe knapp über Grund in der Schwebe; nur lose Schnur lässt sie aufsetzen, Zug hebt sie
    const sink = S.sinkRate / (1 + 0.9 * v), lift = Math.min(1.1, Math.max(0, S.pullS - 0.08) * 1.3);
    const floor = S.g > -0.4 ? bottom - Math.min(0.25, bottom * 0.3) : bottom;
    let nd = n.d + (sink - lift) * dt;
    if (n.d <= floor) nd = Math.min(nd, floor); else nd = Math.max(floor, Math.min(nd, n.d - 0.3 * dt));
    if (dry) nd = 0;                                                                   // schwimmt
    else if (indi) nd = Math.min(n.d + (sink - lift * 0.5) * dt, Math.min(save.rig.depth, bottom));   // haengt in der eingestellten Tiefe unter dem Indikator
    n.d = clamp(nd, 0, bottom);
    constrain(false);
    for (const k of river.rocks) {   // Fliege, Nymphe und Indikator treiben um den Stein herum, nie hindurch
      const dx = n.x - k.x, dz = n.z - k.z, d = Math.hypot(dx, dz); if (d > (k.vr || k.r * 1.3) + 0.1) continue;
      const R = rockR(k, dx, dz) + 0.05;
      if (d < R) {
        // eine Nymphe, die unter Wasser gegen den Stein treibt, kann sich dort verklemmen
        if (euro && S.rockTouch !== k) { S.rockTouch = k; if (dz < 0 && n.d > 0.15 && Math.random() < 0.12) { S.snag = true; S.snagT = 0; sfx.bite(); } }   // die Stroemung schiebt sie seitlich am Stein vorbei, statt sie davor festzuhalten
        const sg = S.rockHold && S.rockHold.k === k ? (S.rockHold.x >= k.x ? 1 : -1) : dx >= 0 ? 1 : -1;   // haengt die Schnur am Stein, rutscht die Fliege auf deren Seite vorbei
        const ex = dx + sg * Math.max(0.45, v) * dt * 2.2, e = Math.hypot(ex, dz) || 1;
        n.x = k.x + ex / e * R; n.z = k.z + dz / e * R;
      }
    }
    if (river.depthAt(n.x, n.z) < 0.05) return endDrift();
  }
  S.pullS += (pull - S.pullS) * Math.min(1, dt * 8);
  const g = S.pullS > 0.06 ? Math.min(1, S.pullS / 0.55) : -clamp((0.97 - S.s) / 0.22, 0, 1);
  S.g += (g - S.g) * Math.min(1, dt * 10);
  const ag = Math.abs(S.g);
  S.q = ag < 0.4 ? 1 : Math.max(0.1, 1 - (ag - 0.4) / 0.6 * 0.9);
  if (!euro) S.q = (S.g > 0.4 ? S.q : 1) * (indi ? curInd().drift : 1);   // lose Schnur schadet hier nicht, nur Zug (Furchen)
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
      if (!!f.rise !== dry) continue;   // steigende Fische nur auf Trockenfliege, alle anderen nur auf die Nymphe
      const fx = f.x - n.x, fz = f.z - n.z, R = dry ? 0.85 + f.len / 100 * 0.5 : 0.7 + f.len / 100 * 0.6;   // steigende Fische fressen aus einer Bahn von knapp einem Meter
      if (fx * fx + fz * fz > R * R) continue;
      const zone = 0.28 + 0.14 * cond.light.act + (f.len > 45 ? 0.06 : 0);
      if (!dry && bottom - n.d > zone) continue;
      if (f.old && (f.match < 1.0 || S.q < 0.9)) continue;
      const sp = SPECIES[f.species], tp = curTippet();
      const take = 1 + (tp.take - 1) * (0.5 + sp.shy) * (1 - cond.clarity * 0.4);
      const rate = (dry ? 2.2 : indi ? 1.35 : 1.5) * f.match * S.q * S.q * cond.light.act * take * (1.15 - sp.shy * 0.3);
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
  if (rigMode() === 'indi') S.bite.win *= curInd().sens * (S.indSunk ? 0.35 : S.indLow ? 0.8 : 1);   // je nach Indikator sieht man den Biss besser oder schlechter
  if (isDry()) { S.bite.win *= 1.1; world.splash(S.nymph.x, S.nymph.z, 0.7); sfx.rise(S.nymph.x, S.nymph.z); }                // der Fisch nimmt sichtbar an der Oberflaeche
  sfx.bite();
  if (save.set.help) { vibrate(60); $('lupeWrap').classList.add('bite'); }
  if (save.tut < 3) save.tut = 2;
  updateTip();
}
function endDrift(silent) {
  if (!silent && S.mode === 'drift') {
    if (isEuro()) { if (S.maxFrac < 0.62 && S.driftT > 2) toast(T('Die Nymphe kam nicht auf Tiefe. Schwerere Perle wählen oder weiter stromauf einwerfen.'), 4200); }
    else if (rigMode() === 'indi' && S.maxFrac < 0.62 && S.driftT > 2) toast(T("Die Nymphe trieb zu hoch über dem Grund. Stell im Rig die Tiefe unter dem Indikator größer ein."), 4200);
  }
  S.mode = 'idle'; S.bite = null; S.snag = false; S.s = 1; S.g = 0; S.kick = 0;
  $('lupeWrap').classList.remove('bite');
  restTip(); updateTip(); updateHUD();
}
function loseFly(msg) {
  const key = flyKey(), id = save.sel[key];
  save.flies[id] = Math.max(0, (save.flies[id] || 0) - 1);
  sfx.snap(); vibrate([30, 40, 30]);
  if (save.flies[id] === 0) {
    const other = FLIES.find(f => !!f.dry === isDry() && save.flies[f.id] > 0);
    if (other) { save.sel[key] = other.id; msg += ' ' + T('Neue Fliege: {0}.', other.name); applyRig(); }
    else if (save.material < 2 && isDry()) { save.flies.adams = 2; save.sel.dry = 'adams'; msg += ' ' + T("Im Hutband stecken noch zwei Adams von Opa."); }
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
    if (isEuro() ? S.s < 0.8 && Math.random() < 0.55 : S.s < 0.6 && Math.random() < 0.45) {
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
  if (S.kick > 0.15 && isEuro()) toast(T('Nur ein Grundkontakt. Ticks sind kurz – ein Biss hält den Sighter fest.'));
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
  world.splash(n.x, n.z, 1.2); sfx.splash(n.x, n.z, 1.2); vibrate([50, 40, 80]);
  if (save.tut < 4) save.tut = 3;
  $('hud').classList.add('fighting'); $('strike').textContent = T('DRILL');
  toast(f.old ? T('Die Rute biegt sich bis ins Handteil. DAS IST ER!') : T('Fisch hängt!'), 1800);
  updateTip();
}
function fightPos() {
  const F = S.fight, w = river.halfW - 0.9; let z = S.pz - Math.cos(F.ang) * F.dist; const c = river.cx(z); let x = clamp(S.px - Math.sin(F.ang) * F.dist, c - w, c + w);
  // der Fisch schwimmt um Steine herum, nie hindurch: liegt sein Platz in einem Stein, weicht er an dessen Rand aus
  for (let pass = 0; pass < 2; pass++) for (const k of river.rocks) {
    const ox = x - k.x, oz = z - k.z, d = Math.hypot(ox, oz); if (d > (k.vr || k.r * 1.3) + 0.4) continue;
    const R = rockR(k, ox, oz) + 0.3;
    if (d < R) { const e = d || 0.01; x = k.x + (d ? ox / e : F.side) * R; z = k.z + oz / e * R; }
  }
  return { x, z };
}
function updateFight(dt) {
  const F = S.fight, f = F.f, sp = SPECIES[f.species], lim = curTippet().limit;
  let p = fightPos();
  if (F.landing > 0) {
    sfx.drag(0, 0);
    F.landing += dt; F.dist = Math.max(1.3, F.dist - dt * 3.5); F.ten += (0.45 - F.ten) * dt * 4;
    if (F.landing > 1.2) return landed(f);
  } else {
    F.runT -= dt;
    if (F.runT <= 0) {
      F.surge = (0.55 + Math.random() * 0.6) * Math.min(1.35, 0.45 + F.str * 0.4) * (0.45 + F.stam * 0.55);
      F.runT = 1.1 + Math.random() * 2.2; if (Math.random() < 0.6) F.side *= -1;
      world.splash(p.x, p.z, 0.7 + f.len / 60); sfx.splash(p.x, p.z, 0.7 + f.len / 60); vibrate(25);
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
      if (F.jumpT <= 0 && F.jump <= 0 && F.stam > 0.25) { F.jump = 0.7; F.jumpT = 4 + Math.random() * 5; world.splash(p.x, p.z, 1.4); sfx.splash(p.x, p.z, 1.4); toast(T('Sie springt – Druck raus!'), 1200); }
      if (F.jump > 0) {
        F.jump -= dt;
        if (F.p > 0.45 && F.ten > 0.5 && Math.random() < dt * 0.9) return lostFish('jump');
        if (F.jump <= 0) { world.splash(p.x, p.z, 1.6); sfx.splash(p.x, p.z, 1.6); }
      }
    }
    F.ang += F.side * dt * 0.35 * (0.3 + F.surge);
    if (F.ang > 1.3) { F.ang = 1.3; F.side = -1; } if (F.ang < -1.3) { F.ang = -1.3; F.side = 1; }
    F.dist = clamp(F.dist + (F.surge * 2.2 * (1 - 0.55 * F.p) - (0.1 + F.p) * (1.15 - F.stam * 0.6)) * dt, 1.6, 10.5);
    // Rollenbremse: laeuft Schnur ab, kreischt sie - umso schneller, je heftiger die Flucht.
    // Kommt der Fisch naeher, klickt es langsamer, weil du einkurbelst.
    {
      const v = (F.dist - (F.d0 === undefined ? F.dist : F.d0)) / Math.max(1e-3, dt); F.d0 = F.dist;
      const out = Math.max(0, v), inn = Math.max(0, -v);
      const rate = out > 0.06 ? 10 + out * 15 : inn > 0.06 && F.p > 0.3 ? 5 + inn * 8 : 0;
      sfx.drag(rate, rate ? Math.min(0.17, 0.03 + out * 0.05 + F.ten * 0.07) : 0);
    }
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
function endFightUI() { sfx.drag(0, 0); $('hud').classList.remove('fighting'); $('strike').textContent = T('ANHIEB'); S.hold = false; S.press = 0; S.fight = null; }
function lostFish(kind) {
  const f = S.fight.f;
  stats(REVIERE[save.revier].id).streak = 0;   // Serie gerissen
  endFightUI();
  f.mesh.rotation.x = f.mesh.rotation.z = 0; fleeFish(f, 80);
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
  net.send('fang', { art: f.species, len: f.len, x: +f.x.toFixed(2), z: +f.z.toFixed(2) });
  endFightUI();
  S.mode = 'landed';
  const w = Math.round(0.0105 * f.len ** 3 / 10) * 10;
  st.n++; st.sp[f.species] = (st.sp[f.species] || 0) + 1;
  st.spMax[f.species] = Math.max(st.spMax[f.species] || 0, f.len); st.maxLen = Math.max(st.maxLen, f.len);
  if (cond.sampled && (fly.imitates.includes(cond.i1) || fly.imitates.includes(cond.i2))) st.matched++;   // beide Insekten vom Stein zaehlen
  if (f.lie.rock) st.pocket++;
  if (save.sel.bead >= 3.5 && !isDry()) st.heavy++;   // Perlen-Aufgaben zaehlen nur, wenn wirklich eine Perle am Vorfach ist
  if (save.sel.tippet <= 0.12) st.fine++;
  if (f.len >= 42) st.big42++;
  const inc = k => { st[k] = (st[k] || 0) + 1; };
  if (save.sel.bead <= 2.5 && !isDry()) inc('light');
  if (f.lie.type === 'Gumpen') inc('pool');
  if (cond.clarity >= 1) inc('murky');
  if (fly.attractor >= 0.5) inc('attr');
  if (save.sel.tippet <= 0.10) inc('ultra');
  if (f.len >= 50) inc('big50');
  if (f.len >= 55) inc('big55');
  inc('lt_' + f.lie.type);                                   // Standplatz: Tasche, Kissen, Kante, Rinne, Gumpen
  if (save.sel.bead >= 4 && !isDry()) inc('tung4');
  if (fly.attractor <= 0.1) inc('natural');
  if (cond.light.id === 'morgen' || cond.light.id === 'abend') inc('dusk');
  st.sumLen = (st.sumLen || 0) + f.len;
  st.streak = (st.streak || 0) + 1; st.best = Math.max(st.best || 0, st.streak);
  if (f.old) st.old++;
  const lg = save.log[f.species] || (save.log[f.species] = { n: 0, max: 0 });
  const rec = f.len > lg.max && lg.n > 0, first = lg.n === 0;
  lg.n++; lg.max = Math.max(lg.max, f.len); save.total++;
  const base = Math.round(f.len * sp.xp), parts = [[sp.name + ' · ' + f.len + ' cm', base]];
  if (!save.set.help) parts.push([T('ohne Bisshilfe'), Math.round(base * 0.25)]);
  if (!save.set.assist) parts.push([T('ohne Führungshilfe'), Math.round(base * 0.15)]);
  if (!save.set.castAid) parts.push([T('ohne Wurfhilfe'), 5]);
  if (!save.set.clear) parts.push([T('ohne Klare Sicht'), 30]);
  if (f.old) parts.push([T('Der Alte'), 300]);
  const mat = 1 + (f.len > 35 ? 1 : 0) + (f.len > 50 ? 1 : 0) + (save.level >= 30 ? 1 : 0);
  save.material += mat;
  const done = [];
  for (const q of rv.quests) if (!save.quests[q.id] && q.test(st)) { save.quests[q.id] = true; done.push(q.text); parts.push([T('Aufgabe erfüllt'), 60 * rv.season]); }
  const xp = parts.reduce((a, p) => a + p[1], 0);
  const ups = addXP(xp);
  let newPage = null;
  const i = save.revier;
  if (rv.quests.every(q => save.quests[q.id])) {
    if (i + 1 < REVIERE.length && save.unlocked < i + 2) { save.unlocked = i + 2; newPage = REVIERE[i + 1].id; seasonGift(); }
    else if (i + 1 === REVIERE.length && !save.pages.includes('ende2')) newPage = 'ende2';
  }
  if (f.old && !save.pages.includes('ende')) { if (newPage && !save.pages.includes(newPage)) save.pages.push(newPage); newPage = 'ende'; }   // erst das Ende von Staffel 1, die neue Seite liegt schon im Tagebuch
  if (newPage && !save.pages.includes(newPage)) save.pages.push(newPage);
  if (save.tut < 4) save.tut = 4;
  // der Fisch bleibt im Bild: er liegt im Kescher am Wasser, bis er zurueckgesetzt wird
  fish = fish.filter(x => x !== f); world.showCatch(f.mesh, f.len, S.px, S.pz, catchWide());
  if (!f.old) respawn.push({ lie: f.lie, t: 100 });
  world.setPolar(save.level >= 2);
  persist();
  if (f.old) sfx.fanfare(); else sfx.chime();
  vibrate([40, 60, 40, 60, 120]);

  let h = `<div class="cs-head"><div class="kicker">${f.old ? T('Der Alte vom Smaragdgumpen') : first ? T('Neue Art im Fangbuch!') : rec ? T('Neuer persönlicher Rekord!') : T('Gefangen')}</div>
    <h2>${sp.name}</h2><div class="latin">${sp.latin}</div>
    <div class="big">${f.len} cm <span>· ${w >= 1000 ? fmt(w / 1000, 2) + ' kg' : w + ' g'}</span></div></div>
    <div class="catch"><canvas id="catchCv" width="640" height="230"></canvas><div class="meta">${fly.name} · ${fmt(save.sel.bead)} mm · ${fmt(save.sel.tippet, 2)} mm · ${T(f.lie.type)}</div>
    <div class="xpl">${parts.map(p => `<div><span>${p[0]}</span><b>+${p[1]}</b></div>`).join('')}<div class="sum"><span>${T('Gesamt')}</span><b>+${xp} XP</b></div></div>
    <div class="chips"><span class="chip">+${mat} ${T('Bindematerial')}</span></div>`;
  for (const q of done) h += `<div class="qdone">✓ ${T('Aufgabe erfüllt:')} ${q}</div>`;
  for (const l of ups) h += `<div class="lvl">${T('Stufe {0}!', l)}${unlocksAt(l).length ? ' ' + T('Neu:') + ' ' + unlocksAt(l).join(', ') : ''}</div>`;
  h += xpBarHtml();
  h += `<button class="primary" data-act="release">${T('Zurücksetzen')}</button></div>`;
  openModal(h, { lock: true, cls: 'sheet' });
  drawFish($('catchCv'), f.species, { seed: f.len * 13 + 1 });
  S.afterRelease = () => {
    world.releaseCatch();
    S.mode = 'idle'; restTip(); updateHUD(); updateTip();
    world.splash(S.px - 0.6, S.pz - 0.6, 1); sfx.splash(S.px - 0.6, S.pz - 0.6, 0.9);
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
  S.aim = null; S.aimU = null;
  const land = onLand();
  if (!land && Math.random() < dt * 6 * f) world.splash(S.px + (Math.random() - 0.5) * 0.3, S.pz + 0.1, 0.3 + f * 0.25);
  const rad = land ? 0.5 + 0.4 * f : 1.5 + 1.3 * f; let spk = 0;   // am Ufer sieht und hört dich der Fisch kaum
  for (const fi of fish) {
    const d = Math.hypot(fi.x - S.px, fi.z - S.pz);
    if (d < rad && fi.spooked <= 0) { fleeFish(fi, 70); spk++; } else if (d < rad + (land ? 0.8 : 2.5)) fi.wary = Math.max(fi.wary, 5);
  }
  if (spk) toast(T('Fisch vergrämt! Langsam waten und Abstand zu den Standplätzen halten.'), 3800);
  if (save.tut === 0 || save.tut === 1) { /* Tipp bleibt */ }
}
function kickSample() {
  if (S.mode !== 'idle') return;
  cond.sampled = true; if (save.cond) save.cond.sampled = true; persist();
  const a = INSECTS[cond.i1], b = INSECTS[cond.i2];
  const pat = (dry, ins) => FLIES.filter(f => !!f.dry === dry && f.imitates.includes(ins)).map(f => f.name + (save.level >= f.level ? '' : ' 🔒')).join(', ');
  const good = pat(false, cond.i1);
  // Trockenfliegen imitieren das erwachsene Insekt derselben Art: aus Larven unter dem Stein werden die Fliegen ueber dem Wasser
  const goodDry = pat(true, cond.i1) || (pat(true, cond.i2) ? T("{0} (für die {1}; das häufigste Futter hier schlüpft nicht)", pat(true, cond.i2), INSECTS[cond.i2].name) : T("keine – dieses Futter lebt nur unter Wasser"));
  openModal(`<h2>${T('Stein umgedreht')}</h2>
    <p>${T('Du hebst einen faustgroßen Stein aus der Strömung und drehst ihn um.')}</p>
    <div class="sample"><b>${T('Massenhaft {0}', a.name)}</b><br><i>${a.hint}</i></div>
    <div class="sample minor"><b>${T('Vereinzelt {0}', b.name)}</b><br><i>${b.hint}</i></div>
    <p>${T("Passende Nymphen:")} <b>${good}</b>${hasDry() ? `<br>${T("Passende Trockenfliegen:")} <b>${goodDry}</b>` : ''}</p>
    ${hasDry() ? `<p class="small">${T("Aus den Larven unter dem Stein schlüpfen die Fliegen über dem Wasser. Steigende Fische fressen genau diese – nimm die Trockenfliege zur selben Insektenart.")}</p>` : ''}
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
  $('xptext').textContent = T('Stufe {0}', save.level) + (save.level >= MAX_LEVEL ? '' : ` · ${save.xp} / ${xpNeed(save.level)} XP`);
  const rm = rigMode();
  $('rig').innerHTML = `<b>${fly.name}</b> ×${save.flies[fly.id] || 0}<br>` + (rm === 'dry' ? `${T(RIGS[2].name)} · ${fmt(save.sel.tippet, 2)} mm` : rm === 'indi' ? `${T(curInd().name)} · ${fmt(save.rig.depth)} m · ${fmt(save.sel.bead)} mm` : `${fmt(save.sel.bead)} mm · ${fmt(save.sel.tippet, 2)} mm`);
  $('rig').innerHTML += `<br><i>${rigTag(rm)}</i>`;
  const sw = $('btnSwap'); sw.classList.toggle('hidden', !hasDry()); sw.querySelector('small').textContent = rigTag(swapTarget()).replace(' Rig', '');   // zeigt, wohin er wechselt
  const open = rv.quests.filter(q => !save.quests[q.id]);
  $('quest').textContent = open.length ? '◦ ' + open[0].text : T('✓ Alle Aufgaben hier erfüllt');
}

let modalOpts = null, modalT = 0;
function openModal(html, opts = {}) {
  modalOpts = opts; modalT = opts.fast ? 0 : performance.now();
  $('modalCard').className = opts.cls || ''; $('modal').classList.toggle('sheetmode', opts.cls === 'sheet');
  $('modalBody').innerHTML = html;
  $('modalClose').style.display = opts.lock ? 'none' : '';
  $('modal').classList.remove('hidden');
  $('modalBody').scrollTop = 0;
}
function askSure(text, yes, act, back) { openModal(`<h2>${yes}</h2><p>${text}</p><button class="ghost danger" data-act="${act}">${yes}</button><button class="primary" data-act="${back}">${T('Abbrechen')}</button>`); }
function closeModal() { $('modal').classList.add('hidden'); modalOpts = null; }
const modalOpen = () => !$('modal').classList.contains('hidden');

function showPage(key, fresh) {
  const p = PAGES.find(p => p.key === key); if (!p) return;
  const idx = REVIERE.findIndex(r => r.id === key);
  let h = `<article class="paper"><div class="date">${p.date}</div><h2>${p.title}</h2>${p.text.map(t => `<p>${t}</p>`).join('')}</article>`;
  const nextS = key === 'ende' ? REVIERE.findIndex(r => r.season === 2) : -1;
  if (fresh && nextS > 0 && save.unlocked > nextS) h += `<div class="lvl">${T('Neue Staffel freigeschaltet:')} ${T(SEASONS[1])}<br>${T('Neu im Rig: Indikator-Rute und Trockenfliegen-Rute.')}</div><button class="primary" data-act="goto" data-i="${nextS}" data-p="1">${T('Staffel beginnen')}</button><button class="ghost" data-act="close">${T('Hier weiterfischen')}</button>`;
  else if (fresh && idx > 0) h += `<div class="lvl">${idx > 0 && REVIERE[idx].season !== REVIERE[idx - 1].season ? T('Neue Staffel freigeschaltet:') + ' ' + T(SEASONS[REVIERE[idx].season - 1]) + '<br>' + (REVIERE[idx].season === 2 ? T('Neu im Rig: Indikator-Rute und Trockenfliegen-Rute.') + '<br>' : '') : ''}${T('Neues Revier freigeschaltet:')} ${REVIERE[idx].name}</div><button class="primary" data-act="goto" data-i="${idx}">${T('Zum Revier wandern')}</button><button class="ghost" data-act="close">${T('Hier weiterfischen')}</button>`;
  else h += `<button class="primary" data-act="close">${key === 'intro' && fresh ? T('Ans Wasser') : T('Schließen')}</button>`;
  openModal(h);
}
function showJournal(tab = 'rev') {
  let h = `<h2>${T('Tagebuch')}</h2><div class="tabs"><button data-act="jtab" data-t="rev" class="${tab === 'rev' ? 'on' : ''}">${T('Reviere & Aufgaben')}</button><button data-act="jtab" data-t="pages" class="${tab === 'pages' ? 'on' : ''}">${T('Opas Seiten')}</button><button data-act="jtab" data-t="log" class="${tab === 'log' ? 'on' : ''}">${T('Fangbuch')}</button></div>`;
  if (tab === 'log') return showLog(h);
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
function showBox() { showRig('fly'); }
// ---------- Rig-Baukasten: oben das Rig als Bild, darunter die Steckplaetze, je Steckplatz eine Auswahl ----------
let rigSlot = null;
const catchWide = () => window.matchMedia('(min-width: 760px), (orientation: landscape)').matches;   // Infoleiste zum Fang steht rechts statt unten
const loWide = () => window.matchMedia('(min-width: 760px)').matches;
const _flyCv = document.createElement('canvas'); _flyCv.width = _flyCv.height = 96;
function drawRigPreview(cv) {
  const c = cv.getContext('2d'), W = cv.width, H = cv.height, rm = rigMode(), fly = curFly(), wy = 104;
  c.clearRect(0, 0, W, H);
  let g = c.createLinearGradient(0, 0, 0, wy); g.addColorStop(0, '#b9d6cf'); g.addColorStop(1, '#7faea2');
  c.fillStyle = g; c.fillRect(0, 0, W, wy);
  g = c.createLinearGradient(0, wy, 0, H); g.addColorStop(0, '#2f8a7c'); g.addColorStop(1, '#0f433f');
  c.fillStyle = g; c.fillRect(0, wy, W, H - wy);
  c.fillStyle = 'rgba(60,44,28,.55)'; c.beginPath(); c.moveTo(0, H); for (let x = 0; x <= W; x += 30) c.lineTo(x, H - 12 - Math.sin(x * 0.021) * 5 - Math.sin(x * 0.057) * 3); c.lineTo(W, H); c.fill();
  c.strokeStyle = 'rgba(255,255,255,.5)'; c.lineWidth = 2; c.beginPath(); c.moveTo(0, wy); c.lineTo(W, wy); c.stroke();
  const lab = (t, x, y, al = 'left') => { c.font = '600 19px system-ui, sans-serif'; c.textAlign = al; c.lineWidth = 4; c.strokeStyle = 'rgba(6,26,24,.75)'; c.strokeText(t, x, y); c.fillStyle = '#fff'; c.fillText(t, x, y); };
  // Rute
  const tx = 168, ty = 22;
  c.lineCap = 'round'; c.strokeStyle = '#3a2a18'; c.lineWidth = 9; c.beginPath(); c.moveTo(-10, 78); c.lineTo(48, 58); c.stroke();
  c.strokeStyle = '#c9a36a'; c.lineWidth = 11; c.beginPath(); c.moveTo(4, 74); c.lineTo(34, 63); c.stroke();
  c.strokeStyle = '#2c3a30'; c.lineWidth = 5; c.beginPath(); c.moveTo(48, 58); c.lineTo(110, 39); c.stroke(); c.lineWidth = 2.5; c.beginPath(); c.moveTo(110, 39); c.lineTo(tx, ty); c.stroke();
  let fx, fy;
  if (rm === 'euro') {
    fx = 560; fy = wy + 62; const ex = 452, ey = wy;
    const P = k => [tx + (ex - tx) * k, ty + (ey - ty) * k];
    const sg = (a, b, col, w) => { c.strokeStyle = col; c.lineWidth = w; c.beginPath(); c.moveTo(...P(a)); c.lineTo(...P(b)); c.stroke(); };
    sg(0, 0.42, 'rgba(240,240,220,.9)', 2.5); sg(0.42, 0.58, '#ff2f7a', 6); sg(0.58, 0.74, '#f8e71c', 6); sg(0.74, 0.88, '#ff2f7a', 6); sg(0.88, 1, 'rgba(240,240,220,.8)', 1.6);
    c.strokeStyle = 'rgba(240,240,220,.7)'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(ex, ey); c.quadraticCurveTo(520, wy + 30, fx, fy); c.stroke();
    lab('Sighter', P(0.6)[0] + 14, P(0.6)[1] - 8);
  } else {
    const col = rm === 'dry' ? '#cfe08a' : '#ff9a3a', ix = rm === 'dry' ? 560 : 452;
    c.strokeStyle = col; c.lineWidth = 5; c.beginPath(); c.moveTo(tx, ty); c.quadraticCurveTo(232, 40, 268, wy); c.bezierCurveTo(300, wy + 5, 330, wy - 4, 368, wy); c.stroke();
    c.strokeStyle = 'rgba(240,240,220,.85)'; c.lineWidth = 1.8; c.beginPath(); c.moveTo(368, wy); c.lineTo(ix, wy); c.stroke();
    if (rm === 'indi') {
      const k = curInd(), r = 9 + k.size * 170, load = curBead().sink * fly.sink, low = load > k.cap ? r * 1.1 : load > k.cap * 0.85 ? r * 0.45 : 0;
      fx = 520; fy = wy + 26 + (save.rig.depth - 0.3) / 2.3 * 74;
      c.strokeStyle = 'rgba(240,240,220,.7)'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(ix, wy); c.quadraticCurveTo(ix + 14, fy - 6, fx, fy); c.stroke();
      c.fillStyle = k.col; c.beginPath(); c.arc(ix, wy - r * 0.35 + low, r, 0, 7); c.fill();
      c.fillStyle = 'rgba(255,255,255,.4)'; c.beginPath(); c.arc(ix - r * 0.3, wy - r * 0.7 + low, r * 0.3, 0, 7); c.fill();
      c.setLineDash([5, 5]); c.strokeStyle = 'rgba(255,255,255,.7)'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(ix - 34, wy + 4); c.lineTo(ix - 34, fy); c.stroke(); c.setLineDash([]);
      lab(fmt(save.rig.depth) + ' m', ix - 42, (wy + fy) / 2 + 8, 'right');
    } else { fx = ix; fy = wy - 6; }
  }
  // Fliege unter der Lupe
  drawFly(_flyCv, fly);
  const R = 50, cx = Math.min(W - R - 8, fx + 64), cy = clamp(rm === 'dry' ? fy - 44 : fy - 10, R + 6, H - R - 6);
  c.strokeStyle = 'rgba(255,255,255,.7)'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(fx, fy); c.lineTo(cx, cy); c.stroke();
  c.fillStyle = '#fff'; c.beginPath(); c.arc(fx, fy, 3.5, 0, 7); c.fill();
  c.save(); c.beginPath(); c.arc(cx, cy, R, 0, 7); c.clip(); c.drawImage(_flyCv, cx - R, cy - R, R * 2, R * 2); c.restore();
  c.strokeStyle = '#e6b84a'; c.lineWidth = 3.5; c.beginPath(); c.arc(cx, cy, R, 0, 7); c.stroke();
  lab(T(RIGS.find(r => r.id === rm).name), 12, H - 22);
}
function showRig(slot) {
  fixSel();
  const rm = rigMode(), rg = RIGS.find(r => r.id === rm), fly = curFly(), tp = curTippet(), bd = curBead(), ind = curInd(), wide = loWide();
  const load = bd.sink * fly.sink, indSt = k => load > k.cap ? 2 : load > k.cap * 0.85 ? 1 : 0;
  const slots = [{ id: 'mode', k: T('Rute'), v: T(rg.name) }];
  if (rm === 'indi') { slots.push({ id: 'ind', k: T('Indikator'), v: T(ind.name), dot: ind.col, bad: indSt(ind) === 2, warn: indSt(ind) === 1 }); slots.push({ id: 'depth', k: T('Tiefe'), v: fmt(save.rig.depth) + ' m' }); }
  slots.push({ id: 'fly', k: T('Fliege'), v: fly.name, s: '×' + (save.flies[fly.id] || 0), bad: !(save.flies[fly.id] > 0) });
  if (rm !== 'dry') slots.push({ id: 'bead', k: T('Perle'), v: fmt(bd.mm) + ' mm' });
  slots.push({ id: 'tippet', k: T('Vorfach'), v: fmt(tp.d, 2) + ' mm' });
  if (!slots.some(s => s.id === slot)) slot = wide ? 'mode' : null;
  rigSlot = slot;
  const bar = (label, v, cls = '') => `<div class="bar ${cls}"><span>${label}</span><i><b style="width:${Math.round(clamp(v, 0.05, 1) * 100)}%"></b></i></div>`;
  const stSink = (bd.sink * fly.sink * tp.sink) / 0.84, stTake = (tp.take - 0.5) / 0.75, stLim = (tp.limit - 0.65) / 0.45;
  let h = `<div class="lo ${slot ? 'detail' : ''}"><div class="lo-top"><h2>${T('Rig')}</h2><canvas id="loPrev" width="660" height="230"></canvas></div>
    <div class="lo-side"><div class="lo-slots">${slots.map(s => `<button class="slot ${slot === s.id ? 'on' : ''} ${s.bad ? 'bad' : s.warn ? 'warn' : ''}" data-act="slot" data-s="${s.id}"><span class="k">${s.dot ? `<i style="background:${s.dot}"></i>` : ''}${s.k}</span><b>${s.v}</b>${s.s ? `<span class="s">${s.s}</span>` : ''}</button>`).join('')}</div>
    <div class="lo-stats bars">${rm !== 'dry' ? bar(T('Sinkrate'), stSink) : ''}${bar(T('Unauffälligkeit'), stTake)}${bar(T('Reißfestigkeit'), stLim)}${bar(T('Reizwert'), fly.attractor)}</div>
    <div class="small lo-hint">${T('Teil antippen, um es zu wechseln.')}</div>
    <button class="primary lo-done" data-act="close">${T('Zurück ans Wasser')}</button></div><div class="lo-opts">`;
  const head = t => `<div class="lo-oh"><button class="mini lo-back" data-act="slot" data-s="">‹ ${T('Rig')}</button><h3>${t}</h3></div>`;
  const opt = (sel, act, attrs, inner, cls = '') => `<div class="opt ${sel ? 'sel' : ''} ${cls}" ${act && !sel ? `data-act="${act}" ${attrs} role="button" tabindex="0"` : ''}>${inner}${sel ? `<span class="eq">✓</span>` : ''}</div>`;
  if (slot === 'mode') {
    h += head(T('Rute & Methode'));
    for (const r of RIGS) { const lk = !rigOpen(r.id); h += opt(rm === r.id, lk ? '' : 'rigmode', `data-v="${r.id}"`, `<div class="fi"><b>${T(r.name)}</b>${lk ? ` <span class="chip">${T('ab Staffel {0}', r.season)}</span>` : ''}<div class="small">${T(r.desc)}</div></div>`, lk ? 'locked' : ''); }
  } else if (slot === 'ind') {
    h += head(T('Indikator')) + `<div class="small">${T('Aktuelle Last: {0}-mm-Perle an {1}.', fmt(save.sel.bead), fly.name)}</div>`;
    for (const k of INDICATORS) {
      const st = indSt(k), lk = save.level < k.level;
      h += opt(save.rig.ind === k.id, lk ? '' : 'ind', `data-id="${k.id}"`, `<span class="dot" style="background:${k.col}"></span><div class="fi"><b>${T(k.name)}</b> ${lk ? `<span class="chip">${T('ab Stufe {0}', k.level)}</span>` : `<span class="chip ${['ok', 'warn', 'bad'][st]}">${[T('trägt'), T('liegt tief'), T('säuft ab')][st]}</span>`}
        <div class="small">${T(k.desc)}</div><div class="bars">${bar(T('Tragkraft'), k.cap / 0.85)}${bar(T('Empfindlichkeit'), (k.sens - 0.7) / 0.6)}${bar(T('Leises Aufsetzen'), 1 - (k.splash - 0.4) / 1.7)}</div></div>`, lk ? 'locked' : '');
    }
  } else if (slot === 'depth') {
    h += head(T('Tiefe unter dem Indikator')) + `<div class="opt sel stat"><div class="fi"><b id="depV">${fmt(save.rig.depth)} m</b><input type="range" id="depR" min="0.3" max="2.6" step="0.1" value="${save.rig.depth}">
      <div class="small">${T('Faustregel: etwa so tief wie das Wasser an der Stelle. Zu kurz – die Nymphe treibt über die Fische hinweg. Zu lang – sie schleift am Grund und bleibt hängen. Die Wassertiefe zeigt dir die Anzeige oben rechts während der Drift.')}</div></div></div>`;
  } else if (slot === 'fly') {
    const dryBox = rm === 'dry';
    h += head(dryBox ? T('Trockenfliegen') : T('Nymphen')) + `<div class="small">${T('Bindematerial:')} <b>${save.material}</b> · ${T('eine Fliege binden kostet {0}', tieCost())}</div>`;
    for (const f of FLIES.filter(f => !!f.dry === dryBox)) {
      const locked = save.level < f.level, n = save.flies[f.id] || 0, sel = fly.id === f.id, hit = cond.sampled && (f.imitates.includes(cond.i1) ? 1 : f.imitates.includes(cond.i2) ? 2 : 0);
      h += opt(sel, !locked && n > 0 ? 'selfly' : '', `data-id="${f.id}"`, `<canvas width="96" height="96" data-fly="${f.id}"></canvas><div class="fi"><b>${f.name}</b> ${locked ? `<span class="chip">${T('ab Stufe {0}', f.level)}</span>` : `<span class="chip ${n ? '' : 'bad'}">×${n}</span>`}${hit ? ` <span class="chip ok">${hit === 1 ? T('Hauptnahrung') : T('Nebennahrung')}</span>` : ''}
        <div class="small">${f.desc}</div><div class="small im">${T('Imitiert:')} ${f.imitates.length ? f.imitates.map(i => f.dry && INSECTS[i].adult ? T(INSECTS[i].adult) : INSECTS[i].name).join(', ') : T('nichts Bestimmtes – eine Reizfliege')}</div>
        <div class="bars">${dryBox ? '' : bar(T('Sinkrate'), (f.sink - 0.7) / 0.65)}${bar(T('Reizwert'), f.attractor)}</div>
        ${locked ? '' : `<button class="mini" data-act="tie" data-id="${f.id}" ${save.material >= tieCost() ? '' : 'disabled'}>${T('Binden (−{0})', tieCost())}</button>`}</div>`, locked ? 'locked' : n ? '' : 'empty');
    }
  } else if (slot === 'bead') {
    h += head(T('Tungstenperle')) + `<div class="small">${T('Schwerer = schneller am Grund, aber mehr Hänger. Faustregel: so leicht wie möglich, so schwer wie nötig.')}</div>`;
    for (const b of BEADS) {
      const lk = save.level < b.level, st = rm === 'indi' && !lk ? indSt({ cap: ind.cap * (bd.sink / b.sink) }) : -1;
      h += opt(bd.mm === b.mm, lk ? '' : 'bead', `data-v="${b.mm}"`, `<span class="dot bead" style="width:${10 + b.mm * 5}px;height:${10 + b.mm * 5}px;flex-basis:${10 + b.mm * 5}px"></span><div class="fi"><b>${fmt(b.mm)} mm</b>${lk ? ` <span class="chip">${T('ab Stufe {0}', b.level)}</span>` : ''}${st >= 0 ? ` <span class="chip ${['ok', 'warn', 'bad'][st]}">${[T('trägt'), T('liegt tief'), T('säuft ab')][st]}</span>` : ''}
        <div class="bars">${bar(T('Sinkrate'), b.sink / 0.54)}${bar(T('Hängerrisiko'), b.sink / 0.54, 'neg')}</div></div>`, lk ? 'locked' : '');
    }
  } else if (slot === 'tippet') {
    h += head(T('Vorfachspitze')) + `<div class="small">${T('Dünner = mehr Bisse und schnelleres Absinken, reißt aber früher.')}</div>`;
    for (const t of TIPPETS) {
      const locked = save.level < t.level;
      h += opt(tp.d === t.d, locked ? '' : 'tippet', `data-v="${t.d}"`, `<span class="dot tip"><u style="height:${Math.round(t.d * 30)}px"></u></span><div class="fi"><b>${fmt(t.d, 2)} mm</b>${locked ? ` <span class="chip">${T('ab Stufe {0}', t.level)}</span>` : ''}
        <div class="bars">${bar(T('Unauffälligkeit'), (t.take - 0.5) / 0.75)}${bar(T('Reißfestigkeit'), (t.limit - 0.65) / 0.45)}${rm === 'dry' ? '' : bar(T('Sinkrate'), (t.sink - 0.75) / 0.5)}</div></div>`, locked ? 'locked' : '');
    }
  }
  h += `${slot ? `<button class="primary lo-ok" data-act="slot" data-s="">${T('Fertig')}</button>` : ''}</div></div>`;
  openModal(h, { cls: 'wide', fast: true });
  drawRigPreview($('loPrev'));
  $('modalBody').querySelectorAll('canvas[data-fly]').forEach(c => drawFly(c, FLIES.find(f => f.id === c.dataset.fly)));
}
function rerig(top) { const sc = $('modalBody').scrollTop; showRig(rigSlot); if (!top) $('modalBody').scrollTop = sc; updateHUD(); }
function showLog(head) {
  let h = (head || `<h2>${T('Fangbuch')}</h2>`) + `<div class="small">${T('Gesamt:')} <b>${save.total}</b> ${T('Fische gefangen und zurückgesetzt')}</div>`;
  for (const id in SPECIES) {
    const sp = SPECIES[id], lg = save.log[id];
    h += `<div class="card"><canvas width="420" height="150" data-sp="${id}" data-sil="${lg ? '' : '1'}"></canvas><div class="row"><div><b>${lg ? sp.name : '???'}</b><div class="small latin">${lg ? sp.latin : T('noch nicht gefangen')}</div></div>${lg ? `<div class="rec">${lg.max} cm<div class="small">${lg.n}× ${T('gefangen')}</div></div>` : ''}</div>${lg ? `<div class="small">${sp.note}</div>` : ''}</div>`;
  }
  openModal(h);
  $('modalBody').querySelectorAll('canvas[data-sp]').forEach(c => drawFish(c, c.dataset.sp, { silhouette: !!c.dataset.sil }));
}
const GQ = [['auto', 'Automatisch'], ['hoch', 'Hoch'], ['mittel', 'Mittel'], ['niedrig', 'Niedrig']];
const gqHint = () => ({
  auto: T('Die Auflösung regelt sich selbst nach, damit es flüssig bleibt. Empfohlen.'),
  hoch: T('Immer volle Auflösung, auch wenn es dabei ruckelt.'),
  mittel: T('Dauerhaft 75 % Auflösung, alle Effekte bleiben an.'),   // gleiche Untergrenze wie der Regler
  niedrig: T('Ohne Schatten, Gras und Spiegelung, 65 % Auflösung.'),
}[save.set.gq] || '');
// ---------- Godmode ----------
// Fuenfzehnmal auf die Ueberschrift "Punkte & Stufen" tippen schaltet ihn ein: alle Reviere,
// hoechste Stufe, volle Fliegendose. Der Spielstand davor wird vorher weggelegt, damit
// "Godmode beenden" ihn unveraendert zurueckbringt - was im Godmode gefangen wurde, zaehlt nicht.
let godTaps = 0, godTapT = 0;
const godOn = () => !!save.god;
function godEnable() {
  if (save.god) return;
  save.god = { level: save.level, xp: save.xp, unlocked: save.unlocked, material: save.material, flies: { ...save.flies } };
  save.level = MAX_LEVEL; save.unlocked = REVIERE.length; save.material = 99;
  for (const f of FLIES) save.flies[f.id] = Math.max(save.flies[f.id] || 0, 9);
  fixSel(); applyRig(); persist(); updateHUD(); updateTip();
  toast(T('Godmode an – alle Reviere und Stufen offen.'), 3600);
}
function godDisable() {
  const g = save.god; if (!g) return;
  save.level = g.level; save.xp = g.xp; save.unlocked = g.unlocked; save.material = g.material; save.flies = { ...g.flies };
  delete save.god;
  fixSel(); applyRig(); persist(); updateHUD(); updateTip();
  toast(T('Godmode aus – dein Spielstand ist wieder wie vorher.'), 3600);
}

// ---------- Mehrspieler ----------
// Kein Server, kein Konto, keine Lobby: ein Spieler eroeffnet, schickt den Einladungscode
// auf beliebigem Weg, der andere schickt den Antwortcode zurueck. Danach laeuft alles
// direkt zwischen den beiden Rechnern.
function showMulti(skipOffer) {
  const st = net.state;
  let h = `<h2>${T('Zu zweit fischen')}</h2>`;
  if (st === 'verbunden') {
    h += `<p class="small"><b>${T('Verbunden.')}</b> ${netName ? T('Mit {0}.', netName) : ''} ${S.mode === 'title' ? T('Drück „Ans Wasser“ – ihr seht einander, sobald ihr im selben Revier steht.') : netRevier === save.revier ? T('Ihr steht im selben Revier.') : T('Ihr seid in verschiedenen Revieren – ihr seht einander erst im selben.')}</p>`;
    if (net.via === 'vermittler') h += `<p class="small">${T('Eure Netze lassen keine direkte Leitung zu – es läuft über den Vermittler. Das geht, ist aber einen Wimpernschlag träger.')}</p>`;
    h += `<button class="ghost danger" data-act="netoff">${T('Verbindung trennen')}</button>`;
  } else {
    h += `<p class="small">${T('Ihr seht einander waten, werfen und drillen. Die Fische bleiben eure eigenen – niemand nimmt dem anderen einen weg.')}</p>`;
    if (netNote) h += `<p class="small"><b>${netNote}</b></p>`;
    h += `<div id="netStep"><p class="small">${T('Kennung wird geholt …')}</p></div>`;
  }
  h += `<button class="primary" data-act="close">${T('Schließen')}</button>`;
  openModal(h);
  if (st !== 'verbunden' && !skipOffer) netOffer();
}

// Kennung beim Vermittler holen und zeigen. Daneben steht immer das Feld fuer die
// Kennung des anderen - wer zuerst eine bekommt, sagt sie durch; es ist egal, wer.
function netOffer() {
  net.hostCode().then(code => netStep(
    `<p class="small">${T('Deine Kennung – sag sie dem anderen durch:')}</p>
     <div class="netbig" id="netOut">${code}</div>
     <button class="primary" data-act="netshare" data-id="netOut">${T('Kennung teilen')}</button>
     <p class="small">${T('Oder tipp hier die Kennung ein, die du bekommen hast:')}</p>
     <input id="netIn" class="netin" maxlength="5" autocapitalize="characters" autocomplete="off" spellcheck="false" placeholder="ABC12">
     <button class="primary" data-act="netgo">${T('Verbinden')}</button>
     <p class="small"><a href="#" data-act="netmanual">${T('Klappt es nicht? Über einen Link verbinden')}</a></p>`))
    .catch(() => netStep(`<p class="small">${T('Der Vermittlungsdienst ist gerade nicht erreichbar.')}</p>
      <button class="primary" data-act="netagain">${T('Noch einmal versuchen')}</button>
      <p class="small"><a href="#" data-act="netmanual">${T('Über einen Link verbinden')}</a></p>`));
}

// Rueckfall ohne fremden Dienst: der alte Weg mit Einladungslink
function netManual() {
  net.host().then(code => netStep(
    `<p class="small">${T('1. Diesen Link verschicken – der andere muss ihn nur antippen.')}</p>` +
    netFeld('netOut', '', netLink('j', code), true) + netShareBtn('netOut', T('Einladung teilen')) +
    `<p class="small">${T('2. Was zurückkommt, hier einfügen – oder eine Einladung, die du selbst bekommen hast:')}</p>` +
    netFeld('netIn', '', '', false) +
    `<button class="primary" data-act="netlink">${T('Verbinden')}</button>`))
    .catch(() => netStep(`<p class="small">${T('Die Verbindung lässt sich hier nicht aufbauen.')}</p>`));
}

// Einer Einladung folgen - egal ob aus dem Feld oder aus einem angetippten Link
function netJoinWith(code) {
  netStep(`<p class="small">${T('Einladung erhalten. Erzeuge Antwort …')}</p>`);
  return net.join(code).then(ans => netStep(
    `<p class="small">${T('Das zurückschicken. Sobald der andere es eingesetzt hat, steht die Verbindung.')}</p>` +
    netFeld('netOut', '', netLink('a', ans), true) + netShareBtn('netOut', T('Antwort teilen'))))
    .catch(() => netStep(`<p class="small">${T('Mit dem Link stimmt etwas nicht.')}</p>`));
}

function netStep(html) { const e = $('netStep'); if (e) e.innerHTML = html; }

// Ein 670-Zeichen-Block laesst sich in einem Chat schlecht verschicken: er wird umgebrochen,
// abgeschnitten oder als Zitat verunstaltet. Als Link ueberlebt er das und der andere muss
// ihn nur antippen - das Spiel oeffnet sich dann gleich an der richtigen Stelle.
const netLink = (kind, code) => location.origin + location.pathname + '#' + kind + '=' + encodeURIComponent(code.replace(/\s+/g, ''));
// Aus dem Feld darf alles kommen: der nackte Code, ein Link, oder ein Link mit Text drumherum
function netCode(raw) {
  const t = (raw || '').trim();
  const m = t.match(/#[ja]=([^\s]+)/);
  if (m) { try { return decodeURIComponent(m[1]); } catch (e) { return m[1]; } }
  return t;
}
// Teilen: am Handy das Systemblatt (dort steht WhatsApp ganz oben), sonst WhatsApp direkt
function netShare(text, title) {
  if (navigator.share) { navigator.share({ title, text }).catch(() => { /* abgebrochen ist kein Fehler */ }); return; }
  window.open('https://wa.me/?text=' + encodeURIComponent(title + '\n' + text), '_blank', 'noopener');
}
const netShareBtn = (id, label) => `<button class="primary" data-act="netshare" data-id="${id}">${label}</button>
  <button class="ghost" data-act="netcopy" data-id="${id}">${T('Link kopieren')}</button>`;

// Wer auf einen geteilten Link tippt, soll nicht erst ein Menue suchen muessen: das Spiel
// macht den Dialog auf und hat den Code schon drin. Die Adresse wird danach bereinigt,
// damit ein Neuladen nicht denselben Code noch einmal einwirft.
function netFromLink() {
  const m = location.hash.match(/^#([ja])=(.+)$/);
  if (!m) return;
  let code; try { code = decodeURIComponent(m[2]); } catch (e) { code = m[2]; }
  history.replaceState(null, '', location.pathname + location.search);
  if (m[1] === 'j') { showMulti(true); netJoinWith(code); }
  else if (net.state === 'warten') { showMulti(); net.accept(code).then(() => netStep(`<p class="small">${T('Verbinde …')}</p>`)); }
  else { showMulti(); netStep(`<p class="small">${T('Diese Antwort gehört zu einem Spiel, das hier nicht mehr offen ist. Der Gastgeber muss sie in sein laufendes Fenster einfügen.')}</p>`); }
}

const netFeld = (id, label, val, ro) => `<label class="slider"><b>${label}</b></label>
  <textarea id="${id}" class="netcode" rows="3" spellcheck="false" ${ro ? 'readonly' : ''} placeholder="${ro ? '' : T('Code hier einfügen')}">${val || ''}</textarea>`;

function showSettings() {
  const tg = (k, label, sub) => `<label class="toggle"><input type="checkbox" data-set="${k}" ${save.set[k] ? 'checked' : ''}><span><b>${label}</b><br><span class="small">${sub}</span></span></label>`;
  openModal(`<h2>${T('Einstellungen')}</h2>
    <h3>${T('Hilfen')}</h3>
    <p class="small">${T('Jede abgeschaltete Hilfe macht das Spiel schwerer und bringt dafür mehr Punkte.')}</p>
    ${tg('help', T('Bisshilfe'), T('Lupe leuchtet und Handy vibriert beim Biss. Ohne Hilfe: +25 % XP.'))}
    ${tg('assist', T('Führungshilfe'), T('Die Rute folgt der Drift ein Stück von selbst; in schnellem Wasser musst du nachhelfen. Ohne: +15 % XP.'))}
    ${tg('castAid', T('Wurfhilfe'), T('Die Fliege landet genau im Ring. Ohne Hilfe gibt der angetippte Punkt nur die Richtung, die Weite kommt aus der Länge deines Zugs – und über der bequemen Weite der Rute streut der Wurf. Ohne: +5 XP pro Fisch.'))}
    ${tg('clear', T('Klare Sicht'), T('Blendet die Spiegelung auf dem Wasser aus, damit du die Fische besser siehst. Ohne: +30 XP pro Fisch.'))}
    <h3>${T('Grafik')}</h3>
    <div class="slider pick"><b>${T('Qualität')}</b>
      <div class="seg">${GQ.map(([v, n]) => `<button data-act="gq" data-v="${v}" class="${save.set.gq === v ? 'on' : ''}">${T(n)}</button>`).join('')}</div>
      <span class="small" id="gqH">${gqHint()}</span></div>
    ${tg('ao', T('Umgebungsverdeckung'), T('Dunkelt ab, wo Dinge aneinanderstoßen – am Fuß der Steine, wo das Ufer ins Wasser läuft. Sieht deutlich echter aus und ist der einzige Posten, der spürbar Leistung kostet.'))}
    <h3>${T('Ton & Vibration')}</h3>
    ${tg('sound', T('Ton'), T('Flussrauschen, Rollenbremse, Schritte und Vogelstimmen.'))}
    <label class="slider"><b>${T("Lautstärke")}</b> <span id="volV">${Math.round(save.set.vol * 100)} %</span><input type="range" id="volR" min="0" max="100" step="5" value="${Math.round(save.set.vol * 100)}"></label>
    ${tg('vib', T('Vibration'), T('Haptik bei Biss und Drill (nur am Handy).'))}
    <h3 data-act="godtap">${T('Punkte & Stufen')}</h3>
    ${godOn() ? `<p class="small"><b>${T('Godmode aktiv.')}</b> ${T('Alle Reviere und die höchste Stufe sind offen. Was du so fängst, zählt nicht für deinen Spielstand.')}</p>
      <button class="ghost danger" data-act="godoff">${T('Godmode beenden')}</button>` : ''}
    ${xpBarHtml()}
    <p class="small">${T('Jeder gelandete Fisch bringt XP: Länge in cm × Artwert.')} ${Object.values(SPECIES).map(s => `${s.name} ${fmt(s.xp)}`).join(' · ')}</p>
    <p class="small">${T('Zuschläge je Fisch: ohne Bisshilfe +25 %, ohne Führungshilfe +15 %, ohne Wurfhilfe +5 XP, ohne Klare Sicht +30 XP.')}</p>
    <p class="small">${T('Jede erfüllte Aufgabe bringt 60 XP mal Staffelnummer, der Alte vom Smaragdgumpen 300 XP. Bis zur nächsten Stufe brauchst du anfangs 220 XP, mit jeder Stufe 60 mehr, ab Stufe 8 gleichbleibend 640.')}</p>
    <p class="small">${T('Neue Ruten kommen mit der Staffel: Indikator und Trockenfliege ab Staffel 2. Fliegen, Perlen, Vorfächer und Indikatoren kommen mit der Stufe.')}</p>
    <details class="lvls"><summary>${T('Alle Stufen anzeigen')}</summary>${Array.from({ length: MAX_LEVEL - 1 }, (_, i) => i + 2).filter(l => unlocksAt(l).length).map(l => `<div class="${save.level >= l ? 'ok' : ''}"><b>${save.level >= l ? '✓' : '🔒'} ${T('Stufe {0}', l)}</b><span>${unlocksAt(l).join(', ')}</span></div>`).join('')}</details>
    <h3>${T('Zu zweit fischen')}</h3>
    <p class="small">${T('Ohne Server, ohne Konto: ihr tauscht einmal einen Code aus und seht euch dann am selben Fluss.')}</p>
    <button class="ghost" data-act="multi">${net.on ? T('Verbunden – Einstellungen') : T('Zu zweit fischen')}</button>
    <h3>${T('Steuerung')}</h3>
    <p class="small">${T('<b>Handy:</b> Finger aufs Wasser, Zielring schieben, loslassen = Wurf · nach unten ziehen = Rute führen · nach oben wischen (oder ANHIEB) = anschlagen · im Drill nach unten ziehen = Druck, seitlich = Seitendruck · Stick unten links = waten · am Himmel oder Ufer ziehen = umschauen.')}</p>
    <p class="small">${T('<b>PC:</b> wie am Handy mit gedrückter Maustaste · Leertaste / Rechtsklick = Anhieb, im Drill halten = Druck · W/A/S/D = waten, im Drill A/D = Seitendruck · Rechtsklick ziehen oder Q/E = umschauen · F = Fliegendose · T = Tagebuch.')}</p>
    <button class="ghost" data-act="toTitle">${T('Zurück zum Hauptmenü')}</button>
    <button class="ghost danger" data-act="reset">${T('Spielstand löschen')}</button>
    <button class="primary" data-act="close">${T('Schließen')}</button>`);
}

$('modalBody').addEventListener('click', e => {
  const b = e.target.closest('[data-act]'); if (!b || b.disabled) return;
  if (performance.now() - modalT < 450) return;   // wer im Drill noch tippt, soll nicht versehentlich den eben erschienenen Dialog bedienen
  const a = b.dataset.act;
  if (a === 'close') closeModal();
  else if (a === 'release') { closeModal(); const f = S.afterRelease; S.afterRelease = null; f && f(); }
  else if (a === 'goto') { closeModal(); const pg = b.dataset.p; travel(+b.dataset.i, () => { enterRevier(+b.dataset.i); toast(REVIERE[save.revier].name + ' – ' + REVIERE[save.revier].sub); if (pg) showPage(REVIERE[save.revier].id, false); }); }
  else if (a === 'jtab') showJournal(b.dataset.t);
  else if (a === 'selfly') { save.sel[flyKey()] = b.dataset.id; applyRig(); persist(); sfx.tick(); rerig(); }
  else if (a === 'slot') { showRig(b.dataset.s || undefined); }
  else if (a === 'rigmode') { if (b.dataset.v !== save.rig.mode) save.rig.last = save.rig.mode; save.rig.mode = b.dataset.v; applyRig(); persist(); sfx.tick(); rerig(); updateTip(); }
  else if (a === 'ind') { save.rig.ind = b.dataset.id; applyRig(); persist(); sfx.tick(); rerig(); }
  else if (a === 'gq') { save.set.gq = b.dataset.v; world.setGfxMode(save.set.gq); persist(); sfx.tick(); $('gqH').textContent = gqHint(); b.parentNode.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); }
  else if (a === 'box') showBox();
  else if (a === 'rig') showRig();
  else if (a === 'tie') { if (save.material >= tieCost()) { save.material -= tieCost(); save.flies[b.dataset.id] = (save.flies[b.dataset.id] || 0) + 1; sfx.tick(); persist(); rerig(); } }
  else if (a === 'bead') { save.sel.bead = +b.dataset.v; persist(); sfx.tick(); rerig(); }
  else if (a === 'tippet') { save.sel.tippet = +b.dataset.v; persist(); sfx.tick(); rerig(); }
  // Rueckfrage im eigenen Dialog: confirm() wird in eingebetteten Browsern und manchen Handy-Ansichten stumm unterdrueckt
  else if (a === 'godtap') {
    const now = performance.now();
    if (now - godTapT > 1800) godTaps = 0;            // Pause heisst: von vorn
    godTapT = now;
    if (godOn()) return;
    if (++godTaps >= 15) { godTaps = 0; godEnable(); showSettings(); }
    else if (godTaps >= 10) { sfx.tick(); toast(T('Noch {0} …', 15 - godTaps), 900); }
  }
  else if (a === 'godoff') { godDisable(); showSettings(); }
  else if (a === 'multi') showMulti();
  else if (a === 'netoff') { net.send('tschuess', {}); net.close(); netRevier = -1; netName = ''; netNote = ''; showMulti(); }
  else if (a === 'netagain') { netNote = ''; showMulti(); }
  // Ein Knopf fuer beide Faelle: Das Feld entscheidet, ob eingeladen oder geantwortet wurde.
  else if (a === 'netgo') {
    const c = (($('netIn') || {}).value || '').trim().toUpperCase();
    if (c.length < 4) return toast(T('Da fehlt die Kennung.'));
    netStep(`<p class="small">${T('Verbinde …')}</p>`);
    net.joinCode(c).catch(() => netStep(`<p class="small">${T('Unter dieser Kennung wartet niemand.')}</p>
      <button class="primary" data-act="netagain">${T('Noch einmal versuchen')}</button>`));
  }
  else if (a === 'netmanual') netManual();
  // Rueckfall: dasselbe Feld nimmt Antwort oder Einladung
  else if (a === 'netlink') {
    const raw = ($('netIn') || {}).value || '', c = netCode(raw);
    if (!c.trim()) return toast(T('Da fehlt der Link.'));
    if (/#j=/.test(raw) || net.state !== 'warten') netJoinWith(c);
    else net.accept(c).then(() => netStep(`<p class="small">${T('Verbinde …')}</p>`)).catch(() => netJoinWith(c));
  }
  else if (a === 'netshare') {
    const e = $(b.dataset.id); if (!e) return;
    // Feld (Link) oder Kennung: beim Code kommt die Adresse des Spiels dazu, damit der
    // andere weiss, wo er sie eintippen soll
    const v = e.value !== undefined ? e.value
      : T('Meine Kennung: {0}', e.textContent.trim()) + '\n' + location.origin + location.pathname;
    netShare(v, T('Komm fischen – Nymphmaniac'));
  }
  else if (a === 'netcopy') {
    const e = $(b.dataset.id); if (!e) return;
    e.select(); navigator.clipboard ? navigator.clipboard.writeText(e.value).then(() => toast(T('Kopiert.'), 1400)) : document.execCommand('copy');
  }
  else if (a === 'toTitle') toTitle();
  else if (a === 'reset') askSure(T('Wirklich den gesamten Spielstand löschen?'), T('Spielstand löschen'), 'reset2', 'settings');
  else if (a === 'reset2') { try { localStorage.removeItem(KEY); } catch (err) { /* */ } location.reload(); }
  else if (a === 'newgame2') { closeModal(); startGame(true); }
  else if (a === 'settings') showSettings();
});
$('modalBody').addEventListener('change', e => {
  const k = e.target.dataset && e.target.dataset.set; if (!k) return;
  save.set[k] = e.target.checked; if (k === 'sound') sfx.setOn(save.set.sound); if (k === 'clear') world.setClearView(save.set.clear); if (k === 'ao') world.setAo(save.set.ao); persist();
});
$('modalBody').addEventListener('input', e => {   // Schieberegler: Lautstaerke und Indikatortiefe
  const el = e.target;
  if (el.id === 'volR') { save.set.vol = +el.value / 100; sfx.setVol(save.set.vol); $('volV').textContent = el.value + ' %'; if (save.set.sound) sfx.tick(); persist(); }
  else if (el.id === 'depR') { save.rig.depth = +el.value; $('depV').textContent = fmt(save.rig.depth) + ' m'; persist(); updateHUD(); const pv = $('loPrev'); if (pv) drawRigPreview(pv); const dv = document.querySelector('.slot[data-s=depth] b'); if (dv) dv.textContent = fmt(save.rig.depth) + ' m'; }
});
$('modalClose').addEventListener('click', closeModal);
$('modal').addEventListener('pointerdown', e => { if (e.target === $('modal') && modalOpts && !modalOpts.lock) closeModal(); });
const canMenu = () => S.mode === 'idle' && !modalOpen();
const lowOk = () => canMenu() && !$('hud').classList.contains('late');   // die Knoepfe unten links sind 2 s nach Drift und Drill gesperrt
$('btnJournal').addEventListener('click', () => canMenu() && showJournal());
const togglePov = () => { save.set.pov = !save.set.pov; world.setPov(save.set.pov); $('btnPov').classList.toggle('on', save.set.pov); persist(); };
$('btnPov').addEventListener('click', togglePov);
$('rig').addEventListener('click', () => lowOk() && showRig());
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
$('btnStone').addEventListener('click', () => lowOk() && kickSample());
$('btnSwap').addEventListener('click', () => lowOk() && swapRig());
$('btnRestart').addEventListener('click', () => { if (S.mode !== 'idle' || Load.on) return; S.yaw = 0; S.pitch = 0; travel(save.revier, () => { enterRevier(save.revier); toast(T('Zurück am Einstieg. Die Fische stehen neu.'), 2600); }); });

// Anhieb / Drill
function pressDown() { sfx.start(); if (S.mode === 'fight') S.hold = true; else if (S.mode === 'drift') strike(); }
function pressUp() { S.hold = false; }
const sb = $('strike');
sb.addEventListener('pointerdown', e => { e.preventDefault(); try { sb.setPointerCapture(e.pointerId); } catch (err) { /* */ } sb.classList.add('down'); pressDown(); });
for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) sb.addEventListener(ev, () => { sb.classList.remove('down'); pressUp(); });
const sbL = $('strikeL');   // zweiter Drillknopf fuer die linke Hand
sbL.addEventListener('pointerdown', e => { e.preventDefault(); try { sbL.setPointerCapture(e.pointerId); } catch (err) { /* */ } sbL.classList.add('down'); pressDown(); });
for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) sbL.addEventListener(ev, () => { sbL.classList.remove('down'); pressUp(); });

// Rutenstick im Drill: direkt bedienbar. Seitlich = Seitendruck, nach unten = Druck auf den Fisch
const rp = $('rodPad'); let rpId = null;
const rpSet = e => { const r = rp.getBoundingClientRect(), Rr = r.width / 2; S.rodX = clamp((e.clientX - r.left - Rr) / (Rr * 0.8), -1, 1) * 1.9; S.press = clamp((e.clientY - r.top - Rr) / (Rr * 0.8), 0, 1); };
rp.addEventListener('pointerdown', e => { if (S.mode !== 'fight') return; e.preventDefault(); rpId = e.pointerId; try { rp.setPointerCapture(e.pointerId); } catch (err) { /* */ } rpSet(e); });
rp.addEventListener('pointermove', e => { if (e.pointerId === rpId && S.mode === 'fight') rpSet(e); });
for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) rp.addEventListener(ev, () => { if (rpId !== null) { rpId = null; S.press = 0; } });

// Zeiger auf der Wasserfläche: zielen, Rute führen, Wisch-Anhieb, analoger Drill
const ptr = { id: null, x: 0, y: 0, ax: 0, ay: 0, hist: [], look: false };
// Umschauen: Ziehen, das nicht auf befischbarem Wasser beginnt (Himmel, Ufer, weit weg), oder Rechtsklick-Ziehen
function isLookStart(e) {
  if (S.mode !== 'idle' && S.mode !== 'landed') return false;
  if (e.button === 2) return true;
  const pt = world.screenToWater(e.clientX, e.clientY);
  return !pt || river.depthAt(pt.x, pt.z) < 0.05 || Math.hypot(pt.x - S.px, pt.z - S.pz) > 15 || pt.z < Z_MIN - 6 || pt.z > Z_MAX + 20;
}
function aimAt(cx, cy, start) {
  if (castAid()) { const pt = world.screenToWater(cx, cy); S.aim = pt ? castTarget(pt) : null; return; }
  if (start) { aimStart(cx, cy); return; }
  if (!S.aimU) return;
  // Seitlich ziehen zielt weiter neu, nach oben ziehen wirft weiter.
  // Die Richtung kommt dabei immer vom Finger - nur die Weite haengt am Zugweg.
  const pt = world.screenToWater(cx, cy);
  if (pt) {
    const h = hand();
    let dx = pt.x - h.x, dz = pt.z - h.z;
    if (dz > 0.3) dz = 0.3;
    const l = Math.hypot(dx, dz);
    if (l > 0.4) S.aimU = { ux: dx / l, uz: dz / l };
  }
  S.aim = castAim(S.aimBase + (S.aimP0.y - cy) * MPP());
}
canvas.addEventListener('pointerdown', e => {
  sfx.start();
  if (modalOpen() || S.mode === 'title') return;
  const lk = isLookStart(e);
  if (e.button === 2 && !lk) return;
  if (ptr.id !== null) { if (S.mode === 'drift') strike(); return; }
  ptr.id = e.pointerId; ptr.x = ptr.ax = e.clientX; ptr.y = ptr.ay = e.clientY; ptr.hist.length = 0;
  try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* */ }
  ptr.look = lk;
  if (!lk && S.mode === 'idle' && !S.wade) aimAt(e.clientX, e.clientY, true);
});
canvas.addEventListener('pointermove', e => {
  if (e.pointerId !== ptr.id) return;
  const dx = e.clientX - ptr.x, dy = e.clientY - ptr.y; ptr.x = e.clientX; ptr.y = e.clientY;
  if (ptr.look) {
    const k = 3.2 / Math.min(window.innerWidth, 900), sg = e.pointerType === 'mouse' ? -1 : 1;   // Finger schiebt die Szene, Maus dreht den Blick
    S.yaw += dx * k * sg; S.pitch = clamp(S.pitch + dy * k * 0.7 * sg, -0.12, 0.55);
  }
  else if (S.mode === 'idle') {
    if (S.wade) return;
    const now = performance.now(), hs = ptr.hist;                     // fuer die Geschwindigkeit des Zugs beim Loslassen
    hs.push({ t: now, y: e.clientY });
    while (hs.length > 1 && now - hs[0].t > 120) hs.shift();
    aimAt(e.clientX, e.clientY, false);
  }
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
  const a = S.aim; S.aim = null; S.aimU = null;
  if (S.mode === 'idle' && a && e.type === 'pointerup') {
    // Geschwindigkeit des Zugs nach oben, in Bildpunkten je Sekunde: ein gerissener Zug klatscht
    const hs = ptr.hist, n0 = hs.length;
    let vy = 0;
    if (n0 > 1) { const dts = (performance.now() - hs[0].t) / 1000; if (dts > 0.015) vy = (hs[0].y - hs[n0 - 1].y) / dts; }
    if (a.ok) doCast(a, vy); else toast(T('Dort ist kein Wasser.'));
  }
  ptr.hist.length = 0;
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
  else if (e.code === 'KeyR') canMenu() && showRig();
  else if (e.code === 'KeyV') togglePov();
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
  if (isEuro()) {
    seg(0, 1.25, 'rgba(240,240,220,.8)', 2);
    seg(0.28 + off, 0.5 + off, '#ff2f7a', 8); seg(0.5 + off, 0.72 + off, '#f8e71c', 8); seg(0.72 + off, 0.92 + off, '#ff2f7a', 8);
    c.fillStyle = 'rgba(28,95,88,.72)'; c.fillRect(0, wy, W, W - wy);
    c.strokeStyle = 'rgba(255,255,255,.6)'; c.lineWidth = 2; c.beginPath(); c.arc(xe, wy, 6 + kick * 8, Math.PI, 0); c.stroke();
  } else {
    // Trockenfliege / Indikator: Blick flach uebers Wasser. Die Schnur liegt auf der Oberflaeche, vorn schwimmt die Fliege bzw. der Bissanzeiger.
    const dryL = isDry(), fx = 122, sy = wy, bite = drift && !!S.bite, drag = drift ? clamp((S.g - 0.25) / 0.6, 0, 1) : 0, bob = Math.sin(S.t * 3.1) * 1.2;
    const lineCol = dryL ? '#cfe08a' : '#ff9a3a';
    // Schnur auf dem Wasser: bei freier Drift in lockeren Boegen, bei Zug gestreckt
    c.lineCap = 'round'; c.strokeStyle = lineCol; c.lineWidth = 3.2; c.beginPath(); c.moveTo(-6, sy + 26);
    c.bezierCurveTo(26, sy + 22 - (1 - drag) * 12, 44, sy + 10 + (1 - drag) * 9, 70, sy + 5);
    c.stroke();
    c.strokeStyle = 'rgba(236,236,220,.75)'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(70, sy + 5); c.quadraticCurveTo(96, sy + 1 + (1 - drag) * 3, fx - 8, sy + 0.5); c.stroke();
    if (drag > 0.05) {   // die Fliege furcht: Kielwellen hinter ihr
      c.strokeStyle = `rgba(255,255,255,${0.25 + drag * 0.6})`; c.lineWidth = 1.6;
      for (const sg of [-1, 1]) { c.beginPath(); c.moveTo(fx + 6, sy + 1); c.lineTo(fx + 22 + drag * 34, sy + sg * (3 + drag * 9) + 2); c.stroke(); }
    }
    if (bite) {          // genommen: die Fliege ist weg, nur der Ring bleibt
      const k = (S.bite.t * 2.2) % 1;
      c.strokeStyle = `rgba(255,255,255,${0.9 - k * 0.7})`; c.lineWidth = 2.4;
      for (const rr of [10 + k * 26, 4 + k * 14]) { c.beginPath(); c.ellipse(fx, sy + 2, rr, rr * 0.3, 0, 0, 7); c.stroke(); }
      if (!dryL) { c.fillStyle = curInd().col; c.globalAlpha = 0.45; c.beginPath(); c.arc(fx, sy + 16, 6 + curInd().size * 90, 0, 7); c.fill(); c.globalAlpha = 1; }   // Indikator unter Wasser gezogen
    } else if (dryL) {
      const f = curFly(), y0 = sy - 3 + bob * 0.4;
      c.save(); c.translate(fx, y0 - 2); c.rotate(drag * 0.25); c.scale(2, 2);
      c.strokeStyle = '#1e1e1e'; c.lineWidth = 2; c.beginPath(); c.moveTo(-9, 1); c.lineTo(10, 1); c.arc(10, 8, 7, -Math.PI / 2, Math.PI * 0.7); c.stroke();   // Haken haengt im Film
      c.strokeStyle = f.col; c.lineWidth = 5; c.beginPath(); c.moveTo(-4, 0); c.lineTo(11, 0); c.stroke();                                                    // Koerper
      c.strokeStyle = '#5a4630'; c.lineWidth = 1; c.beginPath(); for (const a of [-0.3, 0, 0.3]) { c.moveTo(12, 0); c.lineTo(24, a * 12 - 1); } c.stroke();     // Schwanz
      c.strokeStyle = '#7a5a36'; c.lineWidth = 1; c.beginPath(); for (let i = 0; i < 16; i++) { const a = i / 16 * 6.283; c.moveTo(-6, 0); c.lineTo(-6 + Math.cos(a) * 4, Math.sin(a) * 11); } c.stroke();   // Hechel
      c.fillStyle = f.id === 'elk' || f.id === 'stimu' ? '#d8c08a' : '#f6f6f0';
      c.beginPath(); if (f.id === 'elk' || f.id === 'stimu') { c.moveTo(-8, -2); c.quadraticCurveTo(4, -15, 18, -5); c.quadraticCurveTo(4, -5, -8, -2); } else { c.moveTo(-7, -2); c.lineTo(-10, -19); c.lineTo(-3, -19); c.closePath(); } c.fill();   // Fluegel
      c.restore();
    } else {
      const k = curInd(), r = 5 + k.size * 95, yy = sy - r * 0.3 + bob * 0.5 + (S.indSunk ? r * 1.5 : S.indLow ? r * 0.45 : 0) + kick * r * 0.8;
      c.strokeStyle = 'rgba(236,236,220,.6)'; c.lineWidth = 1; c.beginPath(); c.moveTo(fx, yy); c.lineTo(fx + 5, sy + 60); c.stroke();                     // Vorfach hinunter zur Nymphe
      c.fillStyle = k.col; c.beginPath(); c.arc(fx, yy, r, 0, 7); c.fill();
      c.fillStyle = 'rgba(255,255,255,.35)'; c.beginPath(); c.arc(fx - r * 0.3, yy - r * 0.35, r * 0.3, 0, 7); c.fill();
    }
    c.fillStyle = 'rgba(28,95,88,.5)'; c.fillRect(0, wy + 3, W, W - wy);
  }
  c.restore();
}
let lateT = 0;
function updateGauges() {
  const drift = S.mode === 'drift';
  if ($('hud').dataset.mode !== S.mode) {
    const was = $('hud').dataset.mode;
    $('hud').dataset.mode = S.mode;
    // zurueck im Leerlauf nach Wurf, Drift, Drill oder Fang: Stein, Rutenwechsel und Rig-Anzeige kommen erst nach 0,9 s wieder
    if (S.mode === 'idle' && was && was !== 'title') { $('hud').classList.add('late'); clearTimeout(lateT); lateT = setTimeout(() => $('hud').classList.remove('late'), 900); }
  }   // das Layout richtet sich nach der Spielphase
  $('btnRestart').classList.toggle('show', S.mode === 'idle' && S.pz < Z_MIN + 4 && !modalOpen());
  const euroG = isEuro();
  $('read').classList.toggle('off', !drift);
  $('gauge').classList.toggle('off', !drift);
  $('depthG').style.visibility = isDry() ? 'hidden' : '';          // an der Oberflaeche gibt es keine Tiefe zu lesen
  $('gauge').classList.toggle('driftmode', !euroG);
  $('strike').classList.toggle('off', !drift && S.mode !== 'fight');
  // Euro: lose - Kontakt - Zug. Indikator und Trockenfliege: wie natuerlich die Fliege treibt; lose Schnur ist dort richtig, nur Zug schadet
  $('gMark').style.left = (euroG ? 50 + (drift ? S.g : 0) * 46 : 6 + (drift ? clamp(S.g, 0, 1) : 0) * 88) + '%';
  $('gauge').classList.toggle('bad', drift && (euroG ? Math.abs(S.g) > 0.4 : S.g > 0.4));
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
    // Rutenstellung als Stick in der Mitte: seitlich = Seitendruck, nach unten = Druck; die Haelfte, in die du ziehen sollst, leuchtet
    const pad = $('rodPad'), R = pad.offsetWidth / 2 || 52;
    $('rodKnob').style.transform = `translate(${clamp(S.rodX / 1.9, -1, 1) * R * 0.6}px,${clamp(F.p || 0, 0, 1) * R * 0.6}px)`;
    pad.className = F.landing > 0 ? '' : (F.side > 0 ? 'wantR' : 'wantL') + (F.good ? ' good' : '') + ((F.p || 0) < 0.08 && !(F.jump > 0) ? ' wantD' : '');
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
      if (f.spooked > 0) {
        f.spooked -= dt;
        const fl = f.flee;
        if (fl) {
          fl.t += dt;
          const v = Math.min(6, 1.2 + fl.t * 10), z0 = fl.z;
          fl.z += fl.dir * v * dt; fl.off *= Math.exp(-dt * 0.9);
          let x = river.cx(fl.z) + fl.off;
          for (const k of river.rocks) { const ox = x - k.x, oz = fl.z - k.z, d = Math.hypot(ox, oz) || 0.01, rr = rockR(k, ox, oz) + 0.25; if (d < rr) x = k.x + (ox >= 0 ? 1 : -1) * Math.sqrt(Math.max(0, rr * rr - oz * oz)); }   // um Steine herum
          const dxm = x - fl.x; fl.x = x;
          const p = f.mesh.position;
          p.x = fl.x; p.z = fl.z; p.y += (-Math.max(0.22, river.depthAt(fl.x, fl.z) - 0.1) - p.y) * Math.min(1, dt * 4);
          f.mesh.rotation.set(0, Math.atan2(-dxm, -(fl.z - z0)), 0);
          world.animFish(f.mesh, S.t * 16 + f.phase, 1);
          if (fl.t > 3.2 || Math.hypot(fl.x - S.px, fl.z - S.pz) > 24 || fl.z < Z_MIN - 8 || fl.z > Z_MAX + 8) { f.flee = null; f.mesh.visible = false; }
        } else f.mesh.visible = false;
        if (f.spooked <= 0) { f.flee = null; f.mesh.visible = true; placeFish(f); }
        continue;
      }
      if (S.fight && S.fight.f === f) continue;
      f.mesh.visible = true;
      // Steigen: jeder Fisch kommt von Zeit zu Zeit an die Oberflaeche und frisst dort - dann nimmt er nur Trockenfliegen
      if (!f.old && f.riser) {
        // ein Fisch in deiner Naehe bleibt bei dem, was er gerade tut: wer sein Rig auf ihn abstimmt, soll ihn auch so antreffen
        if (Math.hypot(f.x - S.px, f.z - S.pz) > 16) f.riseT -= dt;
        if (f.riseT <= 0) {
          f.rise = !f.rise; f.riseT = f.rise ? 150 + Math.random() * 150 : (200 + Math.random() * 200) / cond.light.act; f.ringT = 0.6;
          if (f.rise && !S.riseHint && !isDry() && S.mode === 'idle' && save.tut >= 4 && Math.hypot(f.x - S.px, f.z - S.pz) < 13) { S.riseHint = true; toast(T("Ein Fisch steigt! Steigende Fische nehmen nur die Trockenfliege – wechsle im Rig die Rute."), 5200); }
        }
        if (f.rise) {
          f.ringT -= dt;
          if (f.ringT <= 0) { f.ringT = 2.5 + Math.random() * 4.5; const dd = Math.hypot(f.x - S.px, f.z - S.pz); if (dd < 24) world.splash(f.x, f.z, 0.42); sfx.rise(f.x, f.z); }
        }
      }
      // Biss: der Fisch schwimmt sichtbar zur Fliege und nimmt sie; verpasst du ihn, kehrt er an seinen Platz zurueck
      const taking = S.mode === 'drift' && S.bite && S.bite.fish === f, n = S.nymph;
      const tdx = taking ? n.x - f.x : 0, tdz = taking ? n.z - f.z : 0, kk = Math.min(1, dt * (taking ? 9 : 2.2));
      f.dx = (f.dx || 0) + (tdx - (f.dx || 0)) * kk; f.dz = (f.dz || 0) + (tdz - (f.dz || 0)) * kk;
      const ty = taking ? (isEuro() || rigMode() === 'indi' ? -Math.max(0.1, n.d) : -0.07) : f.rise ? -0.16 : (f.by === undefined ? -0.3 : f.by);
      f.mesh.position.y += (ty - f.mesh.position.y) * Math.min(1, dt * (taking ? 9 : 1.6));
      const off = Math.hypot(f.dx, f.dz), away = Math.hypot(tdx - f.dx, tdz - f.dz);
      f.mesh.rotation.y = taking && away > 0.08 ? Math.atan2(-(tdx - f.dx), -(tdz - f.dz)) : (f.ry || 0) + Math.sin(S.t * 0.9 + f.phase) * 0.1;
      f.mesh.position.x = f.x + f.dx + Math.sin(S.t * 0.7 + f.phase) * 0.12 * (off > 0.1 ? 0 : 1);
      f.mesh.position.z = f.z + f.dz;
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
  let target, s = 1, bend = 0.04, focus = null, linePath = null;
  if (S.mode === 'cast') {
    const cp = castPose(h, TP);
    TP.x = cp.tip.x; TP.y = cp.tip.y; TP.z = cp.tip.z; target = cp.pull; bend = cp.bend; linePath = cp.pts;
  } else if (S.mode === 'drift') {
    target = { x: S.nymph.x, y: isEuro() ? -S.nymph.d : 0.02, z: S.nymph.z }; s = S.s;
    if (!isEuro()) {   // Flugschnur faellt von der Rutenspitze aufs Wasser und treibt dort mit, lose in einem Bogen stromab
      // Liegt sie ueber einem Stein, bleibt sie dort liegen: der Verlauf geht ueber die Auflagestelle, und die Schnur schmiegt sich an die echte Steinoberflaeche
      const n = S.nymph, h = S.rockHold, N = _cpts.length, slack = h ? 0 : Math.min(1.2, (1 - Math.min(1, S.s)) * 2.2);
      const ax = h ? h.x : n.x, az = h ? h.z : n.z, L1 = Math.hypot(ax - TP.x, az - TP.z), L2 = h ? Math.hypot(n.x - ax, n.z - az) : 0, D = L1 + L2 || 1, td = Math.min(D * 0.45, 2.6);
      for (let i = 0; i < N; i++) {
        const f = i / (N - 1), dist = f * D, q = _cpts[i];
        if (dist <= L1) { const u = L1 > 1e-4 ? dist / L1 : 1; q.set(TP.x + (ax - TP.x) * u, 0.015, TP.z + (az - TP.z) * u); }
        else { const u = (dist - L1) / (L2 || 1); q.set(ax + (n.x - ax) * u, 0.015, az + (n.z - az) * u); }
        if (dist < td) q.y = 0.015 + TP.y * Math.pow(1 - dist / td, 1.7);
        else q.z += Math.sin(Math.PI * (dist - td) / Math.max(0.01, D - td)) * slack * 0.55;
        for (const k of river.rocks) {
          if (Math.hypot(q.x - k.x, q.z - k.z) > (k.vr || k.r * 1.3) + 0.02) continue;
          const top = world.rockTop(k, q.x, q.z);
          if (top !== null && q.y < top + 0.012) q.y = top + 0.012;   // liegt auf dem Stein auf: nicht durch, nicht darunter, nicht schwebend
        }
      }
      linePath = _cpts;
    } bend = 0.05 + Math.min(0.35, S.pullS * 0.3) + (S.bite || S.snag ? 0.25 : 0);
    focus = target;
  } else if (S.mode === 'fight') {
    const p = fightPos(); target = { x: p.x, y: -0.05, z: p.z }; bend = clamp(S.fight.ten, 0.1, 1); focus = p;
  } else {
    target = { x: TP.x + Math.sin(S.t * 1.3) * 0.06, y: Math.max(0.25, TP.y - 1.9), z: TP.z + 0.15 + Math.cos(S.t * 1.1) * 0.05 };
  }
  world.setRig(h, TP, target, s, bend);
  if (linePath) world.setLinePath(linePath);
  { const ind = rigMode() === 'indi' && S.mode === 'drift';
    if (ind) world.nymph.position.set(S.nymph.x, -S.nymph.d, S.nymph.z);
    world.dryFly.visible = isDry() && !(S.mode === 'drift' && S.bite) && S.mode !== 'fight';   // genommen: die Fliege ist von der Oberflaeche verschwunden
    world.setIndicator(ind ? S.nymph : null, S.bite || S.snag ? -0.13 : S.indSunk ? -0.05 : (S.indLow ? 0.005 : 0.03) + Math.sin(S.t * 5) * 0.006 - S.kick * 0.04); }
  world.setAim(S.mode === 'idle' ? S.aim : null);
  if (S.mode === 'drift') {
    const k = isEuro() ? TP.y / (TP.y + S.nymph.d + 1e-4) : 1;
    world.setEntry(TP.x + (S.nymph.x - TP.x) * k, TP.z + (S.nymph.z - TP.z) * k, S.bite && save.set.help ? 'bite' : (isEuro() ? Math.abs(S.g) < 0.4 : S.g < 0.4) ? 'ok' : S.g < 0 ? 'slack' : 'drag');
  } else world.setEntry(0, 0, null);
  S.yaw += (K.tl - K.tr) * 1.7 * dt;
  // Die Kamera folgt von selbst: im Wurf dem Ziel, in der Drift der Fliege, im Drill dem Fisch - weich nachgefuehrt
  {
    const wrap = a => ((a + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
    let tgt = null, part = 0.85, lim = 1.5, rate = 1.6;
    if (S.mode === 'drift') tgt = S.nymph;
    else if (S.mode === 'cast') tgt = { x: S.cast.tx, z: S.cast.tz };
    else if (S.mode === 'fight') { tgt = fightPos(); part = 0.7; lim = 0.95; rate = 2.2; }   // nur teilweise, damit links/rechts fuer den Seitendruck stimmt
    if (tgt && Math.hypot(tgt.x - S.px, tgt.z - S.pz) > 0.8) {
      const want = clamp(wrap(Math.atan2(-(tgt.x - S.px), -(tgt.z - S.pz)) - S.yb) * part, -lim, lim);
      S.yaw = wrap(S.yaw); S.yaw += wrap(want - S.yaw) * Math.min(1, dt * rate);
      if (S.mode === 'fight') S.pitch -= S.pitch * Math.min(1, dt * 3);
    }
  }
  S.yb += (Math.atan(river.dcx(S.pz)) * 0.85 - S.yb) * Math.min(1, dt * 2);   // Grundblick folgt dem Flusslauf
  world.yaw = S.yaw + S.yb; world.pitch = S.pitch;
  // Klang: achtmal je Sekunde meldet das Spiel, wo der Angler steht und wohin er blickt.
  // Daraus ergeben sich Lautstaerke und Seite von Rausche und Wasserfall - oefter muss es nicht sein.
  S.sndT -= dt;
  if (S.sndT <= 0) {
    S.sndT = 0.125;
    const near = sndRocks.length ? sndRocks.filter(q => Math.abs(q.z - S.pz) < 22) : sndRocks;
    sfx.setField({ x: S.px, z: S.pz, yaw: world.yaw, depth: river ? river.depthAt(S.px, S.pz) : 0, riffles: near, falls: world.fallSpots || [] });
  }
  // Mehrspieler: fuenfzehnmal je Sekunde den eigenen Zustand schicken, und den fremden
  // zeichnen - aber nur, wenn die Gegenseite im selben Revier steht.
  if (net.on) {
    S.netT -= dt;
    if (S.netT <= 0) { S.netT = 1 / 15; S.rig = rigMode(); net.sendMove(S, tip3()); }
  }
  {
    const r = net.on && netRevier === save.revier ? net.lerped() : null;
    if (r || world.remote) world.poseRemote(r, dt, r && river ? clamp(river.heightAt(r.px, r.pz), -1.05, 1.2) : 0);
  }
  // Schritte: im Wasser schwappt es, am Ufer knirscht der Kies.
  // Gezaehlt wird die wirklich zurueckgelegte Strecke - im tiefen Wasser kommt der Angler
  // langsamer voran, und genau dann sollen die Schritte auch seltener kommen.
  if (S.walk > 0.1 && S.mode === 'idle') {
    S.stepD += Math.hypot(S.px - S.sx, S.pz - S.sz);
    if (S.stepD > 0.75) { S.stepD = 0; sfx.wade(river ? river.depthAt(S.px, S.pz) : 0); }
  } else S.stepD = 0.55;
  S.sx = S.px; S.sz = S.pz;
  world.lift = S.mode === 'drift' || S.mode === 'cast' ? 1 : S.mode === 'fight' ? 0.7 : 0;
  world.update(dt, S.t, S.px, S.pz, groundY(), focus);
  if (S.mode !== 'title') { drawLupe(); updateGauges(); }
  loadTick();
}

// ---------- Start ----------
// Zurueck ins Hauptmenue, ohne die Seite neu zu laden: Der Spielstand ist laengst
// geschrieben, und eine laufende Mehrspieler-Verbindung bleibt bestehen - von dort aus
// kann man sie im selben Dialog trennen.
function toTitle() {
  closeModal();
  S.mode = 'title'; S.fight = null; S.bite = null; S.cast = null; S.aim = null; S.aimU = null; S.snag = false;
  endFightUI();
  persist();
  $('hud').classList.add('hidden');
  $('title').classList.remove('hidden');
  $('btnNew').classList.remove('hidden');
  updateHUD();
}

function startGame(fresh) {
  sfx.start();
  if (fresh) { save = newSave(); sfx.on = true; }
  const isNew = !save.started;
  save.started = true;
  $('title').classList.add('hidden'); $('hud').classList.remove('hidden');
  S.mode = 'idle';
  // Weiterfischen: die Strecke steht seit dem Laden schon; nur ein neues Spiel baut sie neu (hinter dem Ladebildschirm)
  if (fresh) travel(0, () => { enterRevier(0); if (isNew) showPage('intro', true); });
  else { updateHUD(); updateTip(); if (isNew) showPage('intro', true); }
}
$('btnStart').addEventListener('click', () => startGame(false));
$('btnMulti').addEventListener('click', () => { sfx.start(); showMulti(); });
$('btnNew').addEventListener('click', () => { if (!save.started) startGame(true); else askSure(T('Neues Spiel beginnen? Der alte Spielstand geht verloren.'), T('Neues Spiel'), 'newgame2', 'close'); });
// ---------- Sprache ----------
function applyLang() {
  const set = (sel, de, i = 0) => { const el = document.querySelectorAll(sel)[i]; if (el) el.textContent = T(de); };
  set('.tbox .pre', 'Ein Euro-Nymphing-Abenteuer'); set('.tbox .sub', 'Das Erbe der Smaragda');
  set('.tbox p', 'Opas Rute. Opas Fliegendose. Fünf Strecken eines smaragdgrünen Flusses – und ein Fisch, den er nie landen konnte.');
  set('#btnStart', save.started ? 'Weiterfischen' : 'Ans Wasser'); set('#btnNew', 'Neues Spiel');
  set('#rodPad small', '▼ Druck'); set('#strikeL', 'DRILL');
  set('#gauge .l', 'lose'); set('#gauge .c', 'Kontakt'); set('#gauge .r', 'Zug'); gaugeLabels();
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
  if (!save.v) {   // Reihenfolge vor den zusaetzlichen Folgen: Positionen auf die neue Liste umrechnen
    const OLD = ['wiese', 'rausche', 'aeschenzug', 'klamm', 'gumpen', 'quellbach', 'seeauslauf', 'auwald', 'wehr', 'winterzug', 'muendung'];
    const at = k => Math.max(0, REVIERE.findIndex(r => r.id === OLD[Math.min(k, OLD.length - 1)]));
    save.unlocked = at(save.unlocked - 1) + 1; save.revier = at(save.revier); save.v = 2; ch = true;
  }
  while (save.unlocked < REVIERE.length && REVIERE[save.unlocked - 1].quests.every(q => save.quests[q.id])) {
    const id = REVIERE[save.unlocked].id; save.unlocked++; ch = true;
    if (!save.pages.includes(id)) save.pages.push(id);
  }
  if (save.v < 3) {   // neue Stufenkurve: bisher gesammelte XP auf die 30 Stufen umrechnen
    let tot = save.xp; for (let l = 1; l < save.level; l++) tot += 70 + 50 * l;
    save.level = 1; while (save.level < MAX_LEVEL && tot >= xpNeed(save.level)) { tot -= xpNeed(save.level); save.level++; }
    save.xp = tot; save.v = 3; ch = true;
  }
  if (seasonGift()) ch = true;
  fixSel();
  if (ch) persist();
})();
world.setPov(save.set.pov); $('btnPov').classList.toggle('on', !!save.set.pov);
applyRig();
setLang(getLang()); applyLang();
showLoader(T('Ein Euro-Nymphing-Abenteuer'), '', T('Das Erbe der Smaragda'), T('Fluss, Ufer und Licht werden geladen …'), true);

enterRevier(Math.min(save.revier, save.unlocked - 1), true);
netFromLink();   // mit einem geteilten Link aufgerufen? Dann gleich dorthin
requestAnimationFrame(frame);
window.__nm = { S, world, sfx, net, castAim, aimStart, castBand, get netRevier() { return netRevier; }, get save() { return save; }, get fish() { return fish; }, get river() { return river; }, get cond() { return cond; }, doCast, strike, startFight, landed, enterRevier, hand, fleeFish, startBite, kickSample, closeModal, makeFish, flyMatch, get respawn() { return respawn; } };
