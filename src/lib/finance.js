/* =============================================
   KALLA MAKAN - RUMUS KEUANGAN (satu sumber untuk Dashboard & Keuangan)
   =============================================
   Omzet        = harga produk yang terjual − diskon voucher
                  (ongkir TIDAK dihitung karena dibayar ke kurir)
   Pesanan yang dihitung = semua kecuali status "Dibatalkan"
   Rekap harian (source: 'rekap') = pendapatan sehari dari catatan; masuk omzet,
                  tapi tidak dihitung sebagai jumlah pesanan / AOV / HPP.
                  Kalau suatu tanggal punya rekap, angka rekap = omzet hari itu;
                  pesanan web di tanggal yang sama tidak ditambahkan lagi (supaya tidak dobel).
   Profit Bersih = Omzet − Total Pengeluaran yang dicatat
                  (bahan baku, iklan, packaging, operasional, lain-lain)
   Estimasi HPP  = modal per porsi × jumlah terjual (hanya perkiraan,
                  tidak dikurangkan lagi dari profit supaya bahan baku
                  tidak terhitung dua kali)
*/

export const CONFIRMED_STATUSES = ['transferred', 'processing', 'shipped', 'completed'];

export function isCountedOrder(order) {
  return !!order && order.status !== 'cancelled';
}

/** Rekap pendapatan harian (dari catatan), bukan pesanan per pembeli */
export function isRecapOrder(order) {
  return !!order && order.source === 'rekap';
}

export function isPendingOrder(order) {
  return !!order && (order.status === 'pending' || !order.status);
}

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function itemQty(item) {
  const q = num(item?.qty);
  return q > 0 ? q : 1;
}

/** Total harga produk sebelum diskon */
export function orderItemsTotal(order) {
  if (!order) return 0;
  if (Array.isArray(order.items) && order.items.length > 0) {
    const sum = order.items.reduce((s, it) => s + num(it.price) * itemQty(it), 0);
    if (sum > 0) return sum;
  }
  if (num(order.subtotal) > 0) return num(order.subtotal);
  // Data lama tanpa subtotal: total dikurangi ongkir, ditambah diskon
  return Math.max(0, num(order.total) - num(order.shippingCost) + num(order.discount));
}

/** Omzet satu pesanan = harga produk − diskon (tanpa ongkir) */
export function orderRevenue(order) {
  return Math.max(0, orderItemsTotal(order) - num(order?.discount));
}

/** Estimasi modal (HPP) satu pesanan */
export function orderHPP(order, products = []) {
  if (!order) return 0;
  if (Array.isArray(order.items) && order.items.length > 0) {
    return order.items.reduce((s, it) => {
      let hpp = num(it.hpp);
      if (hpp <= 0) {
        const prod = (products || []).find((p) => p.id === it.productId);
        const variant = prod?.variants?.find((v) => v.size === it.size) || prod?.variants?.[0];
        hpp = num(variant?.hpp) || Math.round(num(it.price) * 0.5);
      }
      return s + hpp * itemQty(it);
    }, 0);
  }
  if (num(order.totalHPP) > 0) return num(order.totalHPP);
  return Math.round(orderItemsTotal(order) * 0.5);
}

/** Tanggal lokal YYYY-MM-DD. String "YYYY-MM-DD" dianggap tanggal lokal (bukan UTC). */
export function toDateKey(value) {
  if (!value) return '';
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const d = value instanceof Date ? value : new Date(value);
  if (isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function todayKey() {
  return toDateKey(new Date());
}

export function daysAgoKey(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return toDateKey(d);
}

/** Filter periode berdasarkan tanggal lokal: today | week (7 hari terakhir) | month | year | all */
export function inPeriod(dateValue, period) {
  const key = toDateKey(dateValue);
  if (!key) return false;
  if (period === 'all') return true;
  const today = todayKey();
  if (period === 'today') return key === today;
  if (period === 'week') return key >= daysAgoKey(6) && key <= today;
  if (period === 'month') return key.slice(0, 7) === today.slice(0, 7);
  if (period === 'year') return key.slice(0, 4) === today.slice(0, 4);
  return true;
}

/** Ringkasan keuangan untuk sekumpulan pesanan & pengeluaran yang sudah difilter */
export function summarize(orders = [], expenses = [], products = []) {
  const allCounted = (orders || []).filter(isCountedOrder);
  const recapDates = new Set(allCounted.filter(isRecapOrder).map((o) => toDateKey(o.date)));
  let coveredByRecap = 0;
  const counted = allCounted.filter((o) => {
    if (isRecapOrder(o) || !recapDates.has(toDateKey(o.date))) return true;
    coveredByRecap += 1;
    return false;
  });

  let revenue = 0;
  let grossSales = 0;
  let discount = 0;
  let pendingRevenue = 0;
  let hpp = 0;
  let itemsSold = 0;
  let recapRevenue = 0;
  let recapDays = 0;
  let orderRevenueOnly = 0;

  counted.forEach((o) => {
    const r = orderRevenue(o);
    revenue += r;
    grossSales += orderItemsTotal(o);
    discount += Math.min(num(o.discount), orderItemsTotal(o));
    if (isRecapOrder(o)) {
      recapRevenue += r;
      recapDays += 1;
      return;
    }
    orderRevenueOnly += r;
    hpp += orderHPP(o, products);
    if (isPendingOrder(o)) pendingRevenue += r;
    if (Array.isArray(o.items)) itemsSold += o.items.reduce((s, it) => s + itemQty(it), 0);
  });

  let totalExpenses = 0;
  let adsExpense = 0;
  const expenseByCategory = {};
  (expenses || []).forEach((e) => {
    const amt = num(e.amount);
    totalExpenses += amt;
    const cat = e.category || 'lainnya';
    expenseByCategory[cat] = (expenseByCategory[cat] || 0) + amt;
    if (cat === 'ads_ctwa') adsExpense += amt;
  });

  const orderCount = counted.length - recapDays; // pesanan per pembeli saja
  const netProfit = revenue - totalExpenses;
  const grossProfit = orderRevenueOnly - hpp; // estimasi, hanya dari pesanan per item

  return {
    orderCount,
    itemsSold,
    grossSales,
    discount,
    revenue,
    recapRevenue,
    recapDays,
    coveredByRecap, // pesanan web yang sudah tercakup di rekap harian
    orderRevenue: orderRevenueOnly,
    pendingRevenue,
    confirmedRevenue: revenue - pendingRevenue,
    hpp,
    grossProfit,
    totalExpenses,
    adsExpense,
    operationalExpense: totalExpenses - adsExpense,
    expenseByCategory,
    netProfit,
    margin: revenue > 0 ? ((netProfit / revenue) * 100).toFixed(1) : '0.0',
    aov: orderCount > 0 ? Math.round(orderRevenueOnly / orderCount) : 0,
    avgProfitPerOrder: orderCount > 0 && recapDays === 0 ? Math.round(netProfit / orderCount) : 0,
    roas: adsExpense > 0 ? (revenue / adsExpense).toFixed(2) : '∞',
    // Biaya iklan per pesanan (CPA) — penting untuk CTWA
    // (tidak dihitung kalau ada rekap harian, karena jumlah pesanannya tidak tercatat)
    cpa: adsExpense > 0 && orderCount > 0 && recapDays === 0 ? Math.round(adsExpense / orderCount) : 0,
  };
}
