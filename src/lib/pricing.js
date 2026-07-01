// ─────────────────────────────────────────────────────────────────────────
// SINGLE SOURCE OF TRUTH for plans & pricing.
// Both the Landing page and the Pricing page read from here, so the homepage
// can never advertise a different price than the pricing page again.
//
// TODO (al / matthewwu): confirm the FINAL prices and the exact per-tier
// feature split before launch — just edit the values below in this one file.
// The numbers here are the current placeholders; the tiers are structured so
// Pro = limited and Max = unlimited (which the tier names already imply).
// ─────────────────────────────────────────────────────────────────────────

export const PLANS = [
  {
    id: 'pro',
    name: 'Pro',
    monthlyPrice: '$19.99',
    yearlyPrice: '$14.99',
    yearlyTotal: '$179.88',
    description: 'For musicians who practice seriously.',
    cta: 'Choose Pro',
    ctaVariant: 'gold',
    features: [
      { text: '5 recording uploads per month', included: true },
      { text: 'Score alignment & analysis',    included: true },
      { text: 'Measure-by-measure feedback',    included: true },
      { text: 'Session history (30 days)',      included: true },
      { text: 'Mediant chat',                   included: true },
      { text: 'PDF export',                     included: true },
      { text: 'Unlimited uploads',              included: false },
      { text: 'Full session history',           included: false },
      { text: 'Priority analysis queue',        included: false },
      { text: 'Advanced progress tracking',     included: false },
      { text: 'Multi-instrument profiles',      included: false },
      { text: 'Early access to new features',   included: false },
    ],
  },
  {
    id: 'max',
    name: 'Max',
    monthlyPrice: '$34.99',
    yearlyPrice: '$24.99',
    yearlyTotal: '$299.88',
    description: 'The full experience, no limits.',
    cta: 'Choose Max',
    ctaVariant: 'green',
    features: [
      { text: 'Unlimited recording uploads',    included: true },
      { text: 'Score alignment & analysis',     included: true },
      { text: 'Measure-by-measure feedback',     included: true },
      { text: 'Full session history',           included: true },
      { text: 'Mediant chat',                   included: true },
      { text: 'PDF export',                     included: true },
      { text: 'Priority analysis queue',        included: true },
      { text: 'Advanced progress tracking',     included: true },
      { text: 'Multi-instrument profiles',      included: true },
      { text: 'Early access to new features',   included: true },
    ],
  },
]

// The single plan shown as a teaser on the marketing homepage.
export const HIGHLIGHT_PLAN_ID = 'pro'
