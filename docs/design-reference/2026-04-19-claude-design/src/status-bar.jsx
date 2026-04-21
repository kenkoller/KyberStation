/* StatusBar — thin PFD strip. JetBrains Mono throughout. Never moves. */

function StatusBar({ style, auditionState, storageUsed, connection, theme, layerCount, modified }) {
  const [t, setT] = React.useState(0);
  useAnimationFrame(setT);
  const usagePct = Math.round(storageUsed * 100);
  const usageState = storageUsed > 0.9 ? "red" : storageUsed > 0.75 ? "amber" : "green";

  return (
    <div className="statusbar">
      <div className="sb-seg">
        <span className="dot" />
        <span className="k">Profile</span>
        <span className="v">{style.author.toUpperCase()} · {style.name}</span>
      </div>
      <div className="sb-seg">
        <span className="k">Conn</span>
        <span className={"v " + (connection === "OK" ? "green" : "amber")}>{connection === "OK" ? "USB · /dev/proffie0" : "DISCONNECTED"}</span>
      </div>
      <div className="sb-seg">
        <span className="k">Page</span>
        <span className="v amber">DESIGN</span>
      </div>
      <div className="sb-seg">
        <span className="k">Layers</span>
        <span className="v">{layerCount}</span>
      </div>
      <div className="sb-seg">
        <span className="k">Modified</span>
        <span className={"v " + (modified ? "amber" : "")}>{modified ? "●  UNSAVED" : "○  SAVED"}</span>
      </div>
      <div className="sb-seg">
        <span className={"dot " + usageState} />
        <span className="k">Storage</span>
        <span className={"v " + usageState}>{usagePct}% · 12.8 MB / 16 MB</span>
      </div>
      <div className="sb-seg">
        <span className="k">Theme</span>
        <span className="v">{theme}</span>
      </div>
      <div className="sb-seg">
        <span className="k">Preset</span>
        <span className="v cyan">04 / 12 · {auditionState.presetName}</span>
      </div>
      <div className="sb-spacer" />
      <div className="sb-seg">
        <span className="k">UTC</span>
        <span className="v mono">{new Date(performance.timeOrigin + t * 1000).toISOString().slice(11, 19)}</span>
      </div>
      <div className="sb-seg" style={{ borderRight: "none" }}>
        <span className="k">BUILD</span>
        <span className="v mono">v0.9.2-rc4</span>
      </div>
    </div>
  );
}

Object.assign(window, { StatusBar });
