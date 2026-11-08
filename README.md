# Adventures-Building

Eine kleine 2D-Siedlungssimulation im Browser: NPCs leben auf einer Kachelkarte, kümmern sich selbst um Hunger und Schlaf, sammeln Holz und bauen daraus gemeinsam eine Siedlung.

Das Spiel ist **eine Datei `index.html`** (HTML + JavaScript + Canvas, keine Abhängigkeiten) und läuft auch im Handy-Browser. Sie wird aus den Teilen in `src/` gebaut: `python3 build.py --check`. Test: `node tools/simtest.js`. Vision, Stil und Regeln stehen in [`CLAUDE.md`](CLAUDE.md).

## Starten

- Online über GitHub Pages (siehe unten), oder
- lokal: `index.html` im Browser öffnen.
- `?seed=42` an die URL hängen, um immer dieselbe Welt zu bekommen.

## Als App aufs Handy

Über GitHub Pages öffnen, dann im Browser **Teilen → Zum Home-Bildschirm** (iPhone) oder **⋮ → App installieren** (Android). Die App startet im Vollbild und läuft auch offline.

**Spielstand:** wird automatisch im Browser und – im Claude-Link – zusätzlich privat in deinem Claude-Konto gespeichert und bei Updates übernommen. Während du weg bist, läuft die Welt weiter (bis zu 2 Spieltage werden beim Öffnen nachgerechnet). Du musst nie selbst speichern. Nur wer auf ein ganz anderes Gerät wechseln will, findet unter „⚙️ Mehr“ eine Kopie zum Mitnehmen.

**Bedienung:** Wischen verschiebt die Karte, zwei Finger zoomen, ein angetippter Siedler wird verfolgt und zeigt seine Gedanken. 🔊 schaltet den Ton. Der Spielstand wird automatisch im Browser gespeichert.

## Anime-Modus (Standard)

Die Welt wird wie eine Serie erzählt: Jeden Spieltag beginnt eine **Folge** mit Titel und „Was bisher geschah“. Wichtige Momente (Erwachen, Schmiedebuch, legendäre Waffe, Duelle, Überfälle, Boss) werden als **Szene** gezeigt – Bühne mit großen Figuren, Dialoge mit Porträts und Gefühlen (💢 ✨ 💧 🔥), Speed-Lines, Bildschirm-Wackeln, große Schriftzüge und System-Fenster. Ein **Regisseur** sorgt für mindestens drei Szenen pro Tag (Morgen, Training am Mittag, Lagerfeuer am Abend mit Cliffhanger). Hauptfigur, Rivale, Gefährten und Bandenhauptmann haben eigene Sprechweisen. Während einer Szene steht die Welt still; antippen = weiter, ⏭ = überspringen. Unter „⚙️ Mehr“ lassen sich die Szenen abschalten.

## Ansicht

