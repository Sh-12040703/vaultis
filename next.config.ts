import type { NextConfig } from 'next'
import { withSentryConfig } from '@sentry/nextjs'

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    "3000-firebase-vaultis-1780062853880.cluster-ejd22kqny5htuv5dfowoyipt52.cloudworkstations.dev",
  ],
}

export default withSentryConfig(nextConfig, {
  org: 'novubase',
  project: 'vaultis',
  silent: !process.env.CI,
  widenClientFileUpload: true,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  webpack: {
    automaticVercelMonitors: true,
    treeshake: {
      removeDebugLogging: true,
    },
  },
})