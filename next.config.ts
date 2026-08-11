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
  // WHAT: React Compiler كان مفعّل هنا (ميزة تجريبية جداً)
  // WHY:  الخطأ "Cannot read properties of undefined (reading 'call')"
  //       اللي بيحصل بالظبط عند RootLayout، جوا دوال React الداخلية
  //       (requireModule / readChunk / initializeModuleChunk) — ده
  //       نمط معروف لمشاكل React Compiler مع Server/Client Components
  //       في Next.js لسه، خصوصاً في وضع التطوير (dev mode)
  // KILL: تفعيله بيرجّع نفس الخطأ اللي كان بيوقف الموقع بالكامل —
  //       الميزة دي لسه مش مستقرة كفاية للاستخدام دلوقتي
  // experimental: {
  //   reactCompiler: true,
  // },
  // WHAT: Compression for static assets
  // WHY:  Smaller files = faster transfer
  // KILL: No compression = larger downloads = slower TTFB
  compress: true,
  // WHAT: HTTP response headers for security
  // WHY:  حماية أساسية للموقع
  // KILL: بدونها الموقع أقل أماناً
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
      // WHAT: تم حذف الـ Cache-Control القديم اللي كان بيحفظ
      //       ملفات _next/static لمدة سنة كاملة (immutable)
      // WHY:  الإعداد ده كان بيمنع المتصفح من تحميل أي تحديث
      //       جديد للكود طول مرحلة التطوير — Next.js وVercel
      //       بيتعاملوا مع الكاش الصح تلقائياً لوحدهم في
      //       الإنتاج، مش محتاجين نتحكم فيه يدوي
    ]
  },
}

export default nextConfig