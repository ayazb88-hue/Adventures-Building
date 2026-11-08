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
  | `src/realm.js` | Nachbarreich (Feste, Diplomatie mit Wahl, Krieg, Belagerung, Vasall/Bündnis) und Stadtmauer |
  | `src/guild.js` | Erfolge (`ACHIEVEMENTS`, stündlich geprüft), Gruppen-Expeditionen der Gilde (Riss-Boss, Beute), S-Rang-Risse (`sim.srift`, `sriftTick`, Ausbruch nach 3 Tagen) |
  | `src/render.js` | Grafik: Sprites, Gebäude, Licht, Partikel, Minikarte (gezeichnete Figuren als Alternative) |
  | `src/iso.js` | Isometrische Gebäude: Bausteine (`isoKit`: Wände, Satteldach, Walmdach, Rundturm, Zinnen, Fenster, Türen, Fachwerk, Mauerwerk) und alle Gebäude (`isoHouse`, `isoCastle`, `isoSmithy` …). Ursprung = Mitte der Grundfläche |
  | `src/pixel.js` | Pixel-Art-Figuren (Standard): Posen auf 40×40-Raster, ab Zoom `HD_FROM` doppelt fein (`R = 2`, 80×80, halbe Punkte) mit HD-Details (Falten, Knöpfe, Nieten, Waffen-Glanz); Kopf-/Haar-Vorlagen, HD-Anime-Augen/Münder je Gefühl (`EYE_HD`, `MOUTH_HD`, `pxFaceHD`), Umriss, Bild-Cache, Riss-Bosse |
  | `src/story.js` | Handlung: Kapitel der Chronik, Hauptfigur, Rivale + Duelle, Boss „Kronenfresser“, Lebensziele, Spieler-Gedanken, Tagebuch |
  | `src/sound.js` | Live erzeugter Klang |
  | `src/rift.js` | Riss-Welten: eigene Szene je Riss, wenn eine ausgewählte Person im Riss ist |
  | `src/scene.js` | Anime-Modus: Szenen (Bühne, Porträt-Dialoge, Effekte), Persönlichkeiten (`LINES`), Drehbücher (`SCENES`), Folgen und Regisseur (`directorTick`, `directorEvents`) |
  | `src/ui.js` | HUD, Log, Steckbriefe, Hauptschleife, Start |
- Bauen: `python3 build.py --check` (baut `index.html` und prüft die Syntax).
- Testen: `node tools/simtest.js 14 7,42` (simuliert Welten, meldet Fehler, abgeschnittene Siedler und Kennzahlen). Vor jedem Commit ausführen.
- **Spielstände nie verwerfen**: `SAVE_KEY` bleibt gleich; bei Formatänderungen `SAVE_VERSION` erhöhen und in `applySave()` eine Übertragung für alte Stände schreiben (fehlende Felder mit Standardwerten füllen). Neue Geländearten in `TILE_DEFS` **nur hinten anhängen** – Spielstände speichern ihre Typenliste (`types`) mit, alte Listen stehen in `OLD_TYPE_LISTS`.
- Gespeichert wird **immer automatisch** (Browser alle 5 s, Konto alle 20 s). „📤 Kopie / 📥 Kopie laden“ (unter ⚙️ Mehr) ist nur für andere Geräte; das Format muss abwärtskompatibel bleiben.
- Im Claude-Artifact wird zusätzlich im Konto gespeichert (Capability `db` + `user`, private Einträge unter `data/users/<id>/welt` und `welt-0…n`, je ≤ 200 000 Zeichen). Beim Veröffentlichen `capabilities: {db: {}, user: {}}` angeben. Beim Laden wird die verpasste Zeit nachgerechnet (`catchUp`, höchstens 2 Spieltage).
- Leistung: Ziel 60–70 Siedler bei ≥ 40 Bildern/s auf dem Handy. Keine Suche über die ganze Karte in jeder Minute; fehlgeschlagene Pläne werden pausiert (`n.cool`).
- **Isometrische Ansicht** (Rauten wie in Aufbauspielen): Die Simulation rechnet weiter auf dem normalen Raster. Im Renderer gilt `isoX/isoY` (Weltpixel → Bildschirm), `unIso`, `screenToTile`, `tileToScreen`. Boden-Dinge (Gelände, Schatten, Lichtkarte, Gebiete, Wege) mit `world()` (Rauten-Abbildung) zeichnen; aufrechte Dinge (Gebäude, Bäume, Figuren, Schrift) vorher mit `at(wx, wy)` bzw. `atB(tile)` an ihren Platz setzen. Gezeichnet wird diagonal (x + y) von hinten nach vorn.
- Bewegung: Anzeige gleitet weich hinterher (runde Kurven, An-/Abbremsen, `an.sx`), Rechtsgehen (seitlicher Versatz zur Laufrichtung), Anlaufen in `moveAlong`.
- Nichts soll eckig wirken: Laufwege werden geglättet (`smoothPath`, Sichtlinie, Trampelpfade entlang der echten Linie), Wege als Kurven mit weichen Innenecken, Pflaster füllt Ecken zwischen Gassen, Ufer und Schaum mit runden Ecken, Bäume/Büsche/Steine mit festem Versatz (`jit`).
- Stadtleben (nur Grafik): `houseLook` (Tür zur Straße gespiegelt, Größe, Versatz), `townProp`/`drawProp` (Laternen, Fässer, Kisten, Bänke, Blumen, Holz, Karren, Straßenbäume, Wäscheleinen zwischen Häusern, Marktstände am Markt), Hauptstraße ab Verkehr 180 mit Steinplatten, Dorfplatz `Settlement.plaza` (wird nie bebaut; Linde → Brunnen ab 5 Häusern → Zierbrunnen ab 12 bzw. Hauptstadt).
- Wege müssen frei bleiben: Häuser und Felder liegen auf dem Raster mit Abstand 2 um das Lager. Felder sind begehbar; ab Bauernhof-Stufe II wachsen sie zusammen (`findFieldGrowth`, Gruppe bis 6/9 Kacheln). Aussehen: `fieldShape` (einzeln: eigene Form) bzw. `joinedField` (zusammen: durchgehende Furchen, Früchte je 3×3-Block).

