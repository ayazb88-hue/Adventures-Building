# Tutor fürs Studium 🎓

Ein Lern-System für **Claude Code**, das dich mit deinen **Altklausuren** optimal auf Klausuren vorbereitet.

## Setup (5 Minuten)

1. Repo klonen und Claude Code im Ordner starten: `claude`
2. Pro Fach den Vorlage-Ordner kopieren:
   ```bash
   cp -r faecher/_vorlage faecher/analysis2
   ```
3. Material reinlegen:
   - `altklausuren/` – alte Klausuren (PDF, Fotos, mit Lösungen falls vorhanden)
   - `skript/` – Folien, Skript, Mitschriften
   - `uebungen/` – Übungsblätter
4. Los geht's 👇

## Workflow

| Schritt | Befehl | Was passiert |
|---|---|---|
| 1 | `/klausur-analyse analysis2` | Alle Altklausuren auswerten → Themen-Ranking in `notizen/themen.md` |
| 2 | `/lernplan analysis2 2027-02-15 3` | Tagesplan bis zur Klausur (3 h/Tag) |
| 3 | `/erklaeren analysis2 Taylorreihen` | Thema verstehen, mit echtem Klausurbeispiel |
| 4 | `/abfragen analysis2` | Quiz – bevorzugt deine Schwächen |
| 5 | `/probeklausur analysis2 90` | Neue Klausur im Stil der alten + Musterlösung |
| 6 | `/korrektur analysis2` | Foto deiner Lösung schicken → Punkte & Feedback |

Claude merkt sich in `notizen/fortschritt.md`, was sitzt und was nicht, und fragt Schwächen später wieder ab.

## Tipps
- **Mehr Altklausuren = bessere Analyse.** Fachschaft, Moodle/ILIAS, Kommilitonen fragen.
- **Erst selbst versuchen**, dann Hinweis holen – der Tutor ist absichtlich so gebaut.
- Probeklausuren **auf Papier und mit Timer** schreiben.
- Lege Altklausuren/Skripte nur in ein **privates** Repo – sie sind oft urheberrechtlich geschützt. Alternativ in `.gitignore` aufnehmen.

## Aufbau
```
CLAUDE.md                 # Tutor-Regeln (wird automatisch geladen)
.claude/skills/           # die /Befehle
faecher/<fach>/
  altklausuren/ skript/ uebungen/
  notizen/                # Analyse, Lernplan, Fortschritt, Probeklausuren
```
