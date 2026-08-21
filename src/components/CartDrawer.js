'use client';

import React from 'react';
import Image from 'next/image';
import { X, Plus, Minus, Trash2, ShoppingBag, ArrowRight } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { formatCurrency } from '../lib/utils';
import { CONFIG } from '../lib/constants';
import styles from './CartDrawer.module.css';

export default function CartDrawer() {
  const {
    cartItems,
    isCartOpen,
    setIsCartOpen,
    updateQuantity,
    removeFromCart,
    clearCart,
    subtotal,
    total,
    discount,
    appliedVoucher,
    applyVoucher,
    removeVoucher,
  } = useCart();

  const [voucherCode, setVoucherCode] = React.useState('');
  const [voucherMsg, setVoucherMsg] = React.useState('');
  const [voucherSuccess, setVoucherSuccess] = React.useState(false);

  const handleApplyVoucher = () => {
    const result = applyVoucher(voucherCode);
    setVoucherMsg(result.message);
    setVoucherSuccess(result.success);
    if (result.success) setVoucherCode('');
    setTimeout(() => setVoucherMsg(''), 4000);
  };

  if (!isCartOpen) return null;

  const handleProceedToCheckout = () => {
    setIsCartOpen(false);
    const checkoutEl = document.getElementById('checkout');
    if (checkoutEl) {
      checkoutEl.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Free shipping progress
  const freeShippingThreshold = CONFIG.MIN_ORDER_FREE_SHIPPING;
  const progressPercent = Math.min(100, (subtotal / freeShippingThreshold) * 100);
  const remainingForFreeShipping = Math.max(0, freeShippingThreshold - subtotal);

  return (
    <div className={styles.drawerOverlay} onClick={() => setIsCartOpen(false)}>
      <div className={styles.drawerContent} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.drawerHeader}>
          <div className={styles.headerTitle}>
            <ShoppingBag size={20} className={styles.headerIcon} />
            <h2>Keranjang Belanja</h2>
            <span className={styles.itemCountBadge}>
              {cartItems.reduce((sum, item) => sum + item.qty, 0)} item
            </span>
          </div>
          <button
            onClick={() => setIsCartOpen(false)}
            className={styles.closeBtn}
            aria-label="Tutup Keranjang"
          >
            <X size={18} />
          </button>
        </div>

        {/* Free Shipping Progress Indicator */}
        <div className={styles.shippingBar}>
          <div className={styles.shippingBarText}>
            {remainingForFreeShipping === 0 ? (
              <span className={styles.freeShippingSuccess}>
                Selamat! Anda mendapatkan promo diskon ongkir
              </span>
            ) : (
              <span>
                Tambah <strong>{formatCurrency(remainingForFreeShipping)}</strong> lagi untuk klaim diskon ongkir
              </span>
            )}
          </div>
          <div className={styles.progressBarBg}>
            <div
              className={styles.progressBarFill}
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>
        </div>

        {/* Item List */}
        <div className={styles.drawerBody}>
          {cartItems.length === 0 ? (
            <div className={styles.emptyCart}>
              <div className={styles.emptyIconWrapper}>
                <ShoppingBag size={40} />
              </div>
              <h3>Keranjang Masih Kosong</h3>
              <p>Pilih menu asinan segar favorit Anda di katalog dan nikmati kesegarannya!</p>
              <button
                onClick={() => setIsCartOpen(false)}
                className={styles.btnExplore}
              >
                Lihat Menu Sekarang
              </button>
            </div>
          ) : (
            <div className={styles.itemsList}>
              {cartItems.map((item) => (
                <div key={item.id} className={styles.cartItem}>
                  {item.image ? (
                    <Image
                      src={item.image}
                      alt={item.name}
                      width={48}
                      height={48}
                      className={styles.itemImg}
                    />
                  ) : (
                    <div className={styles.itemPlaceholder}>
                      <ShoppingBag size={18} />
                    </div>
                  )}
                  <div className={styles.itemDetails}>
                    <div className={styles.itemTitleRow}>
                      <h4 className={styles.itemName}>{item.name}</h4>
                      <button
                        onClick={() => removeFromCart(item.id)}
                        className={styles.deleteBtn}
                        title="Hapus item"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <span className={styles.itemSize}>{item.size}</span>
                    <div className={styles.itemPriceRow}>
                      <span className={styles.itemPrice}>
                        {formatCurrency(item.price * item.qty)}
                      </span>

                      {/* Quantity Controller */}
                      <div className={styles.qtyControls}>
                        <button
                          onClick={() => updateQuantity(item.id, item.qty - 1)}
                          className={styles.qtyBtn}
                        >
                          <Minus size={14} />
                        </button>
                        <span className={styles.qtyText}>{item.qty}</span>
                        <button
                          onClick={() => updateQuantity(item.id, item.qty + 1)}
                          className={styles.qtyBtn}
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {cartItems.length > 0 && (
          <div className={styles.drawerFooter}>
            {/* Voucher Input */}
            <div style={{ marginBottom: '12px' }}>
              {!appliedVoucher ? (
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <input
                    type="text"
                    placeholder="Kode voucher promo"
                    value={voucherCode}
                    onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
                    style={{
                      flex: 1,
                      padding: '7px 10px',
                      fontSize: '0.8rem',
                      border: '1px solid var(--border-default)',
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--bg-body)',
                      fontWeight: 600,
                    }}
                    onKeyDown={(e) => e.key === 'Enter' && handleApplyVoucher()}
                  />
                  <button
                    type="button"
                    onClick={handleApplyVoucher}
                    disabled={!voucherCode.trim()}
                    style={{
                      background: 'var(--primary)',
                      color: '#fff',
                      padding: '7px 14px',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      opacity: !voucherCode.trim() ? 0.5 : 1,
                      cursor: !voucherCode.trim() ? 'not-allowed' : 'pointer',
                    }}
                  >
                    Klaim
                  </button>
                </div>
              ) : (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '6px 10px',
                    background: '#ECFDF5',
                    border: '1px solid #A7F3D0',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.8rem',
                    color: '#059669',
                    fontWeight: 600,
                  }}
                >
                  <span>🎟️ Voucher {appliedVoucher.code} ({formatCurrency(appliedVoucher.discount)})</span>
                  <button
                    type="button"
                    onClick={removeVoucher}
                    style={{
                      background: '#FEE2E2',
                      color: '#EF4444',
                      borderRadius: '9999px',
                      width: '20px',
                      height: '20px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                    }}
                    title="Hapus voucher"
                  >
                    ✕
                  </button>
                </div>
              )}
              {voucherMsg && (
                <div
                  style={{
                    fontSize: '0.74rem',
                    marginTop: '4px',
                    color: voucherSuccess ? '#10B981' : '#EF4444',
                    fontWeight: 500,
                  }}
                >
                  {voucherMsg}
                </div>
              )}
            </div>

            {/* Price Calculations */}
            <div className={styles.calcSummary}>
              <div className={styles.calcRow}>
                <span>Subtotal ({cartItems.reduce((acc, i) => acc + i.qty, 0)} item)</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              {discount > 0 && (
                <div className={`${styles.calcRow} ${styles.discountRow}`}>
                  <span>Diskon Promo</span>
                  <span>-{formatCurrency(discount)}</span>
                </div>
              )}
              <div className={`${styles.calcRow} ${styles.totalRow}`}>
                <span>Total Sementara</span>
                <span className={styles.totalPrice}>{formatCurrency(total)}</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className={styles.actionButtons}>
              <button
                onClick={handleProceedToCheckout}
                className={styles.checkoutBtn}
              >
                <span>Lanjut ke Checkout</span>
                <ArrowRight size={18} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
