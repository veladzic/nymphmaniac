# Nymphmaniac – Das Erbe der Smaragda

Ein 3D-Fliegenfischer-Spiel für den Browser mit Schwerpunkt Euro-Nymphing. Gedacht fürs Handy im Hochformat, läuft aber auch am Desktop.

Opa Emil hinterlässt dir seine Nymphenrute, eine Fliegendose und ein Tagebuch mit fünf Strecken der Smaragda. Am Ende wartet ein Fisch, den er nie landen konnte.

Vier Staffeln mit elf Revieren: Opas Tagebuch (Wiese bis Smaragdgumpen), Lenis Karte (Quellbach, Seeauslauf), Herbst im Unterlauf (Auwald, altes Wehr) und der Winterkönig (Winterzug, Mündung mit Huchen). Der Fluss mäandriert in jedem Revier anders.

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
| Drill | nach unten ziehen = Druck, seitlich = Seitendruck | Maus ziehen oder Leertaste, A/D |

## Sprachen

Deutsch, Englisch und Italienisch – Auswahl auf dem Startbildschirm. Die Texte liegen in `js/i18n.js`.

## Technik

- [three.js](https://threejs.org) r160 (MIT), liegt unter `js/three.module.min.js`
- Texturen und Himmelsbilder von [Poly Haven](https://polyhaven.com) (CC0), verkleinert unter `assets/`
- Angler-Figur `Wood_Male_01` aus der [Microsoft Rocketbox Avatar Library](https://github.com/microsoft/Microsoft-Rocketbox) (MIT, siehe `assets/angler_LICENSE.md`), Texturen umgefärbt
- FBX-Loader aus den Three.js-Beispielen (MIT) unter `js/vendor/`
- Alles Weitere (Fluss, Bäume, Angler, Fische, Sound) wird im Code erzeugt
- Der Spielstand liegt im `localStorage` des Browsers
