'use client';
import { useState, useCallback, useRef, useEffect } from 'react';

// ─── Sound event types ───

const SOUND_EVENTS = [
  { id: 'hum', label: 'Hum', description: 'Idle hum loop', loop: true },
  { id: 'swing', label: 'Swing', description: 'Swing whoosh', loop: false },
  { id: 'clash', label: 'Clash', description: 'Blade clash impact', loop: false },
  { id: 'blast', label: 'Blast', description: 'Blaster deflection', loop: false },
  { id: 'lockup', label: 'Lockup', description: 'Blade lock sustained', loop: false },
  { id: 'drag', label: 'Drag', description: 'Blade tip drag', loop: false },
  { id: 'melt', label: 'Melt', description: 'Blade melt effect', loop: false },
  { id: 'in', label: 'Ignition', description: 'Ignition sound', loop: false },
  { id: 'out', label: 'Retraction', description: 'Retraction sound', loop: false },
  { id: 'force', label: 'Force', description: 'Force effect', loop: false },
  { id: 'stab', label: 'Stab', description: 'Stab thrust', loop: false },
];

// ─── EQ/Effect filter types for the mixer ───

interface FilterSlider {
  id: string;
  label: string;
  category: 'eq' | 'effects' | 'master';
  min: number;
  max: number;
  step: number;
  default: number;
  unit: string;
}

const MIXER_CONTROLS: FilterSlider[] = [
  // EQ
  { id: 'bass', label: 'Bass', category: 'eq', min: -12, max: 12, step: 0.5, default: 0, unit: 'dB' },
  { id: 'mid', label: 'Mid', category: 'eq', min: -12, max: 12, step: 0.5, default: 0, unit: 'dB' },
  { id: 'treble', label: 'Treble', category: 'eq', min: -12, max: 12, step: 0.5, default: 0, unit: 'dB' },
  // Effects
  { id: 'distortion', label: 'Distortion', category: 'effects', min: 0, max: 100, step: 1, default: 0, unit: '%' },
  { id: 'reverb', label: 'Reverb', category: 'effects', min: 0, max: 100, step: 1, default: 0, unit: '%' },
  { id: 'delay', label: 'Echo/Delay', category: 'effects', min: 0, max: 100, step: 1, default: 0, unit: '%' },
  { id: 'chorus', label: 'Chorus', category: 'effects', min: 0, max: 100, step: 1, default: 0, unit: '%' },
  { id: 'phaser', label: 'Phaser', category: 'effects', min: 0, max: 100, step: 1, default: 0, unit: '%' },
  { id: 'bitcrusher', label: 'Bitcrusher', category: 'effects', min: 0, max: 100, step: 1, default: 0, unit: '%' },
  { id: 'pitchShift', label: 'Pitch Shift', category: 'effects', min: -12, max: 12, step: 0.5, default: 0, unit: 'st' },
  { id: 'compressor', label: 'Compressor', category: 'effects', min: 0, max: 100, step: 1, default: 0, unit: '%' },
  // Master
  { id: 'volume', label: 'Volume', category: 'master', min: 0, max: 100, step: 1, default: 80, unit: '%' },
];

// ─── Preset effect chains ───

const EFFECT_PRESETS = [
  { id: 'clean', label: 'Clean', description: 'No effects, pure sound' },
  { id: 'kylo-unstable', label: 'Kylo Unstable', description: 'Distortion + high-pass crackle' },
  { id: 'cave-echo', label: 'Cave Echo', description: 'Deep reverb + echo' },
  { id: 'lo-fi-retro', label: 'Lo-Fi Retro', description: 'Bitcrusher + low-pass warmth' },
  { id: 'underwater', label: 'Underwater', description: 'Heavy low-pass + chorus' },
  { id: 'force-tunnel', label: 'Force Tunnel', description: 'Phaser + reverb + pitch shift' },
];

// ─── Font folder info ───

interface LoadedFont {
  name: string;
  fileCount: number;
  categories: Record<string, number>;
  files: Array<{ name: string; category: string; path: string }>;
}

// ─── Component ───

