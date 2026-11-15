import { NextResponse } from 'next/server';
import { clearSessionCookie } from '@/lib/apiAuth';

export async function POST() {
  return clearSessionCookie(NextResponse.json({ success: true }));
}
