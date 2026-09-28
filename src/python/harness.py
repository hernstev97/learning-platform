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
