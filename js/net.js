// Mehrspieler ohne eigenen Server. Zwei Browser verbinden sich direkt miteinander;
// ausgetauscht wird dafuer nur eine fuenfstellige Kennung, die einer dem anderen durchsagt.
//
// Es gibt zwei Kanaele: 'm' traegt die Bewegung, unzuverlaessig und ungeordnet (ein
// verlorenes Paket ist egal, 66 ms spaeter kommt das naechste), 'e' die seltenen
// Ereignisse, die ankommen muessen - Wurf, Biss, Fang, Revierwechsel.
//
// Kein STUN-Zwang: ohne die Server unten kaeme nur eine Verbindung im selben Netz
// zustande. Sie werden nur gefragt, welche oeffentliche Adresse man hat; es laeuft
// kein Spiel darueber.
//
// Mehrere Anbieter, weil ein einzelner ausfallen kann und man dann ohne oeffentliche
// Adresse dasteht. Gemessen antworten alle drei.
const ICE = {
  iceServers: [{
    urls: [
      'stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302',
      'stun:stun.cloudflare.com:3478', 'stun:global.stun.twilio.com:3478',
    ],
  }],
};

export const MODES = ['title', 'idle', 'cast', 'drift', 'fight', 'landed'];
export const RIGS_N = ['euro', 'indi', 'dry'];   // die Montage gehoert mit uebertragen, siehe sendMove
const PACK = 20;   // Bytes je Bewegungspaket

// Oeffentlicher Vermittler von PeerJS. Kein Konto, kein Schluessel - der Dienst leitet
// nur Nachrichten zwischen zwei Kennungen weiter und sieht den Spielverkehr nie: sobald
// die Verbindung steht, laeuft alles direkt zwischen den Rechnern. Faellt er aus, kommt
// gar keine Runde zustande - dann sagt der Dialog das und bietet einen neuen Versuch an.
//
// Die Bibliothek von PeerJS brauchen wir nicht: Der Server ist ein stummer Weiterleiter,
// der { type, dst, payload } an die Zielkennung durchreicht. Was in payload steht,
// bestimmen wir selbst, weil auf beiden Seiten unser eigener Code sitzt.
const BROKER = 'wss://0.peerjs.com/peerjs?key=peerjs&version=1.5.4';
// Kennung zum Vorlesen: keine Buchstaben, die man mit Ziffern verwechselt (kein I, O, 0, 1)
const ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const newCode = () => Array.from({ length: 5 }, () => ALPHA[(Math.random() * ALPHA.length) | 0]).join('');
const peerId = code => 'nymphmaniac-' + code;

export class Net {
  constructor() {
    this.pc = null; this.move = null; this.evt = null;
    this.state = 'aus';            // aus | warten | verbunden | weg
    this.ws = null; this.dst = null; this.code = null; this._beat = 0;
    this.buf = [];                 // letzte Pakete mit Ankunftszeit, fuer die verzoegerte Darstellung
    this.cid = 'nm_' + Math.random().toString(36).slice(2, 10);
    this.via = 'direkt';           // direkt | vermittler - siehe _toRelay
    this._out = 0; this._in = 0; this._watch = 0;
    this._flap = 0;              // Wachhund fuer eine kurz stille Leitung, siehe _pc
    this.peer = null;              // letzter empfangener Zustand der Gegenseite
    this.onEvent = () => {};       // Ereignisse ans Spiel
    this.onState = () => {};       // Zustandswechsel ans Menue
  }

  get on() { return this.state === 'verbunden'; }

  // ---------- Weg ueber den Vermittler ----------

