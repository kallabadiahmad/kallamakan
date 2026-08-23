'use client';

import React, { useState, useRef, useCallback } from 'react';
import styles from '../../app/admin/admin.module.css';
import Modal from './Modal';
import { formatCurrency, formatDateTime, copyToClipboard, generateOrderId } from '../../lib/utils';
import { ORDER_STATUSES, PAYMENT_METHODS } from '../../lib/constants';
import { generateCourierText, generateCustomerNotification, generateShippingLabel, openWhatsAppToCustomer } from '../../lib/courier';
import { useToast } from '../../hooks/useToast';
import { useCart } from '../../context/CartContext';

// ─── OCR Screenshot Parser ───────────────────────
async function runOCR(imageFile) {
  const Tesseract = await import('tesseract.js');
  const { data: { text } } = await Tesseract.recognize(imageFile, 'ind+eng', {
    logger: () => {},
  });
  return text;
}

// Parse WhatsApp chat text to extract order info
function parseWAText(rawText, products) {
  const result = {
    customer: '',
    phone: '',
    address: '',
    notes: '',
    detectedItems: [],
  };

  const lines = rawText.split('\n').map((l) => l.trim()).filter(Boolean);
  const fullText = lines.join(' ');
  const fullTextLower = fullText.toLowerCase();

  // Try to extract phone number (08xx, 628xx, +628xx)
  const phoneMatch = fullText.match(/(?:\+?62|0)8\d[\d\s\-\.]{7,13}/);
  if (phoneMatch) {
    result.phone = phoneMatch[0].replace(/[\s\-\.]/g, '');
  }

  // Try to extract name — look for "nama:", "atas nama:", "a/n", or just a name-like pattern
  for (const line of lines) {
    const nameLower = line.toLowerCase();
    const namePatterns = [
      /(?:nama|name|a\/n|atas\s*nama)\s*[:=\-]?\s*(.+)/i,
    ];
    for (const pat of namePatterns) {
      const m = line.match(pat);
      if (m && m[1] && m[1].trim().length > 1) {
        result.customer = m[1].trim().replace(/[,;].*$/, '').trim();
        break;
      }
    }
    if (result.customer) break;
  }

  // Try to extract address — look for "alamat:", "kirim ke:", "dikirim ke:"
  for (const line of lines) {
    const addrPatterns = [
      /(?:alamat|address|kirim\s*ke|dikirim\s*ke|lokasi)\s*[:=\-]?\s*(.+)/i,
    ];
    for (const pat of addrPatterns) {
      const m = line.match(pat);
      if (m && m[1] && m[1].trim().length > 3) {
        result.address = m[1].trim();
        break;
      }
    }
    if (result.address) break;
  }

  // Try to detect products by matching product names
  if (products && products.length > 0) {
    for (const prod of products) {
      if (!prod.active) continue;
      const prodNameLower = prod.name.toLowerCase();
      // Check if any keyword from product name appears in the text
      const keywords = prodNameLower.split(/[\s\-\(\)]+/).filter((w) => w.length > 3);
      const nameMatches = keywords.some((kw) => fullTextLower.includes(kw));

      // Also check short aliases
      const aliases = [];
      if (prodNameLower.includes('kiamboy')) aliases.push('kiamboy', 'kiyamboy', 'asinan kiamboy');
      if (prodNameLower.includes('pomegranate') || prodNameLower.includes('delima')) aliases.push('pomegranate', 'delima');
      if (prodNameLower.includes('salad')) aliases.push('salad', 'salad buah');
      const aliasMatch = aliases.some((a) => fullTextLower.includes(a));

      if (nameMatches || aliasMatch) {
        // Try to find quantity nearby
        const qtyPatterns = [
          new RegExp(`(\\d+)\\s*(?:x|pcs|porsi|cup)?\\s*(?:${keywords.join('|')})`, 'i'),
          new RegExp(`(?:${keywords.join('|')})\\s*(?:x|pcs|porsi|cup)?\\s*(\\d+)`, 'i'),
        ];
        let qty = 1;
        for (const qPat of qtyPatterns) {
          const qm = fullText.match(qPat);
          if (qm && qm[1]) {
            qty = parseInt(qm[1], 10) || 1;
            break;
          }
        }

        // Try to detect variant/size
        let selectedVariant = prod.variants?.[0]; // default to first
        if (prod.variants && prod.variants.length > 1) {
          // Check for size keywords
          if (fullTextLower.includes('600') || fullTextLower.includes('besar') || fullTextLower.includes('puas') || fullTextLower.includes('500')) {
            selectedVariant = prod.variants.find((v) => v.size.includes('600') || v.size.includes('500') || v.size.toLowerCase().includes('puas')) || prod.variants[1];
          } else if (fullTextLower.includes('400') || fullTextLower.includes('kecil') || fullTextLower.includes('pas') || fullTextLower.includes('300')) {
            selectedVariant = prod.variants.find((v) => v.size.includes('400') || v.size.includes('300') || v.size.toLowerCase().includes('pas')) || prod.variants[0];
          }
        }

        result.detectedItems.push({
          productId: prod.id,
          name: prod.name,
          emoji: prod.emoji || '📦',
          size: selectedVariant?.size || '',
          variantId: selectedVariant?.id || '',
          price: selectedVariant?.price || 0,
          qty,
        });
      }
    }
  }

  return result;
}

