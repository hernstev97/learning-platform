## Grundmodell

| Ebene | Wo | Was du tust |
| --- | --- | --- |
| Absicht | Notiz, ein Satz | vorher festlegen |
| Hinweis | Raum | bauen, ändern |
| Verhalten | Spieler | beobachten, notieren |

Prüfsatz für Notizen: Könnte eine Kamera das aufnehmen? Wenn nein, ist es Deutung.

## Absichtsnotiz

```text
Abschnitt:
Absicht (ein Satz):
  Der Spieler soll …
Erwarteter Weg:
Hinweise (wo, was, wofür):
Zeichen, dass es klappt:
Zeichen, dass es scheitert:
```

## Rasterkarte

| Zeichen | Bedeutung |
| --- | --- |
| `#` | Wand, Fels: blockiert Weg und Sicht |
| `.` | Boden |
| `o` | niedriges Hindernis: blockiert Weg, nicht Sicht |
| `~` | Wasser, Abgrund: blockiert Weg, nicht Sicht |
| `+` | Durchgang, Tür |
| `S` `A` | Start, Ausgang |
| `L` `*` `B` `!` | Landmarke, Fundstück, Begegnung, Hinweis |
| `1`–`9` | Wegpunkte |

## Bildschirm in Tiles

| Spielbild | Tile | Tiles quer × hoch |
| --- | --- | --- |
| 320 × 180 | 16 | 20 × 11,25 |
| 384 × 216 | 16 | 24 × 13,5 |
| 480 × 270 | 16 | 30 × 16,9 |
| 640 × 360 | 16 | 40 × 22,5 |
| 640 × 360 | 32 | 20 × 11,25 |

Karopapier: ein Kästchen = ein Tile, Rahmen 20 × 11 = ein Bildschirm bei 320 × 180 und 16 px.

## Zeit und Weg bei 90 px/s (Platzhalter)

| Strecke | Pixel | Sekunden |
| --- | --- | --- |
| 1 Tile | 16 | 0,18 |
| 2 Tiles | 32 | 0,36 |
| Ausweichen (Platzhalter) | 66 | 0,73 |
| halber Bildschirm hoch | 90 | 1,0 |
| halber Bildschirm quer | 160 | 1,8 |
| Bildschirm quer | 320 | 3,6 |
| drei Bildschirme quer | 960 | 10,7 |

`Sekunden = Pixel / Tempo` · `Tiles = Pixel / Tilegröße` · Vorlauf bei Kamera in der Mitte: halbe Bildbreite bzw. -höhe.

## Blickführung

| Mittel | Wirkt durch | Vorsicht |
| --- | --- | --- |
| Tonwertkontrast | hell gegen dunkel | stärker als Farbe allein |
| Farbe, Sättigung | einzelner Akzent | viele Akzente heben sich auf |
| Licht | „Players tend to follow the light“ (Valve) | Licht am falschen Ort führt falsch |
| Bewegung | zieht sofort | Dauerbewegung wird Rauschen |
| Linien | Wege, Kanten, Zäune, Flüsse | zeigen auch weg vom Ziel |
| Rahmung | Öffnung um das Ziel | Rahmen nicht lauter als Ziel |

Ein Hauptpunkt, wenige Nebenpunkte, viel Ruhe. Unschärfetest: Bildschirmfoto verwischen, was sticht noch hervor?

## Orientierung nach Lynch

| Element | Im Top-down-Spiel | Prüffrage |
| --- | --- | --- |
| Weg | Pfad, Gang, Brücke | Wohin führt er sichtbar? |
| Kante | Mauer, Fluss, Abgrund | Woran entlang orientiere ich mich? |
| Bereich | Gebiet mit eigener Gestalt | Weiß ich, wo ich bin? |
| Knoten | Kreuzung, Platz, Hub | Erkenne ich ihn wieder? |
| Landmarke | einzigartiger Bezugspunkt | Ist sie im Bild oder gemerkt? |

Sichtlinie in der Draufsicht = Bildausschnitt + hohe Verdecker und Dächer + Licht und Dunkel.

## Hilfen nach Sicherheit (Level Design Book)

| Stufe | geschätzt | Beispiele |
| --- | --- | --- |
| subtil | 1–20 % | Anspielung auf bekannte Orte, Baumuster der Welt |
| grob | 35–60 % | Komposition, Sichtlinien, Landmarke in der Ferne, Licht, Farbe |
| situativ | 70–93 % | Figur, die vorausgeht, Spur aus Fundstücken, bewachter Ausgang |
| direkt | 95–98 % | tiefe, breite Barrieren, Zielmarker im HUD |

