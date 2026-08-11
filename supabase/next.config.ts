import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    // WHAT: Define allowed remote image patterns
    // WHY:  Next.js 15 requires remotePatterns instead of domains (deprecated)
    // KILL: Wrong config = images fail to load with 404
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        pathname: '/**',
      },
    ],
    // WHAT: Image format optimization
    // WHY:  WebP is smaller than JPEG/PNG = faster loading
    // KILL: No format optimization = larger bundle = slower LCP
    formats: ['image/webp', 'image/avif'],
    // WHAT: Device size breakpoints
    // WHY:  Serve appropriately sized images per device
    // KILL: Wrong sizes = wasted bandwidth or blurry images
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  // WHAT: Enable experimental features for performance
  // WHY:  React Compiler optimizes re-renders automatically
  // KILL: No compiler = unnecessary re-renders = slower INP
  experimental: {
    reactCompiler: true,
  },
  // WHAT: Compression for static assets
  // WHY:  Smaller files = faster transfer
  // KILL: No compression = larger downloads = slower TTFB
  compress: true,
  // WHAT: HTTP response headers for caching
  // WHY:  Browser caching reduces repeat requests
  // KILL: No cache headers = every visit re-downloads everything
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
        ],
      },
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ]
  },
}

export default nextConfig