// ─── Main Component ──────────────────────────────
export default function OrdersManager() {
  const { orders, products, updateOrderStatus, deleteOrder, saveOrder } = useCart();
  const [filter, setFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [copiedCourier, setCopiedCourier] = useState(false);
  const [copiedLabel, setCopiedLabel] = useState(false);
  const { addToast } = useToast();

  // ─── New Order Form State ───
  const [isNewOrderOpen, setIsNewOrderOpen] = useState(false);
  const [newOrder, setNewOrder] = useState({
    customer: '',
    phone: '',
    address: '',
    notes: '',
    paymentMethod: 'transfer',
    items: [], // { productId, name, emoji, size, variantId, price, qty }
  });
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrPreview, setOcrPreview] = useState(null); // image preview URL
  const [ocrText, setOcrText] = useState(''); // raw OCR text for debug
  const fileInputRef = useRef(null);

  const allOrders = orders || [];
  const filteredOrders = filter === 'all' ? allOrders : allOrders.filter((o) => o.status === filter);

  // ─── Existing Order Actions ───
  const updateStatus = (id, newStatus) => {
    updateOrderStatus(id, newStatus);
    addToast(`Status diubah ke ${ORDER_STATUSES[newStatus]?.label || newStatus}`);
    if (selectedOrder && selectedOrder.id === id) {
      setSelectedOrder((prev) => ({ ...prev, status: newStatus }));
    }
  };

  const handleDeleteOrder = (id) => {
    if (window.confirm('Yakin ingin menghapus order ini?')) {
      deleteOrder(id);
      addToast('Order berhasil dihapus', 'success');
      setIsModalOpen(false);
    }
  };

  const openDetails = (order) => {
    setSelectedOrder(order);
    setCopiedCourier(false);
    setCopiedLabel(false);
    setIsModalOpen(true);
  };

  const handleCopyCourier = async () => {
    if (!selectedOrder) return;
    const text = generateCourierText(selectedOrder);
    const success = await copyToClipboard(text);
    if (success) {
      setCopiedCourier(true);
      addToast('Format kurir berhasil disalin! Paste ke chat kurir.', 'success');
      setTimeout(() => setCopiedCourier(false), 3000);
    } else {
      addToast('Gagal menyalin ke clipboard', 'error');
    }
  };

  const handleWaCustomer = (statusOverride) => {
    if (!selectedOrder) return;
    const statusLabel = statusOverride || ORDER_STATUSES[selectedOrder.status]?.label || selectedOrder.status;
    const message = generateCustomerNotification(selectedOrder, statusLabel);
    openWhatsAppToCustomer(selectedOrder.phone, message);
    addToast('Membuka WhatsApp ke customer...', 'success');
  };

  const handlePrintLabel = () => {
    if (!selectedOrder) return;
    const labelText = generateShippingLabel(selectedOrder);

    const printWindow = window.open('', '_blank', 'width=400,height=600');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Label Pengiriman #${selectedOrder.id}</title>
            <style>
              body { font-family: 'Courier New', monospace; font-size: 13px; padding: 20px; margin: 0; line-height: 1.5; }
              @media print { body { padding: 10px; } }
            </style>
          </head>
          <body><pre>${labelText}</pre></body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => printWindow.print(), 300);
    }
  };

  const handleCopyLabel = async () => {
    if (!selectedOrder) return;
    const text = generateShippingLabel(selectedOrder);
    const success = await copyToClipboard(text);
    if (success) {
      setCopiedLabel(true);
      addToast('Label pengiriman berhasil disalin!', 'success');
      setTimeout(() => setCopiedLabel(false), 3000);
    }
  };

  const getOrderItems = (order) => {
    if (!order || !order.items) return [];
    if (Array.isArray(order.items)) {
      return order.items;
    }
    return Object.entries(order.items).map(([id, qty]) => {
      const p = (products || []).find((prod) => prod.id === id);
      return {
        id,
        name: p ? p.name : id,
        size: p ? p.size : '',
        price: p ? p.price : 0,
        qty,
      };
    });
  };

  // ─── New Order Form Helpers ───
  const resetNewOrderForm = () => {
    setNewOrder({
      customer: '',
      phone: '',
      address: '',
      notes: '',
      paymentMethod: 'transfer',
      items: [],
    });
    setOcrPreview(null);
    setOcrText('');
    setOcrLoading(false);
  };

  const openNewOrder = () => {
    resetNewOrderForm();
    setIsNewOrderOpen(true);
  };

  const addItemToOrder = () => {
    const activeProducts = (products || []).filter((p) => p.active !== false);
    if (activeProducts.length === 0) return;
    const first = activeProducts[0];
    const firstVariant = first.variants?.[0];

    setNewOrder((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          productId: first.id,
          name: first.name,
          emoji: first.emoji || '📦',
          size: firstVariant?.size || '',
          variantId: firstVariant?.id || '',
          price: firstVariant?.price || 0,
          qty: 1,
        },
      ],
    }));
  };

  const updateItem = (index, field, value) => {
    setNewOrder((prev) => {
      const items = [...prev.items];
      items[index] = { ...items[index], [field]: value };
      return { ...prev, items };
    });
  };

  const changeItemProduct = (index, productId) => {
    const prod = (products || []).find((p) => p.id === productId);
    if (!prod) return;
    const firstVariant = prod.variants?.[0];
    setNewOrder((prev) => {
      const items = [...prev.items];
      items[index] = {
        ...items[index],
        productId: prod.id,
        name: prod.name,
        emoji: prod.emoji || '📦',
        size: firstVariant?.size || '',
        variantId: firstVariant?.id || '',
        price: firstVariant?.price || 0,
      };
      return { ...prev, items };
    });
  };

  const changeItemVariant = (index, variantId) => {
    const item = newOrder.items[index];
    const prod = (products || []).find((p) => p.id === item.productId);
    if (!prod) return;
    const variant = prod.variants?.find((v) => v.id === variantId);
    if (!variant) return;
    setNewOrder((prev) => {
      const items = [...prev.items];
      items[index] = {
        ...items[index],
        variantId: variant.id,
        size: variant.size,
        price: variant.price,
      };
      return { ...prev, items };
    });
  };

  const removeItem = (index) => {
    setNewOrder((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  // ─── Screenshot OCR ───
  const handleScreenshotUpload = useCallback(async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Preview
    const previewUrl = URL.createObjectURL(file);
    setOcrPreview(previewUrl);
    setOcrLoading(true);
    setOcrText('');

    try {
      addToast('🔍 Membaca screenshot... Mohon tunggu...', 'info');
      const text = await runOCR(file);
      setOcrText(text);

      // Parse the text
      const parsed = parseWAText(text, products || []);

      // Auto-fill form
      setNewOrder((prev) => ({
        ...prev,
        customer: parsed.customer || prev.customer,
        phone: parsed.phone || prev.phone,
        address: parsed.address || prev.address,
        items: parsed.detectedItems.length > 0 ? parsed.detectedItems : prev.items,
      }));

      if (parsed.detectedItems.length > 0) {
        addToast(`✅ Berhasil baca ${parsed.detectedItems.length} produk dari screenshot!`, 'success');
      } else {
        addToast('⚠️ Screenshot terbaca tapi produk tidak terdeteksi. Silakan isi manual.', 'warning');
      }
    } catch (err) {
      console.error('OCR error:', err);
      addToast('❌ Gagal membaca screenshot. Coba gambar yang lebih jelas.', 'error');
    } finally {
      setOcrLoading(false);
    }
  }, [products, addToast]);

  // ─── Submit New Order ───
  const handleSubmitNewOrder = async () => {
    if (!newOrder.customer.trim()) {
      addToast('Nama customer wajib diisi', 'error');
      return;
    }
    if (!newOrder.phone.trim()) {
      addToast('Nomor HP wajib diisi', 'error');
      return;
    }
    if (newOrder.items.length === 0) {
      addToast('Minimal 1 produk harus dipilih', 'error');
      return;
    }

    const subtotal = newOrder.items.reduce((sum, item) => sum + item.price * item.qty, 0);

    const orderData = {
      id: generateOrderId(),
      date: new Date().toISOString(),
      customer: newOrder.customer.trim(),
      phone: newOrder.phone.trim(),
      address: newOrder.address.trim(),
      notes: newOrder.notes.trim(),
      items: newOrder.items.map((item) => ({
        id: `${item.productId}-${item.variantId}`,
        productId: item.productId,
        name: item.name,
        size: item.size,
        price: item.price,
        emoji: item.emoji,
        qty: item.qty,
      })),
      subtotal,
      total: subtotal,
      shippingCost: 0,
      shippingName: 'Kurir',
      discount: 0,
      paymentMethod: newOrder.paymentMethod,
      paymentBank: 'DANA',
      status: 'pending',
    };

    await saveOrder(orderData);
    addToast(`✅ Order #${orderData.id} berhasil dibuat!`, 'success');
    setIsNewOrderOpen(false);
    resetNewOrderForm();
  };

  // ─── Computed ───
  const newOrderSubtotal = newOrder.items.reduce((sum, item) => sum + item.price * item.qty, 0);
  const activeProducts = (products || []).filter((p) => p.active !== false);

  return (
    <div>
      <div className={styles.pageActions}>
        <button
          className={`${styles.btn} ${styles.btnPrimary}`}
          onClick={openNewOrder}
          style={{ fontSize: '0.88rem' }}
        >
          ➕ Input Order Baru
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label className={styles.formLabel} style={{ marginBottom: 0 }}>
            Filter:
          </label>
          <select
            className={styles.formInput}
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            style={{ width: 'auto' }}
          >
            <option value="all">Semua Status ({allOrders.length})</option>
            {Object.entries(ORDER_STATUSES).map(([key, data]) => (
              <option key={key} value={key}>
                {data.label} ({allOrders.filter((o) => o.status === key).length})
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h3>📋 Daftar Order Masuk</h3>
        </div>
        <div className={styles.cardBody} style={{ padding: 0 }}>
          <div className={styles.tableResponsive}>
            <table className={styles.dataTable}>
              <thead>
                <tr>
                  <th>ID / Waktu</th>
                  <th>Customer</th>
                  <th>Produk</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                      Belum ada order dengan filter ini
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((order) => {
                    const items = getOrderItems(order);
                    return (
                      <tr key={order.id}>
                        <td>
                          <div style={{ color: 'var(--primary-light)', fontWeight: 700 }}>#{order.id}</div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            {formatDateTime(order.date)}
                          </div>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{order.customer}</div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{order.phone}</div>
                        </td>
                        <td>
                          <div style={{ fontSize: '0.85rem' }}>
                            {items.map((item, idx) => (
                              <div key={idx}>
                                • {item.qty}x {item.name} {item.size && `(${item.size})`}
                              </div>
                            ))}
                          </div>
                        </td>
                        <td style={{ fontWeight: 700, color: 'var(--text-accent)' }}>
                          {formatCurrency(order.total || order.subtotal || 0)}
                        </td>
                        <td>
                          <select
                            className={styles.formInput}
                            style={{ padding: '6px 10px', fontSize: '0.82rem' }}
                            value={order.status || 'pending'}
                            onChange={(e) => updateStatus(order.id, e.target.value)}
                          >
                            {Object.entries(ORDER_STATUSES).map(([key, data]) => (
                              <option key={key} value={key}>
                                {data.label}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <button
                            className={`${styles.btn} ${styles.btnSecondary}`}
                            onClick={() => openDetails(order)}
                          >
                            Detail
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ═══ ORDER DETAIL MODAL ═══ */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={`Detail Pesanan #${selectedOrder?.id}`}
      >
        {selectedOrder && (
          <div>
            {/* Order Info Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
              <div>
                <strong style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
                  Waktu Pesanan
                </strong>
                <div>{formatDateTime(selectedOrder.date)}</div>
              </div>
              <div>
                <strong style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
                  Status Order
                </strong>
                <span
                  style={{
                    display: 'inline-block',
                    padding: '4px 10px',
                    borderRadius: '9999px',
                    fontSize: '0.8rem',
                    fontWeight: 'bold',
                    background: ORDER_STATUSES[selectedOrder.status]?.color + '22',
                    color: ORDER_STATUSES[selectedOrder.status]?.color || '#F59E0B',
                    border: `1px solid ${ORDER_STATUSES[selectedOrder.status]?.color || '#F59E0B'}44`,
                  }}
                >
                  {ORDER_STATUSES[selectedOrder.status]?.label || selectedOrder.status}
                </span>
              </div>
              <div>
                <strong style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
                  Customer
                </strong>
                <div style={{ fontWeight: 600 }}>{selectedOrder.customer}</div>
                <div>{selectedOrder.phone}</div>
              </div>
              <div>
                <strong style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
                  Metode Pembayaran
                </strong>
                <div>
                  {selectedOrder.paymentMethod === 'qris'
                    ? '📱 QRIS All Payment'
                    : selectedOrder.paymentMethod === 'transfer'
                    ? `🏦 Transfer Bank (${selectedOrder.paymentBank || 'BCA'})`
                    : '🤝 COD (Bayar di Tempat)'}
                </div>
              </div>
            </div>

            {/* Address */}
            <div style={{ background: 'var(--bg-input)', padding: '14px', borderRadius: '8px', marginBottom: '20px' }}>
              <strong style={{ display: 'block', marginBottom: '6px', fontSize: '0.88rem' }}>
                📍 Alamat Pengiriman
              </strong>
              <div style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                {selectedOrder.address}
                {selectedOrder.notes && (
                  <div style={{ marginTop: '6px', color: '#FBBF24' }}>
                    <strong>Catatan:</strong> {selectedOrder.notes}
                  </div>
                )}
              </div>
            </div>

            {/* Items */}
            <h4 style={{ marginBottom: '10px', borderBottom: '1px solid var(--border)', paddingBottom: '6px' }}>
              Rincian Item Menu
            </h4>
            <div style={{ marginBottom: '20px' }}>
              {getOrderItems(selectedOrder).map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginBottom: '8px',
                    fontSize: '0.88rem',
                  }}
                >
                  <span>
                    {item.qty}x {item.name} {item.size && `(${item.size})`}
                  </span>
                  <strong>{formatCurrency(item.price * item.qty)}</strong>
                </div>
              ))}

              <div
                style={{
                  marginTop: '12px',
                  paddingTop: '12px',
                  borderTop: '1px solid var(--border)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  fontSize: '0.88rem',
                }}
              >
                {selectedOrder.subtotal && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                    <span>Subtotal</span>
                    <span>{formatCurrency(selectedOrder.subtotal)}</span>
                  </div>
                )}
                {selectedOrder.shippingCost !== undefined && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                    <span>Ongkir ({selectedOrder.shippingName || 'Kurir'})</span>
                    <span>{selectedOrder.shippingCost === 0 ? 'GRATIS' : formatCurrency(selectedOrder.shippingCost)}</span>
                  </div>
                )}
                {selectedOrder.discount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#10B981' }}>
                    <span>Diskon Voucher</span>
                    <span>-{formatCurrency(selectedOrder.discount)}</span>
                  </div>
                )}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    paddingTop: '8px',
                    borderTop: '1px solid var(--border)',
                    fontWeight: 800,
                    fontSize: '1.15rem',
                    color: 'var(--primary-light)',
                  }}
                >
                  <span>Total Bayar</span>
                  <span>{formatCurrency(selectedOrder.total || selectedOrder.subtotal || 0)}</span>
                </div>
              </div>
            </div>

            {/* ═══ KURIR & AKSI BUTTONS ═══ */}
            <div
              style={{
                background: '#F0FDF4',
                border: '1px solid #BBF7D0',
                borderRadius: '10px',
                padding: '16px',
                marginBottom: '16px',
              }}
            >
              <h4 style={{ margin: '0 0 12px 0', fontSize: '0.92rem', color: '#059669' }}>
                🚚 Aksi Pengiriman
              </h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                <button
                  className={`${styles.btn} ${styles.btnPrimary}`}
                  onClick={handleCopyCourier}
                  style={{ fontSize: '0.82rem' }}
                >
                  {copiedCourier ? '✅ Tersalin!' : '📋 Copy Format Kurir'}
                </button>
                <button
                  className={`${styles.btn} ${styles.btnSecondary}`}
                  onClick={() => handleWaCustomer()}
                  style={{ fontSize: '0.82rem' }}
                >
                  💬 WA ke Customer
                </button>
                <button
                  className={`${styles.btn} ${styles.btnSecondary}`}
                  onClick={handlePrintLabel}
                  style={{ fontSize: '0.82rem' }}
                >
                  🖨️ Cetak Label
                </button>
                <button
                  className={`${styles.btn} ${styles.btnSecondary}`}
                  onClick={handleCopyLabel}
                  style={{ fontSize: '0.82rem' }}
                >
                  {copiedLabel ? '✅ Tersalin!' : '🏷️ Copy Label'}
                </button>
              </div>
            </div>

            {/* Bottom Actions */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: '10px',
                paddingTop: '16px',
                borderTop: '1px solid var(--border)',
              }}
            >
              <button className={`${styles.btn} ${styles.btnDanger}`} onClick={() => handleDeleteOrder(selectedOrder.id)}>
                Hapus Order
              </button>
              <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={() => setIsModalOpen(false)}>
                Tutup
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ═══ NEW ORDER MODAL ═══ */}
      <Modal
        isOpen={isNewOrderOpen}
        onClose={() => setIsNewOrderOpen(false)}
        title="➕ Input Order Baru"
        wide
      >
        <div>
          {/* Screenshot OCR Section */}
          <div style={{
            background: '#EFF6FF',
            border: '1px solid #BFDBFE',
            borderRadius: '10px',
            padding: '16px',
            marginBottom: '20px',
          }}>
            <h4 style={{ margin: '0 0 10px 0', fontSize: '0.88rem', color: '#1D4ED8' }}>
              📸 Scan dari Screenshot Chat WA
            </h4>
            <p style={{ fontSize: '0.78rem', color: '#64748b', margin: '0 0 12px 0' }}>
              Upload screenshot chat WhatsApp, sistem akan otomatis membaca nama, nomor HP, dan pesanan.
            </p>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleScreenshotUpload}
              style={{ display: 'none' }}
            />

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                className={`${styles.btn} ${styles.btnPrimary}`}
                onClick={() => fileInputRef.current?.click()}
                disabled={ocrLoading}
                style={{ fontSize: '0.82rem', background: '#2563EB' }}
              >
                {ocrLoading ? '⏳ Membaca...' : '📷 Pilih Screenshot'}
              </button>
              {ocrPreview && (
                <button
                  className={`${styles.btn} ${styles.btnSecondary}`}
                  onClick={() => { setOcrPreview(null); setOcrText(''); }}
                  style={{ fontSize: '0.82rem' }}
                >
                  ✕ Hapus Gambar
                </button>
              )}
            </div>

            {/* OCR Loading Animation */}
            {ocrLoading && (
              <div style={{
                marginTop: '12px',
                padding: '12px',
                background: '#DBEAFE',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
              }}>
                <div style={{
                  width: '20px',
                  height: '20px',
                  border: '3px solid #93C5FD',
                  borderTopColor: '#2563EB',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                }} />
                <span style={{ fontSize: '0.82rem', color: '#1E40AF', fontWeight: 600 }}>
                  Membaca teks dari gambar...
                </span>
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
              </div>
            )}

            {/* Image preview */}
            {ocrPreview && !ocrLoading && (
              <div style={{ marginTop: '12px' }}>
                <img
                  src={ocrPreview}
                  alt="Screenshot preview"
                  style={{
                    maxWidth: '100%',
                    maxHeight: '150px',
                    borderRadius: '8px',
                    border: '1px solid #BFDBFE',
                    objectFit: 'contain',
                  }}
                />
              </div>
            )}

            {/* OCR raw text (collapsible debug) */}
            {ocrText && (
              <details style={{ marginTop: '10px' }}>
                <summary style={{ fontSize: '0.74rem', color: '#64748b', cursor: 'pointer' }}>
                  🔍 Lihat teks hasil scan
                </summary>
                <pre style={{
                  marginTop: '6px',
                  padding: '10px',
                  background: '#F8FAFC',
                  borderRadius: '6px',
                  fontSize: '0.72rem',
                  color: '#334155',
                  whiteSpace: 'pre-wrap',
                  maxHeight: '120px',
                  overflow: 'auto',
                  border: '1px solid var(--border)',
                }}>
                  {ocrText}
                </pre>
              </details>
            )}
          </div>

          {/* Manual Form */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
            <div className={styles.formGroup} style={{ marginBottom: 0 }}>
              <label className={styles.formLabel}>Nama Customer *</label>
              <input
                className={styles.formInput}
                value={newOrder.customer}
                onChange={(e) => setNewOrder((p) => ({ ...p, customer: e.target.value }))}
                placeholder="Nama lengkap"
              />
            </div>
            <div className={styles.formGroup} style={{ marginBottom: 0 }}>
              <label className={styles.formLabel}>No. HP / WhatsApp *</label>
              <input
                className={styles.formInput}
                value={newOrder.phone}
                onChange={(e) => setNewOrder((p) => ({ ...p, phone: e.target.value }))}
                placeholder="08xxxxxxxxxx"
              />
            </div>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Alamat Pengiriman</label>
            <textarea
              className={styles.formInput}
              value={newOrder.address}
              onChange={(e) => setNewOrder((p) => ({ ...p, address: e.target.value }))}
              placeholder="Alamat lengkap pengiriman"
              rows={2}
              style={{ resize: 'vertical' }}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Catatan Tambahan</label>
            <input
              className={styles.formInput}
              value={newOrder.notes}
              onChange={(e) => setNewOrder((p) => ({ ...p, notes: e.target.value }))}
              placeholder="Misal: jangan pedes, extra es, dll"
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Metode Pembayaran</label>
            <select
              className={styles.formInput}
              value={newOrder.paymentMethod}
              onChange={(e) => setNewOrder((p) => ({ ...p, paymentMethod: e.target.value }))}
            >
              {PAYMENT_METHODS.map((pm) => (
                <option key={pm.id} value={pm.id}>{pm.name}</option>
              ))}
            </select>
          </div>

          {/* Items Section */}
          <div style={{
            background: '#F8FAFC',
            border: '1px solid var(--border)',
            borderRadius: '10px',
            padding: '16px',
            marginBottom: '16px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h4 style={{ margin: 0, fontSize: '0.92rem', color: '#0f172a' }}>
                🛒 Produk Pesanan
              </h4>
              <button
                className={`${styles.btn} ${styles.btnPrimary}`}
                onClick={addItemToOrder}
                style={{ fontSize: '0.78rem', padding: '5px 12px' }}
              >
                + Tambah Produk
              </button>
            </div>

            {newOrder.items.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '20px', color: '#94a3b8', fontSize: '0.85rem' }}>
                Belum ada produk. Klik &quot;+ Tambah Produk&quot; atau scan screenshot.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {newOrder.items.map((item, idx) => {
                  const prod = (products || []).find((p) => p.id === item.productId);
                  return (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '10px 12px',
                        background: '#ffffff',
                        borderRadius: '8px',
                        border: '1px solid var(--border)',
                        flexWrap: 'wrap',
                      }}
                    >
                      <span style={{ fontSize: '1.2rem' }}>{item.emoji}</span>

                      {/* Product select */}
                      <select
                        className={styles.formInput}
                        value={item.productId}
                        onChange={(e) => changeItemProduct(idx, e.target.value)}
                        style={{ flex: '1 1 120px', minWidth: '120px', fontSize: '0.8rem', padding: '6px 8px' }}
                      >
                        {activeProducts.map((p) => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>

                      {/* Variant select */}
                      {prod?.variants && prod.variants.length > 1 && (
                        <select
                          className={styles.formInput}
                          value={item.variantId}
                          onChange={(e) => changeItemVariant(idx, e.target.value)}
                          style={{ flex: '0 1 130px', fontSize: '0.8rem', padding: '6px 8px' }}
                        >
                          {prod.variants.map((v) => (
                            <option key={v.id} value={v.id}>{v.size} — {formatCurrency(v.price)}</option>
                          ))}
                        </select>
                      )}

                      {/* Qty */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <button
                          onClick={() => updateItem(idx, 'qty', Math.max(1, item.qty - 1))}
                          style={{
                            width: '28px', height: '28px', borderRadius: '6px',
                            background: '#f1f5f9', border: '1px solid var(--border)',
                            fontSize: '1rem', cursor: 'pointer', display: 'flex',
                            alignItems: 'center', justifyContent: 'center',
                          }}
                        >−</button>
                        <span style={{ fontWeight: 700, fontSize: '0.88rem', minWidth: '24px', textAlign: 'center' }}>
                          {item.qty}
                        </span>
                        <button
                          onClick={() => updateItem(idx, 'qty', item.qty + 1)}
                          style={{
                            width: '28px', height: '28px', borderRadius: '6px',
                            background: '#f1f5f9', border: '1px solid var(--border)',
                            fontSize: '1rem', cursor: 'pointer', display: 'flex',
                            alignItems: 'center', justifyContent: 'center',
                          }}
                        >+</button>
                      </div>

                      {/* Price */}
                      <span style={{ fontWeight: 700, fontSize: '0.82rem', color: '#059669', minWidth: '70px', textAlign: 'right' }}>
                        {formatCurrency(item.price * item.qty)}
                      </span>

                      {/* Remove */}
                      <button
                        onClick={() => removeItem(idx)}
                        style={{
                          width: '28px', height: '28px', borderRadius: '6px',
                          background: '#FEE2E2', border: '1px solid #FECACA',
                          color: '#DC2626', fontSize: '0.82rem', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}
                      >✕</button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Subtotal */}
            {newOrder.items.length > 0 && (
              <div style={{
                marginTop: '12px',
                paddingTop: '12px',
                borderTop: '1px solid var(--border)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}>
                <span style={{ fontWeight: 700, fontSize: '0.92rem' }}>Total</span>
                <span style={{ fontWeight: 800, fontSize: '1.1rem', color: '#059669' }}>
                  {formatCurrency(newOrderSubtotal)}
                </span>
              </div>
            )}
          </div>

          {/* Submit */}
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button
              className={`${styles.btn} ${styles.btnSecondary}`}
              onClick={() => setIsNewOrderOpen(false)}
            >
              Batal
            </button>
            <button
              className={`${styles.btn} ${styles.btnPrimary}`}
              onClick={handleSubmitNewOrder}
              disabled={ocrLoading}
              style={{ fontSize: '0.88rem', padding: '10px 24px' }}
            >
              💾 Simpan Order
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
