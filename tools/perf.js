// Messplatz fuer die Bildrate. In der Konsole des laufenden Spiels einfuegen:
//   await (await import('./tools/perf.js')).run()
// Misst die Bildzeit bei mehreren Aufloesungen am selben Ort, damit Vorher/Nachher vergleichbar bleibt.
// Die Bildrate haengt fast genau an der Pixelzahl, deshalb wird ueber den Pixelfaktor gemessen, nicht ueber die Fenstergroesse.

const REVIER = 3;      // Gumpen: Wasser, Steine, Wald und Wasserfall im Bild
const WARM = 500;      // ms Vorlauf nach jeder Umstellung
const RUN = 2000;      // ms Messdauer je Punkt

const sleep = ms => new Promise(r => setTimeout(r, ms));

// Zaehlt die wirklich gezeichneten Bilder. Der Median der Abstaende taugt nicht:
// ausgelassene Bilder behalten den Takt des Schirms und sehen dann schnell aus.
function measure(ms) {
  return new Promise(res => {
    const R = window.__nm.world.renderer, W = window.__nm.world;
    let n = 0, calls = 0, tris = 0, t0 = performance.now();
    R.info.autoReset = false;
    const loop = now => {
      W._slow = 0;                                   // die Not-Absenkung soll die Messung nicht verfaelschen
      calls += R.info.render.calls; tris += R.info.render.triangles; R.info.reset();
      n++;
      if (now - t0 < ms) requestAnimationFrame(loop);
      else {
        R.info.autoReset = true;
        const s = (now - t0) / 1000;
        res({ fps: +(n / s).toFixed(1), ms: +(1000 * s / n).toFixed(2), calls: Math.round(calls / n), tris: Math.round(tris / n) });
      }
    };
    requestAnimationFrame(loop);
  });
}

async function point(label, pr) {
  const W = window.__nm.world, R = W.renderer;
  R.setPixelRatio(pr); R.setSize(innerWidth, innerHeight, false); W.makeTargets();
  await sleep(WARM);
  const sz = R.getDrawingBufferSize(new (Object.getPrototypeOf(W.sunDir).constructor)());
  const r = await measure(RUN);
  return { punkt: label, px: `${sz.x}x${sz.y}`, mpx: +(sz.x * sz.y / 1e6).toFixed(2), msaa: W.mainRT.samples, ...r };
}

export async function run(ratios = [1, 1.5, 2]) {
  const n = window.__nm;
  if (n.S.mode === 'title') { document.getElementById('btnStart').click(); await sleep(3500); }
  if (typeof REVIER === 'number') { n.enterRevier(REVIER); await sleep(2500); }
  const W = n.world, pr0 = W.renderer.getPixelRatio(), auto0 = W.rsAuto;
  W.rsAuto = false;                                  // der Aufloesungsregler wuerde sonst gegen die Messung arbeiten
  const rows = [];
  for (const p of ratios) rows.push(await point(`${p}x`, p));
  W.rsAuto = auto0;
  W.renderer.setPixelRatio(pr0); W.renderer.setSize(innerWidth, innerHeight, false); W.makeTargets();
  console.table(rows);
  return rows;
}

// Einzelner Punkt mit einem Schalter dazwischen, z. B. perf.compare(() => world.fxPost = false)
export async function compare(fn, pr = 2) {
  window.__nm.world.rsAuto = false;
  const a = await point('vorher', pr);
  fn();
  const b = await point('nachher', pr);
  console.table([a, b]);
  return [a, b];
}
