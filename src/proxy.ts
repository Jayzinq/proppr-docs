import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function proxy(request: NextRequest) {
  const host = request.headers.get('host') || ''
  const pathname = request.nextUrl.pathname

  // If accessing docs.proppr.io
  if (host.startsWith('docs.')) {
    // Root path on docs subdomain -> redirect to /quickstart
    if (pathname === '/') {
      return NextResponse.rewrite(new URL('/quickstart', request.url))
    }
    // Allow other paths to work normally on docs subdomain
    return NextResponse.next()
  }

  // Main domain (proppr.io) - serve landing page at root.
  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.jpg$).*)',
  ],
}
