#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// setup-branch-protection — apply server-side branch protection to main
//
// Run this ONCE after upgrading the repo's owner to GitHub Pro (or after
// making the repo public). It creates a ruleset on `main` that:
//
//   • Blocks force-push          (non_fast_forward rule)
//   • Blocks branch deletion     (deletion rule)
//   • Requires PR workflow       (pull_request rule, 0 approvals — solo-OK)
//   • Requires CI to pass        (required_status_checks, "build-and-test")
//
// Idempotent: if a ruleset named "main-protection" already exists, it
// updates the existing one rather than creating a duplicate.
//
// Usage:
//   node scripts/setup-branch-protection.mjs
//   pnpm run branch-protection:setup   # (defined in package.json)
//
// Requires: gh CLI installed and authenticated with `repo` scope
// ─────────────────────────────────────────────────────────────────────────────

import { execSync } from 'node:child_process';

const REPO = 'kenkoller/KyberStation';
const RULESET_NAME = 'main-protection';

function sh(cmd, opts = {}) {
  try {
    return execSync(cmd, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'], ...opts });
  } catch (err) {
    return { error: err };
  }
}

function ghJson(cmd) {
  const out = sh(cmd);
  if (typeof out !== 'string') return { error: out.error };
  try {
    return { data: JSON.parse(out) };
  } catch {
    return { error: new Error(`Unparseable JSON from: ${cmd}\n${out}`) };
  }
}

function die(msg, code = 1) {
  console.error(`\n✗ ${msg}\n`);
  process.exit(code);
}

// ── 1. Preflight: gh authenticated? ─────────────────────────────────────────
const auth = sh('gh auth status');
if (auth.error) {
  die(
    'gh CLI not authenticated. Run `gh auth login` first, then re-run this script.',
  );
}

// ── 2. Preflight: Pro / public unlocks rulesets? ────────────────────────────
// Before Pro upgrade or public visibility, POSTing to /rulesets returns 403.
// We do a lightweight GET first; if it 403s, explain and bail.
const probe = sh(`gh api repos/${REPO}/rulesets`);
if (typeof probe !== 'string') {
  const stderr = probe.error.stderr?.toString?.() ?? '';
  if (stderr.includes('403') || stderr.includes('Upgrade to GitHub Pro')) {
    die(
      'Branch protection rulesets are still paywalled on this repo.\n\n' +
        '  Either:\n' +
        '    1. Upgrade the owner to GitHub Pro at\n' +
        '       https://github.com/settings/billing/plans\n' +
        '    2. Make the repo public at\n' +
        '       https://github.com/kenkoller/KyberStation/settings\n\n' +
        '  Then re-run this script.',
    );
  }
  die(`Unexpected gh error: ${stderr || probe.error.message}`);
}

// ── 3. Build the ruleset payload ────────────────────────────────────────────
const ruleset = {
  name: RULESET_NAME,
  target: 'branch',
  enforcement: 'active',
  conditions: {
    ref_name: {
      include: ['refs/heads/main'],
      exclude: [],
    },
  },
  rules: [
    // Block force-push (non-fast-forward updates)
    { type: 'non_fast_forward' },
    // Block branch deletion
    { type: 'deletion' },
    // Require PR workflow. 0 approvals works for solo devs;
    // still prevents direct pushes to main.
    {
      type: 'pull_request',
      parameters: {
        required_approving_review_count: 0,
        dismiss_stale_reviews_on_push: false,
        require_code_owner_review: false,
        require_last_push_approval: false,
        required_review_thread_resolution: false,
        allowed_merge_methods: ['merge', 'squash', 'rebase'],
      },
    },
    // Require CI to pass. The `integration_id` field is optional — omit
    // it to accept any check from any app (omitting it as `null` causes
    // the API to reject with "Invalid property: data matches no possible
    // input"; omitting the key entirely is the correct shape).
    {
      type: 'required_status_checks',
      parameters: {
        required_status_checks: [{ context: 'build-and-test' }],
        strict_required_status_checks_policy: false,
      },
    },
  ],
};

// ── 4. Create or update the ruleset ─────────────────────────────────────────
const existing = probe ? JSON.parse(probe) : [];
const existingRule = Array.isArray(existing)
  ? existing.find((r) => r.name === RULESET_NAME)
  : null;

const payload = JSON.stringify(ruleset);

if (existingRule) {
  console.log(`→ Updating existing ruleset "${RULESET_NAME}" (id ${existingRule.id})…`);
  const res = sh(
    `gh api -X PUT repos/${REPO}/rulesets/${existingRule.id} --input -`,
    { input: payload },
  );
  if (typeof res !== 'string') {
    die(`Failed to update ruleset: ${res.error.stderr?.toString?.() ?? res.error.message}`);
  }
  console.log('✓ Ruleset updated.');
} else {
  console.log(`→ Creating ruleset "${RULESET_NAME}"…`);
  const res = sh(`gh api -X POST repos/${REPO}/rulesets --input -`, {
    input: payload,
  });
  if (typeof res !== 'string') {
    die(`Failed to create ruleset: ${res.error.stderr?.toString?.() ?? res.error.message}`);
  }
  console.log('✓ Ruleset created.');
}

// ── 5. Verify by reading it back ────────────────────────────────────────────
const verify = ghJson(`gh api repos/${REPO}/rulesets`);
if (verify.error) {
  die(`Could not verify ruleset: ${verify.error.message}`);
}
const applied = verify.data.find((r) => r.name === RULESET_NAME);
if (!applied) {
  die(`Ruleset "${RULESET_NAME}" not found after apply — something went wrong.`);
}

console.log('');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`✓ main branch is now protected on ${REPO}`);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('');
console.log('  Active rules on refs/heads/main:');
console.log('    • Force-push: BLOCKED');
console.log('    • Branch deletion: BLOCKED');
console.log('    • Direct push: BLOCKED (PR required, 0 approvals for solo workflow)');
console.log(`    • CI check required: "build-and-test"`);
console.log('');
console.log('  Manage at:');
console.log(`    https://github.com/${REPO}/settings/rules`);
console.log('');
console.log('  The client-side .githooks/pre-push remains active as defense-');
console.log('  in-depth — double safety never hurts. It catches force-push');
console.log('  attempts BEFORE hitting the network.');
console.log('');
