# Branch Protection

## The situation

GitHub shows a nudge on this repo:

> Your main branch isn't protected. Protect this branch from force pushing
> or deletion, or require status checks before merging.

Ideally we'd enable server-side branch protection rules on `main` via
GitHub's UI (Settings → Branches → Add rule). **We can't yet** —
GitHub paywalls branch protection on private repositories. Both the
classic Branch Protection API and the newer Rulesets API return
`403: Upgrade to GitHub Pro or make this repository public` for
KyberStation (currently private, free tier).

## Current mitigation: client-side hooks

Instead of server-side enforcement, we ship a committed `pre-push` hook
at `.githooks/pre-push` that runs locally on every `git push`. It
blocks two specific footguns:

1. **Force-push to `main`** — refuses with a loud warning and suggested
   recovery steps (usually: `git pull --rebase && git push`).
2. **Deletion of `main`** — refuses with a warning; rare but
   catastrophic.

The hook is defense-in-depth. It doesn't stop a determined `--no-verify`
bypass, but it catches the accidental `git push -f origin main` that's
the most common way history gets destroyed.

## Setup (every contributor, once per clone)

```bash
pnpm run hooks:install
```

This runs `scripts/install-git-hooks.mjs`, which sets
`git config core.hooksPath .githooks` for the current clone. Idempotent —
safe to run repeatedly.

You only need to run this once per fresh clone. The setting persists in
`.git/config`.

## Bypassing (rare, intentional)

If you've confirmed a force-push is genuinely what you need (e.g.,
recovering from a bad rebase on a feature branch that was force-merged
to main — unlikely but possible), use:

```bash
git push --no-verify --force origin main
```

The hook won't run. Use this sparingly. If you're reaching for it on
`main`, take a breath and verify there isn't a safer path
(`git pull --rebase`, `git revert`, a fresh commit on top, etc.).

## When we upgrade / go public

Two paths to real server-side protection:

### Option A — Make the repo public

Free. Enables branch protection immediately. Aligns with the "KyberStation
v1.0 public release" trajectory documented in `CHANGELOG.md` and
`CLAUDE.md`. Will eventually happen anyway.

When we make it public:

1. Settings → Danger Zone → Change visibility → Public
2. Settings → Branches → Add rule → pattern `main`, enable:
   - ✅ Require a pull request before merging
   - ✅ Require status checks to pass before merging (select `build-and-test` from CI)
   - ✅ Do not allow bypassing the above settings
   - ✅ Restrict pushes that create files
   - ⚠️ (Skip "Require review from code owners" while you're solo)

### Option B — Upgrade to GitHub Pro

$4/month. Keeps the repo private but unlocks the same features. Worth
it if you want a private incubation period before public release.

Same rule setup as Option A once Pro is active.

## Why this doc exists

Future maintainers (and future-you) will see the client-side hook and
wonder why there's a shell script doing what GitHub should do. This
document is the paper trail: server-side protection is paywalled, the
hook is the interim fix, and removing the hook when we migrate to public
or Pro is intentional cleanup (not regression).

## Related

- `.githooks/pre-push` — the hook itself
- `scripts/install-git-hooks.mjs` — setup script
- Root `package.json` → `scripts.hooks:install` — shorthand invocation
