import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Admin from '@/models/Admin';
import {
  DEFAULT_ADMIN_PASSWORD,
  requireAdmin,
  checkPassword,
  hashPassword,
  passwordVersion,
  createSessionToken,
  setSessionCookie,
  forgetPasswordVersionCache,
} from '@/lib/apiAuth';

export async function POST(req) {
  try {
    const authError = await requireAdmin(req);
    if (authError) return authError;

    await connectDB();
    const { oldPassword, newPassword } = await req.json();

    if (!oldPassword || !newPassword) {
      return NextResponse.json(
        { success: false, error: 'Password lama dan baru wajib diisi' },
        { status: 400 }
      );
    }

    if (String(newPassword).length < 8) {
      return NextResponse.json(
        { success: false, error: 'Password baru minimal 8 karakter' },
        { status: 400 }
      );
    }

    let admin = await Admin.findOne({ username: 'admin' });
    if (!admin) {
      admin = await Admin.create({ username: 'admin', password: hashPassword(DEFAULT_ADMIN_PASSWORD) });
    }

    if (!checkPassword(oldPassword, admin.password)) {
      return NextResponse.json({ success: false, error: 'Password lama salah!' }, { status: 400 });
    }

    admin.password = hashPassword(newPassword);
    await admin.save();
    forgetPasswordVersionCache();

    // Sesi di HP/laptop lain otomatis keluar. Sesi yang sedang dipakai diperbarui.
    const response = NextResponse.json({
      success: true,
      message: 'Password admin berhasil diubah. Perangkat lain perlu login ulang.',
    });
    return setSessionCookie(response, createSessionToken(passwordVersion(admin.password)));
  } catch (error) {
    console.error('Error changing admin password:', error);
    return NextResponse.json({ success: false, error: 'Gagal mengubah password' }, { status: 500 });
  }
}
