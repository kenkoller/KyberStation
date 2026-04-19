// @vitest-environment jsdom
// ─── ScrollReveal reduced-motion / IntersectionObserver tests ───
//
// Uses a hand-rolled IntersectionObserver stub (jsdom doesn't ship
// one) and a matchMedia stub so we can toggle prefers-reduced-motion
// per test. Renders via react-dom/client + React 18's stable `act`.

import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  vi,
} from 'vitest';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { ScrollReveal } from '@/components/marketing/ScrollReveal';

// Silence React 18's "not configured to support act" warning by
// marking this as an act environment. Must be set before the first
// render.
(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

// ── IntersectionObserver stub ───────────────────────────────────────

interface FakeIO {
  observe: ReturnType<typeof vi.fn>;
  unobserve: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
  trigger: (isIntersecting: boolean) => void;
}

const createdObservers: FakeIO[] = [];

type IOCallback = (entries: Array<{ isIntersecting: boolean }>) => void;

function installIOStub(): void {
  createdObservers.length = 0;
  class StubIO implements FakeIO {
    observe = vi.fn();
    unobserve = vi.fn();
    disconnect = vi.fn();
    private readonly cb: IOCallback;
    constructor(cb: IOCallback) {
      this.cb = cb;
      createdObservers.push(this);
    }
    trigger(isIntersecting: boolean): void {
      this.cb([{ isIntersecting }]);
    }
  }
  (globalThis as unknown as { IntersectionObserver: unknown })
    .IntersectionObserver = StubIO;
}

function setMatchMedia(reducedMotion: boolean): void {
  (window as unknown as { matchMedia: (q: string) => MediaQueryList })
    .matchMedia = (query: string) =>
    ({
      matches:
        reducedMotion && query.includes('prefers-reduced-motion: reduce'),
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList;
}

// ── Render harness ──────────────────────────────────────────────────

let container: HTMLElement;
let root: Root;

function mount(ui: React.ReactElement): HTMLElement {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root.render(ui);
  });
  return container;
}

beforeEach(() => {
  installIOStub();
  setMatchMedia(false);
  document.documentElement.className = '';
});

afterEach(() => {
  act(() => {
    root?.unmount();
  });
  container?.remove();
});

describe('<ScrollReveal>', () => {
  it('renders children verbatim', () => {
    const el = mount(<ScrollReveal>hello</ScrollReveal>);
    expect(el.textContent).toBe('hello');
  });

  it('reflects the variant in data-reveal-variant (default fade-up)', () => {
    const el = mount(<ScrollReveal>x</ScrollReveal>);
    const node = el.firstElementChild as HTMLElement;
    expect(node.getAttribute('data-reveal-variant')).toBe('fade-up');
  });

  it('honors an explicit variant prop', () => {
    const el = mount(
      <ScrollReveal variant="slide-from-left">x</ScrollReveal>,
    );
    const node = el.firstElementChild as HTMLElement;
    expect(node.getAttribute('data-reveal-variant')).toBe('slide-from-left');
  });

  it('short-circuits to revealed=in when prefers-reduced-motion is set', () => {
    setMatchMedia(true);
    const el = mount(<ScrollReveal>x</ScrollReveal>);
    const node = el.firstElementChild as HTMLElement;
    expect(node.getAttribute('data-reveal')).toBe('in');
    expect(createdObservers.length).toBe(0);
  });

  it('short-circuits when html has .reduced-motion class', () => {
    document.documentElement.classList.add('reduced-motion');
    const el = mount(<ScrollReveal>x</ScrollReveal>);
    expect(
      (el.firstElementChild as HTMLElement).getAttribute('data-reveal'),
    ).toBe('in');
    expect(createdObservers.length).toBe(0);
  });

  it('short-circuits when html has .perf-lite class', () => {
    document.documentElement.classList.add('perf-lite');
    const el = mount(<ScrollReveal>x</ScrollReveal>);
    expect(
      (el.firstElementChild as HTMLElement).getAttribute('data-reveal'),
    ).toBe('in');
    expect(createdObservers.length).toBe(0);
  });

  it('starts hidden post-hydration and flips to "in" on IO intersect', () => {
    const el = mount(<ScrollReveal>x</ScrollReveal>);
    const node = el.firstElementChild as HTMLElement;
    expect(node.getAttribute('data-reveal')).toBe('out');
    expect(createdObservers.length).toBe(1);

    act(() => {
      createdObservers[0].trigger(true);
    });
    expect(node.getAttribute('data-reveal')).toBe('in');
  });

  it('disconnects the observer once revealed', () => {
    mount(<ScrollReveal>x</ScrollReveal>);
    const obs = createdObservers[0];
    act(() => {
      obs.trigger(true);
    });
    expect(obs.disconnect).toHaveBeenCalled();
  });

  it('renders as the `as` element when provided', () => {
    const el = mount(<ScrollReveal as="section">x</ScrollReveal>);
    expect(el.firstElementChild?.tagName).toBe('SECTION');
  });

  it('forwards className', () => {
    const el = mount(
      <ScrollReveal className="my-16 space-y-4">x</ScrollReveal>,
    );
    expect(el.firstElementChild?.className).toBe('my-16 space-y-4');
  });
});
