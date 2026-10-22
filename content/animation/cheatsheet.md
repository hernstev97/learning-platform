## Ticks und Millisekunden (60 Ticks pro Sekunde)

| Ticks | ms | Ticks | ms |
| --- | --- | --- | --- |
| 1 | 16,7 | 7 | 116,7 |
| 2 | 33,3 | 8 | 133,3 |
| 3 | 50 | 9 | 150 |
| 4 | 66,7 | 10 | 166,7 |
| 5 | 83,3 | 12 | 200 |
| 6 | 100 | 15 | 250 |

`Ticks = ms × 60 / 1000` · `ms = Ticks × 1000 / 60` · Ganze Ticks gehen auf: 50, 100, 150, 200 ms. 80 ms = 4,8 Ticks, das Bild steht mal 4, mal 5.

## Einsen, Zweien, Dreien

| Belichtung | Zeichnungen/s bei 24 fps | ms je Zeichnung | Ticks |
| --- | --- | --- | --- |
| auf Einsen | 24 | 41,7 | 2,5 |
| auf Zweien | 12 | 83,3 | 5 |
| auf Dreien | 8 | 125 | 7,5 |
| auf Vieren | 6 | 166,7 | 10 |

Bildraten, die in 60 Ticks aufgehen (Teiler von 60): 6, 10, 12, 15, 20, 30 oder 60 fps.

## Spacing-Muster

| Muster | Abstände von Bild zu Bild | Wirkung |
| --- | --- | --- |
| gleichmäßig | 4, 4, 4, 4 | konstantes Tempo, mechanisch |
| Ease-in (Halbieren) | 32, 16, 8, 4 | bremst in den Key |
| Ease-out | 4, 8, 16, 32 | fährt aus dem Key an |
| freier Fall (Galilei) | 1, 3, 5, 7 | beschleunigt gleichmäßig |
| Pixel-Sprung | 4, 3, 2, 1 · Halt · 1, 2, 3, 4 | Scheitel mit Haltezeit |
| Aufprall | größter Abstand direkt vor dem Kontakt | kein Ease in den Boden |

Dicht = langsam, weit = schnell. Gleichmäßig beschleunigt = der Abstand wächst jedes Mal um denselben Betrag. Vorsicht: Godots `Tween` und CSS nennen `ease-in` umgekehrt das langsame Anfahren.

## Bildliste (Belichtungsblatt)

```text
Bild  Dauer   Ticks  Pose
 1    200 ms  12     Hocke (Key)
 2     50 ms   3     Absprung
 3     50 ms   3     Streckung
 4    150 ms   9     Scheitel (Key)
 5    250 ms  15     Landung (Key)
```

Keys lang, Zwischenbilder kurz, Wischbilder am kürzesten.

## Die zwölf Prinzipien (Thomas & Johnston, 1981)

| Prinzip | Deutsch | Kurz | Modul |
| --- | --- | --- | --- |
| Squash and stretch | Stauchen und Strecken | Form ändert sich, Volumen bleibt | gewicht-aufprall |
| Anticipation | Antizipation | Gegenbewegung kündigt die Aktion an | antizipation-erholung |
| Staging | Inszenierung | eine Idee pro Moment, klar lesbar | koerpersprache |
| Straight ahead / pose to pose | durchgehend / von Pose zu Pose | erst Keys, dann Zwischenbilder | beobachten-schluesselposen |
| Follow through, overlapping action | Nachbewegung, Überlappung | Teile kommen später zum Stehen | boegen-ueberlappung |
| Slow in and slow out | Ease-in, Ease-out | mehr Bilder an den Enden | timing-spacing |
| Arc | Bogen | Gelenke drehen, Wege sind gekrümmt | boegen-ueberlappung |
| Secondary action | Nebenhandlung | stützt die Hauptbewegung | boegen-ueberlappung |
| Timing | Timing | Zahl und Dauer der Bilder | timing-spacing |
| Exaggeration | Übertreibung | kleine Figuren brauchen große Posen | koerpersprache |
| Solid drawing | räumliches Zeichnen | Form und Volumen halten | form-konstanz |
| Appeal | Ausstrahlung | gewollte Wirkung der Figur | – |

