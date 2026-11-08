---
name: lernplan
description: Erstellt einen realistischen Lernplan bis zum Klausurtermin auf Basis der Themen-Analyse und des bisherigen Fortschritts.
argument-hint: <fach> <klausurdatum> [stunden-pro-tag]
---

# Lernplan

Argumente: `$ARGUMENTS` (Fach, Klausurdatum, optional Stunden pro Tag – sonst nachfragen).

1. Lies `notizen/themen.md` (fehlt sie: erst `/klausur-analyse` ausführen) und `notizen/fortschritt.md`.
2. Frag kurz nach, falls unklar: Vorwissen (Themen, die schon sitzen), freie Tage, andere Klausuren.
3. Plane vom heutigen Datum bis zum Klausurtag:
   - Wichtigste und schwächste Themen zuerst, mit Wiederholungen nach ca. 1, 3 und 7 Tagen.
   - Pro Tag: Thema, Aufgabe (z. B. „`/erklaeren` Kapitel 4, dann Altklausur WS22 Aufg. 2–3“), geschätzte Zeit.
   - Mindestens zwei volle Probeklausuren unter Zeitdruck (`/probeklausur`), die letzte 2–3 Tage vorher.
   - Der letzte Tag: nur Wiederholung der Must-know-Liste, nichts Neues.
   - 15 % Puffer einplanen.
4. Speichere als `notizen/lernplan.md` mit Checkboxen (`- [ ]`) und zeige die nächsten 3 Tage im Chat.
