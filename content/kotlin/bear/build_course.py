"""Build lessons from the pinned Bear snapshot, independently of a Bear checkout."""
from pathlib import Path
import argparse
import hashlib
import json
import subprocess
import textwrap

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--check', action='store_true', help='Check generated course without writing it')
parser.add_argument('--verify-bear', type=Path, help='Also compare the snapshot to its original commit in this Bear checkout')
args = parser.parse_args()
HERE = Path(__file__).resolve().parent
snapshot = json.loads((HERE / 'bear-source.json').read_text())
MAIN = 'android/app/src/main/java/app/kiumu/bear/'
TEST = 'android/app/src/test/java/app/kiumu/bear/'
REV = snapshot['revision']
assert set(snapshot['sha256']) == set(snapshot['files']), 'Snapshot file list differs from its checksums.'
for path, content in snapshot['files'].items():
    assert hashlib.sha256(content.encode()).hexdigest() == snapshot['sha256'][path], f'{path}: snapshot checksum mismatch'
    if args.verify_bear:
        committed = subprocess.check_output(['git', 'show', f'{REV}:{path}'], cwd=args.verify_bear, text=True)
        assert content == committed, f'{path} differs from Bear {REV}.'
lessons = []
files = {}


def snippet(path, start, end=None, occurrence=1):
    path = path if path.startswith('android/') else MAIN + path
    text = snapshot['files'][path]
    files[path] = text
    offset = -1
    for _ in range(occurrence):
        offset = text.index(start, offset + 1)
    left = text.rfind('\n', 0, offset) + 1
    if end is None:
        right = text.find('\n', offset + len(start))
    else:
        last = text.index(end, offset + len(start))
        right = text.find('\n', last + len(end))
    if right == -1:
        right = len(text)
    value = text[left:right]
    return textwrap.dedent(value), dict(file=path, start=text[:left].count('\n') + 1, end=text[:right].count('\n') + 1, revision=REV)


def g(answer, label, hint, within=None, occurrence=1, alternatives=None):
    return dict(answer=answer, label=label, hint=hint, within=within, occurrence=occurrence, alternatives=alternatives or [])


def k(page, title=None, section=None):
    return dict(title='Kotlin · ' + (title or page.replace('-', ' ').capitalize()), url='https://kotlinlang.org/docs/' + page + '.html' + ('#' + section if section else ''))


def a(page, title):
    return dict(title='Android · ' + title, url='https://developer.android.com/' + page)

BASIC = k('basic-syntax', 'Variablen: val und var', 'variables')
FUN = k('functions')
NULL = k('null-safety')
LAMBDA = k('lambdas')
STATE = a('develop/ui/compose/state', 'Compose-Zustand')
ROOM = a('training/data-storage/room', 'Room')
WORK = a('develop/background-work/background-tasks/persistent', 'WorkManager')
FLOW = a('kotlin/flow/stateflow-and-sharedflow', 'StateFlow')
DATA = a('topic/libraries/architecture/datastore', 'DataStore')
CORO = a('kotlin/coroutines/coroutines-best-practices', 'Coroutines')
chapters = [
    ('Bear lesen lernen', 'Grundlagen', 'Werte, Typen und Schreibweisen an kleinen Originalzeilen.'),
    ('Bear entscheidet', 'Logik', 'Bedingungen, Funktionen und Kontrollfluss.'),
    ('Bears Datenmodelle', 'Modelle', 'Klassen, nullable Werte und Kotlin-Konventionen.'),
    ('Listen und Bear-Blöcke', 'Sammlungen', 'Lambdas, Sammlungen und strukturierter Text.'),
    ('Bears Android-Oberfläche', 'Compose', 'Activity, Layout, Callbacks und lokale UI-Zustände.'),
    ('Vom Zustand zur Oberfläche', 'Datenfluss', 'Flows, State Hoisting und Lebenszyklen.'),
    ('Was Bear sich merkt', 'Speicherung', 'Room, DataStore und manuell verdrahtete Abhängigkeiten.'),
    ('Von Bear nach Linear', 'Synchronisierung', 'Coroutines, lokale Warteschlangen und Wiederholungen.'),
    ('Bears Regeln beweisen', 'Algorithmen', 'Runden, Zeitfenster, Textvergleich und echte Tests.'),
    ('Zusammenhänge rekonstruieren', 'Werkstatt', 'Lange Originalfunktionen und mehrteilige Implementierungen.'),
]


def lesson(title, prompt, location, gaps, topic, body, resources, explain=None):
    original, source = snippet(*location)
    spans = []
    gap_defs = []
    for i, gap in enumerate(gaps):
        needle = gap['within'] or gap['answer']
        at = -1
        for _ in range(gap['occurrence']):
            assert needle in original[at + 1:], f"{title}: missing {needle!r}"
            at = original.index(needle, at + 1)
        at += needle.index(gap['answer'])
        end = at + len(gap['answer'])
        assert not any(at < b and end > a for a, b, _ in spans), f'overlapping gap: {title}'
        spans.append((at, end, f'⟦{i + 1}⟧'))
        gap_defs.append(dict(id=f'g{i+1}', label=gap['label'], answers=[gap['answer'], *gap['alternatives']], hint=gap['hint'], multiline='\n' in gap['answer'] or len(gap['answer']) > 65))
    code = original
    for start, end, marker in sorted(spans, reverse=True):
        code = code[:start] + marker + code[end:]
    number = len(lessons) + 1
    lessons.append(dict(id=f'bear-{number:03}', chapter=(number-1)//10, title=title, prompt=prompt, code=code, gaps=gap_defs,
        wiki=dict(title=topic, body=body), explanation=explain or body.split('. ')[0] + '.', resources=resources, source=source,
        fingerprint=hashlib.sha256((original+json.dumps(gap_defs, ensure_ascii=False)).encode()).hexdigest()[:16]))

S = 'data/settings/Settings.kt'
D = 'data/db/Database.kt'
U = 'ui/UiModels.kt'
P = 'domain/RoundPlanner.kt'
R = 'domain/RoundSelection.kt'
B = 'domain/BearBlock.kt'
M = 'domain/SentenceMatcher.kt'
W = 'domain/WidgetPick.kt'
V = 'ui/BearViewModel.kt'
Q = 'data/Repositories.kt'
C = 'ui/capture/QuickCapture.kt'
A = 'MainActivity.kt'
H = 'ui/home/HomeScreen.kt'
O = 'ui/onboarding/OnboardingFlow.kt'
J = 'widget/WidgetData.kt'
X = 'work/Workers.kt'
N = 'data/linear/LinearClient.kt'
Z = 'alarm/RoundScheduler.kt'

# The curriculum is authored separately; it only names real source spans and masks.
exec((HERE / 'lessons.py').read_text(), globals())
assert len(lessons) == 100, len(lessons)
assert set(files) == set(snapshot['files']), 'Snapshot contains unused source files.'
output = dict(revision=REV, chapters=[dict(title=t, short=s, description=d) for t,s,d in chapters], tasks=lessons, files=files)
target = HERE / 'bear-course.json'
serialized = json.dumps(output, ensure_ascii=False, indent=2) + '\n'
if args.check:
    assert target.read_text() == serialized, 'Source snapshot or curriculum is out of date. Run pnpm bear:build.'
else:
    target.write_text(serialized)
print(f'{len(lessons)} lessons, {sum(len(t["gaps"]) for t in lessons)} gaps, {len(files)} original files; Bear {REV[:7]}')
