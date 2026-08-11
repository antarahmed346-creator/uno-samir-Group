'use client'

import { useState } from 'react'
import { Users, Plus, RefreshCw, Trash2, UserCheck, UserX, Crown, KeyRound, Building2, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useUsers, useDeleteUser, useToggleUserStatus } from '@/lib/hooks/useUsers'
import { useBrands } from '@/lib/hooks/useCategories'
import { toast } from 'sonner'

const roleLabels: Record<string, { label: string; color: string }> = {
  super_admin: { label: 'Super Admin', color: 'bg-red-100 text-red-700 border-red-200' },
  brand_manager: { label: 'Brand Manager', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  content_editor: { label: 'Content Editor', color: 'bg-green-100 text-green-700 border-green-200' },
}

export default function UsersPage() {
  const { data: users, isLoading, error, refetch } = useUsers()
  const { data: brands } = useBrands()
  const deleteUser = useDeleteUser()
  const toggleStatus = useToggleUserStatus()

  const [showAddForm, setShowAddForm] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [newUser, setNewUser] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    full_name: '',
    role: 'content_editor' as 'super_admin' | 'brand_manager' | 'content_editor',
    brand_access: [] as string[],
  })

  const handleDelete = async (id: string) => {
    if (!confirm('متأكد من حذف المستخدم؟')) return
    await deleteUser.mutateAsync(id)
  }

  const handleToggle = async (id: string, currentActive: boolean) => {
    await toggleStatus.mutateAsync({ id, is_active: !currentActive })
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validation
    if (newUser.password !== newUser.confirmPassword) {
      toast.error('❌ كلمات المرور غير متطابقة')
      return
    }
    if (newUser.password.length < 6) {
      toast.error('❌ كلمة المرور يجب أن تكون 6 أحرف على الأقل')
      return
    }
    if (newUser.role === 'brand_manager' && newUser.brand_access.length === 0) {
      toast.error('❌ يجب اختيار براند واحد على الأقل لمدير البراند')
      return
    }

    setIsCreating(true)

    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: newUser.email,
          password: newUser.password,
          full_name: newUser.full_name,
          role: newUser.role,
          brand_access: newUser.role === 'super_admin' ? [] : newUser.brand_access,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create user')
      }

      toast.success('✅ تم إنشاء المستخدم بنجاح')
      toast.info('📧 المستخدم يمكنه تسجيل الدخول الآن بالبريد وكلمة المرور')

      setShowAddForm(false)
      setNewUser({
        email: '',
        password: '',
        confirmPassword: '',
        full_name: '',
        role: 'content_editor',
        brand_access: [],
      })
      refetch()

    } catch (err) {
      toast.error(`❌ خطأ: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setIsCreating(false)
    }
  }

  const toggleBrandAccess = (brandId: string) => {
    setNewUser((prev) => {
      const exists = prev.brand_access.includes(brandId)
      if (exists) {
        return { ...prev, brand_access: prev.brand_access.filter((id) => id !== brandId) }
      }
      return { ...prev, brand_access: [...prev.brand_access, brandId] }
    })
  }

  if (error) {
    return (
      <div dir="rtl" className="p-8">
        <div className="rounded-lg border border-red-200 bg-red-50 p-8 text-center space-y-3">
          <p className="text-red-600 font-semibold text-lg">❌ حدث خطأ في تحميل المستخدمين</p>
          <p className="text-red-500 text-sm">{(error as Error).message}</p>
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="ml-2 h-4 w-4" />
            إعادة المحاولة
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div dir="rtl" className="space-y-6 p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Users className="h-6 w-6" />
            <h1 className="text-2xl font-bold tracking-tight">إدارة المستخدمين</h1>
            <span className="group relative">
              <Crown className="h-5 w-5 text-red-500 cursor-help" />
              <span className="absolute top-full left-1/2 -translate-x-1/2 mt-1 px-2 py-1 bg-black text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
                Super Admin فقط
              </span>
            </span>
          </div>
          <p className="text-muted-foreground text-sm">
            {isLoading ? 'جاري التحميل...' : `${users?.length ?? 0} مستخدم`}
          </p>
        </div>
        <Dialog open={showAddForm} onOpenChange={setShowAddForm}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="ml-2 h-4 w-4" />
              إضافة مستخدم
            </Button>
          </DialogTrigger>
          <DialogContent dir="rtl" className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>إضافة مستخدم جديد</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">البريد الإلكتروني *</Label>
                <Input
                  id="email"
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  placeholder="user@example.com"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="full_name">الاسم الكامل *</Label>
                <Input
                  id="full_name"
                  value={newUser.full_name}
                  onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })}
                  placeholder="محمد أحمد"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="password">كلمة المرور *</Label>
                  <Input
                    id="password"
                    type="password"
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    placeholder="******"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">تأكيد كلمة المرور *</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={newUser.confirmPassword}
                    onChange={(e) => setNewUser({ ...newUser, confirmPassword: e.target.value })}
                    placeholder="******"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">الدور</Label>
                <Select
                  value={newUser.role}
                  onValueChange={(v) => setNewUser({ ...newUser, role: v as 'super_admin' | 'brand_manager' | 'content_editor', brand_access: [] })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="content_editor">📝 Content Editor</SelectItem>
                    <SelectItem value="brand_manager">🏢 Brand Manager</SelectItem>
                    <SelectItem value="super_admin">👑 Super Admin</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {newUser.role === 'super_admin' && 'يمكنه الوصول لكل البراندات والمستخدمين'}
                  {newUser.role === 'brand_manager' && 'يمكنه إدارة براند واحد أو أكثر'}
                  {newUser.role === 'content_editor' && 'يمكنه إدارة المنتجات والفئات فقط'}
                </p>
              </div>

              {/* Brand Access - Only for Brand Manager */}
              {newUser.role === 'brand_manager' && (
                <div className="space-y-3 p-4 border rounded-lg bg-gray-50">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-blue-600" />
                    <Label className="font-semibold">البراندات المسموح بها *</Label>
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    {brands?.map((brand) => (
                      <button
                        key={brand.id}
                        type="button"
                        onClick={() => toggleBrandAccess(brand.id)}
                        className={`flex items-center gap-3 p-3 rounded-lg border transition-all text-right ${
                          newUser.brand_access.includes(brand.id)
                            ? 'bg-blue-50 border-blue-300 text-blue-700'
                            : 'bg-white border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <span
                          className="w-4 h-4 rounded-full flex-shrink-0"
                          style={{ backgroundColor: brand.primary_color ?? '#888' }}
                        />
                        <span className="flex-1">{brand.name_ar}</span>
                        {newUser.brand_access.includes(brand.id) && (
                          <Check className="h-4 w-4 text-blue-600" />
                        )}
                      </button>
                    ))}
                  </div>
                  {newUser.brand_access.length > 0 && (
                    <p className="text-xs text-green-600">
                      ✅ تم اختيار {newUser.brand_access.length} براند
                    </p>
                  )}
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Button type="submit" disabled={isCreating} className="bg-orange-500 hover:bg-orange-600">
                  <KeyRound className="ml-2 h-4 w-4" />
                  {isCreating ? 'جاري الإنشاء...' : 'إنشاء مستخدم'}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowAddForm(false)}>
                  إلغاء
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Separator />

      {/* Users Table */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6 h-20 bg-gray-100" />
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {users?.map((user) => (
            <Card key={user.id} className="overflow-hidden hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {/* Avatar */}
                    <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold text-lg">
                      {user.full_name?.charAt(0) || user.email?.charAt(0) || '?'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold">{user.full_name}</p>
                        <Badge variant={user.is_active ? 'default' : 'secondary'}>
                          {user.is_active ? 'نشط' : 'موقوف'}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className={`text-xs px-2 py-0.5 rounded border ${roleLabels[user.role]?.color || 'bg-gray-100'}`}>
                          {roleLabels[user.role]?.label || user.role}
                        </span>
                        {user.brand_access && user.brand_access.length > 0 && (
                          <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                            <Building2 className="h-3 w-3 inline ml-1" />
                            {user.brand_access.length} براند
                          </span>
                        )}
                        {user.last_login && (
                          <span className="text-xs text-muted-foreground">
                            آخر دخول: {new Date(user.last_login).toLocaleDateString('ar-EG')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggle(user.id, user.is_active)}
                      className={user.is_active ? 'text-amber-600' : 'text-green-600'}
                    >
                      {user.is_active ? (
                        <><UserX className="h-4 w-4 ml-1" /> إيقاف</>
                      ) : (
                        <><UserCheck className="h-4 w-4 ml-1" /> تفعيل</>
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(user.id)}
                      className="text-red-600 hover:text-red-700"
                      disabled={deleteUser.isPending}
                    >
                      <Trash2 className="h-4 w-4 ml-1" />
                      حذف
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {(!users || users.length === 0) && (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">لا يوجد مستخدمين</p>
              <p className="text-sm">أضف مستخدم جديد للبدء</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}