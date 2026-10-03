# Runs learner code. Used identically by the browser (Pyodide worker) and by `pnpm verify` (CPython).
import ast
import asyncio
import contextlib
import fnmatch
import io
import linecache
import os
import sys
import tempfile
import traceback


def capture(fn, *args, **kwargs):
    """Ruft fn(*args, **kwargs) auf und gibt alles zurück, was dabei auf stdout geschrieben wurde."""
    buffer = io.StringIO()
    with contextlib.redirect_stdout(buffer):
        fn(*args, **kwargs)
    return buffer.getvalue()


def _no_input(*_args, **_kwargs):
    raise RuntimeError("input() ist hier nicht verfügbar. Übergib Werte als Parameter.")


def _format(exc, own=("<dein-code>", "<code>")):
    """Traceback without harness frames; SyntaxErrors keep their caret line."""
    if isinstance(exc, SyntaxError):
        return "".join(traceback.format_exception_only(type(exc), exc)).rstrip()
    frames = [f for f in traceback.extract_tb(exc.__traceback__) if f.filename in own or f.filename in ("<test>", "<vorbereitung>")]
    lines = ["Traceback (most recent call last):"]
    for frame in frames:
        lines.append(f'  Zeile {frame.lineno} in {frame.name}' + (f"\n    {frame.line}" if frame.line else ""))
    lines.append(f"{type(exc).__name__}: {exc}")
    return "\n".join(lines)


def _source(name, code):
    """Register exec'd source so tracebacks can show the failing line. Top-level `await` is allowed."""
    linecache.cache[name] = (len(code), None, code.splitlines(True), name)
    return compile(code, name, "exec", flags=ast.PyCF_ALLOW_TOP_LEVEL_AWAIT)


async def _exec(name, code, namespace):
    """Runs code; awaits it when it contains top-level `await` (tests of async functions)."""
    result = eval(_source(name, code), namespace)
    if asyncio.iscoroutine(result):
        await result


_workspace = None


def _fresh_directory():
    """A fresh, empty working directory that is also importable, so `setup` can write modules the code imports.

    Modules imported from the previous one are forgotten: the browser reuses one interpreter for every run.
    """
    global _workspace
    if _workspace:
        with contextlib.suppress(ValueError):
            sys.path.remove(_workspace)
        _forget_modules(_workspace)
    _workspace = tempfile.mkdtemp(prefix="uebung-")
    os.chdir(_workspace)
    sys.path.insert(0, _workspace)


def _forget_modules(directory):
    """Drops modules loaded from `directory` from the import cache, so the next import reads the file again."""
    prefix = os.path.join(os.path.realpath(directory), "")
    for name, module in list(sys.modules.items()):
        file = getattr(module, "__file__", None)
        if file and os.path.realpath(file).startswith(prefix):
            del sys.modules[name]


# The harness imports Hypothesis before pytest starts (for its settings profile, and the browser keeps modules between
# runs), so pytest could not rewrite the asserts in its plugin and would warn about that in every report. Other rewrite
# warnings, such as the one for `assert (x, "…")`, stay visible.
PYTEST_ARGS = ["-p", "no:cacheprovider", "-p", "no:faulthandler", "--capture=sys", "--no-header", "--color=no",
               "-W", "ignore:Module already imported so cannot be rewritten:pytest.PytestAssertRewriteWarning"]


class PytestRun:
    """What one pytest run reported: `ok`, the names of passed, failed and skipped tests, and the terminal output."""

    def __init__(self, exit_code, outcomes, output):
        self.exit_code = exit_code
        self.outcomes = outcomes
        self.output = output

    def _named(self, *outcomes):
        return [name for name, outcome in self.outcomes.items() if outcome in outcomes]

    @property
    def passed(self):
        return self._named("passed")

    @property
    def failed(self):
        """Failed tests and errors (in fixtures or while collecting)."""
        return self._named("failed", "error")

    @property
    def skipped(self):
        return self._named("skipped", "xfailed")

    @property
    def ok(self):
        """pytest exited with 0 and at least one test passed."""
        return self.exit_code == 0 and bool(self.passed)

    def __repr__(self):
        return f"PytestRun(exit_code={self.exit_code}, passed={len(self.passed)}, failed={len(self.failed)})"


class _Outcomes:
    """pytest plugin: one outcome per test (passed, failed, error, skipped, xfailed, xpassed)."""

    def __init__(self):
        self.outcomes = {}

    def pytest_runtest_logreport(self, report):
        name = report.nodeid.split("::", 1)[-1]
        if report.when == "call":
            if hasattr(report, "wasxfail"):
                self.outcomes[name] = "xfailed" if report.skipped else "xpassed"
            else:
                self.outcomes[name] = report.outcome
        elif report.failed:
            self.outcomes[name] = "error"
        elif report.skipped:
            self.outcomes.setdefault(name, "skipped")

    def pytest_collectreport(self, report):
        if report.failed:
            self.outcomes[report.nodeid or "<Sammeln>"] = "error"


