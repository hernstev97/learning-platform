## Zeit: Frames, Millisekunden, Samples

60 Physik-Frames pro Sekunde, Dateien mit 48 kHz, Godot mischt mit 44,1 kHz.

| Frames | ms | Samples 48 kHz | Samples 44,1 kHz |
| --- | --- | --- | --- |
| 1 | 16,7 | 800 | 735 |
| 2 | 33,3 | 1 600 | 1 470 |
| 6 | 100 | 4 800 | 4 410 |
| 15 | 250 | 12 000 | 11 025 |
| 60 | 1 000 | 48 000 | 44 100 |

```text
ms      = Frames × 1000 / 60
Samples = Sekunden × Abtastrate
Bild k bei s Bildern pro Sekunde
  beginnt bei (k − 1) / s Sekunden
Stille vor der Transiente
  = Latenz
```

## Pegel: Dezibel

| dB | Amplitude | Leistung |
| --- | --- | --- |
| −1 | 0,891 | 0,794 |
| −3 | 0,708 | 0,501 |
| −6 | 0,501 | 0,251 |
| −10 | 0,316 | 0,100 |
| −20 | 0,100 | 0,010 |
| −60 | 0,001 | 0,000001 |

```text
dB = 20 × log10(Verhältnis)
     (Verhältnis der Amplituden)
gleicher Klang, gleiches Sample
  ≈ +6 dB
verschiedene Klänge (RMS)
  ≈ +3 dB
Abstand verdoppelt (Aufnahme)
  bis −6 dB Vorsprung
Kompressor, Schwelle S, Ratio R
  aus = S + (ein − S) / R
```

Godot: `linear_to_db()`, `db_to_linear()`; Bus-Regler und `volume_db` addieren sich auf dem Weg zu `Master`.

## Aufnahme und Dateien

```text
WAV-Größe in Bytes =
  Rate × Bytes × Kanäle × s
48 kHz, 24 Bit, 1 min
  mono   =  8,64 MB
  stereo = 17,28 MB
```

| Schritt | Merke |
| --- | --- |
| App prüfen | verlustfrei, Pegelautomatik und Filter aus, Probedatei |
| Pegel | Probe-Take; Übersteuern ist endgültig |
| Abstand | nah ran; Verhältnis ändert nur der Abstand |
| Ansage | Ort, Gegenstand, Take am Anfang |
| Takes | mehrere, mit verschiedenen Abständen |
| Room Tone | 30 s, gleiche Position, gleicher Pegel |
| Protokoll | Datum, Ort, Gerät, Abstand, Notiz je Take |
| Rechte | keine verständlichen Stimmen Dritter |

## Cue-Liste: zehn Spalten

| Spalte | Inhalt |
| --- | --- |
| ID | Name nach eigenem Schema |
| Auslöser | Bild, Frame oder Signal |
| Typ | One-Shot oder Loop |
| Länge | in ms oder Frames |
| Varianten | Zahl, aus der Häufigkeit |
| Priorität | 1 bis 3 |
| Bus | z. B. Musik, SFX, Atmo, UI |
| Ort | mit Ort (2D) oder ohne |
| Status | geplant, Prüfmuster, aufgenommen, im Spiel, geprüft |
| Quelle | Verweis auf die Quellenliste |

- Eine Zeile pro Ereignis, nicht pro Datei.
- Trefferklang im Frame der Treffermeldung, nicht beim Einschalten der Hitbox.
- Jeder Loop: ein Start, an jedem Ausgang seines Zustands ein Stopp.
- Gegen Flattern: zwei Schwellen (Hysterese) oder Nachlauf (Ausstieg erst, wenn das Signal eine Zeit lang fehlt).

## REAPER: Werkbank

| Aufgabe | Weg |
| --- | --- |
| Region aus Auswahl | Shift+R |
| Region je Item | *Markers: Insert separate regions for each selected item* |
| Regionen benennen | Region/Marker Manager, Doppelklick |
| Stille entfernen | *Item processing → Dynamic split items…* |
| Rauschprofil | ReaFIR, *Subtract*, Profil aus dem Room Tone lernen |
| Normalisieren | im Render unter *Postprocess…*, nach allen FX (LUFS-I, True Peak, Peak …) |
| Viele Dateien rendern | *File → Region Render Matrix*, Source *Region render matrix* |
| Loop mit Fahne | *2nd pass render*, Tail aus |
| Auto-Crossfade | Alt+X |

