import { NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/apiAuth';

// Dipakai halaman admin untuk cek apakah masih login
export async function GET(req) {
  try {
    const authenticated = await isAdminRequest(req);
    return NextResponse.json({ success: true, authenticated });
  } catch {
    return NextResponse.json({ success: false, authenticated: false }, { status: 500 });
  }
}