export function SoundFontPanel() {
  const [activeSection, setActiveSection] = useState<'fonts' | 'mixer' | 'presets'>('fonts');
  const [loadedFont, setLoadedFont] = useState<LoadedFont | null>(null);
  const [playingEvent, setPlayingEvent] = useState<string | null>(null);
  const [mixerValues, setMixerValues] = useState<Record<string, number>>(() => {
    const defaults: Record<string, number> = {};
    for (const ctrl of MIXER_CONTROLS) {
      defaults[ctrl.id] = ctrl.default;
    }
    return defaults;
  });
  const [activePreset, setActivePreset] = useState<string>('clean');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Initialize AudioContext on first interaction
  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
    }
    return audioContextRef.current;
  }, []);

  // Handle font folder import via drag-drop or file picker
  const handleFontImport = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const categories: Record<string, number> = {};
    const fontFiles: Array<{ name: string; category: string; path: string }> = [];

    for (const file of Array.from(files)) {
      const name = file.name.toLowerCase();
      let category = 'unknown';

      // Auto-detect category from filename patterns
      if (name.startsWith('hum') || name.includes('/hum')) category = 'hum';
      else if (name.match(/^swng|swing|swingl|swingh/)) category = 'swing';
      else if (name.match(/^clsh|clash/)) category = 'clash';
      else if (name.match(/^blst|blast/)) category = 'blast';
      else if (name.match(/^lock/)) category = 'lockup';
      else if (name.match(/^drag/)) category = 'drag';
      else if (name.match(/^melt/)) category = 'melt';
      else if (name.match(/^in\d|^poweron/)) category = 'in';
      else if (name.match(/^out\d|^poweroff/)) category = 'out';
      else if (name.match(/^force/)) category = 'force';
      else if (name.match(/^stab/)) category = 'stab';
      else if (name.match(/^boot/)) category = 'boot';
      else if (name.match(/^font/)) category = 'font';
      else if (name.match(/^track/)) category = 'track';
      else if (name.match(/^quote/)) category = 'quote';
      else if (name.match(/^ccbegin/)) category = 'ccbegin';
      else if (name.match(/^ccend/)) category = 'ccend';

      categories[category] = (categories[category] ?? 0) + 1;
      fontFiles.push({ name: file.name, category, path: file.webkitRelativePath || file.name });
    }

    // Extract font name from folder path or first file
    const firstPath = fontFiles[0]?.path ?? 'Unknown';
    const fontName = firstPath.includes('/') ? firstPath.split('/')[0] : 'Imported Font';

    setLoadedFont({
      name: fontName,
      fileCount: fontFiles.length,
      categories,
      files: fontFiles,
    });
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    handleFontImport(e.dataTransfer.files);
  }, [handleFontImport]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  // Simulate playing a sound event
  const handlePlayEvent = useCallback((eventId: string) => {
    if (playingEvent === eventId) {
      setPlayingEvent(null);
      return;
    }
    getAudioContext(); // Ensure context exists
    setPlayingEvent(eventId);
    // Auto-stop after a brief duration for non-looping sounds
    const event = SOUND_EVENTS.find(e => e.id === eventId);
    if (event && !event.loop) {
      setTimeout(() => setPlayingEvent(null), 1500);
    }
  }, [playingEvent, getAudioContext]);

  const handleMixerChange = useCallback((id: string, value: number) => {
    setMixerValues(prev => ({ ...prev, [id]: value }));
  }, []);

  const handlePresetSelect = useCallback((presetId: string) => {
    setActivePreset(presetId);
    // Reset mixer to defaults then apply preset
    const defaults: Record<string, number> = {};
    for (const ctrl of MIXER_CONTROLS) {
      defaults[ctrl.id] = ctrl.default;
    }

    switch (presetId) {
      case 'kylo-unstable':
        defaults.distortion = 60;
        defaults.treble = 4;
        defaults.bass = -3;
        break;
      case 'cave-echo':
        defaults.reverb = 80;
        defaults.delay = 50;
        defaults.bass = 3;
        break;
      case 'lo-fi-retro':
        defaults.bitcrusher = 70;
        defaults.treble = -6;
        defaults.bass = 2;
        break;
      case 'underwater':
        defaults.treble = -10;
        defaults.bass = 6;
        defaults.chorus = 40;
        break;
      case 'force-tunnel':
        defaults.phaser = 60;
        defaults.reverb = 50;
        defaults.pitchShift = -2;
        break;
    }

    setMixerValues(defaults);
  }, []);

  // Clean up audio context
  useEffect(() => {
    return () => {
      audioContextRef.current?.close();
    };
  }, []);

  return (
    <div className="space-y-4">
      {/* Section tabs */}
      <div className="flex gap-1">
        {(['fonts', 'mixer', 'presets'] as const).map((section) => (
          <button
            key={section}
            onClick={() => setActiveSection(section)}
            className={`px-3 py-1 rounded text-[10px] font-medium border transition-colors capitalize ${
              activeSection === section
                ? 'border-accent bg-accent-dim text-accent'
                : 'border-border-subtle text-text-muted hover:text-text-secondary'
            }`}
          >
            {section === 'fonts' ? 'Sound Fonts' : section === 'mixer' ? 'EQ / Effects' : 'Effect Presets'}
          </button>
        ))}
      </div>

      {/* ── Sound Fonts Section ── */}
      {activeSection === 'fonts' && (
        <div className="space-y-4">
          {/* Font import */}
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            className="border-2 border-dashed border-border-subtle rounded-panel p-4 text-center hover:border-accent/50 transition-colors cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              // @ts-expect-error - webkitdirectory is a non-standard attribute
              webkitdirectory=""
              multiple
              className="hidden"
              onChange={(e) => handleFontImport(e.target.files)}
            />
            <div className="text-text-muted text-xs">
              {loadedFont ? (
                <>
                  <span className="text-accent font-medium">{loadedFont.name}</span>
                  <span className="text-text-muted"> ({loadedFont.fileCount} files)</span>
                </>
              ) : (
                'Drop font folder here or click to browse'
              )}
            </div>
          </div>

          {/* Font details */}
          {loadedFont && (
            <div className="bg-bg-surface rounded-panel p-3 border border-border-subtle">
              <h4 className="text-[10px] text-accent uppercase tracking-widest font-semibold mb-2">
                Font Contents
              </h4>
              <div className="grid grid-cols-3 gap-1.5 text-[10px]">
                {Object.entries(loadedFont.categories)
                  .filter(([, count]) => count > 0)
                  .sort(([, a], [, b]) => b - a)
                  .map(([category, count]) => (
                    <div key={category} className="flex items-center justify-between bg-bg-deep rounded px-2 py-1">
                      <span className="text-text-secondary capitalize">{category}</span>
                      <span className="text-text-muted">{count}</span>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Sound event playback */}
          <div>
            <h4 className="text-[10px] text-accent uppercase tracking-widest font-semibold mb-2">
              Sound Events
            </h4>
            <div className="grid grid-cols-2 gap-1.5">
              {SOUND_EVENTS.map((event) => {
                const isPlaying = playingEvent === event.id;
                const hasSound = loadedFont ? (loadedFont.categories[event.id] ?? 0) > 0 : false;
                return (
                  <button
                    key={event.id}
                    onClick={() => handlePlayEvent(event.id)}
                    disabled={!loadedFont || !hasSound}
                    className={`flex items-center gap-2 px-2 py-1.5 rounded text-[10px] border transition-colors ${
                      isPlaying
                        ? 'border-green-500/50 bg-green-900/20 text-green-400'
                        : hasSound
                          ? 'border-border-subtle bg-bg-surface text-text-secondary hover:border-accent'
                          : 'border-border-subtle bg-bg-deep text-text-muted opacity-40 cursor-not-allowed'
                    }`}
                  >
                    <span className="text-[12px]">{isPlaying ? '\u25A0' : '\u25B6'}</span>
                    <span>{event.label}</span>
                    {event.loop && <span className="text-text-muted text-[8px]">LOOP</span>}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── EQ / Effects Mixer ── */}
      {activeSection === 'mixer' && (
        <div className="space-y-4">
          {/* EQ Section */}
          <div>
            <h4 className="text-[10px] text-accent uppercase tracking-widest font-semibold mb-2">
              Equalizer
            </h4>
            <div className="space-y-2 bg-bg-surface rounded-panel p-3 border border-border-subtle">
              {MIXER_CONTROLS.filter(c => c.category === 'eq').map((ctrl) => (
                <div key={ctrl.id} className="flex items-center gap-2">
                  <label className="text-[10px] text-text-secondary w-12">{ctrl.label}</label>
                  <input
                    type="range"
                    min={ctrl.min}
                    max={ctrl.max}
                    step={ctrl.step}
                    value={mixerValues[ctrl.id] ?? ctrl.default}
                    onChange={(e) => handleMixerChange(ctrl.id, Number(e.target.value))}
                    className="flex-1"
                  />
                  <span className="text-[10px] text-text-muted font-mono w-14 text-right">
                    {(mixerValues[ctrl.id] ?? ctrl.default) > 0 ? '+' : ''}{mixerValues[ctrl.id] ?? ctrl.default}{ctrl.unit}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Effects Section */}
          <div>
            <h4 className="text-[10px] text-accent uppercase tracking-widest font-semibold mb-2">
              Effects
            </h4>
            <div className="space-y-2 bg-bg-surface rounded-panel p-3 border border-border-subtle">
              {MIXER_CONTROLS.filter(c => c.category === 'effects').map((ctrl) => (
                <div key={ctrl.id} className="flex items-center gap-2">
                  <label className="text-[10px] text-text-secondary w-16 shrink-0">{ctrl.label}</label>
                  <input
                    type="range"
                    min={ctrl.min}
                    max={ctrl.max}
                    step={ctrl.step}
                    value={mixerValues[ctrl.id] ?? ctrl.default}
                    onChange={(e) => handleMixerChange(ctrl.id, Number(e.target.value))}
                    className="flex-1"
                  />
                  <span className="text-[10px] text-text-muted font-mono w-12 text-right">
                    {mixerValues[ctrl.id] ?? ctrl.default}{ctrl.unit}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Master Section */}
          <div>
            <h4 className="text-[10px] text-accent uppercase tracking-widest font-semibold mb-2">
              Master
            </h4>
            <div className="bg-bg-surface rounded-panel p-3 border border-border-subtle">
              {MIXER_CONTROLS.filter(c => c.category === 'master').map((ctrl) => (
                <div key={ctrl.id} className="flex items-center gap-2">
                  <label className="text-[10px] text-text-secondary w-12">{ctrl.label}</label>
                  <input
                    type="range"
                    min={ctrl.min}
                    max={ctrl.max}
                    step={ctrl.step}
                    value={mixerValues[ctrl.id] ?? ctrl.default}
                    onChange={(e) => handleMixerChange(ctrl.id, Number(e.target.value))}
                    className="flex-1"
                  />
                  <span className="text-[10px] text-text-muted font-mono w-12 text-right">
                    {mixerValues[ctrl.id] ?? ctrl.default}{ctrl.unit}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Effect Presets ── */}
      {activeSection === 'presets' && (
        <div className="space-y-3">
          <h4 className="text-[10px] text-accent uppercase tracking-widest font-semibold mb-2">
            Effect Chain Presets
          </h4>
          <div className="grid grid-cols-1 gap-2">
            {EFFECT_PRESETS.map((preset) => {
              const isActive = activePreset === preset.id;
              return (
                <button
                  key={preset.id}
                  onClick={() => handlePresetSelect(preset.id)}
                  className={`text-left px-3 py-2.5 rounded text-xs transition-colors border ${
                    isActive
                      ? 'border-accent bg-accent-dim text-accent'
                      : 'border-border-subtle bg-bg-surface text-text-secondary hover:border-border-light'
                  }`}
                >
                  <div className="font-medium">{preset.label}</div>
                  <div className="text-[10px] text-text-muted mt-0.5">{preset.description}</div>
                </button>
              );
            })}
          </div>

          {/* Current mixer state summary */}
          <div className="bg-bg-surface rounded-panel p-3 border border-border-subtle">
            <h4 className="text-[10px] text-accent uppercase tracking-widest font-semibold mb-2">
              Active Effects
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {MIXER_CONTROLS.filter(c => {
                const val = mixerValues[c.id] ?? c.default;
                return val !== c.default;
              }).map((ctrl) => (
                <span key={ctrl.id} className="px-2 py-0.5 rounded-full bg-accent-dim text-accent text-[10px] border border-accent/30">
                  {ctrl.label}: {mixerValues[ctrl.id]}{ctrl.unit}
                </span>
              ))}
              {MIXER_CONTROLS.every(c => (mixerValues[c.id] ?? c.default) === c.default) && (
                <span className="text-[10px] text-text-muted">No effects active</span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
