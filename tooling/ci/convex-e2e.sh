#!/usr/bin/env bash
# Runs the Convex Playwright suite (pnpm test:convex:e2e) against a throwaway local deployment, for CI.
# Same steps as docs/CONVEX.md: the deployment lives in a copy of the repo without the tests (convex dev writes into
# it), the tests run in the real checkout. Needs a committed HEAD (git archive) and node_modules.
set -euo pipefail

root=$(git rev-parse --show-toplevel)
work=${RUNNER_TEMP:-$(mktemp -d)}/convex-backend
mkdir -p "$work"
git -C "$root" archive HEAD convex src tsconfig.json package.json pnpm-lock.yaml pnpm-workspace.yaml patches | tar -x -C "$work"
cd "$work"
pnpm install --frozen-lockfile

log=$work/convex-dev.log
CONVEX_AGENT_MODE=anonymous pnpm exec convex dev --local-cloud-port 13210 --local-site-port 13211 > "$log" 2>&1 &
dev=$!
cleanup() {
  kill "$dev" 2>/dev/null || true
  # The deployment runs as a child that outlives convex dev; match it by the copy's storage path.
  pkill -f "$work/.convex" 2>/dev/null || true
}
trap cleanup EXIT
fail() { echo "$1" >&2; echo "--- convex dev log ---" >&2; cat "$log" >&2; exit 1; }

# convex dev first stops at the missing issuer; set both variables as soon as the deployment answers.
for _ in $(seq 1 60); do
  curl -fs http://127.0.0.1:13210/version > /dev/null 2>&1 && break
  kill -0 "$dev" 2>/dev/null || fail "convex dev ended early"
  sleep 2
done
curl -fs http://127.0.0.1:13210/version > /dev/null 2>&1 || fail "local Convex did not start"
pnpm exec convex env set CLERK_JWT_ISSUER_DOMAIN https://learning.clerk.accounts.dev
pnpm exec convex env set ALLOWED_CLERK_USER_ID user_owner
for _ in $(seq 1 60); do
  grep -q "Convex functions ready" "$log" && break
  kill -0 "$dev" 2>/dev/null || fail "convex dev ended early"
  sleep 2
done
grep -q "Convex functions ready" "$log" || fail "Convex functions were not deployed"

cd "$root"
CONVEX_TEST_CONFIG="$work/.convex/local/default/config.json" pnpm test:convex:e2e
