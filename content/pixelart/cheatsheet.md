## Linien und Kurven

| Läufe | Steigung | Wirkung |
| --- | --- | --- |
| 1, 1, 1 … | 1 : 1 (45°) | gerade |
| 2, 2, 2 … | 2 : 1 | gerade |
| 3, 3, 3 … | 3 : 1 | gerade |
| 2, 1, 2, 1 … | 3 : 2 | gerade, Muster wiederholt sich |
| 3, 1, 2, 1, 3 … | – | Jaggy, unruhig |
| 4, 3, 2, 1, 1 | Kurve | glatt: Läufe schrumpfen stetig |
| 4, 1, 3, 2, 1 | Kurve | Knick: Folge springt |

Lauflänge = Breite ÷ Höhe (12 breit, 4 hoch → 3). Breite eines Bogens = Summe der waagerechten Läufe.

```text
gut                  Doppelpixel (L-Ecke)
# # # . . . .        # # # . . . .
. . . # # # .        . . # # # # .
```

## Fehlerbilder

| Fehler | Woran du ihn erkennst | Abhilfe |
| --- | --- | --- |
| Jaggy | Lauf fällt aus dem Muster | Läufe angleichen |
| Doppelpixel | Linie an einer Stufe zwei Pixel dick | Pixel-perfect für Konturen, L-Ecke entfernen |
| Verwaister Pixel | einzelner Pixel ohne Nachbarn seiner Farbe | in Cluster aufnehmen oder entfernen |
| Banding | Tonstreifen folgen parallel den Stufen der Kante | Schattengrenze in anderem Winkel, Clusterbreiten variieren |
| Kissenschattierung | jede Kontur dunkler, Mitte hell | Lichtrichtung festlegen, Formschattierung |
| Zu viel Kantenglättung | Form wirkt weich, Saum an der Außenkante | nur an langen Läufen, innen statt außen |
| Mixel | Pixel verschieden groß im selben Bild | nichts hochskalieren, in nativer Größe zeichnen |
| Rauschen statt Textur | jedes Pixel anders | Textur aus Clustern mit Licht- und Schattenkante |

## Licht auf einer Form (Licht oben links)

| Zone | Lage | Merkmal |
| --- | --- | --- |
| Glanzlicht | dem Licht zugewandt | hellster Punkt, oft 1 Pixel |
| Licht | Lichtseite | heller Grundton |
| Halbton | Übergang | Mittelton |
| Kernschatten | hinter dem Terminator | dunkelste Stelle auf der Form |
| Reflexlicht | Schattenseite, Rand | aufgehellt, aber dunkler als die Lichtseite |
| Kontaktschatten | direkt unter dem Körper | dunkelster Schatten |
| Schlagschatten | auf dem Boden, vom Licht weg | dunkel, weicher nach außen |

Wertegruppen: Licht, Mitte, Schatten. „The fewer values the better“ (James Gurney).

## Farbrampen und Paletten

| Schritt | Was du tust |
| --- | --- |
| 1 | Grundton wählen (Mittelton der Rampe) |
| 2 | Nach unten dunkler, Farbton Richtung Blau/Violett; dunkle Töne meist gesättigter (Slynyrd) |
| 3 | Nach oben heller, Farbton Richtung Gelb |
| 4 | In Graustufen prüfen: jeder Ton deutlich heller als der vorige |
| 5 | Nur so viele Töne, wie du wirklich brauchst |

| Palette (Lospec) | Farben |
| --- | --- |
| PICO-8 | 16 |
| Sweetie 16 | 16 |
| DawnBringer 32 (Standard in Aseprite) | 32 |
| Endesga 32 | 32 |

## Rechnen mit Farbe

```python
def kanal(v):
    s = v / 255
    return s / 12.92 if s <= 0.04045 else ((s + 0.055) / 1.055) ** 2.4

def leuchtdichte(hexwert):
    r, g, b = (int(hexwert[i:i + 2], 16) for i in (1, 3, 5))
    return 0.2126 * kanal(r) + 0.7152 * kanal(g) + 0.0722 * kanal(b)

def kontrast(a, b):
    hell, dunkel = sorted((leuchtdichte(a), leuchtdichte(b)), reverse=True)
    return (hell + 0.05) / (dunkel + 0.05)
```

