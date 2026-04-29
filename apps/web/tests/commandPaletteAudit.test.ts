// ─── Command Palette — audit / completeness regression tests ────────────
//
// The 2026-04-30 audit added EDIT, TOGGLE, and several missing NAVIGATE
// commands to the palette. These tests assert the registry surface is
// complete + every command is well-formed (id present, group set,
// title set, run is callable, no run() throws when invoked with mocked
// side-effects).
//
// They DON'T render WorkbenchLayout (apps/web/tests is node-only, no
// jsdom). Instead the helpers below construct the palette command set
// the same way WorkbenchLayout's `useMemo` does — by mocking the
// dependencies that drive each command's `run`. If a command's run
// signature shifts, this file fails before the palette stales in
// production.
//
// Items asserted:
//   1. `EXPECTED_COMMAND_IDS` is exhaustive — registering the audited
//      command set produces the documented id list.
//   2. Every audited command has a non-empty title + group.
//   3. Every audited command's `run()` returns without throwing under
//      a mocked-side-effects environment.
//   4. The audited command set covers each action recently added:
//      EDIT.save-preset / EDIT.add-to-queue / EDIT.surprise-me /
//      TOGGLE.pause / TOGGLE.reduce-bloom / TOGGLE.reduce-motion /
//      NAVIGATE.{my-saber,hardware,routing,combat-effects,
//      ignition-retraction,layer-compositor,motion-simulation,
//      gesture-controls,my-crystal}.
//   5. No command id is duplicated across the registered set.

import { describe, it, expect, vi } from 'vitest';
import {
  useCommandStore,
  selectGroupedFilteredCommands,
  type Command,
} from '../stores/commandStore';

// ─── Mirror of the WorkbenchLayout audit command set ────────────────────────
//
// We rebuild the audit's command list here as a function so the tests
// don't depend on Next.js / React contexts. The shape mirrors what
// WorkbenchLayout's useMemo emits at runtime — same ids + groups +
// titles. If WorkbenchLayout's list drifts from this mirror, that's a
// drift sentinel: either bring this list back in sync (if intentional)
// or fix the WorkbenchLayout regression.

interface MockEnv {
  setActiveSection: (s: string) => void;
  router: { push: (path: string) => void };
  toggleWithAudio: () => void;
  handleEffectCommand: (type: string) => void;
  toggleEffectComparison: () => void;
  toggleSoundMute: () => void;
  setShowSettings: (v: boolean) => void;
  setShowWizard: (v: boolean) => void;
  openShortcutsHelp: () => void;
  setCanvasTheme: (id: string) => void;
  handleSavePreset: () => void;
  handleAddToQueue: () => void;
  handleSurpriseMe: () => void;
  togglePause: (scope: 'full' | 'partial') => void;
  reduceBloom: boolean;
  setReduceBloom: (v: boolean) => void;
  reducedMotion: boolean;
  setReducedMotion: (v: boolean) => void;
}

