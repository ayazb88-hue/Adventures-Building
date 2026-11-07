# Adventures-Building

Eine kleine 2D-Siedlungssimulation im Browser: NPCs leben auf einer Kachelkarte, kümmern sich selbst um Hunger und Schlaf, sammeln Holz und bauen daraus gemeinsam eine Siedlung.

Alles steckt in **`index.html`** (HTML + JavaScript + Canvas). Es gibt keine Abhängigkeiten und keinen Build-Schritt. Die Seite läuft auch im Handy-Browser.

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
- **Nachwachsen:** Beeren wachsen nach, gefällte Bäume nach 2 Tagen auch.
- **Tempo:** ⏸ / 1x / 2x / 5x. Bei 1x dauert ein Spieltag 6 Minuten.

## Code-Aufbau (für Erweiterungen)

| Abschnitt in `index.html` | Inhalt | Erweitern um … |
|---|---|---|
| 1 `CONFIG` | alle Spielwerte, Gebäude, Berufe, Start-NPCs | neue Gebäude (Markt, Schmiede), Berufe, mehr NPCs |
| 3 `World` | Kacheln, Kartengenerierung, Wegfindung (BFS) | neue Kacheltypen (Stein, Erz, Felder) |
| 4 `Settlement` | Lager, Gebäude, Baustellen | Bauplanung, Bevölkerungswachstum |
| 5 `defineAction` | Aktionen mit `score` und `plan` | Handeln, Einkaufen, Jagen, Schmieden, Kämpfen |
| 6 `NPC` | Bedürfnisse, Entscheidung, Aufgaben | `skills`/`gainXp` → Level-System, `profession` → Berufe, `inventory` → Münzen und Waffen |
| 7 `Simulation` | Zeit, Ereignisse (`on`/`emit`), Log | z. B. `buildingCompleted` → neuer Siedler zieht ein |
| 8 `Renderer` | Canvas-Zeichnung | Sprites, Kamera/Zoom |

Für die Browser-Konsole: `SIM` ist die laufende Simulation, z. B. `SIM.addNpc({name:'Lina', color:'#c77dff'})`.
