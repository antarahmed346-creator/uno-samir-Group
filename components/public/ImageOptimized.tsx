// WHAT: Reusable optimized image component with best practices
// WHY:  Centralizes image optimization logic; ensures consistency
// KILL: Inconsistent image optimization = some images slow, some fast

import Image from 'next/image'
import { useState } from 'react'

interface ImageOptimizedProps {
  src: string
  alt: string
  width?: number
  height?: number
  fill?: boolean
  priority?: boolean
  className?: string
  sizes?: string
}

export default function ImageOptimized({
  src,
  alt,
  width,
  height,
  fill = false,
  priority = false,
  className = '',
  sizes = '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw',
}: ImageOptimizedProps) {
  const [isLoading, setIsLoading] = useState(true)

  // WHAT: Generate blur placeholder from Cloudinary
  // WHY:  Low-quality placeholder improves perceived performance
  // KILL: No placeholder = blank space while image loads = poor LCP
  const blurUrl = src.includes('cloudinary.com')
    ? src.replace('/upload/', '/upload/w_10,q_10,e_blur:1000/')
    : undefined

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {isLoading && blurUrl && (
        <div 
          className="absolute inset-0 bg-gray-200 animate-pulse"
          style={{ filter: 'blur(20px)' }}
        />
      )}
      <Image
        src={src}
        alt={alt}
        width={fill ? undefined : width}
        height={fill ? undefined : height}
        fill={fill}
        priority={priority}
        sizes={sizes}
        placeholder={blurUrl ? 'blur' : undefined}
        blurDataURL={blurUrl}
        className={`object-cover transition-opacity duration-300 ${
          isLoading ? 'opacity-0' : 'opacity-100'
        }`}
        onLoad={() => setIsLoading(false)}
      />
    </div>
  )
}