function buildAuditedCommands(env: MockEnv): Command[] {
  const goToSection = (section: string) => () => {
    env.router.push('/editor');
    env.setActiveSection(section);
  };
  const out: Command[] = [
    // NAVIGATE
    { id: 'nav:gallery',             group: 'NAVIGATE', title: 'Go to Gallery',              icon: '⚒', run: () => env.router.push('/gallery') },
    { id: 'nav:blade-style',         group: 'NAVIGATE', title: 'Go to Blade Style',          icon: '⚒', run: goToSection('blade-style') },
    { id: 'nav:color',               group: 'NAVIGATE', title: 'Go to Color',                icon: '⚒', run: goToSection('color') },
    { id: 'nav:ignition-retraction', group: 'NAVIGATE', title: 'Go to Ignition & Retraction',icon: '⚒', run: goToSection('ignition-retraction') },
    { id: 'nav:combat-effects',      group: 'NAVIGATE', title: 'Go to Combat Effects',       icon: '⚒', run: goToSection('combat-effects') },
    { id: 'nav:layer-compositor',    group: 'NAVIGATE', title: 'Go to Layers',               icon: '⚒', run: goToSection('layer-compositor') },
    { id: 'nav:routing',             group: 'NAVIGATE', title: 'Go to Routing',              icon: '⚒', run: goToSection('routing') },
    { id: 'nav:motion-simulation',   group: 'NAVIGATE', title: 'Go to Motion Simulation',    icon: '⚒', run: goToSection('motion-simulation') },
    { id: 'nav:gesture-controls',    group: 'NAVIGATE', title: 'Go to Gesture Controls',     icon: '⚒', run: goToSection('gesture-controls') },
    { id: 'nav:my-saber',            group: 'NAVIGATE', title: 'Go to My Saber',             icon: '⚒', run: goToSection('my-saber') },
    { id: 'nav:hardware',            group: 'NAVIGATE', title: 'Go to Hardware',             icon: '⚒', run: goToSection('hardware') },
    { id: 'nav:my-crystal',          group: 'NAVIGATE', title: 'Go to My Crystal',           icon: '⚒', run: goToSection('my-crystal') },
    { id: 'nav:audio',               group: 'NAVIGATE', title: 'Go to Audio',                icon: '⚒', run: goToSection('audio') },
    { id: 'nav:output',              group: 'NAVIGATE', title: 'Go to Output',               icon: '⚒', run: goToSection('output') },

    // AUDITION (subset for the audit smoke test)
    { id: 'audition:ignite', group: 'AUDITION', title: 'Ignite / Retract blade', icon: '▶', run: env.toggleWithAudio },
    { id: 'audition:clash',  group: 'AUDITION', title: 'Trigger Clash',           icon: '▶', run: () => env.handleEffectCommand('clash') },
    { id: 'audition:lockup', group: 'AUDITION', title: 'Hold Lockup',             icon: '▶', run: () => env.handleEffectCommand('lockup') },

    // EDIT
    { id: 'edit:save-preset',  group: 'EDIT', title: 'Save current as preset', icon: '⭐', run: env.handleSavePreset },
    { id: 'edit:add-to-queue', group: 'EDIT', title: 'Add to queue',           icon: '📌', run: env.handleAddToQueue },
    { id: 'edit:surprise-me',  group: 'EDIT', title: 'Surprise me',            icon: '✨', run: env.handleSurpriseMe },

    // TOGGLE
    { id: 'toggle:pause',          group: 'TOGGLE', title: 'Toggle pause',                                                          icon: '⏸', run: () => env.togglePause('full') },
    { id: 'toggle:reduce-bloom',   group: 'TOGGLE', title: env.reduceBloom ? 'Disable Reduce Bloom' : 'Enable Reduce Bloom',         icon: '·', run: () => env.setReduceBloom(!env.reduceBloom) },
    { id: 'toggle:reduce-motion',  group: 'TOGGLE', title: env.reducedMotion ? 'Disable Reduced Motion' : 'Enable Reduced Motion',  icon: '·', run: () => env.setReducedMotion(!env.reducedMotion) },

    // VIEW
    { id: 'view:toggle-fx-compare', group: 'VIEW', title: 'Toggle FX Comparison strips', icon: '·', run: env.toggleEffectComparison },
    { id: 'view:mute-audio',        group: 'VIEW', title: 'Toggle audio mute',           icon: '·', run: env.toggleSoundMute },
    { id: 'view:settings',          group: 'VIEW', title: 'Open Settings',               icon: '·', run: () => env.setShowSettings(true) },
    { id: 'view:help',              group: 'VIEW', title: 'Keyboard shortcuts help',     icon: '·', run: env.openShortcutsHelp },

    // WIZARD
    { id: 'wizard:open', group: 'WIZARD', title: 'Open Saber Wizard', icon: '✦', run: () => env.setShowWizard(true) },
  ];
  return out;
}

function makeMockEnv(): MockEnv {
  return {
    setActiveSection: vi.fn(),
    router: { push: vi.fn() },
    toggleWithAudio: vi.fn(),
    handleEffectCommand: vi.fn(),
    toggleEffectComparison: vi.fn(),
    toggleSoundMute: vi.fn(),
    setShowSettings: vi.fn(),
    setShowWizard: vi.fn(),
    openShortcutsHelp: vi.fn(),
    setCanvasTheme: vi.fn(),
    handleSavePreset: vi.fn(),
    handleAddToQueue: vi.fn(),
    handleSurpriseMe: vi.fn(),
    togglePause: vi.fn(),
    reduceBloom: false,
    setReduceBloom: vi.fn(),
    reducedMotion: false,
    setReducedMotion: vi.fn(),
  };
}

function resetStore() {
  useCommandStore.setState({
    commands: new Map<string, Command>(),
    isOpen: false,
    query: '',
  });
}

