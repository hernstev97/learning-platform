import { backupProgress, catalog, importProgress, isCloud, loadArea, onProgressChange, progressOf, resetProgress, summaryOf } from '../app.ts';
import { areaStats, convertLegacyBear, parseBackup } from '../engine/storage.ts';
import { markLegacyImported, scanLegacy } from '../engine/legacy.ts';
import { $, html } from '../ui/dom.ts';
import type { Page } from '../router.ts';

const data: Page = async (main) => {
  document.title = 'Daten · learn.kiumu.app';
  const legacy = isCloud ? await scanLegacy(catalog) : null;
  if (location.pathname !== '/daten') return;
  let active = true;
  const render = () => {
    if (!active) return;
    main.innerHTML = html`<div class="page narrow data-page">
      <h1 class="page-title" tabindex="-1">Deine Daten</h1>
      <p class="page-intro">${isCloud ? 'Dein persönlicher Lernstand wird in Convex gespeichert und nach der Anmeldung auf deinen Geräten synchronisiert. Lerninhalte bleiben Teil der Website. JSON-Sicherungen kannst du weiterhin herunterladen.' : 'Lokaler Testbetrieb: Lernstand nur in diesem Browser.'}</p>
      ${legacy?.warning ? html`<p class="feedback info">${legacy.warning}</p>` : ''}
      ${legacy && Object.keys(legacy.areas).length ? html`<section class="data-section"><h2 class="section-title">Bisheriger Browser-Lernstand</h2><p>${Object.keys(legacy.areas).length} Bereiche gefunden. ${legacy.imported ? 'Dieser Stand wurde bereits importiert.' : 'Der Serverstand ist geladen.'} Der Import ergänzt ausschließlich fehlende Einträge. Serverwerte einschließlich bewusst aufgehobener Häkchen bleiben erhalten; die lokalen Originale werden nicht gelöscht.</p><button class="btn" id="import-local" ${legacy.imported ? 'disabled' : ''}>Lokalen Lernstand importieren</button></section>` : ''}
      <div class="data-table-scroll" role="region" tabindex="0" aria-label="Lernstand je Bereich"><table class="data-table"><thead><tr><th>Bereich</th><th>Gelöst</th><th>Karten gesehen</th><th></th></tr></thead><tbody>
        ${catalog.areas.map((area) => {
          const stats = areaStats(area, progressOf(area.id));
          return html`<tr data-progress-area="${area.id}"><td>${area.title}</td><td>${stats.done} / ${stats.total}</td><td>${Object.keys(progressOf(area.id).cards).length}</td><td><button type="button" class="btn small" data-reset="${area.id}">Zurücksetzen</button></td></tr>`;
        })}
      </tbody></table></div>
      <section class="data-section"><h2 class="section-title">Sichern</h2><p>Lädt eine JSON-Datei mit dem Lernstand aller Bereiche herunter.</p><button type="button" class="btn primary" id="export">Sicherung herunterladen</button></section>
      <section class="data-section"><h2 class="section-title">Wiederherstellen</h2><p>Eine Sicherung ergänzt fehlende Einträge. Vorhandene Serverwerte haben Vorrang, auch bewusst zurückgenommene Häkchen. Nach einem vollständigen Bereichsreset kannst du ihn hier absichtlich wiederherstellen.</p><label class="btn" for="import-file">Sicherung auswählen</label><input type="file" id="import-file" accept="application/json,.json" class="sr-only"></section>
      <section class="data-section"><h2 class="section-title">Von kotlin.kiumu.app übernehmen</h2>
        <p>Der Bear-Kurs lief früher auf kotlin.kiumu.app. Browser trennen Speicher pro Domain, deshalb musst du den alten Stand einmal kopieren: Öffne kotlin.kiumu.app, dann die Entwicklerkonsole (F12) und führe <code>copy(localStorage.getItem('kotlin-lernen:bear:progress:v2'))</code> aus. Füge das Ergebnis hier ein.</p>
        <textarea id="legacy" rows="4" placeholder='{"version":2,…}'></textarea>
        <p><button type="button" class="btn" id="import-legacy">Bear-Stand übernehmen</button></p>
      </section>
      <p id="data-message" class="feedback info" role="status" aria-live="polite"></p>
    </div>`.value;
    const message = (text: string, kind = 'ok') => { const el = main.querySelector('#data-message'); if (!active || !el) return; el.className = `feedback ${kind}`; el.textContent = text; };
    main.querySelector<HTMLButtonElement>('#import-local')?.addEventListener('click', async (event) => {
      if (!legacy) return;
      const button = event.currentTarget as HTMLButtonElement;
      button.disabled = true;
      try {
        await importProgress(legacy.areas, 'legacy');
        markLegacyImported(legacy); legacy.imported = true;
        const notice = document.querySelector<HTMLElement>('#legacy-notice'); if (notice) notice.hidden = true;
        render(); message('Lokaler Lernstand übernommen. Die lokalen Originale bleiben erhalten.');
      } catch { button.disabled = false; message('Import nicht vollständig abgeschlossen. Originale bleiben erhalten; Wiederholen ist sicher. Nach einem Bereichsreset bitte eine JSON-Sicherung gezielt wiederherstellen.', 'bad'); }
    });
    $('#export', main).addEventListener('click', async () => {
      try {
      const backup = await backupProgress();
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `learn-kiumu-${new Date().toISOString().slice(0, 10)}.json`;
      link.dataset.native = '';
      link.click();
      setTimeout(() => URL.revokeObjectURL(link.href), 1000);
      message('Sicherung heruntergeladen.');
      } catch { message('Sicherung konnte nicht geladen werden. Bitte prüfe die Verbindung und versuche es erneut.', 'bad'); }
    });
    $<HTMLInputElement>('#import-file', main).addEventListener('change', async (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        if (file.size > 80_000_000) throw new Error('Diese Sicherung ist zu groß (maximal 80 MB).');
        const areas = parseBackup(await file.text());
        await importProgress(areas);
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
        await importProgress({ kotlin: converted });
        render();
        message(`${Object.keys(converted.done).length} gelöste Bear-Aufgaben übernommen.`);
      } catch (error) { message((error as Error).message, 'bad'); }
    });
    main.querySelectorAll<HTMLButtonElement>('[data-reset]').forEach((button) => button.addEventListener('click', async () => {
      const area = summaryOf(button.dataset.reset!)!;
      if (!confirm(`Lernstand für „${area.title}“ wirklich löschen? Das lässt sich nur mit einer Sicherung rückgängig machen.`)) return;
      try {
      button.disabled = true;
      await resetProgress(area.id);
      render();
      message(`Lernstand für ${area.title} zurückgesetzt.`);
      } catch { button.disabled = false; message('Zurücksetzen fehlgeschlagen. Bitte Verbindung prüfen und erneut versuchen.', 'bad'); }
    }));
  };
  render();
  const unsubscribe = onProgressChange(() => {
    for (const area of catalog.areas) {
      const row = main.querySelector(`[data-progress-area="${area.id}"]`);
      const stats = areaStats(area, progressOf(area.id));
      if (row) { row.children[1].textContent = `${stats.done} / ${stats.total}`; row.children[2].textContent = String(Object.keys(progressOf(area.id).cards).length); }
    }
  });
  return () => { active = false; unsubscribe(); };
};
export default data;
