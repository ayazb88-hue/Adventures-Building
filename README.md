# Adventures-Building

Eine kleine 2D-Siedlungssimulation im Browser: NPCs leben auf einer Kachelkarte, kümmern sich selbst um Hunger und Schlaf, sammeln Holz und bauen daraus gemeinsam eine Siedlung.

Das Spiel ist **eine Datei `index.html`** (HTML + JavaScript + Canvas, keine Abhängigkeiten) und läuft auch im Handy-Browser. Sie wird aus den Teilen in `src/` gebaut: `python3 build.py --check`. Test: `node tools/simtest.js`. Vision, Stil und Regeln stehen in [`CLAUDE.md`](CLAUDE.md).

## Starten

- Online über GitHub Pages (siehe unten), oder
- lokal: `index.html` im Browser öffnen.
- `?seed=42` an die URL hängen, um immer dieselbe Welt zu bekommen.

## Als App aufs Handy

Über GitHub Pages öffnen, dann im Browser **Teilen → Zum Home-Bildschirm** (iPhone) oder **⋮ → App installieren** (Android). Die App startet im Vollbild und läuft auch offline.

**Bedienung:** Wischen verschiebt die Karte, zwei Finger zoomen, ein angetippter Siedler wird verfolgt und zeigt seine Gedanken. 🔊 schaltet den Ton. Der Spielstand wird automatisch im Browser gespeichert.

## So funktioniert es

- **Karte:** Wiese, Wald, Wasser, Beerensträucher, in der Mitte das Lager (Lagerfeuer).
- **NPCs:** Mira und Tarek, jeweils mit Hunger (0 = satt) und Energie.
- **Entscheidungen (Utility-KI):** Jede Aktion bewertet sich selbst, der NPC nimmt die mit der höchsten Wertung:
  - Hunger ≥ 55 → Beeren essen
  - müde (oder Nacht) → schlafen, im Haus erholt man sich schneller
  - Baustelle offen → mitbauen
  - 5 Holz getragen → zum Lager bringen
  - sonst → Holz hacken
