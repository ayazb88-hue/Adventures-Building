# Adventures-Building – Spielvision und Arbeitsregeln

## Vision
Eine lebendige 2D-Fantasy-Welt im Browser (vor allem auf dem Handy), in der KI-Siedler selbst leben, eine Siedlung aufbauen und mit der Zeit zu einem **Königreich** wachsen. Beim Herauszoomen soll man denken: „Oha, was geht hier ab!“

Inspiration (nur Stimmung, **nichts kopieren** – keine Namen, Figuren, Grafiken oder Begriffe aus fremden Werken):
- *Overgeared*: Schmied-Held, sichtbare Ausrüstung mit Seltenheiten, Gilde, Gebiet, Königreich, Treue durch geschenkte Ausrüstung.
- *Solo Leveling*: „Erwachte“, Level, Statusfenster, System-Meldungen, tägliche Aufgaben, Risse/Tore mit Monstern.
- Aufbauspiele: Siedler mit Berufen, Wege, Felder, Gebäude, Wachstum.

## Stil
- **Figuren**: anime-inspiriert (große Augen mit Glanzlichtern, fransiger Pony, kräftige Haarfarben, Cel-Schatten), aber **immer kleiner als Gebäude** (Tür > Mensch, Burg überragt alles).
- **Gebäude**: Schrägansicht (Vorderseite + Seitenwand + Dachfläche), Fachwerk, liebevolle Details (Blumenkästen, Laternen, Rauch).
- **Licht**: Tageszeiten, Sonnenschatten, Nacht mit Lichtquellen, Wetter, Partikel.
- **Ausrüstung** sichtbar an den Figuren; Seltenheitsfarben: Gewöhnlich grau, Selten blau, Episch lila, Legendär gold, Mythisch rot.
- Texte im Spiel auf **Deutsch**, kurz und freundlich; geschlechtsneutral formulieren, wo es geht.
- Eigene Fantasy-Namen erfinden (z. B. Rissling, Sternenschmied, Eldmar).

## Technik
- Alles läuft als **eine Datei `index.html`** ohne Abhängigkeiten (Canvas 2D, Web Audio, localStorage). Sie wird **gebaut** – nicht direkt bearbeiten!
- Quellcode liegt in `src/`:
  | Datei | Inhalt |
  |---|---|
  | `src/head.html` | HTML-Gerüst, CSS, Oberfläche |
  | `src/core.js` | `CONFIG`, Klassen, Fähigkeiten, Ausrüstung, Welt + Kartengenerierung, `Settlement` |
  | `src/logic.js` | Aktionen (Utility-KI), NPC, Simulation (Monster, Königreich, Speichern) |
  | `src/render.js` | Grafik: Sprites, Gebäude, Licht, Partikel, Minikarte (gezeichnete Figuren als Alternative) |
  | `src/pixel.js` | Pixel-Art-Figuren (Standard): Posen auf 40×40-Raster, Kopf-/Haar-Vorlagen, Umriss, Bild-Cache |
  | `src/sound.js` | Live erzeugter Klang |
  | `src/ui.js` | HUD, Log, Steckbriefe, Hauptschleife, Start |
- Bauen: `python3 build.py --check` (baut `index.html` und prüft die Syntax).
- Testen: `node tools/simtest.js 14 7,42` (simuliert Welten, meldet Fehler, abgeschnittene Siedler und Kennzahlen). Vor jedem Commit ausführen.
- **Spielstände nie verwerfen**: `SAVE_KEY` bleibt gleich; bei Formatänderungen `SAVE_VERSION` erhöhen und in `applySave()` eine Übertragung für alte Stände schreiben (fehlende Felder mit Standardwerten füllen). Neue Geländearten in `TILE_DEFS` **nur hinten anhängen** – Spielstände speichern ihre Typenliste (`types`) mit, alte Listen stehen in `OLD_TYPE_LISTS`.
- Spieler können ihren Stand über „📤 Sichern / 📥 Laden“ als Text mitnehmen; das Format muss dafür abwärtskompatibel bleiben.
- Leistung: Ziel 60–70 Siedler bei ≥ 40 Bildern/s auf dem Handy. Keine Suche über die ganze Karte in jeder Minute; fehlgeschlagene Pläne werden pausiert (`n.cool`).
- Wege müssen frei bleiben: Häuser und Felder liegen auf dem Raster mit Abstand 2 um das Lager.

## Arbeitsweise (Tokens sparen)
- Nur die betroffene Datei in `src/` lesen und gezielt ändern; nicht die ganze `index.html` lesen.
- Mehrere Wünsche in einem Durchgang erledigen; danach bauen, testen, Screenshot prüfen, committen.
- Veröffentlicht wird zusätzlich als Claude-Artifact (Link im Gespräch) und optional über GitHub Pages.

## Fahrplan
1. ✅ Siedler, Häuser, Tag/Nacht, Speichern, Erwachte, Risse, Ausrüstung, Schmiede, Felder, Monster, Gilde, Königreich mit Burg und Außenposten
2. ✅ Handel und Markt: Marktplatz, Markttag (Münzen), Händlerkarren zwischen den Orten, fahrender Händler mit Kristallen
3. ✅ Stein und neue Gebäude: Steinmetze und Steinbruch, Wachtürme (schießen auf Monster), Taverne (Abendtreff, Musik, kostet Münzen), Tempel (Heilung, Laune). Offen: Stadtmauer
4. Rivalisierende Königreiche / Banditen, Diplomatie, Belagerung
5. Bosse aus Rissen höheren Rangs, Gruppen-Expeditionen der Gilde
6. Optional: wenige Erwachte denken mit einem echten Sprachmodell (nur mit API-Schlüssel, sparsam)
