/* ⌘K Command Palette — Raycast two-level (group → action). */

function Palette({ open, onClose, onRun }) {
  const [q, setQ] = React.useState("");
  const [activeIdx, setActiveIdx] = React.useState(0);

  React.useEffect(() => { if (open) { setQ(""); setActiveIdx(0); } }, [open]);

  const groups = React.useMemo(() => {
    const needle = q.trim().toLowerCase();
    return window.PALETTE_COMMANDS.map(g => ({
      ...g,
      cmds: g.cmds.filter(c => !needle || c.title.toLowerCase().includes(needle) || (c.subtitle || "").toLowerCase().includes(needle)),
    })).filter(g => g.cmds.length > 0);
  }, [q]);

  const flat = React.useMemo(() => {
    const out = [];
    groups.forEach(g => g.cmds.forEach(c => out.push({ group: g.group, ...c })));
    return out;
  }, [groups]);

  React.useEffect(() => {
    if (!open) return;
    const h = (e) => {
      if (e.key === "Escape") { onClose(); return; }
      if (e.key === "ArrowDown") { e.preventDefault(); setActiveIdx(i => Math.min(flat.length - 1, i + 1)); }
      else if (e.key === "ArrowUp") { e.preventDefault(); setActiveIdx(i => Math.max(0, i - 1)); }
      else if (e.key === "Enter") {
        e.preventDefault();
        const c = flat[activeIdx];
        if (c) { onRun(c); onClose(); }
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, flat, activeIdx, onClose, onRun]);

  if (!open) return null;

  let cursor = 0;
  return (
    <div className="palette-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="palette" onMouseDown={(e) => e.stopPropagation()}>
        <div className="palette-input-row">
          <span className="palette-crumb mono">KYBERSTATION</span>
          <input
            className="palette-input"
            autoFocus
            placeholder="Type a command, search layers, modulators, presets…"
            value={q}
            onChange={(e) => { setQ(e.target.value); setActiveIdx(0); }}
          />
          <span className="mono" style={{ fontSize: 10, color: "var(--n-500)", letterSpacing: "0.1em" }}>
            {flat.length} RESULTS
          </span>
        </div>
        <div className="palette-results">
          {groups.map(g => (
            <div key={g.group}>
              <div className="palette-group-h">{g.group}</div>
              {g.cmds.map(c => {
                const myIdx = cursor++;
                const active = myIdx === activeIdx;
                return (
                  <div
                    key={c.id}
                    className={"palette-item" + (active ? " active" : "")}
                    onMouseEnter={() => setActiveIdx(myIdx)}
                    onClick={() => { onRun(c); onClose(); }}
                  >
                    <div className="ico mono">{c.ico}</div>
                    <div>
                      <div className="title">{c.title}</div>
                      {c.subtitle && <div className="subtitle mono">{c.subtitle}</div>}
                    </div>
                    <div></div>
                    {c.kbd && <div className="kbd-hint mono">{c.kbd}</div>}
                  </div>
                );
              })}
            </div>
          ))}
          {flat.length === 0 && (
            <div style={{ padding: 24, textAlign: "center", color: "var(--n-500)", fontFamily: "var(--f-mono)", fontSize: 11 }}>
              No commands match "{q}"
            </div>
          )}
        </div>
        <div className="palette-footer">
          <div className="group"><kbd>↑↓</kbd> navigate</div>
          <div className="group"><kbd>↵</kbd> run</div>
          <div className="group"><kbd>ESC</kbd> close</div>
          <div style={{ flex: 1 }} />
          <div className="group">KyberStation · ⌘K</div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { Palette });
