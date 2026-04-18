'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

const LINKS: ReadonlyArray<{ href: string; label: string }> = [
  { href: '/features', label: 'Features' },
  { href: '/showcase', label: 'Showcase' },
  { href: '/changelog', label: 'Changelog' },
  { href: '/community', label: 'Community' },
  { href: '/docs', label: 'Docs' },
  { href: '/faq', label: 'FAQ' },
];

export function MarketingNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <nav
      className="sticky top-0 z-40 border-b border-border-subtle backdrop-blur-md"
      style={{ background: 'rgb(var(--bg-primary) / 0.75)' }}
    >
      <div className="max-w-6xl mx-auto px-6 md:px-8 h-14 flex items-center justify-between gap-4">
        <Link
          href="/"
          className="font-cinematic text-sm tracking-[0.22em] text-text-primary hover:text-accent transition-colors whitespace-nowrap"
        >
          KYBERSTATION
        </Link>

        <div className="hidden md:flex items-center gap-6">
          {LINKS.map(({ href, label }) => {
            const active = pathname === href || pathname?.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                className={`dot-matrix transition-colors ${
                  active
                    ? 'text-text-primary'
                    : 'text-text-muted hover:text-text-secondary'
                }`}
              >
                {label}
              </Link>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/editor"
            className="btn-hum inline-flex items-center font-cinematic text-[11px] tracking-[0.2em] uppercase px-4 py-2.5 md:py-1.5 rounded-[2px] transition-colors whitespace-nowrap"
            style={{
              background: 'rgb(var(--accent) / 0.10)',
              border: '1px solid rgb(var(--accent) / 0.45)',
              color: 'rgb(var(--accent))',
            }}
          >
            Open Editor
          </Link>

          <button
            type="button"
            aria-label="Toggle navigation menu"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="md:hidden inline-flex items-center justify-center w-11 h-11 rounded-[2px] text-text-secondary hover:text-text-primary hover:bg-bg-surface transition-colors"
          >
            <svg
              aria-hidden="true"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {open ? (
                <>
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </>
              ) : (
                <>
                  <line x1="3" y1="7" x2="21" y2="7" />
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="17" x2="21" y2="17" />
                </>
              )}
            </svg>
          </button>
        </div>
      </div>

      {open && (
        <div className="md:hidden border-t border-border-subtle">
          <div className="max-w-6xl mx-auto px-6 py-3 flex flex-col gap-1">
            {LINKS.map(({ href, label }) => {
              const active = pathname === href || pathname?.startsWith(`${href}/`);
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setOpen(false)}
                  className={`dot-matrix px-3 py-3 rounded-[2px] transition-colors ${
                    active
                      ? 'text-text-primary bg-bg-surface'
                      : 'text-text-muted hover:text-text-secondary hover:bg-bg-surface'
                  }`}
                >
                  {label}
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </nav>
  );
}