def _hypothesis_profile():
    """The same examples on every run, no deadline (Pyodide is slower than CPython) and no example database."""
    from hypothesis import settings

    settings.register_profile("lernplattform", derandomize=True, deadline=None, database=None, print_blob=False)
    settings.load_profile("lernplattform")


def _run_pytest(source, files=None, *, args=(), name="test_loesung.py", style=("-q", "--tb=short")):
    """Runs pytest on `source` (saved as `name`) next to `files` ({path: text}) in a new directory and returns a PytestRun."""
    import pytest

    files = files or {}
    if "hypothesis" in source or any("hypothesis" in text for text in files.values()):
        _hypothesis_profile()
    directory = tempfile.mkdtemp(prefix="pytest-", dir=_workspace)
    # An empty pytest.ini makes the directory the rootdir: no configuration from further up applies.
    for path, text in {"pytest.ini": "[pytest]\n", **files, name: source}.items():
        target = os.path.join(directory, path)
        os.makedirs(os.path.dirname(target), exist_ok=True)
        with open(target, "w", encoding="utf-8") as handle:
            handle.write(text)
    # A module under test that `setup` or a previous run already imported must be read again (e.g. a broken variant).
    _forget_modules(_workspace or directory)
    saved_path, saved_cwd, saved_columns = sys.path[:], os.getcwd(), os.environ.get("COLUMNS")
    sys.path.insert(0, directory)
    os.chdir(directory)
    # pytest fills separator lines to the terminal width; 64 columns fit the lesson column and test messages.
    os.environ["COLUMNS"] = "64"
    # A test file is run on its own; anything else (e.g. a conftest.py with fixtures) applies to the test files in
    # `files`, so pytest collects the directory unless `args` names paths.
    targets = [name] if fnmatch.fnmatch(os.path.basename(name), "test_*.py") or name.endswith("_test.py") else []
    collector, out = _Outcomes(), io.StringIO()
    try:
        with contextlib.redirect_stdout(out), contextlib.redirect_stderr(out):
            exit_code = int(pytest.main([*PYTEST_ARGS, *style, *args, *targets], plugins=[collector]))
    finally:
        os.chdir(saved_cwd)
        sys.path[:] = saved_path
        if saved_columns is None:
            os.environ.pop("COLUMNS", None)
        else:
            os.environ["COLUMNS"] = saved_columns
        _forget_modules(_workspace or directory)
    output = out.getvalue().strip()
    if exit_code == 5:
        output = f"Keine Tests gefunden: Testfunktionen beginnen mit test_.\n{output}"
    return PytestRun(exit_code, collector.outcomes, output)


async def run_exercise(setup, code, tests):
    """Returns {stdout, error, tests: [{name, ok, message}]}."""
    _fresh_directory()

    def run_pytest(files=None, *, args=(), name="test_loesung.py"):
        """Runs pytest on the learner's code, saved as `name` next to `files` ({path: text}). Returns a PytestRun."""
        return _run_pytest(code, files, args=args, name=name)

    namespace = {"__name__": "loesung", "capture": capture, "input": _no_input, "run_pytest": run_pytest}
    out = io.StringIO()
    result = {"stdout": "", "error": None, "tests": []}
    with contextlib.redirect_stdout(out), contextlib.redirect_stderr(out):
        try:
            if setup:
                await _exec("<vorbereitung>", setup, namespace)
        except BaseException as exc:  # noqa: BLE001 - reported to the learner
            result["error"] = "Die Vorbereitung der Übung ist fehlgeschlagen:\n" + _format(exc, ("<vorbereitung>",))
        if result["error"] is None:
            try:
                await _exec("<dein-code>", code, namespace)
            except BaseException as exc:  # noqa: BLE001
                result["error"] = _format(exc)
        if result["error"] is None:
            for test in tests:
                try:
                    await _exec("<test>", test["code"], namespace)
                    result["tests"].append({"name": test["name"], "ok": True, "message": ""})
                except AssertionError as exc:
                    message = str(exc) or "Erwartung nicht erfüllt."
                    result["tests"].append({"name": test["name"], "ok": False, "message": message})
                except BaseException as exc:  # noqa: BLE001
                    result["tests"].append({"name": test["name"], "ok": False, "message": f"{type(exc).__name__}: {exc}"})
    result["stdout"] = out.getvalue()
    return result


async def run_snippet(code):
    """Lesson snippets: run as a script and return {stdout, error}."""
    _fresh_directory()
    namespace = {"__name__": "__main__", "input": _no_input}
    out = io.StringIO()
    error = None
    with contextlib.redirect_stdout(out), contextlib.redirect_stderr(out):
        try:
            await _exec("<code>", code, namespace)
        except BaseException as exc:  # noqa: BLE001
            error = _format(exc)
    return {"stdout": out.getvalue(), "error": error}


def run_pytest_snippet(code):
    """Lesson blocks marked `pytest`: the block is a test file. Returns {stdout: pytest's report, error, exit_code}."""
    _fresh_directory()
    run = _run_pytest(code, name="test_beispiel.py", style=("-v", "--tb=short"))
    # 0: all passed, 1: some failed. Anything else (collection error, no tests) is a problem with the block itself.
    return {"stdout": run.output, "error": None if run.exit_code in (0, 1) else f"pytest endete mit Exit-Code {run.exit_code}.", "exit_code": run.exit_code}