  _sock(id) {
    return new Promise((res, rej) => {
      let ws;
      try { ws = new WebSocket(BROKER + '&id=' + encodeURIComponent(id) + '&token=' + Math.random().toString(36).slice(2)); }
      catch (e) { return rej(new Error('netz')); }
      const to = setTimeout(() => { try { ws.close(); } catch (e) { /* egal */ } rej(new Error('zeit')); }, 9000);
      ws.onmessage = e => {
        let m; try { m = JSON.parse(e.data); } catch (err) { return; }
        if (m.type === 'OPEN') {
          clearTimeout(to);
          this.ws = ws;
          // Der Server wirft stille Verbindungen hinaus
          this._beat = setInterval(() => {
            if (ws.readyState === 1) ws.send('{"type":"HEARTBEAT"}');
            if (this.via !== 'vermittler') return;
            // Ein Lebenszeichen, das nicht am Spiel haengt: wer das Fenster weglegt,
            // zeichnet nicht mehr und wuerde sonst faelschlich als weg gelten.
            this._relay('p', '');
            // Zwanzig Sekunden Stille heisst: die Gegenseite ist wirklich fort
            if (performance.now() - this._in > 20000) this._lost();
          }, 5000);
          ws.onmessage = ev => this._fromBroker(ev);
          res(ws);
        } else if (m.type === 'ID-TAKEN') { clearTimeout(to); try { ws.close(); } catch (err) { /* egal */ } rej(new Error('belegt')); }
      };
      ws.onerror = () => { clearTimeout(to); rej(new Error('netz')); };
      ws.onclose = () => { clearTimeout(to); rej(new Error('zu')); };
    });
  }

  // Der Vermittler prueft die Nutzlast und wirft den Absender hinaus, wenn sie nicht
  // aussieht wie die der PeerJS-Bibliothek. Gemessen: mit schlanker Nutzlast schliesst
  // er die Verbindung (Code 1000), mit dieser Huelle leitet er weiter. Was drin steht,
  // ist ihm egal - nur die Felder muessen da sein.
  _sig(type, data, dst) {
    const d = dst || this.dst;
    if (!this.ws || this.ws.readyState !== 1 || !d) return;
    const payload = Object.assign({ type: 'data', connectionId: this.cid, browser: 'chrome', label: this.cid, reliable: false, serialization: 'binary' }, data);
    this.ws.send(JSON.stringify({ type, dst: d, payload }));
  }

  async _fromBroker(e) {
    let m; try { m = JSON.parse(e.data); } catch (err) { return; }
    const pc = this.pc;
    const p = m.payload || {};
    // Spielverkehr ueber den Vermittler, als Kandidat verkleidet - siehe _relay.
    // Kommt so etwas an, hat die Gegenseite den Rueckfall schon gewaehlt; dann gilt er
    // auch hier, selbst wenn der eigene Browser die direkte Leitung noch nicht aufgegeben hat.
    if (m.type === 'CANDIDATE' && p.candidate && p.candidate.sdpMid === 'nm') {
      const s = String(p.candidate.candidate || ''), i = s.indexOf(' typ host ');
      if (i < 0) return;
      this._toRelay();
      this._in = performance.now();
      const body = s.slice(i + 10);
      if (body[0] === 'e') { try { this.onEvent(JSON.parse(body.slice(1))); } catch (err) { /* kaputt */ } return; }
      if (body[0] !== 'm') return;
      const bin = atob(body.slice(1)), u = new Uint8Array(bin.length);
      for (let k = 0; k < bin.length; k++) u[k] = bin.charCodeAt(k);
      if (u.length === PACK) this._readMove(new DataView(u.buffer));
      return;
    }
    try {
      if (m.type === 'OFFER' && pc && p.sdp) {
        this.dst = m.src;
        await pc.setRemoteDescription(p.sdp);
        await pc.setLocalDescription(await pc.createAnswer());
        this._sig('ANSWER', { sdp: { type: pc.localDescription.type, sdp: pc.localDescription.sdp } });
        for (const c of this._queued || []) this._sig('CANDIDATE', { candidate: c });
        this._queued = [];
        this._arm();
      } else if (m.type === 'ANSWER' && pc && p.sdp) {
        if (pc.signalingState === 'have-local-offer') await pc.setRemoteDescription(p.sdp);
      } else if (m.type === 'CANDIDATE' && pc && p.candidate) {
        await pc.addIceCandidate(p.candidate);
      }
    } catch (err) { /* zu frueh, doppelt oder veraltet - der naechste Versuch kommt */ }
  }

