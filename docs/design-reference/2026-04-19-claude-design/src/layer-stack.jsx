/* LayerStack — Ableton device chain + SSL strip discipline + Mutable typographic restraint.
 * Modulator plates live inline as first-class citizens (Bitwig).
 */

function LayerStack({
  layers, mods, selectedId, setSelectedId,
  soloId, setSoloId, mutedIds, setMutedIds, bypassedIds, setBypassedIds,
  onReorder, hotModId, setHotModId,
}) {
  const [t, setT] = React.useState(0);
  useAnimationFrame(setT);

  const toggleSet = (set, id, setter) => {
    const next = new Set(set);
    if (next.has(id)) next.delete(id); else next.add(id);
    setter(next);
  };

  // Drag reorder
  const [drag, setDrag] = React.useState(null); // {fromIdx, overIdx}

  const onLayerDragStart = (idx) => (e) => {
    setDrag({ fromIdx: idx, overIdx: idx });
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(idx));
  };
  const onLayerDragOver = (idx) => (e) => {
    e.preventDefault();
    if (drag) setDrag({ ...drag, overIdx: idx });
  };
  const onLayerDrop = (idx) => (e) => {
    e.preventDefault();
    if (!drag) return;
    onReorder(drag.fromIdx, idx);
    setDrag(null);
  };

  return (
    <div className="panel">
      <div className="panel-header">
        <div className="panel-title">Layer Stack</div>
        <div className="panel-count mono">{layers.length} · {mods.length} MODS</div>
        <div className="spacer" />
        <button className="icon-btn" title="Collapse all">⌄</button>
        <button className="icon-btn" title="Add layer">+</button>
      </div>

      <div className="layer-stack">
        <div className="stack-section">
          <span>Layers</span>
          <span className="count">· {layers.length}</span>
          <button className="add-btn" title="Add Layer">＋ ADD</button>
        </div>

        {layers.map((l, idx) => {
          const isSoloActive = soloId != null;
          const isSoloed = soloId === l.id;
          const isSoloedOut = isSoloActive && !isSoloed;
          const isMuted = mutedIds.has(l.id);
          const isBypassed = bypassedIds.has(l.id);
          const selected = selectedId === l.id;
          const modBy = (l.modulatedBy || [])[0];
          const modColor = modBy ? window.MOD_COLORS[modBy] : null;
          const kindKey = (l.badge || "").toUpperCase();

          return (
            <React.Fragment key={l.id}>
              <div
                className={
                  "layer-row" +
                  (selected ? " selected" : "") +
                  (isBypassed || isMuted ? " bypassed" : "") +
                  (isSoloedOut ? " soloed-out" : "")
                }
                draggable
                onDragStart={onLayerDragStart(idx)}
                onDragOver={onLayerDragOver(idx)}
                onDrop={onLayerDrop(idx)}
                onClick={() => setSelectedId(l.id)}
              >
                <div className="layer-handle mono">⁝⁝</div>
                <div className="layer-thumb">
                  <LayerThumb color={l.color} kind={kindKey} phase={t * 0.4} />
                </div>
                <div className="layer-body">
                  <div className="layer-name" style={modColor ? { color: modColor } : undefined}>
                    {l.name}
                  </div>
                  <div className="layer-meta mono">
                    <span className="type-badge">{l.badge}</span>
                    <span>{l.type}</span>
                  </div>
                </div>
                <div className="layer-controls">
                  <button
                    className={"layer-btn solo" + (isSoloed ? " on" : "")}
                    onClick={(e) => { e.stopPropagation(); setSoloId(isSoloed ? null : l.id); }}
                    title="Solo (S)"
                  >S</button>
                  <button
                    className={"layer-btn mute" + (isMuted ? " on" : "")}
                    onClick={(e) => { e.stopPropagation(); toggleSet(mutedIds, l.id, setMutedIds); }}
                    title="Mute"
                  >M</button>
                  <button
                    className={"layer-btn bypass" + (isBypassed ? " on" : "")}
                    onClick={(e) => { e.stopPropagation(); toggleSet(bypassedIds, l.id, setBypassedIds); }}
                    title="Bypass"
                  >B</button>
                </div>
              </div>
            </React.Fragment>
          );
        })}

        <div className="stack-section">
          <span>Modulators</span>
          <span className="count">· {mods.length}</span>
          <button className="add-btn" title="Add Modulator">＋ ADD</button>
        </div>

        {mods.map((m) => {
          const isHot = hotModId === m.id;
          return (
            <div
              key={m.id}
              className={"mod-row" + (isHot ? " hot" : "")}
              style={{ "--mod-color": m.color }}
              onMouseEnter={() => setHotModId(m.id)}
              onMouseLeave={() => setHotModId(null)}
            >
              <div className="layer-handle mono">⁝⁝</div>
              <div className="mod-name" style={{ color: m.color }}>{m.name}</div>
              <ModViz kind={m.kind} color={m.color} phase={t * (m.kind === "LFO" ? 0.8 : 0.4)} />
              <div className="mod-target mono" style={{ color: m.color, opacity: 0.9 }}>
                {m.kind === "LFO" ? m.rate : m.kind === "ENV" ? (m.attack + " · " + m.decay) : m.kind === "SIM" ? m.source : m.source}
              </div>
            </div>
          );
        })}

        <div style={{ padding: "12px 12px 24px", fontFamily: "var(--f-mono)", fontSize: 10, color: "var(--n-500)", letterSpacing: "0.1em" }}>
          <div style={{ opacity: 0.5 }}>— end of chain —</div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { LayerStack });
