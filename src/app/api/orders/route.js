import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Order from '@/models/Order';
import Product from '@/models/Product';
import { requireAdmin, isAdminRequest } from '@/lib/apiAuth';
import { PROMO_VOUCHERS, SHIPPING_METHODS, PAYMENT_METHODS, BANK_ACCOUNTS } from '@/lib/constants';
import { generateOrderId } from '@/lib/utils';

const str = (v, max = 300) => String(v ?? '').trim().slice(0, max);

// Daftar pesanan berisi nama, nomor HP & alamat pembeli -> hanya untuk admin
export async function GET(req) {
  try {
    const authError = await requireAdmin(req);
    if (authError) return authError;

    await connectDB();
    const orders = await Order.find({}).sort({ createdAt: -1 }).lean();
    return NextResponse.json({ success: true, orders });
  } catch (error) {
    console.error('Error fetching orders:', error);
    return NextResponse.json({ success: false, error: error.message, orders: [] }, { status: 500 });
  }
}

/**
 * Pesanan dari pembeli (tanpa login).
 * Harga, modal, diskon & total dihitung ulang di server dari data produk asli,
 * jadi angka omset tidak bisa diakali dari browser.
 */
async function buildPublicOrder(body) {
  const products = await Product.find({ active: { $ne: false } }).lean();
  const items = [];

  for (const raw of Array.isArray(body.items) ? body.items.slice(0, 50) : []) {
    const prod = products.find((p) => p.id === raw.productId);
    if (!prod) continue;
    const variants = prod.variants || [];
    const variant =
      variants.find((v) => `${prod.id}-${v.id || v.size}` === raw.id) ||
      variants.find((v) => v.size === raw.size);
    if (!variant) continue;
    const qty = Math.min(99, Math.max(1, Math.round(Number(raw.qty) || 1)));
    items.push({
      id: `${prod.id}-${variant.id || variant.size}`,
      productId: prod.id,
      name: prod.name,
      size: variant.size,
      price: variant.price,
      hpp: variant.hpp || Math.round(variant.price * 0.5),
      emoji: prod.emoji || '',
      qty,
    });
  }

  if (items.length === 0) return { error: 'Produk di pesanan tidak ditemukan atau sudah tidak dijual' };

  const subtotal = items.reduce((s, it) => s + it.price * it.qty, 0);
  const totalHPP = items.reduce((s, it) => s + it.hpp * it.qty, 0);

  const voucher = PROMO_VOUCHERS.find((v) => v.code === str(body.voucherCode, 30).toUpperCase());
  const discount = voucher && subtotal >= voucher.minOrder ? voucher.discount : 0;

  const shipping = SHIPPING_METHODS.find((m) => m.id === body.shippingMethod) || SHIPPING_METHODS[0];
  const payment = PAYMENT_METHODS.find((m) => m.id === body.paymentMethod) || PAYMENT_METHODS[0];
  const bank =
    payment.id === 'transfer'
      ? (BANK_ACCOUNTS.find((b) => b.bank === body.paymentBank) || BANK_ACCOUNTS[0]).bank
      : '';

  return {
    order: {
      date: new Date().toISOString(),
      customer: str(body.customer, 100),
      phone: str(body.phone, 30),
      address: str(body.address, 500),
      notes: str(body.notes, 500),
      items,
      subtotal,
      totalHPP,
      grossProfit: Math.max(0, subtotal - totalHPP - discount),
      shippingMethod: shipping.id,
      shippingName: str(body.shippingName, 60) || shipping.name,
      shippingCost: shipping.price || 0,
      discount,
      voucherCode: discount > 0 ? voucher.code : null,
      total: Math.max(0, subtotal + (shipping.price || 0) - discount),
      paymentMethod: payment.id,
      paymentBank: bank,
      status: 'pending',
    },
  };
}

export async function POST(req) {
  try {
    await connectDB();
    const body = await req.json();

    if (!body.id || !body.customer) {
      return NextResponse.json({ success: false, error: 'Id pesanan dan nama pelanggan wajib diisi' }, { status: 400 });
    }

    // Admin (order manual / edit): simpan apa adanya
    if (await isAdminRequest(req)) {
      const { _id, __v, createdAt, updatedAt, ...data } = body;
      const saved = await Order.findOneAndUpdate(
        { id: str(data.id, 40) },
        { $set: data },
        { returnDocument: 'after', upsert: true }
      );
      return NextResponse.json({ success: true, order: saved });
    }

    // Pembeli: hanya boleh membuat pesanan BARU, tidak bisa menimpa pesanan lain
    const built = await buildPublicOrder(body);
    if (built.error) {
      return NextResponse.json({ success: false, error: built.error }, { status: 400 });
    }
    if (!built.order.phone) {
      return NextResponse.json({ success: false, error: 'Nomor WhatsApp wajib diisi' }, { status: 400 });
    }

    let id = /^KM-[0-9A-Z-]{4,20}$/.test(String(body.id)) ? String(body.id) : generateOrderId();
    for (let i = 0; i < 5 && (await Order.exists({ id })); i++) {
      id = generateOrderId();
    }

    const created = await Order.create({ id, ...built.order });
    return NextResponse.json({ success: true, order: created });
  } catch (error) {
    console.error('Error saving order:', error);
    return NextResponse.json({ success: false, error: 'Gagal menyimpan pesanan' }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    const authError = await requireAdmin(req);
    if (authError) return authError;

    await connectDB();
    const body = await req.json();
    const { id, status, _id, __v, createdAt, updatedAt, ...rest } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Id pesanan wajib diisi' }, { status: 400 });
    }

    const updatedOrder = await Order.findOneAndUpdate(
      { id },
      { $set: { ...(status ? { status } : {}), ...rest } },
      { returnDocument: 'after' }
    );

    return NextResponse.json({ success: true, order: updatedOrder });
  } catch (error) {
    console.error('Error updating order:', error);
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
      return NextResponse.json({ success: false, error: 'Id pesanan tidak ditemukan' }, { status: 400 });
    }

    await Order.deleteOne({ id });
    return NextResponse.json({ success: true, message: 'Pesanan berhasil dihapus' });
  } catch (error) {
    console.error('Error deleting order:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
