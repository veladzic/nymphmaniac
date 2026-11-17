# Mehrspieler ohne Server — Entwurf

**Stand: Stufe A ist gebaut** (`js/net.js`, `World.buildRemote` / `poseRemote`, Dialog in den Einstellungen). Stufe B und C sind weiterhin Entwurf. Was unten steht, ist die Überlegung dahinter — einschließlich der verworfenen Wege.

Ziel: zu zweit (oder zu dritt) am selben Fluss stehen, unabhängig von Opas Geschichte. Ohne eigenen Server, ohne Konten, ohne Datenbank — das Spiel bleibt eine statische Seite auf GitHub Pages.

---

## 1. Die unbequeme Wahrheit vorweg

**„Serverless" heißt nicht „ohne fremde Infrastruktur".** WebRTC braucht drei Dinge, und nur eines davon ist wirklich kostenlos:

| Baustein | wofür | lässt sich vermeiden? |
|---|---|---|
| **Signalisierung** | die beiden Browser müssen einmal Verbindungsdaten (SDP) austauschen, bevor sie sich kennen | **ja** — per Hand, siehe unten |
| **STUN** | der eigene Browser erfährt seine öffentliche Adresse | praktisch ja (Googles öffentliche STUN-Server sind frei und zuverlässig) |
| **TURN** | wenn die direkte Verbindung scheitert, muss jemand den Verkehr weiterleiten | **nein** — das braucht einen bezahlten Server |

Ohne TURN scheitern erfahrungsgemäß **10 bis 20 % aller Paarungen**, vor allem hinter symmetrischem NAT (manche Mobilfunknetze, strenge Firmennetze). Diese Spieler können dann schlicht nicht miteinander spielen. Das ist der ehrliche Preis von „kein Server", und die Entscheidung dazu gehört dir, nicht mir.

