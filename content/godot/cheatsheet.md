## Projektordner (Godot 4.7)

| Datei oder Ordner | Inhalt | In Git? |
| --- | --- | --- |
| `project.godot` | Projekteinstellungen, Hauptszene, Autoloads, Eingabeaktionen, Layer-Namen; nur Abweichungen vom Standard | ja |
| `*.tscn` | Szene als Text: Ressourcen, Nodes, Verbindungen | ja |
| `*.tres` | Ressource als Text, etwa Werte einer eigenen `Resource` | ja |
| `*.gd` | GDScript | ja |
| `*.import` | Import-Einstellungen einer Quelldatei (Bild, Ton) | ja |
| `*.uid` | eindeutige ID eines Skripts oder Shaders (seit 4.4) | ja |
| `export_presets.cfg` | Exportvorlagen-Einstellungen je Plattform | ja |
| `.godot/` | Cache, importierte Dateien; entsteht neu | nein |
| Originale (`.aseprite`, `.kra`, `.rpp`) | außerhalb von `res://` oder in einem Ordner mit `.gdignore` | ja |

`res://` ist der Projektordner, `user://` der Ordner für Spielstände und Logs (unter Linux in `~/.local/share/godot/app_userdata/<Projektname>/`).

## Welches Dock beantwortet welche Frage?

| Frage | Ort im Editor |
| --- | --- |
| Woraus besteht die Szene? | Dock **Szene** |
| Welche Werte hat dieser Node, welche weichen vom Standard ab? | **Inspektor**, Zurücksetzen-Pfeil |
| Wer reagiert auf dieses Ereignis? | Dock **Signale** |
| Wie wird diese Datei importiert? | Dock **Importieren** |
| Was läuft gerade im Spiel? | Dock Szene → **Remote** |
| Was ging schief? | unteres Panel **Ausgabe** und **Debugger** |

## Wo ein Wert lebt

Jede Stufe überschreibt die vorige; es gilt der Wert der untersten Stufe, die ihn setzt:

1. Standard im Skript (`@export var max_speed := 90.0`)
2. Wert in der Szene des Nodes (`player.tscn`)
3. Override an der Instanz (`main.tscn`, Zurücksetzen-Pfeil im Inspektor)
4. Änderung zur Laufzeit (Code, Remote-Inspektor; nach dem Beenden weg)

Werte in einer `.tres`-Ressource gelten für jeden Node, der dieselbe Ressource benutzt.

## Pixelraster: ganzzahlige Faktoren

Faktor = kleinere der beiden ganzzahligen Teilungen; der Rest wird Rand.

| Bildschirm | 320 × 180 | 640 × 360 |
| --- | --- | --- |
| 1280 × 720 | 4×, kein Rand | 2×, kein Rand |
| 1280 × 800 (Steam Deck) | 4× = 1280 × 720, oben und unten je 40 px | 2× = 1280 × 720, je 40 px |
| 1366 × 768 | 4× = 1280 × 720, je 43 px links/rechts, 24 px oben/unten | 2×, gleiche Ränder |
| 1920 × 1080 | 6×, kein Rand | 3×, kein Rand |
| 2560 × 1440 | 8×, kein Rand | 4×, kein Rand |
| 3840 × 2160 | 12×, kein Rand | 6×, kein Rand |

Die beiden Auflösungen sind Beispiele, keine Empfehlung.

## Pixelart scharf halten

| Einstellung | Wert | Wirkung |
| --- | --- | --- |
| `display/window/stretch/mode` | `viewport` | erst klein zeichnen, dann als Ganzes vergrößern |
| `display/window/stretch/scale_mode` | `integer` | nur ganze Faktoren, gleich große Pixel |
| `rendering/textures/canvas_textures/default_texture_filter` | `Nearest` (`0`) | kein Verwischen beim Vergrößern |
| `rendering/2d/snap/snap_2d_transforms_to_pixel` | an | Zeichnen auf ganzen Pixeln, Position bleibt Kommazahl |

Einrichten Schritt für Schritt: [Godot-Start im Combat-Kurs](/combat/godot-start).

## Layer und Masken

Layer = wo ich bin. Maske = wen ich suche. Im Inspektor ab 1 gezählt, im Code als Bitwert.

| Layer | 1 | 2 | 3 | 4 | 5 |
| --- | --- | --- | --- | --- | --- |
| Bitwert | 1 | 2 | 4 | 8 | 16 |

Maske mit Layer 1 und 3 = 1 + 4 = `5`. Eine `Area2D` meldet einen Körper, wenn ihre Maske dessen Layer enthält und `monitoring` an ist.

Testgelände: `world` = 1, `player` = 2, `pickups` = 3.

## Bewegung im Testgelände rechnen

Beschleunigung mit `move_toward`, 60 Physik-Frames pro Sekunde. Platzhalterwerte 90 / 600 / 900, gemessen mit Godot 4.7.2:

