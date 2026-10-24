// pytest and Hypothesis for the testing course (wheels in vendor/pyodide, served from /pyodide/).
// They load by file name instead of through Pyodide's lock file: the lock lists outdated dependencies for pytest
// (py, atomicwrites, setuptools …) but not `packaging`, and Hypothesis is not in it at all.
// `pnpm verify` installs the same versions into its virtual environment.
export const TEST_WHEELS = [
  'pytest-9.0.2-py3-none-any.whl',
  'pluggy-1.6.0-py3-none-any.whl',
  'iniconfig-2.3.0-py3-none-any.whl',
  'packaging-26.1-py3-none-any.whl',
  'pygments-2.20.0-py3-none-any.whl',
  'hypothesis-6.168.3-cp314-cp314-pyemscripten_2026_0_wasm32.whl',
  'sortedcontainers-2.4.0-py2.py3-none-any.whl',
];

/** Code that needs the wheels: it imports pytest or Hypothesis, or a test calls the harness helper `run_pytest`. */
export const USES_TESTS = /\b(?:pytest|hypothesis|run_pytest)\b/;

// openpyxl for the Excel exercises of the automation course. Pure Python like its only dependency et_xmlfile, and
// not in Pyodide's lock file either, so it loads by file name too.
export const EXCEL_WHEELS = [
  'openpyxl-3.1.5-py2.py3-none-any.whl',
  'et_xmlfile-2.0.0-py3-none-any.whl',
];

/** Code that imports openpyxl. */
export const USES_EXCEL = /\bopenpyxl\b/;

/** `name==version` for every wheel (wheel file names are `name-version-…`). */
const pins = (wheels: string[]) => wheels.map((file) => {
  const [name, version] = file.split('-');
  return `${name}==${version}`;
});
export const testPins = () => pins(TEST_WHEELS);
export const excelPins = () => pins(EXCEL_WHEELS);
