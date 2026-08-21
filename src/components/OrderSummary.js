'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import {
  ShoppingBag,
  Plus,
  Minus,
  MessageCircle,
  Tag,
  X,
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import { formatCurrency } from '../lib/utils';
import styles from './OrderSummary.module.css';

export default function OrderSummary({ onSubmit, disabled, isSubmitting }) {
  const {
    cartItems,
    updateQuantity,
    subtotal,
    selectedShipping,
    discount,
    appliedVoucher,
    applyVoucher,
    removeVoucher,
    total,
  } = useCart();

  const [voucherCode, setVoucherCode] = useState('');
  const [voucherMsg, setVoucherMsg] = useState('');
  const [voucherSuccess, setVoucherSuccess] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleApplyVoucher = () => {
    const result = applyVoucher(voucherCode);
    setVoucherMsg(result.message);
    setVoucherSuccess(result.success);
    if (result.success) setVoucherCode('');
    setTimeout(() => setVoucherMsg(''), 4000);
  };

  const handleCheckout = () => {
    if (disabled || isSubmitting) return;
    setShowConfirm(true);
  };

  const confirmCheckout = () => {
    setShowConfirm(false);
    onSubmit();
  };

  return (
    <div className={styles.summaryCard}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.titleRow}>
          <ShoppingBag size={18} className={styles.icon} />
          <h3 className={styles.title}>Ringkasan Pesanan</h3>
        </div>
        <span className={styles.itemCount}>
          {(cartItems || []).reduce((acc, i) => acc + i.qty, 0)} Item
        </span>
      </div>

      {/* Cart Items List */}
      <div className={styles.itemList}>
        {(!cartItems || cartItems.length === 0) ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>
              <ShoppingBag size={24} />
            </div>
            <p className={styles.emptyText}>Keranjang belanja kosong</p>
            <span className={styles.emptyHint}>
              Pilih menu asinan di atas untuk mulai membuat pesanan
            </span>
          </div>
        ) : (
          cartItems.map((item) => (
            <div key={item.id} className={styles.itemRow}>
              {item.image ? (
                <Image
                  src={item.image}
                  alt={item.name}
                  width={44}
                  height={44}
                  className={styles.itemImg}
                />
              ) : (
                <div className={styles.itemPlaceholder}>
                  <ShoppingBag size={16} />
                </div>
              )}
              <div className={styles.itemDetails}>
                <div className={styles.itemName}>{item.name}</div>
                <div className={styles.itemMeta}>
                  <span className={styles.itemSize}>{item.size}</span>
                  <span className={styles.itemPricePerUnit}>
                    @{formatCurrency(item.price)}
                  </span>
                </div>
                <div className={styles.itemActions}>
                  <div className={styles.qtyControls}>
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.id, item.qty - 1)}
                      className={styles.qtyBtn}
                      aria-label="Kurang"
                    >
                      <Minus size={12} />
                    </button>
                    <span className={styles.qtyText}>{item.qty}</span>
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.id, item.qty + 1)}
                      className={styles.qtyBtn}
                      aria-label="Tambah"
                    >
                      <Plus size={12} />
                    </button>
                  </div>

                  <span className={styles.itemSubtotal}>
                    {formatCurrency(item.price * item.qty)}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Calculations Breakdown */}
      {cartItems && cartItems.length > 0 && (
        <div className={styles.breakdown}>
          <div className={styles.calcRow}>
            <span>Subtotal Produk</span>
            <span className={styles.calcVal}>{formatCurrency(subtotal)}</span>
          </div>

          <div className={styles.calcRow}>
            <span>Pengiriman</span>
            <span className={styles.calcVal}>
              {selectedShipping?.name || 'Kurir Pengiriman'}
            </span>
          </div>

          {/* Voucher Input */}
          {!appliedVoucher ? (
            <div className={styles.voucherSection}>
              <div className={styles.voucherInputRow}>
                <Tag size={14} className={styles.voucherIcon} />
                <input
                  type="text"
                  placeholder="Kode voucher"
                  value={voucherCode}
                  onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
                  className={styles.voucherInput}
                  onKeyDown={(e) => e.key === 'Enter' && handleApplyVoucher()}
                />
                <button
                  type="button"
                  onClick={handleApplyVoucher}
                  className={styles.voucherBtn}
                  disabled={!voucherCode.trim()}
                >
                  Pakai
                </button>
              </div>
              {voucherMsg && (
                <span className={`${styles.voucherMsg} ${voucherSuccess ? styles.voucherMsgSuccess : styles.voucherMsgError}`}>
                  {voucherMsg}
                </span>
              )}
            </div>
          ) : (
            <div className={`${styles.calcRow} ${styles.discountRow}`}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                🎟️ Voucher {appliedVoucher.code}
                <button
                  type="button"
                  onClick={removeVoucher}
                  className={styles.removeVoucherBtn}
                  title="Hapus voucher"
                >
                  <X size={12} />
                </button>
              </span>
              <span className={styles.discountVal}>-{formatCurrency(discount)}</span>
            </div>
          )}

          <div className={styles.totalRow}>
            <div>
              <span className={styles.totalLabel}>Total Produk</span>
              <span className={styles.taxNotice}>
                {selectedShipping?.id === 'kurir'
                  ? 'Ongkir dikonfirmasi via WhatsApp'
                  : 'Ambil langsung di outlet'}
              </span>
            </div>
            <span className={styles.totalVal}>{formatCurrency(total)}</span>
          </div>

          {/* Action CTA WhatsApp */}
          <button
            type="button"
            onClick={handleCheckout}
            disabled={disabled || isSubmitting}
            className={styles.btnCheckoutWa}
          >
            <MessageCircle size={20} className={styles.waIcon} />
            <div className={styles.btnText}>
              <span className={styles.btnMainTitle}>
                {isSubmitting ? 'Memproses Pesanan...' : 'Pesan Sekarang via WhatsApp'}
              </span>
              <span className={styles.btnSubTitle}>
                Konfirmasi Pesanan Langsung ke Admin
              </span>
            </div>
          </button>

          <div className={styles.trustNote}>
            <span>
              Pesanan langsung terhubung ke WhatsApp Admin Kalla Makan
            </span>
          </div>

          {/* Confirmation Dialog */}
          {showConfirm && (
            <div className={styles.confirmOverlay} onClick={() => setShowConfirm(false)}>
              <div className={styles.confirmDialog} onClick={(e) => e.stopPropagation()}>
                <h4 className={styles.confirmTitle}>Konfirmasi Pesanan</h4>
                <p className={styles.confirmText}>
                  Yakin ingin mengirim pesanan <strong>{formatCurrency(total)}</strong> via WhatsApp?
                </p>
                <div className={styles.confirmActions}>
                  <button
                    type="button"
                    onClick={() => setShowConfirm(false)}
                    className={styles.confirmBtnCancel}
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={confirmCheckout}
                    className={styles.confirmBtnOk}
                  >
                    <MessageCircle size={16} />
                    Ya, Kirim Pesanan
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