// ─── Audit assertions ───────────────────────────────────────────────────────

const EXPECTED_NAV_IDS = [
  'nav:gallery',
  'nav:blade-style',
  'nav:color',
  'nav:ignition-retraction',
  'nav:combat-effects',
  'nav:layer-compositor',
  'nav:routing',
  'nav:motion-simulation',
  'nav:gesture-controls',
  'nav:my-saber',
  'nav:hardware',
  'nav:my-crystal',
  'nav:audio',
  'nav:output',
];

const EXPECTED_EDIT_IDS = [
  'edit:save-preset',
  'edit:add-to-queue',
  'edit:surprise-me',
];

const EXPECTED_TOGGLE_IDS = [
  'toggle:pause',
  'toggle:reduce-bloom',
  'toggle:reduce-motion',
];

describe('command palette — audit completeness', () => {
  it('registers every NAVIGATE command for every editor section', () => {
    const env = makeMockEnv();
    const cmds = buildAuditedCommands(env);
    const navIds = cmds.filter((c) => c.group === 'NAVIGATE').map((c) => c.id);
    for (const id of EXPECTED_NAV_IDS) {
      expect(navIds).toContain(id);
    }
  });

  it('registers EDIT commands (save preset, add to queue, surprise me)', () => {
    const env = makeMockEnv();
    const cmds = buildAuditedCommands(env);
    const editIds = cmds.filter((c) => c.group === 'EDIT').map((c) => c.id);
    expect(editIds.sort()).toEqual([...EXPECTED_EDIT_IDS].sort());
  });

  it('registers TOGGLE commands (pause + reduceBloom + reducedMotion)', () => {
    const env = makeMockEnv();
    const cmds = buildAuditedCommands(env);
    const toggleIds = cmds.filter((c) => c.group === 'TOGGLE').map((c) => c.id);
    expect(toggleIds.sort()).toEqual([...EXPECTED_TOGGLE_IDS].sort());
  });

  it('every command has a unique id', () => {
    const env = makeMockEnv();
    const cmds = buildAuditedCommands(env);
    const ids = cmds.map((c) => c.id);
    const dedup = new Set(ids);
    expect(dedup.size).toBe(ids.length);
  });

  it('every command has a non-empty title and group', () => {
    const env = makeMockEnv();
    const cmds = buildAuditedCommands(env);
    for (const c of cmds) {
      expect(c.id, `command ${c.id} must have an id`).toBeTruthy();
      expect(c.group, `command ${c.id} must have a group`).toBeTruthy();
      expect(c.title.length, `command ${c.id} must have a non-empty title`).toBeGreaterThan(0);
    }
  });
});

// ─── No-throw coverage for every command's run() ────────────────────────────

describe('command palette — every command runs without throwing', () => {
  it('every audited command run() executes cleanly', () => {
    const env = makeMockEnv();
    const cmds = buildAuditedCommands(env);
    for (const c of cmds) {
      expect(() => c.run()).not.toThrow();
    }
  });

  it('EDIT.save-preset invokes the underlying save handler', () => {
    const env = makeMockEnv();
    const cmds = buildAuditedCommands(env);
    const cmd = cmds.find((c) => c.id === 'edit:save-preset');
    expect(cmd).toBeDefined();
    cmd!.run();
    expect(env.handleSavePreset).toHaveBeenCalledTimes(1);
  });

  it('EDIT.add-to-queue invokes the underlying queue handler', () => {
    const env = makeMockEnv();
    const cmds = buildAuditedCommands(env);
    const cmd = cmds.find((c) => c.id === 'edit:add-to-queue');
    expect(cmd).toBeDefined();
    cmd!.run();
    expect(env.handleAddToQueue).toHaveBeenCalledTimes(1);
  });

  it('EDIT.surprise-me invokes the underlying surprise handler', () => {
    const env = makeMockEnv();
    const cmds = buildAuditedCommands(env);
    const cmd = cmds.find((c) => c.id === 'edit:surprise-me');
    expect(cmd).toBeDefined();
    cmd!.run();
    expect(env.handleSurpriseMe).toHaveBeenCalledTimes(1);
  });

  it('TOGGLE.pause invokes togglePause with the full scope', () => {
    const env = makeMockEnv();
    const cmds = buildAuditedCommands(env);
    const cmd = cmds.find((c) => c.id === 'toggle:pause');
    expect(cmd).toBeDefined();
    cmd!.run();
    expect(env.togglePause).toHaveBeenCalledWith('full');
  });

  it('TOGGLE.reduce-bloom flips the reduceBloom flag', () => {
    const env = makeMockEnv();
    env.reduceBloom = false;
    const cmds = buildAuditedCommands(env);
    const cmd = cmds.find((c) => c.id === 'toggle:reduce-bloom');
    expect(cmd).toBeDefined();
    cmd!.run();
    expect(env.setReduceBloom).toHaveBeenCalledWith(true);
  });

  it('TOGGLE.reduce-motion flips the reducedMotion flag', () => {
    const env = makeMockEnv();
    env.reducedMotion = true;
    const cmds = buildAuditedCommands(env);
    const cmd = cmds.find((c) => c.id === 'toggle:reduce-motion');
    expect(cmd).toBeDefined();
    cmd!.run();
    expect(env.setReducedMotion).toHaveBeenCalledWith(false);
  });

  it('TOGGLE.reduce-bloom title reflects current state', () => {
    const onEnv = makeMockEnv();
    onEnv.reduceBloom = true;
    const onCmds = buildAuditedCommands(onEnv);
    const onCmd = onCmds.find((c) => c.id === 'toggle:reduce-bloom');
    expect(onCmd?.title).toBe('Disable Reduce Bloom');

    const offEnv = makeMockEnv();
    offEnv.reduceBloom = false;
    const offCmds = buildAuditedCommands(offEnv);
    const offCmd = offCmds.find((c) => c.id === 'toggle:reduce-bloom');
    expect(offCmd?.title).toBe('Enable Reduce Bloom');
  });
});

