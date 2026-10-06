// Small, dependency-free highlighter used at build time (lessons) and at runtime (exercises).
// It colours tokens; it does not parse. Unknown languages fall back to escaped plain text.

export const escape = (value: string) => value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);

type Rule = [RegExp, string];
type Language = { rules: Rule[]; keywords: Set<string>; builtins?: Set<string>; types?: boolean; calls?: boolean };

const words = (value: string) => new Set(value.trim().split(/\s+/));
const cStyle: Rule[] = [[/\/\/[^\n]*/y, 'comment'], [/\/\*[\s\S]*?(?:\*\/|$)/y, 'comment']];
const hashComment: Rule = [/#[^\n]*/y, 'comment'];
const number: Rule = [/\b(?:0[xX][\da-fA-F_]+|0[bB][01_]+|\d[\d_]*(?:\.\d[\d_]*)?(?:[eE][+-]?\d+)?)(?:[a-zA-Z]\w*)?\b/y, 'number'];

const LANGUAGES: Record<string, Language> = {
  kotlin: {
    rules: [...cStyle, [/"""[\s\S]*?(?:"""|$)/y, 'string'], [/"(?:\\.|[^"\\\n])*"?/y, 'string'], [/'(?:\\.|[^'\\\n])*'/y, 'string'], [/@[A-Za-z_][\w.]*/y, 'annotation'], number],
    keywords: words(`val var fun class data interface sealed suspend return if else when for in by override private public protected is true false null object try catch finally throw const while do continue break internal enum as open abstract inline reified crossinline noinline lateinit companion init this super typealias import package where out vararg operator infix tailrec annotation value get set constructor external expect actual it`),
    types: true, calls: true,
  },
  rust: {
    rules: [...cStyle, [/#!?\[[^\]\n]*\]/y, 'annotation'], [/r(#*)"[\s\S]*?"\1/y, 'string'], [/b?"(?:\\.|[^"\\])*"?/y, 'string'], [/b?'(?:\\u\{[0-9a-fA-F]+\}|\\.|[^'\\\n])'/y, 'string'], [/'[A-Za-z_]\w*/y, 'lifetime'], [/[a-z_]\w*!(?=[(\[{\s])/y, 'macro'], number],
    keywords: words(`as async await break const continue crate dyn else enum extern false fn for if impl in let loop match mod move mut pub ref return self Self static struct super trait true type unsafe use where while union yield`),
    types: true, calls: true,
  },
  python: {
    rules: [hashComment, [/[rRbBfFuU]{0,2}(?:"""[\s\S]*?(?:"""|$)|'''[\s\S]*?(?:'''|$)|"(?:\\.|[^"\\\n])*"?|'(?:\\.|[^'\\\n])*'?)/y, 'string'], [/@[A-Za-z_][\w.]*/y, 'annotation'], number],
    keywords: words(`False None True and as assert async await break class continue def del elif else except finally for from global if import in is lambda nonlocal not or pass raise return try while with yield match case self cls`),
    builtins: words(`print len range enumerate zip map filter sorted reversed sum min max abs any all open isinstance issubclass type int float str bool list dict set tuple frozenset bytes object super iter next repr hash id input round divmod getattr setattr hasattr vars dir format callable`),
    types: true, calls: true,
  },
  shell: {
    rules: [hashComment, [/'[^']*'?/y, 'string'], [/"(?:\\.|[^"\\])*"?/y, 'string'], [/\$\{[^}\n]*\}?|\$[A-Za-z_]\w*|\$[0-9@#?$!*-]/y, 'variable'], [/(?<=\s)--?[A-Za-z][\w-]*/y, 'option']],
    keywords: words(`if then else elif fi for while until do done case esac in function return local export readonly declare set unset shift exit trap source select break continue`),
    types: false, calls: false,
  },
  yaml: {
    rules: [hashComment, [/"(?:\\.|[^"\\\n])*"?|'(?:[^'\n]|'')*'?/y, 'string'], [/[A-Za-z_][\w.-]*(?=\s*:(?:\s|$))/y, 'key'], [/\b(?:true|false|null|yes|no|on|off)\b/y, 'keyword'], number],
    keywords: words(''),
  },
  toml: {
    rules: [hashComment, [/^\s*\[\[?[^\]\n]+\]\]?/my, 'type'], [/"""[\s\S]*?(?:"""|$)|"(?:\\.|[^"\\\n])*"?|'[^'\n]*'?/y, 'string'], [/[A-Za-z_][\w.-]*(?=\s*=)/y, 'key'], [/\b(?:true|false)\b/y, 'keyword'], number],
    keywords: words(''),
  },
  json: {
    rules: [[/"(?:\\.|[^"\\\n])*"(?=\s*:)/y, 'key'], [/"(?:\\.|[^"\\\n])*"?/y, 'string'], [/\b(?:true|false|null)\b/y, 'keyword'], number],
    keywords: words(''),
  },
  sql: {
    rules: [[/--[^\n]*/y, 'comment'], [/'(?:[^']|'')*'?/y, 'string'], number],
    keywords: words(`select from where insert into values update set delete create table index view drop alter add primary key foreign references not null unique default and or in is like between join left right inner outer on group by order having limit offset as distinct count sum avg min max case when then else end begin commit rollback transaction integer text real blob varchar`),
  },
  // PostgreSQL: dollar-quoted bodies, E'…' strings, quoted identifiers, ::casts and the keywords of DDL, transactions and EXPLAIN.
  postgres: {
    rules: [
      [/--[^\n]*/y, 'comment'], [/\/\*[\s\S]*?(?:\*\/|$)/y, 'comment'], [/\$([A-Za-z_]\w*)?\$[\s\S]*?(?:\$\1\$|$)/y, 'string'],
      [/[eE]'(?:\\.|''|[^'\\])*'?/y, 'string'], [/'(?:[^']|'')*'?/y, 'string'], [/"(?:[^"]|"")*"?/y, 'key'], [/::[A-Za-z_]\w*(?:\[\])?/y, 'type'], [/\$\d+/y, 'variable'], number,
    ],
    keywords: words(`select from where insert into values update set delete create table index view drop alter add column primary key foreign references not null unique default check constraint and or in is like ilike similar between join left right full inner outer cross lateral natural using on group by order having limit offset fetch first next rows only as distinct case when then else end begin commit rollback savepoint release transaction start isolation level read write committed repeatable serializable for share nowait skip locked returning conflict do nothing with recursive materialized union all except intersect exists any some explain analyze buffers verbose costs format vacuum cascade restrict concurrently if replace function procedure language returns return trigger execute declare raise notice exception perform loop schema extension sequence identity generated always stored type enum domain grant revoke owner to partition range list hash include asc desc nulls filter over window partition lock tablespace comment truncate copy deferrable initially deferred immediate valid validate exclude gist gin btree brin true false unknown integer int bigint smallint numeric decimal real double precision text varchar char boolean bool date time timestamp timestamptz interval uuid jsonb json bytea serial bigserial tstzrange daterange int4range array zone at`),
  },
  xml: {
    rules: [[/<!--[\s\S]*?(?:-->|$)/y, 'comment'], [/<\/?[A-Za-z][\w:.-]*/y, 'keyword'], [/\/?>/y, 'keyword'], [/"[^"\n]*"?/y, 'string'], [/[A-Za-z_][\w:.-]*(?==)/y, 'key']],
    keywords: words(''),
  },
  dockerfile: {
    rules: [hashComment, [/"(?:\\.|[^"\\\n])*"?/y, 'string'], [/\$\{?[A-Za-z_]\w*\}?/y, 'variable']],
    keywords: words(`FROM RUN CMD LABEL EXPOSE ENV ADD COPY ENTRYPOINT VOLUME USER WORKDIR ARG ONBUILD STOPSIGNAL HEALTHCHECK SHELL AS`),
  },
  ini: {
    rules: [[/[;#][^\n]*/y, 'comment'], [/^\s*\[[^\]\n]+\]/my, 'type'], [/[A-Za-z_][\w.-]*(?=\s*=)/y, 'key']],
    keywords: words(''),
  },
  diff: {
    rules: [[/^\+[^\n]*/my, 'string'], [/^-[^\n]*/my, 'number'], [/^@@[^\n]*/my, 'annotation']],
    keywords: words(''),
  },
  // Excel formulas, German or English: =SUMMEWENNS(Umsatz[Betrag];Umsatz[Region];"Nord")
  excel: {
    rules: [
      [/"(?:[^"]|"")*"?/y, 'string'], [/'(?:[^'\n]|'')*'!/y, 'type'], [/\[(?:[^[\]\n]|\[[^[\]\n]*\])*\]/y, 'key'],
      [/#[A-Za-zÄÖÜäöü/0-9]+[!?]?/y, 'annotation'], [/[A-Za-zÄÖÜäöüß_][\wÄÖÜäöüß.]*(?=\()/y, 'fn'], [/\$?[A-Za-z]{1,3}\$?\d+\b/y, 'variable'], number,
    ],
    keywords: words('WAHR FALSCH TRUE FALSE'),
  },
  // Power Query M: let … in, each, #"Schritt mit Leerzeichen", Table.SelectRows(…)
  powerquery: {
    rules: [...cStyle, [/#"(?:[^"]|"")*"?/y, 'key'], [/"(?:[^"]|"")*"?/y, 'string'], [/#[a-z]+/y, 'annotation'], number],
    keywords: words(`let in each if then else try otherwise catch type meta as is not and or true false null error section shared`),
    calls: true,
  },
  csv: {
    rules: [[/"(?:[^"]|"")*"?/y, 'string']],
    keywords: words(''),
  },
  // TypeScript and JavaScript, including TSX: tests with Vitest, Testing Library and Playwright.
  typescript: {
    rules: [...cStyle, [/`(?:\\.|[^`\\])*`?/y, 'string'], [/"(?:\\.|[^"\\\n])*"?/y, 'string'], [/'(?:\\.|[^'\\\n])*'?/y, 'string'], [/@[A-Za-z_][\w.]*/y, 'annotation'], number],
    keywords: words(`abstract any as async await boolean break case catch class const constructor continue declare default delete do else enum export extends false finally for from function get if implements import in infer instanceof interface keyof let namespace never new null number of private protected public readonly return satisfies set static string super switch symbol this throw true try type typeof undefined unknown var void while yield`),
    types: true, calls: true,
  },
};
LANGUAGES.javascript = LANGUAGES.typescript;
const ALIASES: Record<string, string> = {
  kt: 'kotlin', kts: 'kotlin', gradle: 'kotlin', java: 'kotlin', groovy: 'kotlin', rs: 'rust', py: 'python', python3: 'python',
  bash: 'shell', sh: 'shell', zsh: 'shell', fish: 'shell', terminal: 'shell', yml: 'yaml', jsonc: 'json', docker: 'dockerfile',
  containerfile: 'dockerfile', systemd: 'ini', service: 'ini', conf: 'ini', cfg: 'ini', html: 'xml', svg: 'xml', pycon: 'python',
  postgresql: 'postgres', pgsql: 'postgres', plpgsql: 'postgres',
  xlsx: 'excel', formula: 'excel', m: 'powerquery', pq: 'powerquery', tsv: 'csv',
  ts: 'typescript', tsx: 'typescript', mts: 'typescript', cts: 'typescript', js: 'javascript', jsx: 'javascript', mjs: 'javascript', cjs: 'javascript',
};
export const languageOf = (lang: string | undefined | null) => {
  const l = (lang ?? '').toLowerCase();
  return LANGUAGES[l] ? l : ALIASES[l] ?? (l === 'console' ? 'console' : 'text');
};

const span = (type: string, text: string) => `<span class="syntax-${type}">${escape(text)}</span>`;

function highlightCode(code: string, name: string): string {
  const language = LANGUAGES[name];
  if (!language) return escape(code);
  let out = '';
  let position = 0;
  let commandPosition = true;
  const identifier = /[A-Za-z_][\w]*/y;
  while (position < code.length) {
    let matched = false;
    for (const [rule, type] of language.rules) {
      rule.lastIndex = position;
      const match = rule.exec(code);
      if (match && match[0].length) {
        out += span(type, match[0]);
        position += match[0].length;
        matched = true;
        commandPosition = false;
        break;
      }
    }
    if (matched) continue;
    identifier.lastIndex = position;
    const id = identifier.exec(code);
    if (id) {
      const word = id[0];
      const after = code.slice(position + word.length).match(/^\s*(.)/)?.[1];
      let type = '';
      if (language.keywords.has(word) || ((name === 'sql' || name === 'postgres') && language.keywords.has(word.toLowerCase()))) type = 'keyword';
      else if (name === 'shell' && commandPosition && !/^[=]/.test(code[position + word.length] ?? '')) type = 'fn';
      else if (language.builtins?.has(word) && after === '(') type = 'builtin';
      else if (language.types && /^[A-Z]/.test(word) && !/^[A-Z0-9_]+$/.test(word.length > 1 ? word : 'x')) type = 'type';
      else if (language.calls && after === '(') type = 'fn';
      out += type ? span(type, word) : escape(word);
      position += word.length;
      if (name === 'shell') {
        // Consume the rest of a command word such as ./script.sh or systemctl-like names with dashes.
        const rest = code.slice(position).match(/^[\w./:@%+-]+/)?.[0] ?? '';
        if (rest) { out += type ? span(type, rest) : escape(rest); position += rest.length; }
        commandPosition = language.keywords.has(word) && ['then', 'else', 'do', 'if', 'while', 'until', 'elif'].includes(word);
      }
      continue;
    }
    const char = code[position];
    if (name === 'shell') {
      if (char === '\n' || char === '|' || char === ';' || char === '&' || char === '(' || char === '`') commandPosition = true;
      else if (!/\s/.test(char)) commandPosition = false;
    }
    out += escape(char);
    position++;
  }
  return out;
}

function highlightConsole(code: string): string {
  return code.split('\n').map((line) => {
    const prompt = line.match(/^((?:[\w.-]+@[\w.-]+(?::[^$#\n]*)?)?[$#] )/);
    if (prompt) return `<span class="syntax-prompt">${escape(prompt[1])}</span>${highlightCode(line.slice(prompt[1].length), 'shell')}`;
    return `<span class="syntax-output">${escape(line)}</span>`;
  }).join('\n');
}

export function highlight(code: string, lang: string | null | undefined = 'kotlin'): string {
  const name = languageOf(lang);
  if (name === 'console') return highlightConsole(code);
  if (name === 'text') return escape(code);
  return highlightCode(code, name);
}

/** Exercise code: ⟦n⟧ markers become links to the matching answer field. */
export function highlightWithGaps(code: string, lang: string | null | undefined = 'kotlin'): string {
  // Split exercise markers first so holes inside strings remain interactive.
  return code.split(/(⟦\d+⟧)/g).map((chunk) => {
    const gap = chunk.match(/^⟦(\d+)⟧$/);
    if (gap) return `<a class="code-gap" href="#answer-g${gap[1]}" data-gap-link="g${gap[1]}" aria-label="Zu Lücke ${gap[1]}">${gap[1]}</a>`;
    return highlight(chunk, lang);
  }).join('');
}