Reihenfolge: Schnitt und Fades → Hochpass → ReaFIR → ReaGate → Regionen → Render mit Normalisieren im Postprocess. *Normalize items* ändert die Item-Lautstärke vor den FX und verschiebt Rauschprofil und Gate-Schwelle.

| Wildcard | wird zu |
| --- | --- |
| `$region` | Name der Region |
| `$track` | Name der Spur |
| `$project` | Name des Projekts |
| `$parenttrack` | Name des Ordner-Tracks |

Render-Fallen: Tail aus bei Hall auf der Spur schneidet ab; *Silently increment filenames* an legt neue Namen an, das Spiel spielt die alte Datei.

## Varianten in Godot

| Modus | direkte Wiederholung | A-B-A |
| --- | --- | --- |
| `PLAYBACK_RANDOM` | 1/n | – |
| `PLAYBACK_RANDOM_NO_REPEATS` (Standard) | nie | 1/(n − 1) |
| `PLAYBACK_SEQUENTIAL` | nie | festes Muster |

Mit zwei Varianten und `NO_REPEATS` entsteht A B A B. Echte Takes tragen die Abwechslung, Tonhöhe und Lautstärke strecken sie.

## Atmo und Loops

```text
Bett: Auffälliges herausschneiden,
  Hälften tauschen,
  Crossfade in die Mitte
  Loop = Länge − Crossfade
Spot-Klänge:
  Pause beginnt nach finished
```

Mono für Klänge mit Ort, Stereo für Bett und Musik. `AudioStreamPlayer2D` gewichtet Stereo-Kanäle nach Position, statt sie zu mischen.

## Musik: Raster und Übergänge

```text
Schlag  = 60 / BPM
Takt    = Schlag × Schläge je Takt
Samples = Schläge × Schlag × Rate
4 Takte 4/4, 120 BPM, 48 kHz
  = 384 000 Samples
nächster Takt (Godot: erste
  Grenze nach der Anfrage)
  = (floor(t / Takt) + 1) × Takt
Wartezeit: bis zu einem Takt
```

| Teil | Achte auf |
| --- | --- |
| Loop | Taktgrenzen, Fahne am Anfang (2nd pass) |
| Stem | gleicher Start, gleiche Länge, gleiche Fahne |
| Übergangsstück | ganze Schläge, gleiche Import-Werte |
| Stinger | beginnt auf der Transiente, klingt aus; liegt über der Musik oder ersetzt sie kurz |
| Prüfloop | Metronom-Klicks, Takt 1 hoch |

Ogg-Import in Godot 4.7.2:

| Feld | Standard | Bedeutung |
| --- | --- | --- |
| `loop` | `false` | Datei wiederholen |
| `loop_offset` | `0` | Sprungziel in Sekunden |
| `bpm` | `0` | Tempo; 0 = Takt-Übergänge greifen sofort |
| `beat_count` | `0` | Länge in Schlägen ab Dateianfang |
| `bar_beats` | `4` | Schläge pro Takt |

`AudioStreamWAV` hat kein `bpm`; Loop-Punkte dort in Samples (`loop_begin`, `loop_end`).

## Mischung

- Regeln statt Stellen: Priorität, Stimmenbegrenzung (`max_polyphony`), Ducking, Stille.
- Erst wegnehmen, dann begrenzen, dann ducken, zuletzt lauter.
- Maskierung: in der Frequenz (tiefe Klänge stärker) und in der Zeit (kurz vor und nach einem lauten Klang).
- Ducking in Godot: `AudioEffectCompressor` auf dem Bus, der leiser werden soll, `sidechain` = Name des steuernden Busses. Standard: Threshold 0 dB (muss herunter, sonst duckt nichts), Ratio 4, Attack 20 µs, Release 250 ms (15 Frames).
- Gemessen in 4.7.2: Absenkung etwa doppelt so stark wie die Lehrbuchformel, Rückkehr nach 250 ms Release erst nach rund 1 s. Ein unbekannter Busname hört auf `Master`. Godot bearbeitet die Busse von rechts nach links: Steht der Sidechain-Bus rechts, liest der Kompressor ihn fertig gemischt, mit Fader und Mute; steht er links, liest er ihn vor Fader und Mute.