- **Bauen:** Sobald 20 Holz im Lager sind, entsteht eine Baustelle und alle bauen gemeinsam ein Haus.
- **Wachstum:** Ist ein Haus fertig, ziehen Siedler ohne Zuhause ein und ein neuer Siedler kommt in die Siedlung (höchstens 30).
- **Denken:** Jeder Siedler hat Charakterzüge (fleißig, gesellig, neugierig …), Laune, ein Bedürfnis nach Gemeinschaft, Beziehungen, Erinnerungen und eigene Gedanken. Sie unterhalten sich, schließen Freundschaften und planen voraus (z. B. vor dem Schlafen noch essen).
- **Wetter und Licht:** Sonnenstand mit Schatten, Wolken, Regen, Abendrot, Nacht mit Lagerfeuer- und Fensterlicht, Glühwürmchen.
- **Klang:** Musik, Vögel, Grillen, Feuer, Regen und Axtschläge – live im Browser erzeugt.
- **Erwachte („Spieler“):** Wenige Siedler erwachen (der erste durch ein Licht vom Himmel in der ersten Nacht, später manche Neuankömmlinge). Sie haben Level, Erfahrungspunkte, Werte (Kraft, Geschick, Ausdauer, Charisma), ab Level 4 eine Klasse (Waldläufer, Baumeister, Hüter der Haine, Herold, versteckt: Torwandler), Fähigkeiten, Titel und jeden Tag eine eigene Aufgabe. Alle anderen sind einfache Arbeiter.
- **Ausrüstung:** Waffe, Rüstung, Helm, Stiefel, Umhang in fünf Seltenheiten (Gewöhnlich, Selten, Episch, Legendär, Mythisch) – sichtbar an den Figuren, Legendäres schimmert. Geschmiedet in der **Schmiede** aus Mana-Kristallen und Holz; wer beschenkt wird, wird dem Schmied treu.
- **Sternenschmied:** In einer Ruine liegt ein vergessenes Schmiedebuch. Wer es findet, erhält die legendäre Klasse – und fällt auf Level 1 zurück.
- **Gilde:** Ab zwei Erwachten gründen sie eine Gilde.
- **Monster:** Ab Tag 3 kriechen nachts Monster aus den Rissen (Rissling, Schattenwolf, Aschegolem) und werden jede Nacht stärker. Erwachte kämpfen (Nah- und Fernkampf je nach Waffe), Arbeiter verstecken sich in den Häusern. Im Morgenlicht zerfallen die Monster.
- **Felder und Berufe:** Arbeiter sind Holzfäller, Bauern oder Handwerker (erkennbar an Mütze, Strohhut, Stirnband). Bauern legen Felder an; das Getreide wächst einen Tag und wird zu Brot.
- **Königreich:** Ist der stärkste Erwachte stark genug und die Siedlung groß, ruft er ein Königreich aus. In der Hauptstadt entsteht eine Burg (3×3 Felder), Erwachte ziehen mit Gefolge los und gründen Außenposten, die jeden Morgen Abgaben schicken. Gebiete und Ortsnamen sind auf der Karte zu sehen.
- **Gebäude in Schrägansicht:** Häuser mit Seitenwand, zwei Dachflächen, Fachwerk, Fensterläden, Blumenkästen, Laterne; nahe der Ortsmitte zweistöckige Stadthäuser. Häuser werden nur gebaut, wenn Betten gebraucht werden.
- **Figuren:** im Verhältnis kleiner als Gebäude, mit verjüngten Gliedmaßen, Gesicht in Schrägansicht, sechs Frisuren, Kleidung mit Kragen, Gürtel und Tasche.
- **Handel:** Marktplatz in der Hauptstadt (Siedler bummeln dort), Markttag jeden Mittag (Überschuss → Münzen), Händlerkarren mit Esel bringen Brot und Holz von reichen zu armen Orten, ein fahrender Händler verkauft Mana-Kristalle.
- **Risse:** Leuchtende Tore in eine andere Welt. Erwachte ab Level 4 gehen auf Expedition und kehren mit Mana-Kristallen zurück – oder verwundet.
- **Große Welt:** 80×80 Kacheln mit Fluss und Furten, Seen, Wäldern, Felsen, Ruinen und Wildtieren. Minikarte zum Springen; weit herausgezoomt sieht man das ganze Dorf wachsen.
- **Alles antippbar:** Häuser (Bewohner, Baudatum, Erbauer), Lager, Baustelle, Bäume, Sträucher, Risse, Ruinen.
- **Nachwachsen:** Beeren wachsen nach, gefällte Bäume nach 2 Tagen auch.
- **Tempo:** ⏸ / 1x / 2x / 5x. Bei 1x dauert ein Spieltag 6 Minuten.

## Code-Aufbau (für Erweiterungen)

| Abschnitt (Datei in `src/`) | Inhalt | Erweitern um … |
|---|---|---|
| 1 `CONFIG` | alle Spielwerte, Gebäude, Berufe, Start-NPCs | neue Gebäude (Markt, Schmiede), Berufe, mehr NPCs |
| 3 `World` | Kacheln, Kartengenerierung, Wegfindung (BFS) | neue Kacheltypen (Stein, Erz, Felder) |
| 4 `Settlement` | Lager, Gebäude, Baustellen | Bauplanung, Bevölkerungswachstum |
| 5 `defineAction` | Aktionen mit `score` und `plan` | Handeln, Einkaufen, Jagen, Schmieden, Kämpfen |
| 6 `NPC` | Bedürfnisse, Entscheidung, Aufgaben | `skills`/`gainXp` → Level-System, `profession` → Berufe, `inventory` → Münzen und Waffen |
| 7 `Simulation` | Zeit, Ereignisse (`on`/`emit`), Log | z. B. `buildingCompleted` → neuer Siedler zieht ein |
| 8 `Renderer` | Canvas-Zeichnung | Sprites, Kamera/Zoom |

Für die Browser-Konsole: `SIM` ist die laufende Simulation, z. B. `SIM.addNpc({name:'Lina', color:'#c77dff'})`.
