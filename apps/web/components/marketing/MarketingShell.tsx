import { MarketingNav } from './MarketingNav';
import { LandingFooter } from '@/components/landing/LandingFooter';

interface MarketingShellProps {
  children: React.ReactNode;
  /** Adds the ambient `.particle-drift` background. Default true. */
  ambient?: boolean;
}

/**
 * Shared layout wrapper for the public marketing pages (/features,
 * /showcase, /changelog, /faq). The homepage has its own composition
 * in app/page.tsx and does not use this shell.
 */
export function MarketingShell({ children, ambient = true }: MarketingShellProps) {
  return (
    <div className="relative min-h-screen flex flex-col">
      {ambient && (
        <div
          className="pointer-events-none absolute inset-0 particle-drift"
          aria-hidden="true"
        />
      )}
      <div className="relative z-10 flex flex-col min-h-screen">
        <MarketingNav />
        <main id="main-content" className="flex-1">
          {children}
        </main>
        <LandingFooter />
      </div>
    </div>
  );
}