Mein Vorschlag: **damit leben.** Eine klare Fehlermeldung („Verbindung kam nicht zustande — das liegt meist am Netz eines der beiden, probiert es über WLAN statt Mobilfunk") ist besser als ein Dienst, den du bezahlen und betreiben musst.

---

## 2. Was im Spiel reproduzierbar ist — und was nicht

Das habe ich nachgesehen, es entscheidet den ganzen Entwurf:

| | Quelle | reproduzierbar? |
|---|---|---|
| Flussbett, Mäander, Steine, Gumpen, Standplätze | `makeRiver` mit `mulberry32(rv.seed)` | **ja**, aus der Reviernummer allein |
| Bäume, Bewuchs, Ufersteine | `mulberry32(rv.seed * 7 + 3)` in `buildRevier` | **ja** |
| Wasser, Licht, Insektenarten (`cond`) | `Math.random()` beim Betreten | nein — muss übertragen werden |
| Fischbesatz: welche Plätze, welche Arten, welche Längen | `Math.random()` in `enterRevier` / `makeFish` | nein — muss übertragen oder geteilt werden |

**Die Landschaft kommt also gratis.** Beide Browser bauen aus derselben Reviernummer denselben Fluss, bis auf den letzten Stein. Übertragen werden muss nur, was lebt.

Das ist der Grund, warum der Entwurf unten so klein ausfällt.

---

## 3. Umfang: drei Stufen, eine Empfehlung

### Stufe A — Gemeinsam am Wasser *(gebaut)*

Ihr seht einander: waten, werfen, driften, drillen, landen. **Jeder hat seine eigenen Fische.** Keine Konkurrenz um Standplätze, kein Streit darüber, wem der Biss gehört.

- Technisch: nur Positionen und Zustände übertragen, etwa 15-mal je Sekunde.
- Kein Hostbegriff, keine Autorität, kein Schummelproblem (es gibt nichts zu gewinnen).
- Löst das Determinismusproblem, indem es ihm ausweicht.

Das ist vermutlich 90 % des Werts für 20 % der Arbeit. Zu zweit still am selben Fluss zu stehen und zu sehen, wie der andere drüben einen Fisch drillt — das ist das Gefühl, um das es geht.

### Stufe B — Gemeinsamer Wettkampf

Stufe A plus: **gleicher Besatz, gleiche Bedingungen, Punktestand.** Wer in 20 Minuten mehr Zentimeter landet.

- Der Gastgeber würfelt `cond` und den Besatz und schickt beides als Liste mit (siehe Protokoll).
- Fische bleiben trotzdem **je Spieler eigen** — beide fischen denselben Besatz, aber jeder seine Kopie davon. Niemand nimmt dem anderen einen Fisch weg.
- Nur der Punktestand wird ausgetauscht.

Das ist ein überschaubarer Aufsatz auf A und bringt den Wettbewerb, ohne die Fischlogik umbauen zu müssen.

### Stufe C — Wirklich geteilter Besatz *(vorerst nicht)*

Ein Fisch, zwei Angler: Wer ihn scheucht, scheucht ihn für beide; wer ihn fängt, nimmt ihn dem anderen weg.

Das verlangt eine echte Autorität über den Fischzustand und damit einen Umbau von `updateDrift`, `startBite`, `fleeFish` und `landed` — heute rechnet das alles jeden Bildschritt lokal. Dazu kommen Verzögerungsfragen: Wem gehört der Biss, wenn beide Nymphen gleichzeitig am Platz liegen und die Leitung 80 ms braucht?

**Das ist ein eigenes Projekt, kein Aufsatz.** Nicht in der ersten Fassung.

---

## 4. Verbindung: Code zum Kopieren, kein Dienst

Ein Spieler wählt **„Spiel eröffnen"** und teilt den entstehenden **Link** (WhatsApp, Discord, egal wie). Der andere **tippt ihn an** — das Spiel öffnet sich an der richtigen Stelle und hat die Einladung schon verarbeitet — und teilt den Antwortlink zurück. Einmal hin, einmal her, dann steht die Verbindung direkt zwischen den beiden Rechnern.

Der Code steckt dabei im Fragment der Adresse. Das hat zwei Vorteile gegenüber einem nackten Textblock: Ein Chat bricht einen Link nicht um und schneidet ihn nicht ab, und der Empfänger muss nichts kopieren. Das Fragment verlässt den Browser nie — es wird nicht an den Server geschickt, auch nicht an GitHub Pages.

```
Spieler 1                                  Spieler 2
  │ "Spiel eröffnen"                          │
  │ ── Einladungscode ────────────────────────▶ einfügen
  │                                           │ "Beitreten"
  │ einfügen ◀─────────────────── Antwortcode ─┤
  │                                           │
  └────────── direkte Verbindung ─────────────┘
```

**Warum so und nicht über einen Vermittlungsdienst:**

- Es bleibt wirklich bei null Infrastruktur. Kein Dienst, der abgeschaltet wird, keine Nutzungsgrenzen, keine Rechnung.
- Es passt zu dem, was das Spiel ohnehin ist: eine statische Seite ohne Build-Schritt, ohne Abhängigkeiten außer three.js.
- Es wirft keine Datenschutzfragen auf. Es gibt keine Spielerliste, keine Lobby, keine Kennungen — nur zwei Leute, die sich ohnehin kennen.

**Was es kostet:** Es ist umständlich, und spontanes Spielen mit Fremden gibt es nicht. Für „fischen wir heute Abend zusammen" reicht es.

Der Code ist ein base64-verpacktes, komprimiertes SDP — realistisch 1,5 bis 3 kB, also ein Textblock, den man nicht mehr vorlesen kann, aber problemlos kopiert. Falls das stört: ICE-Kandidaten lassen sich auf die nötigsten kürzen, das drückt ihn deutlich.

---

## 5. Protokoll

Ein einziger unzuverlässiger, ungeordneter `RTCDataChannel` (`{ordered: false, maxRetransmits: 0}`) — wie bei Spielen üblich: Ein verlorenes Positionspaket ist egal, das nächste kommt in 66 ms. Daneben ein zweiter, **zuverlässiger** Kanal für die seltenen Ereignisse, die nicht verloren gehen dürfen.

### Kanal 1 — Bewegung, 15 Hz, unzuverlässig

| Feld | Quelle | Bytes |
|---|---|---|
| `px, pz` | `S.px, S.pz` | 2 × 2 (als 16-bit, 1 cm genau über 600 m) |
| `face, yaw` | `S.face, S.yaw` | 2 × 1 |
| `mode` | `S.mode` als Zahl (idle/cast/drift/fight/landed) | 1 |
| `tipX, tipZ, tipY` | `tip3()` — damit die Rute stimmt | 3 × 2 |
| `nx, nz, nd` | `S.nymph` — Fliege und Schnur | 3 × 2 |
| `bend, ten` | Rutenbiegung, Schnurspannung | 2 × 1 |

**Rund 24 Byte je Paket, 15-mal je Sekunde: 2,9 kbit/s je Spieler.** Das ist nichts. Selbst mit acht Spielern bliebe es unter 25 kbit/s.

Die Gegenstelle interpoliert zwischen zwei Paketen (`lerp` über 66 ms) — bei den Geschwindigkeiten in diesem Spiel (waten, Rute führen) reicht das völlig; niemand springt.

### Kanal 2 — Ereignisse, selten, zuverlässig

```
hallo    { name, revier, rig, version }
revier   { i, cond }                    ← beim Wechsel; in Stufe B auch der Besatz
wurf     { tx, tz, hart }               ← damit drüben der Platscher klingt und spritzt
biss     { }                            ← Rutenschlag sichtbar machen
fang     { art, laenge, x, z }          ← der andere sieht den Fisch im Kescher
verloren { grund }
tschuess { }
```

### Was bewusst **nicht** übertragen wird

- **Der Spielstand.** Stufe, XP und Aufgaben bleiben rein lokal. Mehrspieler ist ein Nebenschauplatz, keine zweite Fortschrittslinie — sonst wird aus jedem Verbindungsabbruch eine Streitfrage.
- **Fische** (außer in Stufe B der Besatz beim Betreten). Jeder rechnet seine eigenen.
- **Alles Deterministische.** Der Fluss wird nicht geschickt, er wird gebaut.

---

## 6. Wo das im Code andockt

| Was | Wo | Art des Eingriffs |
|---|---|---|
| Verbindung, Kanäle, Kodierung | **neu: `js/net.js`** | eigenständig, kennt das Spiel nicht |
| Senden | `frame()` in `js/main.js`, neben der Klangmeldung (`S.sndT`) | ein gedrosselter Aufruf, wie `sfx.setField` |
| Empfangen | neu in `js/main.js`: `remote[]` statt `S` | liest nur, schreibt nie in `S` |
| Fremden Angler zeichnen | `World.buildAngler` / `poseAngler` in `js/world.js` | **die eigentliche Arbeit** — siehe unten |
| Menü, Codefelder | `showSettings` oder ein eigener Dialog | HTML wie bei den anderen Dialogen |

**Der größte Brocken ist nicht das Netz, sondern die Figur.** `poseAngler` setzt heute *die eine* Anglerfigur, und `setRig` *die eine* Rute mit *einer* Schnur. Für einen zweiten Spieler müssen beide zu etwas werden, das es mehrfach gibt — entweder durch Umbau auf Instanzen oder, einfacher für den Anfang, durch eine zweite, schlankere Darstellung (Figur ja, Schnurverlauf vereinfacht).

Das ist die Stelle, an der ich die Arbeit vermuten würde, und die man vor einer Zusage anschauen sollte.

---

## 7. Vorlage: `js/net.js`

Gerüst, nicht lauffähig — als Gesprächsgrundlage.

```js
// Mehrspieler ohne Server: zwei Browser verbinden sich direkt. Ausgetauscht wird einmal
// ein Textblock (SDP) ueber einen beliebigen Weg - danach laeuft alles zwischen den beiden.
const ICE = { iceServers: [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }] };

export class Net {
  constructor() { this.pc = null; this.move = null; this.evt = null; this.peers = new Map(); this.onEvent = () => {}; }

  // Gastgeber: Kanaele anlegen, Einladungscode zurueckgeben
  async host() {
    this.pc = new RTCPeerConnection(ICE);
    this.move = this.pc.createDataChannel('m', { ordered: false, maxRetransmits: 0 });
    this.evt = this.pc.createDataChannel('e');                       // zuverlaessig
    this.wire();
    await this.pc.setLocalDescription(await this.pc.createOffer());
    return this.code();                                               // wartet auf alle ICE-Kandidaten
  }

  // Gast: Einladungscode einsetzen, Antwortcode zurueckgeben
  async join(code) {
    this.pc = new RTCPeerConnection(ICE);
    this.pc.ondatachannel = e => { (e.channel.label === 'm' ? this.move = e.channel : this.evt = e.channel); this.wire(); };
    await this.pc.setRemoteDescription(decode(code));
    await this.pc.setLocalDescription(await this.pc.createAnswer());
    return this.code();
  }

  // Gastgeber schliesst ab
  async accept(code) { await this.pc.setRemoteDescription(decode(code)); }

  // Erst senden, wenn alle Kandidaten da sind - sonst fehlt dem Code die halbe Wegbeschreibung
  code() {
    return new Promise(res => {
      if (this.pc.iceGatheringState === 'complete') return res(encode(this.pc.localDescription));
      this.pc.onicegatheringstatechange = () => { if (this.pc.iceGatheringState === 'complete') res(encode(this.pc.localDescription)); };
    });
  }

  wire() {
    if (this.move) this.move.onmessage = e => this.readMove(new DataView(e.data));
    if (this.evt) this.evt.onmessage = e => this.onEvent(JSON.parse(e.data));
  }

  // 24 Byte je Paket; Positionen als Zentimeter in 16 Bit, Winkel in einem Byte
  sendMove(S, tip) {
    if (!this.move || this.move.readyState !== 'open') return;
    const b = new DataView(new ArrayBuffer(24)); let o = 0;
    const p16 = v => { b.setInt16(o, Math.round(v * 100), true); o += 2; };
    const a8  = v => { b.setUint8(o, Math.round((v / 6.2832 + 0.5) * 255) & 255); o += 1; };
    p16(S.px); p16(S.pz); a8(S.face); a8(S.yaw);
    b.setUint8(o++, MODES.indexOf(S.mode));
    p16(tip.x); p16(tip.y); p16(tip.z);
    p16(S.nymph.x); p16(S.nymph.z); p16(S.nymph.d);
    this.move.send(b.buffer);
  }

  send(type, data) { if (this.evt && this.evt.readyState === 'open') this.evt.send(JSON.stringify({ type, ...data })); }
}

const MODES = ['title', 'idle', 'cast', 'drift', 'fight', 'landed'];
const encode = d => btoa(JSON.stringify({ t: d.type, s: d.sdp }));   // spaeter: komprimieren
const decode = c => { const o = JSON.parse(atob(c)); return { type: o.t, sdp: o.s }; };
```

Im Bildtakt, neben der bestehenden Klangmeldung:

```js
S.netT -= dt;
if (S.netT <= 0) { S.netT = 1 / 15; net.sendMove(S, tip3()); }
for (const r of net.peers.values()) world.poseRemote(r.id, r.lerped());
```

---

## 8. Reihenfolge, falls wir es angehen

1. **`js/net.js` mit zwei Browserfenstern lokal** — Verbindung steht, Zahlen gehen hin und her, nichts davon ist sichtbar. Beweist das Schwierigste zuerst.
2. **Zweite Anglerfigur in `world.js`** — vermutlich der größte Posten, am besten früh anschauen.
3. **Bewegung übertragen und zeichnen** (Stufe A).
4. **Wurf, Biss, Fang als Ereignisse** — damit es lebt und klingt.
5. **Menü mit den Codefeldern.**
6. Erst dann entscheiden, ob Stufe B (Wettkampf) dazukommt.

Nach Schritt 1 und 2 weiß man, ob der Rest Spaß macht oder Arbeit ist. Vorher würde ich nichts versprechen.

---

## 9. Wenn es noch einfacher werden soll: ein Vermittlungsdienst

Der Link ist so kurz, wie es **ohne fremde Hilfe** geht. Er muss die gesamte Wegbeschreibung beider Seiten enthalten; daran lässt sich nichts kürzen, was ihn tippbar machen würde.

**TURN hilft dabei nicht.** TURN leitet den Verkehr weiter, wenn die direkte Verbindung scheitert — es ersetzt nicht den Austausch, sondern setzt ihn voraus. Was den Austausch ersetzen würde, ist ein **Vermittlungsdienst** (Signalisierung): ein kleiner Server, über den sich zwei Browser finden, ohne dass jemand etwas verschickt.

Mit einem öffentlichen Vermittler — etwa dem kostenlosen Broker von PeerJS — sähe es so aus:

- Spieler 1 bekommt eine kurze Kennung, etwa **„4821"**, und sagt sie am Telefon durch.
- Spieler 2 tippt sie ein. Fertig.

Das ist der Unterschied zwischen einem 700-Zeichen-Link und vier Ziffern.

**Was es kostet:**

- Eine Abhängigkeit von einem fremden Dienst, den niemand uns schuldet. Der PeerJS-Broker ist ein Gemeinschaftsangebot ohne zugesicherte Verfügbarkeit und mit Begrenzungen. Fällt er aus, geht Mehrspieler nicht mehr — bis jemand den Code ändert.
- Eine zweite Datei im Projekt (oder der nachgebaute Protokollteil), das erste Stück Fremdcode neben three.js.
- Kurze Kennungen kollidieren: Irgendwann landen zwei Fremde in derselben Runde.

**So gebaut:** Die Kennung ist der normale Weg, der Link bleibt als Rückfall darunter stehen. Fällt der Vermittler aus, ist das Spiel also nicht tot.

> **Nachtrag (November 2026):** Der Rückfall ist wieder weg. Im Gebrauch kam über den Link keine Verbindung zustande, und ein Rückfall, der nicht trägt, ist schlimmer als keiner — er sieht aus wie ein Ausweg und kostet den Spieler nur Zeit. Fällt der Vermittler heute aus, sagt der Dialog das und bietet einen neuen Versuch an. Was dafür *innerhalb* der Verbindung dazukam: Kommt keine direkte Leitung zustande, läuft das Spiel über denselben Vermittler weiter (siehe README) — das ist der Rückfall, der tatsächlich trägt.

**Gemessen am echten Dienst:** `0.peerjs.com` antwortet ohne Konto mit `{"type":"OPEN"}`. Er prüft allerdings die Form der Nutzlast — mit einer schlanken Fassung schließt er die Verbindung des Absenders (Code 1000), mit der Hülle der PeerJS-Bibliothek (`connectionId`, `browser`, `label`, `reliable`, `serialization`) leitet er weiter. Was *in* der Hülle steht, ist ihm egal, weil auf beiden Seiten unser eigener Code sitzt. Deshalb braucht es die Bibliothek nicht.

## 10. Offene Fragen, die du entscheiden musst

- **Wie viele Spieler?** Zwei ist einfach (eine Verbindung). Ab drei braucht es ein Netz aus Verbindungen oder einen Spieler als Verteiler — letzteres ist einfacher, bedeutet aber: Geht der Gastgeber, ist die Runde vorbei.
- **Leben die beiden im selben Revier?** Der Entwurf oben nimmt an: ja, der Gastgeber bestimmt es. Alternativ sieht man einander nur, wenn man zufällig dasselbe gewählt hat.
- **TURN ja oder nein** — siehe Abschnitt 1. Ich rate ab, aber es ist deine Entscheidung.
- **Schummeln:** In Stufe A unmöglich, weil es nichts zu gewinnen gibt. In Stufe B trivial, weil jeder Client seinen Punktestand selbst meldet. Bei „zu zweit mit einem Freund" ist mir das egal — bei einer Bestenliste wäre es das nicht, und die ginge ohne Server ohnehin nicht.
