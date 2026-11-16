// Spieldaten: Fische, Fliegen, Insekten, Reviere, Aufgaben, Tagebuch

export const SPECIES = {
  bachforelle: { name: 'Bachforelle', latin: 'Salmo trutta fario', min: 18, max: 60, fight: 1.0, shy: 0.5, xp: 1.0,
    note: 'Steht gern in Taschen hinter Steinen und unter überhängenden Ufern.' },
  regenbogen: { name: 'Regenbogenforelle', latin: 'Oncorhynchus mykiss', min: 22, max: 62, fight: 1.3, shy: 0.3, xp: 1.0, jumps: true,
    note: 'Liebt schnelles, sauerstoffreiches Wasser – und springt im Drill.' },
  aesche: { name: 'Äsche', latin: 'Thymallus thymallus', min: 22, max: 52, fight: 0.8, shy: 0.85, xp: 1.3,
    note: 'Die Fahnenträgerin. Steht in gleichmäßigen Zügen über Kies, nimmt zart.' },
  saibling: { name: 'Bachsaibling', latin: 'Salvelinus fontinalis', min: 16, max: 42, fight: 0.9, shy: 0.4, xp: 1.2,
    note: 'Kaltes, schattiges Wasser. Weiß gesäumte Flossen verraten ihn.' },
  barbe: { name: 'Barbe', latin: 'Barbus barbus', min: 35, max: 72, fight: 1.6, shy: 0.6, xp: 1.4,
    note: 'Klebt am Grund. Wer sie hakt, braucht Geduld und ein gutes Vorfach.' },
  marmorata: { name: 'Marmorata', latin: 'Salmo marmoratus', min: 38, max: 82, fight: 1.6, shy: 0.8, xp: 2.0,
    note: 'Die Marmorierte. Königin der smaragdgrünen Flüsse.' },
  seeforelle: { name: "Seeforelle", latin: 'Salmo trutta lacustris', min: 40, max: 88, fight: 1.5, shy: 0.75, xp: 1.6,
    note: "Silbern und schwer. Zieht im Herbst aus dem See in den Auslauf und prüft jede Nymphe zweimal." },
  huchen: { name: "Huchen", latin: 'Hucho hucho', min: 60, max: 125, fight: 2.0, shy: 0.7, xp: 2.4,
    note: "Der Donaulachs. Kupferrot, einzelgängerisch, frisst Forellen – und nimmt nur einen großen Happen tief am Grund." },
};

export const INSECTS = {
  baetis: { adult: "Eintagsfliegen", name: 'Eintagsfliegenlarven', hint: 'schlank, olivbraun, drei Schwanzfäden' },
  caddis: { adult: "Köcherfliegen", name: 'Köcherfliegenlarven', hint: 'im Köcher aus Steinchen, grüner Kopf schaut heraus' },
  stone: { adult: "Steinfliegen", name: 'Steinfliegenlarven', hint: 'groß, flach, zwei Schwanzfäden' },
  gammarus: { name: 'Bachflohkrebse', hint: 'grau-oliv, gekrümmt, wuseln seitlich davon' },
  worm: { name: 'Würmer', hint: 'vom Regen ausgespült' },
};

export const FLIES = [
  { id: 'pt', name: 'Pheasant Tail', level: 1, imitates: ['baetis', 'stone'], attractor: 0, sink: 1.0, col: '#7a4a25', bead: '#d9a531',
    desc: 'Fasanenschwanz, Kupferdraht. Der Klassiker – imitiert fast jede Eintagsfliegenlarve.' },
  { id: 'perdigon', name: 'Perdigon Olive', level: 3, imitates: ['baetis'], attractor: 0.2, sink: 1.25, col: '#6b7a2a', bead: '#c9c9c9',
    desc: 'Glatt lackiert, kein Widerstand. Sinkt wie ein Stein – ideal für schnelles Wasser.' },
  { id: 'walt', name: "Walt's Worm", level: 1, imitates: ['gammarus', 'caddis'], attractor: 0, sink: 0.95, col: '#a89c84', bead: '#d9a531',
    desc: 'Nur Hasenohr-Dubbing. Unscheinbar, struppig – und für Bachflohkrebs-Fresser unwiderstehlich.' },
  { id: 'frenchie', name: 'Frenchie', level: 5, imitates: ['baetis'], attractor: 0.6, sink: 1.0, col: '#7a4a25', bead: '#d9a531', hot: '#ff4fa0',
    desc: 'Pheasant Tail mit pinkem Hotspot. Fällt auf, wenn das Wasser Farbe hat.' },
  { id: 'caddis', name: 'Peeping Caddis', level: 6, imitates: ['caddis'], attractor: 0.1, sink: 0.9, col: '#6a5a40', bead: '#3a3a3a', hot: '#9be03a',
    desc: 'Köcher aus Hasenhaar, chartreuse Kopf. Wenn die Fische Köcher samt Larve fressen.' },
  { id: 'squirmy', name: 'Squirmy Wormy', level: 8, imitates: ['worm'], attractor: 0.9, sink: 0.85, col: '#e0507a', bead: '#d9a531',
    desc: 'Gummiwurm in Pink. Puristen rümpfen die Nase – bei trübem Wasser fängt er trotzdem.' },
  { id: 'stone', name: 'Steinfliegennymphe', level: 10, imitates: ['stone'], attractor: 0.1, sink: 1.1, col: '#3a2a1a', bead: '#3a3a3a', big: 0.35,
    desc: 'Groß, dunkel, mit Gummibeinchen. Ein Happen, für den auch die Großen aufstehen.' },
  { id: 'redtag', name: 'Red Tag Jig', level: 13, imitates: ['gammarus'], attractor: 0.5, sink: 1.0, col: '#2f5a2a', bead: '#d9a531', hot: '#e02020', loves: ['aesche'],
    desc: 'Pfauengras und roter Schwanz. Äschen können nicht widerstehen.' },
  { id: 'mop', name: 'Mop Fly', level: 17, imitates: ['caddis'], attractor: 0.8, sink: 0.9, col: '#b7c94a', bead: '#d9a531',
    desc: "Ein Stück Wischmopp am Haken. Sieht albern aus, treibt wie eine fette Larve – und fängt, wenn nichts anderes geht." },
  { id: 'egg', name: 'Eggstasy', level: 23, imitates: ['gammarus'], attractor: 1.0, sink: 0.8, col: '#f29a3a', bead: '#e8e8e8', loves: ['seeforelle', 'regenbogen'],
    desc: "Ein leuchtendes Fischei aus Chenille. Im kalten Wasser fressen Forellen den Laich der anderen." },
  { id: 'huchenjig', name: 'Huchen-Jig', level: 25, imitates: ['stone'], attractor: 0.6, sink: 1.3, col: '#2a2a2a', bead: '#3a3a3a', big: 0.6, loves: ['huchen'],
    desc: "Schwer, dunkel, lang wie ein Finger. Kein Imitat für Zaghafte – gebaut für den Kolk und das, was darin jagt." },
  // Trockenfliegen: treiben auf der Oberflaeche, nur steigende Fische nehmen sie
  { id: 'adams', dry: true, name: 'Parachute Adams', level: 1, imitates: ['baetis'], attractor: 0.1, sink: 1, col: '#8a8a86', bead: '#8a8a86',
    desc: "Grauer Körper, weißer Sichtflügel. Die eine Trockenfliege, die fast jede schlüpfende Eintagsfliege abdeckt." },
  { id: 'elk', dry: true, name: 'Elk Hair Caddis', level: 1, imitates: ['caddis'], attractor: 0.1, sink: 1, col: '#b89a60', bead: '#b89a60',
    desc: "Flügel aus Hirschhaar, schwimmt wie ein Korken. Für Abende, an denen die Köcherfliegen über dem Wasser tanzen." },
  { id: 'klink', dry: true, name: 'Klinkhåmer', level: 11, imitates: ['caddis', 'baetis'], attractor: 0.2, sink: 1, col: '#a8763a', bead: '#a8763a',
    desc: "Der Körper hängt im Oberflächenfilm wie ein Insekt beim Schlüpfen. Für Fische, die knapp unter der Oberfläche fressen." },
  { id: 'stimu', dry: true, name: 'Stimulator', level: 16, imitates: ['stone'], attractor: 0.4, sink: 1, col: '#d08a2a', bead: '#d08a2a', big: 0.3,
    desc: "Groß, buschig, orange. Imitiert die erwachsene Steinfliege – ein Bissen, für den auch große Forellen hochkommen." },
  { id: 'wulff', dry: true, name: 'Royal Wulff', level: 22, imitates: [], attractor: 0.9, sink: 1, col: '#b02a2a', bead: '#b02a2a',
    desc: "Rot, Pfauengras, weiße Flügel. Imitiert nichts – und wird im schnellen Wasser trotzdem genommen, weil man sie einfach sieht." },
];

