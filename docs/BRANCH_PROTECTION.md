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

## Migration to server-side protection

Two paths. **Recommended: Option B** (GitHub Pro). You get immediate
branch protection while keeping the repo private, plus the value scales
across every other project on your account for the same $4/month.

Either path ends the same way: the `scripts/setup-branch-protection.mjs`
script applies the full ruleset with one command.

### Option A — Make the repo public (free)

1. Settings → Danger Zone → Change visibility → Public
2. Run: `pnpm run branch-protection:setup`

Aligns with the KyberStation v1.0 public-release trajectory documented
in `CHANGELOG.md`. Will eventually happen anyway — you might as well
flip the switch when you're comfortable.

### Option B — Upgrade to GitHub Pro ($4/month, recommended)

1. Visit https://github.com/settings/billing/plans
2. Click **Upgrade to Pro**, enter payment, confirm
3. Back on your dev machine, run: `pnpm run branch-protection:setup`

### What the setup script applies

Creates a ruleset named `main-protection` on `refs/heads/main` with four
rules:

| Rule | Effect |
|---|---|
| `non_fast_forward` | Blocks force-push to main |
| `deletion` | Blocks deletion of main |
| `pull_request` (0 approvals) | Requires PR workflow — blocks direct pushes, but no approvals needed for solo work |
| `required_status_checks: build-and-test` | Requires CI to pass before merge |

The script is **idempotent** — safe to re-run. If `main-protection`
already exists, it updates rather than duplicating.

Preflight checks: if Pro isn't active (or the repo isn't public), the
script detects the 403 and exits with a clear explanation rather than
failing cryptically. You can run it any time after upgrading; the script
will succeed.

### What happens to the client-side hook?

It stays. Server-side rulesets catch pushes that hit the network; the
`.githooks/pre-push` hook catches them on your machine *before* they
hit the network, saving you a round-trip and a confusing error. Defense
in depth.

Remove the hook only if it becomes genuinely annoying — server-side
rules still protect you at that point.

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
