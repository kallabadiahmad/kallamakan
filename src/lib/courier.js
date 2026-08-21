/* =============================================
   KALLA MAKAN - COURIER & SHIPPING UTILITIES
   ============================================= */

import { formatCurrency, cleanPhone } from './utils';
import { CONFIG } from './constants';

/**
 * Fixed sender information — hardcoded as requested
 */
export const SENDER_INFO = {
  name: 'kallamakan',
  address: 'jl banda sraya gang buntu rumah ke4 sebelum rumah tingkat putih.',
  mapsLink: 'https://maps.app.goo.gl/CF4DohuVoD3c3gRQ6',
  phone: '082227418224',
};

/**
 * Generate courier pickup & drop text format
 * Copy-paste ready for Gojek / Grab / Paxel chat
 */
export function generateCourierText(order) {
  if (!order) return '';

  const items = Array.isArray(order.items) ? order.items : [];
  const itemLines = items
    .map((item) => `• ${item.qty}x ${item.name} (${item.size})`)
    .join('\n');

  const totalCups = items.reduce((sum, item) => sum + item.qty, 0);
  const paymentInfo =
    order.paymentMethod === 'cod'
      ? `COD ${formatCurrency(order.total || order.subtotal || 0)}`
      : `Sudah Transfer ${formatCurrency(order.total || order.subtotal || 0)}`;

  let text = `📦 FORMAT PENGIRIMAN\n\n`;

  // PENGIRIM (fixed)
  text += `PENGIRIM\n`;
  text += `Nama    : ${SENDER_INFO.name}\n`;
  text += `Alamat  : ${SENDER_INFO.address}\n`;
  text += `Maps    : ${SENDER_INFO.mapsLink}\n`;
  text += `No. HP  : ${SENDER_INFO.phone}\n\n`;

  // PENERIMA (from order data)
  text += `PENERIMA\n`;
  text += `Nama    : ${order.customer || '-'}\n`;
  text += `Alamat  : ${order.address || '-'}\n`;
  text += `No. HP  : ${order.phone || '-'}\n`;
  if (order.notes && order.notes.trim()) {
    text += `Catatan : ${order.notes}\n`;
  }

  // ISI PAKET
  text += `\nISI PAKET\n`;
  text += itemLines + '\n';
  text += `(Total ${totalCups} cup asinan buah)\n`;
  text += `Pembayaran: ${paymentInfo}\n`;

  return text;
}

/**
 * Generate WhatsApp notification message to customer
 * Used when admin updates order status
 */
export function generateCustomerNotification(order, statusLabel) {
  if (!order) return '';

  const storeName = 'Kalla Makan';

  let msg = `Halo kak *${order.customer}* 👋\n\n`;
  msg += `Update pesanan Anda di *${storeName}*:\n`;
  msg += `📋 ID Pesanan: *#${order.id}*\n`;
  msg += `📦 Status: *${statusLabel}*\n\n`;

  // Status-specific messages
  if (statusLabel.includes('Dipersiapkan') || statusLabel.includes('processing')) {
    msg += `Pesanan Anda sedang kami siapkan dengan bahan-bahan segar pilihan. Mohon tunggu sebentar ya! 🥒🍉\n`;
  } else if (statusLabel.includes('Dikirim') || statusLabel.includes('shipped')) {
    msg += `Pesanan Anda sudah dalam perjalanan ke alamat tujuan. Harap siap di lokasi ya kak! 🛵\n`;
  } else if (statusLabel.includes('Selesai') || statusLabel.includes('completed')) {
    msg += `Pesanan Anda sudah selesai! Terima kasih sudah belanja di ${storeName}. Semoga asinannya segar dan nikmat! 🎉\n`;
    msg += `\nJangan lupa order lagi ya kak 😊\n`;
  } else if (statusLabel.includes('Dibatalkan') || statusLabel.includes('cancelled')) {
    msg += `Mohon maaf, pesanan Anda telah dibatalkan. Silakan hubungi admin jika ada pertanyaan.\n`;
  } else if (statusLabel.includes('Transfer') || statusLabel.includes('transferred')) {
    msg += `Terima kasih! Pembayaran transfer Anda sudah kami terima. Pesanan akan segera diproses. ✅\n`;
  } else {
    msg += `Terima kasih sudah order di ${storeName}. Kami akan segera memproses pesanan Anda! 🙏\n`;
  }

  msg += `\n_Pesan otomatis dari ${storeName}_`;

  return msg;
}

/**
 * Generate shipping label text for printing
 * Compact format to stick on package
 */
export function generateShippingLabel(order) {
  if (!order) return '';

  const items = Array.isArray(order.items) ? order.items : [];
  const totalCups = items.reduce((sum, item) => sum + item.qty, 0);

  let label = `═══════════════════════════\n`;
  label += `        KALLA MAKAN\n`;
  label += `    Asinan Buah Segar\n`;
  label += `═══════════════════════════\n\n`;

  label += `📋 Order: #${order.id}\n`;
  label += `📅 Tanggal: ${new Date(order.date).toLocaleDateString('id-ID')}\n\n`;

  label += `── DARI ──────────────────\n`;
  label += `${SENDER_INFO.name}\n`;
  label += `${SENDER_INFO.address}\n`;
  label += `HP: ${SENDER_INFO.phone}\n\n`;

  label += `── KEPADA ────────────────\n`;
  label += `${order.customer}\n`;
  label += `${order.address}\n`;
  label += `HP: ${order.phone}\n\n`;

  label += `── ISI PAKET ─────────────\n`;
  items.forEach((item) => {
    label += `${item.qty}x ${item.name} (${item.size})\n`;
  });
  label += `Total: ${totalCups} cup\n\n`;

  if (order.paymentMethod === 'cod') {
    label += `💰 COD: ${formatCurrency(order.total || 0)}\n`;
  } else {
    label += `✅ LUNAS (Transfer)\n`;
  }

  if (order.notes && order.notes.trim()) {
    label += `\n📝 Catatan: ${order.notes}\n`;
  }

  label += `\n═══════════════════════════\n`;

  return label;
}

/**
 * Open WhatsApp to customer's number with a message
 */
export function openWhatsAppToCustomer(phone, message) {
  const cleaned = cleanPhone(phone);
  const waUrl = `https://wa.me/${cleaned}?text=${encodeURIComponent(message)}`;
  if (typeof window !== 'undefined') {
    window.open(waUrl, '_blank');
  }
}