| Größe | Rechnung | Ergebnis |
| --- | --- | --- |
| Tempozuwachs je Frame | `acceleration / 60` | 10 px/s |
| Frames bis Höchsttempo | `max_speed / (acceleration / 60)` | 9 |
| Tempoverlust je Frame | `friction / 60` | 15 px/s |
| Frames bis Stillstand | `max_speed / (friction / 60)` | 6 |
| Bremsweg | Summe der Tempi nach jedem Frame / 60 | 3,75 px |

## Lautstärke

| dB | Amplitude |
| --- | --- |
| 0 | 1 (unverändert) |
| −6 | ≈ 0,5 |
| −12 | ≈ 0,25 |
| −20 | 0,1 |
| −80 | 0,0001, praktisch still |

`linear_to_db(0.5)` ≈ −6,02, `db_to_linear(-6)` ≈ 0,501.

## Import für Pixelart (Standardwerte für PNG in 4.7)

| Import-Dock | Englisch in der Doku | Standard | Wirkung |
| --- | --- | --- | --- |
| Komprimieren → Modus | Compress → Mode | Lossless | jedes Pixel exakt; VRAM Compressed macht Flecken und verschiebt Farben |
| Mipmaps → Erzeugen | Mipmaps → Generate | aus | an: rund 33 % mehr Speicher, nützt nur bei starkem Herauszoomen |
| Prozessierung → Alpharand beheben | Fix Alpha Border | an | gegen dunkle Säume an transparenten Kanten, wenn linear gefiltert wird |
| Prozessierung → Größenbeschränkung | Size Limit | 0 (aus) | größer als 0 verkleinert beim Import, die Pixel verwaschen |

Eine Vorgabe „2D Pixel“ gibt es in Godot 4 nicht; der Texturfilter ist keine Importeinstellung mehr, sondern eine Projekt- und Node-Einstellung.

Die Einstellungen stehen in `<datei>.png.import`; die Quelle bleibt unverändert. Ein `Sprite2D` setzt den Ursprung mit `centered` und `offset`; für Y-Sortierung gehört er an die Füße.

## Zwei Takte

| | `_process(delta)` | `_physics_process(delta)` |
| --- | --- | --- |
| Läuft | einmal pro gezeichnetem Bild | in festen Physik-Ticks |
| Takt | hängt an Monitor, VSync, Last | `physics/common/physics_ticks_per_second`, Standard 60 |
| `delta` | schwankt | fest, bei 60 Ticks 1/60 s |
| Gehört hinein | Darstellung, Kamera, UI | Bewegung, Kollision, Gameplay-Timing |

- Frame-Budget: 1000 / 60 = 16,67 ms, bei 144 Hz 6,94 ms.
- `physics/common/max_physics_steps_per_frame` = 8: Unter 60 / 8 = 7,5 Bildern pro Sekunde holt die Physik nicht mehr auf, das ganze Spiel läuft langsamer.
- `Engine.time_scale` streckt `delta`, nicht die Zahl der Ticks. Zum Beobachten gut, zum Anhalten nicht.

## Fehlermeldungen lesen

| Meldung beginnt mit | Bedeutet |
| --- | --- |
| `ERROR:` | Die Engine meldet; die Zeile `at:` zeigt in Godots C++-Quelltext. |
| `SCRIPT ERROR:` | Eine Zeile deines GDScript ließ sich nicht ausführen. |
| `GDScript backtrace` | Aufrufkette; `[0]` ist die Zeile, an der es passiert ist. |

Die erste Meldung zuerst beheben und neu starten; spätere sind oft Folgen.

| Meldung (gekürzt) | Ursache |
| --- | --- |
| `The InputMap action "move_left" doesn't exist.` | Aktion fehlt in der Eingabe-Zuordnung |
| `Can't change this state while flushing queries.` | Form im Physik-Signal direkt abgeschaltet; `set_deferred()` nehmen |
| `… on a base object of type 'Nil'` | Variable ohne Wert, oft ein falscher Node-Pfad |

## Exportieren

```console
$ godot --headless --path . --export-release "Linux" build/linux/testgelaende.x86_64
$ godot --headless --path . --export-debug "Linux" build/linux/testgelaende.x86_64
```

- Exportvorlagen müssen genau zur Editor-Version passen (4.7.2 zu 4.7.2).
- Der Preset-Name muss exakt stimmen, der Zielordner muss existieren; relative Pfade gelten ab dem Projektordner.
- `export_presets.cfg` gehört ins Repository, Geheimnisse liegen in `.godot/export_credentials.cfg`.
- Ablauf und `.gitignore` im Detail: [Testversionen exportieren und sichern](/godot/export-sichern), Git-Grundlagen im [Git-Bereich](/git/git-einstieg).
