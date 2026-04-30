interface InlineCodePeekProps {
  /** Pre-formatted code body (newlines preserved verbatim). */
  code: string;
  /** Optional caption shown above the block. */
  caption?: string;
  /** Optional language hint shown in the header chip (e.g. "C++", "TS"). */
  language?: string;
}

/**
 * Read-only "inline code peek" used on the `/features` page to show a
 * snippet of generated ProffieOS C++ alongside each feature pillar.
 *
 * No syntax-highlighting library — the marketing site has zero
 * external runtime deps for this surface, and the snippets are short
 * enough that monochrome JetBrains Mono carries them cleanly.
 *
 * Visual: bordered + accent-tinted top edge, JetBrains Mono body,
 * label chip on the top-right showing the language. `whitespace-pre`
 * preserves indentation as authored.
 */
export function InlineCodePeek({
  code,
  caption,
  language = 'C++',
}: InlineCodePeekProps) {
  return (
    <figure
      className="relative mt-5 border bg-bg-deep/60"
      style={{
        borderColor: 'rgb(var(--border-subtle))',
        borderRadius: 'var(--r-chrome, 2px)',
      }}
    >
      <header
        className="flex items-center justify-between border-b px-3 py-1.5"
        style={{ borderColor: 'rgb(var(--border-subtle))' }}
      >
        <span className="font-mono text-[11px] tracking-widest uppercase tabular-nums text-text-muted">
          {caption ?? 'Generated · Read-only'}
        </span>
        <span
          className="font-mono text-[10px] tracking-widest uppercase tabular-nums px-1.5 py-0.5"
          style={{
            color: 'rgb(var(--accent))',
            border: '1px solid rgb(var(--accent) / 0.4)',
            borderRadius: 'var(--r-chrome, 2px)',
          }}
        >
          {language}
        </span>
      </header>
      <pre className="font-mono text-[12px] md:text-[13px] leading-relaxed text-text-secondary px-3 py-3 overflow-x-auto whitespace-pre">
        {code}
      </pre>
    </figure>
  );
}