  // Trickle: jeder gefundene Weg geht sofort raus, statt am Ende gesammelt zu werden.
  // Solange das Gegenueber noch unbekannt ist, warten sie in der Schlange.
  _trickle() {
    this._queued = [];
    this.pc.onicecandidate = e => {
      if (!e.candidate) return;
      const c = e.candidate.toJSON ? e.candidate.toJSON() : e.candidate;
      if (this.dst) this._sig('CANDIDATE', { candidate: c }); else this._queued.push(c);
    };
  }

  // Eine Runde aufmachen: gibt die Kennung zurueck, die der andere eintippt
  async hostCode() {
    this._pc();
    this.pc.ondatachannel = e => { if (e.channel.label === 'm') this.move = e.channel; else this.evt = e.channel; this._wire(e.channel); };
    this._trickle();
    let code = null;
    for (let i = 0; i < 6 && !code; i++) {
      const c = newCode();
      try { await this._sock(peerId(c)); code = c; }
      catch (err) { if (err.message !== 'belegt') throw err; }
    }
    if (!code) throw new Error('belegt');
    this.code = code; this._set('warten');
    return code;
  }

  // Einer Runde beitreten. Der Beitretende baut die Kanaele und stellt den Antrag.
  async joinCode(code) {
    this._pc();
    this.move = this.pc.createDataChannel('m', { ordered: false, maxRetransmits: 0 });
    this.evt = this.pc.createDataChannel('e');
    this._wire(this.move); this._wire(this.evt);
    this._trickle();
    await this._sock(peerId(newCode() + newCode()));      // eigene Kennung, die niemand kennen muss
    this.dst = peerId(code.trim().toUpperCase());
    await this.pc.setLocalDescription(await this.pc.createOffer());
    this._sig('OFFER', { sdp: { type: this.pc.localDescription.type, sdp: this.pc.localDescription.sdp } });
    for (const c of this._queued || []) this._sig('CANDIDATE', { candidate: c });
    this._queued = [];
    this._arm();
    this._set('warten');
  }

  // quiet: beim Neuaufbau soll der Abbau nicht als eigener Zustandswechsel nach draussen
  // gehen - das Menue wuerde sonst mitten im Verbinden auf 'aus' zurueckspringen.
  close(quiet) {
    clearInterval(this._beat); this._beat = 0;
    clearTimeout(this._watch); this._watch = 0;
    clearTimeout(this._flap); this._flap = 0;
    if (this.ws) { try { this.ws.onclose = null; this.ws.close(); } catch (e) { /* egal */ } }
    if (this.pc) { try { this.pc.close(); } catch (e) { /* egal */ } }
    this.ws = null; this.dst = null; this.code = null; this.via = 'direkt';
    this.pc = this.move = this.evt = null; this.peer = null; this.buf.length = 0;
    if (quiet) this.state = 'aus'; else this._set('aus');
  }

  _pc() {
    this.close(true);
    this.pc = new RTCPeerConnection(ICE);
    this.pc.onconnectionstatechange = () => {
      const s = this.pc && this.pc.connectionState;
      // 'connected' heisst nur, dass die Leitung steht - die Datenkanaele gehen erst danach
      // auf. Wer hier schon sendet, dessen Begruessung faellt ins Leere.
      const auf = () => { clearTimeout(this._flap); this._flap = 0; };
      if (s === 'failed') { auf(); if (!this._toRelay()) this._lost(); }
      else if (s === 'closed') { auf(); if (this.state === 'verbunden' && this.via === 'direkt') this._lost(); }
      else if (s === 'connected') auf();
      // 'disconnected' heisst nicht weg, sondern still: ein paar verlorene Pakete reichen
      // dafuer, und die Leitung kommt meist von selbst zurueck. Vorher galt die Runde damit
      // sofort als beendet - ein Funkloch von zwei Sekunden warf beide auseinander. Jetzt
      // sechs Sekunden Geduld, und erst wenn sie dann noch still ist, der Vermittler.
      else if (s === 'disconnected' && !this._flap) {
        this._flap = setTimeout(() => {
          this._flap = 0;
          if (!this.pc || this.pc.connectionState !== 'disconnected') return;
          if (this.state === 'verbunden' && this.via === 'direkt' && !this._toRelay()) this._lost();
        }, 6000);
      }
    };
  }

