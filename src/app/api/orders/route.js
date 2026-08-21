import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Order from '@/models/Order';

export async function GET() {
  try {
    await connectDB();
    const orders = await Order.find({}).sort({ createdAt: -1 }).lean();
    return NextResponse.json({ success: true, orders });
  } catch (error) {
    console.error('Error fetching orders:', error);
    return NextResponse.json({ success: false, error: error.message, orders: [] }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    await connectDB();
    const body = await req.json();

    if (!body.id || !body.customer) {
      return NextResponse.json({ success: false, error: 'Id pesanan dan nama pelanggan wajib diisi' }, { status: 400 });
    }

    const newOrder = await Order.findOneAndUpdate(
      { id: body.id },
      { ...body },
      { new: true, upsert: true }
    );

    return NextResponse.json({ success: true, order: newOrder });
  } catch (error) {
    console.error('Error saving order:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    await connectDB();
    const body = await req.json();
    const { id, status, ...rest } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Id pesanan wajib diisi' }, { status: 400 });
    }

    const updatedOrder = await Order.findOneAndUpdate(
      { id },
      { ...(status ? { status } : {}), ...rest },
      { new: true }
    );

    return NextResponse.json({ success: true, order: updatedOrder });
  } catch (error) {
    console.error('Error updating order:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Id pesanan tidak ditemukan' }, { status: 400 });
    }

    await Order.deleteOne({ id });
    return NextResponse.json({ success: true, message: 'Pesanan berhasil dihapus' });
  } catch (error) {
    console.error('Error deleting order:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
