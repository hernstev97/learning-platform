# Runs learner code. Used identically by the browser (Pyodide worker) and by `pnpm verify` (CPython).
import ast
import asyncio
import contextlib
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


def _fresh_directory():
    os.chdir(tempfile.mkdtemp(prefix="uebung-"))


async def run_exercise(setup, code, tests):
    """Returns {stdout, error, tests: [{name, ok, message}]}."""
    _fresh_directory()
    namespace = {"__name__": "loesung", "capture": capture, "input": _no_input}
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
    else:
        print(json.dumps(asyncio.run(run_snippet(job["code"]))))