SQL_LIMIT = 1000


def _sql_cell(value):
    """A value as the sqlite3 command-line shell prints it in list mode (NULL is empty, reals keep a decimal point)."""
    if value is None:
        return ""
    if isinstance(value, float):
        text = "%.15g" % value
        return text if any(c in text for c in ".eni") else text + ".0"
    if isinstance(value, bytes):
        return value.hex()
    return str(value)


def _sql_statements(script):
    """Splits a script into complete statements; semicolons inside strings and comments do not count."""
    import sqlite3

    statements, current = [], ""
    for char in script:
        current += char
        if char == ";" and sqlite3.complete_statement(current):
            statements.append(current)
            current = ""
    if current.strip():
        statements.append(current)
    return [s for s in statements if _sql_has_code(s)]


def _sql_has_code(statement):
    """False for statements made only of whitespace, `;` and comments."""
    text = statement
    while True:
        text = text.strip().lstrip(";").strip()
        if text.startswith("--"):
            text = text.partition("\n")[2]
        elif text.startswith("/*"):
            text = text.partition("*/")[2]
        else:
            return bool(text)


def _sql_result(cursor):
    rows = cursor.fetchmany(SQL_LIMIT + 1)
    return {
        "columns": [d[0] for d in cursor.description],
        "rows": [[v.hex() if isinstance(v, bytes) else v for v in row] for row in rows[:SQL_LIMIT]],
        "cells": [[_sql_cell(v) for v in row] for row in rows[:SQL_LIMIT]],
        "truncated": len(rows) > SQL_LIMIT,
    }


def _sql_error(exc):
    return f"{type(exc).__name__}: {exc}"


def run_sql(schema, query):
    """One query against a fresh in-memory database built from `schema`: {columns, rows, cells, truncated, error}."""
    import sqlite3

    empty = {"columns": [], "rows": [], "cells": [], "truncated": False}
    con = sqlite3.connect(":memory:")
    try:
        try:
            con.executescript(schema)
        except sqlite3.Error as exc:
            return {**empty, "error": "Die Tabellen der Übung ließen sich nicht anlegen: " + _sql_error(exc)}
        statements = _sql_statements(query)
        if not statements:
            return {**empty, "error": "Die Abfrage ist leer."}
        if len(statements) > 1:
            return {**empty, "error": f"Das sind {len(statements)} Anweisungen. Gesucht ist genau eine Abfrage (SELECT, gern mit WITH davor)."}
        try:
            cursor = con.execute(statements[0])
        except sqlite3.Error as exc:
            return {**empty, "error": _sql_error(exc)}
        if cursor.description is None:
            return {**empty, "error": "Die Anweisung liefert keine Zeilen. Gesucht ist eine Abfrage mit SELECT."}
        return {**_sql_result(cursor), "error": None}
    finally:
        con.close()


def run_sql_exercise(schema, query, solution):
    """The learner's query and the model solution, each against its own fresh database."""
    return {"actual": run_sql(schema, query), "expected": run_sql(schema, solution)}


def run_sql_script(script):
    """Lesson blocks and `output` exercises: runs every statement in order and returns each result set.

    `text` is what the sqlite3 shell prints in its default list mode: values separated by |, no header.
    """
    import sqlite3

    con = sqlite3.connect(":memory:")
    results, error = [], None
    try:
        for statement in _sql_statements(script):
            try:
                cursor = con.execute(statement)
            except sqlite3.Error as exc:
                error = _sql_error(exc)
                break
            if cursor.description is not None:
                results.append(_sql_result(cursor))
    finally:
        con.close()
    text = "".join("|".join(row) + "\n" for result in results for row in result["cells"])
    return {"results": results, "text": text, "error": error}


def warm_imports(code):
    """Imports the top-level modules `code` imports, so their (slow) first import does not count against the time limit."""
    import importlib

    try:
        tree = ast.parse(code)
    except SyntaxError:
        return
    names = set()
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            names.update(alias.name.split(".")[0] for alias in node.names)
        elif isinstance(node, ast.ImportFrom) and node.module and not node.level:
            names.add(node.module.split(".")[0])
    for name in sorted(names):
        try:
            importlib.import_module(name)
        except Exception:  # noqa: BLE001 - the learner's run reports it
            pass


if __name__ == "__main__":
    # CLI for `pnpm verify`: reads a JSON job from stdin, prints a JSON result.
    import json

    job = json.load(sys.stdin)
    if job["kind"] == "exercise":
        print(json.dumps(asyncio.run(run_exercise(job.get("setup", ""), job["code"], job["tests"]))))
    elif job["kind"] == "compile":
        try:
            compile(job["code"], "<code>", "exec")
            print(json.dumps({"error": None}))
        except SyntaxError as exc:
            print(json.dumps({"error": _format(exc)}))
    elif job["kind"] == "pytest":
        print(json.dumps(run_pytest_snippet(job["code"])))
    else:
        print(json.dumps(asyncio.run(run_snippet(job["code"]))))