## Musik in Godot: AudioStreamInteractive

Umschalten am laufenden Player: `get_stream_playback()` liefert das Playback, darauf `switch_to_clip_by_name(&"gefahr")`. Am Stream selbst gibt es die Methode nicht, und vor `play()` gibt es kein Playback.

| Übergang ab | Anfrage bei 5,30 s, 120 BPM, Clip 8 s |
| --- | --- |
| `IMMEDIATE` | 5,30 s |
| `NEXT_BEAT` | 5,50 s |
| `NEXT_BAR` | 6,00 s |
| `END` | 8,00 s |

| Ziel | Bedeutung |
| --- | --- |
| `SAME_POSITION` | gleiche Stelle im Ziel-Clip |
| `START` | Anfang des Ziel-Clips |
| `PREVIOUS_POSITION` | wo der Ziel-Clip zuletzt war |

- Ohne passende Regel: nächster Schlag, Ausblendung über einen Schlag.
- `bpm` 0: Schlag- und Takt-Übergänge greifen sofort, `fade_beats` zählt dann in Sekunden.
- Nur anfragen, wenn sich das Ziel ändert; der laufende Clip, erneut angefragt, beginnt von vorn.
- Nachlauf gegen Flattern: Ausstieg erst, wenn das Signal eine Zeit lang fehlt.
- Vertikal: `AudioStreamSynchronized`, Lautstärke je Stream (`stream_N/volume`), −60 dB ist nicht stumm.
- Messen: Prüfloop offline mit `mix_audio()` oder im Spiel mit `AudioEffectRecord` auf `Master`; Movie Maker braucht ein Fenster.

## Lautheit

| Maß | Fenster |
| --- | --- |
| LUFS-M (momentan) | 0,4 s |
| LUFS-S (kurzzeitig) | 3 s |
| LUFS-I (integriert) | ganzes Signal, mit Gating |
| True Peak (dBTP) | zwischen den Samples |

```text
Gain = Ziel − Messwert
  (1 LU = 1 dB)
True Peak steigt um denselben Gain
Mono-Datei im Spiel (4.7.2),
  verglichen mit der Datei:
  AudioStreamPlayer     +3 LU
  Player2D, Bildmitte   −3 LU
EBU R 128: −23 LUFS, max. −1 dBTP
ASWG-R001: −24 LKFS Heimkonsole,
  −18 LKFS tragbar, max. −1 dBTP
  (ganzes Spiel, mind. 30 Minuten)
```

Normen messen das ganze Programm. Lautheitsziele für einzelne Dateien sind deine Platzhalter; ob das Spiel passt, zeigt ein langer Mitschnitt. REAPER: *File → Render… → Postprocess…* normalisiert auf LUFS-I, True Peak und andere Maße und begrenzt mit „Brickwall limit“; danach neu messen.

## Hörtest im Spiel

| Spalte | Inhalt |
| --- | --- |
| Gerät | Kopfhörer, Laptop, Handy … |
| Lautstärke | normal, leise |
| Situation | Stelle im Abschnitt |
| Beobachtung | was fehlt, was stört |
| Messwert | LUFS, dBTP, Frame |
| Frage | was du als Nächstes prüfst |

## Lizenzen

| Lizenz | Verkauftes Spiel | Pflicht |
| --- | --- | --- |
| eigene Aufnahme | ja | Zeile in der Quellenliste |
| CC0 | ja | keine, Herkunft notieren |
| CC BY | ja | TASL: Titel, Autor, Quelle, Lizenz mit Version und Link |
| CC BY-SA | vorher klären | Nennung, gleiche Lizenz für Bearbeitungen |
| CC BY-ND | nein bzw. vorher klären | Vertonung gilt als Bearbeitung (1a), ND verbietet ihre Weitergabe |
| … NC | nein | – |
| Sonniss, Splice | laut Text ja | Weitergabe der Klänge verboten |
| Library-EULA (NI) | Musik ja, Einzeleffekt offen | beim Hersteller anfragen |

Quellenliste je Datei: Datei, Herkunft, Autor, Lizenz mit Version, URL, Abrufdatum, Nachweis, Änderung, Credit. Kein generiertes Audio. Kein Rechtsrat.
