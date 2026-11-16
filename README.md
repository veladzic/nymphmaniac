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
| Werfen | Finger aufs Wasser, Zielring schieben, loslassen | wie am Handy mit der Maus |
| Rute führen | nach unten ziehen | Maus ziehen |
| Anhieb | nach oben wischen oder ANHIEB | Leertaste / Rechtsklick |
| Drill | auf dem Bild oder am Rutenstick unten Mitte: nach unten ziehen = Druck, seitlich = Seitendruck; DRILL (links oder rechts) halten = fester Druck | Maus ziehen oder Leertaste, A/D |
| Rig-Baukasten | Knopf „Rig“ oben rechts | R, Fliegen direkt mit F |
| Anglersicht | Knopf „POV“ | V |
| Tagebuch, Opas Seiten, Fangbuch | Knopf 📖 | T |

Drei Methoden: Euro-Nymphe mit Sighter, ab Staffel 2 Nymphe unter einem schwimmenden Indikator (sechs Typen mit eigener Tragkraft) und Trockenfliege auf steigende Fische.

**Rig-Baukasten.** Oben zeigt eine Vorschau das montierte Rig, darunter liegen die Steckplätze Rute, Fliege, Perle, Vorfach und beim Indikator zusätzlich Indikator und Tiefe. Ein Steckplatz öffnet seine Auswahl mit Balken für Sinkrate, Unauffälligkeit, Reißfestigkeit, Reizwert und Hängerrisiko; Antippen montiert. Gesperrtes steht ausgegraut mit „ab Stufe X“ oder „ab Staffel 2“ da. Am Handy sind Übersicht und Auswahl zwei Ansichten, ab 760 px Breite stehen sie nebeneinander.

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

Pro Stein gibt es genau einen Platz (Tasche, Kissen oder Kante, zufällig gewichtet 30 / 32 / 38 %). Beim Betreten eines Reviers wird das 1,4-Fache des Revierwerts `fishN` besetzt (13 bis 17 Fische, höchstens so viele wie Plätze). Die Plätze werden dafür der Länge nach in gleich viele Abschnitte geteilt und in jedem genau einer zufällig besetzt, damit keine Teilstrecke leer bleibt. Art und Länge werden pro Fisch gewürfelt: die Art nach den Gewichten des Reviers, die Länge zwischen Mindest- und Höchstmaß der Art, kleine Fische deutlich häufiger als große.

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

### Steigen: Nymphe oder Trockenfliege

Gestiegen wird erst, wenn die Trockenfliegen-Rute freigeschaltet ist (ab Staffel 2). Vorher bleiben alle Fische am Grund.

Nicht jeder Fisch steigt. Beim Besetzen wird pro Fisch gewürfelt, ob er überhaupt an die Oberfläche kommt: Barbe nie, Huchen 25 %, Marmorata 45 %, Seeforelle 60 %, Bachforelle, Regenbogenforelle und Saibling 72 %, Äsche 90 %. Der Alte steigt nie. Fische, die nicht steigen, bleiben immer am Grund und nehmen nur Nymphen.

Die übrigen wechseln selten zwischen zwei Zuständen:

| Zustand | Dauer | Nimmt |
|---|---|---|
| am Grund | 200 bis 400 s, geteilt durch die Aktivität des Lichts | nur Nymphen (Euro oder Indikator) |
| steigend | 150 bis 300 s; der Fisch steht dicht unter der Oberfläche und macht alle 2,5 bis 7 s einen Ring | nur Trockenfliegen |

Die Uhr eines Fischs läuft nur, solange du weiter als 16 m entfernt bist. Ein Fisch in deiner Nähe bleibt also bei dem, was er gerade tut – wer sein Rig auf ihn abstimmt, trifft ihn auch so an.

Zu Beginn steigen etwa 35 % der steigfähigen Fische, und jeder startet an einer zufälligen Stelle seines Abschnitts, damit sie nicht alle gleichzeitig hochkommen. Bei Morgennebel und Abendlicht sind die Pausen am Grund kürzer, es steigen also mehr Fische.

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

Für jedes Revier werden beim Betreten aus dessen Insektenliste ein häufigstes und ein zweithäufigstes Insekt gewürfelt; bei trübem Wasser steht der Wurm vorn, wenn er im Revier vorkommt. Der umgedrehte Stein zeigt genau diese beiden an. Die Passung gilt für Nymphen und Trockenfliegen gleich und auch dann, wenn der Stein nicht umgedreht wurde.

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

XP je Fisch = Länge in cm × Artwert (Bachforelle und Regenbogen 1,0 · Saibling 1,2 · Äsche 1,3 · Barbe 1,4 · Seeforelle 1,6 · Marmorata 2,0 · Huchen 2,4). Dazu kommen, jeweils einzeln addiert: ohne Bisshilfe +25 % des Grundwerts, ohne Führungshilfe +15 %, ohne „Klare Sicht“ +35 XP, je erfüllter Aufgabe 60 XP × Staffelnummer, der Alte +300 XP. Das Fangbild schlüsselt die Punkte auf; Stand und Bedarf stehen im HUD („Stufe 4 · 345 / 400 XP“) und in den Einstellungen unter „Punkte & Stufen“.

Es gibt 30 Stufen. Bis zur nächsten Stufe braucht man `160 + 60 × Stufe` XP, höchstens 640 (ab Stufe 8 gleichbleibend). Gedacht ist: Staffel 1 endet etwa mit Stufe 8, Staffel 2 mit 15, Staffel 3 mit 22, Staffel 4 mit 30.

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

Deutsch, Englisch und Italienisch – Auswahl auf dem Startbildschirm. Die Texte liegen in `js/i18n.js`.

## Technik

- [three.js](https://threejs.org) r160 (MIT), liegt unter `js/three.module.min.js`
- Texturen und Himmelsbilder von [Poly Haven](https://polyhaven.com) (CC0), verkleinert unter `assets/`
- Angler-Figur `Wood_Male_01` aus der [Microsoft Rocketbox Avatar Library](https://github.com/microsoft/Microsoft-Rocketbox) (MIT, siehe `assets/angler_LICENSE.md`), Texturen umgefärbt
- FBX-Loader aus den Three.js-Beispielen (MIT) unter `js/vendor/`
- Alles Weitere (Fluss, Bäume, Angler, Fische, Sound) wird im Code erzeugt
- Der Spielstand liegt im `localStorage` des Browsers
