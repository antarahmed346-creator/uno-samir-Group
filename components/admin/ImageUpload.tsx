'use client'

import { useState, useRef } from 'react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Upload, X, Loader2, ImageIcon, Library } from 'lucide-react'
import { toast } from 'sonner'
import { MediaPicker } from './MediaPicker'

// WHAT: Props for the reusable image upload + picker component
// WHY:  Defines the contract so any parent form can bind to it
// KILL: Remove this and parent forms cannot pass image state or callbacks
interface ImageUploadProps {
  value?: string | null
  onChange: (url: string | null) => void
  disabled?: boolean
}

// WHAT: Single-image upload widget with "Upload" + "Pick from Library" dual options
// WHY:  Admins can either upload a new image or reuse an existing one from the media library
// KILL: Remove this and every form forces re-upload of the same image — terrible UX and wasted Cloudinary storage
export function ImageUpload({ value, onChange, disabled }: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // WHAT: Upload a new file to Cloudinary via API route
  // WHY:  Handles brand-new image uploads when the admin doesn't want to reuse an existing image
  // KILL: Remove this and admins can only pick from library — no new uploads possible
  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate MIME type (never trust client-side extension alone)
    if (!file.type.startsWith('image/')) {
      toast.error('يرجى اختيار صورة فقط')
      return
    }

    // Validate file size (5MB max for product images)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('حجم الصورة يجب أن يكون أقل من 5MB')
      return
    }

    setIsUploading(true)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error('فشل رفع الصورة')
      }

      const data = await response.json()
      onChange(data.url)
      toast.success('✅ تم رفع الصورة بنجاح')
    } catch (error) {
      toast.error('❌ فشل رفع الصورة، حاول مرة أخرى')
      console.error(error)
    } finally {
      setIsUploading(false)
      if (inputRef.current) {
        inputRef.current.value = ''
      }
    }
  }

  // WHAT: Clear the selected image
  // WHY:  Allows admin to remove the current image and pick/upload a different one
  // KILL: Remove this and the image is stuck forever — no way to clear it
  function handleRemove() {
    onChange(null)
    if (inputRef.current) {
      inputRef.current.value = ''
    }
  }

  // WHAT: Handle image selection from the media library picker
  // WHY:  Reuses an existing Cloudinary image instead of uploading a duplicate
  // KILL: Remove this and the "Pick from Library" button does nothing
  function handlePickerSelect(url: string) {
    onChange(url)
    toast.success('✅ تم اختيار الصورة')
  }

  return (
    <div className="space-y-3">
      {/* Preview */}
      {value ? (
        <div className="relative w-full h-48 rounded-lg overflow-hidden border bg-muted">
          <Image
            src={value}
            alt="صورة المنتج"
            fill
            className="object-cover"
          />
          {!disabled && (
            <button
              type="button"
              onClick={handleRemove}
              className="absolute top-2 start-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 transition-colors shadow-md"
              title="إزالة الصورة"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      ) : (
        <div
          onClick={() => !disabled && !isUploading && inputRef.current?.click()}
          className="w-full h-48 rounded-lg border-2 border-dashed border-muted-foreground/25 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-muted-foreground/50 hover:bg-muted/50 transition-all"
        >
          {isUploading ? (
            <>
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">جاري الرفع...</p>
            </>
          ) : (
            <>
              <ImageIcon className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                اضغط لرفع صورة أو اختر من المكتبة
              </p>
              <p className="text-xs text-muted-foreground/70">
                PNG, JPG, WebP — حتى 5MB
              </p>
            </>
          )}
        </div>
      )}

      {/* Action Buttons */}
      {!value && (
        <div className="flex gap-2">
          {/* Upload Button */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled || isUploading}
            onClick={() => inputRef.current?.click()}
            className="flex-1"
          >
            {isUploading ? (
              <Loader2 className="ms-2 h-4 w-4 animate-spin" />
            ) : (
              <Upload className="ms-2 h-4 w-4" />
            )}
            {isUploading ? 'جاري الرفع...' : 'رفع صورة'}
          </Button>

          {/* Pick from Library Button */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled || isUploading}
            onClick={() => setPickerOpen(true)}
            className="flex-1"
          >
            <Library className="ms-2 h-4 w-4" />
            اختيار من المكتبة
          </Button>
        </div>
      )}

      {/* Change Button (when image already selected) */}
      {value && !disabled && (
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isUploading}
            onClick={() => inputRef.current?.click()}
            className="flex-1"
          >
            {isUploading ? (
              <Loader2 className="ms-2 h-4 w-4 animate-spin" />
            ) : (
              <Upload className="ms-2 h-4 w-4" />
            )}
            تغيير الصورة
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isUploading}
            onClick={() => setPickerOpen(true)}
            className="flex-1"
          >
            <Library className="ms-2 h-4 w-4" />
            اختيار من المكتبة
          </Button>
        </div>
      )}

      {/* Hidden File Input */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
        disabled={disabled || isUploading}
      />

      {/* Media Picker Modal */}
      <MediaPicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onSelect={handlePickerSelect}
        selectedUrl={value}
      />
    </div>
  )
}