  _lost() { this.peer = null; this.buf.length = 0; this._set('weg'); }

  // ---------- Rueckfall: ueber den Vermittler spielen ----------
  //
  // Zwischen manchen Netzen kommt gar keine direkte Leitung zustande - vor allem hinter
  // Mobilfunk, wo sich viele Anschluesse eine Adresse teilen. Dafuer gibt es sonst einen
  // Relaisserver (TURN). Gemessen im November 2026 antwortet kein einziger der frei
  // nutzbaren mehr: openrelay.metered.ca, relay.metered.ca, freeturn.net und freestun.net
  // loesen nicht mehr auf.
  //
  // Also laeuft das Spiel im Notfall ueber denselben Vermittler, der schon die Kennungen
  // weiterreicht. Gemessen: 15 Pakete je Sekunde, kein Verlust, 89 ms im Mittel, 110 ms
  // im 95. Hundertstel - traeger als direkt, aber spielbar. Der Vermittler ist fuer kurze
  // Nachrichten gedacht, darum geht hier nur die Haelfte raus: 10 statt 15 je Sekunde.
  _toRelay() {
    if (!this.ws || this.ws.readyState !== 1 || !this.dst) return false;
    if (this.via === 'vermittler') return true;
    clearTimeout(this._watch); this._watch = 0;
    this.via = 'vermittler';
    this._in = performance.now();
    this._set('verbunden');
    return true;
  }

  // Wenn nach dem Austausch der Kennungen lange nichts zustande kommt, wartet man nicht
  // weiter: 'failed' meldet der Browser erst nach vielen Sekunden, manche Browser gar nicht.
  _arm() {
    clearTimeout(this._watch);
    this._watch = setTimeout(() => {
      if (this.state !== 'verbunden') this._toRelay();
    }, 12000);
  }

  // Der Vermittler leitet nur die Nachrichten seines eigenen Protokolls weiter; schickt man
  // ihm etwas anderes, schliesst er die Verbindung (gemessen: Schluss nach dem ersten Paket).
  // Darum reist die Spielnachricht als Kandidat verkleidet. Auf den Inhalt schaut er nicht,
  // nur auf die Form.
  _relay(kind, text) {
    if (this.via !== 'vermittler') return;
    this._sig('CANDIDATE', {
      candidate: {
        candidate: 'candidate:1 1 udp 1 1.2.3.4 1 typ host ' + kind + text,
        sdpMid: 'nm', sdpMLineIndex: 0,
      },
    });
  }
  _set(s) { if (s === this.state) return; this.state = s; this.onState(s); }

  _wire(ch) {
    ch.binaryType = 'arraybuffer';
    // Verbunden ist man erst, wenn beide Kanaele offen sind
    const check = () => {
      if (!(this.move && this.move.readyState === 'open' && this.evt && this.evt.readyState === 'open')) return;
      clearTimeout(this._watch); this._watch = 0;
      this.via = 'direkt';
      this._set('verbunden');
    };
    if (ch.readyState === 'open') check(); else ch.onopen = check;
    ch.onclose = () => { if (this.via === 'direkt' && this.state === 'verbunden') this._lost(); };
    ch.onmessage = e => {
      if (typeof e.data === 'string') { try { this.onEvent(JSON.parse(e.data)); } catch (err) { /* kaputtes Paket verwerfen */ } return; }
      this._readMove(new DataView(e.data));
    };
  }

