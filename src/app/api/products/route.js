import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Product from '@/models/Product';
import { DEFAULT_PRODUCTS } from '@/lib/constants';

export async function GET() {
  try {
    await connectDB();
    let products = await Product.find({}).sort({ createdAt: 1 }).lean();

    // Auto-seed default products if database is empty
    if (!products || products.length === 0) {
      await Product.insertMany(DEFAULT_PRODUCTS);
      products = await Product.find({}).sort({ createdAt: 1 }).lean();
    }

    return NextResponse.json({ success: true, products });
  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json(
      { success: false, error: error.message, products: DEFAULT_PRODUCTS },
      { status: 500 }
    );
  }
}

export async function POST(req) {
  try {
    await connectDB();
    const body = await req.json();

    if (!body.id || !body.name) {
      return NextResponse.json({ success: false, error: 'Id dan nama produk wajib diisi' }, { status: 400 });
    }

    const product = await Product.findOneAndUpdate(
      { id: body.id },
      { ...body },
      { new: true, upsert: true }
    );

    return NextResponse.json({ success: true, product });
  } catch (error) {
    console.error('Error saving product:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(req) {
  return POST(req);
}

export async function DELETE(req) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Id produk tidak ditemukan' }, { status: 400 });
    }

    await Product.deleteOne({ id });
    return NextResponse.json({ success: true, message: 'Produk berhasil dihapus' });
  } catch (error) {
    console.error('Error deleting product:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
