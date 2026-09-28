import './styles/base.css';
import './styles/layout.css';
import './styles/content.css';
import './styles/exercise.css';
import './styles/pages.css';
import { html } from './ui/dom.ts';

const root = document.querySelector<HTMLElement>('#app')!;
const gate = (title: string, text: string) => {
  document.title = `${title} · learn.kiumu.app`;
  root.innerHTML = html`<main class="page narrow data-page"><p class="label">learn.kiumu · Private Lernplattform</p><h1 class="page-title">${title}</h1><p class="page-intro">${text}</p><div id="session-actions"></div></main>`.value;
};
gate('Anmeldung', 'Dein persönlicher Lernstand wird geladen …');

async function start(): Promise<void> {
  const url = import.meta.env.VITE_CONVEX_URL;
  const key = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
  if (!url || !/^https?:\/\//.test(url) || !key || !/^pk_(test|live)_/.test(key)) {
    gate('Einrichtung fehlt', 'Convex und Anmeldung sind noch nicht konfiguriert. Die benötigten Einstellungen stehen in docs/CONVEX.md. Vorhandener lokaler Lernstand bleibt erhalten.');
    return;
  }
  const [{ Clerk }, { ConvexClient }, state] = await Promise.all([import('@clerk/clerk-js/no-rhc'), import('convex/browser'), import('./app.ts')]);
  const clerk = new Clerk(key);
  await clerk.load();
  const button = (text: string, action: () => Promise<unknown>) => {
    const b = document.createElement('button'); b.className = 'btn primary'; b.textContent = text;
    b.addEventListener('click', () => { b.disabled = true; void action().catch(() => { b.disabled = false; gate('Anmeldung nicht verfügbar', 'Bitte prüfe deine Verbindung und lade die Seite erneut.'); }); });
    document.querySelector('#session-actions')!.append(b);
  };
  if (!clerk.session) {
    gate('Anmelden', 'Melde dich mit deinem freigeschalteten Konto an, um deinen Lernstand auf allen Geräten zu nutzen.');
    button('Anmelden', () => clerk.redirectToSignIn({ signInForceRedirectUrl: location.href }));
    return;
  }
  const sessionId = clerk.session.id;
  const client = new ConvexClient(url, { unsavedChangesWarning: true });
  let disconnect = () => {};
  let stopped = false;
  const lock = () => {
    if (stopped) return;
    stopped = true; disconnect(); void client.close();
    // Remove private DOM immediately, even if a browser delays or cancels navigation.
    gate('Sitzung beendet', 'Die Anmeldung wird erneut geprüft …');
    // Reload also disposes page listeners, open editors and cached private state.
    location.reload();
  };
  clerk.addListener(({ session }) => { if (session?.id !== sessionId) lock(); });
  client.setAuth(async ({ forceRefreshToken }) => clerk.session?.getToken({ template: 'convex', skipCache: forceRefreshToken }) ?? null);
  const slowConnection = setTimeout(() => gate('Verbindung wird hergestellt', 'Der Server antwortet noch nicht. Prüfe deine Verbindung. Die Seite lädt weiter; du kannst sie auch erneut laden.'), 12_000);
  try {
    disconnect = await state.connectProgress(client, lock);
    if (stopped) { disconnect(); return; }
  } catch {
    await client.close();
    gate('Kein Zugriff', 'Dieses Konto ist nicht freigeschaltet oder die Backend-Anmeldung ist noch nicht eingerichtet. Prüfe die Konto-ID und den Clerk-Aussteller in Convex.');
    button('Abmelden', () => clerk.signOut({ redirectUrl: location.origin }));
    return;
  } finally { clearTimeout(slowConnection); }
  const { mount } = await import('./shell.ts');
  mount(async () => {
    if (state.hasPendingWrites()) {
      alert('Änderungen werden noch gespeichert. Bitte warte vor dem Abmelden auf „Lernstand synchronisiert“.');
      return;
    }
    await clerk.signOut({ redirectUrl: location.origin });
  });
}
void start().catch(() => gate('Verbindung fehlgeschlagen', 'Anmeldung oder Backend sind gerade nicht erreichbar. Prüfe deine Verbindung und lade die Seite erneut.'));
