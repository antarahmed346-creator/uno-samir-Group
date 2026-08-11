import React from 'react'
import { Metadata } from 'next'

export const SITE_CONFIG = {
  name: 'UNO & SAMIR GROUP',
  nameAr: 'يونو وسمير جروب',
  description: 'مجموعة مطاعم مرسى مطروح — أشهى البيتزا الإيطالية، الفطير المصري، والكريب الفرنسي',
  descriptionEn: 'Marsa Matrouh Restaurant Group — Best Italian Pizza, Egyptian Feteer, and French Crêpes',
  url: process.env.NEXT_PUBLIC_SITE_URL || 'https://uno-samir.com',
  logo: '/logo.png',
  phone: '+20-XXX-XXX-XXXX',
  address: {
    street: 'شارع البحر',
    city: 'مرسى مطروح',
    region: 'مطروح',
    country: 'EG',
  },
  social: {
    facebook: 'https://facebook.com/uno.samir',
    instagram: 'https://instagram.com/uno.samir',
  },
  defaultImage: '/og-default.jpg',
}

interface SeoOptions {
  title?: string
  titleAr?: string
  description?: string
  descriptionEn?: string
  image?: string
  path?: string
  noIndex?: boolean
  type?: 'website' | 'article'
  publishedAt?: string
  modifiedAt?: string
  keywords?: string[]
}

export function generateSeoMetadata(options: SeoOptions = {}): Metadata {
  const {
    title,
    titleAr,
    description = SITE_CONFIG.description,
    descriptionEn = SITE_CONFIG.descriptionEn,
    image = SITE_CONFIG.defaultImage,
    path = '',
    noIndex = false,
    type = 'website',
    publishedAt,
    modifiedAt,
    keywords = [],
  } = options

  const fullTitle = title
    ? `${title} | ${SITE_CONFIG.name}`
    : `${SITE_CONFIG.name} — ${SITE_CONFIG.nameAr}`

  const fullTitleAr = titleAr
    ? `${titleAr} | ${SITE_CONFIG.nameAr}`
    : fullTitle

  const canonicalUrl = `${SITE_CONFIG.url}${path}`

  const metadata: Metadata = {
    title: fullTitle,
    description,
    keywords: keywords.length > 0 ? keywords.join(', ') : undefined,
    alternates: {
      canonical: canonicalUrl,
    },
    robots: noIndex
      ? { index: false, follow: false }
      : { index: true, follow: true },
    openGraph: {
      type,
      locale: 'ar_EG',
      alternateLocale: 'en_US',
      url: canonicalUrl,
      siteName: SITE_CONFIG.name,
      title: fullTitleAr,
      description: descriptionEn,
      images: [
        {
          url: image.startsWith('http') ? image : `${SITE_CONFIG.url}${image}`,
          width: 1200,
          height: 630,
          alt: fullTitleAr,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: fullTitleAr,
      description: descriptionEn,
      images: [image.startsWith('http') ? image : `${SITE_CONFIG.url}${image}`],
    },
  }

  if (type === 'article' && (publishedAt || modifiedAt)) {
    const og = metadata.openGraph as Record<string, unknown>
    if (publishedAt) og.publishedTime = publishedAt
    if (modifiedAt) og.modifiedTime = modifiedAt
  }

  return metadata
}

function createJsonLdScript(jsonLd: object): React.ReactElement {
  return React.createElement('script', {
    type: 'application/ld+json',
    dangerouslySetInnerHTML: { __html: JSON.stringify(jsonLd) },
  })
}

export function OrganizationJsonLd(): React.ReactElement {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_CONFIG.name,
    alternateName: SITE_CONFIG.nameAr,
    url: SITE_CONFIG.url,
    logo: `${SITE_CONFIG.url}${SITE_CONFIG.logo}`,
    description: SITE_CONFIG.description,
    address: {
      '@type': 'PostalAddress',
      streetAddress: SITE_CONFIG.address.street,
      addressLocality: SITE_CONFIG.address.city,
      addressRegion: SITE_CONFIG.address.region,
      addressCountry: SITE_CONFIG.address.country,
    },
    contactPoint: {
      '@type': 'ContactPoint',
      telephone: SITE_CONFIG.phone,
      contactType: 'customer service',
      availableLanguage: ['Arabic', 'English'],
    },
    sameAs: [SITE_CONFIG.social.facebook, SITE_CONFIG.social.instagram],
  }

  return createJsonLdScript(jsonLd)
}

export function LocalBusinessJsonLd(): React.ReactElement {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Restaurant',
    name: SITE_CONFIG.name,
    alternateName: SITE_CONFIG.nameAr,
    url: SITE_CONFIG.url,
    logo: `${SITE_CONFIG.url}${SITE_CONFIG.logo}`,
    description: SITE_CONFIG.description,
    address: {
      '@type': 'PostalAddress',
      streetAddress: SITE_CONFIG.address.street,
      addressLocality: SITE_CONFIG.address.city,
      addressRegion: SITE_CONFIG.address.region,
      addressCountry: SITE_CONFIG.address.country,
    },
    telephone: SITE_CONFIG.phone,
    priceRange: '$$',
    servesCuisine: ['Italian', 'Egyptian', 'French'],
    openingHours: 'Mo-Su 10:00-02:00',
    sameAs: [SITE_CONFIG.social.facebook, SITE_CONFIG.social.instagram],
  }

  return createJsonLdScript(jsonLd)
}

interface ProductJsonLdProps {
  product: {
    name: string
    nameAr: string
    description: string
    image: string
    price: number
    currency?: string
    availability?: 'InStock' | 'OutOfStock'
    brand?: string
    category?: string
    sku?: string
  }
}

export function ProductJsonLd({ product }: ProductJsonLdProps): React.ReactElement {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.nameAr,
    alternateName: product.name,
    description: product.description,
    image: product.image.startsWith('http') ? product.image : `${SITE_CONFIG.url}${product.image}`,
    sku: product.sku || product.nameAr,
    brand: {
      '@type': 'Brand',
      name: product.brand || SITE_CONFIG.name,
    },
    category: product.category,
    offers: {
      '@type': 'Offer',
      url: `${SITE_CONFIG.url}/product/${product.sku}`,
      priceCurrency: product.currency || 'EGP',
      price: product.price.toString(),
      availability: `https://schema.org/${product.availability || 'InStock'}`,
      priceValidUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    },
  }

  return createJsonLdScript(jsonLd)
}

interface BreadcrumbJsonLdProps {
  items: Array<{ name: string; url: string }>
}

export function BreadcrumbJsonLd({ items }: BreadcrumbJsonLdProps): React.ReactElement {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url.startsWith('http') ? item.url : `${SITE_CONFIG.url}${item.url}`,
    })),
  }

  return createJsonLdScript(jsonLd)
}

interface WebSiteJsonLdProps {
  searchUrl: string
}

export function WebSiteJsonLd({ searchUrl }: WebSiteJsonLdProps): React.ReactElement {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_CONFIG.name,
    url: SITE_CONFIG.url,
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${SITE_CONFIG.url}${searchUrl}`,
      },
      'query-input': 'required name=search_term_string',
    },
  }

  return createJsonLdScript(jsonLd)
}