// Rig: Rute und Methode
export const RIGS = [
  { id: 'euro', season: 1, name: "Euro-Nymphe", desc: "Nymphenrute 10′ #3. Kurze Schnur, hohe Rute, direkter Kontakt über den Sighter. Am genauesten auf kurze Distanz, bis etwa 7 m." },
  { id: 'indi', season: 2, name: "Indikator", desc: "Allroundrute 9′6″ #4. Die Nymphe hängt unter einem schwimmenden Bissanzeiger. Würfe bis 10 m, lose Schnur schadet nicht – aber die Tiefe stellst du selbst ein, und der Indikator muss die Perle tragen können." },
  { id: 'dry', season: 2, name: "Trockenfliege", desc: "Trockenfliegenrute 9′ #4. Die Fliege treibt auf der Oberfläche. Nur steigende Fische nehmen sie – achte auf die Ringe im Wasser. Würfe bis 12 m. In der Fliegendose siehst du mit dieser Rute nur Trockenfliegen." },
];
// Schwimmende Bissanzeiger. cap = Tragkraft (Perle x Fliege), sens = wie deutlich er Bisse zeigt,
// splash = Scheuchradius beim Aufsetzen in m, drift = wie natuerlich die Nymphe darunter treibt
export const INDICATORS = [
  { id: 'nz', level: 1, name: "New-Zealand-Wolle", col: '#f2f0e4', size: 0.05, cap: 0.30, sens: 1.3, splash: 0.5, drift: 1.0, desc: "Ein Büschel Schafwolle im Silikonschlauch. Landet wie eine Feder und zeigt jedes Zupfen – trägt aber nur leichte Nymphen." },
  { id: 'palsa', level: 1, name: "Palsa-Klebeschaum", col: '#ff7a1a', size: 0.036, cap: 0.24, sens: 1.2, splash: 0.6, drift: 0.97, desc: "Selbstklebender Schaumstreifen ums Vorfach. Winzig und unauffällig, trägt am wenigsten von allen." },
  { id: 'loon', level: 9, name: "Loon Biostrike (Knete)", col: '#ff3fa0', size: 0.04, cap: 0.36, sens: 1.15, splash: 0.7, drift: 0.98, desc: "Schwimmende Knetmasse, die du in beliebiger Größe aufs Vorfach rollst. Empfindlich und leise, mittlere Tragkraft." },
  { id: 'airlock', level: 12, name: "Airlock", col: '#c8f03a', size: 0.055, cap: 0.5, sens: 1.0, splash: 1.2, drift: 0.93, desc: "Schaumkörper mit Schraubmutter, schnell verstellbar. Solider Allrounder für mittlere Gewichte." },
  { id: 'oros', level: 15, name: "Oros (Styroporkugel)", col: '#ffd21a', size: 0.064, cap: 0.62, sens: 0.9, splash: 1.5, drift: 0.9, desc: "Zweiteilige Styroporkugel zum Zusammenschrauben. Trägt auch schwere Perlen, setzt aber hörbar auf." },
  { id: 'thing', level: 18, name: "Thingamabobber", col: '#ff4a2a', size: 0.072, cap: 0.85, sens: 0.8, splash: 2.0, drift: 0.86, desc: "Luftgefüllte Plastikkugel. Trägt alles und geht nie unter – klatscht aber aufs Wasser und zeigt feine Bisse schlecht." },
];

export const BEADS = [
  { mm: 2.5, level: 1, sink: 0.16 }, { mm: 3.0, level: 1, sink: 0.26 }, { mm: 3.5, level: 2, sink: 0.38 }, { mm: 4.0, level: 7, sink: 0.54 },
];

export const TIPPETS = [
  { d: 0.18, level: 20, limit: 1.06, take: 0.58, sink: 0.82 },
  { d: 0.16, level: 1, limit: 0.95, take: 0.72, sink: 0.9 },
  { d: 0.14, level: 1, limit: 0.88, take: 0.9, sink: 1.0 },
  { d: 0.12, level: 4, limit: 0.8, take: 1.06, sink: 1.1 },
  { d: 0.10, level: 14, limit: 0.72, take: 1.2, sink: 1.2 },
];

// Freischaltung: Ruten kommen mit der Staffel (RIGS.season), Fliegen, Perlen, Vorfaecher und Indikatoren mit der Stufe (level).
// Hier stehen nur die Extras, die an keinem Gegenstand haengen.
export const LEVEL_UNLOCKS = {
  2: 'Polbrille – du siehst Fische jetzt deutlicher im Wasser',
  27: 'Fliegen binden kostet nur noch 1 Bindematerial',
  30: 'Ein Bindematerial mehr pro Fisch',
};
export const MAX_LEVEL = 30;
// Staffel 1 endet etwa mit Stufe 8, danach kostet jede Stufe gleich viel; Aufgaben bringen in spaeteren Staffeln mehr
export const xpNeed = lvl => Math.min(160 + 60 * lvl, 640);

