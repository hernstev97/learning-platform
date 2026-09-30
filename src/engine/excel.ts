// Excel formulas in answers: German and English Excel write the same formula differently
// (=SUMMEWENNS(B:B;A:A;"Nord") vs. =SUMIFS(B:B,A:A,"Nord")). Both become the same canonical tokens:
// English function names in upper case, "," as separator, "." as decimal point, no leading "=".

/** German → English names of the functions the course uses (Microsoft's official translations). */
export const EXCEL_FUNCTIONS: Record<string, string> = {
  // Logic
  WENN: 'IF', WENNS: 'IFS', WENNFEHLER: 'IFERROR', WENNNV: 'IFNA', UND: 'AND', ODER: 'OR', NICHT: 'NOT', XODER: 'XOR', ERSTERWERT: 'SWITCH',
  WAHR: 'TRUE', FALSCH: 'FALSE',
  // Lookup and reference
  SVERWEIS: 'VLOOKUP', WVERWEIS: 'HLOOKUP', XVERWEIS: 'XLOOKUP', VERGLEICH: 'MATCH', XVERGLEICH: 'XMATCH', INDIREKT: 'INDIRECT',
  'BEREICH.VERSCHIEBEN': 'OFFSET', ZEILE: 'ROW', ZEILEN: 'ROWS', SPALTE: 'COLUMN', SPALTEN: 'COLUMNS', HYPERLINK: 'HYPERLINK',
  PIVOTDATENZUORDNEN: 'GETPIVOTDATA',
  // Dynamic arrays
  SORTIEREN: 'SORT', SORTIERENNACH: 'SORTBY', EINDEUTIG: 'UNIQUE', SEQUENZ: 'SEQUENCE', NACHZEILE: 'BYROW', NACHSPALTE: 'BYCOL',
  ZUORDNEN: 'MAP', MATRIXERSTELLEN: 'MAKEARRAY', VSTAPELN: 'VSTACK', HSTAPELN: 'HSTACK', SPALTENWAHL: 'CHOOSECOLS', ZEILENWAHL: 'CHOOSEROWS',
  'ÜBERNEHMEN': 'TAKE', WEGLASSEN: 'DROP', ZUSPALTE: 'TOCOL', ZUZEILE: 'TOROW', GRUPPIERENNACH: 'GROUPBY', PIVOTMIT: 'PIVOTBY',
  // Aggregation and statistics
  SUMME: 'SUM', SUMMEWENN: 'SUMIF', SUMMEWENNS: 'SUMIFS', SUMMENPRODUKT: 'SUMPRODUCT', PRODUKT: 'PRODUCT',
  ANZAHL: 'COUNT', ANZAHL2: 'COUNTA', ANZAHLLEEREZELLEN: 'COUNTBLANK', 'ZÄHLENWENN': 'COUNTIF', 'ZÄHLENWENNS': 'COUNTIFS',
  MITTELWERT: 'AVERAGE', MITTELWERTWENN: 'AVERAGEIF', MITTELWERTWENNS: 'AVERAGEIFS', MINWENNS: 'MINIFS', MAXWENNS: 'MAXIFS',
  'MODUS.EINF': 'MODE.SNGL', 'STABW.S': 'STDEV.S', 'STABW.N': 'STDEV.P', 'QUANTIL.INKL': 'PERCENTILE.INC', 'QUANTIL.EXKL': 'PERCENTILE.EXC',
  'QUARTILE.INKL': 'QUARTILE.INC', 'QUARTILE.EXKL': 'QUARTILE.EXC', KORREL: 'CORREL', 'RANG.GLEICH': 'RANK.EQ', 'KGRÖSSTE': 'LARGE',
  KKLEINSTE: 'SMALL', GESTUTZTMITTEL: 'TRIMMEAN', SCHIEFE: 'SKEW', 'HÄUFIGKEIT': 'FREQUENCY', STANDARDISIERUNG: 'STANDARDIZE',
  TEILERGEBNIS: 'SUBTOTAL', AGGREGAT: 'AGGREGATE',
  // Math
  RUNDEN: 'ROUND', AUFRUNDEN: 'ROUNDUP', ABRUNDEN: 'ROUNDDOWN', GANZZAHL: 'INT', REST: 'MOD', WURZEL: 'SQRT', POTENZ: 'POWER',
  ZUFALLSZAHL: 'RAND', ZUFALLSBEREICH: 'RANDBETWEEN', 'OBERGRENZE.MATHEMATIK': 'CEILING.MATH', 'UNTERGRENZE.MATHEMATIK': 'FLOOR.MATH',
  // Text
  VERKETTEN: 'CONCATENATE', TEXTKETTE: 'CONCAT', TEXTVERKETTEN: 'TEXTJOIN', LINKS: 'LEFT', RECHTS: 'RIGHT', TEIL: 'MID', 'LÄNGE': 'LEN',
  FINDEN: 'FIND', SUCHEN: 'SEARCH', WECHSELN: 'SUBSTITUTE', ERSETZEN: 'REPLACE', GROSS: 'UPPER', KLEIN: 'LOWER', GROSS2: 'PROPER',
  'GLÄTTEN': 'TRIM', 'SÄUBERN': 'CLEAN', WERT: 'VALUE', ZAHLENWERT: 'NUMBERVALUE', TEXTTEILEN: 'TEXTSPLIT', TEXTVOR: 'TEXTBEFORE',
  TEXTNACH: 'TEXTAFTER', IDENTISCH: 'EXACT', WIEDERHOLEN: 'REPT', ZEICHEN: 'CHAR',
  // Date and time
  HEUTE: 'TODAY', JETZT: 'NOW', DATUM: 'DATE', JAHR: 'YEAR', MONAT: 'MONTH', TAG: 'DAY', WOCHENTAG: 'WEEKDAY', KALENDERWOCHE: 'WEEKNUM',
  ISOKALENDERWOCHE: 'ISOWEEKNUM', MONATSENDE: 'EOMONTH', EDATUM: 'EDATE', NETTOARBEITSTAGE: 'NETWORKDAYS', ARBEITSTAG: 'WORKDAY',
  DATWERT: 'DATEVALUE', TAGE: 'DAYS', STUNDE: 'HOUR', SEKUNDE: 'SECOND',
  // Information
  ISTLEER: 'ISBLANK', ISTFEHLER: 'ISERROR', ISTNV: 'ISNA', ISTZAHL: 'ISNUMBER', ISTTEXT: 'ISTEXT', NV: 'NA',
};

