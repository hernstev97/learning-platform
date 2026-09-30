import { describe, expect, it } from 'vitest';
import { join } from 'node:path';
import { loadContent } from '../../tooling/content.ts';
import type { GapExercise } from '../content/types.ts';
import { assemble, gapSolution, isChoiceCorrect, isCommandCorrect, isGapCorrect, isGapExerciseCorrect, isOrderCorrect, isOutputCorrect, shellTokens, shuffledOrder, tokens } from './answers.ts';

const kotlin = loadContent(['kotlin'], undefined, { allowMissing: true }).areas.kotlin;
const bear = Object.values(kotlin.modules).filter((m) => m.bear).flatMap((m) => m.exercises) as GapExercise[];
const fixtures = loadContent(undefined, join(import.meta.dirname, '../../tooling/fixtures'));
const example = fixtures.areas.beispiel.modules['alle-typen'].exercises;
const byId = (id: string) => example.find((e) => e.id === `alle-typen/${id}`)! as any;
function dedent(value: string): string {
  const lines = value.split('\n');
  const indent = Math.min(...lines.filter((line) => line.trim()).map((line) => line.match(/^ */)![0].length));
  return lines.map((line) => line.trim() ? line.slice(indent) : '').join('\n');
}

describe('Kotlin reconstruction (Bear track)', () => {
  it('does not merge identifier parts or compound operators', () => {
    const valGap = bear[0].gaps[0];
    expect(isGapCorrect(valGap, ' val ')).toBe(true);
    expect(isGapCorrect(valGap, 'v al')).toBe(false);
    expect(isGapCorrect(valGap, 'VAL')).toBe(false);
    expect(isGapCorrect(valGap, 'val // comment')).toBe(false);
    const safe = bear[24].gaps[0];
    expect(isGapCorrect(safe, '?.')).toBe(true);
    expect(isGapCorrect(safe, '? .')).toBe(false);
  });
  it('preserves Kotlin strings, escapes and numeric suffixes', () => {
    const string = bear[1].gaps[0];
    expect(isGapCorrect(string, '"Bear"')).toBe(true);
    expect(isGapCorrect(string, "'Bear'")).toBe(false);
    expect(isGapCorrect(string, '" Bear "')).toBe(false);
    const regex = bear[90].gaps[1];
    expect(isGapCorrect(regex, String.raw`replace(Regex("\\s+"), " ")`)).toBe(true);
    expect(isGapCorrect(regex, String.raw`replace(Regex("\s+"), " ")`)).toBe(false);
  });
  it.each(bear.map((e) => [e.id, e] as const))('%s reconstructs its exact Bear source excerpt', (_, task) => {
    const original = kotlin.files[task.source!.file].split('\n').slice(task.source!.start - 1, task.source!.end).join('\n');
    expect(assemble(task, gapSolution(task))).toBe(dedent(original));
    expect(isGapExerciseCorrect(task, gapSolution(task))).toBe(true);
    expect(isGapExerciseCorrect(task, {})).toBe(false);
  });
  it('keeps the 100-task structure', () => {
    expect(bear).toHaveLength(100);
    expect(Object.values(kotlin.modules).filter((m) => m.bear)).toHaveLength(10);
    expect(bear[99].gaps).toHaveLength(7);
  });
});

