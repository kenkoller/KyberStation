/* StylePanel / Inspector — Figma row rhythm + TD density + Blender drag-to-scrub. */

const PARAM_META = {
  // [label, [min,max], mode, unit, routable]
  "base.intensity":     ["Intensity",      [0,1],   "pct", ""],
  "base.huedrift":      ["Hue Drift",      [0,1],   "pct", ""],
  "base.saturation":    ["Saturation",     [0,1],   "pct", ""],
  "flicker.rate":       ["Rate",           [0.1,20],"raw", "Hz", 2],
  "flicker.depth":      ["Depth",          [0,1],   "pct", ""],
  "flicker.falloff":    ["Falloff",        [0,1],   "pct", ""],
  "lockup.spark_density":["Spark Density", [0,1],   "pct", ""],
  "lockup.flare":       ["Flare",          [0,1],   "pct", ""],
  "lockup.temp_shift":  ["Temp Shift",     [0,1],   "pct", ""],
  "blast.radius":       ["Radius",         [0,1],   "pct", ""],
  "blast.decay":        ["Decay",          [20,800],"ms", ""],
  "blast.intensity":    ["Intensity",      [0,1],   "pct", ""],
  "clash.threshold":    ["Threshold",      [0,1],   "pct", ""],
  "clash.duration":     ["Duration",       [40,600],"ms", ""],
  "clash.brightness":   ["Brightness",     [0,1],   "pct", ""],
  "stab.angle_min":     ["Angle Min",      [0,180], "raw","°", 0],
  "stab.duration":      ["Duration",       [40,800],"ms", ""],
  "stab.intensity":     ["Intensity",      [0,1],   "pct", ""],
  "drag.tip_length":    ["Tip Length",     [1,40],  "raw", "LEDs", 0],
  "drag.ember_rate":    ["Ember Rate",     [0,5],   "raw", "/s", 2],
  "drag.spread":        ["Spread",         [0,1],   "pct", ""],
  "blaster.lifetime":   ["Lifetime",       [100,1500],"ms", ""],
  "blaster.speed":      ["Speed",          [0.5,6], "raw", "×", 2],
  "blaster.intensity":  ["Intensity",      [0,1],   "pct", ""],
  "retract.duration":   ["Duration",       [100,1200],"ms", ""],
  "retract.ease":       ["Ease",           null,    "enum",""],
  "retract.afterglow":  ["Afterglow",      [0,500], "ms", ""],
};

