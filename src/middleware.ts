// ============================================
// MitrAI - Next.js Middleware
// Protects routes by verifying Supabase Auth session
// Refreshes session tokens on every request
// ============================================

import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANT: getUser() refreshes the session if needed
  const { data: { user } } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isPublicPage = pathname === '/' || pathname === '/login' || pathname === '/reset-password' || pathname === '/privacy' || pathname === '/terms';
  const isApiRoute = pathname.startsWith('/api/');
  const isPublicApi = pathname.startsWith('/api/otp') || pathname.startsWith('/api/auth');
  const isAdminRoute = pathname.startsWith('/admin');
  const isAdminApi = pathname.startsWith('/api/admin');

  // CSRF protection: validate Origin header on mutating API requests
  if (isApiRoute && !isPublicApi && ['POST', 'PUT', 'DELETE', 'PATCH'].includes(request.method)) {
    const origin = request.headers.get('origin');
    if (origin) {
      const allowedHost = request.nextUrl.host; // e.g. "mitrai-study.vercel.app" or "localhost:3000"
      try {
        const originHost = new URL(origin).host;
        if (originHost !== allowedHost) {
          return NextResponse.json(
            { success: false, error: 'Forbidden: origin mismatch' },
            { status: 403 }
          );
        }
      } catch {
        return NextResponse.json(
          { success: false, error: 'Forbidden: invalid origin' },
          { status: 403 }
        );
      }
    }
  }

  // Allow public pages and public APIs without auth
  if (isPublicPage || isPublicApi) {
    // If user is logged in and on login page, redirect to home
    if (user && pathname === '/login') {
      return NextResponse.redirect(new URL('/home', request.url));
    }
    return supabaseResponse;
  }

  // Allow admin routes — admin has its own cookie-based auth
  if (isAdminRoute || isAdminApi) {
    return supabaseResponse;
  }

  // For API routes: let the route handler return 401 (don't redirect)
  if (isApiRoute) {
    return supabaseResponse;
  }

  // For protected pages: redirect to login if not authenticated
  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     * - public folder assets
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
