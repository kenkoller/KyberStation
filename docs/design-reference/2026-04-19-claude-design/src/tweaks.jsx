/* Tweaks — density axis + a couple of extra creative levers. */

function Tweaks({ open, onClose, density, setDensity, bladeHue, setBladeHue, hudMode, setHudMode }) {
  if (!open) return null;
  return (
    <div className="tweaks">
      <div className="tweaks-h">
        Tweaks
        <button className="close mono" onClick={onClose}>×</button>
      </div>
      <div className="tweaks-body">
        <div className="tweak-row">
          <div className="tweak-label">Layer Density</div>
          <div className="tweak-opts">
            {[
              ["ssl", "SSL"],
              ["ableton", "ABLETON"],
              ["mutable", "MUTABLE"],
            ].map(([v, l]) => (
              <div key={v} className={"tweak-opt" + (density === v ? " active" : "")} onClick={() => setDensity(v)}>{l}</div>
            ))}
          </div>
        </div>
        <div className="tweak-row">
          <div className="tweak-label">Blade Hue</div>
          <div className="tweak-opts">
            {[
              ["#ff2a1e", "CRIMSON"],
              ["#3ac3ff", "BLUE"],
              ["#4eff72", "GREEN"],
              ["#b46ac0", "PURPLE"],
            ].map(([v, l]) => (
              <div key={v} className={"tweak-opt" + (bladeHue === v ? " active" : "")} onClick={() => setBladeHue(v)} style={{color: bladeHue === v ? undefined : v}}>{l}</div>
            ))}
          </div>
        </div>
        <div className="tweak-row">
          <div className="tweak-label">HUD Overlay</div>
          <div className="tweak-opts">
            {[
              ["full", "FULL"],
              ["minimal", "MIN"],
              ["off", "OFF"],
            ].map(([v, l]) => (
              <div key={v} className={"tweak-opt" + (hudMode === v ? " active" : "")} onClick={() => setHudMode(v)}>{l}</div>
            ))}
          </div>
        </div>
        <div style={{ fontFamily: "var(--f-mono)", fontSize: 9.5, color: "var(--n-500)", letterSpacing: "0.06em", lineHeight: 1.5, marginTop: 4 }}>
          ⌘K to open palette · SPACE to ignite · S solo · drag-to-scrub on any numeric · hover a modulator to trace its routes.
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { Tweaks });