Kontrastverhältnis nach WCAG: 1 = gleich hell, 21 = Schwarz auf Weiß. Für Pixelart eine Rechenhilfe, keine Regel.

## Proportionen und Spritegrößen

| Figur | Kopfhöhen | Beispiel |
| --- | --- | --- |
| Erwachsener, realistisch | 7,5 | 60 px hoch → Kopf 8 px |
| stilisiert | 4 | 48 px hoch → Kopf 12 px |
| Chibi | 2–3 | Kopf ⅓ bis ½ der Höhe |

| Top-down-Sprite | Faustregel (Slynyrd) |
| --- | --- |
| Tile | 16 × 16 px ist am häufigsten |
| Figur | 1 Tile breit, 2 Tiles hoch |
| Kopf | ⅓ bis ½ der Spritehöhe |
| Richtungen | mindestens 4 |

## Projektionen

| Ansicht | Was du siehst | Einsatz |
| --- | --- | --- |
| reine Draufsicht | nur Oberseiten, Figur als Kopf und Schultern | Strategie, Karten |
| 3/4-Draufsicht | Oberseite und Front, keine Fluchtpunkte | viele Top-down-Actionspiele |
| Seitenansicht | nur Fronten | Plattformer |

## Arbeitsablauf Sprite

1. Thumbnails als Silhouette
2. Gliederpuppe mit Kopfzahl
3. Silhouette in Spritegröße
4. Tonwerte (3–4 Graustufen)
5. Farbe aus der Palette
6. Feinschliff: Linien, Cluster, Kontur, sparsame Kantenglättung
7. Proben bei 1×, in Graustufen, als Silhouette

## Proben

| Probe | Frage | Wie |
| --- | --- | --- |
| Originalgröße | Erkennt man alles in Spielgröße? | Zoom 100 %, Export aufs Handy |
| Graustufen | Trennen Tonwerte Figur, Gefahr, Boden? | Chromium DevTools → Rendering → Achromatopsia; Krita: Filterebene „Desaturate“ |
| Silhouette | Erkennt man Form und Richtung? | Kopie schwarz füllen |
| Farbfehlsicht | Hält eine Unterscheidung ohne Rot/Grün? | DevTools: Protanopia, Deuteranopia, Tritanopia |
| Spiegeln | Stimmen Achsen und Proportionen? | Krita: Taste M |

## Werkzeuge (Stand Oktober 2026)

| Programm | Version | Kosten | Unter CachyOS |
| --- | --- | --- | --- |
| Pixelorama | 1.2.3 | frei (MIT) | Flathub oder AUR `pixelorama` |
| LibreSprite | 1.3 | frei (GPL-2.0) | `pacman -S libresprite` |
| Aseprite | 1.3.18.6 | ab 19,99 USD; selbst kompilieren für den eigenen Gebrauch erlaubt | AUR `aseprite` (baut aus Quellcode) |
| Krita | 5.3.4.1 (Flathub), 6.0.4.1 (Arch, Qt6) | frei | Flathub oder `pacman -S krita` |

| Aufgabe | Aseprite | Pixelorama |
| --- | --- | --- |
| Gerade Linie | Shift-Klick vom letzten Pixel, Ctrl rastet Winkel ein | Linienwerkzeug (L) |
| Pixel-perfect | Kontextleiste des Stifts | Werkzeugoption Pixel perfect |
| Pixelraster | Einstellungen → Grid → Visible Pixel Grid | Ctrl+H |
| Nahtlose Kachel | View → Tiled Mode | Tile Mode |
| Nur Palettenfarben | Sprite → Color Mode → Indexed | Color Mode Indexed |
| Export vergrößert | Export mit Resize | Export mit Resize |

## Maßstab und Pixeldichte

- Alles im Spielbild hat dieselbe Pixelgröße. Nichts hochskalieren, große Kreaturen in voller Auflösung zeichnen.
- Vergrößern nur ganzzahlig und mit nächstem Nachbarn: 384 × 216 × 5 = 1920 × 1080.
- Maßstabstabelle führen: Figur, Gegner, Kreatur, Tür, Kiste, Tile in Pixeln.
