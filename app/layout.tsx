import './globals.css'
import QueryProvider from '@/components/providers/QueryProvider'
import { ThemeProvider } from '@/components/providers/ThemeProvider'
import { cookies } from 'next/headers'
import { Cairo } from 'next/font/google'

// WHAT: تحميل خط Cairo بالطريقة المُحسّنة من Next.js
// WHY:  next/font بيستضيف الخط على نفس السيرفر (مش من جوجل مباشرة)،
//       بيقلل عدد الطلبات، ويمنع "قفزة" الشكل وقت التحميل
// KILL: الرجوع لـ <link> عادي بيبطّئ تحميل الصفحة ويعمل FOUT
//       (النص يظهر بخط افتراضي ثم يتغير فجأة)
const cairo = Cairo({
  subsets: ['arabic', 'latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
  variable: '--font-cairo',
  display: 'swap',
  preload: true,
})

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies()
  const locale = cookieStore.get('locale')?.value || 'ar'
  const isRTL = locale === 'ar'
  const theme = cookieStore.get('theme')?.value === 'dark' ? 'dark' : 'light'

  return (
    <html
      lang={locale}
      dir={isRTL ? 'rtl' : 'ltr'}
      suppressHydrationWarning
      className={`${cairo.variable} font-cairo ${theme === 'dark' ? 'dark' : ''}`}
    >
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#dc2626" />
        <link rel="preconnect" href="https://res.cloudinary.com" />
        <link rel="dns-prefetch" href="https://res.cloudinary.com" />
        <link rel="preconnect" href="https://ssigaaiieshxrktelrwq.supabase.co" />
      </head>
      <body suppressHydrationWarning className="font-cairo antialiased bg-white text-gray-900 dark:bg-gray-950 dark:text-gray-100 transition-colors">
        <QueryProvider>
          <ThemeProvider initialTheme={theme}>
            {children}
          </ThemeProvider>
        </QueryProvider>
      </body>
    </html>
  )
}