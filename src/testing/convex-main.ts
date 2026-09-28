// Only served by Vite in the explicit test-convex mode. Never imported by the production entry.
import { ConvexClient } from 'convex/browser';
import { connectProgress } from '../app.ts';
import { mount } from '../shell.ts';

type Fixture = { url: string; adminKey: string; subject: string };
const fixture = (window as unknown as { __convexTest?: Fixture }).__convexTest;
if (!import.meta.env.DEV || !fixture || location.hostname !== '127.0.0.1' || !/^http:\/\/127\.0\.0\.1:\d+$/.test(fixture.url)) throw new Error('Local test fixture required');
const client = new ConvexClient(fixture.url);
// Convex exposes admin impersonation for local integration tests; this is not an authentication test.
(client as unknown as { setAdminAuth(key: string, identity: { issuer: string; subject: string; tokenIdentifier: string }): void }).setAdminAuth(fixture.adminKey, {
  issuer: 'https://learning.clerk.accounts.dev', subject: fixture.subject,
  tokenIdentifier: `https://learning.clerk.accounts.dev|${fixture.subject}`,
});
void connectProgress(client, () => location.reload()).then(() => mount()).catch(() => { document.querySelector('#app')!.textContent = 'Kein Zugriff'; });
