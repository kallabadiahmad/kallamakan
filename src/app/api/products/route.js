import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { requireAdmin } from '@/lib/apiAuth';
import Product from '@/models/Product';
import Settings from '@/models/Settings';
import { DEFAULT_PRODUCTS } from '@/lib/constants';

// Produk bawaan (DEFAULT_PRODUCTS) hanya dibuat SEKALI di database.
// Sebelumnya setiap GET menimpa ulang varian & harga dengan nilai di kode,
// sehingga harga yang diedit admin selalu balik lagi ke harga lama.
async function seedMissingDefaultProducts() {
  let settings = await Settings.findOne({ key: 'store_settings' });
  if (!settings) {
    settings = await Settings.create({ key: 'store_settings' });
  }

  const seeded = new Set(settings.seededProductIds || []);
  let changed = false;

  for (const defProd of DEFAULT_PRODUCTS) {
    if (seeded.has(defProd.id)) continue;
    const exists = await Product.exists({ id: defProd.id });
    if (!exists) {
      await Product.create(defProd);
    }
    seeded.add(defProd.id);
    changed = true;
  }

  if (changed) {
    await Settings.updateOne(
      { key: 'store_settings' },
      { $set: { seededProductIds: Array.from(seeded) } }
    );
  }
}

function toInt(value) {
  const n = Math.round(Number(String(value ?? '').replace(/[^0-9.-]/g, '')));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

// Bersihkan data produk dari form admin sebelum disimpan
function sanitizeProduct(body) {
  const variants = (Array.isArray(body.variants) ? body.variants : [])
    .map((v, i) => ({
      id: String(v.id || `v_${i + 1}`),
      size: String(v.size || '').trim(),
      price: toInt(v.price),
      hpp: toInt(v.hpp),
    }))
    .filter((v) => v.size && v.price > 0);

  return {
    id: String(body.id),
    name: String(body.name || '').trim(),
    description: String(body.description || ''),
    category: String(body.category || ''),
    badge: String(body.badge || ''),
    emoji: String(body.emoji || ''),
    theme: String(body.theme || ''),
    image: String(body.image || ''),
    active: body.active !== false,
    variants,
  };
}

export async function GET() {
  try {
    await connectDB();
    await seedMissingDefaultProducts();

    const products = await Product.find({}).sort({ createdAt: 1 }).lean();

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
    const authError = await requireAdmin(req);
    if (authError) return authError;
    await connectDB();
    const body = await req.json();

    if (!body.id || !body.name) {
      return NextResponse.json({ success: false, error: 'Id dan nama produk wajib diisi' }, { status: 400 });
    }

    const data = sanitizeProduct(body);
    if (data.variants.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Minimal 1 ukuran dengan harga lebih dari 0' },
        { status: 400 }
      );
    }

    const product = await Product.findOneAndUpdate(
      { id: data.id },
      { $set: data },
      { returnDocument: 'after', upsert: true, runValidators: true }
    ).lean();

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
    const authError = await requireAdmin(req);
    if (authError) return authError;
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