Quelle: [Wikipedia, Twelve basic principles of animation](https://en.wikipedia.org/wiki/Twelve_basic_principles_of_animation).

## Gewicht ablesen

| Merkmal | Bowlingkugel (schwer, hart) | Gummiball (leicht, elastisch) |
| --- | --- | --- |
| Fallgeschwindigkeit ohne Luftwiderstand | gleich | gleich |
| Reaktion auf einen Stoß | spät, langsam | sofort |
| Aufprall | kaum Verformung, kaum Rückprall | sichtbares Stauchen, hoher Rückprall |
| Ausschwingen | kurz | mehrere kleiner werdende Sprünge |
| Figur, die es hebt | lange Antizipation, Körper gestaucht | kurze Antizipation |

Belege: [NASA, Hammer und Feder](https://nssdc.gsfc.nasa.gov/planetary/lunar/apollo_15_feather_drop.html), [Timing](https://en.wikipedia.org/wiki/Twelve_basic_principles_of_animation#Timing).

## Gehen und Laufen

| Phase | Gehen | Laufen |
| --- | --- | --- |
| Kontakt | Ferse setzt auf, Beine weit gespreizt | Fuß setzt auf |
| Tiefpunkt | Gewicht im Standbein, Körper am tiefsten | tiefster Punkt nach dem Kontakt |
| Passing | Schwungbein zieht vorbei | Schwungbein zieht vorbei |
| Hochpunkt | Körper am höchsten | Abdruck, dann Flugphase |

Arme gegen die Beine. Zyklen in Pixelart: 4, 6 oder 8 Bilder; die zweite Hälfte ist oft die erste mit dem anderen Bein. Quellen: [Saint11, Walk](https://saint11.art/blog/pixel-art-tutorials/#Walk), [Slynyrd, Pixelblog 50](https://www.slynyrd.com/blog/2024/5/24/pixelblog-50-human-walk-cycle).

## Aktion: Phasen und Spieler gegen Gegner

| Phase | Aufgabe | Dauer |
| --- | --- | --- |
| Antizipation | ankündigen, Kraft sammeln | Spielerfigur kurz oder keine, Gegner lang |
| Aktion | der Weg, oft ein Wischbild | sehr kurz |
| Aufprall, Überschwingen | die Pose, die man sich merkt | halten |
| Erholung | zurück in die Grundpose | lang genug zum Lesen, kurz genug zum Steuern |

Frame-Daten, Wind-up und Abbruchfenster: [Anatomie eines Angriffs](/combat/angriffsphasen).

## Editor: dieselbe Aufgabe in vier Programmen

| Aufgabe | Aseprite 1.3.18.6 | Pixelorama 1.2.3 | LibreSprite 1.3 | Krita 5.3 / 6.0 |
| --- | --- | --- | --- | --- |
| Bilddauer | ms je Bild, Frame Properties (P) | Faktor je Bild × FPS der Zeitleiste | ms je Bild | Bilder bei fester Bildrate, Halten bis zum nächsten Key |
| Neues Bild | Alt+N | Zeitleiste | Alt+N | Keyframe im Timeline-Docker |
| Onion Skinning | F3 | Zeitleiste | F3 | Onion-Skin-Docker |
| Abspielen | Enter, Vorschau F7 | F5, rückwärts F4 | Zeitleiste | Timeline-Docker |
| Schleife | Tag: Forward, Reverse, Ping-pong | Cycle, Ping-pong, No loop | Tag mit Richtung | Wiedergabebereich |
| Export | Sprite-Sheet + JSON, PNG-Folge, GIF | Spritesheet, PNG-Folge, GIF/APNG | Sprite-Sheet + JSON | Render Animation als Bildfolge |

Doku: [Aseprite](https://www.aseprite.org/docs/animation/), [Pixelorama](https://www.pixelorama.org/user_manual/user_interface/timeline), [LibreSprite](https://github.com/LibreSprite/libresprite.github.io/wiki/Know-your-workspace#animation), [Krita](https://docs.krita.org/en/user_manual/animation.html). Bedienung: [Einzelbilder im Editor](/animation/editor-zeitleiste).

```console
$ aseprite -b figur.aseprite --sheet figur.png --data figur.json --format json-array --list-tags
```

## Von Millisekunden zu SpriteFrames

| Größe | Formel | Beispiel 100, 50, 150, 300 ms |
| --- | --- | --- |
| Grundtakt | größter gemeinsamer Teiler | 50 ms |
| FPS | 1000 / Grundtakt | 20 |
| Frame-Dauer | ms / Grundtakt | 2, 1, 3, 6 |
| Dauer in Godot | Frame-Dauer / (FPS × Abspieltempo) | 2 / 20 = 0,1 s |

Aktion: Loop aus (Godot 4.7 `LoopMode`: Aus, Wiederholen, Ping-Pong), sonst kein `animation_finished`. Der Loop-Knopf im SpriteFrames-Panel schaltet bei jedem Klick weiter: Aus → Wiederholen → Ping-Pong. Gemeinte 5 Ticks als 12 FPS eintragen, nicht als 83 ms.

## Prüfstand (Godot 4.7)

| Taste | Wirkung |
| --- | --- |
| Pfeile halten | `bewegung`, Figur läuft |
| Leertaste | `aktion` einmal, dann zurück |
| 1–9 | Animation direkt, alphabetisch |
| P / , / . | anhalten, Bild zurück, Bild vor |
| T | Zeit 1 → 0,5 → 0,25 |
| H | Grund dunkel, mittel, hell |
| Z | Zoom 1× bis 4× |

```console
$ godot --path . --fixed-fps 60 res://pruefstand.tscn
```

Messen mit Zeit 1,0 (Anzeige `Zeit 1.00`). Im Prüfstand mit Godot 4.7.2 steht das erste Bild nach einem Wechsel einen Tick kürzer.

## Befund → Ursache → Modul

| Befund | Erst prüfen | Modul |
| --- | --- | --- |
| schwebt, landet weich | Ease vor dem Aufprall | timing-spacing |
| wirkt mechanisch | gleichmäßiges Spacing, gerade Wege | timing-spacing, boegen-ueberlappung |
| Key wird übersehen | Haltezeit des Keys | timing-spacing |
| wirkt leicht, soll schwer | Anfahren, Aufprall, Ausschwingen | gewicht-aufprall |
| kippt, wirkt unsicher | Schwerpunkt über der Stützfläche | schwerpunkt-balance |
| Füße rutschen | Tempo gegen Schrittweg | gehen-laufen, /godot/animationen |
| Kopf oder Auge springt | Hilfslinien, Onion Skinning | form-konstanz |
| Figur springt beim Wechsel | Export ohne leere Ränder, Ursprung | testszene |
| Aktion kommt verspätet an | erstes Bild schon anders als die Ruhe? | animation-im-spiel |
| Zuschauer liest etwas anderes | Absichtssatz, Kontrast der Posen | koerpersprache |

## Absichtssatz, Beobachtungstest, Protokoll

1. **Absichtssatz** vor dem Zeichnen: was ein Zuschauer lesen soll.
2. **Beobachtungstest:** ohne Vorrede zeigen, dreimal in Schleife, „Was passiert da?“, wörtlich notieren, nicht erklären.
3. **Fassungen** getrennt speichern: `name-v1`, `name-v2`, `name-v3`.

```text
Fassung       2, Datum
Absichtssatz  …
Beobachtung   eigene und Test (wörtlich)
Änderung      Bilder, Timing vorher/nachher
Grund         …
Ergebnis      …
```

## KI-Regel

| Darf eine KI | Bleibt bei dir |
| --- | --- |
| Skripte, Export-Befehle, Prüfstand, Umrechnungen | jede Zeichnung, Pose, Animation |
| Fehlermeldungen erklären | Timing, Spacing, Haltezeiten |
| Godot-Gerüst für Tests | Figuren, Bewegungen und Stil deines Spiels |
