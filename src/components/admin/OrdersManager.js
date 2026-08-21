'use client';

import React, { useState } from 'react';
import styles from '../../app/admin/admin.module.css';
import Modal from './Modal';
import { formatCurrency, formatDateTime, copyToClipboard } from '../../lib/utils';
import { ORDER_STATUSES } from '../../lib/constants';
import { generateCourierText, generateCustomerNotification, generateShippingLabel, openWhatsAppToCustomer } from '../../lib/courier';
import { useToast } from '../../hooks/useToast';
import { useCart } from '../../context/CartContext';

export default function OrdersManager() {
  const { orders, products, updateOrderStatus, deleteOrder } = useCart();
  const [filter, setFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [copiedCourier, setCopiedCourier] = useState(false);
  const [copiedLabel, setCopiedLabel] = useState(false);
  const { addToast } = useToast();

  const allOrders = orders || [];
  const filteredOrders = filter === 'all' ? allOrders : allOrders.filter((o) => o.status === filter);

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

  // ─── Copy courier format ───
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

  // ─── WA to customer ───
  const handleWaCustomer = (statusOverride) => {
    if (!selectedOrder) return;
    const statusLabel = statusOverride || ORDER_STATUSES[selectedOrder.status]?.label || selectedOrder.status;
    const message = generateCustomerNotification(selectedOrder, statusLabel);
    openWhatsAppToCustomer(selectedOrder.phone, message);
    addToast('Membuka WhatsApp ke customer...', 'success');
  };

  // ─── Print shipping label ───
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

  // ─── Copy label text ───
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

  // Helper to normalize items regardless of array or legacy object format
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

  return (
    <div>
      <div className={styles.pageActions}>
        <div style={{ flex: 1 }}></div>
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
    </div>
  );
}