function StylePanel({ layers, mods, selectedId, setSelectedId, hotModId, updateLayer }) {
  const layer = layers.find((l) => l.id === selectedId) || layers[0];
  const [tab, setTab] = React.useState("PARAMETERS");
  const [collapsed, setCollapsed] = React.useState({});

  const modulatedByKeys = new Set((layer.modulatedBy || []));
  const modByThis = mods.filter((m) => modulatedByKeys.has(m.id));

  const hotMod = mods.find((m) => m.id === hotModId);

  const paramKey = (k) => `${layer.id}.${k}`;
  const paramRouted = (pKey) => {
    if (!hotMod) return null;
    // Demo routing: if this layer's modulatedBy includes hotMod, highlight that layer's first routable param
    if (layer.modulatedBy && layer.modulatedBy.includes(hotMod.id)) return hotMod.color;
    return null;
  };

  return (
    <div className="panel inspector-panel" style={{ display: "flex", flexDirection: "column" }}>
      <div className="panel-header">
        <div className="panel-title">Inspector</div>
        <div className="panel-count mono">{layer.badge}</div>
        <div className="spacer" />
        <button className="icon-btn" title="Expression">ƒ</button>
        <button className="icon-btn" title="Pin">⇱</button>
        <button className="icon-btn" title="Docs">?</button>
      </div>

      <div className="inspector">
        <div className="insp-hero">
          <div className="eyebrow mono">LAYER · {layer.badge}</div>
          <div className="name">{layer.name}</div>
          <div className="meta mono">
            {layer.type.length > 34 ? layer.type.slice(0, 34) + "…" : layer.type}
            {modByThis.length > 0 && (
              <>
                <span className="sep">·</span>
                {modByThis.map((m, i) => (
                  <React.Fragment key={m.id}>
                    {i > 0 && " "}
                    <span style={{ color: m.color }}>◆ {m.name.split(" · ")[1] || m.name}</span>
                  </React.Fragment>
                ))}
              </>
            )}
          </div>
        </div>

        <div className="insp-tabs">
          {["PARAMETERS", "COLOR", "SHAPE", "ROUTING"].map((x) => (
            <button key={x} className={"insp-tab" + (tab === x ? " active" : "")} onClick={() => setTab(x)}>{x}</button>
          ))}
        </div>

        {tab === "PARAMETERS" && (
          <>
            <Section title="Main" id="main" collapsed={collapsed} setCollapsed={setCollapsed}>
              {Object.entries(layer.params).map(([k, v]) => {
                const key = paramKey(k);
                const meta = PARAM_META[key] || [k, [0, 1], "pct", ""];
                const [label, range, mode, unit] = meta;
                const routeColor = paramRouted(key);
                return (
                  <div className="param-row" key={k}>
                    <div className={"param-label" + (routeColor ? " routed" : "")} style={routeColor ? { "--route-color": routeColor } : undefined}>
                      {label}
                      {routeColor && <span style={{ marginLeft: 5, color: routeColor }}>◆</span>}
                    </div>
                    {typeof v === "number" ? (
                      <ParamSlider
                        value={v}
                        min={range ? range[0] : 0}
                        max={range ? range[1] : 1}
                        onChange={(nv) => updateLayer(layer.id, { params: { ...layer.params, [k]: nv } })}
                        routeColor={routeColor}
                      />
                    ) : (
                      <div style={{
                        fontFamily: "var(--f-mono)", fontSize: 11, color: "var(--n-300)",
                        padding: "0 6px", height: 16, display: "inline-flex", alignItems: "center",
                        background: "var(--n-800)", border: "1px solid var(--hairline-strong)",
                      }}>{v}</div>
                    )}
                    {typeof v === "number" ? (
                      <ScrubNum
                        value={v}
                        min={range ? range[0] : 0}
                        max={range ? range[1] : 1}
                        mode={mode}
                        precision={meta[4] ?? 2}
                        unit={unit}
                        onChange={(nv) => updateLayer(layer.id, { params: { ...layer.params, [k]: nv } })}
                        className={routeColor ? "routed" : ""}
                      />
                    ) : (
                      <span className="param-val mono">{v}</span>
                    )}
                  </div>
                );
              })}
            </Section>

            <Section title="Modulation" id="mod" collapsed={collapsed} setCollapsed={setCollapsed}>
              {modByThis.length === 0 ? (
                <div style={{ padding: "4px 0 4px", fontSize: 11, color: "var(--n-500)", fontFamily: "var(--f-mono)", letterSpacing: "0.02em" }}>
                  — drag a modulator here —
                </div>
              ) : (
                modByThis.map((m) => (
                  <div key={m.id} className="param-row" style={{ "--route-color": m.color }}>
                    <div className="param-label routed">◆ {m.name}</div>
                    <div className="param-slider routed"><div className="fill" style={{ width: "62%" }} /><div className="thumb" style={{ left: "62%" }} /></div>
                    <span className="param-val mono routed">62%</span>
                  </div>
                ))
              )}
              <div style={{ display: "flex", gap: 4, marginTop: 6 }}>
                <button className="bc-btn" style={{ height: 20, fontSize: 9.5, padding: "0 8px" }}>+ LFO</button>
                <button className="bc-btn" style={{ height: 20, fontSize: 9.5, padding: "0 8px" }}>+ ENV</button>
                <button className="bc-btn" style={{ height: 20, fontSize: 9.5, padding: "0 8px" }}>+ SIM</button>
              </div>
            </Section>
          </>
        )}

        {tab === "COLOR" && (
          <>
            <Section title="Color" id="color" collapsed={collapsed} setCollapsed={setCollapsed}>
              <div className="color-row">
                <div className="param-label">Primary</div>
                <div className="color-swatch" style={{ background: layer.color }} />
                <span className="param-val mono">{layer.color.toUpperCase()}</span>
              </div>
              <div className="color-row">
                <div className="param-label">Core</div>
                <div className="color-swatch" style={{ background: "#ffd3cc" }} />
                <span className="param-val mono">#FFD3CC</span>
              </div>
              <div style={{ marginTop: 8 }}>
                <div className="param-label" style={{ marginBottom: 4 }}>Gradient</div>
                <div className="gradient-strip" style={{ background: `linear-gradient(90deg, #1a0000 0%, ${layer.color} 30%, #ffd3cc 70%, #ffffff 100%)` }} />
                <div className="gradient-stops">
                  {[0, 30, 70, 100].map((p, i) => (
                    <div key={i} className="stop" style={{ left: p + "%", "--s-color": ["#1a0000", layer.color, "#ffd3cc", "#ffffff"][i] }} />
                  ))}
                </div>
              </div>
            </Section>
            <Section title="Blend" id="blend" collapsed={collapsed} setCollapsed={setCollapsed}>
              <div className="param-row">
                <div className="param-label">Blend Mode</div>
                <div style={{ fontFamily: "var(--f-mono)", fontSize: 11, color: "var(--n-200)" }}>Layers</div>
                <span></span>
              </div>
              <div className="param-row">
                <div className="param-label">Opacity</div>
                <ParamSlider value={1.0} onChange={() => {}} />
                <span className="param-val mono">100%</span>
              </div>
            </Section>
          </>
        )}

        {tab === "SHAPE" && (
          <Section title="Shape" id="shape" collapsed={collapsed} setCollapsed={setCollapsed}>
            <div className="param-row">
              <div className="param-label">LED Range</div>
              <div style={{ fontFamily: "var(--f-mono)", fontSize: 11, color: "var(--n-200)" }}>0 – 144</div>
              <span className="param-val mono">ALL</span>
            </div>
            <div className="param-row">
              <div className="param-label">Mask</div>
              <div style={{ fontFamily: "var(--f-mono)", fontSize: 11, color: "var(--n-200)" }}>none</div>
              <span></span>
            </div>
          </Section>
        )}

        {tab === "ROUTING" && (
          <Section title="Outbound Routes" id="routing" collapsed={collapsed} setCollapsed={setCollapsed}>
            <div style={{ fontFamily: "var(--f-mono)", fontSize: 10.5, color: "var(--n-400)", lineHeight: 1.7 }}>
              this layer → BladeCanvas.emission<br />
              this layer → CodeOutput.line_{{baseline: 142}['baseline']}<br />
              this layer → OLEDPreview.icon_slot_3
            </div>
          </Section>
        )}
      </div>
    </div>
  );
}

function Section({ title, id, collapsed, setCollapsed, children }) {
  const isCol = !!collapsed[id];
  return (
    <div className={"insp-section" + (isCol ? " collapsed" : "")}>
      <div className="insp-section-h" onClick={() => setCollapsed({ ...collapsed, [id]: !isCol })}>
        <span className="chev">▾</span>
        <span>{title}</span>
      </div>
      <div className="insp-body">{children}</div>
    </div>
  );
}

Object.assign(window, { StylePanel });
