import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Admin from '@/models/Admin';
import { DEFAULT_PASSWORD } from '@/lib/constants';

export async function POST(req) {
  try {
    await connectDB();
    const { oldPassword, newPassword } = await req.json();

    if (!oldPassword || !newPassword) {
      return NextResponse.json(
        { success: false, error: 'Password lama dan baru wajib diisi' },
        { status: 400 }
      );
    }

    if (newPassword.length < 5) {
      return NextResponse.json(
        { success: false, error: 'Password baru minimal 5 karakter' },
        { status: 400 }
      );
    }

    let admin = await Admin.findOne({ username: 'admin' });
    if (!admin) {
      admin = await Admin.create({ username: 'admin', password: DEFAULT_PASSWORD });
    }

    if (admin.password !== oldPassword) {
      return NextResponse.json({ success: false, error: 'Password lama salah!' }, { status: 400 });
    }

    admin.password = newPassword;
    await admin.save();

    return NextResponse.json({
      success: true,
      message: 'Password admin berhasil diubah di database!',
    });
  } catch (error) {
    console.error('Error changing admin password:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
