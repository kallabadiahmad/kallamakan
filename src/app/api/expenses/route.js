import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { requireAdmin } from '@/lib/apiAuth';
import Expense from '@/models/Expense';

export async function GET(req) {
  try {
    const authError = await requireAdmin(req);
    if (authError) return authError;
    await connectDB();
    const expenses = await Expense.find({}).sort({ createdAt: -1 }).lean();
    return NextResponse.json({ success: true, expenses });
  } catch (error) {
    console.error('Error fetching expenses:', error);
    return NextResponse.json({ success: false, error: error.message, expenses: [] }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const authError = await requireAdmin(req);
    if (authError) return authError;
    await connectDB();
    const body = await req.json();

    if (!body.id || !body.title || !body.amount) {
      return NextResponse.json(
        { success: false, error: 'Id, judul, dan jumlah pengeluaran wajib diisi' },
        { status: 400 }
      );
    }

    const amount = Math.round(Number(body.amount));
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ success: false, error: 'Jumlah pengeluaran tidak valid' }, { status: 400 });
    }
    const data = {
      id: String(body.id),
      date: String(body.date || '').slice(0, 10),
      title: String(body.title || '').slice(0, 200),
      desc: String(body.desc || '').slice(0, 300),
      notes: String(body.notes || '').slice(0, 300),
      amount,
      category: String(body.category || 'lainnya'),
    };

    const expense = await Expense.findOneAndUpdate(
      { id: data.id },
      { $set: data },
      { returnDocument: 'after', upsert: true }
    );

    return NextResponse.json({ success: true, expense });
  } catch (error) {
    console.error('Error saving expense:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const authError = await requireAdmin(req);
    if (authError) return authError;
    await connectDB();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Id pengeluaran tidak ditemukan' }, { status: 400 });
    }

    await Expense.deleteOne({ id });
    return NextResponse.json({ success: true, message: 'Pengeluaran berhasil dihapus' });
  } catch (error) {
    console.error('Error deleting expense:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