Die Karte wird **isometrisch** gezeigt – als Rautenraster wie in klassischen Aufbauspielen: diagonale Wege, Felder als Rauten, Gebäude und Figuren stehen aufrecht darauf. Weit herausgezoomt sieht man die ganze Stadt wachsen.

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
- **Figuren:** Pixel-Art (Standard): jede Pose auf einem 40×40-Raster mit dunklem Umriss, Anime-Augen, sechs Frisuren, Berufskleidung und sichtbarer Ausrüstung; Animation in festen Bildern. Über „🎨 Figuren“ lässt sich auf die gezeichneten Figuren umschalten.
- **Handel:** Marktplatz in der Hauptstadt (Siedler bummeln dort), Markttag jeden Mittag (Überschuss → Münzen), Händlerkarren mit Esel bringen Brot und Holz von reichen zu armen Orten, ein fahrender Händler verkauft Mana-Kristalle.
- **Stein und Gebäude:** Steinmetze brechen Stein aus Felsen (Spitzhacke, Grubenhelm). Wachtürme am Ortsrand schießen nachts auf Monster, die Taverne ist abends Treffpunkt mit Lautenmusik (kostet Münzen), im Tempel heilen Wunden und die Laune steigt.
- **Fertigkeiten:** Jeder Siedler steigt in seinen Tätigkeiten auf (Bauen, Holzfällen, Ackerbau, Bergbau, Sammeln, Schmieden, Gespräche, Kampf). Höhere Stufen arbeiten schneller bzw. ernten mehr; nach jedem fertigen Haus gibt es ein Richtfest mit Bau-Erfahrung.
- **Risse:** Leuchtende Tore in eine andere Welt. Erwachte ab Level 4 gehen auf Expedition und kehren mit Mana-Kristallen zurück – oder verwundet.
- **Große Welt:** 80×80 Kacheln mit Fluss und Furten, Seen, Wäldern, Felsen, Ruinen und Wildtieren. Minikarte zum Springen; weit herausgezoomt sieht man das ganze Dorf wachsen.
- **Alles antippbar:** Häuser (Bewohner, Baudatum, Erbauer), Lager, Baustelle, Bäume, Sträucher, Risse, Ruinen.
- **Nachwachsen:** Beeren wachsen nach, gefällte Bäume nach 2 Tagen auch.
- **Handlung:** Die Chronik (📖) erzählt in Kapiteln, was passiert: das erste Haus, das Licht vom Himmel (die Hauptfigur ★), das vergessene Schmiedebuch, die erste Legende, ein Rivale aus dem Norden mit täglichen Duellen, das Königreich, der rote Riss und der Boss „Kronenfresser“. Jedes neue Kapitel wird groß eingeblendet.
- **Klügere Erwachte:** Lebensziele (Stärke, Schmiedekunst, Ruhm, Reichtum, Schutz), Gedanken wie Spieler („Noch 40 EP bis Level 7“), Neid und Glückwünsche, abends ein Tagebucheintrag.
- **🎬 Erzähler-Modus:** Die Kamera folgt von selbst dem Spannendsten (Boss, Duelle, Kämpfe, Level-Aufstiege, sonst der Hauptfigur) mit Kinobalken und Untertiteln.
- **Info-Fenster wie im Anime:** Antippen zeigt ein System-Fenster mit Kategorie, Rang, Effekt und Beschreibung – für Gebäude, Gelände, Siedler, Monster und Ausrüstung (Ausrüstungsteil antippen).
- **Riss-Welten:** Ist eine ausgewählte Person in einem Riss, sieht man sie dort kämpfen – jeder Riss hat seine eigene Welt (Kristallwald, Aschefelder, Sternenmeer, Nebelsumpf, Glutkaverne) mit Etagen und Wächter.
- **Stufen und Verstärkung:** Gebäude werden auf Stufe II und III ausgebaut (mehr Betten, mehr Reichweite, bessere Schmiede …); Ausrüstung wird in der Schmiede auf +1 bis +10 verstärkt (ab +6 kann es misslingen).
- **Neue Gebäude:** Forsthaus (Holzfäller pflanzen nach), Bauernhof (Hühner, Kuh, Eier und Milch), Gildenhalle (Versammlungen, Gilden-Stufe, mehr Erfahrung).
- **Lager und Inventar:** Im Lagerhaus wachsen sichtbar Holzstapel, Steinhaufen, Kornsäcke, eine Kristallkiste und eine Münztruhe. Antippen (Lagerhaus oder Lagerfeuer) öffnet ein Inventar mit Feldern; jedes Feld zeigt Herkunft, Verwendung und Beschreibung. Übrige oder ersetzte Ausrüstung landet im Lager und wird morgens an Erwachte verteilt. Jeder Siedler hat einen Rucksack.
- **Hausformen:** Fachwerkhaus, Strohdach-Kate, Steinhaus mit Efeu, Walmdachhaus mit Gaube und Balkon, in der Stadtmitte Stadthäuser.
- **Banditen:** Ab Tag 7 überfällt die Rotschal-Bande manchmal tagsüber das Lager des reichsten Ortes, ab Tag 12 mit ihrem Hauptmann. Sie stopfen Münzen, Kristalle und Brot in Säcke (sichtbar auf dem Rücken) und fliehen. Wer sie besiegt (Erwachte oder Wachtürme), holt die Beute zurück. Arbeiter verstecken sich.
- **Handel mit dem Lager:** Der fahrende Händler kauft übrige Ausrüstung und zu viel Stein, verkauft Brot und Stein, wenn es knapp wird. Alles steht im Handelsbuch des Lagers.
- **Nachbarreich:** Nach der Königreichsgründung erhebt sich am Kartenrand eine fremde Feste (Dornwacht, Grauhafen oder Aschenthal – jedes mit eigenem Temperament). Gesandte kommen mit Anliegen – **du wählst** im Fenster „Diplomatie“: Bündnis anbieten, Geschenke senden, Tribut fordern oder ablehnen (sonst entscheidet die Regentschaft nach ihrem Charakter). Gute Beziehungen führen zum Bündnis (täglicher Handelszug), schlechte zum Krieg: Ein Heer aus Dornrittern mit Feldherr belagert die Hauptstadt. Zweimal abgewehrt, wird das Nachbarreich zum Vasallen und zahlt Abgaben.
- **Stadtmauer:** Die Hauptstadt bekommt Stück für Stück eine Mauer mit Türmen und Toren (kostet Stein und Holz) – sie schützt bei Belagerungen.
- **Brücken und Boote:** Über die Furten führen Brücken, auf den Seen segeln Boote.
- **Gruppen-Expeditionen:** Alle drei Tage zieht die Gilde (3–4 Erwachte ab Level 8) gemeinsam in den stärksten Riss und kämpft gegen einen Riss-Boss – mit Szene vorher und nachher und viel Beute. In der Riss-Welt sieht man die ganze Gruppe kämpfen.
- **Erfolge (🏆):** 25 Erfolge vom ersten Dach bis zum Vasallen-Reich.
- **📍 Hinspringen:** System-Meldung antippen springt zum Ort des Geschehens; eine Zeile im Log antippen wählt den Siedler aus.
- **Tiere:** Erwachte zähmen Gefährten (Wolfswelpe, Fuchs, Eule, Kristallhase, selten Mini-Drache) mit Boni; manche Arbeiter bringen Hund oder Katze mit. Die Tiere laufen ihren Menschen hinterher.
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
