import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Percentage of transactions to sample for performance monitoring
  // 1.0 = 100%, lower in production once you have traffic
  tracesSampleRate: 1.0,

  // Only run Sentry in production — not during local dev
  enabled: process.env.NODE_ENV === 'production',

  // Show debug info in development if needed
  debug: false,
})