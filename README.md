# affenmal — Minecraft-Portfolio

![Dorf mit Kirschblüten in der Abenddämmerung](public/assets/screenshots/dorf-abenddaemmerung.webp)

Meine persönliche Portfolio-Seite zu meiner Minecraft-Welt: japanische Tempel, Schreine,
Gärten und eine eigene Geschichte — Block für Block gebaut.

Die ganze Seite ist ein Spaziergang: Beim Scrollen geht die Kamera durch ein Torii-Tor und
einen Steinpfad unter blühenden Kirschbäumen entlang, während die Inhalte darüber gleiten.

**Live:** [mc.siggidy.dev](https://mc.siggidy.dev) · [sieder2009.github.io/mc-website](https://sieder2009.github.io/mc-website/)

## Was die Seite kann

- **3D-Welt im Hintergrund** — Torii, Sandō (Steinpfad) mit Laternen, Sakura-Bäume und
  fallende Blütenblätter, gebaut mit React Three Fiber. Wird erst nachgeladen, wenn sie
  gebraucht wird, und auf Handys automatisch abgespeckt.
- **3D-Skin-Viewer** — mein Minecraft-Skin (`affenmal`) zum Drehen, geladen über mc-heads.net.
- **Meine Welt** — Steckbrief der Welt (Version, Modloader, Spielmodus), eine Zeitleiste mit
  den Meilensteinen und eine Galerie der Bauwerke mit Lightbox und Koordinaten.
- **Statistiken** — hochzählende Kennzahlen wie Spieltage und Anzahl Bauwerke.
- **Modrinth** — meine Projekte werden bei jedem Besuch live über die Modrinth-API geladen.
- **Server & Kontakt** — der Server-Bereich erscheint nur, wenn eine Adresse eingetragen ist.
- **Animiertes Tab-Icon** — ein Hanko-Stempel (湯瑪斯), der sich wie eine Kuckucksuhr einmal
  pro Minute umdreht und kurz meinen Minecraft-Kopf zeigt.
- **Feinschliff** — Intro-Animation, Smooth Scrolling, Scroll-Fortschrittsbalken und
  Abschnitts-Navigation am Rand.

Bei „Bewegung reduzieren“, aktivem Datensparmodus oder ohne brauchbare WebGL-Grafik wird die
3D-Welt weggelassen — die Seite zeigt dann einfach den schlichten Papier-Look.

## Tech-Stack

| Bereich    | Verwendet                                                   |
| ---------- | ----------------------------------------------------------- |
| Framework  | [React 19](https://react.dev) + [Vite 8](https://vite.dev)  |
| 3D         | three.js, @react-three/fiber, skinview3d                    |
| Animation  | GSAP, Lenis (Smooth Scrolling)                              |
| Bilder     | sharp (Screenshots → WebP)                                  |
| Hosting    | GitHub Pages und Vercel                                     |

## Lokal starten

Voraussetzung: [Node.js](https://nodejs.org) (aktuelle LTS-Version).

```bash
npm install       # Abhängigkeiten installieren
npm run dev       # Entwicklungsserver mit Hot Reload
npm run build     # Produktions-Build nach docs/
npm run preview   # fertigen Build lokal ansehen
```

## Inhalte ändern

Alle Texte, Daten und Bilder stehen an einer Stelle: **`src/data/content.js`**.
Was dort geändert wird, erscheint automatisch auf der Seite. Leere Felder (`null`, `""`, `[]`)
werden sauber ausgeblendet oder durch einen Platzhalter ersetzt.

| Feld               | Inhalt                                                     |
| ------------------ | ---------------------------------------------------------- |
| `name`, `slogan`   | Name und Untertitel                                        |
| `links`            | GitHub- und Modrinth-Links im Footer                       |
| `hero`             | Texte neben dem Skin, optional Hintergrundbild oder -video |
| `minecraftName`    | Minecraft-Name für Skin-Viewer und Tab-Icon                |
| `world`            | Version, Modloader, Spielmodus, Beschreibung, Download     |
| `worldHistory`     | Zeitleiste — ein Eintrag `{ date, title, text }` pro Meilenstein |
| `builds`           | Galerie — Titel, Beschreibung, Koordinaten, Bild           |
| `stats`            | Kennzahlen (`value: null` zeigt „–“)                       |
| `modrinthUsername` | Modrinth-Benutzername für die Projektliste                 |
| `serverAddress`    | Server-Adresse (leer = Bereich ausgeblendet)               |
| `contact`          | Kontaktangabe, z. B. Discord                               |

### Neue Screenshots hinzufügen

1. Das Rohbild in den Ordner `screnshots/` legen (wird nicht committet).
2. In `scripts/process-screenshots.mjs` unter `jobs` einen Eintrag ergänzen.
3. `node scripts/process-screenshots.mjs` ausführen — das Bild wird auf max. 1600 px Breite
   verkleinert und als WebP nach `public/assets/screenshots/` gespeichert.
4. Das Bild in `content.js` bei `builds` eintragen.

## Deployment

`npm run build` schreibt die fertige Seite nach **`docs/`** (nicht `dist/`). Der Ordner wird
mitcommittet, weil GitHub Pages direkt daraus ausliefert.

- **GitHub Pages** — Einstellung: *Settings → Pages → Branch `main`, Ordner `/docs`*.
  Nach dem Build `docs/` committen und pushen.
- **Vercel** ([mc.siggidy.dev](https://mc.siggidy.dev)) — `vercel.json` setzt Build-Befehl
  und Ausgabeordner `docs`, `.vercelignore` hält die großen lokalen Ordner vom Upload fern.
  Deploy mit `npx vercel --prod`.

## Projektstruktur

```
mc-website/
├── index.html                  # Einstieg, Meta-Tags, Schriften
├── public/                     # statische Dateien (Favicons, Screenshots)
├── src/
│   ├── data/content.js         # ★ alle Inhalte der Seite
│   ├── App.jsx                 # Aufbau der Seite aus den Abschnitten
│   ├── components/             # Abschnitte und UI-Bausteine
│   │   └── three/              # 3D-Welt: Torii, Pfad, Sakura, Blütenblätter
│   ├── hooks/                  # z. B. useModrinth, useReveal, useCounter
│   ├── lib/                    # Helfer: Animation, Skin-URL, WebGL-Check
│   └── styles/index.css
├── scripts/
│   └── process-screenshots.mjs # Screenshots → WebP
├── docs/                       # Build-Ausgabe (für GitHub Pages committet)
├── vite.config.js
└── vercel.json
```

Nur lokal und **nicht** im Repo: `#2/` (die Minecraft-Welt selbst, ca. 11 GB),
`screnshots/` (unbearbeitete Screenshots), `LandingPage/` (Referenz-Repo zur Design-Recherche)
und `node_modules/`.

## Hinweis

Nicht offiziell mit Mojang oder Microsoft verbunden. Minecraft ist eine Marke von Mojang AB.
Alle Screenshots stammen aus meiner eigenen Welt.
