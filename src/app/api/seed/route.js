import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Product from '@/models/Product';
import Settings from '@/models/Settings';
import { DEFAULT_PRODUCTS, DEFAULT_SETTINGS } from '@/lib/constants';

export async function POST() {
  try {
    await connectDB();

    await Product.deleteMany({});
    await Product.insertMany(DEFAULT_PRODUCTS);

    await Settings.deleteMany({});
    await Settings.create({ key: 'store_settings', ...DEFAULT_SETTINGS });

    return NextResponse.json({
      success: true,
      message: 'Database MongoDB berhasil di-seed dengan data default Kalla Makan!',
    });
  } catch (error) {
    console.error('Error seeding DB:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
