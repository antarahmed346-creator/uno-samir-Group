// app/api/admin/users/route.ts — SECURED VERSION

// WHAT: بيتأكد إن الشخص اللي بيبعت الطلب هو super_admin حقيقي مسجل دخول
// WHY:  الراوت ده بيستخدم صلاحيات كاملة على قاعدة البيانات (service role)
//       عشان ينشئ أو يمسح حسابات أدمن — من غير الفحص ده، أي حد بره
//       الموقع كان يقدر يعمل لنفسه حساب Super Admin بأي إيميل وباسورد
// KILL: مسح الدالة دي بيرجّع الثغرة اللي كانت موجودة — أي حد على
//       الإنترنت يقدر يتحكم في الموقع بالكامل من غير باسورد خالص
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

async function requireSuperAdmin() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options: CookieOptions }>) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
          } catch {
            // Server Components can't write cookies
          }
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false as const, status: 401, error: 'Unauthorized' }

  const { data: adminUser, error } = await supabase
    .from('admin_users')
    .select('role, is_active')
    .eq('id', user.id)
    .single()

  if (error || !adminUser || !adminUser.is_active || adminUser.role !== 'super_admin') {
    return { ok: false as const, status: 403, error: 'Forbidden — super_admin only' }
  }

  return { ok: true as const }
}

export async function POST(request: Request) {
  const auth = await requireSuperAdmin()
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  try {
    const body = await request.json()
    const { email, password, full_name, permissions, brand_access } = body

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 })
    }

    if (!brand_access || brand_access.length === 0) {
      return NextResponse.json(
        { error: 'لازم تحدد براند واحد على الأقل' },
        { status: 400 }
      )
    }

    // WHAT: بنبني كائن صلاحيات نضيف منه بس القيم اللي true وموجودة
    //       فعلاً ضمن القائمة المعروفة — أي مفتاح غريب أو قيمة مش
    //       boolean بيتجاهل تلقائياً
    // WHY:  الطلب جايلنا من المتصفح، مينفعش نثق فيه من غير فلترة —
    //       من غيرها حد ممكن يبعت أي JSON غريب يتخزن كما هو
    const KNOWN_PERMISSIONS = [
      'orders', 'products', 'categories', 'brands', 'offers',
      'reservations', 'reports', 'chat', 'media', 'homepage',
      'menu_builder', 'settings',
    ]
    const safePermissions: Record<string, boolean> = {}
    if (permissions && typeof permissions === 'object') {
      for (const k of KNOWN_PERMISSIONS) {
        if (permissions[k] === true) safePermissions[k] = true
      }
    }

    const supabase = createAdminClient()

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })

    if (authError || !authData.user) {
      return NextResponse.json({ error: authError?.message || 'Failed to create user' }, { status: 400 })
    }

    const { data: adminData, error: adminError } = await supabase
      .from('admin_users')
      .insert({
        id: authData.user.id,
        email,
        full_name: full_name || email.split('@')[0],
        // WHAT: role بيتحط قيمة ثابتة دايماً هنا، بغض النظر عن أي
        //       حاجة بعتها المتصفح — الوصول الفعلي بقى محدد بالكامل
        //       عن طريق permissions، مش role
        // WHY:  دفاع إضافي (defense in depth): حتى لو حد قدر يعدّل
        //       الطلب المرسل بأي شكل، مستحيل يعمل نفسه super_admin
        //       من هنا — الحقل مقفول على قيمة واحدة بس دايماً
        role: 'content_editor',
        brand_access: brand_access || [],
        permissions: safePermissions,
        is_active: true,
        avatar_url: null,
        last_login: null,
      })
      .select()
      .single()

    if (adminError) {
      await supabase.auth.admin.deleteUser(authData.user.id)
      return NextResponse.json({ error: adminError.message }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      user: adminData,
      message: 'تم إنشاء المستخدم بنجاح',
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request) {
  const auth = await requireSuperAdmin()
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 })
    }

    const supabase = createAdminClient()

    const { data: targetUser } = await supabase
      .from('admin_users')
      .select('role')
      .eq('id', id)
      .single()

    // WHAT: يمنع حذف آخر حساب super_admin موجود في النظام
    // WHY:  لو اتحذف، محدش هيقدر يدخل لوحة التحكم تاني أبداً
    if (targetUser?.role === 'super_admin') {
      return NextResponse.json(
        { error: 'لا يمكن حذف حساب Super Admin من هذه الشاشة' },
        { status: 400 }
      )
    }

    const { error: adminError } = await supabase.from('admin_users').delete().eq('id', id)
    if (adminError) {
      return NextResponse.json({ error: adminError.message }, { status: 400 })
    }

    const { error: authError } = await supabase.auth.admin.deleteUser(id)
    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 })
    }

    return NextResponse.json({ success: true, message: 'تم حذف المستخدم بنجاح' })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
