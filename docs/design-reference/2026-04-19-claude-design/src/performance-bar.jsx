/* PerformanceBar — SSL master + F1 shift-light rail + Maschine macro discipline. */

function PerformanceBar({ macros, updateMacro, pageIdx, setPageIdx, auditionState, shiftRms }) {
  const [t, setT] = React.useState(0);
  useAnimationFrame(setT);

  // Shift-light: 24 LEDs, lit based on top modulator activity / rms
  const N = 32;
  const leds = [];
  for (let i = 0; i < N; i++) {
    const pos = i / (N - 1);
    const rms = shiftRms;
    const lit = pos < rms;
    let color = "var(--n-700)";
    if (lit) {
      if (pos < 0.5) color = "var(--status-green)";
      else if (pos < 0.75) color = "var(--status-amber)";
      else color = "var(--status-red)";
    }
    leds.push(<div key={i} className="shift-led" style={{ background: color, opacity: lit ? 1 : 0.5 }} />);
  }

  return (
    <div className="perf">
      <div className="shift-rail" title="Shift-light rail · top-modulator + RMS activity">
        {leds}
      </div>
      <div className="perf-body">
        <div className="perf-left">
          <div className="eyebrow">Performance Bar</div>
          <div className="name mono">PAGE {window.MACRO_PAGES[pageIdx].split(" · ")[0]}</div>
          <div className="pages">
            {window.MACRO_PAGES.map((p, i) => (
              <div
                key={p}
                className={"page-pill" + (i === pageIdx ? " active" : "")}
                onClick={() => setPageIdx(i)}
                title={p}
              >
                {p.split(" · ")[0]}
              </div>
            ))}
          </div>
        </div>

        <div className="perf-macros">
          {macros.map((m) => (
            <Macro key={m.id} macro={m} onChange={(v) => updateMacro(m.id, v)} />
          ))}
        </div>

        <div className="perf-right">
          <div className="row"><span className="k">Preset</span><span className="v mono">{auditionState.presetName}</span></div>
          <div className="row"><span className="k">BPM</span><span className="v mono amber">{auditionState.bpm}</span></div>
          <div className="row"><span className="k">Swing</span><span className="v mono">{(shiftRms * 100).toFixed(0)}%</span></div>
          <div className="row"><span className="k">Bus</span><span className="v mono cyan">▸ CARD · PREVIEW</span></div>
        </div>
      </div>
    </div>
  );
}

function Macro({ macro, onChange }) {
  const onMouseDown = (e) => {
    e.preventDefault();
    const startY = e.clientY;
    const startV = macro.val;
    const move = (ev) => {
      const dy = startY - ev.clientY;
      let v = startV + dy * 0.006;
      v = Math.max(0, Math.min(1, v));
      onChange(v);
    };
    const up = () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  };
  return (
    <div
      className={"macro" + (macro.assigned ? " assigned" : "")}
      style={{ "--macro-color": macro.color }}
      onMouseDown={onMouseDown}
      title={"Drag vertically to adjust · Assigned: " + (macro.assigned || "—")}
    >
      <div className="macro-knob">
        <Knob value={macro.val} color={macro.color} />
      </div>
      <div className="macro-label">{macro.label}</div>
      <div className="macro-val">{Math.round(macro.val * 100)}%</div>
    </div>
  );
}

Object.assign(window, { PerformanceBar });