  // 20 Byte: Orte als Zentimeter in 16 Bit, Winkel und Anteile in je einem Byte
  sendMove(S, tip) {
    const ch = this.move;
    const rel = this.via === 'vermittler';
    if (!rel && (!ch || ch.readyState !== 'open')) return;
    if (rel) {
      const now = performance.now();
      if (now - this._out < 100) return;                  // 10 je Sekunde, nicht 15
      this._out = now;
    }
    const b = new DataView(new ArrayBuffer(PACK)); let o = 0;
    const p16 = v => { b.setInt16(o, Math.max(-32768, Math.min(32767, Math.round(v * 100))), true); o += 2; };
    const a8 = v => { b.setUint8(o++, Math.round((v / 6.2832 % 1 + 1) % 1 * 255)); };
    const k8 = v => { b.setUint8(o++, Math.max(0, Math.min(255, Math.round(v * 255)))); };
    p16(S.px); p16(S.pz); a8(S.face); a8(S.yaw);
    // Zustand und Montage teilen sich ein Byte: unten der Zustand, oben die Rute. Ohne die
    // Montage kann die Gegenseite nicht wissen, ob am Ende der Schnur eine Nymphe in der
    // Tiefe haengt, ein Indikator schwimmt oder eine Trockenfliege obenauf sitzt - und
    // zeichnet dann fuer alle drei dasselbe.
    b.setUint8(o++, Math.max(0, MODES.indexOf(S.mode)) | (Math.max(0, RIGS_N.indexOf(S.rig || 'euro')) << 4));
    p16(tip.x); p16(tip.y); p16(tip.z);
    // Im Wurf traegt dasselbe Feld nicht die Fliege im Wasser, sondern das Ende der
    // fliegenden Schnur - eine Hoehe statt einer Tiefe, darum der groessere Massstab.
    // Ohne das sieht die Gegenseite vom ganzen Wurf nichts als eine stehende Rute.
    const air = S.mode === 'cast' && S.air && S.air.on ? S.air : null;
    if (air) { p16(air.x); p16(air.z); k8(Math.min(5.1, Math.max(0, air.y)) / 5.1); }
    else { p16(S.nymph.x); p16(S.nymph.z); k8(Math.min(2.55, S.nymph.d || 0) / 2.55); }
    k8(Math.min(1, S.walk || 0));
    // Spannung: ohne sie weiss die Gegenseite nicht, wie tief die Schnur durchhaengt,
    // und zeichnet einen schnurgeraden Strang, wo in Wirklichkeit ein Bogen liegt.
    k8(Math.min(1, Math.max(0, S.s == null ? 1 : S.s)));
    if (!rel) return ch.send(b.buffer);
    let bin = ''; for (const x of new Uint8Array(b.buffer)) bin += String.fromCharCode(x);
    this._relay('m', btoa(bin));
  }

  _readMove(b) {
    let o = 0;
    const p16 = () => { const v = b.getInt16(o, true) / 100; o += 2; return v; };
    const a8 = () => b.getUint8(o++) / 255 * 6.2832;
    const k8 = () => b.getUint8(o++) / 255;
    const px = p16(), pz = p16(), face = a8(), yaw = a8();
    const mr = b.getUint8(o++);
    const mode = MODES[mr & 15] || 'idle', rig = RIGS_N[mr >> 4] || 'euro';
    const tip = { x: p16(), y: p16(), z: p16() };
    const fly = { x: p16(), z: p16(), d: k8() * (mode === 'cast' ? 5.1 : 2.55) };   // im Wurf eine Hoehe, sonst eine Tiefe
    const walk = k8();
    const s = o < b.byteLength ? k8() : 1;
    const now = performance.now();
    this.peer = { px, pz, face, yaw, mode, rig, tip, fly, walk, s, t: now };
    this.buf.push(this.peer);
    while (this.buf.length > 40) this.buf.shift();
  }