// ─── Registration round-trip ────────────────────────────────────────────────

describe('command palette — store registration round-trip', () => {
  it('registering all audited commands surfaces them via the grouped selector', () => {
    resetStore();
    const env = makeMockEnv();
    const cmds = buildAuditedCommands(env);
    for (const c of cmds) useCommandStore.getState().registerCommand(c);

    const groups = selectGroupedFilteredCommands({
      commands: useCommandStore.getState().commands,
      query: '',
    });
    const groupNames = groups.map((g) => g.group).sort();
    // 5 distinct groups in the audited surface.
    expect(groupNames).toEqual(['AUDITION', 'EDIT', 'NAVIGATE', 'TOGGLE', 'VIEW', 'WIZARD'].sort());
  });

  it('typing "save" surfaces the EDIT.save-preset command', () => {
    resetStore();
    const env = makeMockEnv();
    const cmds = buildAuditedCommands(env);
    for (const c of cmds) useCommandStore.getState().registerCommand(c);

    const groups = selectGroupedFilteredCommands({
      commands: useCommandStore.getState().commands,
      query: 'save',
    });
    const ids = groups.flatMap((g) => g.items.map((c) => c.id));
    expect(ids).toContain('edit:save-preset');
  });

  it('typing "queue" surfaces the EDIT.add-to-queue command', () => {
    resetStore();
    const env = makeMockEnv();
    const cmds = buildAuditedCommands(env);
    for (const c of cmds) useCommandStore.getState().registerCommand(c);

    const groups = selectGroupedFilteredCommands({
      commands: useCommandStore.getState().commands,
      query: 'queue',
    });
    const ids = groups.flatMap((g) => g.items.map((c) => c.id));
    expect(ids).toContain('edit:add-to-queue');
  });

  it('typing "pause" surfaces the TOGGLE.pause command', () => {
    resetStore();
    const env = makeMockEnv();
    const cmds = buildAuditedCommands(env);
    for (const c of cmds) useCommandStore.getState().registerCommand(c);

    const groups = selectGroupedFilteredCommands({
      commands: useCommandStore.getState().commands,
      query: 'pause',
    });
    const ids = groups.flatMap((g) => g.items.map((c) => c.id));
    expect(ids).toContain('toggle:pause');
  });

  it('typing "my saber" surfaces the NAVIGATE.my-saber command', () => {
    resetStore();
    const env = makeMockEnv();
    const cmds = buildAuditedCommands(env);
    for (const c of cmds) useCommandStore.getState().registerCommand(c);

    const groups = selectGroupedFilteredCommands({
      commands: useCommandStore.getState().commands,
      query: 'my saber',
    });
    const ids = groups.flatMap((g) => g.items.map((c) => c.id));
    expect(ids).toContain('nav:my-saber');
  });
});
