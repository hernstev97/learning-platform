import { loadArea, progressOf, save, summaryOf } from '../app.ts';
import { areaBanner } from '../ui/area-nav.ts';
import { $$, LEVELS, html, icons, raw } from '../ui/dom.ts';
import type { Page } from '../router.ts';

const projects: Page<{ name: 'projects'; area: string } | { name: 'project'; area: string; project: string }> = async (main, route) => {
  const summary = summaryOf(route.area)!;
  const area = await loadArea(route.area);
  const progress = progressOf(summary.id);
  const sorted = [...area.projects].sort((a, b) => Number(a.capstone) - Number(b.capstone) || a.level - b.level);
  const stepsDone = (id: string) => Object.values(progress.projects[id] ?? {}).filter(Boolean).length;

  if (route.name === 'projects') {
    document.title = `Projekte · ${summary.title}`;
    main.innerHTML = html`
      ${areaBanner(summary, progress, 'projekte', 'Projekte')}
      <div class="page">
        <p class="page-intro">Projekte verbinden die Module zu etwas, das du zeigen kannst. Die kleinen Projekte festigen einzelne Themen, das Abschlussprojekt ist so geschnitten wie eine Take-Home-Aufgabe im Bewerbungsprozess. Schritte und Abnahmekriterien hakst du hier ab; der Code gehört in dein eigenes Repository.</p>
        <div class="project-grid">
          ${sorted.map((p) => {
            const total = p.steps.length + p.acceptance.length;
            const done = stepsDone(p.id);
            return html`<a class="project-card${p.capstone ? ' capstone' : ''}" href="/${summary.id}/projekte/${p.id}">
              <span class="label">${p.capstone ? 'Abschlussprojekt · ' : ''}${LEVELS[p.level]} · ca. ${p.hours} h</span>
              <span class="project-title">${p.title}</span>
              <span class="project-summary">${raw(p.summary)}</span>
              <span class="project-skills">${p.skills.slice(0, 6).map((s) => html`<span class="tag">${s}</span>`)}</span>
              <span class="area-progress"><span style="width:${total ? Math.round(done / total * 100) : 0}%"></span></span>
              <span class="label">${done} / ${total} abgehakt</span>
            </a>`;
          })}
        </div>
      </div>`.value;
    return;
  }

  const project = area.projects.find((p) => p.id === route.project);
  if (!project) return (await import('./not-found.ts')).default(main, { name: 'not-found' });
  document.title = `${project.title} · Projekte · ${summary.title}`;
  const state = (progress.projects[project.id] ??= {});
  const checkbox = (key: string, label: string, detail = '') => html`<li class="project-step"><label class="check-item"><input type="checkbox" data-key="${key}" ${state[key] ? 'checked' : ''}><span class="step-title">${raw(label)}</span></label>${detail ? html`<div class="prose compact step-detail">${raw(detail)}</div>` : ''}</li>`;
  main.innerHTML = html`
    ${areaBanner(summary, progress, 'projekte', project.title)}
    <div class="page project-page">
      <p class="project-kicker"><span class="tag ${project.capstone ? 'accent' : ''}">${project.capstone ? 'Abschlussprojekt' : 'Projekt'}</span><span class="tag">${LEVELS[project.level]}</span><span class="tag">ca. ${project.hours} h</span>${project.skills.map((s) => html`<span class="tag">${s}</span>`)}</p>
      <p class="project-lead">${raw(project.summary)}</p>
      <div class="project-layout">
        <div>
          <section class="prose">${raw(project.brief)}</section>
          <section class="project-section"><h2 class="section-title">Meilensteine</h2><ol class="project-steps">${project.steps.map((s) => checkbox(s.id, s.title, s.detail))}</ol></section>
          ${project.acceptance.length ? html`<section class="project-section"><h2 class="section-title">Abnahmekriterien</h2><p class="muted">Erst wenn alle Punkte erfüllt sind, ist das Projekt fertig – so wie bei einer echten Abnahme.</p><ol class="project-steps">${project.acceptance.map((a, i) => checkbox(`abnahme-${i + 1}`, a))}</ol></section>` : ''}
          ${project.stretch.length ? html`<section class="project-section"><h2 class="section-title">Für Ehrgeizige</h2><ul class="plain-list">${project.stretch.map((s) => html`<li>${raw(s)}</li>`)}</ul></section>` : ''}
          ${project.portfolio ? html`<section class="project-section portfolio"><h2 class="section-title">Fürs Portfolio</h2><div class="prose">${raw(project.portfolio)}</div></section>` : ''}
        </div>
        <aside class="project-aside"><div class="project-meter"><span class="big-number" id="project-count"></span><span class="label">abgehakt</span></div><a class="btn" href="/${summary.id}/projekte">${raw(icons.back)} Alle Projekte</a></aside>
      </div>
    </div>`.value;
  const total = project.steps.length + project.acceptance.length;
  const count = () => { main.querySelector('#project-count')!.textContent = `${Object.values(state).filter(Boolean).length}/${total}`; };
  $$<HTMLInputElement>('[data-key]', main).forEach((box) => box.addEventListener('change', () => {
    if (box.checked) state[box.dataset.key!] = true; else delete state[box.dataset.key!];
    save(summary.id);
    count();
  }));
  count();
};
export default projects;
