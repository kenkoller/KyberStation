// Footer is shared between the landing route and the marketing
// sub-routes (`/features`, `/showcase`, `/changelog`, `/faq`). The
// canonical implementation lives in `components/marketing/`. This file
// re-exports under the legacy `LandingFooter` name to avoid breaking
// the landing page's existing imports.
export { MarketingFooter as LandingFooter } from '@/components/marketing/MarketingFooter';
