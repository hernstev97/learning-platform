## Frames und Millisekunden (60 pro Sekunde)

| Frames | ms | Frames | ms |
| --- | --- | --- | --- |
| 1 | 16,7 | 13 | 216,7 |
| 2 | 33,3 | 15 | 250 |
| 3 | 50 | 20 | 333,3 |
| 4 | 66,7 | 24 | 400 |
| 6 | 100 | 30 | 500 |
| 8 | 133,3 | 45 | 750 |
| 10 | 166,7 | 60 | 1 000 |
| 12 | 200 | | |

`ms = Frames × 1000 / 60` · `Frames = ms × 60 / 1000` · Pixel pro Frame = `px/s ÷ 60`

## Phasen eines Angriffs zählen

| Testszene | Frames | Street Fighter 6 |
| --- | --- | --- |
| Wind-up 8 | 1–8 | Startup 9 |
| aktiv 3 | 9–11 | Active 9-11 |
| Erholung 14 | 12–25 | Recovery 14 |
| frei | ab 26 | |

Startup zählt den ersten aktiven Frame mit. Prüf bei jeder Tabelle, welche Zählung sie nutzt.

## Richtwerte aus Quellen (Beispiele, keine Empfehlung)

| Größe | Wert | Quelle |
| --- | --- | --- |
| einfache Reaktionszeit | 231 ms, korrigiert 213 ms | Woods et al. 2015 |
| Reaktion auf Ton | schneller als auf Licht | Jain et al. 2015 |
| Eingabelatenz, schnell | 3/60 s = 50 ms | Mick West 2008 |
| Eingabelatenz, 60-fps-Spiele | typisch 4/60 s | Mick West 2008 |
| Coyote Time Celeste | 0,1 s | Celeste-Quellcode |
| Hitstop Dreamscaper | etwa 7 Frames | GDC 2022 |
| Smash-Startup | etwa 15 Frames | Sakurai |
| Street Fighter 2 | etwa 7–8 Frames | Sakurai |
| SF6 Ryu Stand LP | 4 / 4-6 / 7, +4 / -1 | Capcom, Stand 10/2026 |

## Regeln der Testszene

| Regel | Wirkung |
| --- | --- |
| Zustand beginnt mit `frame = 1` | Dauer N belegt genau N Frames |
| Wechsel bei `frame > Dauer` | `>=` verkürzt um einen Frame |
| Puffer: `buffer_age <= input_buffer` | 0 = nur im selben Frame |
| Puffer altert nicht im Hitstop | Druck im Stillstand bleibt gültig |
| `cancel_from = N` | Anschluss ab Erholungsframe N, 0 = nie |
| Hitbox an in Frame X | `area_entered` in Frame X + 1 |
| Hitstop H | jeder betroffene Zustand + H Frames |
| i-Frames | Hurtbox `monitorable = false` |
| Hitstop nur bei gezähltem Treffer | `receive()` gibt `true` zurück |

## Godot 4.7: Pixelart einrichten

```ini title=project.godot
[display]
window/size/viewport_width=320
window/size/viewport_height=180
window/stretch/mode="viewport"
window/stretch/scale_mode="integer"

[rendering]
textures/canvas_textures/default_texture_filter=0
2d/snap/snap_2d_transforms_to_pixel=true
```

Neue Projekte starten in 4.7 mit `canvas_items` – `viewport` selbst setzen.

## Godot 4.7: Timing und Treffer

| Thema | Richtig |
| --- | --- |
| Gameplay-Takt | `_physics_process`, 60 pro Sekunde |
| Animation schaltet Hitbox | `callback_mode_process = Physics` |
| Animationsraster | Seconds/FPS auf FPS, 60 |
| Form im Signal umschalten | `set_deferred(&"disabled", …)` |
| Hurtbox verstecken | `monitorable`, nicht `monitoring` |
| Hitstop | eigener Zähler, nicht `Engine.time_scale` |
| Richtung vom Stick | `Input.get_vector()`, Länge ≤ 1 |
| Einzelbild | F9 Pause, F10 nächster Frame |
| Bild für Bild aufnehmen | Movie Maker, PNG-Ausgabe |

`Engine.time_scale = 0`: `_physics_process` läuft weiter, `delta` ist 0.

## Tuning-Runde

```text
Runde:        3
Godot:        4.7.2
Hypothese:    <Ursache> -> <erwartete Wirkung>
Größe:        <Feld> alt -> neu
Erwartung:    <Log-Zeilen vorher aufschreiben>
Messung:      <Log-Zeilen nachher>
Eindruck:     <eigene Worte>
Entscheidung: behalten / zurück / weiter testen
Offen:        <Frage>
```

Eine Größe pro Runde. Spieler- und Gegnerwerte nie zugleich.

## Schwer, unfair oder kaputt?

| Frage | Wenn nein |
| --- | --- |
| Gab es eine Ankündigung? | Lesbarkeit |
| War sie länger als die Reaktionszeit? | Lesbarkeit oder Absicht |
| War der Angreifer im Bild? | Lesbarkeit, Kamera |
| Steht dein Druck im Log? | Eingabe verloren: technisch |
| Passte die Hitbox zum Bild? | technisch |
| Bleibt das Ergebnis bei 30 Bildern/s gleich? | technisch |
| Hättest du mit Übung ausweichen können? | sonst unfair |

## Vorgabe für einen Coding-Agenten

| Teil | Inhalt |
| --- | --- |
| Ziel | Was der Spieler erleben soll, eigene Worte |
| Zustände | Liste und Übergänge |
| Parameter | Name, Einheit, Bereich, Platzhalter |
| Konflikte | was was abbricht, Puffer, Hitstop |
| Debug | Log-Zeilen mit Frame |
| Abnahme | am Log prüfbar |
| Offen | Fragen |
| Nicht entscheiden | Werte, Gefühl |
