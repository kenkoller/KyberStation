// ─── Xenopixel Design Porter Tests ────────────────────────────────
//
// SSR contract tests for the XenoDesignPorter dialog component.
// Uses renderToStaticMarkup + string assertions (same pattern as
// xenopixelBoardGating.test.tsx).

import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import { XenoDesignPorter } from '@/components/editor/xenopixel/XenoDesignPorter';

// XenoDesignPorter reads from useBladeStore; in SSR mode the store
// returns initial state (style='stable', ignition='standard'), both
// of which have direct Xeno mappings → compatible=true.

const noop = () => {};

describe('XenoDesignPorter', () => {
  it('renders nothing when open=false', () => {
    const html = renderToStaticMarkup(
      createElement(XenoDesignPorter, {
        open: false,
        onClose: noop,
      }),
    );
    expect(html).toBe('');
  });

  it('renders the dialog when open=true', () => {
    const html = renderToStaticMarkup(
      createElement(XenoDesignPorter, {
        open: true,
        onClose: noop,
      }),
    );
    expect(html).toContain('Port to Xenopixel V3');
    expect(html).toContain('Conversion analysis');
  });

  it('shows the mapping table with Blade and Ignition rows', () => {
    const html = renderToStaticMarkup(
      createElement(XenoDesignPorter, {
        open: true,
        onClose: noop,
      }),
    );
    expect(html).toContain('Blade');
    expect(html).toContain('Ignition');
  });

  it('shows EXACT badge for directly compatible styles', () => {
    // Default SSR state: style=stable → Steady Blade (exact match)
    const html = renderToStaticMarkup(
      createElement(XenoDesignPorter, {
        open: true,
        onClose: noop,
      }),
    );
    expect(html).toContain('EXACT');
    expect(html).toContain('Steady Blade');
  });

  it('shows fully compatible message for default config', () => {
    // Default SSR state: stable + standard → both exact
    const html = renderToStaticMarkup(
      createElement(XenoDesignPorter, {
        open: true,
        onClose: noop,
      }),
    );
    expect(html).toContain('Fully compatible');
  });

  it('renders Cancel and Confirm buttons', () => {
    const html = renderToStaticMarkup(
      createElement(XenoDesignPorter, {
        open: true,
        onClose: noop,
      }),
    );
    expect(html).toContain('Cancel');
    expect(html).toContain('Confirm');
  });

  it('has proper ARIA attributes for accessibility', () => {
    const html = renderToStaticMarkup(
      createElement(XenoDesignPorter, {
        open: true,
        onClose: noop,
      }),
    );
    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-modal="true"');
    expect(html).toContain('aria-label="Port design to Xenopixel"');
  });

  it('renders the backdrop with aria-hidden', () => {
    const html = renderToStaticMarkup(
      createElement(XenoDesignPorter, {
        open: true,
        onClose: noop,
      }),
    );
    expect(html).toContain('aria-hidden="true"');
  });
});
