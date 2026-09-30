// pnpm content:check [bereich | bereich/modul ...] [--quiet]
// Validates content/ and prints errors, warnings and a size overview. With `bereich/modul`, only problems of
// these modules (and of area.yaml) are reported.
import { formatIssues, loadContent, type Issue } from './content.ts';

const args = process.argv.slice(2);
const quiet = args.includes('--quiet');
const only = args.filter((arg) => !arg.startsWith('--'));
const loaded = loadContent(only.map((arg) => arg.split('/')[0]), undefined, { allowMissing: args.includes('--allow-missing') });
const modules = only.filter((arg) => arg.includes('/'));
const relevant = (issue: Issue) => !modules.length || issue.file.endsWith('/area.yaml') || modules.some((m) => issue.file.endsWith(`${m.replace('/', '/modules/')}.yaml`));
loaded.errors = loaded.errors.filter(relevant);
loaded.warnings = loaded.warnings.filter(relevant);

for (const area of loaded.catalog.areas) {
  const c = area.counts;
  const exercises = Object.values(loaded.areas[area.id].modules).flatMap((m) => m.exercises);
  const types = Object.entries(exercises.reduce<Record<string, number>>((acc, e) => ({ ...acc, [e.type]: (acc[e.type] ?? 0) + 1 }), {}))
    .map(([type, n]) => `${type} ${n}`).join(', ');
  console.log(`${area.id.padEnd(12)} ${String(c.modules).padStart(3)} Module · ${String(c.exercises).padStart(4)} Übungen (${types}) · ${c.cards} Karten · ${c.projects} Projekte · ${c.glossary} Begriffe · ${Math.round(c.minutes / 60)} h`);
}
if (loaded.warnings.length && !quiet) console.log(`\n${loaded.warnings.length} Hinweise:\n${formatIssues(loaded.warnings)}`);
if (loaded.errors.length) {
  console.error(`\n${loaded.errors.length} Fehler:\n${formatIssues(loaded.errors)}`);
  process.exit(1);
}
console.log(`\nOK${loaded.warnings.length ? ` (${loaded.warnings.length} Hinweise${quiet ? ', mit --quiet ausgeblendet' : ''})` : ''}.`);
