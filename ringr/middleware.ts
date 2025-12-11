import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname

  // Skip middleware for public routes
  if (path === '/' || path.startsWith('/api')) {
    return NextResponse.next()
  }

  // Check if env vars are set
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    console.error('Missing Supabase environment variables')
    return NextResponse.next()
  }

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value
          },
          set(name: string, value: string, options: CookieOptions) {
            request.cookies.set({ name, value, ...options })
            response = NextResponse.next({
              request: { headers: request.headers },
            })
            response.cookies.set({ name, value, ...options })
          },
          remove(name: string, options: CookieOptions) {
            request.cookies.set({ name, value: '', ...options })
            response = NextResponse.next({
              request: { headers: request.headers },
            })
            response.cookies.set({ name, value: '', ...options })
          },
        },
      }
    )

    const { data: { session } } = await supabase.auth.getSession()

    // Protected routes - require authentication
    const protectedPaths = ['/dashboard', '/onboarding', '/billing']
    const isProtectedPath = protectedPaths.some(p => path.startsWith(p))

    // Auth routes - redirect to dashboard if already logged in
    const authPaths = ['/login', '/signup']
    const isAuthPath = authPaths.some(p => path.startsWith(p))

    if (isProtectedPath && !session) {
      // Redirect to login if not authenticated
      const redirectUrl = new URL('/login', request.url)
      redirectUrl.searchParams.set('redirect', path)
      return NextResponse.redirect(redirectUrl)
    }

    if (isAuthPath && session) {
      // Redirect to dashboard if already logged in
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    // Check onboarding status for dashboard routes
    if (path.startsWith('/dashboard') && session) {
      const { data: user } = await supabase
        .from('users')
        .select('organization_id, organization:organizations(onboarding_completed)')
        .eq('id', session.user.id)
        .single()

      const org = Array.isArray(user?.organization) 
        ? user?.organization[0] 
        : user?.organization

      // If no organization or onboarding not complete, redirect to onboarding
      if (!user?.organization_id || !org?.onboarding_completed) {
        if (!path.startsWith('/onboarding')) {
          return NextResponse.redirect(new URL('/onboarding', request.url))
        }
      }
    }

    return response
  } catch (error) {
    console.error('Middleware error:', error)
    return NextResponse.next()
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