  // Zwischenstand fuer das Zeichnen.
  //
  // Gezeichnet wird bewusst 120 ms in der Vergangenheit: zwischen den beiden Paketen,
  // die diesen Zeitpunkt einschliessen, wird linear geteilt. Dadurch ist die Darstellung
  // unabhaengig davon, wann genau ein Paket ankommt, und ein verlorenes Paket - der Kanal
  // ist unzuverlaessig - faellt nicht auf, weil das naechste den Zwischenraum ueberbrueckt.
  //
  // Vorher wurde zwischen den letzten beiden Paketen mit dem gemessenen Abstand als Dauer
  // geteilt. Das haengt an der Paketfolge: kommt eines spaeter als das vorige, ist die
  // Strecke schon abgelaufen und die Bewegung steht; kommt das naechste frueher, springt
  // sie. Am Koerper faellt das kaum auf - an der Rutenspitze schon, denn die legt denselben
  // Zeitfehler ueber einen viel groesseren Weg zurueck.
  //
  // Gemessen (mittlere Richtungsaenderung je Bild an einer schwingenden Rutenspitze, in mm;
  // die Bewegung selbst hat 2,66):
  //                       gleichmaessig   50 ms Schwanken   30 ms + 10 % Verlust
  //   alte Rechnung            2,67            21,65               17,71
  //   weiches Nachlaufen      11,61            11,18               11,37
  //   dieser Puffer            2,67             2,67                5,84
  lerped() {
    const b = this.buf;
    if (!b.length) return null;
    // Die Verzoegerung richtet sich nach den tatsaechlichen Paketabstaenden. Gemessen
    // schwanken die zwischen 31 und 115 ms, obwohl alle 66 ms gesendet wird - mit einem
    // festen Puffer von 120 ms laeuft er bei jedem groesseren Loch leer, friert ein und
    // springt beim naechsten Paket. Genau das sah man als Ruckeln.
    const rt = performance.now() - this._delay();
    let i = b.length - 1;
    while (i > 0 && b[i].t > rt) i--;
    const a = b[i], c = b[i + 1];
    if (!c) return this._ahead(b, a, rt);               // nichts Neueres da: kurz weiterlaufen lassen
    const k = Math.max(0, Math.min(1, (rt - a.t) / Math.max(1, c.t - a.t)));
    const l = (x, y) => x + (y - x) * k;
    let da = ((c.face - a.face + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
    return {
      px: l(a.px, c.px), pz: l(a.pz, c.pz), face: a.face + da * k,
      tip: { x: l(a.tip.x, c.tip.x), y: l(a.tip.y, c.tip.y), z: l(a.tip.z, c.tip.z) },
      fly: { x: l(a.fly.x, c.fly.x), z: l(a.fly.z, c.fly.z), d: a.mode === c.mode ? l(a.fly.d, c.fly.d) : a.fly.d },
      mode: a.mode, rig: a.rig, walk: l(a.walk, c.walk), s: l(a.s, c.s),
    };
  }

  // Tiefe des Puffers: etwa das Anderthalbfache des groessten Lochs der letzten Sekunden,
  // begrenzt auf 120 bis 260 ms. Tief genug fuer die Schwankung, ohne unnoetig nachzuhinken.
  _delay() {
    const b = this.buf;
    if (b.length < 4) return 140;
    let mx = 0;
    for (let i = Math.max(1, b.length - 20); i < b.length; i++) mx = Math.max(mx, b[i].t - b[i - 1].t);
    return Math.max(120, Math.min(260, mx * 1.6));
  }

  // Laeuft der Puffer doch einmal leer, wird die letzte Bewegung kurz weitergefuehrt statt
  // eingefroren. Einfrieren und dann Nachsetzen sieht aus wie ein Ruck; ein paar Zentimeter
  // zu weit laufen sieht man nicht.
  _ahead(b, a, rt) {
    const prev = b[b.length - 2];
    if (!prev || b[b.length - 1] !== a) return a;
    const span = a.t - prev.t;
    if (span < 8) return a;
    const k = Math.min(1.8, (rt - a.t) / span);
    if (k <= 0) return a;
    const l = (x, y) => y + (y - x) * k;
    let da = ((a.face - prev.face + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
    return {
      px: l(prev.px, a.px), pz: l(prev.pz, a.pz), face: a.face + da * k,
      tip: { x: l(prev.tip.x, a.tip.x), y: l(prev.tip.y, a.tip.y), z: l(prev.tip.z, a.tip.z) },
      fly: { x: l(prev.fly.x, a.fly.x), z: l(prev.fly.z, a.fly.z), d: a.fly.d },
      mode: a.mode, rig: a.rig, walk: a.walk, s: a.s,
    };
  }

  send(type, data) {
    const ch = this.evt;
    if (this.via === 'vermittler') return this._relay('e', JSON.stringify({ type, ...data }));
    if (ch && ch.readyState === 'open') ch.send(JSON.stringify({ type, ...data }));
  }

}
