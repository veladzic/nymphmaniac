// Durchspiel-Bot: spielt alle Folgen mit dem jeweils freigeschalteten Geraet durch. Schreibt nichts in den Spielstand.
(async () => {
  Storage.prototype.setItem = function () {}; Storage.prototype.removeItem = function () {};
  const D = await import('/js/data.js');
  const nm = window.__nm, { FLIES, BEADS, TIPPETS, REVIERE, PAGES, MAX_LEVEL } = D;
  const RUNS = window.__simRuns || 8, BLIND = !!window.__simBlind;
  const fresh = () => ({ level: 1, xp: 0, material: 4, flies: { pt: 4, walt: 4 }, sel: { fly: 'pt', dry: 'adams', bead: 3.0, tippet: 0.14 }, rig: { mode: 'euro', ind: 'nz', depth: 1.0 },
    unlocked: 1, revier: 0, quests: {}, log: {}, stats: {}, pages: ['intro'], v: 3, tut: 4, set: { help: true, vib: false, sound: false, vol: 0, assist: true, gfx: true, clear: false }, total: 0, started: true });
  // welcher Fisch bringt welche Aufgabe voran
  const P = {
    r1: f => f.lie.rock, r2: f => f.species === 'regenbogen' && f.len >= 36, b1: f => f.lie.type === 'Gumpen', q3: f => f.lie.type === 'Gumpen',
    b2: (f, st) => !st.sp[f.species], p2: (f, st) => !st.sp[f.species], a1: f => f.species === 'aesche', x1: f => f.species === 'aesche',
    a2: f => f.species === 'aesche' && f.len >= 40, c1: f => f.lie.type === 'Rinne', k2: f => f.species === 'saibling', k3: f => f.len >= 48,
    g1: f => f.species === 'marmorata' && !f.old, g2: f => f.len >= 42 && !f.old, g3: f => f.old, q1: f => f.species === 'saibling',
    f2: f => f.species === 'saibling' && f.len >= 34, f3: f => f.lie.type === 'Kissen', o3: f => f.species === 'bachforelle' && f.len >= 45,
    s1: f => f.species === 'seeforelle', s2: f => f.species === 'seeforelle' && f.len >= 60, u1: f => f.species === 'barbe', u3: f => f.species === 'barbe' && f.len >= 60,
    p1: f => f.lie.type === 'Kante', p3: f => f.len >= 54, v2: f => f.species === 'regenbogen' && f.len >= 52, v3: f => f.len >= 50,
    x2: f => f.species === 'aesche' && f.len >= 46, e2: f => f.lie.type === 'Tasche', e3: f => f.len >= 56, m1: f => f.species === 'huchen',
    m2: f => f.len >= 55, m3: f => f.species === 'huchen' && f.len >= 100,
  };
  const LIETYPE = { b1: 'Gumpen', q3: 'Gumpen', c1: 'Rinne', f3: 'Kissen', p1: 'Kante', e2: 'Tasche', r1: 'rock' };
  const GEAR = { r3: ['bead', 3.5], f1: ['bead', 4.0], e1: ['bead', 4.0], q2: ['bead', 2.5], l1: ['bead', 2.5], a3: ['tippet', 0.12], x3: ['tippet', 0.10] };
  const out = { runs: [], errors: [] };
  const hide = () => nm.closeModal();
  for (let run = 0; run < RUNS; run++) {
    const s = nm.save; for (const k of Object.keys(s)) delete s[k]; Object.assign(s, fresh());
    const R = { rev: [], ups: {}, total: 0 };
    let lastLevel = 1;
    for (let i = 0; i < REVIERE.length; i++) {
      const rv = REVIERE[i];
      if (s.unlocked < i + 1) { out.errors.push(`run ${run}: ${rv.id} nicht freigeschaltet`); break; }
      const rec = { id: rv.id, season: rv.season, lvlIn: s.level, fish: 0, visits: 0, blocked: {}, risers: 0, stock: 0, notes: [] };
      const enter = () => {
        nm.enterRevier(i); rec.visits++; nm.S.mode = 'idle';
        rec.stock = nm.fish.length; rec.risers = Math.max(rec.risers, nm.fish.filter(f => f.riser).length);
        if (rv.season === 1 && i < 7 && s.unlocked < 8 && nm.fish.some(f => f.riser || f.rise)) rec.notes.push('STEIGER in Staffel 1');
        nm.kickSample(); hide();
        if (!nm.cond.sampled || !s.cond.sampled) rec.notes.push('Stein nicht gespeichert');
      };
      enter();
      let guard = 0, idle = 0;
      while (!rv.quests.every(q => s.quests[q.id])) {
        if (++guard > 500) { out.errors.push(`run ${run}: ${rv.id} haengt (${rv.quests.filter(q => !s.quests[q.id]).map(q => q.id)})`); break; }
        const st = s.stats[rv.id] || { sp: {} }, open = rv.quests.filter(q => !s.quests[q.id]).map(q => q.id), c = nm.cond;
        // Bedingungen, die dieser Besuch nicht hergibt -> Strecke neu beginnen
        const lies = [...nm.fish.map(f => f.lie), ...nm.respawn.map(r => r.lie)];
        let again = false;
        if (open.includes('o2') && !['morgen', 'abend'].includes(c.light.id)) again = true;
        if ((open.includes('o1') || open.includes('u2')) && c.clarity < 1) again = true;
        for (const q of open) { const t = LIETYPE[q]; if (t && !lies.some(l => t === 'rock' ? l.rock : l.type === t)) again = true; }
        if (idle > 40) { again = true; idle = 0; }
        if (again) { if (rec.visits > 40) { out.errors.push(`run ${run}: ${rv.id} Bedingung nie erfuellt (${open})`); break; } enter(); continue; }
        // Geraet
        let bead = 3.0, tip = 0.14;
        for (const q of open) { const g = GEAR[q]; if (!g) continue;
          const item = g[0] === 'bead' ? BEADS.find(b => b.mm === g[1]) : TIPPETS.find(t => t.d === g[1]);
          if (s.level >= item.level) { if (g[0] === 'bead') bead = g[1]; else tip = g[1]; }
          else { const b = rec.blocked[q] || (rec.blocked[q] = { need: item.level, at: s.level, fish: 0 }); b.fish++; } }
        s.sel.bead = bead; s.sel.tippet = tip; s.rig.mode = 'euro';
        const have = FLIES.filter(f => !f.dry && s.level >= f.level);
        let cand = have;
        if (open.some(q => ['w3', 's3', 'n2'].includes(q))) cand = have.filter(f => f.imitates.includes(c.i1) || f.imitates.includes(c.i2));
        else if (open.includes('c2')) cand = have.filter(f => f.attractor <= 0.1);
        else if (open.includes('v1')) cand = have.filter(f => f.attractor >= 0.5);
        if (!cand.length) { rec.notes.push('keine passende Fliege fuer ' + open); cand = have; }
        const anyF = nm.fish[0];
        cand.sort((a, b) => nm.flyMatch(b, anyF || { species: '', len: 0 }) - nm.flyMatch(a, anyF || { species: '', len: 0 }));
        const fly = cand[0];
        if (!(s.flies[fly.id] > 0)) { const cost = s.level >= 27 ? 1 : 2; if (s.material >= cost) { s.material -= cost; s.flies[fly.id] = 1; } else rec.notes.push('kein Material fuer ' + fly.id); }
        s.sel.fly = fly.id;
        // Fisch
        const pool = nm.fish.filter(f => !f.old || open.includes('g3'));
        if (!pool.length) { for (const r of nm.respawn.splice(0)) nm.fish.push(nm.makeFish(r.lie)); continue; }
        // blind: der Spieler erkennt Art und Standplatz, aber nicht die genaue Laenge
        const see = f => BLIND ? { lie: f.lie, species: f.species, old: f.old, len: 999 } : f;
        const score = f => open.reduce((a, q) => a + (P[q] ? (P[q](see(f), st) ? 1 : 0) : 0.4), 0) + (BLIND ? Math.random() * 0.01 : f.len / 1000);
        pool.sort((a, b) => score(b) - score(a));
        const f = pool[0];
        if (f.old) { const m = nm.flyMatch(fly, f); rec.oldMatch = m; if (m < 1) rec.notes.push('Der Alte beisst nicht auf ' + fly.id + ' (' + m.toFixed(2) + ')'); }
        if (score(f) < 0.4) idle++; else idle = 0;
        const before = open.length, lv = s.level;
        try { nm.landed(f); } catch (e) { out.errors.push(`run ${run}: landed ${rv.id}: ${e.message}`); break; }
        rec.fish++; R.total++;
        if (document.getElementById('modal').classList.contains('hidden')) rec.notes.push('kein Fangdialog');
        for (let l = lv + 1; l <= s.level; l++) R.ups[l] = rv.id;
        hide(); const ar = nm.S.afterRelease; nm.S.afterRelease = null;
        try { ar && ar(); } catch (e) { out.errors.push(`run ${run}: release ${rv.id}: ${e.message}`); }
        const pg = document.querySelector('#modalBody .paper h2'); if (!document.getElementById('modal').classList.contains('hidden') && pg) (rec.pages = rec.pages || []).push(pg.textContent);
        hide(); nm.S.mode = 'idle';
        for (const r of nm.respawn.splice(0)) nm.fish.push(nm.makeFish(r.lie));   // Standplatz wird neu besetzt (im Spiel nach 100 s)
        // gesperrtes Geraet montiert?
        for (const [k, arr, key] of [['bead', BEADS, 'mm'], ['tippet', TIPPETS, 'd']]) { const it = arr.find(x => x[key] === s.sel[k]); if (!it || it.level > s.level) rec.notes.push('gesperrtes ' + k); }
      }
      rec.lvlOut = s.level; rec.matFlies = Object.values(s.flies).reduce((a, b) => a + b, 0);
      for (const k in rec.blocked) rec.blocked[k] = `braucht Stufe ${rec.blocked[k].need}, war ${rec.blocked[k].at}, ${rec.blocked[k].fish} Fische gewartet`;
      if (i === 6) { rec.gift = !!s.s2gift && s.flies.adams >= 4 && s.flies.elk >= 4; rec.ende = s.pages.includes('ende'); }
      if (i === REVIERE.length - 1) rec.ende2 = s.pages.includes('ende2');
      R.rev.push(rec);
    }
    R.final = { level: s.level, xp: s.xp, unlocked: s.unlocked, pages: s.pages.length, material: s.material, quests: Object.keys(s.quests).length, total: s.total, missingPages: PAGES.map(p => p.key).filter(k => !s.pages.includes(k)) };
    out.runs.push(R);
    await new Promise(r => setTimeout(r, 0));
  }
  window.__sim = out;
})().catch(e => { window.__sim = { fatal: e.message + '\n' + e.stack }; });
