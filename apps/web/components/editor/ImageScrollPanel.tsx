'use client';
import { useState, useCallback, useRef } from 'react';
import { useBladeStore } from '@/stores/bladeStore';

const SCROLL_DIRECTIONS = [
  { id: 'left-to-right', label: 'L\u2192R' },
  { id: 'right-to-left', label: 'R\u2192L' },
  { id: 'bidirectional', label: 'Bi' },
] as const;

const REPEAT_MODES = [
  { id: 'once', label: 'Once' },
  { id: 'loop', label: 'Loop' },
  { id: 'pingpong', label: 'Ping-Pong' },
] as const;

export function ImageScrollPanel() {
  const config = useBladeStore((s) => s.config);
  const updateConfig = useBladeStore((s) => s.updateConfig);

  const imageWidth = (config.imageWidth as number) ?? 0;
  const imageHeight = (config.imageHeight as number) ?? 0;
  const scrollSpeed = (config.scrollSpeed as number) ?? 30;
  const scrollDirection = (config.scrollDirection as string) ?? 'left-to-right';
  const repeatMode = (config.scrollRepeatMode as string) ?? 'loop';
  const hasImage = imageWidth > 0 && imageHeight > 0;

  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setUploading(true);

      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          // Auto-resize image height to match LED count
          const targetHeight = config.ledCount ?? 144;
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = targetHeight;
          const ctx = canvas.getContext('2d')!;

          // Draw image scaled to blade LED count height
          ctx.drawImage(img, 0, 0, img.width, targetHeight);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

          // Extract RGB data (skip alpha)
          const rgbData = new Uint8Array(canvas.width * canvas.height * 3);
          for (let i = 0; i < canvas.width * canvas.height; i++) {
            rgbData[i * 3] = imageData.data[i * 4];
            rgbData[i * 3 + 1] = imageData.data[i * 4 + 1];
            rgbData[i * 3 + 2] = imageData.data[i * 4 + 2];
          }

          updateConfig({
            imageData: rgbData,
            imageWidth: canvas.width,
            imageHeight: targetHeight,
          });

          // Create preview thumbnail
          const previewCanvas = document.createElement('canvas');
          previewCanvas.width = Math.min(200, img.width);
          previewCanvas.height = Math.round(
            (previewCanvas.width / img.width) * targetHeight,
          );
          const pCtx = previewCanvas.getContext('2d')!;
          pCtx.drawImage(
            canvas,
            0,
            0,
            previewCanvas.width,
            previewCanvas.height,
          );
          setPreview(previewCanvas.toDataURL());
          setUploading(false);
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    },
    [config.ledCount, updateConfig],
  );

  const handleClear = useCallback(() => {
    updateConfig({
      imageData: undefined,
      imageWidth: undefined,
      imageHeight: undefined,
    });
    setPreview(null);
    if (fileRef.current) fileRef.current.value = '';
  }, [updateConfig]);

  const scrollDuration =
    imageWidth > 0 && scrollSpeed > 0
      ? (imageWidth / scrollSpeed).toFixed(1)
      : '0';

  return (
    <div className="space-y-2">
      <h4 className="text-ui-sm text-text-muted uppercase tracking-wider">
        Image Scroll (Light Painting)
      </h4>

      {/* Upload area */}
      <div className="bg-bg-primary rounded p-2 border border-border-subtle">
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/gif,image/webp"
          onChange={handleFileUpload}
          className="hidden"
          aria-label="Upload image for scroll"
        />
        {!hasImage ? (
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="w-full py-4 border-2 border-dashed border-border-subtle rounded text-text-muted hover:border-accent/40 hover:text-accent transition-colors text-ui-base"
          >
            {uploading ? 'Processing...' : 'Drop image or click to upload'}
          </button>
        ) : (
          <div className="space-y-2">
            {/* Image preview */}
            {preview && (
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={preview}
                  alt="Scroll image preview"
                  className="w-full h-auto rounded border border-border-subtle"
                />
                <div className="absolute top-1 right-1 flex gap-1">
                  <button
                    onClick={() => fileRef.current?.click()}
                    className="text-ui-xs px-1.5 py-0.5 rounded bg-bg-deep/80 border border-border-subtle text-text-muted hover:text-accent transition-colors"
                    aria-label="Replace scroll image"
                  >
                    Replace
                  </button>
                  <button
                    onClick={handleClear}
                    className="text-ui-xs px-1.5 py-0.5 rounded bg-bg-deep/80 border border-border-subtle text-red-400 hover:bg-red-900/20 transition-colors"
                    aria-label="Clear scroll image"
                  >
                    Clear
                  </button>
                </div>
              </div>
            )}

            {/* Image info */}
            <div className="flex items-center gap-2 text-ui-xs text-text-muted">
              <span>
                {imageWidth} x {imageHeight}px
              </span>
              <span>|</span>
              <span>
                Scroll duration: {scrollDuration}s
              </span>
              {imageHeight !== (config.ledCount ?? 144) && (
                <>
                  <span>|</span>
                  <span className="text-yellow-400">
                    Height adapted to {config.ledCount ?? 144} LEDs
                  </span>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Scroll controls */}
      <div className="space-y-2 bg-bg-primary rounded p-2 border border-border-subtle">
        {/* Speed */}
        <div className="flex items-center gap-2">
          <span className="text-ui-xs text-text-muted w-12">Speed:</span>
          <input
            type="range"
            min={1}
            max={120}
            step={1}
            value={scrollSpeed}
            onChange={(e) =>
              updateConfig({ scrollSpeed: Number(e.target.value) })
            }
            className="flex-1"
            aria-label="Scroll speed"
            aria-valuemin={1}
            aria-valuemax={120}
            aria-valuenow={scrollSpeed}
          />
          <span className="text-ui-xs text-text-muted font-mono w-14 text-right">
            {scrollSpeed} px/s
          </span>
        </div>

        {/* Direction */}
        <div className="flex items-center gap-2">
          <span className="text-ui-xs text-text-muted w-12" id="scroll-dir-label">Dir:</span>
          <div className="flex gap-1" role="radiogroup" aria-labelledby="scroll-dir-label">
            {SCROLL_DIRECTIONS.map((d) => (
              <button
                key={d.id}
                onClick={() => updateConfig({ scrollDirection: d.id })}
                className={`px-2 py-0.5 rounded text-ui-xs border transition-colors ${
                  scrollDirection === d.id
                    ? 'bg-accent-dim border-accent-border text-accent'
                    : 'border-border-subtle text-text-muted hover:text-text-secondary'
                }`}
                role="radio"
                aria-checked={scrollDirection === d.id}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>

        {/* Repeat mode */}
        <div className="flex items-center gap-2">
          <span className="text-ui-xs text-text-muted w-12" id="scroll-repeat-label">Repeat:</span>
          <div className="flex gap-1" role="radiogroup" aria-labelledby="scroll-repeat-label">
            {REPEAT_MODES.map((m) => (
              <button
                key={m.id}
                onClick={() => updateConfig({ scrollRepeatMode: m.id })}
                className={`px-2 py-0.5 rounded text-ui-xs border transition-colors ${
                  repeatMode === m.id
                    ? 'bg-accent-dim border-accent-border text-accent'
                    : 'border-border-subtle text-text-muted hover:text-text-secondary'
                }`}
                role="radio"
                aria-checked={repeatMode === m.id}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Instructions */}
      <p className="text-ui-xs text-text-muted">
        Upload a PNG/JPG image. Height auto-adapts to your LED count ({config.ledCount ?? 144}).
        For light painting, set camera to long exposure and swing the blade slowly.
      </p>
    </div>
  );
}
