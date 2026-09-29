import './styles/base.css';
import './styles/layout.css';
import './styles/content.css';
import './styles/exercise.css';
import './styles/pages.css';
import { browserStorage, clearOfflineCopy, hasOfflineCopy, waitForToken } from './engine/offline.ts';
import { html } from './ui/dom.ts';

// Caches the public app shell and learning content for offline use; personal progress never passes through it.
if (import.meta.env.PROD && 'serviceWorker' in navigator) window.addEventListener('load', () => { void navigator.serviceWorker.register('/sw.js').catch(() => {}); });

const root = document.querySelector<HTMLElement>('#app')!;
const gate = (title: string, text: string) => {
  document.title = `${title} · learn.kiumu.app`;
  root.innerHTML = html`<main class="page narrow data-page"><p class="label">learn.kiumu · Private Lernplattform</p><h1 class="page-title">${title}</h1><p class="page-intro">${text}</p><div id="session-actions" class="session-actions"></div></main>`.value;
};
const button = (text: string, action: () => Promise<unknown>, primary = true) => {
  const b = document.createElement('button'); b.className = primary ? 'btn primary' : 'btn'; b.textContent = text;
  b.addEventListener('click', () => { b.disabled = true; void action().catch(() => { b.disabled = false; gate('Anmeldung nicht verfügbar', 'Bitte prüfe deine Verbindung und lade die Seite erneut.'); }); });
  document.querySelector('#session-actions')?.append(b);
};
gate('Anmeldung', 'Dein persönlicher Lernstand wird geladen …');

// Offline reading: public content plus the last synchronized progress of a browser that was signed in before.
let reading = false;
let abandonConnection = () => {};
async function readOffline(): Promise<boolean> {
  const state = await import('./app.ts');
  if (reading || !state.startOffline()) return reading;
  reading = true;
  abandonConnection();
  (await import('./shell.ts')).mount();
  return true;
}
const offerOffline = (primary = false) => {
  if (hasOfflineCopy(browserStorage())) button('Offline weiterlesen', async () => { if (!await readOffline()) gate('Offline nicht verfügbar', 'In diesem Browser ist kein gespeicherter Lernstand vorhanden. Lade die Seite mit Verbindung neu.'); }, primary);
};
/** Waits for the connection instead of giving Convex a missing token: backoff up to 30 s, or earlier once online. */
const retry = (attempt: number) => new Promise<void>((resolve) => {
  const done = () => { clearTimeout(timer); window.removeEventListener('online', done); resolve(); };
  const timer = setTimeout(done, Math.min(1000 * 2 ** attempt, 30_000));
  window.addEventListener('online', done);
});

async function start(): Promise<void> {
  const url = import.meta.env.VITE_CONVEX_URL;
  const key = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
  if (!url || !/^https?:\/\//.test(url) || !key || !/^pk_(test|live)_/.test(key)) {
    gate('Einrichtung fehlt', 'Convex und Anmeldung sind noch nicht konfiguriert. Die benötigten Einstellungen stehen in docs/CONVEX.md. Vorhandener lokaler Lernstand bleibt erhalten.');
    return;
  }
  // Without a network the sign-in cannot be checked; reading needs neither Clerk nor Convex.
  if (!navigator.onLine) {
    if (await readOffline()) return;
    gate('Keine Verbindung', 'Die Anmeldung braucht eine Internetverbindung. Offline lesen kannst du, nachdem du dich in diesem Browser einmal angemeldet hast. Die Seite lädt neu, sobald die Verbindung zurück ist.');
    window.addEventListener('online', () => location.reload(), { once: true });
    return;
  }
  const slowConnection = setTimeout(() => {
    if (reading) return;
    gate('Verbindung wird hergestellt', 'Der Server antwortet noch nicht. Prüfe deine Verbindung. Die Seite lädt weiter; du kannst sie auch erneut laden.');
    offerOffline(true);
  }, 12_000);
  try { await connect(url, key); } finally { clearTimeout(slowConnection); }
}

async function connect(url: string, key: string): Promise<void> {
  const [{ Clerk }, { ConvexClient }, state] = await Promise.all([import('@clerk/clerk-js/no-rhc'), import('convex/browser'), import('./app.ts')]);
  const clerk = new Clerk(key);
  await clerk.load();
  if (reading) return;
  if (!clerk.session) {
    // Only a confirmed missing session forgets the offline copy. An unreachable Clerk still reports "ready",
    // but with a placeholder client that has no ID.
    const unsure = !navigator.onLine || clerk.status !== 'ready' || !clerk.client?.id;
    if (!unsure) clearOfflineCopy(browserStorage());
    gate('Anmelden', 'Melde dich mit deinem freigeschalteten Konto an, um deinen Lernstand auf allen Geräten zu nutzen.');
    button('Anmelden', () => clerk.redirectToSignIn({ signInForceRedirectUrl: location.href }));
    if (unsure) offerOffline();
    return;
  }
  const sessionId = clerk.session.id;
  const client = new ConvexClient(url, { unsavedChangesWarning: true });
  abandonConnection = () => { void client.close(); };
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
  client.setAuth(({ forceRefreshToken }) => waitForToken(() => clerk.session?.getToken({ template: 'convex', skipCache: forceRefreshToken }) ?? null, retry));
  try {
    disconnect = await state.connectProgress(client, lock);
  } catch {
    await client.close();
    if (reading) return;
    clearOfflineCopy(browserStorage());
    gate('Kein Zugriff', 'Dieses Konto ist nicht freigeschaltet oder die Backend-Anmeldung ist noch nicht eingerichtet. Prüfe die Konto-ID und den Clerk-Aussteller in Convex.');
    button('Abmelden', () => clerk.signOut({ redirectUrl: location.origin }));
    return;
  }
  const { mount } = await import('./shell.ts');
  if (stopped) { disconnect(); return; }
  // Reading mode was chosen meanwhile; its progress copy stays in place and the client is already closed.
  if (reading) return;
  mount(async () => {
    if (state.hasPendingWrites()) {
      alert('Änderungen werden noch gespeichert. Bitte warte vor dem Abmelden auf „Lernstand synchronisiert“.');
      return;
    }
    clearOfflineCopy(browserStorage());
    await clerk.signOut({ redirectUrl: location.origin });
  });
}
void start().catch(() => {
  if (reading) return;
  gate('Verbindung fehlgeschlagen', 'Anmeldung oder Backend sind gerade nicht erreichbar. Prüfe deine Verbindung und lade die Seite erneut.');
  offerOffline(true);
});
