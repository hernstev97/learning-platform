import { ConvexError } from 'convex/values';
import type { QueryCtx } from './_generated/server';

/** Convex validates JWT signature, expiry, issuer and audience before this allowlist check. */
export async function requireOwner(ctx: Pick<QueryCtx, 'auth'>): Promise<void> {
  const identity = await ctx.auth.getUserIdentity();
  const issuer = process.env.CLERK_JWT_ISSUER_DOMAIN;
  const subject = process.env.ALLOWED_CLERK_USER_ID;
  if (!issuer || !/^https:\/\/[^/\s]+$/.test(issuer) || !subject || !/^user_[a-zA-Z0-9]+$/.test(subject)) throw new ConvexError('ACCESS_DENIED');
  if (!identity || identity.issuer !== issuer || identity.subject !== subject || identity.tokenIdentifier !== `${issuer}|${subject}`) throw new ConvexError('ACCESS_DENIED');
}
