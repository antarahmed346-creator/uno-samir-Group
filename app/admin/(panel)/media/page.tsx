'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { createBrowserClient } from '@/lib/supabase/client'
import Image from 'next/image'
import { Trash2, Upload, Loader2, ImagePlus } from 'lucide-react'
import { toast } from 'sonner'

interface MediaItem {
  id: string
  url: string
  filename: string
  created_at: string
}

export default function MediaPage() {
  const supabase = createBrowserClient()
  const [media, setMedia] = useState<MediaItem[]>([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // WHAT: Load all media records from Supabase
  // WHY:  Display existing uploaded images in the media library
  // KILL: Remove this and the page shows empty state forever
  const loadMedia = useCallback(async () => {
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

      if (data) {
        setMedia(data as MediaItem[])
      }
    } catch (err) {
      console.error('Failed to load media:', err)
      toast.error('❌ حدث خطأ أثناء تحميل الصور')
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    loadMedia()
  }, [loadMedia])

  // WHAT: Validate file before upload (type + size)
  // WHY:  Prevent invalid uploads to reduce API errors and bandwidth waste
  // KILL: Remove this and corrupted/large files reach Cloudinary causing 500 errors
  function validateFile(file: File): string | null {
    if (!file.type.startsWith('image/')) {
      return 'يرجى اختيار ملف صورة فقط (PNG, JPG, WebP)'
    }
    const MAX_SIZE = 10 * 1024 * 1024 // 10MB
    if (file.size > MAX_SIZE) {
      return 'حجم الصورة يجب أن يكون أقل من 10MB'
    }
    return null
  }

  // WHAT: Upload file to Cloudinary via API route, then save to Supabase media table
  // WHY:  Cloudinary stores the image; Supabase media table tracks it for the library
  // KILL: Remove this and uploaded images never appear in the media library grid
   async function uploadFile(file: File) {
    const validationError = validateFile(file)
    if (validationError) {
      toast.error(validationError)
      return
    }

    setUploading(true)

    try {
      const formData = new FormData()
      formData.append('file', file)

      // Upload to Cloudinary via API route
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'فشل رفع الصورة')
      }

      const uploadData = await response.json()

      // Save to Supabase media table using RPC (bypasses schema cache)
      const { error: dbError } = await supabase.rpc('insert_media', {
        p_url: uploadData.url,
        p_filename: file.name,
      })

      if (dbError) {
        console.error('DB insert error:', JSON.stringify(dbError, null, 2))
        toast.error('❌ تم رفع الصورة لكن فشل حفظها: ' + dbError.message)
        return
      }

      toast.success('✅ تم رفع الصورة وحفظها بنجاح')
      await loadMedia() // Refresh grid

    } catch (err) {
      console.error('Upload error:', err)
      toast.error('❌ فشل رفع الصورة، حاول مرة أخرى')
    } finally {
      setUploading(false)
      if (inputRef.current) {
        inputRef.current.value = ''
      }
    }
  }
  // WHAT: Handle file selection from hidden input
  // WHY:  Triggered when user clicks upload button and selects a file
  // KILL: Remove this and clicking the upload button does nothing
  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    uploadFile(file)
  }

  // WHAT: Handle drag-and-drop file upload
  // WHY:  Allows users to drag images directly onto the page for faster workflow
  // KILL: Remove this and drag-drop becomes a no-op, degrading UX
  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)

    const file = e.dataTransfer.files?.[0]
    if (!file) return
    uploadFile(file)
  }

  // WHAT: Delete image from Supabase media table
  // WHY:  Keeps media library clean
  // KILL: Remove this and delete button does nothing
  async function handleDelete(item: MediaItem) {
    const confirmed = window.confirm('هل أنت متأكد من حذف هذه الصورة؟')
    if (!confirmed) return

    setDeletingId(item.id)

    try {
      const { error: dbError } = await supabase
        .from('media')
        .delete()
        .eq('id', item.id)

      if (dbError) {
        console.error('Delete error:', dbError)
        toast.error('❌ فشل حذف الصورة')
        return
      }

      toast.success('🗑️ تم حذف الصورة')
      setMedia((prev) => prev.filter((m) => m.id !== item.id))
    } catch (err) {
      console.error('Delete error:', err)
      toast.error('❌ حدث خطأ أثناء الحذف')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div dir="rtl" className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">الصور</h1>
        <button
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white rounded-lg font-medium transition-colors"
        >
          {uploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Upload className="h-4 w-4" />
          )}
          {uploading ? 'جاري الرفع...' : 'رفع صورة جديدة'}
        </button>
      </div>

      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileSelect}
        disabled={uploading}
      />

      {/* Drag & Drop Zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault()
          setIsDragOver(true)
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        className={`mb-6 rounded-xl border-2 border-dashed p-8 text-center transition-colors ${
          isDragOver
            ? 'border-orange-500 bg-orange-50'
            : 'border-gray-300 bg-gray-50 hover:border-gray-400'
        }`}
      >
        <ImagePlus className="mx-auto h-10 w-10 text-gray-400 mb-3" />
        <p className="text-gray-600 font-medium">
          اسحب الصورة هنا أو اضغط على زرار &quot;رفع صورة جديدة&quot;
        </p>
        <p className="text-gray-400 text-sm mt-1">
          PNG, JPG, WebP — حتى 10MB
        </p>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
        </div>
      )}

      {/* Empty State */}
      {!loading && media.length === 0 && (
        <div className="text-center py-16">
          <ImagePlus className="mx-auto h-12 w-12 text-gray-300 mb-4" />
          <p className="text-gray-500 text-lg">لا توجد صور في المكتبة</p>
          <p className="text-gray-400 text-sm mt-1">
            اضغط على &quot;رفع صورة جديدة&quot; لإضافة الصور الأولى
          </p>
        </div>
      )}

      {/* Media Grid */}
      {!loading && media.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {media.map((item) => (
            <div
              key={item.id}
              className="relative group aspect-square rounded-lg overflow-hidden border bg-gray-50"
            >
              <Image
                src={item.url}
                alt={item.filename}
                fill
                sizes="(max-width: 768px) 50vw, (max-width: 1200px) 25vw, 16vw"
                className="object-cover"
              />

              {/* Overlay on hover */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors" />

              {/* Delete button */}
              <button
                onClick={() => handleDelete(item)}
                disabled={deletingId === item.id}
                className="absolute top-2 right-2 p-2 bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all disabled:opacity-100"
                title="حذف"
              >
                {deletingId === item.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
              </button>

              {/* Filename tooltip on hover */}
              <div className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-xs p-2 opacity-0 group-hover:opacity-100 transition-opacity truncate">
                {item.filename}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}