// ─── Template Insertion Palette ───────────────────────────────────────
//
// Phase 7B: Categorized template browser for inserting ProffieOS templates
// into the template tree. Power users can search the catalog, browse by
// category, and insert templates with default arguments.
//
// Also surfaces Phase 7C example styles as one-click starting points.

'use client';

import { useState, useMemo, useCallback } from 'react';
import type { TemplateCatalogCategory, TemplateCatalogEntry, TemplateExample } from '../../../lib/templateCatalog';
import {
  TEMPLATE_CATALOG,
  TEMPLATE_EXAMPLES,
  CATEGORY_ORDER,
  CATEGORY_LABELS,
  searchCatalog,
} from '../../../lib/templateCatalog';

// ─── Category display glyphs ─

const CATEGORY_GLYPHS: Record<TemplateCatalogCategory, string> = {
  colors: '●',
  styles: '✨',
  functions: 'ƒ',
  transitions: '→',
  effects: '⚡',
  wrappers: '□',
};

// ─── Types ─

type PaletteTab = 'catalog' | 'examples';

interface TemplateInsertionPaletteProps {
  /** Called when user selects a template to insert. Receives the template string. */
  onInsert: (templateString: string) => void;
  /** Called when user loads an example style. Receives the full template string. */
  onLoadExample: (templateString: string) => void;
}

// ─── Catalog entry row ─

function CatalogEntryRow({
  entry,
  onInsert,
}: {
  entry: TemplateCatalogEntry;
  onInsert: (templateString: string) => void;
}) {
  const templateString = entry.defaultArgs.length > 0
    ? `${entry.name}<${entry.defaultArgs.join(',')}>`
    : `${entry.name}<>`;

  return (
    <button
      onClick={() => onInsert(templateString)}
      className="w-full flex items-start gap-2 px-2 py-1.5 text-left rounded hover:bg-accent/10 transition-colors group"
      title={`Insert ${entry.signature}\n${entry.description}`}
    >
      <span className="text-[11px] font-mono font-semibold text-accent shrink-0 pt-px">
        {entry.name}
      </span>
      <span className="text-[10px] text-text-muted truncate opacity-70 group-hover:opacity-100">
        {entry.description}
      </span>
    </button>
  );
}

// ─── Example card ─

function ExampleCard({
  example,
  onLoad,
}: {
  example: TemplateExample;
  onLoad: (templateString: string) => void;
}) {
  return (
    <button
      onClick={() => onLoad(example.templateString)}
      className="w-full text-left p-2 rounded border border-border-subtle hover:border-accent/40 hover:bg-accent/5 transition-colors group"
      title={`Load: ${example.templateString}`}
    >
      <div className="text-[11px] font-semibold text-text-primary group-hover:text-accent">
        {example.name}
      </div>
      <div className="text-[10px] text-text-muted mt-0.5">
        {example.description}
      </div>
      <pre className="text-[9px] font-mono text-text-muted/60 mt-1 truncate">
        {example.templateString}
      </pre>
    </button>
  );
}

// ─── Main component ─

export function TemplateInsertionPalette({
  onInsert,
  onLoadExample,
}: TemplateInsertionPaletteProps) {
  const [activeTab, setActiveTab] = useState<PaletteTab>('catalog');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategory, setExpandedCategory] = useState<TemplateCatalogCategory | null>('colors');

  // Search results
  const searchResults = useMemo(() => {
    if (searchQuery.trim().length < 2) return null;
    return searchCatalog(searchQuery);
  }, [searchQuery]);

  const handleCategoryToggle = useCallback((cat: TemplateCatalogCategory) => {
    setExpandedCategory((prev) => (prev === cat ? null : cat));
  }, []);

  return (
    <div className="flex flex-col h-full">
      {/* Tab bar */}
      <div className="flex items-center border-b border-border-subtle">
        <button
          onClick={() => setActiveTab('catalog')}
          className={`flex-1 px-3 py-1.5 text-[10px] font-medium transition-colors ${
            activeTab === 'catalog'
              ? 'text-accent border-b-2 border-accent'
              : 'text-text-muted hover:text-text-primary'
          }`}
        >
          Catalog
        </button>
        <button
          onClick={() => setActiveTab('examples')}
          className={`flex-1 px-3 py-1.5 text-[10px] font-medium transition-colors ${
            activeTab === 'examples'
              ? 'text-accent border-b-2 border-accent'
              : 'text-text-muted hover:text-text-primary'
          }`}
        >
          Examples
        </button>
      </div>

      {/* Content */}
      {activeTab === 'catalog' ? (
        <div className="flex-1 overflow-y-auto">
          {/* Search field */}
          <div className="px-2 py-1.5 border-b border-border-subtle">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search templates..."
              className="w-full px-2 py-1 text-[11px] bg-bg-deep/40 border border-border-subtle rounded placeholder:text-text-muted/40 focus:outline-none focus:border-accent/40"
            />
          </div>

          {/* Search results */}
          {searchResults !== null ? (
            <div className="px-1 py-1">
              {searchResults.length === 0 ? (
                <div className="px-2 py-3 text-[10px] text-text-muted text-center">
                  No templates match &ldquo;{searchQuery}&rdquo;
                </div>
              ) : (
                <div className="space-y-px">
                  {searchResults.map((entry) => (
                    <CatalogEntryRow
                      key={entry.name}
                      entry={entry}
                      onInsert={onInsert}
                    />
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* Category browser */
            <div className="py-0.5">
              {CATEGORY_ORDER.map((cat) => {
                const entries = TEMPLATE_CATALOG[cat] ?? [];
                const isExpanded = expandedCategory === cat;
                return (
                  <div key={cat}>
                    <button
                      onClick={() => handleCategoryToggle(cat)}
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-[10px] hover:bg-accent/5 transition-colors"
                    >
                      <span className={`transition-transform ${isExpanded ? 'rotate-90' : ''}`}>
                        {'▶'}
                      </span>
                      <span className="opacity-60">{CATEGORY_GLYPHS[cat]}</span>
                      <span className="font-medium text-text-primary">{CATEGORY_LABELS[cat]}</span>
                      <span className="text-text-muted/50 ml-auto">{entries.length}</span>
                    </button>
                    {isExpanded && (
                      <div className="pl-2 pr-1 pb-1">
                        {entries.map((entry) => (
                          <CatalogEntryRow
                            key={entry.name}
                            entry={entry}
                            onInsert={onInsert}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* Examples tab */
        <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
          {TEMPLATE_EXAMPLES.map((example) => (
            <ExampleCard
              key={example.name}
              example={example}
              onLoad={onLoadExample}
            />
          ))}
        </div>
      )}
    </div>
  );
}