export const CLARITY = ['glasklar', 'leicht angetrübt', 'trüb'];
export const LIGHTS = [
  { id: 'morgen', name: 'Morgennebel', act: 1.2, tint: [1.0, 0.92, 0.88], sun: 0.9 },
  { id: 'mittag', name: 'Mittagssonne', act: 0.8, tint: [1, 1, 1], sun: 1.15 },
  { id: 'abend', name: 'Abendlicht', act: 1.25, tint: [1.0, 0.88, 0.74], sun: 0.9 },
  { id: 'bedeckt', name: 'bedeckt', act: 1.1, tint: [0.82, 0.85, 0.88], sun: 0.65 },
];

export const SEASONS = ["Staffel 1 · Opas Tagebuch", "Staffel 2 · Lenis Karte", "Staffel 3 · Herbst im Unterlauf", "Staffel 4 · Der Winterkönig"];

export const REVIERE = [
  {
    id: 'wiese', season: 1, bend: [5, 0.05], name: 'Die Wiesenstrecke', sub: 'Wo alles begann',
    seed: 11, width: 12, depth: 0.75, speed: 0.55, rocks: 16, rockSize: 0.4, pools: 2, poolDepth: 0.45,
    bankSlope: 0.16, bankMax: 2.2, trees: 0.45,
    pal: { grass: 0x7aa64a, rock: 0x8f8d84, gravel: 0xb9ad90, bed: 0x40604e, shallow: 0x86dcc0, deep: 0x1f8270, skyTop: 0x4a98e0, skyBot: 0xd6eef8, fog: 0xcfe8f0 },
    species: { bachforelle: 6, aesche: 3, saibling: 1 }, sizeMul: 0.6, fishN: 9,
    clarity: [0, 0, 1], insects: ['baetis', 'gammarus', 'caddis'],
    quests: [
      { id: 'w1', text: 'Fange deinen ersten Fisch', test: s => s.n >= 1 },
      { id: 'w2', text: 'Fange 4 Fische in der Wiesenstrecke', test: s => s.n >= 4 },
      { id: 'w3', text: 'Drehe einen Stein um und fange einen Fisch auf die passende Nymphe', test: s => s.matched >= 1 },
    ],
  },
  {
    id: 'rausche', season: 1, bend: [3, 0.07], name: 'Die Rausche', sub: 'Taschenwasser',
    seed: 23, width: 12, depth: 0.85, speed: 1.15, rocks: 46, rockSize: 0.75, pools: 1, poolDepth: 0.5,
    bankSlope: 0.3, bankMax: 4, trees: 0.8,
    pal: { grass: 0x5f8f45, rock: 0x7d7f80, gravel: 0xa9a393, bed: 0x3a5a50, shallow: 0x8fe0d0, deep: 0x1a7a74, skyTop: 0x3f8fd8, skyBot: 0xcfe8f5, fog: 0xc4e0ea },
    species: { bachforelle: 5, regenbogen: 5, saibling: 1 }, sizeMul: 0.75, fishN: 12,
    clarity: [0, 1, 1], insects: ['baetis', 'stone', 'caddis'],
    quests: [
      { id: 'r1', text: 'Fange 4 Fische an Steinen – davor, daneben oder dahinter', test: s => s.pocket >= 4 },
      { id: 'r2', text: 'Fange eine Regenbogenforelle ab 36 cm', test: s => (s.spMax.regenbogen || 0) >= 36 },
      { id: 'r3', text: 'Fange einen Fisch mit 3,5-mm-Perle oder schwerer', test: s => s.heavy >= 1 },
    ],
  },
  {
    id: 'muehlbach', season: 1, name: "Der Mühlbach", sub: "Schmal und verwachsen",
    seed: 29, width: 8.5, depth: 0.6, speed: 0.7, rocks: 14, rockSize: 0.4, pools: 3, poolDepth: 0.45, bend: [4.5, 0.075],
    bankSlope: 0.25, bankMax: 2.4, trees: 0.9, leafShare: 0.7,
    pal: { grass: 0x6f9c48, rock: 0x8a8880, gravel: 0xb4a88c, bed: 0x3e5e4c, shallow: 0x88dcc2, deep: 0x1e8070, skyTop: 0x4a98e0, skyBot: 0xd6eef8, fog: 0xcce6ee },
    species: { bachforelle: 7, saibling: 2, aesche: 1 }, sizeMul: 0.65, fishN: 10,
    clarity: [0, 0, 1], insects: ['baetis', 'caddis', 'gammarus'],
    quests: [
      { id: 'b1', text: "Fange 3 Fische in Gumpen", test: s => (s.pool || 0) >= 3 },
      { id: 'b2', text: "Fange 2 verschiedene Arten", test: s => Object.keys(s.sp).length >= 2 },
      { id: 'b3', text: "Lande 3 Fische in Folge, ohne einen zu verlieren", test: s => (s.best || 0) >= 3 },
    ],
  },
  {
    id: 'aeschenzug', season: 1, bend: [6.5, 0.04], name: 'Der Äschenzug', sub: 'Feines Zeug',
    seed: 37, width: 13, depth: 1.05, speed: 0.75, rocks: 10, rockSize: 0.45, pools: 3, poolDepth: 0.5,
    bankSlope: 0.14, bankMax: 2.0, trees: 0.35,
    pal: { grass: 0x8aa850, rock: 0x959388, gravel: 0xc4b896, bed: 0x4a6a55, shallow: 0x9ae6c8, deep: 0x23887a, skyTop: 0x5aa2e2, skyBot: 0xe2f2f8, fog: 0xd8ecf0 },
    species: { aesche: 7, bachforelle: 2, barbe: 2 }, sizeMul: 0.85, fishN: 11,
    clarity: [0, 0, 0, 1], insects: ['gammarus', 'baetis', 'caddis'],
    quests: [
      { id: 'a1', text: 'Fange 3 Äschen', test: s => (s.sp.aesche || 0) >= 3 },
      { id: 'a2', text: 'Fange eine Äsche ab 40 cm', test: s => (s.spMax.aesche || 0) >= 40 },
      { id: 'a3', text: 'Fange einen Fisch am 0,12er Vorfach oder feiner', test: s => s.fine >= 1 },
    ],
  },
  {
    id: 'kiesbank', season: 1, name: "Die Kiesbank", sub: "Flach und klar",
    seed: 43, width: 15, depth: 0.6, speed: 0.65, rocks: 6, rockSize: 0.35, pools: 2, poolDepth: 0.5, bend: [7, 0.04],
    bankSlope: 0.1, bankMax: 1.6, trees: 0.25,
    pal: { grass: 0x86a84e, rock: 0x98968a, gravel: 0xc8bc9a, bed: 0x4e6e58, shallow: 0xa0e8cc, deep: 0x268c7c, skyTop: 0x5aa2e2, skyBot: 0xe2f2f8, fog: 0xd8ecf0 },
    species: { aesche: 5, bachforelle: 4, barbe: 1 }, sizeMul: 0.8, fishN: 11,
    clarity: [0, 0, 0], insects: ['baetis', 'gammarus'],
    quests: [
      { id: 'c1', text: "Fange 4 Fische in der Rinne", test: s => (s.lt_Rinne || 0) >= 4 },
      { id: 'c2', text: "Fange 3 Fische auf eine unauffällige Nymphe (Pheasant Tail, Walt's Worm, Peeping Caddis)", test: s => (s.natural || 0) >= 3 },
      { id: 'c3', text: "Fange zusammen 2 Meter Fisch", test: s => (s.sumLen || 0) >= 200 },
    ],
  },
  {
    id: 'klamm', season: 1, bend: [3.5, 0.06], name: 'Die Klamm', sub: 'Tief und schnell',
    seed: 51, width: 11, depth: 1.45, speed: 1.3, rocks: 26, rockSize: 0.9, pools: 3, poolDepth: 0.7,
    bankSlope: 3.2, bankMax: 22, trees: 0.5, cliff: true,
    pal: { grass: 0x4f7a40, rock: 0x6c6e72, gravel: 0x9a968c, bed: 0x2f4d48, shallow: 0x7ad8cc, deep: 0x126a6c, skyTop: 0x3a86cc, skyBot: 0xbfdcec, fog: 0xa8c8d4 },
    species: { bachforelle: 5, saibling: 3, regenbogen: 2, marmorata: 1 }, sizeMul: 0.95, fishN: 11,
    clarity: [0, 1, 2], insects: ['stone', 'caddis', 'worm', 'baetis'],
    quests: [
      { id: 'k1', text: 'Fange 5 Fische in der Klamm', test: s => s.n >= 5 },
      { id: 'k2', text: 'Fange einen Bachsaibling', test: s => (s.sp.saibling || 0) >= 1 },
      { id: 'k3', text: 'Fange einen Fisch ab 48 cm', test: s => s.maxLen >= 48 },
    ],
  },
  {
    id: 'gumpen', season: 1, bend: [4.5, 0.05], name: 'Der Smaragdgumpen', sub: 'Das Reich des Alten',
    seed: 77, width: 13, depth: 1.2, speed: 0.8, rocks: 18, rockSize: 0.8, pools: 2, poolDepth: 0.6,
    bigPool: { x: -1.6, z: -34, r: 4.2, d: 0.95 },
    bankSlope: 0.5, bankMax: 7, trees: 1.0,
    pal: { grass: 0x55884a, rock: 0x7a7c7a, gravel: 0xb0ac9a, bed: 0x2a5a50, shallow: 0x7ae8c8, deep: 0x0d7a66, skyTop: 0x3d8ad4, skyBot: 0xcae6f2, fog: 0xbcdde6 },
    species: { marmorata: 5, bachforelle: 3, aesche: 2, barbe: 1 }, sizeMul: 1.0, fishN: 11,
    clarity: [0, 0, 1], insects: ['stone', 'baetis', 'gammarus'],
    quests: [
      { id: 'g1', text: 'Fange eine Marmorata', test: s => (s.sp.marmorata || 0) >= 1 },
      { id: 'g2', text: 'Fange 3 Fische ab 42 cm', test: s => s.big42 >= 3 },
      { id: 'g3', text: 'Lande den Alten – und lass ihn wieder schwimmen', test: s => s.old >= 1 },
    ],
  },
  {
    id: 'quellbach', season: 2, name: "Der Quellbach", sub: "Klein und kalt",
    seed: 91, width: 9, depth: 0.5, speed: 0.95, rocks: 40, rockSize: 0.45, pools: 4, poolDepth: 0.45, bend: [4, 0.08],
    bankSlope: 0.9, bankMax: 8, trees: 0.3, leafShare: 0.05,
    pal: { grass: 0x6f9a4a, rock: 0x86888a, gravel: 0xb4ae9c, bed: 0x3f5f52, shallow: 0x9aeadc, deep: 0x1f8a7e, skyTop: 0x3f8fd8, skyBot: 0xcfe8f5, fog: 0xc8e2ec },
    species: { saibling: 6, bachforelle: 4 }, sizeMul: 0.55, fishN: 12,
    clarity: [0, 0, 0], insects: ['stone', 'baetis', 'caddis'],
    quests: [
      { id: 'q1', text: "Fange 4 Bachsaiblinge", test: s => (s.sp.saibling || 0) >= 4 },
      { id: 'q2', text: "Fange 3 Fische mit der leichten 2,5-mm-Perle", test: s => (s.light || 0) >= 3 },
      { id: 'q3', text: "Fange 3 Fische in Gumpen", test: s => (s.pool || 0) >= 3 },
    ],
  },
  {
    id: 'wasserfall', season: 2, name: "Der Wasserfallgumpen", sub: "Tief unterm Sturz",
    seed: 97, width: 10, depth: 1.0, speed: 0.9, rocks: 22, rockSize: 0.8, pools: 2, poolDepth: 0.7, bend: [3, 0.07],
    bigPool: { x: -1, z: -40, r: 3.6, d: 1.0 },
    bankSlope: 2.6, bankMax: 16, trees: 0.4, cliff: true,
    pal: { grass: 0x55803f, rock: 0x707276, gravel: 0x9c988e, bed: 0x304e48, shallow: 0x7edacc, deep: 0x146c6c, skyTop: 0x3a86cc, skyBot: 0xbfdcec, fog: 0xacccd8 },
    species: { saibling: 5, bachforelle: 4, regenbogen: 2 }, sizeMul: 0.8, fishN: 11,
    clarity: [0, 0, 1], insects: ['stone', 'caddis', 'baetis'],
    quests: [
      { id: 'f1', text: "Fange 3 Fische mit der 4-mm-Perle", test: s => (s.tung4 || 0) >= 3 },
      { id: 'f2', text: "Fange einen Bachsaibling ab 34 cm", test: s => (s.spMax.saibling || 0) >= 34 },
      { id: 'f3', text: "Fange 2 Fische im Kissen vor einem Stein", test: s => (s.lt_Kissen || 0) >= 2 },
    ],
  },
  {
    id: 'moorbach', season: 2, name: "Der Moorbach", sub: "Dunkles Wasser",
    seed: 109, width: 10, depth: 0.9, speed: 0.45, rocks: 8, rockSize: 0.4, pools: 4, poolDepth: 0.6, bend: [7, 0.06],
    bankSlope: 0.12, bankMax: 1.5, trees: 0.35, leafShare: 0.3, ground: [1.12, 0.95, 0.8],
    pal: { grass: 0x7a8c48, rock: 0x7c786c, gravel: 0x9c8c6a, bed: 0x4a4028, shallow: 0xb4a468, deep: 0x5c4a24, skyTop: 0x4a90d4, skyBot: 0xd4e8f0, fog: 0xccdcd8 },
    species: { saibling: 5, bachforelle: 5 }, sizeMul: 0.85, fishN: 10,
    clarity: [1, 1, 2], insects: ['worm', 'caddis', 'gammarus'],
    quests: [
      { id: 'o1', text: "Fange 5 Fische bei angetrübtem oder trübem Wasser", test: s => (s.murky || 0) >= 5 },
      { id: 'o2', text: "Fange 2 Fische im Morgennebel oder Abendlicht", test: s => (s.dusk || 0) >= 2 },
      { id: 'o3', text: "Fange eine Bachforelle ab 45 cm", test: s => (s.spMax.bachforelle || 0) >= 45 },
    ],
  },
  {
    id: 'seeauslauf', season: 2, name: "Der Seeauslauf", sub: "Wo die Großen ziehen",
    seed: 104, width: 14, depth: 1.3, speed: 0.5, rocks: 8, rockSize: 0.6, pools: 4, poolDepth: 0.7, bend: [7, 0.035],
    bankSlope: 0.2, bankMax: 2.5, trees: 0.6,
    pal: { grass: 0x7aa64a, rock: 0x8f8d84, gravel: 0xbcb294, bed: 0x3c6252, shallow: 0x8fe2cc, deep: 0x1a7f72, skyTop: 0x4a98e0, skyBot: 0xd6eef8, fog: 0xcfe8f0 },
    species: { seeforelle: 4, aesche: 3, bachforelle: 3, saibling: 1 }, sizeMul: 0.9, fishN: 11,
    clarity: [0, 0, 1], insects: ['gammarus', 'caddis', 'baetis'],
    quests: [
      { id: 's1', text: "Fange eine Seeforelle", test: s => (s.sp.seeforelle || 0) >= 1 },
      { id: 's2', text: "Fange eine Seeforelle ab 60 cm", test: s => (s.spMax.seeforelle || 0) >= 60 },
      { id: 's3', text: "Fange 6 Fische auf die passende Nymphe (vorher Stein umdrehen)", test: s => s.matched >= 6 },
    ],
  },
  {
    id: 'auwald', season: 3, name: "Der Auwald", sub: "Trübes Wasser, graue Schatten",
    seed: 131, width: 14, depth: 1.1, speed: 0.6, rocks: 12, rockSize: 0.5, pools: 3, poolDepth: 0.6, bend: [8, 0.045],
    bankSlope: 0.15, bankMax: 1.8, trees: 1.1, leafShare: 0.8, leaf: [1.75, 0.9, 0.32], veg: [1.3, 0.95, 0.55], ground: [1.25, 0.92, 0.7],
    pal: { grass: 0x9a9048, rock: 0x8a877c, gravel: 0xb8aa88, bed: 0x4a5f48, shallow: 0x9ed8b4, deep: 0x2a7a62, skyTop: 0x5a9ad8, skyBot: 0xe2eef2, fog: 0xd8e4e0 },
    species: { barbe: 5, aesche: 3, bachforelle: 2, regenbogen: 1 }, sizeMul: 0.95, fishN: 11,
    clarity: [1, 1, 2], insects: ['worm', 'gammarus', 'caddis'],
    quests: [
      { id: 'u1', text: "Fange 4 Barben", test: s => (s.sp.barbe || 0) >= 4 },
      { id: 'u2', text: "Fange 4 Fische bei angetrübtem oder trübem Wasser", test: s => (s.murky || 0) >= 4 },
      { id: 'u3', text: "Fange eine Barbe ab 60 cm", test: s => (s.spMax.barbe || 0) >= 60 },
    ],
  },
  {
    id: 'altarm', season: 3, name: "Der Altarm", sub: "Stilles Wasser",
    seed: 137, width: 15, depth: 1.3, speed: 0.35, rocks: 6, rockSize: 0.5, pools: 5, poolDepth: 0.7, bend: [8, 0.05],
    bankSlope: 0.12, bankMax: 1.6, trees: 1.0, leafShare: 0.8, leaf: [1.6, 0.92, 0.38], veg: [1.25, 0.96, 0.6], ground: [1.2, 0.94, 0.74],
    pal: { grass: 0x98904a, rock: 0x88857a, gravel: 0xb4a684, bed: 0x485c46, shallow: 0x9cd6b0, deep: 0x2a7860, skyTop: 0x5a9ad8, skyBot: 0xe2eef2, fog: 0xd8e4e0 },
    species: { barbe: 5, aesche: 2, bachforelle: 2, seeforelle: 1 }, sizeMul: 1.0, fishN: 11,
    clarity: [0, 1, 1], insects: ['gammarus', 'worm', 'caddis'],
    quests: [
      { id: 'l1', text: "Fange 4 Fische mit der leichten 2,5-mm-Perle", test: s => (s.light || 0) >= 4 },
      { id: 'l2', text: "Fange zusammen 3 Meter Fisch", test: s => (s.sumLen || 0) >= 300 },
      { id: 'l3', text: "Lande 4 Fische in Folge, ohne einen zu verlieren", test: s => (s.best || 0) >= 4 },
    ],
  },
  {
    id: 'bruecke', season: 3, name: "Die Steinbrücke", sub: "Zwischen den Pfeilern",
    seed: 143, width: 13, depth: 1.3, speed: 1.0, rocks: 24, rockSize: 1.1, pools: 3, poolDepth: 0.7, bend: [4, 0.05],
    bankSlope: 0.5, bankMax: 4, trees: 0.6, leafShare: 0.6, leaf: [1.6, 0.92, 0.38], veg: [1.25, 0.96, 0.6], ground: [1.2, 0.94, 0.74],
    pal: { grass: 0x8c8c4a, rock: 0x7c7e80, gravel: 0xaaa292, bed: 0x365c52, shallow: 0x90e0ce, deep: 0x187670, skyTop: 0x4a90d4, skyBot: 0xd4e8f0, fog: 0xc8dce0 },
    species: { regenbogen: 4, bachforelle: 4, barbe: 2, aesche: 2 }, sizeMul: 0.95, fishN: 12,
    clarity: [0, 1, 2], insects: ['stone', 'caddis', 'baetis'],
    quests: [
      { id: 'p1', text: "Fange 3 Fische an der Strömungskante neben einem Stein", test: s => (s.lt_Kante || 0) >= 3 },
      { id: 'p2', text: "Fange 4 verschiedene Arten", test: s => Object.keys(s.sp).length >= 4 },
      { id: 'p3', text: "Fange einen Fisch ab 54 cm", test: s => s.maxLen >= 54 },
    ],
  },
  {
    id: 'wehr', season: 3, name: "Das alte Wehr", sub: "Weißes Wasser",
    seed: 149, width: 13, depth: 1.5, speed: 1.35, rocks: 34, rockSize: 1.0, pools: 2, poolDepth: 0.8, bend: [3, 0.06],
    bankSlope: 0.6, bankMax: 5, trees: 0.7, leafShare: 0.6, leaf: [1.5, 0.95, 0.42], veg: [1.2, 0.97, 0.65], ground: [1.15, 0.95, 0.78],
    pal: { grass: 0x8a8a48, rock: 0x7a7c7e, gravel: 0xa8a090, bed: 0x345a50, shallow: 0x8fe0d0, deep: 0x16746e, skyTop: 0x4a90d4, skyBot: 0xd4e8f0, fog: 0xc8dce0 },
    species: { regenbogen: 6, bachforelle: 3, barbe: 2, marmorata: 1 }, sizeMul: 1.0, fishN: 12,
    clarity: [0, 1, 2], insects: ['stone', 'worm', 'baetis'],
    quests: [
      { id: 'v1', text: "Fange 5 Fische auf eine Reizfliege (Frenchie, Squirmy, Red Tag, Mop Fly)", test: s => (s.attr || 0) >= 5 },
      { id: 'v2', text: "Fange eine Regenbogenforelle ab 52 cm", test: s => (s.spMax.regenbogen || 0) >= 52 },
      { id: 'v3', text: "Fange 3 Fische ab 50 cm", test: s => (s.big50 || 0) >= 3 },
    ],
  },
  {
    id: 'winterzug', season: 4, name: "Der Winterzug", sub: "Raureif und feines Zeug",
    seed: 167, width: 13, depth: 1.2, speed: 0.55, rocks: 9, rockSize: 0.5, pools: 4, poolDepth: 0.6, bend: [6, 0.04],
    bankSlope: 0.18, bankMax: 2.4, trees: 0.5, leafShare: 0, veg: [1.25, 1.02, 0.8], ground: [1.4, 1.02, 1.35],
    pal: { grass: 0xa8b09a, rock: 0x9a9c9e, gravel: 0xc4c0b4, bed: 0x4a6a60, shallow: 0xa8e8dc, deep: 0x2a8a80, skyTop: 0x7aa8d8, skyBot: 0xe8f0f4, fog: 0xe0e8ec },
    species: { aesche: 8, bachforelle: 2 }, sizeMul: 1.0, fishN: 11,
    clarity: [0, 0, 0], insects: ['gammarus', 'baetis'],
    quests: [
      { id: 'x1', text: "Fange 5 Äschen", test: s => (s.sp.aesche || 0) >= 5 },
      { id: 'x2', text: "Fange eine Äsche ab 46 cm", test: s => (s.spMax.aesche || 0) >= 46 },
      { id: 'x3', text: "Fange 3 Fische am 0,10er Vorfach", test: s => (s.ultra || 0) >= 3 },
    ],
  },
  {
    id: 'eisrinne', season: 4, name: "Die Eisrinne", sub: "Eng, schnell, bitterkalt",
    seed: 173, width: 10, depth: 1.4, speed: 1.25, rocks: 20, rockSize: 0.9, pools: 2, poolDepth: 0.7, bend: [3.5, 0.065],
    bankSlope: 3.0, bankMax: 20, trees: 0.4, cliff: true, leafShare: 0, veg: [1.25, 1.02, 0.8], ground: [1.4, 1.02, 1.35],
    pal: { grass: 0x9aa490, rock: 0x84868a, gravel: 0xb0aca4, bed: 0x2e4c48, shallow: 0x8adcd0, deep: 0x126a6c, skyTop: 0x6a9cd0, skyBot: 0xdce8f0, fog: 0xc8d8e0 },
    species: { bachforelle: 4, saibling: 3, aesche: 3, huchen: 1 }, sizeMul: 0.95, fishN: 11,
    clarity: [0, 0, 1], insects: ['stone', 'gammarus'],
    quests: [
      { id: 'e1', text: "Fange 4 Fische mit der 4-mm-Perle", test: s => (s.tung4 || 0) >= 4 },
      { id: 'e2', text: "Fange 3 Fische in der Tasche hinter einem Stein", test: s => (s.lt_Tasche || 0) >= 3 },
      { id: 'e3', text: "Fange einen Fisch ab 56 cm", test: s => s.maxLen >= 56 },
    ],
  },
  {
    id: 'nebelstrecke', season: 4, name: "Die Nebelstrecke", sub: "Wo man den Sighter kaum sieht",
    seed: 181, width: 14, depth: 1.2, speed: 0.6, rocks: 10, rockSize: 0.6, pools: 4, poolDepth: 0.65, bend: [7, 0.04], lights: ['morgen'], fog: [3, 85],
    bankSlope: 0.2, bankMax: 2.5, trees: 0.6, leafShare: 0, veg: [1.25, 1.02, 0.8], ground: [1.4, 1.02, 1.35],
    pal: { grass: 0xa4ac98, rock: 0x94969a, gravel: 0xbcb8ae, bed: 0x44645c, shallow: 0xa0e2d6, deep: 0x26867c, skyTop: 0x7aa8d8, skyBot: 0xe8f0f4, fog: 0xe0e8ec },
    species: { aesche: 6, barbe: 2, bachforelle: 2, huchen: 1 }, sizeMul: 1.0, fishN: 11,
    clarity: [0, 1], insects: ['gammarus', 'baetis', 'worm'],
    quests: [
      { id: 'n1', text: "Fange 6 Fische im Nebel", test: s => s.n >= 6 },
      { id: 'n2', text: "Fange 3 Fische auf die passende Nymphe (vorher Stein umdrehen)", test: s => s.matched >= 3 },
      { id: 'n3', text: "Fange zusammen 4 Meter Fisch", test: s => (s.sumLen || 0) >= 400 },
    ],
  },
  {
    id: 'muendung', season: 4, name: "Die Mündung", sub: "Wo der Huchen jagt",
    seed: 191, width: 15, depth: 1.6, speed: 0.7, rocks: 14, rockSize: 1.0, pools: 2, poolDepth: 0.8, bend: [6, 0.045],
    bigPool: { x: -1.5, z: -36, r: 4.5, d: 1.1 },
    bankSlope: 0.4, bankMax: 6, trees: 0.8, leafShare: 0, veg: [1.25, 1.02, 0.8], ground: [1.4, 1.02, 1.35],
    pal: { grass: 0xa0a890, rock: 0x8c8e92, gravel: 0xb8b4a8, bed: 0x2f5a52, shallow: 0x86dcc8, deep: 0x0f6e62, skyTop: 0x6a9cd0, skyBot: 0xe0ecf2, fog: 0xd4e0e6 },
    species: { huchen: 3, aesche: 3, barbe: 3, bachforelle: 2 }, sizeMul: 1.0, fishN: 11,
    clarity: [0, 1], insects: ['gammarus', 'stone', 'worm'],
    quests: [
      { id: 'm1', text: "Fange einen Huchen", test: s => (s.sp.huchen || 0) >= 1 },
      { id: 'm2', text: "Fange 3 Fische ab 55 cm", test: s => (s.big55 || 0) >= 3 },
      { id: 'm3', text: "Lande einen Huchen ab 100 cm – und lass ihn wieder schwimmen", test: s => (s.spMax.huchen || 0) >= 100 },
    ],
  },
];

