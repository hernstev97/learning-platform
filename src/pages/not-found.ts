import { html } from '../ui/dom.ts';
import type { Page } from '../router.ts';

const notFound: Page = (main) => {
  document.title = 'Nicht gefunden · learn.kiumu.app';
  main.innerHTML = html`<section class="page narrow"><p class="label">404</p><h1 class="page-title" tabindex="-1">Gibt es nicht.</h1><p>Diese Seite existiert nicht (mehr). Vielleicht wurde ein Modul umbenannt.</p><p><a class="btn primary" href="/">Zur Startseite</a></p></section>`.value;
};
export default notFound;
