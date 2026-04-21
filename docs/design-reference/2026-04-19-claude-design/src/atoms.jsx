/* Shared atoms: drag-to-scrub numeric, slider, tiny viz primitives, icons. */

const { useState, useEffect, useRef, useCallback, useMemo } = React;

/** Format a 0..1 value as a percent or a raw number depending on `mode`. */
function fmt(val, mode = "pct", precision = 0) {
  if (mode === "pct") return Math.round(val * 100) + "%";
  if (mode === "raw") return Number(val).toFixed(precision);
  if (mode === "ms")  return Math.round(val) + " ms";
  return String(val);
}

/** Drag-to-scrub numeric field (Blender-style). Also click to type. */
function ScrubNum({ value, min = 0, max = 1, step = 0.01, onChange, mode = "pct", precision = 0, unit, className }) {
  const ref = useRef(null);
  const [editing, setEditing] = useState(false);
  const [txt, setTxt] = useState("");

  const onMouseDown = (e) => {
    if (editing) return;
    e.preventDefault();
    const startX = e.clientX;
    const startVal = value;
    const range = max - min;
    const sens = range * 0.004; // px → value
    const move = (ev) => {
      const dx = ev.clientX - startX;
      let next = startVal + dx * sens;
      next = Math.max(min, Math.min(max, next));
      next = Math.round(next / step) * step;
      onChange(next);
    };
    const up = () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  };

  if (editing) {
    return (
      <input
        className={"param-val mono " + (className || "")}
        autoFocus
        value={txt}
        onChange={(e) => setTxt(e.target.value)}
        onBlur={() => {
          const n = parseFloat(txt);
          if (!isNaN(n)) onChange(Math.max(min, Math.min(max, n)));
          setEditing(false);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.target.blur();
          if (e.key === "Escape") setEditing(false);
        }}
      />
    );
  }
  return (
    <span
      ref={ref}
      className={"param-val mono " + (className || "")}
      onMouseDown={onMouseDown}
      onDoubleClick={() => { setEditing(true); setTxt(String(value)); }}
      title="Drag to scrub · Double-click to type"
    >
      {fmt(value, mode, precision)}{unit && <span className="param-unit"> {unit}</span>}
    </span>
  );
}

/** Slider bar that drives the same value as ScrubNum. */
function ParamSlider({ value, min = 0, max = 1, onChange, routeColor }) {
  const ref = useRef(null);
  const pct = ((value - min) / (max - min)) * 100;

  const onPointer = (e) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const update = (cx) => {
      const p = Math.max(0, Math.min(1, (cx - rect.left) / rect.width));
      onChange(min + p * (max - min));
    };
    update(e.clientX);
    const move = (ev) => update(ev.clientX);
    const up = () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  };

  return (
    <div
      ref={ref}
      className={"param-slider" + (routeColor ? " routed" : "")}
      style={routeColor ? { "--route-color": routeColor } : undefined}
      onMouseDown={onPointer}
    >
      <div className="fill" style={{ width: pct + "%" }} />
      <div className="thumb" style={{ left: pct + "%" }} />
    </div>
  );
}

/** Tiny live viz for modulator plates (SVG). */
function ModViz({ kind, color, phase }) {
  // phase: 0..1 running value
  const W = 80, H = 18;
  const pts = [];
  const N = 40;
  for (let i = 0; i < N; i++) {
    const t = i / (N - 1);
    let y = 0.5;
    const p = phase + t * 2;
    if (kind === "LFO")   y = 0.5 + 0.42 * Math.sin(p * Math.PI * 2);
    if (kind === "ENV")   y = 0.5 + 0.42 * (1 - Math.min(1, (t * 3) % 1));
    if (kind === "SIM")   y = 0.5 + 0.32 * Math.sin(p * 8) * Math.sin(p * 2 + t * 4);
    if (kind === "STATE") y = 0.5 + 0.1 * Math.sin(p * 0.6) - 0.22;
    pts.push([t * W, y * H]);
  }
  const d = "M " + pts.map(([x, y]) => x.toFixed(1) + " " + y.toFixed(1)).join(" L ");
  return (
    <svg className="mod-viz" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
      <path d={d} stroke={color} strokeWidth="1" fill="none" opacity="0.85" />
    </svg>
  );
}

/** Knob visual for the PerformanceBar. Arc 225deg sweep. */
function Knob({ value, color, size = 54 }) {
  // arc from -135deg to +135deg around center
  const cx = size / 2, cy = size / 2;
  const r = size * 0.40;
  const startA = -225 * Math.PI / 180;
  const endA   = 45 * Math.PI / 180;
  const valA   = startA + (endA - startA) * value;

  const arc = (a0, a1) => {
    const large = Math.abs(a1 - a0) > Math.PI ? 1 : 0;
    const x0 = cx + r * Math.cos(a0), y0 = cy + r * Math.sin(a0);
    const x1 = cx + r * Math.cos(a1), y1 = cy + r * Math.sin(a1);
    return `M ${x0.toFixed(1)} ${y0.toFixed(1)} A ${r} ${r} 0 ${large} 1 ${x1.toFixed(1)} ${y1.toFixed(1)}`;
  };

  const ind = {
    x1: cx + r * 0.32 * Math.cos(valA),
    y1: cy + r * 0.32 * Math.sin(valA),
    x2: cx + r * 0.92 * Math.cos(valA),
    y2: cy + r * 0.92 * Math.sin(valA),
  };

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <path d={arc(startA, endA)} stroke="#222934" strokeWidth="2" fill="none" strokeLinecap="butt" />
      <path d={arc(startA, valA)} stroke={color || "#c08a3e"} strokeWidth="2" fill="none" strokeLinecap="butt" />
      <circle cx={cx} cy={cy} r={r * 0.62} fill="#141922" stroke="#1a2029" strokeWidth="1" />
      <line x1={ind.x1} y1={ind.y1} x2={ind.x2} y2={ind.y2} stroke={color || "#e8eaee"} strokeWidth="1.5" strokeLinecap="butt" />
    </svg>
  );
}

/** Mini thumbnail of a layer's output (simple stripe pattern). */
function LayerThumb({ color, kind, phase }) {
  // draws a narrow LED strip colored by kind
  const W = 26, H = 22;
  const cells = 14;
  const cellW = W / cells;
  const items = [];
  for (let i = 0; i < cells; i++) {
    const t = i / cells;
    let b = 0.6;
    if (kind === "FLICKER") b = 0.4 + 0.6 * Math.abs(Math.sin((phase + i * 0.21) * 6));
    else if (kind === "CLASH") b = 0.3 + 0.7 * Math.exp(-((phase * 3 + i * 0.2) % 1) * 3);
    else if (kind === "LOCKUP") b = 0.55 + 0.35 * Math.abs(Math.sin((phase + i * 0.3) * 9));
    else if (kind === "DRAG") b = i > cells - 4 ? 0.9 : 0.35;
    else if (kind === "BLAST") b = (phase * 2 + t) % 1 < 0.2 ? 0.95 : 0.35;
    else if (kind === "RETRACT") b = 1 - t * 0.75;
    else if (kind === "STAB") b = 0.6;
    else if (kind === "EFFECT") b = Math.abs(Math.sin(phase * 8 + i)) * 0.9 + 0.1;
    else b = 0.8;
    items.push(
      <rect key={i} x={i * cellW} y={0} width={cellW - 0.4} height={H}
            fill={color} opacity={b} />
    );
  }
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: "100%", height: "100%" }}>
      {items}
    </svg>
  );
}

Object.assign(window, { ScrubNum, ParamSlider, ModViz, Knob, LayerThumb, fmt });
