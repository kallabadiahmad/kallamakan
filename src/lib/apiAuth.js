import { NextResponse } from 'next/server';

/**
 * Simple API authentication middleware.
 * Checks for admin session via cookie or API key via header.
 * 
 * Usage in API routes:
 *   import { requireAuth } from '@/lib/apiAuth';
 *   const authError = requireAuth(req);
 *   if (authError) return authError;
 */
export function requireAuth(req) {
  // Allow GET requests without auth (public read access for storefront)
  if (req.method === 'GET') return null;

  // Check API key in header
  const apiKey = req.headers.get('x-api-key');
  if (apiKey && apiKey === process.env.ADMIN_API_KEY) {
    return null;
  }

  // Check admin session cookie
  const sessionCookie = req.cookies?.get('kalla_admin_session')?.value;
  if (sessionCookie === 'active') {
    return null;
  }

  // Check referer — allow requests from same origin (browser form submissions)
  const referer = req.headers.get('referer') || '';
  const host = req.headers.get('host') || '';
  if (referer && host && referer.includes(host)) {
    return null; // Same-origin request from our own frontend
  }

  // If no auth method passes, return unauthorized
  return NextResponse.json(
    { success: false, error: 'Unauthorized — akses ditolak' },
    { status: 401 }
  );
}
