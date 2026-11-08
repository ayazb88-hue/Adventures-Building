---
name: klausur-analyse
description: Wertet alle Altklausuren eines Fachs aus und erstellt ein Ranking der prüfungsrelevanten Themen, Aufgabentypen und Punkte. Nutzen, wenn neue Altklausuren hinzugefügt wurden oder die Vorbereitung für ein Fach startet.
argument-hint: <fach>
---

# Klausur-Analyse

Fach: `$ARGUMENTS` (Ordner `faecher/$ARGUMENTS/`). Fehlt das Fach, liste die Ordner unter `faecher/` auf und frag nach.

1. Lies **jede** Datei in `altklausuren/` vollständig (PDFs seitenweise). Überfliege `skript/`, um Themen den Kapiteln zuzuordnen.
2. Erfasse pro Aufgabe: Klausur/Semester, Aufgabennummer, Thema, Aufgabentyp (Rechnen, Definition, Beweis, Transfer, Multiple Choice, Code …), Punkte, Skript-Kapitel.
3. Schreibe `notizen/themen.md` mit:
   - **Überblick:** Anzahl Klausuren, Dauer, Gesamtpunkte, Aufbau, erlaubte Hilfsmittel (falls erkennbar).
   - **Themen-Ranking** als Tabelle: Thema | Häufigkeit (x von n Klausuren) | Ø Punkteanteil | typische Aufgabentypen | Skript-Stelle. Sortiert nach erwartetem Punktgewinn.
   - **Muster:** Aufgaben, die fast wörtlich wiederkommen; Themen, die zuletzt neu dazukamen; was nie gefragt wurde.
   - **Must-know-Liste:** Die 20 %, die ca. 80 % der Punkte bringen.
   - **Aufgabenverzeichnis:** jede Aufgabe mit Fundstelle, damit man später gezielt üben kann.
4. Fasse im Chat in max. 10 Zeilen zusammen und schlage `/lernplan` als nächsten Schritt vor.