describe('Answer checking per language', () => {
  it('treats Python quote styles as equal but keeps content strict', () => {
    expect(tokens(`print('a')`, 'python')).toEqual(tokens(`print("a")`, 'python'));
    expect(tokens(`print('a')`, 'python')).not.toEqual(tokens(`print('b')`, 'python'));
    expect(tokens(`f'{x}'`, 'python')).toEqual(tokens(`f"{x}"`, 'python'));
  });
  it('tokenises Rust lifetimes and char literals', () => {
    expect(tokens(`fn f<'a>(x: &'a str) -> char { 'x' }`, 'rust')).toContain(`'a`);
    expect(tokens(`'x'`, 'rust')).toEqual([`'x'`]);
  });
  it('normalises shell flags and harmless quoting', () => {
    const ex = { answers: ['ls -la'] };
    for (const ok of ['ls -la', 'ls -al', 'ls -l -a', '  ls   -a -l ', '$ ls -la']) expect(isCommandCorrect(ex, ok)).toBe(true);
    for (const bad of ['ls -l', 'ls -la /', 'ls --all', 'rm -la']) expect(isCommandCorrect(ex, bad)).toBe(false);
    expect(shellTokens(`grep "error" log`)).toEqual(shellTokens(`grep error log`));
    expect(shellTokens(`find . -name '*.log'`)).toEqual(shellTokens(`find . -name "*.log"`));
    expect(shellTokens(`find . -name '*.log'`)).not.toEqual(shellTokens(`find . -name *.log`));
    expect(shellTokens(`echo "$HOME"`)).not.toEqual(shellTokens(`echo '$HOME'`));
  });
  it('reads German and English Excel formulas alike', () => {
    const same = (a: string, b: string) => expect(tokens(a, 'excel'), `${a} = ${b}`).toEqual(tokens(b, 'excel'));
    const differ = (a: string, b: string) => expect(tokens(a, 'excel'), `${a} ≠ ${b}`).not.toEqual(tokens(b, 'excel'));
    same('=SUMMEWENNS(Umsatz[Betrag];Umsatz[Region];"Nord")', '=sumifs(umsatz[betrag], umsatz[region], "Nord")');
    same('=WENNFEHLER(SVERWEIS(A2;$F$2:$G$20;2;FALSCH);"fehlt")', 'IFERROR(VLOOKUP(A2,$F$2:$G$20,2,FALSE),"fehlt")');
    same('=ZÄHLENWENNS(Tickets[Status];"offen")', '=COUNTIFS(Tickets[Status],"offen")');
    same('=RUNDEN(B2*0,19;2)', '=ROUND(B2*0.19,2)');
    same('=A1*0,19', '=A1*0.19');
    same('=SUM(1,2)', '=SUMME(1;2)');
    same('=Umsatz[[#Alle];[Betrag]]', '=Umsatz[[#All],[Betrag]]');
    same('=[@Menge]*[@Preis]', '=[@menge] * [@preis]');
    same('=MODUS.EINF(B:B)', '=MODE.SNGL(B:B)');
    differ('=$A$1*B2', '=A1*B2');
    differ('=MITTELWERT(B2:B9)', '=MEDIAN(B2:B9)');
    differ('=WENN(A2="Nord";1;0)', '=WENN(A2="nord";1;0)');
    const gap = byId('excel-formel').gaps[0];
    for (const ok of ['SUMMEWENNS', 'summewenns', 'SUMIFS']) expect(isGapCorrect(gap, ok, 'excel')).toBe(true);
    expect(isGapCorrect(gap, 'SUMMEWENN', 'excel')).toBe(false);
  });
  it('compares SQL case-insensitively except inside strings', () => {
    expect(tokens('select count(*) from kunden where region != \'Nord\';', 'sql')).toEqual(tokens('SELECT COUNT(*) FROM Kunden WHERE region <> \'Nord\'', 'sql'));
    expect(tokens("WHERE region = 'nord'", 'sql')).not.toEqual(tokens("WHERE region = 'Nord'", 'sql'));
    expect(tokens('a >= 1', 'sql')).not.toEqual(tokens('a > = 1', 'sql'));
  });
  it('checks every fixture exercise type', () => {
    expect(isGapExerciseCorrect(byId('lueckentext'), { g1: 'def', g2: '2*x' })).toBe(true);
    expect(isChoiceCorrect(byId('auswahl'), [0, 2])).toBe(true);
    expect(isChoiceCorrect(byId('auswahl'), [0])).toBe(false);
    expect(isOrderCorrect(byId('reihenfolge'), [0, 1, 2, 3, 4])).toBe(true);
    expect(isOrderCorrect(byId('reihenfolge'), byId('reihenfolge').shuffled)).toBe(false);
    expect(isOutputCorrect(byId('ausgabe'), '[1, 2, 3]  \n[3, 1, 2]\n\n')).toBe(true);
    expect(isOutputCorrect(byId('ausgabe'), '[1, 2, 3]')).toBe(false);
  });
  it('never shuffles into the solved order', () => {
    for (let n = 2; n < 12; n++) for (const seed of ['a', 'b', 'c', 'xyz']) {
      const order = shuffledOrder(n, seed);
      expect([...order].sort((a, b) => a - b)).toEqual(Array.from({ length: n }, (_, i) => i));
      expect(order.some((v, i) => v !== i)).toBe(true);
    }
  });
});
