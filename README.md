# Nymphmaniac – Das Erbe der Smaragda

Ein 3D-Fliegenfischer-Spiel für den Browser mit Schwerpunkt Euro-Nymphing. Gedacht fürs Handy im Hochformat, läuft aber auch am Desktop.

Opa Emil hinterlässt dir seine Nymphenrute, eine Fliegendose und ein Tagebuch mit fünf Strecken der Smaragda. Am Ende wartet ein Fisch, den er nie landen konnte.

Vier Staffeln mit 19 Revieren und 57 Aufgaben: Opas Tagebuch (Wiese bis Smaragdgumpen, dazu Mühlbach und Kiesbank), Lenis Karte (Quellbach, Wasserfallgumpen, Moorbach, Seeauslauf), Herbst im Unterlauf (Auwald, Altarm, Steinbrücke, altes Wehr) und der Winterkönig (Winterzug, Eisrinne, Nebelstrecke, Mündung mit Huchen). Der Fluss mäandriert in jedem Revier anders.

## Spielen

Es gibt keinen Build-Schritt. Lokal reicht ein statischer Server im Projektordner:

```bash
python -m http.server 8123
```

Dann `http://localhost:8123` öffnen.

## Steuerung

| | Handy | PC |
|---|---|---|
| Waten | Stick unten links | W/A/S/D |
| Umschauen | am Himmel oder Ufer ziehen | Rechtsklick ziehen oder Q/E |
| Werfen | Finger aufs Wasser (Richtung), nach oben ziehen (Weite), loslassen | wie am Handy mit der Maus |
| Rute führen | nach unten ziehen | Maus ziehen |
| Anhieb | nach oben wischen oder ANHIEB | Leertaste / Rechtsklick |
| Drill | auf dem Bild oder am Rutenstick unten Mitte: nach unten ziehen = Druck, seitlich = Seitendruck; DRILL (links oder rechts) halten = fester Druck | Maus ziehen oder Leertaste, A/D |
| Rig-Baukasten | Rig-Anzeige unten neben dem Watstick antippen | R, Fliegen direkt mit F |
| Anglersicht | Knopf „POV“ | V |
| Tagebuch, Opas Seiten, Fangbuch | Knopf 📖 | T |

Drei Methoden: Euro-Nymphe mit Sighter, ab Staffel 2 Nymphe unter einem schwimmenden Indikator (sechs Typen mit eigener Tragkraft) und Trockenfliege auf steigende Fische.

**Rig-Baukasten.** Oben zeigt eine Vorschau das montierte Rig, darunter liegen die Steckplätze Rute, Fliege, Perle, Vorfach und beim Indikator zusätzlich Indikator und Tiefe. Ein Steckplatz öffnet seine Auswahl mit Balken für Sinkrate, Unauffälligkeit, Reißfestigkeit, Reizwert und Hängerrisiko; Antippen montiert. Gesperrtes steht ausgegraut mit „ab Stufe X“ oder „ab Staffel 2“ da. Am Handy sind Übersicht und Auswahl zwei Ansichten, ab 760 px Breite stehen sie nebeneinander.

**Einstellungen** (⚙️) sind in drei Abschnitte geteilt, weil sie drei verschiedene Fragen beantworten:

| Abschnitt | was darin steht | wonach man entscheidet |
|---|---|---|
| **Hilfen** | Bisshilfe, Führungshilfe, Wurfhilfe, Klare Sicht | wie schwer es sein soll – jede abgeschaltete Hilfe bringt mehr XP |
| **Grafik** | Qualität (vier Stufen), Umgebungsverdeckung | was der Rechner hergibt |
| **Ton & Vibration** | Ton, Lautstärke, Vibration | wie laut es sein soll |

Darunter folgen die beiden Nachschlageteile: „Punkte & Stufen" und „Steuerung".

**Zu zweit fischen** (Stufe A). Ohne eigenen Server, ohne Konto, ohne Lobby — durchgesagt wird eine **fünfstellige Kennung**:

Der Einstieg steht auf dem **Startbildschirm** unter „Weiterfischen"; in den Einstellungen gibt es ihn außerdem.

**Es gibt keine Rollenwahl.** Wer den Dialog öffnet, bekommt sofort eine **fünfstellige Kennung** wie `FYETP`, und darunter steht das Feld für die Kennung des anderen. Einer sagt seine durch, der andere tippt sie ein — wer von beiden, ist egal. „Kennung teilen" schickt sie samt Adresse des Spiels über das Systemblatt (am Handy mit WhatsApp obenauf) oder WhatsApp Web.

Die Kennung kommt vom **öffentlichen Vermittler von PeerJS** (`0.peerjs.com`) — kein Konto, kein Schlüssel. Er leitet nur die Verbindungsaufnahme weiter und sieht den Spielverkehr nie: Sobald die Verbindung steht, läuft alles direkt zwischen den Rechnern. Die Bibliothek von PeerJS wird nicht gebraucht, das Protokoll steckt in `js/net.js`.

Der Buchstabenvorrat lässt `I`, `O`, `0` und `1` weg, damit man die Kennung vorlesen kann, ohne sich zu verhaspeln. Ist eine Kennung schon vergeben, wird eine neue gezogen (bis zu sechsmal).

**Fällt der Vermittler aus**, sagt der Dialog das und bietet einen neuen Versuch an. Darunter stand lange ein zweiter Weg ohne fremden Dienst: ein Einladungslink hin, ein Antwortlink zurück, beides 700 Zeichen im Fragment der Adresse. Der ist **entfernt** — im Gebrauch kam damit keine Verbindung zustande, und ein Rückfall, der nicht trägt, ist schlimmer als keiner: Er sieht aus wie ein Ausweg und kostet den Spieler nur Zeit. Mit ihm fielen `host()`, `join()`, `accept()` und die ganze Kompression des SDP-Textes weg.

**Kommt keine direkte Leitung zustande**, läuft das Spiel über denselben Vermittler weiter. Zwischen manchen Netzen geht es nicht direkt — vor allem hinter Mobilfunk, wo sich viele Anschlüsse eine Adresse teilen. Dafür gibt es sonst einen Relaisserver (TURN), und früher gab es frei nutzbare. Gemessen im November 2026 antwortet keiner mehr: `openrelay.metered.ca`, `relay.metered.ca`, `freeturn.net` und `freestun.net` lösen nicht einmal auf.

Also übernimmt der Vermittler. Er leitet nur die Nachrichten seines eigenen Protokolls weiter — schickt man ihm etwas anderes, schließt er die Verbindung (gemessen: Schluss nach dem ersten Paket). Darum reist das Spielpaket als Kandidat verkleidet; auf den Inhalt schaut er nicht, nur auf die Form. Gemessen: 15 Pakete je Sekunde, kein Verlust, 89 ms im Mittel, 110 ms im 95. Hundertstel. Weil der Dienst für kurze Nachrichten gedacht ist, geht über diesen Weg nur die Hälfte raus — 10 statt 15 je Sekunde. Der Dialog sagt es offen: „es läuft über den Vermittler".

Umgeschaltet wird, sobald der Browser `failed` meldet — oder nach 12 Sekunden ohne Verbindung, denn mit abgeriegelten Netzen meldet er gar nichts und bleibt ewig auf `new` stehen. Geht die direkte Leitung später doch noch auf, wird sie wieder benutzt. Ein Lebenszeichen alle fünf Sekunden hängt nicht am Spiel, sondern am Herzschlag der Vermittlerverbindung: Wer das Fenster weglegt, zeichnet nicht mehr und würde sonst fälschlich als weg gelten.

