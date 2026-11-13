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
};

export const INSECTS = {
  baetis: { name: 'Eintagsfliegenlarven', hint: 'schlank, olivbraun, drei Schwanzfäden' },
  caddis: { name: 'Köcherfliegenlarven', hint: 'im Köcher aus Steinchen, grüner Kopf schaut heraus' },
  stone: { name: 'Steinfliegenlarven', hint: 'groß, flach, zwei Schwanzfäden' },
  gammarus: { name: 'Bachflohkrebse', hint: 'grau-oliv, gekrümmt, wuseln seitlich davon' },
  worm: { name: 'Würmer', hint: 'vom Regen ausgespült' },
};

export const FLIES = [
  { id: 'pt', name: 'Pheasant Tail', level: 1, imitates: ['baetis', 'stone'], attractor: 0, sink: 1.0, col: '#7a4a25', bead: '#d9a531',
    desc: 'Fasanenschwanz, Kupferdraht. Der Klassiker – imitiert fast jede Eintagsfliegenlarve.' },
  { id: 'perdigon', name: 'Perdigon Olive', level: 1, imitates: ['baetis'], attractor: 0.2, sink: 1.25, col: '#6b7a2a', bead: '#c9c9c9',
    desc: 'Glatt lackiert, kein Widerstand. Sinkt wie ein Stein – ideal für schnelles Wasser.' },
  { id: 'walt', name: "Walt's Worm", level: 1, imitates: ['gammarus', 'caddis'], attractor: 0, sink: 0.95, col: '#a89c84', bead: '#d9a531',
    desc: 'Nur Hasenohr-Dubbing. Unscheinbar, struppig – und für Bachflohkrebs-Fresser unwiderstehlich.' },
  { id: 'frenchie', name: 'Frenchie', level: 2, imitates: ['baetis'], attractor: 0.6, sink: 1.0, col: '#7a4a25', bead: '#d9a531', hot: '#ff4fa0',
    desc: 'Pheasant Tail mit pinkem Hotspot. Fällt auf, wenn das Wasser Farbe hat.' },
  { id: 'caddis', name: 'Peeping Caddis', level: 3, imitates: ['caddis'], attractor: 0.1, sink: 0.9, col: '#6a5a40', bead: '#3a3a3a', hot: '#9be03a',
    desc: 'Köcher aus Hasenhaar, chartreuse Kopf. Wenn die Fische Köcher samt Larve fressen.' },
  { id: 'squirmy', name: 'Squirmy Wormy', level: 4, imitates: ['worm'], attractor: 0.9, sink: 0.85, col: '#e0507a', bead: '#d9a531',
    desc: 'Gummiwurm in Pink. Puristen rümpfen die Nase – bei trübem Wasser fängt er trotzdem.' },
  { id: 'stone', name: 'Steinfliegennymphe', level: 5, imitates: ['stone'], attractor: 0.1, sink: 1.1, col: '#3a2a1a', bead: '#3a3a3a', big: 0.35,
    desc: 'Groß, dunkel, mit Gummibeinchen. Ein Happen, für den auch die Großen aufstehen.' },
  { id: 'redtag', name: 'Red Tag Jig', level: 6, imitates: ['gammarus'], attractor: 0.5, sink: 1.0, col: '#2f5a2a', bead: '#d9a531', hot: '#e02020', loves: ['aesche'],
    desc: 'Pfauengras und roter Schwanz. Äschen können nicht widerstehen.' },
];

export const BEADS = [
  { mm: 2.5, sink: 0.16 }, { mm: 3.0, sink: 0.26 }, { mm: 3.5, sink: 0.38 }, { mm: 4.0, sink: 0.54 },
];

export const TIPPETS = [
  { d: 0.16, level: 1, limit: 0.95, take: 0.72, sink: 0.9 },
  { d: 0.14, level: 1, limit: 0.88, take: 0.9, sink: 1.0 },
  { d: 0.12, level: 3, limit: 0.8, take: 1.06, sink: 1.1 },
  { d: 0.10, level: 6, limit: 0.72, take: 1.2, sink: 1.2 },
];

export const LEVEL_UNLOCKS = {
  2: 'Frenchie & Polbrille – du siehst Fische jetzt deutlicher im Wasser',
  3: 'Peeping Caddis & 0,12er Fluorocarbon',
  4: 'Squirmy Wormy',
  5: 'Steinfliegennymphe',
  6: 'Red Tag Jig & 0,10er Fluorocarbon',
};
export const MAX_LEVEL = 12;
export const xpNeed = lvl => 70 + 50 * lvl;

export const CLARITY = ['glasklar', 'leicht angetrübt', 'trüb'];
export const LIGHTS = [
  { id: 'morgen', name: 'Morgennebel', act: 1.2, tint: [1.0, 0.92, 0.88], sun: 0.9 },
  { id: 'mittag', name: 'Mittagssonne', act: 0.8, tint: [1, 1, 1], sun: 1.15 },
  { id: 'abend', name: 'Abendlicht', act: 1.25, tint: [1.0, 0.88, 0.74], sun: 0.9 },
  { id: 'bedeckt', name: 'bedeckt', act: 1.1, tint: [0.82, 0.85, 0.88], sun: 0.65 },
];

export const REVIERE = [
  {
    id: 'wiese', name: 'Die Wiesenstrecke', sub: 'Wo alles begann',
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
    id: 'rausche', name: 'Die Rausche', sub: 'Taschenwasser',
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
    id: 'aeschenzug', name: 'Der Äschenzug', sub: 'Feines Zeug',
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
    id: 'klamm', name: 'Die Klamm', sub: 'Tief und schnell',
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
    id: 'gumpen', name: 'Der Smaragdgumpen', sub: 'Das Reich des Alten',
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
  { key: 'ende', title: 'Zurück in den Fluss', date: 'Deine Handschrift', text: [
    'Zweiundneunzig Zentimeter. Du hältst ihn im Kescher, die marmorierte Flanke leuchtet im grünen Wasser, und für einen Augenblick ist es ganz still.',
    'Dann senkst du den Kescherrand. Der Alte bleibt noch einen Herzschlag lang stehen, als wolle er sich dein Gesicht merken, und gleitet zurück in die Tiefe.',
    'Am Abend schreibst du unter Opas letzte Zeile: „Ich habe ihn gelandet, Opa. Und er schwimmt wieder." Die Smaragda gehört jetzt dir – jede Strecke, jede Tasche, jeder Fisch, der noch größer werden will.',
  ] },
];