/** Error values and the special items of structured references. */
const EXCEL_SPECIAL: Record<string, string> = {
  '#NV': '#N/A', '#WERT!': '#VALUE!', '#BEZUG!': '#REF!', '#ZAHL!': '#NUM!', '#ÜBERLAUF!': '#SPILL!', '#KALK!': '#CALC!',
  '#ALLE': '#ALL', '#DATEN': '#DATA', '#KOPFZEILEN': '#HEADERS', '#ERGEBNISSE': '#TOTALS', '#DIESE ZEILE': '#THIS ROW',
};

const WORD = /^[A-Za-zÄÖÜäöüß_][\wÄÖÜäöüß.]*$/;
const EXCEL = /"(?:[^"]|"")*"?|'(?:[^']|'')*'!|\[(?:[^[\]]|\[[^[\]]*\])*\]|#[A-Za-zÄÖÜäöü/0-9]+[!?]?|\d+(?:[.,]\d+)?(?:[eE][+-]?\d+)?%?|\$?[A-Za-zÄÖÜäöüß_][\wÄÖÜäöüß.]*\$?\d*|<>|<=|>=|[^\s]/g;

/** A structured reference like Umsatz[[#Alle];[Betrag]] or [@Menge]: case-insensitive, German items and ";" normalised. */
function canonicalBracket(token: string): string {
  return token.toUpperCase()
    .replace(/#[A-ZÄÖÜ ]+[A-ZÄÖÜ]/g, (item) => EXCEL_SPECIAL[item] ?? item)
    .replace(/\s*[;,]\s*/g, ',')
    .replace(/\[\s+|\s+\]/g, (m) => m.trim());
}

/**
 * German formulas use ";" between arguments and "," as decimal separator. A formula counts as German if it contains ";",
 * a German function name, or (without any function call) a number with a decimal comma such as =A1*0,19.
 */
function isGerman(formula: string, raw: string[]): boolean {
  if (raw.some((t) => t === ';')) return true;
  if (raw.some((t, i) => raw[i + 1] === '(' && EXCEL_FUNCTIONS[t.toUpperCase()] && EXCEL_FUNCTIONS[t.toUpperCase()] !== t.toUpperCase())) return true;
  return !formula.includes('(') && /\d,\d/.test(formula);
}

export function excelTokens(value: string): string[] {
  const formula = value.trim().replace(/^=/, '');
  const raw = formula.match(EXCEL) ?? [];
  const german = isGerman(formula, raw);
  const out: string[] = [];
  for (const token of raw) {
    if (token.startsWith('"')) { out.push(token); continue; }
    if (token.startsWith('[')) { out.push(canonicalBracket(token)); continue; }
    if (token.startsWith("'")) { out.push(token.toUpperCase()); continue; }
    if (token.startsWith('#')) { const upper = token.toUpperCase(); out.push(EXCEL_SPECIAL[upper] ?? upper); continue; }
    if (/^\d/.test(token)) {
      if (!german && /^\d+,\d+$/.test(token)) { out.push(...token.split(/(,)/)); continue; }
      out.push(token.replace(',', '.').toUpperCase());
      continue;
    }
    if (token === ';') { out.push(','); continue; }
    const upper = token.toUpperCase();
    // Functions, booleans and cell references are case-insensitive; names are translated wherever they appear.
    if (WORD.test(token) || /^\$?[A-Z]+\$?\d+$/i.test(token)) { out.push(EXCEL_FUNCTIONS[upper] ?? upper); continue; }
    out.push(token);
  }
  return out;
}
