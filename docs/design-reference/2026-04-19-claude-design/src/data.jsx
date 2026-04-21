/* Realistic Proffie blade style data + modulators + macros + palette commands.
 * "Unstable Crimson v3 — Ken — 2.4"
 */

const INITIAL_STYLE = {
  name: "Unstable Crimson v3",
  author: "Ken",
  version: "2.4",
  lineage: "forked from OSx · Sith Temple / Crimson Flux",
  proffieVersion: "ProffieOS 7.14 · Proffieboard V3.9",
  blade: {
    leds: 144,
    type: "WS2811 GRB",
    length: "92 cm",
    color: "#ff2a1e",
    coreColor: "#ffd3cc",
  },
};

// Identity colors used for modulator routing — bright but not saturated past chroma 0.18
const MOD_COLORS = {
  lfo_flicker:   "#b46ac0",  // magenta
  env_clash:     "#5aa9c8",  // cyan
  swing_vel:     "#d4a04a",  // amber
  heat:          "#c85a4f",  // red
  lfo_breathe:   "#7ab87a",  // green-cool
  hum_beat:      "#9ba8c0",  // cool-neutral
};

const INITIAL_MODS = [
  { id: "lfo_flicker", name: "LFO · Flicker",   kind: "LFO",  rate: "5.8 Hz", shape: "noise", color: MOD_COLORS.lfo_flicker },
  { id: "env_clash",   name: "Env · Clash",     kind: "ENV",  attack: "4 ms", decay: "240 ms", color: MOD_COLORS.env_clash },
  { id: "swing_vel",   name: "Swing · Velocity",kind: "SIM",  source: "IMU", curve: "exp", color: MOD_COLORS.swing_vel },
  { id: "heat",        name: "Heat · Duel Temp",kind: "STATE",source: "Lockup count", decay: "slow", color: MOD_COLORS.heat },
  { id: "lfo_breathe", name: "LFO · Breathe",   kind: "LFO",  rate: "0.34 Hz", shape: "sine", color: MOD_COLORS.lfo_breathe },
];

// The ProffieOS layer stack, realistic ordering
const INITIAL_LAYERS = [
  {
    id: "base",
    name: "Base · Crimson Core",
    type: "StylePtr<Layers<RgbArg<...>>>",
    badge: "BASE",
    color: "#ff2a1e",
    params: {
      intensity: 0.94,
      huedrift: 0.06,
      saturation: 0.92,
    },
  },
  {
    id: "flicker",
    name: "Flicker · Unstable Crystal",
    type: "RandomBlink + Lfo<Noise>",
    badge: "FLICKER",
    color: "#ff6040",
    modulatedBy: ["lfo_flicker"],
    params: {
      rate: 5.8,
      depth: 0.34,
      falloff: 0.62,
    },
  },
  {
    id: "lockup",
    name: "Lockup · Sparks",
    type: "LockupL<...>",
    badge: "LOCKUP",
    color: "#ffd24a",
    modulatedBy: ["heat"],
    params: {
      spark_density: 0.72,
      flare: 0.58,
      temp_shift: 0.4,
    },
  },
  {
    id: "blast",
    name: "Blast · Deflect",
    type: "BlastL<...>",
    badge: "BLAST",
    color: "#ff8040",
    params: {
      radius: 0.3,
      decay: 160,
      intensity: 0.8,
    },
  },
  {
    id: "clash",
    name: "Clash · Impact Pulse",
    type: "SimpleClashL<...>",
    badge: "CLASH",
    color: "#ffd2b0",
    modulatedBy: ["env_clash"],
    params: {
      threshold: 0.58,
      duration: 180,
      brightness: 1.0,
    },
  },
  {
    id: "stab",
    name: "Stab · Thrust Accent",
    type: "StabL<...>",
    badge: "STAB",
    color: "#ff4020",
    params: {
      angle_min: 75,
      duration: 260,
      intensity: 0.88,
    },
  },
  {
    id: "drag",
    name: "Drag · Scrape Tip",
    type: "DragL<LockupL<...>>",
    badge: "DRAG",
    color: "#ffa030",
    params: {
      tip_length: 12,
      ember_rate: 1.2,
      spread: 0.28,
    },
  },
  {
    id: "blaster",
    name: "Blaster Bolt · Return",
    type: "BlasterL<...>",
    badge: "EFFECT",
    color: "#ff5030",
    params: {
      lifetime: 520,
      speed: 2.4,
      intensity: 0.74,
    },
  },
  {
    id: "retract",
    name: "Retract · Reverse Sweep",
    type: "OnSparkL + InOutTrL",
    badge: "RETRACT",
    color: "#ff3020",
    params: {
      duration: 340,
      ease: "expo.in",
      afterglow: 120,
    },
  },
];

