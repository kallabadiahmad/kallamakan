import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Admin from '@/models/Admin';
import { DEFAULT_PASSWORD } from '@/lib/constants';

export async function POST(req) {
  try {
    await connectDB();
    const { password } = await req.json();

    if (!password) {
      return NextResponse.json({ success: false, error: 'Password wajib diisi' }, { status: 400 });
    }

    // Find or initialize admin credentials in MongoDB
    let admin = await Admin.findOne({ username: 'admin' });
    if (!admin) {
      admin = await Admin.create({ username: 'admin', password: DEFAULT_PASSWORD });
    }

    if (password === admin.password) {
      const response = NextResponse.json({
        success: true,
        message: 'Login berhasil',
      });

      // Set cookie for session persistence
      response.cookies.set({
        name: 'kalla_admin_session',
        value: 'active',
        httpOnly: false,
        path: '/',
        maxAge: 60 * 60 * 24 * 7, // 7 days
      });

      return response;
    }

    return NextResponse.json({ success: false, error: 'Password salah!' }, { status: 401 });
  } catch (error) {
    console.error('Error during admin login:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
