import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Expense from '@/models/Expense';

export async function GET() {
  try {
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
    await connectDB();
    const body = await req.json();

    if (!body.id || !body.title || !body.amount) {
      return NextResponse.json(
        { success: false, error: 'Id, judul, dan jumlah pengeluaran wajib diisi' },
        { status: 400 }
      );
    }

    const expense = await Expense.findOneAndUpdate(
      { id: body.id },
      { ...body },
      { new: true, upsert: true }
    );

    return NextResponse.json({ success: true, expense });
  } catch (error) {
    console.error('Error saving expense:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
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
