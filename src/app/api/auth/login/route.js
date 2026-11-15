import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Admin from '@/models/Admin';
import {
  DEFAULT_ADMIN_PASSWORD,
  checkPassword,
  isHashed,
  hashPassword,
  passwordVersion,
  createSessionToken,
  setSessionCookie,
  loginBlocked,
  recordLoginFail,
  clearLoginFails,
  forgetPasswordVersionCache,
} from '@/lib/apiAuth';

export async function POST(req) {
  try {
    if (loginBlocked(req)) {
      return NextResponse.json(
        { success: false, error: 'Terlalu banyak percobaan. Coba lagi 15 menit lagi.' },
        { status: 429 }
      );
    }

    await connectDB();
    const { password } = await req.json();

    if (!password) {
      return NextResponse.json({ success: false, error: 'Password wajib diisi' }, { status: 400 });
    }

    let admin = await Admin.findOne({ username: 'admin' });
    if (!admin) {
      admin = await Admin.create({ username: 'admin', password: hashPassword(DEFAULT_ADMIN_PASSWORD) });
    }

    if (!checkPassword(password, admin.password)) {
      recordLoginFail(req);
      return NextResponse.json({ success: false, error: 'Password salah!' }, { status: 401 });
    }

    // Password lama masih tersimpan polos -> ubah jadi hash
    if (!isHashed(admin.password)) {
      admin.password = hashPassword(password);
      await admin.save();
      forgetPasswordVersionCache();
    }

    clearLoginFails(req);
    const response = NextResponse.json({ success: true, message: 'Login berhasil' });
    return setSessionCookie(response, createSessionToken(passwordVersion(admin.password)));
  } catch (error) {
    console.error('Error during admin login:', error);
    return NextResponse.json({ success: false, error: 'Login gagal, coba lagi.' }, { status: 500 });
  }
}
