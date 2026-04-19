/* BladeCanvas — hero. Emissive blade, ambient breathing, HUD overlays. */

function useAnimationFrame(fn) {
  const fnRef = React.useRef(fn);
  fnRef.current = fn;
  React.useEffect(() => {
    let raf;
    let start = performance.now();
    const loop = (t) => {
      fnRef.current((t - start) / 1000);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);
}

function BladeCanvas({ style, auditionState, onIgnite, onClash, onLockup, onBlast }) {
  const [t, setT] = React.useState(0);
  useAnimationFrame(setT);

  // Flicker envelope + critical events
  const baseIntensity = 0.9 + 0.08 * Math.sin(t * 2.3) + 0.04 * Math.sin(t * 11.7);
  const flicker = 0.7 + 0.3 * Math.sin(t * 34) * Math.sin(t * 7.2);
  const clashPulse = auditionState.lastClash != null
    ? Math.max(0, 1 - (t - auditionState.lastClash) * 4)
    : 0;

  const intensity = auditionState.ignited
    ? Math.min(1.2, baseIntensity * flicker + clashPulse * 0.8)
    : 0;

  const color = style.blade.color;

  // LED strip visualization
  const LED_N = 56;
  const leds = [];
  for (let i = 0; i < LED_N; i++) {
    const tPos = i / LED_N;
    let b = auditionState.ignited ? intensity : 0;
    // flicker unstable
    b *= 0.7 + 0.4 * Math.abs(Math.sin(t * 22 + i * 1.3));
    // clash flashes from random center
    if (clashPulse > 0) {
      const d = Math.abs(tPos - (auditionState.clashCenter ?? 0.5));
      b += clashPulse * Math.exp(-d * 8) * 1.2;
    }
    // ignite sweep
    if (auditionState.igniteT != null) {
      const igT = (t - auditionState.igniteT) / 0.55;
      if (igT < 1) b *= tPos < igT ? 1 : 0;
    }
    b = Math.max(0, Math.min(1.4, b));
    leds.push(b);
  }

  const igniteT = auditionState.igniteT ?? -9;
  const igProgress = Math.min(1, Math.max(0, (t - igniteT) / 0.55));
  const visible = auditionState.ignited;

  return (
    <div className="blade-frame">
      <div className="blade-stage">
        {/* HUD TL */}
        <div className="hud tl">
          <div><span className="label">STYLE</span>&nbsp;<span className="val">{style.name}</span></div>
          <div><span className="label">AUTHOR</span>&nbsp;<span className="val mono">{style.author}</span> <span style={{color:"var(--n-600)"}}>·</span> <span className="val mono">v{style.version}</span></div>
          <div><span className="label">PROFFIE</span>&nbsp;<span className="val mono">{style.proffieVersion}</span></div>
        </div>

        {/* HUD TR */}
        <div className="hud tr">
          <div><span className="label">LEDS</span>&nbsp;<span className="val mono">{style.blade.leds}</span> <span className="val mono" style={{color:"var(--n-500)"}}>·</span> <span className="val mono">{style.blade.type}</span></div>
          <div><span className="label">LEN</span>&nbsp;<span className="val mono">{style.blade.length}</span></div>
          <div><span className="label">DRAW</span>&nbsp;<span className="val mono amber">{(1.82 + Math.sin(t*0.9)*0.08).toFixed(2)} A</span></div>
          <div><span className="label">TEMP</span>&nbsp;<span className="val mono cyan">{(38 + Math.sin(t*0.3)*2).toFixed(1)} °C</span></div>
        </div>

        {/* HUD BL */}
        <div className="hud bl">
          <div><span className="label">MODE</span>&nbsp;<span className="val">DESIGN</span></div>
          <div><span className="label">AUDITION</span>&nbsp;<span className={"val " + (visible ? "green" : "")}>{visible ? "IGNITED" : "STANDBY"}</span></div>
        </div>

        {/* HUD BR */}
        <div className="hud br">
          <div><span className="label">FPS</span>&nbsp;<span className="val mono">{Math.round(60 - Math.abs(Math.sin(t*3))*2)}</span></div>
          <div><span className="label">RMS</span>&nbsp;<span className="val mono">{(0.42 + Math.sin(t*4.7)*0.1).toFixed(3)}</span></div>
          <div><span className="label">PWM</span>&nbsp;<span className="val mono">{(auditionState.ignited ? 0.82 + Math.sin(t*6)*0.12 : 0).toFixed(2)}</span></div>
        </div>

        {/* crosshair markers — corners */}
        <div className="hud-crosshair" style={{ top: 34, left: 34 }} />
        <div className="hud-crosshair" style={{ top: 34, right: 34 }} />
        <div className="hud-crosshair" style={{ bottom: 34, left: 34 }} />
        <div className="hud-crosshair" style={{ bottom: 34, right: 34 }} />

        {/* Blade scene */}
        <div className="blade-wrap">
          <div className="blade-scene">
            {/* Hilt */}
            <div className="hilt">
              <div className="ring" />
              <div className="ring" />
              <div className="ring" />
            </div>

            {/* The emissive blade */}
            {visible && (
              <div
                className="blade"
                style={{
                  ["--blade-color"]: color,
                  opacity: Math.min(1, intensity),
                  filter: `brightness(${0.7 + intensity * 0.4})`,
                  clipPath: igProgress < 1 ? `inset(0 ${(1 - igProgress) * 100}% 0 0)` : "none",
                }}
              />
            )}

            {/* LED strip overlay showing per-LED activity */}
            <div className="led-strip" style={{ top: "calc(50% - 18px)", left: "calc(6% + 92px)", right: "4%" }}>
              {leds.map((b, i) => (
                <div
                  key={i}
                  className="led"
                  style={{
                    background: b > 0.05
                      ? `color-mix(in oklch, ${color} ${Math.min(100, 40 + b*60)}%, transparent)`
                      : "var(--n-800)",
                    opacity: 0.4 + b * 0.6,
                  }}
                />
              ))}
            </div>

            {/* Telemetry curve (Expanse-style small sparkline bottom-right of scene) */}
            <svg style={{ position: "absolute", bottom: -6, right: 0, width: 180, height: 32 }} viewBox="0 0 180 32" preserveAspectRatio="none">
              {(() => {
                const pts = [];
                for (let i = 0; i < 60; i++) {
                  const x = i * 3;
                  const y = 16 + Math.sin(t * 4 - i * 0.3) * 6 + Math.sin(t * 11 - i * 0.1) * 3;
                  pts.push(`${x},${y.toFixed(1)}`);
                }
                return <polyline points={pts.join(" ")} fill="none" stroke="var(--status-cyan)" strokeWidth="1" opacity="0.7" />;
              })()}
            </svg>

            {/* Center bottom label — BR2049 filename reveal (static) */}
            <div style={{
              position: "absolute",
              bottom: 18,
              left: "50%",
              transform: "translateX(-50%)",
              fontFamily: "var(--f-mono)",
              fontSize: 11,
              letterSpacing: "0.28em",
              color: "var(--n-500)",
              textTransform: "uppercase",
            }}>
              { "/styles/" + style.name.toLowerCase().replace(/\s+/g, "_") + ".style" }
            </div>
          </div>
        </div>
      </div>

      {/* Blade controls — audition strip */}
      <div className="blade-controls">
        <button className="bc-btn primary" onClick={onIgnite}>
          {visible ? "RETRACT" : "IGNITE"} <span className="kbd">SPACE</span>
        </button>
        <button className="bc-btn" onClick={onClash}>CLASH <span className="kbd">C</span></button>
        <button className="bc-btn" onClick={onLockup}>{auditionState.lockup ? "RELEASE" : "LOCKUP"} <span className="kbd">L</span></button>
        <button className="bc-btn" onClick={onBlast}>BLAST <span className="kbd">B</span></button>

        <div style={{ flex: 1 }} />

        <div className="bc-group">
          <span className="bc-dot" />
          <span className="bc-label">LIVE</span>
        </div>
        <div className="bc-group">
          <span className="bc-label">OVERLAY</span>
          <span className="bc-val">TELEMETRY</span>
        </div>
        <div className="bc-group">
          <span className="bc-label">Z</span>
          <span className="bc-val mono">1.0×</span>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { BladeCanvas, useAnimationFrame });
