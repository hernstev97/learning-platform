// Adds copy buttons, Rust Playground links and Python run buttons to rendered code blocks.
import { onRunnerState, runSnippet } from '../python/runner.ts';
import { $$, escape, icons } from './dom.ts';

export const playgroundUrl = (code: string) => `https://play.rust-lang.org/?version=stable&mode=debug&edition=2024&code=${encodeURIComponent(code)}`;

function codeOf(block: HTMLElement): string {
  const editor = block.querySelector<HTMLTextAreaElement>('textarea');
  return editor ? editor.value : block.querySelector('pre')?.textContent ?? '';
}

export function copyButton(getText: () => string): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = 'Kopieren';
  button.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(getText()); button.textContent = 'Kopiert'; }
    catch { button.textContent = 'Nicht möglich'; }
    setTimeout(() => { button.textContent = 'Kopieren'; }, 1500);
  });
  return button;
}

/** Tab inserts four spaces, Shift+Tab removes them, Ctrl/Cmd+Enter triggers `onSubmit`. */
export function editorKeys(editor: HTMLTextAreaElement, onSubmit?: () => void): void {
  editor.addEventListener('keydown', (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter' && onSubmit) { event.preventDefault(); onSubmit(); return; }
    if (event.key !== 'Tab' || event.altKey || event.ctrlKey || event.metaKey) return;
    // Escape leaves the editor with the keyboard: Escape, then Tab.
    if (editor.dataset.escaped === '1') { editor.dataset.escaped = ''; return; }
    event.preventDefault();
    const { selectionStart: start, selectionEnd: end, value } = editor;
    const lineStart = value.lastIndexOf('\n', start - 1) + 1;
    if (event.shiftKey) {
      const removable = value.slice(lineStart, lineStart + 4).match(/^ {1,4}/)?.[0].length ?? 0;
      editor.setRangeText('', lineStart, lineStart + removable, 'preserve');
      editor.selectionStart = editor.selectionEnd = Math.max(lineStart, start - removable);
    } else if (start !== end && value.slice(start, end).includes('\n')) {
      const block = value.slice(lineStart, end).replace(/^/gm, '    ');
      editor.setRangeText(block, lineStart, end, 'select');
    } else {
      editor.setRangeText('    ', start, end, 'end');
    }
    editor.dispatchEvent(new Event('input', { bubbles: true }));
  });
  editor.addEventListener('keyup', (event) => { if (event.key === 'Escape') editor.dataset.escaped = '1'; });
  editor.addEventListener('blur', () => { editor.dataset.escaped = ''; });
}

export function autosize(editor: HTMLTextAreaElement, min = 4): void {
  const fit = () => { editor.rows = Math.max(min, editor.value.split('\n').length + 1); };
  editor.addEventListener('input', fit);
  fit();
}

export function outputMarkup(stdout: string, error: string | null): string {
  const out = stdout ? `<span class="run-label">Ausgabe</span>${escape(stdout)}` : '';
  const err = error ? `<span class="run-label">Fehler</span>${escape(error)}` : '';
  return out + (out && err ? '\n' : '') + err || '<span class="run-label">Ausgabe</span>(keine Ausgabe)';
}

export function enhanceCode(root: ParentNode): () => void {
  const cleanups: (() => void)[] = [];
  for (const block of $$<HTMLElement>('.codeblock', root)) {
    if (block.dataset.enhanced) continue;
    block.dataset.enhanced = '1';
    const bar = block.querySelector('.codeblock-bar')!;
    if (block.dataset.playground === 'rust') {
      const link = document.createElement('a');
      link.href = playgroundUrl(codeOf(block));
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.innerHTML = `Playground ${icons.external}<span class="sr-only"> (neuer Tab)</span>`;
      link.addEventListener('pointerdown', () => { link.href = playgroundUrl(codeOf(block)); });
      bar.append(link);
    }
    if (block.dataset.run === 'python') {
      const editor = block.querySelector<HTMLTextAreaElement>('textarea')!;
      const original = editor.value;
      autosize(editor, 2);
      const output = document.createElement('div');
      output.className = 'run-output';
      output.hidden = true;
      output.setAttribute('role', 'status');
      block.append(output);
      const reset = document.createElement('button');
      reset.type = 'button';
      reset.textContent = 'Zurücksetzen';
      reset.addEventListener('click', () => { editor.value = original; editor.dispatchEvent(new Event('input')); output.hidden = true; });
      const run = document.createElement('button');
      run.type = 'button';
      run.innerHTML = `${icons.play} Ausführen`;
      const execute = async () => {
        run.disabled = true;
        output.hidden = false;
        output.className = 'run-output';
        output.textContent = 'Läuft …';
        try {
          const result = await runSnippet(editor.value);
          output.classList.toggle('error', !!result.error);
          output.innerHTML = outputMarkup(result.stdout, result.error);
        } catch (error) {
          output.classList.add('error');
          output.textContent = (error as Error).message;
        } finally { run.disabled = false; }
      };
      run.addEventListener('click', execute);
      editorKeys(editor, execute);
      cleanups.push(onRunnerState((state) => { if (state === 'loading' && !output.hidden) output.textContent = 'Python wird geladen (einmalig ca. 12 MB) …'; }));
      bar.append(reset, run);
    } else {
      bar.append(copyButton(() => codeOf(block)));
    }
  }
  return () => cleanups.forEach((fn) => fn());
}
