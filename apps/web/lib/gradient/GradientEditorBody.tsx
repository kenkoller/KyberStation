'use client';
// ─── GradientEditorBody — visual body of the gradient editor ────────────────
//
// The shared editor surface (color inputs above the bar, the gradient bar
// itself, the triangle markers below, the selected-stop position editor +
// delete button, and the instructions caption). Used by both `<GradientEditor>`
// (inline) and `<GradientEditorPanel>` (CollapsibleSection-wrapped).
//
// Takes the editor state via a single hook return so both shapes consume the
// same source-of-truth state machine.

import type { UseGradientEditorReturn } from './useGradientEditor';
import { rgbToHex } from './colorUtils';

export interface GradientEditorBodyProps {
  editor: UseGradientEditorReturn;
}

export function GradientEditorBody({ editor }: GradientEditorBodyProps) {
  const {
    stops,
    selectedIndex,
    draggingIndex,
    barRef,
    gradientCSS,
    handleBarClick,
    handleStopColorChange,
    handleStopColorClick,
    handleDeleteStop,
    handleStopPointerDown,
    handlePositionInput,
  } = editor;

  return (
    <>
      {/* Stop color inputs positioned above the bar */}
      <div className="relative h-8">
        {stops.map((stop, i) => (
          <div
            key={i}
            className="absolute -translate-x-1/2 flex flex-col items-center"
            style={{ left: `${stop.position * 100}%` }}
            onPointerDown={(e) => handleStopPointerDown(i, e)}
          >
            <input
              type="color"
              value={rgbToHex(stop.color.r, stop.color.g, stop.color.b)}
              onChange={(e) => handleStopColorChange(i, e.target.value)}
              onClick={(e) => handleStopColorClick(i, e)}
              aria-label={`Color for gradient stop ${i + 1}`}
              className={`w-5 h-5 rounded cursor-pointer border-2 bg-transparent ${
                selectedIndex === i ? 'border-accent' : 'border-border-subtle'
              }`}
              style={{ width: '20px', height: '20px' }}
              title={`Stop ${i + 1} — drag to reposition`}
            />
          </div>
        ))}
      </div>

      {/* Gradient bar */}
      <div
        ref={barRef}
        onClick={handleBarClick}
        role="application"
        aria-label="Gradient bar — click to add color stops"
        className={`h-6 rounded border border-border-subtle ${
          draggingIndex !== null ? 'cursor-grabbing' : 'cursor-crosshair'
        }`}
        style={{ background: `linear-gradient(to right, ${gradientCSS})` }}
      />

      {/* Stop markers below the bar */}
      <div className="relative h-3">
        {stops.map((stop, i) => (
          <div
            key={i}
            role="slider"
            aria-label={`Drag handle for gradient stop ${i + 1}`}
            aria-valuenow={Math.round(stop.position * 100)}
            aria-valuemin={0}
            aria-valuemax={100}
            tabIndex={0}
            className="absolute -translate-x-1/2 w-0 h-0 cursor-grab"
            style={{
              left: `${stop.position * 100}%`,
              borderLeft: '4px solid transparent',
              borderRight: '4px solid transparent',
              borderBottom:
                selectedIndex === i
                  ? '6px solid var(--accent)'
                  : '6px solid var(--text-muted, #888)',
            }}
            onPointerDown={(e) => handleStopPointerDown(i, e)}
          />
        ))}
      </div>

      {/* Selected stop details */}
      {selectedIndex !== null && selectedIndex < stops.length && (
        <div className="flex items-center gap-2 bg-bg-primary rounded p-2 border border-border-subtle">
          <span className="text-ui-xs text-text-muted">Position:</span>
          <input
            type="number"
            min={0}
            max={100}
            step={1}
            value={Math.round(stops[selectedIndex].position * 100)}
            onChange={(e) => handlePositionInput(selectedIndex, Number(e.target.value))}
            aria-label="Stop position percent"
            className="w-12 px-1 py-0.5 rounded text-ui-sm bg-bg-deep border border-border-subtle text-text-primary text-center"
          />
          <span className="text-ui-xs text-text-muted">%</span>
          <div className="flex-1" />
          <button
            onClick={() => handleDeleteStop(selectedIndex)}
            disabled={stops.length <= 2}
            aria-label="Delete selected gradient stop"
            className="text-ui-xs px-1.5 py-0.5 rounded border border-border-subtle disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            style={{ color: 'rgb(var(--status-error))' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgb(var(--status-error) / 0.12)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '';
            }}
          >
            Delete
          </button>
        </div>
      )}

      {/* Instructions */}
      <p className="text-ui-xs text-text-muted">
        Click bar to add stops. Drag stops to reposition. Select + Delete to remove (min 2).
      </p>
    </>
  );
}
