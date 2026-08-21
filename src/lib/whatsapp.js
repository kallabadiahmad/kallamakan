import { formatCurrency, cleanPhone } from './utils';
import { BANK_ACCOUNTS } from './constants';

export function generateWhatsAppMessage({ orderId, cartItems, formData, subtotal, shippingCost, discount, total, settings, voucher }) {
  const { name, phone, address, notes, shippingMethod, paymentMethod, paymentDetails } = formData;

  const storeName = settings?.storeName || 'KALLA MAKAN';
  
  let msg = ` Halo Admin *${storeName}*, saya mau konfirmasi pesanan baru:\n\n`;
  msg += ` *NOTA PESANAN: #${orderId}*\n`;
  msg += `━━━━━━━━━━━━━━━━━━━━━\n\n`;

  msg += ` *RINCIAN MENU:*\n`;
  cartItems.forEach((item, index) => {
    msg += `${index + 1}. *${item.name}* (${item.size})\n`;
    msg += `   └ ${item.qty}x @ ${formatCurrency(item.price)} = *${formatCurrency(item.price * item.qty)}*\n`;
  });

  msg += `\n━━━━━━━━━━━━━━━━━━━━━\n`;
  msg += ` Subtotal: ${formatCurrency(subtotal)}\n`;
  
  if (shippingCost > 0) {
    msg += `🚚 Ongkir (${shippingMethod?.name || 'Kurir'}): ${formatCurrency(shippingCost)}\n`;
  } else {
    msg += `🚚 Ongkir (${shippingMethod?.name || 'Pickup'}): *GRATIS*\n`;
  }

  if (discount > 0) {
    msg += `🎟️ Diskon Voucher (${voucher?.code || 'PROMO'}): -${formatCurrency(discount)}\n`;
  }

  msg += ` *TOTAL PEMBAYARAN: ${formatCurrency(total)}*\n`;
  msg += `━━━━━━━━━━━━━━━━━━━━━\n\n`;

  msg += `👤 *DATA PENERIMA:*\n`;
  msg += `• Nama: *${name}*\n`;
  msg += `• No. WhatsApp: ${phone}\n`;
  msg += `• Alamat: ${address}\n`;

  if (notes && notes.trim()) {
    msg += `• Catatan: _${notes}_\n`;
  }

  msg += `\n💳 *METODE PEMBAYARAN:*\n`;
  if (paymentMethod === 'transfer') {
    const bankName = paymentDetails?.bank || 'DANA';
    const acc = BANK_ACCOUNTS.find(b => b.bank.toLowerCase() === bankName.toLowerCase()) || BANK_ACCOUNTS[0];
    msg += `• *Transfer / Top Up ${acc.bank}*\n`;
    msg += `  No. Rek / Akun: ${acc.number} (a.n ${acc.holder})\n`;
    msg += `  _(Bukti transfer akan saya kirimkan ke chat ini)_\n`;
  } else {
    msg += `• *COD (Bayar Tunai di Tempat)*\n`;
  }

  msg += `\n📅 _Pesanan dibuat pada: ${new Date().toLocaleString('id-ID')}_\n\n`;
  msg += `Mohon segera diproses ya kak, terima kasih banyak! `;

  return msg;
}

export function openWhatsApp(message, waNumber) {
  const cleaned = cleanPhone(waNumber || '6282227418224');
  const waUrl = `https://wa.me/${cleaned}?text=${encodeURIComponent(message)}`;
  if (typeof window !== 'undefined') {
    window.open(waUrl, '_blank');
  }
}