// Tagebuchseiten. key: 'intro', Revier-ID (beim Freischalten) oder 'ende'
export const PAGES = [
  { key: 'intro', title: 'Die Fliegendose', date: 'Opas Tagebuch · erste Seite', text: [
    'Opa Emil ist im Winter gegangen. Dir hat er drei Dinge hinterlassen: eine zehn Fuß lange Nymphenrute der Klasse 3, eine zerkratzte Fliegendose – und dieses Tagebuch.',
    '„Mein Lieber", steht auf der ersten Seite, „die Smaragda hat mir mehr beigebracht als jeder Mensch. Ich habe ihre fünf schönsten Strecken für dich aufgeschrieben. Fisch sie der Reihe nach. Am Ende wartet einer, den ich nie landen konnte."',
    '„Fang in der Wiesenstrecke an. Kurze Schnur, hohe Rute, und lass die Nymphe so treiben, als hinge sie an gar nichts. Der Sighter sagt dir alles – du musst ihm nur zuhören."',
  ] },
  { key: 'rausche', title: 'Taschenwasser', date: 'Opas Tagebuch · zweite Seite', text: [
    '„Die Rausche sieht aus wie Chaos. Ist sie nicht. Hinter jedem Stein liegt eine Tasche ruhiges Wasser, und in jeder Tasche wohnt ein Fisch, der nur auf den Aufzug mit Futter wartet."',
    '„Hier brauchst du Gewicht. Die Nymphe hat einen halben Meter Zeit, um unten anzukommen. Nimm die schwerere Perle, wirf knapp über den Stein und halte Kontakt – die Bisse kommen schnell und hart."',
    '„Und wate von unten nach oben. Wer von oben kommt, dem laufen die Forellen davon, bevor er den ersten Wurf gemacht hat."',
  ] },
  { key: 'aeschenzug', title: 'Die Fahnenträgerinnen', date: 'Opas Tagebuch · dritte Seite', text: [
    '„Im Zug unterhalb der Brücke stehen die Äschen. Deine Großmutter nannte sie die Damen des Flusses, weil sie sich nichts aufdrängen lassen."',
    '„Äschen sehen alles. Ein dickes Vorfach, eine Nymphe, die auch nur einen Hauch zu schnell treibt – und sie drehen ab. Fisch fein, fisch leicht, und schau genau hin: Ihr Biss ist oft nur ein Zögern im Sighter."',
    '„Dreh vorher einen Stein um. Was darunter krabbelt, gehört ans Vorfach."',
  ] },
  { key: 'klamm', title: 'Die Klamm', date: 'Opas Tagebuch · vierte Seite', text: [
    '„In der Klamm ist es auch im August kalt. Das Wasser ist tief, schnell und dunkel, und die Fische sind es auch."',
    '„Vier Millimeter Tungsten sind hier keine Schande. Wirf weit stromauf, gib der Nymphe Zeit zum Sinken, und rechne mit Hängern – wer nie hängt, fischt zu hoch."',
    '„Hier habe ich zum ersten Mal eine Marmorierte gesehen. Sie stieg aus dem Grünen auf wie ein Gespenst und war wieder weg. Da wusste ich, dass weiter oben noch Größere stehen."',
  ] },
  { key: 'gumpen', title: 'Der Alte', date: 'Opas Tagebuch · letzte Seite', text: [
    '„Der Smaragdgumpen. Hier endet meine Karte."',
    '„Dreimal hatte ich ihn am Haken. Einmal hat er mir das Vorfach gesprengt, einmal den Haken aufgebogen, und beim dritten Mal ist er einfach stehen geblieben, bis ich nachgegeben habe. Eine Marmorata, lang wie mein Arm. Ich nenne ihn den Alten."',
    '„Er zeigt sich nicht jedem. Beweise dem Gumpen erst, dass du fischen kannst. Dann steht er am tiefsten Punkt, dicht am Grund, und nimmt nur, was schwer genug ist, um zu ihm hinunterzukommen, und was aussieht wie echtes Futter."',
    '„Wenn du ihn hast: Halt ihn kurz ins Wasser, schau ihn dir an – und lass ihn gehen. Er gehört dem Fluss."',
  ] },
  { key: 'quellbach', title: "Lenis Karte", date: "Omas Karte · Staffel 2", text: [
    "Hinten im Tagebuch klebt ein gefaltetes Blatt, das du bisher übersehen hast. Eine Karte, mit Bleistift gezeichnet, in einer anderen Handschrift: Oma Leni.",
    "„Emil glaubt, der Fluss fängt an der Wiese an\", steht am Rand. „Dabei kommen seine Fische von viel weiter oben. Geh zum Quellbach. Dort ist alles klein – das Wasser, die Saiblinge, und deine Fehler dürfen es auch sein.\"",
    "„Nimm die leichteste Perle, die du hast. Im Quellbach plumpst man nicht, man legt ab.\"",
  ] },
  { key: 'seeauslauf', title: "Der See dahinter", date: "Omas Karte · zweites Blatt", text: [
    "„Wo der Bach aus dem See läuft, wird er breit und langsam. Emil hat hier nie gefischt – zu wenig Strömung, hat er gesagt. Er hat sich geirrt.\"",
    "„Im Herbst ziehen die Seeforellen in den Auslauf. Silbern, schwer und misstrauisch. Sie fressen, was der See ihnen bringt, also schau unter die Steine, bevor du anknotest.\"",
    "„Lass dir Zeit. In langsamem Wasser hat der Fisch alle Zeit der Welt, deine Nymphe anzuschauen.\"",
  ] },
  { key: 'auwald', title: "Unter gelbem Laub", date: "Deine Handschrift · Staffel 3", text: [
    "Lenis Karte endet am See. Den Rest schreibst du selbst. Im Oktober fährst du dorthin, wo die Smaragda breit wird und durch den Auwald schlingert.",
    "Das Wasser trägt Farbe vom Regen, die Blätter treiben, und am Grund stehen Barben wie graue Schatten nebeneinander. Hier unten zählt nicht die feine Imitation. Hier zählt, was man im Trüben noch sieht.",
    "Du schreibst dir auf: schwer fischen, auffällig fischen, und dem Vorfach nichts zumuten, was es nicht hält.",
  ] },
  { key: 'wehr', title: "Das alte Wehr", date: "Deine Handschrift · zweite Seite", text: [
    "Unterhalb des alten Wehrs kocht das Wasser. Der Müller ist lange fort, aber die Regenbogenforellen, die er einst besetzt hat, sind geblieben und groß geworden.",
    "Im weißen Wasser hat kein Fisch Zeit zum Überlegen. Was auffällt, wird genommen. Was zu leicht ist, kommt nie unten an.",
    "Ein alter Mann am Ufer sieht dir zu. „Wenn du die hier landest\", sagt er, „dann geh im Winter an die Mündung. Dort jagt einer, der Forellen frisst.\"",
  ] },
  { key: 'winterzug', title: "Raureif", date: "Deine Handschrift · Staffel 4", text: [
    "Im Januar ist der Fluss so klar, dass man die Kiesel zählen kann. Die Äschen stehen jetzt dicht beisammen im tiefen Zug und nehmen nur, was ihnen fast ins Maul treibt.",
    "Kalte Finger, dünnstes Vorfach, kleinste Bewegungen. Wer hier grob fischt, fischt allein.",
    "Opa hätte gesagt: „Im Winter lernt man, was man im Sommer nur geglaubt hat zu können.\"",
  ] },
  { key: 'muendung', title: "Der Winterkönig", date: "Deine Handschrift · letzte Seite", text: [
    "Wo die Smaragda in den großen Strom mündet, ist das Wasser tief und grün wie Flaschenglas. Hier jagt der Huchen – der Donaulachs, kupferrot, lang wie ein Ruder.",
    "Er steht am Rand des Kolks und wartet auf alles, was schwach wirkt. Eine kleine Nymphe sieht er nicht einmal an. Er will einen Happen, und er will ihn tief.",
    "Du knotest das stärkste Vorfach an, das du hast, und denkst an den Alten im Smaragdgumpen. Der hier ist größer.",
  ] },
  { key: 'muehlbach', title: "Der Mühlbach", date: "Opas Tagebuch · ein eingelegter Zettel", text: [
    "„Bevor du zu den Äschen gehst, nimm den Mühlbach mit. Er ist kaum breiter als meine Rute lang ist, und die Erlen hängen bis aufs Wasser.\"",
    "„Hier lernst du, einen Fisch auch zu behalten. Wenig Platz, kurze Fluchten, und jeder Fehler hängt im Ast. Drei hintereinander, ohne einen zu verlieren – dann bist du so weit.\"",
  ] },
  { key: 'kiesbank', title: "Die Kiesbank", date: "Opas Tagebuch · Randnotiz", text: [
    "„Auf der Kiesbank ist das Wasser knietief und klar wie Luft. Die Fische sehen dich lange, bevor du sie siehst. Bleib tief, wate langsam, und fisch die Rinne an – dort, wo der Grund dunkler wird.\"",
    "„Nichts Buntes. Hier fängt das Unscheinbare.\"",
  ] },
  { key: 'wasserfall', title: "Unterm Sturz", date: "Omas Karte · am Rand notiert", text: [
    "„Zwischen Quelle und See fällt der Bach über eine Stufe. Darunter hat er sich ein Loch gegraben, so tief, dass man den Grund nicht sieht.\"",
    "„Emil hätte gelacht: Leni mit der dicksten Perle. Aber anders kommst du hier nicht hinunter. Und vergiss die Steine nicht – die Fische stehen auch davor, im Kissen, wo das Wasser sich staut.\"",
  ] },
  { key: 'moorbach', title: "Dunkles Wasser", date: "Omas Karte · mit Tinte nachgetragen", text: [
    "„Aus dem Moor kommt ein zweiter Bach, braun wie Tee. Die Leute sagen, da sei nichts drin. Die Leute fischen ihn mittags.\"",
    "„Geh in der Dämmerung. Dann kommen die dunklen Forellen aus den Unterständen, und sie sind größer, als der Bach vermuten lässt. Steht die Sonne hoch, komm einfach ein andermal wieder.\"",
  ] },
  { key: 'altarm', title: "Der Altarm", date: "Deine Handschrift · ein Nachmittag im Oktober", text: [
    "Hinter dem Auwald liegt ein alter Arm des Flusses, fast ohne Strömung. Das Laub steht auf dem Wasser wie auf einem Teller.",
    "Hier sinkt alles von selbst. Eine schwere Perle liegt nach zwei Sekunden im Schlamm. Du nimmst die leichteste, die du hast, und lernst, wie lange ein Drill dauert, wenn der Fisch alle Zeit der Welt hat.",
  ] },
  { key: 'bruecke', title: "Zwischen den Pfeilern", date: "Deine Handschrift · unter der Brücke", text: [
    "Die alte Steinbrücke steht auf Blöcken, groß wie Autos. An jedem teilt sich das Wasser, und an jeder Kante, wo schnell auf langsam trifft, steht ein Fisch und lässt sich das Futter vorbeitragen.",
    "Vier Arten in einem einzigen Zug, schreibst du abends auf. Opa hätte es nicht geglaubt.",
  ] },
  { key: 'eisrinne', title: "Die Eisrinne", date: "Deine Handschrift · Februar", text: [
    "Zwischen Winterzug und Mündung zwängt sich der Fluss durch eine Rinne, an deren Wänden das Eis in Vorhängen hängt. Die Sonne kommt hier im Februar nicht hin.",
    "Das Wasser ist schnell, die Fische sind träge und stehen dort, wo sie am wenigsten arbeiten müssen: in den Taschen hinter den Blöcken. Schweres Tungsten, kurze Driften, und Finger, die du nach einer Stunde nicht mehr spürst.",
  ] },
  { key: 'nebelstrecke', title: "Im Nebel", date: "Deine Handschrift · der Morgen davor", text: [
    "Kurz vor der Mündung liegt jeden Wintermorgen Nebel auf dem Fluss, so dicht, dass das andere Ufer verschwindet. Der Sighter ist ein blasser Strich im Grau.",
    "Du fischst mehr mit der Hand als mit den Augen. Jedes Zögern in der Schnur könnte ein Biss sein. Wer das hier kann, ist bereit für den, der unten wartet.",
  ] },
  { key: 'ende', title: 'Zurück in den Fluss', date: 'Deine Handschrift', text: [
    'Zweiundneunzig Zentimeter. Du hältst ihn im Kescher, die marmorierte Flanke leuchtet im grünen Wasser, und für einen Augenblick ist es ganz still.',
    'Dann senkst du den Kescherrand. Der Alte bleibt noch einen Herzschlag lang stehen, als wolle er sich dein Gesicht merken, und gleitet zurück in die Tiefe.',
    'Am Abend schreibst du unter Opas letzte Zeile: „Ich habe ihn gelandet, Opa. Und er schwimmt wieder." Die Smaragda gehört jetzt dir – jede Strecke, jede Tasche, jeder Fisch, der noch größer werden will.',
    "Als du das Tagebuch zuklappst, löst sich hinten ein gefaltetes Blatt. Eine Karte – und eine Handschrift, die nicht Opas ist.",
  ] },
  { key: 'ende2', title: "Der ganze Fluss", date: "Deine Handschrift", text: [
    "Über einen Meter. Der Huchen liegt im flachen Wasser, die Kiemen arbeiten, und du hältst ihn nur so lange, wie man einen Atemzug anhält.",
    "Dann schiebt er sich mit einem Schlag der Schwanzflosse zurück in den Strom.",
    "Von der Quelle bis zur Mündung: Du hast die Smaragda einmal ganz gefischt. Du klappst das Tagebuch zu, legst Lenis Karte hinein und schreibst auf den Umschlag einen neuen Namen neben den von Opa. Deinen.",
  ] },
];
