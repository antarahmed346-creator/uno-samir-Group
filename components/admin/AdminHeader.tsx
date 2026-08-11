// components/admin/AdminHeader.tsx
export default function AdminHeader({ userName, userRole }: { userName: string, userRole: string }) {
  const roleLabel = userRole === 'super_admin' ? 'Super Admin' 
    : userRole === 'brand_manager' ? 'Brand Manager' 
    : 'Content Editor'

  return (
    <header className="bg-white border-b px-6 py-4 flex justify-between items-center">
      <h2 className="text-lg font-semibold">لوحة التحكم</h2>
      <div className="text-sm text-gray-600">
        {userName} • {roleLabel}
      </div>
    </header>
  )
}