**Reißt die Verbindung ab**, holt der Dialog von selbst eine neue Kennung und sagt darüber, was passiert ist — *sofern er offen ist*. Dieser Nachsatz war der Kern eines Fehlers, der den zweiten Spieler mitten im Spiel lahmlegte: Ob der Dialog offen sei, wurde im DOM nachgesehen („liegt irgendwo ein Knopf von ihm herum?"). `closeModal()` versteckt die Karte aber nur und räumt nichts weg, also lag der Knopf auch Stunden später noch da. Ein Abriss riss den Dialog damit von selbst auf — und **solange ein Dialog steht, ruht das Spiel**: kein Wurf, kein Anhieb, kein Drill, und ein laufender Wurf bleibt auf halbem Weg stehen, weil seine Uhr nicht weiterläuft. Nachgemessen blieb der Spieler dauerhaft im Zustand `cast` hängen. Jetzt sagt der Dialog beim Öffnen selbst, wer er ist (`openModal(h, { kind: 'multi' })`), und `closeModal()` leert die Karte.

**Eine kurz stille Leitung ist noch kein Abriss.** WebRTC meldet `disconnected` schon bei ein paar verlorenen Paketen und kommt meist von selbst zurück. Vorher galt die Runde damit sofort als beendet — ein Funkloch von zwei Sekunden warf beide auseinander. Jetzt: sechs Sekunden Geduld, und erst wenn es dann noch still ist, geht es über den Vermittler weiter oder die Runde endet.

Die Verbindung läuft danach direkt zwischen den beiden Rechnern (WebRTC).

**Ihr seht einander waten, werfen, drillen und landen — aber jeder fischt seinen eigenen Besatz.** Niemand nimmt dem anderen einen Fisch weg, niemand scheucht dem anderen einen. Der Spielstand zählt nur lokal; Mehrspieler ist ein Nebenschauplatz, keine zweite Fortschrittslinie.

| | |
|---|---|
| Bewegung | 20 Byte, 15-mal je Sekunde = **2,9 kbit/s je Spieler**; gezeichnet wird 120 ms verzögert (siehe unten) |
| Im Paket | Ort, Blickrichtung, Zustand, Montage, Rutenspitze, Fliege mit Tiefe (**im Wurf: das Ende der fliegenden Schnur mit Höhe**), Watschritt, **Spannung** |
| Ereignisse | Begrüßung, Revierwechsel, Wurf, Fang, Abschied — über einen zuverlässigen Kanal |
| Nicht übertragen | der Fluss (beide bauen ihn aus `rv.seed` identisch), die Fische, der Spielstand |

**Der Wurf war auf der anderen Seite unsichtbar.** Die Rute stand still, und dann lag die Fliege plötzlich auf dem Wasser. Der Grund: Während des Wurfs kommt die Rutenspitze aus der Wurfrechnung (`castPose`), nicht aus `S.tip` — und der Netzblock holte sie sich mit `tip3()` noch einmal selbst, was die *Drifthaltung* liefert. Gemessen über einen ganzen Wurf: 25 Pakete, 25-mal exakt derselbe Punkt. Jetzt merkt sich die Zeichenschleife die Spitze, die sie wirklich gezeichnet hat, und genau die geht raus.

Dazu reist das Ende der fliegenden Schnur mit — im selben Feld, in dem sonst die Fliege im Wasser steht. Der Zustand im Paket sagt ja schon, dass gerade geworfen wird, also heißt die Zahl dort eine **Höhe** statt einer Tiefe und bekommt den größeren Maßstab (0–5,1 m statt 0–2,55 m). Kein Byte mehr als vorher. Gemessen steigt das Ende auf 4,98 m und kommt auf 0,56 m herunter; die gezeichnete Schnur der Gegenseite folgt bis 4,75 m. Beim Euro-Nymphing wird dabei nur Vorfach mit Sighter gezeichnet, sonst die dicke Flugschnur mit etwas Durchhang — geworfen wird schließlich, was man fischt.

**Der zweite Spieler ist dieselbe Figur**, nur im grünen Hemd. Eine Figur mit Skelett lässt sich nicht einfach klonen – `clone()` hängt beide Kopien an dieselben Knochen, und dann bewegen sie sich im Gleichschritt. `cloneSkinned` klont den Knochenbaum mit und bindet die Kopie an ihre eigenen Knochen (wie `SkeletonUtils` aus den Three.js-Beispielen, hier in zwanzig Zeilen, damit keine weitere Datei nötig ist).

Eine Falle dabei: `Object3D.copy` schickt `userData` durch JSON. Aus der Ruhelage-Quaternion, die die Posenrechnung braucht, wird dabei ein gewöhnliches Objekt – jede Rechnung damit ergibt `NaN`, und die Figur kollabiert lautlos zu nichts Sichtbarem. Die Ruhelage wird deshalb nach dem Klonen neu festgehalten.

Das grüne Hemd entsteht aus der Textur: In `angler_body.jpg` ist das Hemd der einzige blaue Bereich (Hose khaki, Haut orange, Schuhe dunkel), also trifft ein gezielter Farbdreh auf einer Leinwand genau das Hemd. Die Helligkeit bleibt, damit die Falten erhalten bleiben. Das Bild wird dafür eigens geladen – beim Klonen ist die laufende Texturladung meist noch unterwegs.

Gestellt wird die Kopie knapper als die eigene Figur (`poseRemoteFigure`): Watschritt, Rumpfneigung, Kopf und die Haltung an der Rute.

**Beide Arme werden gezielt, nicht auf feste Winkel gestellt.** Feste Winkel sahen aus wie hängende Arme neben einer schwebenden Rute – was natürlich wirkt, hängt davon ab, wo die Rute gerade steht. `_aimArm` löst deshalb eine zweigliedrige Kette: Ellenbogen über den Kosinussatz, seitlich ausgestellt, damit der Arm nicht in die Figur knickt. Der Griffpunkt ist derselbe, den der Absender für seine eigene Rute benutzt (`hand()` in `js/main.js`, 0,2 m seitlich und 0,4 m vor dem Körper, 1,36 m über dem Grund) – nachgemessen liegt der Handknochen danach auf 0,000 m am Rutenende.

Auch die freie Hand läuft über dieselbe Rechnung, auf einen Punkt neben der Hüfte. Mit festen Winkeln klappte sie in den Körper, weil die Drehachse für die linke Seite spiegelverkehrt liegt; gezielt steht sie nachgemessen 0,28 m von der Körperachse entfernt, also außerhalb des Rumpfes. Im Drill fasst sie am Griff mit an.

**Gezeichnet wird verzögert, 120 bis 260 ms in der Vergangenheit.** Zwischen den beiden Paketen, die diesen Zeitpunkt einschließen, wird linear geteilt. Dadurch hängt die Darstellung nicht daran, wann genau ein Paket ankommt, und ein verlorenes Paket fällt nicht auf – der Kanal ist ja unzuverlässig.

Vorher wurde zwischen den letzten beiden Paketen geteilt, mit dem gemessenen Abstand als Dauer. Das hängt an der Paketfolge: Kommt eines später als das vorige, ist die Strecke schon abgelaufen und die Bewegung steht; kommt das nächste früher, springt sie. Am Körper fällt das kaum auf – an der Rutenspitze schon, denn die legt denselben Zeitfehler über einen viel größeren Weg zurück. In der Drift sah das aus wie heftiges Wackeln.

Gemessen an einer schwingenden Rutenspitze, mittlere Richtungsänderung je Bild in mm (die Bewegung selbst hat 2,66 – das ist die Untergrenze):

| Verfahren | gleichmäßig | 50 ms Schwanken | 30 ms + 10 % Verlust |
|---|---|---|---|
| zwischen den letzten zwei Paketen | 2,67 | 21,65 | 17,71 |
| weiches Nachlaufen | 11,61 | 11,18 | 11,37 |
| **120 ms Puffer** | **2,67** | **2,67** | **5,84** |

Weiches Nachlaufen war mein erster Versuch und die falsche Antwort: robust gegen Schwanken, aber nie gut, weil die Zentimeterstufen der Übertragung es bei jedem Paket neu anstoßen.

**Wie tief gepuffert wird, stellt sich selbst ein.** Gesendet wird alle 66 ms, gemessen kommen die Pakete aber mit 31 bis 133 ms Abstand an. Ein fester Puffer von 120 ms läuft bei jedem größeren Loch leer, friert ein und springt beim nächsten Paket – das sah man als Ruckeln. Die Tiefe folgt deshalb dem größten Loch der letzten Sekunden (`maxGap × 1,6`, begrenzt auf 120 bis 260 ms). Läuft er doch einmal leer, wird die letzte Bewegung kurz weitergeführt statt eingefroren: Einfrieren und Nachsetzen sieht aus wie ein Ruck, ein paar Zentimeter zu weit laufen sieht man nicht.

Die Verzögerung merkt man beim Zuschauen nicht.

**Die Schnur der Gegenseite** ist nicht nur eine Linie, sondern zusätzlich ein dünner Zylinder – eine 1-Pixel-Linie verschwindet auf Entfernung. Im Leerlauf hängt sie von der Spitze bis zur Wasseroberfläche; vorher war sie dort ein 50-cm-Stummel, den man nicht als Schnur erkannt hat.

**Die Montage wird mitübertragen** – ohne sie sähen alle drei Ruten gleich aus. Sie teilt sich ein Byte mit dem Zustand (unten der Zustand, oben die Rute), kostet also nichts:

| Rute | was die Gegenseite sieht | Abschnitte |
|---|---|---|
| Euro-Nymphe | dünnes Vorfach mit **Sighter** (pink–gelb–pink) über dem Wasser, darunter die Nymphe mit Perle | 5 |
| Indikator | dicke Flugschnur zur **orangen Kugel** an der Oberfläche, von dort dünnes Vorfach hinunter zur Nymphe | 13 |
| Trockenfliege | dicke Flugschnur, die aufs Wasser fällt und mittreibt, die Fliege sitzt obenauf | 12 |

Farben und Größen sind dieselben wie an der eigenen Montage, damit man sie wiedererkennt: Indikator 0,05 m wie die New-Zealand-Wolle, Fliege 0,03 m gegenüber 0,024 m an der eigenen Nymphenperle.

**Bei Indikator und Trockenfliege läuft die fremde Schnur denselben Weg wie die eigene.** Vorher war sie eine Gerade von der Rutenspitze zur Fliege – gleich dick, gleich farbig, straff gespannt. In Wirklichkeit fällt die Flugschnur von der Spitze aufs Wasser (über `min(Weite · 0,45; 2,6) m`, mit der Kurve `(1 − s/td)^1,7`), liegt dann auf der Oberfläche und treibt lose in einem Bogen stromab. Dazu teilt sie sich wie die eigene bei 62 % in dicke Flugschnur (0,0042 m, verjüngt auf 0,0032) und dünnes Vorfach (0,0019 m, ausgelaufen auf 0,0012), und wo ein Stein im Weg ist, legt sie sich darauf statt hindurchzugehen. Nachgemessen gegen die Formel der eigenen Schnur: **0 mm Abweichung** über alle dreizehn Stützpunkte. Im Drill liegt nichts mehr auf dem Wasser – dort zieht sie zum Fisch, mit dem Durchhang, den die Spannung zulässt.

Dafür wandert die **Spannung** als zwanzigstes Byte mit. Ohne sie weiß die Gegenseite nicht, wie tief die Schnur durchhängt. Das Paket bleibt bei 20 Byte und ist damit voll.

**Die Farben waren vertauscht.** Die fremde Flugschnur teilte sich das Material mit der eigenen, und `setRigStyle` färbt das bei jedem Rigwechsel um: Wer selbst Euro fischte, sah die fremde Indikatorschnur in Mono-Weiß statt Orange. Die Gegenseite hat jetzt eigene Materialien – Euro `#f0eedc`, Indikator `#ff9a3a`, Trockenfliege `#cfe08a`, Vorfach `#e9e9da`.

**Auch im Leerlauf hängt die Montage** unter der Rutenspitze (1,9 m darunter), so wie bei der eigenen Figur. Vorher hing dort ein nackter 3,2-m-Strang bis zum Wasser, ohne Sighter und ohne Nymphe – man sah, dass der andere eine Rute hält, aber nicht, womit er fischt. Die Indikatorkugel bleibt im Leerlauf aus, genau wie bei der eigenen Montage.

Geprüft über alle sechs Fälle: Euro im Leerlauf und in der Drift je 5 Abschnitte mit Sighter, Nymphe und Perle; Indikator in der Drift 13 Abschnitte (7 Flugschnur, 5 Vorfach, 1 Schenkel zur Nymphe) mit Kugel auf y = 0,05; Trockenfliege in der Drift 12 Abschnitte, Fliege auf y = 0,03, keine Perle; im Leerlauf je 1 Abschnitt mit der hängenden Montage. Der Schnuranfang sitzt an der Rutenspitze, das Ende an der Fliege.

Was fehlt: **TURN.** Scheitert die direkte Verbindung — meist hinter symmetrischem NAT, erfahrungsgemäß 10 bis 20 % der Paarungen — kommt sie gar nicht zustande. Das ließe sich nur mit einem bezahlten Relais lösen und widerspräche dem Zweck. Der Dialog sagt es deshalb offen. Der ganze Entwurf samt verworfener Stufen steht in [MULTIPLAYER.md](MULTIPLAYER.md).

**Zurück zum Hauptmenü** steht in den Einstellungen über „Spielstand löschen". Die Seite wird dabei nicht neu geladen; eine laufende Mehrspieler-Verbindung bleibt bestehen und lässt sich im selben Dialog trennen.

**Godmode.** Fünfzehnmal auf die Überschrift „Punkte & Stufen" tippen schaltet ihn ein: alle 19 Reviere offen, höchste Stufe, volle Fliegendose. Ab dem zehnten Tipper zählt eine Meldung herunter; eine Pause von mehr als 1,8 s setzt den Zähler zurück, damit er nicht aus Versehen anspringt.

Der Spielstand von vorher wird dabei in `save.god` weggelegt. „Godmode beenden" – der Knopf erscheint direkt unter der Überschrift – bringt ihn unverändert zurück: Stufe, XP, freigeschaltete Reviere, Bindematerial und Fliegendose. **Was im Godmode gefangen wurde, zählt also nicht.** Der Modus übersteht ein Neuladen.

**HUD.** Oben rechts liegen im Stehen vier Knöpfe (📖, POV, Rig, ⚙️); in Wurf, Drift und Drill bleibt nur POV. Im Drill leuchtet am Rutenstick die Seite, in die du ziehen sollst, und die untere Hälfte, wenn Druck fehlt; ein kleiner Pfeil darüber zeigt dasselbe. Ein frisch erschienener Dialog reagiert 0,45 s lang nicht, damit Tippen aus dem Drill nichts auslöst.

**Kamera.** Sie folgt im Wurf dem Ziel, in der Drift der Fliege und im Drill dem Fisch, und steigt dabei gut 2 m höher, damit der Angler die Fliege nicht verdeckt und man ins Wasser statt auf die Spiegelung schaut.

## Regelwerk

Dieses Kapitel beschreibt, was im Spiel tatsächlich gerechnet wird. Die Zahlen stammen aus `js/main.js`, `js/river.js` und `js/data.js`; wer dort etwas ändert, passt bitte auch diese Tabellen an.

### Wo die Fische stehen

Standplätze entstehen beim Aufbau eines Reviers aus dem Flussmodell (`js/river.js`). Ein Platz ist nur gültig, wenn das Wasser dort tiefer als 0,38 m ist, er mindestens 3,2 m vom Einstieg und 0,6 m vom Ufer entfernt liegt und kein anderer Platz näher als etwa 1,5 m ist.

| Standplatz | Wo genau | Besonderheit |
|---|---|---|
| Gumpen | Einlauf und Auslauf jedes Gumpens | Fische sind dort im Schnitt größer |
| Tasche | im ruhigen Wasser hinter einem Stein | |
| Kissen | im Stau direkt vor einem Stein | |
| Kante | an der Strömungsnaht neben einem Stein | |
| Rinne | links oder rechts der Stromrinne, alle 6 m | die Rinne liegt in der Außenkurve |

Pro Stein gibt es genau einen Platz (Tasche, Kissen oder Kante, zufällig gewichtet 30 / 32 / 38 %). Beim Betreten eines Reviers wird das 1,4-Fache des Revierwerts `fishN` besetzt (13 bis 17 Fische, höchstens so viele wie Plätze). Die Plätze werden dafür der Länge nach in gleich viele Abschnitte geteilt und in jedem genau einer zufällig besetzt, damit keine Teilstrecke leer bleibt. Zusätzlich stehen an jeder Art von Standplatz mindestens zwei Fische (soweit es so viele Plätze gibt), damit Standplatz-Aufgaben bei jedem Besuch lösbar sind. Verlangt eine offene Aufgabe ein bestimmtes Licht (Moorbach: Morgennebel oder Abendlicht), herrscht es bei jedem Besuch, bis sie erfüllt ist. Art und Länge werden pro Fisch gewürfelt: die Art nach den Gewichten des Reviers, die Länge zwischen Mindest- und Höchstmaß der Art, kleine Fische deutlich häufiger als große.

Ein gefangener Fisch kommt nach 100 Sekunden am selben Platz wieder, sobald du mehr als 7 m entfernt bist. Der Alte im Smaragdgumpen erscheint erst, wenn dort die ersten beiden Aufgaben erfüllt sind, und steht immer am tiefsten Punkt.

### Scheuchen

| Auslöser | Wirkung |
|---|---|
| Waten im Wasser, näher als 1,5 m (langsam) bis 2,8 m (schnell) | Fisch flieht für 70 s |
| Waten im Wasser, bis 2,5 m weiter weg | Fisch ist 5 s misstrauisch und beißt nicht |
| Gehen am Ufer, näher als 0,5 bis 0,9 m | Fisch flieht für 70 s |
| Indikator setzt auf, Fisch im Scheuchradius (0,5 bis 2,0 m je nach Typ) | 9 s misstrauisch |
| Anhieb ins Leere, Fisch näher als 1,6 m | 7 s misstrauisch |
| Biss verpasst | 22 s misstrauisch |
| Anhieb mit zu loser Schnur | 20 s misstrauisch |
| Fisch im Drill verloren | flieht für 80 s |

Ein fliehender Fisch verschwindet nicht einfach: Er schießt vom Angler weg die Rinne entlang, weicht Steinen aus und wird erst nach gut 3 s oder 24 m Abstand ausgeblendet. Beim Biss schwimmt der Fisch sichtbar von seinem Platz zur Fliege; wird der Biss verpasst, kehrt er an den Platz zurück.

Ein Ladebildschirm deckt den Start und jeden Revierwechsel ab, bis Texturen, Anglerfigur und die ersten Bilder da sind. Der Balken zählt die wirklich geladenen Dateien; beim Revierwechsel stehen Staffel, Reviername und ein Rat von Opa darauf. „Weiterfischen“ baut die Strecke nicht mehr neu, sie steht seit dem Laden.

Wasserfälle: Oberhalb der befischbaren Strecke (12 m und 27 m hinter ihrem oberen Ende) kommt der Fluss über zwei Stufen herab; Bett, Ufer und Wasserspiegel liegen dort um die Fallhöhe höher. Die Höhe folgt aus dem Revier (`0,6 + 1,1 × Strömung`, zwischen 0,9 und 2,2 m, in Schluchten 3,4 m) oder steht als `fall` in den Revierdaten (Wasserfallgumpen 7,5 m). Wo das Ufer mindestens 4 m hoch ist, stürzt gegenüber der Watspur ein seitlicher Fall über die Wand, ab 7 m ein zweiter. Gischt steigt am Fuß auf, und das Rauschen schwillt im Umkreis von 26 m an. Die Strecke selbst bleibt eben – Drift, Drill und Standplätze rechnen unverändert.

Nach dem Landen liegt der Fisch im Kescher am Wasser: Die Kamera fährt nah heran, der Fisch liegt auf der Seite, atmet und schlägt alle gut vier Sekunden ein paar Mal kräftig. Name, Länge und Gewicht stehen oben, Punkte, Aufgaben und Stufenbalken in einer Leiste unten (Hochformat) oder rechts (Querformat). „Zurücksetzen“ lässt ihn sich aufrichten und davonschwimmen. In der Leiste steht oben das gezeichnete Porträt der Art.

Das 3D-Fischmodell trägt je Art eine eigene Haut, erzeugt aus denselben Farben und Zeichnungen wie das Porträt (`LOOK` in `js/fishart.js`): Rücken-, Flanken- und Bauchfarbe, Flecken, rote Punkte mit Hof, der rosa Streifen der Regenbogenforelle, die Marmorierung der Marmorata, Schuppen bei Äsche und Barbe, dazu Auge, Kiemendeckel und Maulspalte. Alle Flossen sind ausgeformt: gegabelte Schwanzflosse, Rücken-, Fett-, After-, Bauch- und Brustflossen, weißer Saum beim Saibling, Barteln bei der Barbe – und bei der Äsche die hohe, gefleckte Fahne.

Stein, Schnellwechsel und Rig-Anzeige stehen unten rechts neben dem Watstick. Nach Wurf, Drift, Drill oder Fang erscheinen sie erst 0,9 s später wieder, damit ein letzter Tipper auf ANHIEB oder DRILL nicht versehentlich den Stein umdreht oder die Rute wechselt.

Schnellwechsel: Neben dem Stein-Knopf wechselt ⇄ zur zuletzt gefischten Rute und beim nächsten Tippen wieder zurück (ohne Vorgeschichte zwischen Nymphe und Trockenfliege). Der Knopf erscheint ab Staffel 2 und zeigt, wohin er wechselt. Die Rig-Anzeige nennt in der dritten Zeile die Montage: Nymph Rig, Indikator Rig oder Dry Rig.

Steine sind für alles fest, bei jeder Rute: Die Schnur legt sich auf die Steinoberfläche, statt hindurchzugehen, und hält die Fliege dann fest. Fliege und Nymphe treiben am echten Steinumriss vorbei; eine Euro-Nymphe, die unter Wasser von vorn gegen einen Stein treibt, verklemmt sich mit 12 % Wahrscheinlichkeit (Hänger). Im Drill weicht der Fisch an den Rand eines Steins aus, statt hindurchzuschwimmen.

### Der Wurf

Der angetippte Punkt gibt die **Richtung**, die Länge deines Zugs nach oben die **Weite**: 8 m je 35 % der Bildschirmhöhe. Ein bloßer Tipper ohne Zug wirft genau dorthin, wo du hingetippt hast – wer nichts davon wissen will, fischt also wie bisher weiter.

Jede Rute hat eine bequeme Weite und eine Grenze (`cast` in `js/data.js`):

| Rute | bequem | Grenze |
|---|---|---|
| Euro-Nymphe | 4,0 m | 7,6 m |
| Indikator | 5,5 m | 10,5 m |
| Trockenfliege | 6,5 m | 12 m |

Diese Zahlen richten sich nach dem, was im Spiel wirklich vorkommt, nicht nach dem, was am Wasser realistisch wäre: Die Standplätze liegen im Median 2,6 m seitlich der Watspur, ein normaler Wurf ist 3 bis 6 m. Lag die bequeme Weite höher, lief jeder Wurf im genauen Bereich und von der ganzen Mechanik war nie etwas zu spüren.

Bis zur bequemen Weite läuft die Rute genau. Darüber wächst die Streuung quadratisch: `0,1 m + über² × 0,6 m`, wobei `über` von 0 an der bequemen Weite auf 1 an der Grenze steigt. Die Fliege landet dann nicht im Ring, sondern glockenförmig darum herum. Gemessen über je 40 Würfe mit der Euro-Rute:

| Wurf | Streuung | Fehler im Mittel | größter Fehler | geklatscht |
|---|---|---|---|---|
| 3 m | 0,10 m | 0,10 m | 0,20 m | 0 % |
| 4 m (bequem) | 0,10 m | 0,10 m | 0,19 m | 0 % |
| 5,8 m | 0,25 m | 0,30 m | 0,53 m | 0 % |
| 7,6 m (Grenze), ruhiger Zug | 0,70 m | 0,86 m | 1,43 m | 0 % |
| 7,6 m (Grenze), gerissener Zug | 0,70 m | 0,89 m | 1,42 m | 100 % |

**Der Ring zeigt das vorher an.** Sein Durchmesser folgt der Streuung (`0,7 + Streuung × 2,2`), wächst also von der ersten Unsicherheit an statt erst ab einer Schwelle – von Skala 0,92 bei einem kurzen Wurf auf 2,24 an der Grenze. Ab `über > 0,55` färbt er sich zusätzlich orange. Der Punkt in der Mitte bleibt das Ziel.

**Zielen bleibt frei.** Seitlich ziehen richtet die Richtung weiter neu aus, nach oben ziehen ändert nur die Weite: Die Richtung kommt immer vom Finger, die Weite allein vom Zugweg.

**Geklatscht** wird aus `über × 0,45 + (Zuggeschwindigkeit − 1400 px/s) / 2600`, ab 0,45. Die volle Weite allein reicht dafür nicht ganz; erst ein gerissener Zug obendrauf lässt die Fliege aufschlagen. Dann spritzt es, und alle Fische im Umkreis von `0,8 + Härte × 1,8` m werden für 8 bis 16 s misstrauisch. Beim ersten Wurf jenseits der bequemen Weite erklärt eine Meldung einmalig, warum der Ring aufgegangen ist.

Das Können liegt damit nicht im Zielen, sondern im **Waten**: Wer sich auf bequeme Weite heranarbeitet, ohne die Fische zu scheuchen, trifft. Wer vom Ufer aus über den halben Fluss wirft, streut und klatscht.

Die Einstellung **Wurfhilfe** stellt das alte Verhalten wieder her – die Fliege landet dann genau im Ring. Sie ist ab Werk aus.

### Steigen: Nymphe oder Trockenfliege

Gestiegen wird erst, wenn die Trockenfliegen-Rute freigeschaltet ist (ab Staffel 2). Vorher bleiben alle Fische am Grund.

Nicht jeder Fisch steigt. Beim Besetzen wird pro Fisch gewürfelt, ob er überhaupt an die Oberfläche kommt: Barbe nie, Huchen 25 %, Marmorata 45 %, Seeforelle 60 %, Bachforelle, Regenbogenforelle und Saibling 72 %, Äsche 90 %. Der Alte steigt nie. Fische, die nicht steigen, bleiben immer am Grund und nehmen nur Nymphen.

Die übrigen wechseln selten zwischen zwei Zuständen:

| Zustand | Dauer | Nimmt |
|---|---|---|
| am Grund | 200 bis 400 s, geteilt durch die Aktivität des Lichts | nur Nymphen (Euro oder Indikator) |
| steigend | 150 bis 300 s; der Fisch steht dicht unter der Oberfläche und macht alle 2,5 bis 7 s einen Ring | nur Trockenfliegen |

Die Uhr eines Fischs läuft nur, solange du weiter als 16 m entfernt bist. Ein Fisch in deiner Nähe bleibt also bei dem, was er gerade tut – wer sein Rig auf ihn abstimmt, trifft ihn auch so an. Im Schlupf sind es 9 m, sonst bliebe ausgerechnet das Wasser vor dir leer.

Zu Beginn steigen etwa 35 % der steigfähigen Fische, und jeder startet an einer zufälligen Stelle seines Abschnitts, damit sie nicht alle gleichzeitig hochkommen. Bei Morgennebel und Abendlicht sind die Pausen am Grund kürzer, es steigen also mehr Fische.

### Der Schlupf

Für ein paar Minuten steigt **eine** Insektenart aus dem Wasser auf, die Fische stellen sich darauf ein und fressen oben. Das ist der Moment, in dem genau eine Fliege richtig ist – und der einzige im Spiel, in dem die Tageszeit etwas bedeutet.

**Es schlüpft nur, was unter dem Stein lag.** Eintagsfliegen, Köcherfliegen und Steinfliegen haben in `js/data.js` ein Feld `adult` – Bachflohkrebse und Würmer nicht, die bleiben ihr Leben lang unten. Geschlüpft wird darum möglichst die Art, die als häufigstes Futter im Revier liegt (`cond.i1`), sonst die zweite. Nur wenn beide Fundstücke unter Wasser bleiben, kommt eine andere Art des Reviers dran. Anders wäre die Steinprobe ein Ratespiel.

**Wann:** gewürfelt wird fortlaufend, mit einer mittleren Wartezeit von 190 s geteilt durch das Gewicht der Tageszeit und der Art.

| | Abendlicht | Morgennebel | bedeckt | Mittagssonne |
|---|---|---|---|---|
| Gewicht | 1,35 | 1,0 | 0,85 | 0,3 |

Dazu kommt die Art: Köcherfliegen 1,1, Eintagsfliegen 1,0, Steinfliegen 0,65. Am Abend schlüpft also im Mittel alle zweieinhalb Minuten etwas, in der prallen Mittagssonne alle zehn. Ein Schlupf dauert **95 bis 180 s**, danach vergehen 70 bis 140 s, bis überhaupt wieder gewürfelt wird. Im Winter schlüpft nichts.

**Ein Fünftel mehr steigt – nicht alle.** Beim Start kommen rund 20 % der steigfähigen Fische zusätzlich hoch, in 1 bis 10 s; danach geht es in 12 bis 57 s wieder hinunter. Diese Zahl ist zugleich die **Obergrenze für den ganzen Schlupf**: Solange sie erreicht ist, schaltet kein weiterer Fisch nach oben, nach unten dagegen immer.

Beides zusammen ist nötig, und beides fehlte in der ersten Fassung:

- Ohne die Begrenzung beim Start stiegen **11 von 11** steigfähigen Fischen statt 5. Am Grund stand dann nichts mehr – und daran hängt der Fortschritt: Nymphen-Aufgaben, Standplatz-Aufgaben, die ganze erste Staffel.
- Ohne die Obergrenze füllt sich die Oberfläche langsam von selbst. Steigende wurden festgehalten, während unten weiter umgeschaltet wurde; nach drei Minuten wären doch alle oben gewesen.

Gemessen an 18 Fischen, 14 davon steigfähig: vorher 6 oben, im Schlupf 9, und diese 9 hielten über die ganzen 180 s. Zehn Fische standen durchgehend am Grund. Nach dem Schlupf waren es binnen 38 s wieder 7.

Wer bis zum Ende nicht oben war, kommt auch nicht mehr – ohne diesen Nachsatz liefen die kurzen Fristen aus `startHatch` nach dem Schlupf weiter, und gemessen stiegen hinterher mehr Fische als mittendrin.

**Und die Fliegenwahl kippt.** Im Schlupf zählt, was gerade fliegt: Eine Trockenfliege der richtigen Art bekommt +0,65, eine falsche −0,18, und die Nymphe am Grund −0,28. Gemessen an einem Steinfliegen-Schlupf:

| Fliege | ohne Schlupf | im Schlupf |
|---|---|---|
| Stimulator (trocken, Steinfliege) | 1,26 | **1,60** (Anschlag) |
| Pheasant Tail (Nymphe) | 1,20 | 0,92 |
| Stone Nymph (Nymphe) | 1,21 | 0,93 |
| Elk Hair Caddis (trocken, falsche Art) | 0,46 | 0,28 |

Ohne Schlupf liegt die passende Trockenfliege knapp über der Nymphe – man kann so oder so fischen. Im Schlupf ist sie die einzige Antwort.

**In Staffel 1 ändert ein Schlupf an der Fliegenwahl nichts.** Dort gibt es nur die Euro-Nymphe – Indikator und Trockenfliege kommen erst mit Staffel 2. Ein Abzug auf jede Fliege, die man überhaupt besitzt, wäre dann keine Entscheidung, sondern eine Strafe ohne Ausweg; und steigen tut dort ohnehin kein Fisch, weil `makeFish` das Steigen an die Trockenfliegen-Rute knüpft. Nachgemessen bleibt die Passung in Staffel 1 bei Schlupf auf den Hundertstel gleich. Zu sehen ist er trotzdem, und der Hinweis sagt, warum man gerade nicht herankommt – ein Vorgeschmack auf die zweite Staffel.

**Zu sehen** ist er an der Insektenwolke über dem Wasser. Sie gab es schon, aber immer in derselben blassen Farbe und nur morgens und abends. Jetzt nimmt sie Farbe und Körpergröße der schlüpfenden Art an (eine Steinfliege ist doppelt so groß wie eine Eintagsfliege), rückt über die Flussmitte, und jedes Tier steigt auf einer Sägezahnbahn von der Oberfläche nach oben – das ist, was man am Wasser wirklich sieht, keine gleichmäßig schwirrende Wolke. Ein Schlupf macht sie auch dann sichtbar, wenn sonst nichts schwärmt; er *ist* ja das Ereignis.

Zwei Dinge daran sind bewusst nicht maßstabsgetreu:

- **Vier Mal so viele Tiere** (440 statt 110). Ein Schlupf, bei dem genauso viel fliegt wie an jedem anderen Abend, ist keiner. Außerhalb parken die übrigen unter der Welt.
- **Gezeichnet wird mit Faktor 3,2.** Gemessen deckt eine 18 mm lange Köcherfliege auf sechs Meter knapp zwei Bildpunkte ab – das sieht niemand, und einen Schlupf, den man nicht sieht, gibt es nicht. Die Größen der Arten untereinander bleiben richtig.

Dazu bekamen die Punkte eine **runde Marke** (32 × 32, im Code gezeichnet). Bei 12 mm fiel nicht auf, dass ein Punkt ohne Bild ein Quadrat ist; bei der Größe eines Schlupfs lagen lauter Kästchen über dem Wasser. Ein weicher Verlauf von der Mitte an war dann wieder zu wenig – deckend bleibt davon nur ein Kern von wenigen Bildpunkten. Deckend bis 56 % des Radius, dann ein weicher Rand.

Gemessen kostet der ganze Schlupf nichts: 2,3 ms je Bild mit, 2,3 ms ohne (die Streuung zwischen zwei Durchgängen desselben Zustands war mit 0,3 ms größer als der Unterschied), 375 Zeichenaufrufe mit, 376 ohne.

Ein laufender Schlupf **übersteht das Neuladen**: Gespeichert wird sein Ende als Zeitpunkt, nicht die Restdauer – sonst liefe er bei jedem Neuladen von vorn los.

### Wann ein Fisch beißt

Ein Biss ist nur möglich, wenn alle Bedingungen erfüllt sind:

| Bedingung | Nymphe (Euro, Indikator) | Trockenfliege |
|---|---|---|
| Fisch ist weder geflohen noch misstrauisch | ja | ja |
| Zustand des Fischs | am Grund | steigend |
| Abstand Fliege–Fisch | höchstens 0,7 m + 0,6 m je Meter Fischlänge | höchstens 0,85 m + 0,5 m je Meter Fischlänge |
| Tiefe | Nymphe höchstens 0,28 m + 0,14 m × Lichtaktivität über Grund, bei Fischen über 45 cm 6 cm mehr | entfällt |
| Drift läuft seit mindestens 0,5 s | ja | ja |

Sind die Bedingungen erfüllt, beißt der Fisch pro Sekunde mit der Wahrscheinlichkeit

`Grundrate × Passung × Driftgüte² × Lichtaktivität × Vorfachfaktor × (1,15 − 0,3 × Scheu)`

| Faktor | Wert |
|---|---|
| Grundrate | Euro 1,5 · Indikator 1,35 · Trockenfliege 2,2 |
| Passung | siehe unten, 0,12 bis 1,6 |
| Driftgüte | 1,0 bei sauberer Drift, bis 0,1 bei starkem Zug. Euro: auch lose Schnur zählt als schlecht. Indikator und Trockenfliege: nur Zug zählt; beim Indikator mal dessen Driftwert (0,86 bis 1,0) |
| Lichtaktivität | Morgennebel 1,2 · Mittagssonne 0,8 · Abendlicht 1,25 · bedeckt 1,1 |
| Vorfachfaktor | 0,18 mm: 0,58 · 0,16 mm: 0,72 · 0,14 mm: 0,9 · 0,12 mm: 1,06 · 0,10 mm: 1,2; bei scheuen Arten stärker, bei trübem Wasser schwächer gewichtet |
| Scheu | Regenbogen 0,3 · Saibling 0,4 · Bachforelle 0,5 · Barbe 0,6 · Huchen 0,7 · Seeforelle 0,75 · Marmorata 0,8 · Äsche 0,85 |

Der Alte beißt zusätzlich nur bei Passung ab 1,0 und Driftgüte ab 0,9.

### Passung der Fliege

Für jedes Revier werden beim Betreten aus dessen Insektenliste ein häufigstes und ein zweithäufigstes Insekt gewürfelt; bei trübem Wasser steht der Wurm vorn, wenn er im Revier vorkommt. Der umgedrehte Stein zeigt genau diese beiden an. Wasser, Licht, Insekten und der umgedrehte Stein bleiben beim Neuladen der Seite erhalten; neu gewürfelt wird erst beim nächsten Betreten des Reviers. Für Aufgaben mit „passender Nymphe“ zählt ein Fang auf eine Fliege, die eines der beiden Insekten imitiert, nachdem der Stein umgedreht wurde. Die Passung gilt für Nymphen und Trockenfliegen gleich und auch dann, wenn der Stein nicht umgedreht wurde.

| Baustein | Wert |
|---|---|
| Grundwert | 0,45 |
| Fliege imitiert das häufigste Insekt | +0,75 |
| Fliege imitiert das zweithäufigste | +0,40 |
| Reizwert der Fliege × (Trübung − 0,6) × 0,35 | glasklar: Abzug, trüb: Zuschlag |
| Lieblingsfliege der Art (z. B. Red Tag bei Äsche) | +0,30 |
| großes Muster bei Fischen über 45 cm | +0,30 bis +0,60 |

Eine unpassende Fliege wird also nicht verweigert, sie fängt nur etwa ein Drittel so oft.

| Insekt unter dem Stein | Nymphen | Trockenfliegen |
|---|---|---|
| Eintagsfliegenlarven | Pheasant Tail, Perdigon Olive, Frenchie | Parachute Adams, Klinkhåmer |
| Köcherfliegenlarven | Walt's Worm, Peeping Caddis, Mop Fly | Elk Hair Caddis, Klinkhåmer |
| Steinfliegenlarven | Pheasant Tail, Steinfliegennymphe, Huchen-Jig | Stimulator |
| Bachflohkrebse | Walt's Worm, Red Tag Jig, Eggstasy | keine |
| Würmer | Squirmy Wormy | keine |

### Tiefe und Hänger

| Methode | Wie die Nymphe auf Tiefe kommt |
|---|---|
| Euro-Nymphe | Sinkrate = Perle × Fliege × Vorfach, gebremst von der Strömung. Bei Kontakt schwebt sie bis 25 cm über Grund; lose Schnur lässt sie aufsetzen, Zug hebt sie an |
| Indikator | sinkt mit derselben Rate bis zur eingestellten Tiefe (0,3 bis 2,6 m), höchstens bis zum Grund |
| Trockenfliege | bleibt an der Oberfläche |

Liegt die Nymphe am Grund, tickt sie alle 0,3 bis 0,8 s; bei jedem Tick entsteht mit 0,6 bis 5 % ein Hänger, umso eher, je schwerer die Perle für die Wassertiefe ist. Ein Hänger löst sich per Anhieb; dabei geht die Fliege in 16 % der Fälle verloren, mit Vorfach von 0,12 mm oder dünner in 30 %.

### Indikatoren

Last = Sinkwert der Perle (2,5 mm: 0,16 · 3,0 mm: 0,26 · 3,5 mm: 0,38 · 4,0 mm: 0,54) × Sinkwert der Fliege.

| Indikator | Tragkraft | Bissfenster | Scheuchradius | Driftwert |
|---|---|---|---|---|
| Palsa-Klebeschaum | 0,24 | ×1,2 | 0,6 m | 0,97 |
| New-Zealand-Wolle | 0,30 | ×1,3 | 0,5 m | 1,00 |
| Loon Biostrike | 0,36 | ×1,15 | 0,7 m | 0,98 |
| Airlock | 0,50 | ×1,0 | 1,2 m | 0,93 |
| Oros | 0,62 | ×0,9 | 1,5 m | 0,90 |
| Thingamabobber | 0,85 | ×0,8 | 2,0 m | 0,86 |

Bis 85 % der Tragkraft schwimmt der Indikator normal. Darüber liegt er tief (Bissfenster ×0,8), über 100 % säuft er ab (Bissfenster ×0,35).

### Anhieb

Nach dem Biss bleibt ein Zeitfenster von `0,95 s − 0,3 s × Scheu`, mit Bisshilfe 20 % länger, im ersten Revier 0,3 s länger, bei der Trockenfliege 10 % länger, beim Indikator mal dessen Bissfenster-Wert. Wer es verpasst, verliert den Fisch für 22 s.

Der Anhieb kann trotz Biss scheitern: bei der Euro-Nymphe in 55 % der Fälle, wenn die Schnur zu weniger als 80 % gespannt ist; bei Indikator und Trockenfliege in 45 %, wenn sie unter 60 % liegt.

### Drill

Stärke des Fischs = Kampfwert der Art × (Länge / 40 cm)^1,1.

| Art | Maße | Kampfwert | Besonderheit |
|---|---|---|---|
| Äsche | 22–52 cm | 0,8 | |
| Bachsaibling | 16–42 cm | 0,9 | |
| Bachforelle | 18–60 cm | 1,0 | |
| Regenbogenforelle | 22–62 cm | 1,3 | springt; Gegenhalten im Sprung hakt sie aus |
| Seeforelle | 40–88 cm | 1,5 | |
| Barbe | 35–72 cm | 1,6 | |
| Marmorata | 38–82 cm | 1,6 | der Alte misst 92 cm |
| Huchen | 60–125 cm | 2,0 | |

- Alle 1,1 bis 3,3 s setzt der Fisch zu einer Flucht an, umso heftiger, je stärker und frischer er ist.
- Die Schnurspannung ergibt sich aus deinem Druck und der Flucht. Liegt sie länger als 0,75 s über der Grenze des Vorfachs, reißt es (0,10 mm: 0,72 · 0,12 mm: 0,80 · 0,14 mm: 0,88 · 0,16 mm: 0,95 · 0,18 mm: 1,06).
- Liegt sie länger als 1,7 s unter 0,16, schlitzt der Haken aus.
- Der Fisch ermüdet nur bei Spannung über 0,28, schwache Fische schneller, und um die Hälfte schneller, wenn die Rute auf der richtigen Seite steht (Seitendruck).
- Ist die Ausdauer aufgebraucht, kommt der Kescher.

### Erfahrung

XP je Fisch = Länge in cm × Artwert (Bachforelle und Regenbogen 1,0 · Saibling 1,2 · Äsche 1,3 · Barbe 1,4 · Seeforelle 1,6 · Marmorata 2,0 · Huchen 2,4). Dazu kommen, jeweils einzeln addiert: ohne Bisshilfe +25 % des Grundwerts, ohne Führungshilfe +15 %, ohne Wurfhilfe +5 XP, ohne „Klare Sicht“ +30 XP, je erfüllter Aufgabe 60 XP × Staffelnummer, der Alte +300 XP. Das Fangbild schlüsselt die Punkte auf; Stand und Bedarf stehen im HUD („Stufe 4 · 345 / 400 XP“) und in den Einstellungen unter „Punkte & Stufen“.

Es gibt 30 Stufen. Bis zur nächsten Stufe braucht man `160 + 60 × Stufe` XP, höchstens 640 (ab Stufe 8 gleichbleibend). Mit dem Durchspiel-Bot (`tools/playthrough.js`, 50 Läufe) gemessen: Staffel 1 endet etwa mit Stufe 10, Staffel 2 mit 15, Staffel 3 mit 22, Staffel 4 mit 30.

### Freischaltung

Ruten kommen mit der Staffel, alles andere mit der Stufe. Die Werte stehen in `js/data.js` (`season` bei `RIGS`, `level` bei `FLIES`, `BEADS`, `TIPPETS`, `INDICATORS`, Extras in `LEVEL_UNLOCKS`).

| Wann | Was |
|---|---|
| Start | Euro-Nymphe, Pheasant Tail, Walt's Worm, Perlen 2,5 und 3,0 mm, Vorfach 0,16 und 0,14 mm |
| Staffel 2 | Indikator-Rute (Palsa, New-Zealand-Wolle), Trockenfliegen-Rute (je 4 Parachute Adams und Elk Hair Caddis); ab jetzt steigen Fische |
| Stufe 2 | Polbrille, Perle 3,5 mm |
| Stufe 3 | Perdigon Olive |
| Stufe 4 | Vorfach 0,12 mm |
| Stufe 5 | Frenchie |
| Stufe 6 | Peeping Caddis |
| Stufe 7 | Perle 4,0 mm |
| Stufe 8 | Squirmy Wormy |
| Stufe 9 | Loon Biostrike |
| Stufe 10 | Steinfliegennymphe |
| Stufe 11 | Klinkhåmer |
| Stufe 12 | Airlock |
| Stufe 13 | Red Tag Jig |
| Stufe 14 | Vorfach 0,10 mm |
| Stufe 15 | Oros |
| Stufe 16 | Stimulator |
| Stufe 17 | Mop Fly |
| Stufe 18 | Thingamabobber |
| Stufe 20 | Vorfach 0,18 mm |
| Stufe 22 | Royal Wulff |
| Stufe 23 | Eggstasy |
| Stufe 25 | Huchen-Jig |
| Stufe 27 | Binden kostet 1 statt 2 Bindematerial |
| Stufe 30 | ein Bindematerial mehr pro Fisch |

Jede neu freigeschaltete Fliege liegt dreimal in der Dose. Aufgaben, die bestimmtes Material verlangen, liegen hinter dessen Freischaltung (3,5-mm-Perle in der Rausche, 0,12er Vorfach im Äschenzug, 4-mm-Perle ab Staffel 2, 0,10er Vorfach in Staffel 4). Ältere Spielstände werden beim Laden umgerechnet: die gesammelten XP zählen auf der neuen Kurve, und noch nicht freigeschaltetes Material wird abmontiert.

## Sprachen

Deutsch, Englisch und Italienisch – Auswahl auf dem Startbildschirm. Die Texte liegen in `js/i18n.js`, eine Zeile je Satz: `["deutsch", "english", "italiano"]`. `T('deutscher Text')` holt daraus die passende Spalte; Deutsch ist die Quellsprache und steht deshalb als Schlüssel in der Tabelle.

**Dasselbe gilt für Datenfelder, die `loc()` nicht kennt.** `loc()` übersetzt benannte Felder eines Datenobjekts an Ort und Stelle – aber nur die, die man ihm nennt. `INSECTS[].adult` stand nicht in der Liste, also hießen die fliegenden Insekten in jeder Sprache „Köcherfliegen"; und `CLARITY` ist ein nacktes Feld aus Zeichenketten, an dem `loc()` gar nicht greift, also stand die Wassertrübung in der Revierzeile ebenfalls immer deutsch da. Beides ist behoben – `adult` steht jetzt in der Liste, `CLARITY` läuft an der Verwendungsstelle durch `T()`. Die Zeilen in der Tabelle gab es längst, sie wurden nur nie nachgeschlagen.

**Was im HTML fest steht, übersetzt `applyLang()`** – Satz für Satz, von Hand gepflegt. Wer dort einen Knopf hinzufügt und ihn vergisst, bekommt kein Fehlersignal: Der Knopf bleibt einfach in jeder Sprache deutsch. Genau so war es beim Knopf „Zu zweit fischen" auf dem Startbildschirm, bei der kleinen Beschriftung „Rute" unter der Rute und bei allen sieben `aria-label` für Vorlesewerkzeuge, die seit jeher deutsch blieben.

**Zahlen gehören auch zur Sprache.** Das Dezimalkomma gilt im Deutschen und Italienischen, im Englischen steht dort ein Punkt; vor dem Prozentzeichen steht im Deutschen und Italienischen ein Leerzeichen, im Englischen nicht. Die handgeschriebenen Zeilen der Tabelle hielten sich daran („3.5 mm bead"), die gerechneten Zahlen nicht – mitten im englischen Text stand „Bead 4,0 mm". `fmt()` und `pct()` entscheiden das jetzt nach der eingestellten Sprache.

Geprüft wird das gegen die laufende Seite: Jeder sichtbare Textknoten und jedes `aria-label` wird nachgeschlagen; steht der deutsche Satz da, wo die Tabelle einen anderen kennt, ist er nicht übersetzt. In allen drei Sprachen bleibt davon nichts übrig.

## Technik

- [three.js](https://threejs.org) r160 (MIT), liegt unter `js/three.module.min.js`
- Texturen und Himmelsbilder von [Poly Haven](https://polyhaven.com) (CC0), verkleinert unter `assets/`
- Angler-Figur `Wood_Male_01` aus der [Microsoft Rocketbox Avatar Library](https://github.com/microsoft/Microsoft-Rocketbox) (MIT, siehe `assets/angler_LICENSE.md`), Texturen umgefärbt
- FBX-Loader aus den Three.js-Beispielen (MIT) unter `js/vendor/`
- Alles Weitere (Fluss, Bäume, Angler, Fische, Sound) wird im Code erzeugt
- Der Spielstand liegt im `localStorage` des Browsers

### Jahreszeiten

Die vier Staffeln spielen zu verschiedenen Jahreszeiten, und das Revier sieht jetzt auch danach aus. Die Staffel des Reviers (`season` in `js/data.js`) schaltet das um: 3 ist Herbst, 4 Winter.

**Winter** (Winterzug, Eisrinne, Nebelstrecke, Mündung):

- **Kahle Laubbäume.** Dieselbe Krone wie im Sommer, aber mit einer Geäst-Karte statt der Laubkarte. Die Karte wird im Code gezeichnet (`twigTex` in `js/world.js`): rekursiv verzweigte Linien, vom Mittelpunkt nach außen immer dünner. Keine Datei, kein Ladezeit-Zuschlag.
- Die Winterreviere standen in den Daten auf `leafShare: 0` – das war bisher die einzige Art zu sagen „hier hängt kein Laub". Da es nun kahles Geäst gibt, stehen dort wieder Laubbäume (45 %), sie tragen eben keine Blätter.
- **Schnee am Boden.** Im Bodenshader: hält auf Gras und Kies, kaum an der blanken Felswand (Gewichte 1 / 0,85 / 0,22), setzt erst ein Stück über der Wasserlinie an, damit der Saum nass bleibt, und wird von der Rauschtextur fleckig aufgebrochen.
- **Schnee auf Steinen, Treibholz und der Wathose.** Über denselben Weg wie die Kaustiken (`World.caustic`), nur andersherum: unter Wasser Kaustiken, darüber Schnee auf allem, was nach oben zeigt (`smoothstep(0.32, 0.82, Normale.y)`).
- **Es schneit.** 900 Flocken als `Points` um den Angler herum; jede fällt, driftet seitlich und setzt oben wieder an, sobald sie unten ankommt. Bei praller Mittagssonne schneit es nicht. Insekten schwärmen im Winter keine mehr.
- Gras ist auf 28 % ausgedünnt, halb so hoch und grau; Farne fehlen ganz, Schilf steht nur halb so dicht.
- Die **Schneegrenze** im Hintergrundgebirge rückt von 104 m auf 34 m herunter.

**Herbst** (Auwald, Altarm, Steinbrücke, altes Wehr):

- **Gelbes Laub.** Die Laubkarte ist grün; damit daraus Gelb wird, muss Rot weit über Grün liegen und Blau fast verschwinden – der Faktor ist `[3,1 / 2,0 / 0,16]`. Ein sanfterer Wert ergibt nur Oliv, wie die erste Fassung gezeigt hat.
- **Laubteppich am Ufer:** 2600 flach hingelegte Laubkarten, dieselbe Textur.
- Gras auf 40 % ausgedünnt und braun, Farne auf 45 % und ebenfalls braun.

**Der Hintergrund folgt mit.** Wald und Almen im Hintergrundgebirge waren fest auf Grün verdrahtet und wurden nur vom Licht getönt – obwohl sie die halbe Bildfläche füllen. Jetzt färbt die Staffel sie mit: im Herbst warm (`[1,5 / 1,12 / 0,52]`), im Winter kühl (`[0,85 / 0,88 / 0,95]`).

Gemessen kostet das nichts: 60,3 Bilder je Sekunde im Sommer, 60,1 im Winter; die Zeichenaufrufe steigen um rund 28.

## Ufer und Wald

**Das Gras war zu hoch.** Die Büschel standen zwischen 0,49 m und 1,89 m – das ist kein Ufergras, das ist ein Schilfgürtel, und der Angler watete bis zur Brust hindurch. Jetzt stehen sie 0,18 bis 0,73 m, im Mittel gut 40 cm. Dafür die Hälfte mehr Büschel (7000 statt 4800), sonst liegt der Boden frei. Das Schilf am Wasserrand ist mitgegangen: 0,35 bis 1,1 m statt bis 1,5 m – höher als das Gras, wie es sich gehört, aber kein Kamm aus schwarzen Spitzen mehr.

**Drei Reviere stehen im Wald.** Sie heißen schon so, also sollen sie auch so aussehen:

| Revier | | Bäume |
|---|---|---|
| Der Mühlbach | „schmal und verwachsen" | `forest: 2.6` |
| Der Quellbach | Fichtenwald, fast nur Nadelholz | `forest: 2.3` |
| Der Auwald | Auwald heißt Wald | `forest: 2.4` |

`forest` vervielfacht Bäume, Büsche und Farne – aus 300 Bäumen werden 780. Aber Dichte allein macht noch keinen Wald: Entscheidend ist, wie nah sie ans Wasser reichen. Die Regel, die den Angler aus dem Geäst hält (`clearOf`), hält Bäume sonst 4 bis 6,8 m vom Ufer fern, und dazwischen bleibt ein offener Streifen stehen. In Waldrevieren kommen deshalb zwei Gürtel dazu:

- **Jungwuchs**, kleine Fichten mit halber Größe. Ein kleiner Baum hat eine kleine Krone, also lässt ihn dieselbe Regel von selbst dichter heran – mit kleinerem Rand (0,6 statt 1,2 m) stehen sie 2,1 bis 3,3 m vom Wasser.
- **Ufergehölz**, wo das Revier überhaupt Laubholz trägt. Weiden und Pappeln wurzeln im Ufer; ohne sie sieht ein Auwald aus wie eine Wiese mit Wald am Horizont. Genau so sah er in der ersten Fassung aus.

**Was es kostet:** 2236 Bauminstanzen statt 204, **1,38 Millionen gezeichnete Dreiecke statt 0,56**. Die Zeichenaufrufe bleiben dagegen fast gleich (466 statt 460), weil alle Bäume einer Art in einer einzigen `InstancedMesh` stecken – das ist der Grund, warum sich das überhaupt rechnet. Die CPU-Zeit je Bild steigt von 1,40 auf 1,67 ms, der Aufbau des Reviers von 150 auf 202 ms. Am Handy fällt der Wald auf 60 % aus; 1,3 Millionen Dreiecke trägt ein Telefon nicht in voller Dichte.

Was die GPU dazu sagt, steht noch offen: Die Messung lief in einem ausgeblendeten Fenster, und dort bremst der Browser die Bildrate auf 15 Hz herunter. Die Dreieckszahl und die Zeichenaufrufe sind davon unberührt, die Bildrate wäre es nicht – deshalb steht hier keine.

## Tiere am Fluss

Vögel in der Luft, Eichhörnchen am Ufer – in `js/fauna.js`. Was ein Tier lebendig macht, ist nicht seine Form, sondern seine Bewegung: Aus zehn Metern sieht man von einem Vogel ohnehin nur die Silhouette. Darum steckt dort wenig Geometrie und viel Verhalten.

**Kleinvögel fliegen in Wellen.** Sie schlagen nur, solange sie steigen, und legen die Flügel beim Sinken an – daher der Auf-und-ab-Flug jedes Spatzen. Genau so ist es gebaut: Eine Phase läuft durch, ihr Kosinus entscheidet, ob gerade gestiegen wird; beim Steigen schlagen die Flügel mit 27 rad/s, beim Sinken stehen sie angelegt und nach hinten geschwungen, der Schwanz fächert auf. Ein Vogel, der gleichmäßig durch die Luft schlägt, sieht aus wie ein Spielzeug.

Dazu legen sie sich in die Kurve: Die Rolllage folgt der Drehrate um die Hochachse, begrenzt auf ±0,9 rad. Ein Schwarm von neun Vögeln sitzt in den Baumkronen, fliegt nach drei bis zwölf Sekunden auf, wechselt den Baum und setzt sich wieder. Gemessen über zwanzig Sekunden: zwei Drittel der Zeit sitzend, ein Drittel fliegend.

**Der Greifvogel schlägt fast nie.** Er kreist auf dem Aufwind in 24 bis 40 m Höhe, legt sich mit 0,34 rad in die Kurve und schlägt nur alle sechs bis zweiundzwanzig Sekunden ein paar Mal nach. Der Kreismittelpunkt folgt dem Angler, aber nur weiträumig – sonst würde der Vogel mitwandern, und das fiele auf.

**Eichhörnchen gehen nicht, sie springen.** Beide Hinterbeine zugleich, der Rücken macht dabei einen Buckel; jeder Sprung dauert 0,3 s und trägt bis 0,5 m. Dazwischen sitzen sie aufrecht, zucken mit dem Schwanz und drehen den Kopf ruckartig – ein Eichhörnchen schaut nicht, es zuckt hin. Das Sitzen ist ein gutes Drittel der Zeit; ein durchgehend laufendes Eichhörnchen wirkt falsch, auch wenn niemand sagen kann, warum.

Beim Aufrichten dreht sich **nicht der Rumpf, sondern die Hüfte**. Rücken, Bauch, Kopf und Schwanz hängen an einer Gruppe, deren Drehpunkt bei den Hinterbeinen liegt; nur die Hinterbeine bleiben am Boden. Die erste Fassung kippte die Rumpfkugel um ihre eigene Mitte – der Bauch blieb stehen, und das Tier fiel sichtbar auseinander.

**Sie wohnen im Baum.** Ein Eichhörnchen setzt sich an den Fuß eines Baumes in Sichtweite und bleibt in dessen Nähe (höchstens 4,5 m), und in über der Hälfte der Pausen läuft es den Stamm hinauf, verharrt oben kurz und kommt kopfüber wieder herunter. Das ist nicht nur richtiger, es ist auch das Einzige, was man sieht: Im Ufergras von einem Meter Höhe verschwindet ein 22 cm langes Tier vollständig. Die erste Fassung setzte sie irgendwo ans Ufer, und sie waren dort unsichtbar.

Wo die Bäume stehen, wird beim Bau des Reviers mitgeschrieben – Vögel setzen sich hinein, Eichhörnchen klettern daran hoch. Ein Tier, das an einem Baum hochläuft, der nicht da ist, wäre schlimmer als gar keines.

**Was es kostet:** 14 Tiere, 79 Meshes, 4178 Dreiecke, **0,01 ms Rechenzeit je Bild**. Schnabel, Nase und Ohren bewegen sich nie für sich und sind deshalb in Kopf und Schädel hineingelegt – das spart 22 Zeichenaufrufe. Am Handy ist alles auf 55 % heruntergesetzt, im Winter ebenso: Krähen fliegen auch dann, und Eichhörnchen graben ihre Verstecke aus, nur die Schwärme sind kleiner.

Nachgemessen über zwanzig Sekunden: kein Eichhörnchen im Wasser, keines schwebt (höchstens 0,098 m über dem Boden, und das ist der Sprungbogen).

**Eine Katze kommt ans Wasser, trinkt und geht wieder.** Sie ist nicht immer da: Zwischen zwei Besuchen vergeht eine gute Minute. Ein Tier, das dauernd herumsteht, ist Kulisse; eines, das man manchmal erwischt, ist ein Ereignis. Sie kommt aus dem Baumsaum neun Meter landeinwärts, geht mit 0,85 m/s ans Wasser, trinkt sieben bis sechzehn Sekunden und geht mit 1,35 m/s zurück – auf dem Rückweg hat sie es eiliger.

Im Gehen hält eine Katze den Rücken waagrecht und den Kopf ruhig; daran erkennt man sie noch auf dreißig Meter. Der Körper hebt und senkt sich um 6 mm, mehr nicht. Die Beine schwingen über Kreuz – vorn links mit hinten rechts. Wer alle vier gleich schwingen lässt, baut ein Schaukelpferd.

**Die Trinkstelle wird gesucht, nicht geraten.** Das Ufer fällt in jedem Revier anders ab, also halbiert `_tränke` das Intervall zwischen „noch im Wasser" und „schon trocken", bis die Kante auf wenige Zentimeter feststeht. Liegt der Boden dort höher als 12 cm, wird der Platz verworfen: Auf einer Kante von 20 cm trinkt die Katze Luft. Am Ziel tritt sie genau auf den geprüften Punkt – ein paar Zentimeter daneben steht sie schon wieder auf der Böschung.

Beim Trinken bleibt sie auf den Beinen und senkt nur Brust und Hals; eine trinkende Katze legt sich nicht hin. Alle zweieinhalb bis fünfeinhalb Sekunden hebt sie den Kopf und schaut – länger als zehn Sekunden säuft keine Katze am Stück.

Zwei Dinge haben beim Bauen nicht gestimmt, beide an derselben Stelle: Der Kopf saß zunächst **im** Halsgelenk, und eine Drehung des Halses bewegte ihn deshalb gar nicht; und das Vorzeichen dieser Drehung war verkehrt, sodass sich der Kopf hob statt senkte. Beides zusammen ergab eine Katze, die 38 cm über dem Wasser andächtig in die Luft schaute. Nachgemessen steht sie jetzt 5 cm vom Wasserrand auf 2 cm Höhe, und die Nasenunterkante liegt bei **−0,014 m** – also knapp unter der Oberfläche.

**Gesamtkosten aller Tiere:** 15 Stück, 92 Meshes, 5626 Dreiecke, **0,009 ms Rechenzeit je Bild**.

### Licht

Die Szene wurde bisher von zwei Lampen beleuchtet: einer gerichteten Sonne und einem Halbkugellicht, das den ganzen Himmel mit zwei Farben nachstellte. Ein `scene.environment` gab es nicht – obwohl die Himmelsbilder als Kugelprojektion ohnehin schon geladen werden.

**Jetzt beleuchtet der Himmel die Szene selbst.** `PMREMGenerator` macht aus dem Himmelsbild eine vorgefilterte Umgebung (einmal je Lichtstimmung, danach behalten). Das Halbkugellicht ist auf den Anteil zurückgefahren, den die Umgebung nicht kennt – das Licht, das vom **Boden** zurückkommt. Dessen Farbe hängt jetzt davon ab, was dort liegt: Schnee wirft hell und kühl zurück, Herbstlaub warm, eine Wiese grün. In three r160 gibt es `scene.environmentIntensity` noch nicht, die Stärke setzt `World.setEnvK` deshalb je Material.

Die **Belichtung** folgt der Lichtstimmung statt einem festen Wert für alles:

| Licht | Sonne | Halbkugel | Belichtung |
|---|---|---|---|
| Mittagssonne | 3,56 | 0,78 | 0,98 |
| Morgennebel | 2,79 | 0,75 | 1,06 |
| Abendlicht | 2,79 | 0,75 | 1,06 |
| bedeckt | 0,80 | 1,10 | 1,12 |

**Ehrlich zum Ergebnis:** Der Sprung ist kleiner, als er sein müsste, und der Grund steht im Code – fast alles hat `roughness: 1`. Bei vollständig matten Flächen liefert eine Umgebungskarte kaum mehr als das Halbkugellicht, das sie ersetzt. Sichtbar wird sie dort, wo etwas glänzt. Deshalb kamen zwei Dinge dazu, die mehr bringen als die Umgebungskarte selbst:

- **Nasser Saum an den Steinen.** Was gerade aus dem Wasser ragt (bis 34 cm darüber), ist dunkler und glänzt (`roughness` 0,16 statt 0,95); darüber bleibt der Fels matt. Vorher war ein Stein über und unter der Wasserlinie gleich stumpf – das ließ das ganze Ufer tot aussehen und gab der Umgebungskarte nichts zu spiegeln.
- **Verschattung am Fuß des Bodenbewuchses.** Zwischen den Halmen kommt unten kaum Licht an. Ohne das sitzt jeder Grasbüschel wie aufgeklebt auf dem Boden. Stärke in `World.aoU`, zum Abstimmen zur Laufzeit.

Gemessen kostet die ganze Umarbeitung nichts Messbares: bei 4,18 Megapixeln 38,0 statt 37,9 Bilder je Sekunde, bei 7,06 Megapixeln 27,6 statt 27,7.

#### Umgebungsverdeckung

Wo Dinge aneinanderstoßen, kommt weniger Licht an: am Fuß der Steine, wo das Ufer ins Wasser läuft, unter dem Angler. Ohne das steht alles mit gleicher Helligkeit nebeneinander, als wäre es aufgeklebt.

Gerechnet wird aus der **Tiefe des Hauptbildes** (`AO_FS`), die es dafür erst geben musste – lesbar war bisher nur die Tiefe des Unterwasserbildes. Einen Normalenpuffer gibt es nicht, die Normale entsteht deshalb aus der Ableitung der wiedergewonnenen Position. Um jeden Punkt liegen zwölf Proben auf einer Spirale im goldenen Winkel; liegt eine näher an der Kamera als die dort gemessene Tiefe, verdeckt sie. Der Durchgang läuft auf **halber Kantenlänge** und wird danach zweimal weichgezeichnet – Verdeckung ist großflächig, Rauschen fiele sonst auf. Ab 28 m blendet sie aus, weil die Tiefe dort zu grob wird und es sonst flimmert.

Eingerechnet wird sie **vor** Bloom und Sonnenstrahlen: Licht darf eine Ecke überstrahlen, aber eine Ecke darf das Licht nicht schlucken.

Sie hat einen **eigenen Schalter** in den Einstellungen und ist ab Werk aus. Sie hängt bewusst nicht an der Grafikstufe: Sie ist der einzige Posten im ganzen Spiel, der spürbar Leistung kostet, und ob einem das Bild das wert ist, entscheidet man selbst. Solange sie an ist, entfällt MSAA – die Tiefe ließe sich sonst nicht lesen, und ein Schalter, der in kleinen Fenstern stumm bleibt, wäre schlimmer als kein Schalter.

| Auflösung | aus | an | Kosten je Bild |
|---|---|---|---|
| 2,05 MP | 59,4 fps | 57,2 fps | 0,65 ms |
| 4,18 MP | 39,0 fps | 37,9 fps | 0,71 ms |
| 7,06 MP | 28,6 fps | 27,5 fps | 1,46 ms |

### Licht unter Wasser

Die bewegte Oberfläche bündelt das Sonnenlicht zu einem hellen Netz, das über den Grund wandert (Kaustiken). Gerechnet wird es aus zwei gegenläufig verschobenen Abgriffen derselben Rauschtextur, die auch die Wellen formt: Wo beide Abgriffe gleich hell sind, liegt ein Strahl – `pow(1 - |c1 - c2| * 3.4, 7)` macht daraus scharfe Linien statt weicher Flecken.

Das Flussbett hat das im eigenen Shader. `World.caustic()` legt dasselbe Muster auf alles andere unter Wasser: Steine, Treibholz, Fische und die Beine des Anglers. Gerechnet wird in Weltkoordinaten – anders als das Bett sind diese Dinge verschoben und gedreht, bei Instanzen kommt die Instanzmatrix dazu. Weil das Muster aus derselben Formel an derselben Weltposition entsteht, läuft es durch: ein Stein im Flussbett trägt genau die Strahlen weiter, die neben ihm auf dem Kies liegen.

Unterschiedlich sind nur zwei Werte je Material. Der Grundwert sagt, wie hell die Fläche ohne Strahl steht: Steine, Holz und Wathose stehen wie der Grund etwas dunkler (0,84 bis 0,88), **Fische auf 1,0** – sie bekommen nur Licht dazu, nie weniger. Einen Fisch zu entdecken ist Spielinhalt, und der Grund um ihn herum steht schon auf 0,8; ein Fisch darf davor nicht absaufen. Bei bedecktem Himmel fällt die Stärke auf 0,3, weil die Oberfläche dann kaum noch etwas zu bündeln hat.

### Klang

Es gibt keine Sounddateien; alles entsteht in WebAudio (`js/audio.js`). Vier Stimmen laufen durchgehend und werden achtmal je Sekunde nachgeführt – in Lautstärke, Filter und **Seite**:

| Stimme | Was sie ist | Woran sie hängt |
|---|---|---|
| Nahfeld | das Wasser um die Beine | Wassertiefe am Angler und Strömung des Reviers |
| Rausche | gebrochenes Wasser an den Steinen | jeder Stein ist eine Quelle, gewichtet nach Größe und Strömung |
| Wasserfall | die Stufen ober- und unterhalb | `world.fallSpots`, Reichweite 20 m |
| Wind | Grundzug mit langsamen Böen | zwei ineinandergeschobene Schwingungen |

Richtung entsteht über `StereoPanner`. Die Kamera blickt in Richtung `(-sin yaw, -cos yaw)`, rechts von ihr liegt `(cos yaw, -sin yaw)`; das Skalarprodukt aus dieser Rechtsachse und der Richtung zur Quelle ergibt die Seite. Die Lautstärke fällt mit dem Quadrat des Abstands. Dreht man sich an der Rausche um 90°, wandert ein Wasserfall von der Mitte auf 0,96 nach rechts.

Mehrere Quellen derselben Art werden zu einer Stimme zusammengefasst – ihr Schwerpunkt bestimmt die Seite. Steht man genau zwischen zwei Wasserfällen, heben sie sich dabei teilweise auf; das ist der Preis dafür, dass auch ein Steinfeld mit 46 Steinen nur eine Stimme kostet. Weil sich in so einem Feld schnell ein Dutzend Quellen summieren, sättigt die Kennlinie (`g / (g + k)`), sonst klebt die Rausche am Anschlag und reagiert auf nichts mehr.

Ereignisse klingen dort, wo sie geschehen: der Ring eines steigenden Fischs (bis gut 30 m hörbar – man hört, wo er steht, bevor man ihn sieht), das Aufsetzen der Fliege, Platscher im Drill, der Sprung. Schritte kommen alle 0,75 m **wirklich zurückgelegter** Strecke; im Wasser schwappt es, am Ufer knirscht der Kies, und weil man im tiefen Wasser langsamer vorankommt, kommen die Schritte dort von selbst seltener.

Die Rollenbremse ist eine Klickschleife: 20 Klicks je Sekunde liegen im Puffer, die Abspielrate macht daraus 3 bis 60 und hebt dabei die Tonhöhe mit – wie eine echte Bremse. Die Rate folgt der Geschwindigkeit, mit der `F.dist` wächst: läuft Schnur ab, kreischt sie; kurbelst du ein, klickt es langsam.

Vogelstimmen richten sich nach dem Licht: Morgennebel alle 3,5 s, Abendlicht 4,5 s, Mittagssonne 11 s, bedeckt 16 s.

Alle vier Dauerstimmen hängen an einem gemeinsamen Regler (`AMB` in `js/audio.js`, steht auf 0,2). Die Zahlen in `setField` beschreiben nur das Verhältnis untereinander – wie laut der Fluss insgesamt steht, hängt allein an dieser einen Zahl. Sie steht bewusst tief: ein Fluss rauscht sonst lauter als alles, was man hören will. Zum Abstimmen geht in der Konsole `__nm.sfx.setAmb(0.3)` ohne Neuladen.

Gemessen kostet der ganze Klang nichts: 60,3 Bilder je Sekunde mit Ton, 60,1 ohne.

### Leistung

Die Bildzeit hängt fast genau an der Pixelzahl, nicht an der Rechenlast – deshalb wird dort gespart, wo Pixel entstehen:

- **Kantenglättung:** FXAA im Abschluss-Durchgang (`FINAL_FS`) statt vierfachem MSAA auf dem Halbgleitkomma-Ziel. Gemessen kostete MSAA bei 2,9 Megapixeln rund 11 ms pro Bild, FXAA unter 0,5 ms. MSAA bleibt nur unter 0,9 Megapixeln, wo es billig ist und die Kanten sauberer trennt.
- **Auflösungsdeckel nach Fläche** statt nach Gerätedichte (`World.maxPixels`): höchstens 2,3 Megapixel am Rechner, 1,2 mobil. Ein 4K-Schirm ergäbe sonst acht Megapixel; gerendert wird dann in vollem HD und hochskaliert.
- **Auflösungsregler** (`World._autoScale`): in der Stufe „Automatisch" führt das Spiel die Renderskala selbst nach, zwischen 75 % und 100 %. Gezählt wird, wie viele Bilder in einem Fenster von 45 Bildern wirklich ankommen – nach zwei Fenstern unter 54 je Sekunde geht es eine Stufe hinunter, über 58 nach zwei ruhigen Fenstern wieder hinauf. Bringt eine Absenkung keine drei Bilder je Sekunde, liegt es nicht an den Pixeln (anderes Fenster im Vordergrund, Rechenlast): dann geht die Skala zurück und der Regler hält 15 Sekunden still. Ohne diese Prüfung frisst er sich bis zum Anschlag hinunter und das Bild wird weich, ohne schneller zu werden. Das HUD bleibt in jedem Fall scharf, weil es HTML ist.
- **Nachschärfen:** liegt die Renderauflösung unter der des Schirms, schärft der Abschluss-Durchgang mit vier Abgriffen nach, bevor das Bild hochskaliert wird.
- **Grafikstufen** im Menü: Automatisch (Regler), Hoch (immer volle Auflösung), Mittel (fest 75 %), Niedrig (ohne Schatten, Gras und Spiegelung, 65 %).
- **Sparmodus** (`_cheap`): Bloom und Sonnenstrahlen fallen weg, die Kantenglättung bleibt. Er greift erst, wenn der Regler am Anschlag ist; danach geht das Spiegelbild im Wasser, zuletzt die ganze Nachbearbeitung.
- **Wasser-Durchgänge:** das Unterwasserbild läuft mit halber, das Spiegelbild mit 35 % der Kantenlänge, beide zusätzlich auf 1,1 Megapixel gedeckelt. Beides wird ohnehin gebrochen oder auf bewegtem Wasser verzerrt; im Bildvergleich ist kein Unterschied zu sehen. Das Spiegelbild wird weiterhin nur jedes zweite Bild erneuert.
- **Himmel zuletzt** statt zuerst (`renderOrder`): der Himmels-Shader läuft nur noch über die frei gebliebenen Pixel, nicht über den ganzen Schirm, der danach übermalt wird.
- **Schatten:** Schattenkamera von 52 auf 40 m zusammengezogen, Karte von 2048² auf 1536², einfaches PCF statt weichem. Die Texeldichte steigt dabei leicht, im Bildvergleich bei Mittagssonne sind die Kanten minimal härter.
- **Ufersteine als Instanzen:** die 110 reinen Ziersteine am Ufer waren einzelne Netze und standen in drei Durchgängen; als sechs `InstancedMesh` sinken die Zeichenaufrufe je Bild von rund 1850 auf 1470. Die Steine im Fluss bleiben einzeln, weil Schnur und Fliege per Strahl auf ihnen aufliegen.

`tools/perf.js` misst das nach: in der Konsole des laufenden Spiels `await (await import('./tools/perf.js')).run()` – gleiches Revier, gleiche Kamera, Bildrate über mehrere Auflösungen.
