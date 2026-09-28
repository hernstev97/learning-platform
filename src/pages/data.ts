import { backupProgress, catalog, loadArea, progressOf, replaceProgress, summaryOf } from '../app.ts';
import { areaStats, convertLegacyBear, freshProgress, mergeProgress, parseBackup } from '../engine/storage.ts';
import { $, html } from '../ui/dom.ts';
import type { Page } from '../router.ts';

const data: Page = (main) => {
  document.title = 'Daten · learn.kiumu.app';
  const render = () => {
    main.innerHTML = html`<div class="page narrow data-page">
      <h1 class="page-title" tabindex="-1">Deine Daten</h1>
      <p class="page-intro">Es gibt kein Konto. Dein Lernstand – gelöste Übungen, Entwürfe, Karteikarten, Projektschritte – liegt nur im <code>localStorage</code> dieses Browsers auf dieser Domain. Wenn du Websitedaten löschst oder das Gerät wechselst, ist er weg. Sichere ihn deshalb ab und zu als Datei.</p>
      <div class="data-table-scroll" role="region" tabindex="0" aria-label="Lernstand je Bereich"><table class="data-table"><thead><tr><th>Bereich</th><th>Gelöst</th><th>Karten gesehen</th><th></th></tr></thead><tbody>
        ${catalog.areas.map((area) => {
          const stats = areaStats(area, progressOf(area.id));
          return html`<tr><td>${area.title}</td><td>${stats.done} / ${stats.total}</td><td>${Object.keys(progressOf(area.id).cards).length}</td><td><button type="button" class="btn small" data-reset="${area.id}">Zurücksetzen</button></td></tr>`;
        })}
      </tbody></table></div>
      <section class="data-section"><h2 class="section-title">Sichern</h2><p>Lädt eine JSON-Datei mit dem Lernstand aller Bereiche herunter.</p><button type="button" class="btn primary" id="export">Sicherung herunterladen</button></section>
      <section class="data-section"><h2 class="section-title">Wiederherstellen</h2><p>Eine Sicherung wird mit dem vorhandenen Stand <strong>zusammengeführt</strong>: nichts Gelöstes geht verloren, neuere Kartenstände gewinnen.</p><label class="btn" for="import-file">Sicherung auswählen</label><input type="file" id="import-file" accept="application/json,.json" class="sr-only"></section>
      <section class="data-section"><h2 class="section-title">Von kotlin.kiumu.app übernehmen</h2>
        <p>Der Bear-Kurs lief früher auf kotlin.kiumu.app. Browser trennen Speicher pro Domain, deshalb musst du den alten Stand einmal kopieren: Öffne kotlin.kiumu.app, dann die Entwicklerkonsole (F12) und führe <code>copy(localStorage.getItem('kotlin-lernen:bear:progress:v2'))</code> aus. Füge das Ergebnis hier ein.</p>
        <textarea id="legacy" rows="4" placeholder='{"version":2,…}'></textarea>
        <p><button type="button" class="btn" id="import-legacy">Bear-Stand übernehmen</button></p>
      </section>
      <p id="data-message" class="feedback info" role="status" aria-live="polite"></p>
    </div>`.value;
    const message = (text: string, kind = 'ok') => { const el = $('#data-message', main); el.className = `feedback ${kind}`; el.textContent = text; };
    $('#export', main).addEventListener('click', () => {
      const backup = backupProgress();
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `learn-kiumu-${new Date().toISOString().slice(0, 10)}.json`;
      link.dataset.native = '';
      link.click();
      setTimeout(() => URL.revokeObjectURL(link.href), 1000);
      message('Sicherung heruntergeladen.');
    });
    $<HTMLInputElement>('#import-file', main).addEventListener('change', async (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const areas = parseBackup(await file.text());
        for (const [id, value] of Object.entries(areas)) replaceProgress(id, mergeProgress(progressOf(id), value));
        render();
        message(`Sicherung mit ${Object.keys(areas).length} Bereichen übernommen.`);
      } catch (error) { message((error as Error).message, 'bad'); }
    });
    $('#import-legacy', main).addEventListener('click', async () => {
      try {
        const kotlin = summaryOf('kotlin');
        if (!kotlin) throw new Error('Kein Kotlin-Bereich vorhanden.');
        await loadArea('kotlin');
        const converted = convertLegacyBear($<HTMLTextAreaElement>('#legacy', main).value, kotlin.modules);
        replaceProgress('kotlin', mergeProgress(progressOf('kotlin'), converted));
        render();
        message(`${Object.keys(converted.done).length} gelöste Bear-Aufgaben übernommen.`);
      } catch (error) { message((error as Error).message, 'bad'); }
    });
    main.querySelectorAll<HTMLButtonElement>('[data-reset]').forEach((button) => button.addEventListener('click', () => {
      const area = summaryOf(button.dataset.reset!)!;
      if (!confirm(`Lernstand für „${area.title}“ wirklich löschen? Das lässt sich nur mit einer Sicherung rückgängig machen.`)) return;
      replaceProgress(area.id, freshProgress());
      render();
      message(`Lernstand für ${area.title} zurückgesetzt.`);
    }));
  };
  render();
};
export default data;
