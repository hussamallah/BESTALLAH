/** @type {import('next').NextConfig} */
const nextConfig = {
  // Using real engine API routes in pages/api/engine/
  // No rewrite needed
  // Suppress hydration warnings in development
  onDemandEntries: {
    // period (in ms) where the server will keep pages in the buffer
    maxInactiveAge: 25 * 1000,
    // number of pages that should be kept simultaneously without being disposed
    pagesBufferLength: 2,
  },
  // Disable strict mode to avoid hydration issues with browser extensions
  reactStrictMode: false,
  // Set environment variables for development
  env: {
    NEXT_PUBLIC_BANK_HASH: 'f3b83f5647111864456d1d73accf7fd4936139e95381c827b0c4d2353749c6df',
    NEXT_PUBLIC_RESULTS_ENABLED: 'true',
    NEXT_PUBLIC_PICKS_POLICY: 'at_least_one'
    // NEXT_PUBLIC_FORCE_REAL_API: 'true' // Disabled - using mock mode
  }
};

module.exports = nextConfig;