„start at the top, and gradually incorporate less subtle methods in response to playtesting“

## Möglichkeiten einführen

| Schritt | Kishōtenketsu (Hayashida) | Teach, Test, Twist |
| --- | --- | --- |
| 1 | einführen, sicher erproben | Teach |
| 2 | entwickeln | Test |
| 3 | wenden | Twist |
| 4 | abschließen | – |

Pro Raum höchstens eine Neuheit. „Players Learn Better When Not Stressed.“ (Valve, Portal)

## Rhythmus (Left 4 Dead, AI Director)

| Phase | Was passiert |
| --- | --- |
| Build Up | Bedrohung bis zur Spitze |
| Sustain Peak | Spitze 3–5 s halten |
| Peak Fade | auf Minimum zurück |
| Relax | 30–45 s Ruhe, dann neu |

Tätigkeiten im Wechsel: Bewegung · Beobachtung · Entdeckung · Begegnung. Vor großen Begegnungen ein Ort mit Überblick.

## Vier Arten, einen Hinweis zu verfehlen

| Art | Beleg im Protokoll | Hebel |
| --- | --- | --- |
| nicht bemerkt | kein Halt, kein Wort | Lage im Bild, Kontrast, Konkurrenz weg |
| falsch gelesen | geht hin, deutet anders | Form, visuelle Sprache, Zustand |
| nicht befolgt | sieht, entscheidet anders | Kosten, Belohnung zeigen, Reihenfolge |
| unbeabsichtigte Folge | Weg weicht ab | Kante, Kollision, Breite |

Eine Änderung pro Runde, Erwartung vorher, frische Tester.

## Iterationsprotokoll: eine Runde

```text
Runde · Tester (neu?)
Stelle:
Gesehen:   n von m …
Art:
Änderung:  (genau eine)
Erwartung: (zählbar)
Ergebnis:  (nach dem Test)
```

## Playtest

| Tu das | Lass das |
| --- | --- |
| nur Steuerung erklären | Ziel oder Weg verraten |
| Weg, Halt, Umkehr, Blickrichtung notieren | Deutung als Beobachtung notieren |
| Fragen zurückgeben („Was denkst du?“) | helfen, entschuldigen, erklären |
| Eingriffe mit Zeit vermerken | still eingreifen |
| neue Tester je Runde | dieselben Tester für „wird es bemerkt?“ |
| keine Namen in Notizen | Wegdateien mit Namen |

## Blockout und Ausgestaltung in Godot

| Reihenfolge im Szenenbaum | Inhalt | Kollision |
| --- | --- | --- |
| `Ground` | Blockout-Boden | nein |
| `Dressing` | Ausgestaltung, erst nach getestetem Blockout | nein (`collision_enabled = false`) |
| `Cues` | beabsichtigte Hinweise, über der Grafik | nein |
| `Objects` → `Walls` | Wände des Blockouts, nach der Ausgestaltung unsichtbar | ja |
| `Objects` → `DressingHigh` | hohe Teile, y-sortiert mit der Figur | nein |

Weiter unten im Szenen-Dock = weiter oben im Bild (`z_index` bei 0 lassen). Kollision folgt dem Blockout, nicht der Grafik. Nach der Ausgestaltung: derselbe Test mit neuen Testern.

Blockout-Vokabel: je eine Tile für begehbar, blockiert hoch, blockiert tief, gefährlich, benutzbar, Hinweis – flache Tonwerte, wo nötig mit Formmarke.

| Aufgabe | Godot 4.7 |
| --- | --- |
| Pixel → Zelle | `local_to_map(to_local(global_position))` |
| Zelle → Mitte der Zelle | `map_to_local(zelle)` |
| bemalte Fläche | `get_used_rect()` |
| Kamera begrenzen | `Camera2D.limit_left`, `limit_top`, `limit_right`, `limit_bottom` |
| Spur zeichnen | `Line2D.add_point(position)` |
| Datei für Wege | `FileAccess.open("user://…", FileAccess.WRITE)`, `store_line()` |
| Ebene ausblenden | `visible = false` (nur Bild, Kollision bleibt) · `enabled = false` (Bild und Kollision) |