const INITIAL_MACROS = [
  { id: 1, label: "INSTABILITY", val: 0.58, assigned: "flicker.depth", color: "#b46ac0" },
  { id: 2, label: "BLADE LEN",   val: 0.92, assigned: "base.length",   color: "#c08a3e" },
  { id: 3, label: "HEAT",        val: 0.34, assigned: "heat.bias",     color: "#c85a4f" },
  { id: 4, label: "CLASH",       val: 0.72, assigned: "clash.bright",  color: "#5aa9c8" },
  { id: 5, label: "HUE DRIFT",   val: 0.18, assigned: "base.hue",      color: "#d4a04a" },
  { id: 6, label: "FLICKER RT",  val: 0.48, assigned: "flicker.rate",  color: "#b46ac0" },
  { id: 7, label: "IGNITE TIME", val: 0.62, assigned: "inout.ignite",  color: "#d4a04a" },
  { id: 8, label: "RETRACT",     val: 0.58, assigned: "inout.retract", color: "#d4a04a" },
];

const MACRO_PAGES = ["A · IGNITION", "B · MOTION", "C · COLOR", "D · FX"];

// Command palette — Raycast-style, two-level (group → actions)
const PALETTE_COMMANDS = [
  { group: "NAVIGATE", cmds: [
    { id: "page_design",   title: "Go to Design",   kbd: "⌘1", ico: "D" },
    { id: "page_audition", title: "Go to Audition", kbd: "⌘2", ico: "A" },
    { id: "page_code",     title: "Go to Code",     kbd: "⌘3", ico: "C" },
    { id: "page_deliver",  title: "Go to Deliver",  kbd: "⌘4", ico: "V" },
  ]},
  { group: "LAYER", cmds: [
    { id: "layer_add",    title: "Add Layer…",           subtitle: "Base · Flicker · Lockup · Blast · Clash · …", kbd: "⇧⌘L", ico: "+" },
    { id: "layer_dup",    title: "Duplicate Selected Layer", kbd: "⌘D", ico: "D" },
    { id: "layer_solo",   title: "Solo Selected Layer",  kbd: "S",  ico: "S" },
    { id: "layer_group",  title: "Group into SubStack",  kbd: "⌘G", ico: "G" },
  ]},
  { group: "MODULATOR", cmds: [
    { id: "mod_add_lfo", title: "Add Modulator · LFO",       subtitle: "Noise / Sine / Tri / Square", kbd: "⌘⇧M", ico: "~" },
    { id: "mod_add_env", title: "Add Modulator · Envelope",  subtitle: "Attack · Decay · Sustain · Release", ico: "∧" },
    { id: "mod_add_sim", title: "Add Modulator · Simulation",subtitle: "IMU · Swing · Orientation", ico: "*" },
  ]},
  { group: "AUDITION", cmds: [
    { id: "aud_ignite",  title: "Ignite",         kbd: "Space", ico: "▶" },
    { id: "aud_clash",   title: "Trigger Clash",  kbd: "C",     ico: "!" },
    { id: "aud_lockup",  title: "Hold Lockup",    kbd: "L",     ico: "=" },
    { id: "aud_blast",   title: "Trigger Blast",  kbd: "B",     ico: "•" },
  ]},
  { group: "THEME", cmds: [
    { id: "theme_imperial",  title: "Theme · Imperial",   subtitle: "Andor · cold industrial", ico: "●" },
    { id: "theme_jedi",      title: "Theme · Jedi",       subtitle: "Savi's + Survivor parchment", ico: "●" },
    { id: "theme_rebel",     title: "Theme · Rebel",      subtitle: "OT vector-green", ico: "●" },
    { id: "theme_rocinante", title: "Theme · Rocinante",  subtitle: "Expanse cool-telemetry", ico: "●" },
  ]},
  { group: "DELIVER", cmds: [
    { id: "del_commit", title: "Commit to SD Card…", subtitle: "Ceremony: prepared → writing → verified", kbd: "⌘↵", ico: "⌁" },
    { id: "del_export", title: "Export Style as C++…", subtitle: "config.h fragment", kbd: "⌘E", ico: "{" },
  ]},
];

Object.assign(window, {
  INITIAL_STYLE, INITIAL_MODS, INITIAL_LAYERS, INITIAL_MACROS,
  MACRO_PAGES, PALETTE_COMMANDS, MOD_COLORS,
});