## Arbeitsweise (Tokens sparen)
- Nur die betroffene Datei in `src/` lesen und gezielt ändern; nicht die ganze `index.html` lesen.
- Mehrere Wünsche in einem Durchgang erledigen; danach bauen, testen, Screenshot prüfen, committen.
- Veröffentlicht wird zusätzlich als Claude-Artifact (Link im Gespräch) und optional über GitHub Pages.

## Fahrplan
1. ✅ Siedler, Häuser, Tag/Nacht, Speichern, Erwachte, Risse, Ausrüstung, Schmiede, Felder, Monster, Gilde, Königreich mit Burg und Außenposten
   - Fertigkeiten für alle Siedler (`SKILL_INFO`, `skillLevel`): Stufen aus Arbeitspunkten, Boni auf Tempo/Ernte, Richtfest-Bonus beim Hausbau
2. ✅ Handel und Markt: Marktplatz, Markttag (Münzen), Händlerkarren zwischen den Orten, fahrender Händler mit Kristallen
3. ✅ Stein und neue Gebäude: Steinmetze und Steinbruch, Wachtürme (schießen auf Monster), Taverne (Abendtreff, Musik, kostet Münzen), Tempel (Heilung, Laune). Stadtmauer ✅ (Fahrplan 4)
3b. ✅ Handlung (Kapitel, Hauptfigur, Rivale, roter Riss, Boss), Info-Fenster im Anime-Stil, Riss-Welten, Gebäude-Stufen I–III, Verstärkung +1…+10, Forsthaus, Bauernhof, Gildenhalle (Gilden-Stufe), Haustiere und Zähmen, Erzähler-Kamera
4. ✅ Banditen (Rotschal-Bande), Handel mit Lagerwaren, Nachbarreich mit Diplomatie (Spieler wählt, sonst Regentschaft), Krieg und Belagerung, Vasall/Bündnis, Stadtmauer; Brücken über Furten, Boote
4b. ✅ Anime-Modus: Folgen mit Titel/Rückblick/Cliffhanger, Szenen mit Porträt-Dialogen und Effekten, Regisseur, Persönlichkeiten, Musik-Motive, Hauptfigur von Anfang an. Dazu Szenen für Treue-Schwur, Gildenversammlung, Tagebuch-Monolog, Zähmung, Riss-Rückkehr, Krönung, Fall des Hauptmanns, Level-Meilensteine; Gesichtsausdrücke im Pixel-Gesicht (`drawExpression`); Rivale mit silbernem Haar. Ideen: Vorspann-Lied
5. 🔶 Gruppen-Expeditionen der Gilde mit Riss-Boss ✅, Erfolge ✅, „📍 Hinspringen“ bei Meldungen ✅, Log antippbar ✅. S-Rang-Risse mit Ausbruch ✅, Riss-Bosse mit eigenem Aussehen (`RIFT_BOSSES`: Smaragdkoloss, Glutwurm, Nebelhirte, Sternenschlund) ✅
6. Optional: wenige Erwachte denken mit einem echten Sprachmodell (nur mit API-Schlüssel, sparsam)
