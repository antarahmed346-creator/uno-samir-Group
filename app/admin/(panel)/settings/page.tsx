'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase/client'
import { Loader2, User, Lock, Save } from 'lucide-react'

export default function AdminSettingsPage() {
  const router = useRouter()
  const supabase = createBrowserClient()

  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  useEffect(() => {
    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/admin/login')
        return
      }

      const { data: admin } = await supabase
        .from('admin_users')
        .select('full_name, email')
        .eq('id', user.id)
        .single()

      if (admin) {
        setFullName(admin.full_name)
        setEmail(admin.email)
      }
    }

    loadProfile()
  }, [supabase, router])

  async function updateProfile(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setMessage(null)
    setError(null)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // تحديث الإيميل في Auth
    if (email !== user.email) {
      const { error: emailError } = await supabase.auth.updateUser({ email })
      if (emailError) {
        setError('حدث خطأ في تحديث الإيميل')
        setLoading(false)
        return
      }
    }

    // تحديث الاسم في admin_users
    const { error: dbError } = await supabase
      .from('admin_users')
      .update({ full_name: fullName, email })
      .eq('id', user.id)

    if (dbError) {
      setError('حدث خطأ في تحديث البيانات')
      setLoading(false)
      return
    }

    setMessage('✅ تم تحديث البيانات بنجاح')
    setLoading(false)
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setMessage(null)
    setError(null)

    if (newPassword !== confirmPassword) {
      setError('❌ كلمة المرور الجديدة غير متطابقة')
      setLoading(false)
      return
    }

    if (newPassword.length < 6) {
      setError('❌ كلمة المرور لازم تكون 6 أحرف على الأقل')
      setLoading(false)
      return
    }

    // نتحقق من الباسورد الحالي
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password: currentPassword,
    })

    if (signInError) {
      setError('❌ كلمة المرور الحالية غلط')
      setLoading(false)
      return
    }

    // نغير الباسورد
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    })

    if (updateError) {
      setError('❌ حدث خطأ في تغيير كلمة المرور')
      setLoading(false)
      return
    }

    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
    setMessage('✅ تم تغيير كلمة المرور بنجاح')
    setLoading(false)
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8 p-6">
      <h1 className="text-3xl font-bold">⚙️ إعدادات الحساب</h1>

      {/* رسائل */}
      {message && (
        <div className="bg-green-50 border border-green-200 text-green-700 p-4 rounded-lg">
          {message}
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg">
          {error}
        </div>
      )}

      {/* تحديث البيانات */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-6">
        <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
          <User className="w-5 h-5" />
          بيانات الحساب
        </h2>
        <form onSubmit={updateProfile} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">الاسم الكامل</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-4 py-3 border rounded-lg"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">البريد الإلكتروني</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border rounded-lg"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            حفظ التغييرات
          </button>
        </form>
      </div>

      {/* تغيير الباسورد */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-6">
        <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
          <Lock className="w-5 h-5" />
          تغيير كلمة المرور
        </h2>
        <form onSubmit={changePassword} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">كلمة المرور الحالية</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full px-4 py-3 border rounded-lg"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">كلمة المرور الجديدة</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-4 py-3 border rounded-lg"
              required
              minLength={6}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">تأكيد كلمة المرور الجديدة</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-3 border rounded-lg"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
            تغيير كلمة المرور
          </button>
        </form>
      </div>
    </div>
  )
}