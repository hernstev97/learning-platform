import type { AuthConfig } from 'convex/server';

const issuer = process.env.CLERK_JWT_ISSUER_DOMAIN;
// With no issuer there are no accepted identity providers. Never fall back to an unverified token.
export default { providers: issuer ? [{ domain: issuer, applicationID: 'convex' }] : [] } satisfies AuthConfig;
