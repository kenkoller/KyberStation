/* App — state, keyboard wiring, layout. */

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "density": "ableton",
  "bladeHue": "#ff2a1e",
  "hudMode": "full"
}/*EDITMODE-END*/;

function App() {
  // Core style state
  const [style, setStyle] = React.useState({ ...window.INITIAL_STYLE });
  const [layers, setLayers] = React.useState(window.INITIAL_LAYERS);
  const [mods] = React.useState(window.INITIAL_MODS);
  const [macros, setMacros] = React.useState(window.INITIAL_MACROS);
  const [pageIdx, setPageIdx] = React.useState(0);

  // Selection & layer states
  const [selectedId, setSelectedId] = React.useState("flicker");
  const [soloId, setSoloId] = React.useState(null);
  const [mutedIds, setMutedIds] = React.useState(new Set());
  const [bypassedIds, setBypassedIds] = React.useState(new Set());
  const [hotModId, setHotModId] = React.useState(null);

  // Audition state
  const [auditionState, setAuditionState] = React.useState({
    ignited: true,
    igniteT: 0.1,
    lastClash: null,
    lockup: false,
    clashCenter: 0.5,
    presetName: "UNSTABLE_CRIMSON_V3",
    bpm: "96",
  });

  // UI state
  const [paletteOpen, setPaletteOpen] = React.useState(false);
  const [tweaksOpen, setTweaksOpen] = React.useState(false);
  const [activePage, setActivePage] = React.useState(0); // Design=0

  // Tweak-driven state
  const [density, setDensity] = React.useState(TWEAK_DEFAULTS.density);
  const [bladeHue, setBladeHue] = React.useState(TWEAK_DEFAULTS.bladeHue);
  const [hudMode, setHudMode] = React.useState(TWEAK_DEFAULTS.hudMode);
  const [modified, setModified] = React.useState(false);

  // Apply density to :root
  React.useEffect(() => {
    document.documentElement.setAttribute("data-density", density);
  }, [density]);

  // Sync blade hue into style
  React.useEffect(() => {
    setStyle(s => ({ ...s, blade: { ...s.blade, color: bladeHue } }));
  }, [bladeHue]);

  // Shift-light rms — animated
  const [shiftRms, setShiftRms] = React.useState(0.4);
  React.useEffect(() => {
    let raf;
    const loop = () => {
      const t = performance.now() / 1000;
      let base = 0.35 + 0.2 * Math.sin(t * 0.8) + 0.1 * Math.sin(t * 3.2);
      if (auditionState.lastClash && t - auditionState.lastClash < 0.4) base += 0.6;
      if (auditionState.lockup) base += 0.25;
      setShiftRms(Math.max(0, Math.min(1, base)));
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [auditionState.lastClash, auditionState.lockup]);

  // Reorder layer
  const reorder = (from, to) => {
    if (from === to) return;
    setLayers((ls) => {
      const next = [...ls];
      const [m] = next.splice(from, 1);
      next.splice(to, 0, m);
      return next;
    });
    setModified(true);
  };

  const updateLayer = (id, patch) => {
    setLayers((ls) => ls.map((l) => l.id === id ? { ...l, ...patch } : l));
    setModified(true);
  };
  const updateMacro = (id, v) => {
    setMacros((ms) => ms.map(m => m.id === id ? { ...m, val: v } : m));
    setModified(true);
  };

  const ignite = () => {
    if (auditionState.ignited) {
      setAuditionState(s => ({ ...s, ignited: false, igniteT: null }));
    } else {
      setAuditionState(s => ({ ...s, ignited: true, igniteT: performance.now()/1000 }));
    }
  };
  const clash = () => setAuditionState(s => ({ ...s, lastClash: performance.now()/1000, clashCenter: 0.2 + Math.random() * 0.6 }));
  const lockup = () => setAuditionState(s => ({ ...s, lockup: !s.lockup }));
  const blast = () => setAuditionState(s => ({ ...s, lastClash: performance.now()/1000, clashCenter: Math.random() }));

  // Keyboard shortcuts
  React.useEffect(() => {
    const h = (e) => {
      // palette toggle
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen(o => !o);
        return;
      }
      if (paletteOpen) return; // palette owns keys when open
      if (e.target && (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA")) return;

      if (e.code === "Space") { e.preventDefault(); ignite(); }
      else if (e.key.toLowerCase() === "c") { clash(); }
      else if (e.key.toLowerCase() === "l") { lockup(); }
      else if (e.key.toLowerCase() === "b" && !e.metaKey && !e.ctrlKey) { blast(); }
      else if (e.key.toLowerCase() === "s" && !e.metaKey && !e.ctrlKey) {
        setSoloId(id => id === selectedId ? null : selectedId);
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [paletteOpen, selectedId, auditionState.ignited]);

  // Palette run
  const runCommand = (c) => {
    if (c.id === "aud_ignite") ignite();
    if (c.id === "aud_clash")  clash();
    if (c.id === "aud_lockup") lockup();
    if (c.id === "aud_blast")  blast();
    if (c.id.startsWith("theme_")) {
      // Visual-only: just show a toast via a brief critical pulse on the workbench; in real app this swaps theme
    }
  };

  // Tweaks edit-mode host protocol
  React.useEffect(() => {
    const onMsg = (e) => {
      const d = e.data;
      if (!d || !d.type) return;
      if (d.type === "__activate_edit_mode") setTweaksOpen(true);
      if (d.type === "__deactivate_edit_mode") setTweaksOpen(false);
    };
    window.addEventListener("message", onMsg);
    try { window.parent.postMessage({ type: "__edit_mode_available" }, "*"); } catch {}
    return () => window.removeEventListener("message", onMsg);
  }, []);

  // Persist tweak changes
  React.useEffect(() => {
    try {
      window.parent.postMessage({
        type: "__edit_mode_set_keys",
        edits: { density, bladeHue, hudMode },
      }, "*");
    } catch {}
  }, [density, bladeHue, hudMode]);

  const pages = [
    { id: "design",   label: "Design",   kbd: "⌘1" },
    { id: "audition", label: "Audition", kbd: "⌘2" },
    { id: "code",     label: "Code",     kbd: "⌘3" },
    { id: "deliver",  label: "Deliver",  kbd: "⌘4" },
  ];

  return (
    <div className="ws" data-screen-label="01 Design">
      {/* Title strip */}
      <div className="title-strip">
        <span className="brand">Kyber<span className="mark">·</span>Station</span>
        <span className="sep">│</span>
        <span className="menu">File</span>
        <span className="menu">Edit</span>
        <span className="menu">View</span>
        <span className="menu">Layer</span>
        <span className="menu">Modulator</span>
        <span className="menu">Audition</span>
        <span className="menu">Card</span>
        <span className="menu">Window</span>
        <span className="menu">Help</span>
        <div className="spacer" />
        <div className="pages">
          {pages.map((p, i) => (
            <div
              key={p.id}
              className={"page-tab" + (activePage === i ? " active" : "")}
              onClick={() => setActivePage(i)}
            >
              <span>{p.label}</span>
              <span className="kbd mono">{p.kbd}</span>
            </div>
          ))}
        </div>
        <div className="spacer" />
        <div className="cmd-hint mono" onClick={() => setPaletteOpen(true)} style={{ cursor: "pointer" }}>
          <span>Command</span>
          <kbd>⌘K</kbd>
        </div>
      </div>

      {/* Main row */}
      <div className="main-row" style={hudMode === "off" ? { "--hud-opacity": 0 } : undefined}>
        <LayerStack
          layers={layers}
          mods={mods}
          selectedId={selectedId}
          setSelectedId={setSelectedId}
          soloId={soloId}
          setSoloId={setSoloId}
          mutedIds={mutedIds}
          setMutedIds={setMutedIds}
          bypassedIds={bypassedIds}
          setBypassedIds={setBypassedIds}
          onReorder={reorder}
          hotModId={hotModId}
          setHotModId={setHotModId}
        />

        <div className={"blade-outer" + (hudMode !== "full" ? " hud-" + hudMode : "")} style={{ minWidth: 0 }}>
          <BladeCanvas
            style={style}
            auditionState={auditionState}
            onIgnite={ignite}
            onClash={clash}
            onLockup={lockup}
            onBlast={blast}
          />
        </div>

        <StylePanel
          layers={layers}
          mods={mods}
          selectedId={selectedId}
          setSelectedId={setSelectedId}
          hotModId={hotModId}
          updateLayer={updateLayer}
        />
      </div>

      {/* Perf bar */}
      <PerformanceBar
        macros={macros}
        updateMacro={updateMacro}
        pageIdx={pageIdx}
        setPageIdx={setPageIdx}
        auditionState={auditionState}
        shiftRms={shiftRms}
      />

      {/* Status */}
      <StatusBar
        style={style}
        auditionState={auditionState}
        storageUsed={0.80}
        connection="OK"
        theme="IMPERIAL"
        layerCount={layers.length}
        modified={modified}
      />

      <Palette open={paletteOpen} onClose={() => setPaletteOpen(false)} onRun={runCommand} />
      <Tweaks
        open={tweaksOpen}
        onClose={() => setTweaksOpen(false)}
        density={density} setDensity={setDensity}
        bladeHue={bladeHue} setBladeHue={setBladeHue}
        hudMode={hudMode} setHudMode={setHudMode}
      />
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
