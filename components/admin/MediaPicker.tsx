'use client'

import { useEffect, useState, useCallback } from 'react'
import { createBrowserClient } from '@/lib/supabase/client'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Loader2, Search, ImagePlus, Check, X } from 'lucide-react'
import { toast } from 'sonner'

interface MediaItem {
  id: string
  url: string
  filename: string
  created_at: string
}

interface MediaPickerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (url: string) => void
  selectedUrl?: string | null
}

export function MediaPicker({
  open,
  onOpenChange,
  onSelect,
  selectedUrl,
}: MediaPickerProps) {
  const supabase = createBrowserClient()
  const [media, setMedia] = useState<MediaItem[]>([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const loadMedia = useCallback(async () => {
    if (!open) return
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('media')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error loading media:', error)
        toast.error('❌ فشل تحميل الصور')
        return
      }
      if (data) setMedia(data as MediaItem[])
    } catch (err) {
      console.error('Failed to load media:', err)
      toast.error('❌ حدث خطأ أثناء تحميل الصور')
    } finally {
      setLoading(false)
    }
  }, [supabase, open])

  useEffect(() => {
    loadMedia()
  }, [loadMedia])

  const filteredMedia = media.filter((item) =>
    item.filename.toLowerCase().includes(searchQuery.toLowerCase())
  )

  function handleSelect(url: string) {
    onSelect(url)
    onOpenChange(false)
    setSearchQuery('')
  }

  // Don't render anything if not open
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={() => onOpenChange(false)}
      />

      {/* Modal Content */}
      <div
        className="relative bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col mx-4"
        dir="rtl"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-bold">اختيار صورة</h2>
          <button
            onClick={() => onOpenChange(false)}
            className="p-2 hover:bg-gray-100 dark:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-4">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="ابحث بالاسم..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-10"
              dir="rtl"
            />
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto px-4 pb-4 min-h-[300px]">
          {/* Loading State */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
              <p className="text-muted-foreground text-sm">جاري تحميل الصور...</p>
            </div>
          )}

          {/* Empty State */}
          {!loading && media.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <ImagePlus className="h-12 w-12 text-gray-300" />
              <p className="text-gray-500 dark:text-gray-400">لا توجد صور في المكتبة</p>
              <p className="text-gray-400 text-sm">
                ارفع صور جديدة من صفحة الصور أولاً
              </p>
            </div>
          )}

          {/* No Search Results */}
          {!loading && media.length > 0 && filteredMedia.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Search className="h-12 w-12 text-gray-300" />
              <p className="text-gray-500 dark:text-gray-400">
                لا توجد نتائج لـ &quot;{searchQuery}&quot;
              </p>
              <Button variant="ghost" size="sm" onClick={() => setSearchQuery('')}>
                مسح البحث
              </Button>
            </div>
          )}

          {/* Image Grid */}
          {!loading && filteredMedia.length > 0 && (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
              {filteredMedia.map((item) => {
                const isSelected = selectedUrl === item.url
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelect(item.url)}
                    className={`
                      relative aspect-square rounded-lg overflow-hidden border-2 transition-all
                      hover:scale-[1.02] active:scale-[0.98]
                      ${isSelected
                        ? 'border-orange-500 ring-2 ring-orange-500 ring-offset-2'
                        : 'border-gray-200 hover:border-orange-300'
                      }
                    `}
                    title={item.filename}
                  >
                    <Image
                      src={item.url}
                      alt={item.filename}
                      fill
                      sizes="(max-width: 640px) 33vw, (max-width: 768px) 25vw, 20vw"
                      className="object-cover"
                    />

                    {/* Selected Checkmark */}
                    {isSelected && (
                      <div className="absolute top-2 right-2 bg-orange-500 text-white rounded-full p-1 shadow-md">
                        <Check className="h-3 w-3" />
                      </div>
                    )}

                    {/* Filename overlay */}
                    <div className="absolute inset-x-0 bottom-0 bg-black/60 text-white text-xs p-2 truncate opacity-0 hover:opacity-100 transition-opacity">
                      {item.filename}
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t flex justify-between items-center">
          <p className="text-sm text-muted-foreground">
            {filteredMedia.length} صورة
          </p>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            إلغاء
          </Button>
        </div>
      </div>
    </div>
  )
}