'use client';

import React, { useState, useEffect } from 'react';
import { ShoppingBag, ArrowRight } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { formatCurrency } from '../lib/utils';
import styles from './MobileCartBar.module.css';

export default function MobileCartBar() {
  const { cartItems, total, subtotal, setIsCartOpen } = useCart();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const itemCount = (cartItems || []).reduce((acc, item) => acc + item.qty, 0);

  if (!mounted || itemCount === 0) return null;

  return (
    <div className={styles.stickyBar}>
      <div className={styles.barContent}>
        <div className={styles.cartInfo} onClick={() => setIsCartOpen(true)}>
          <div className={styles.iconWrapper}>
            <ShoppingBag size={20} />
            <span className={styles.badge}>{itemCount}</span>
          </div>
          <div className={styles.priceColumn}>
            <span className={styles.priceLabel}>Total Belanja:</span>
            <strong className={styles.priceValue}>{formatCurrency(total || subtotal)}</strong>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            const checkoutEl = document.getElementById('checkout');
            if (checkoutEl) {
              checkoutEl.scrollIntoView({ behavior: 'smooth' });
            } else {
              setIsCartOpen(true);
            }
          }}
          className={styles.checkoutBtn}
        >
          <span>Checkout</span>
          <ArrowRight size={18} />
        </button>
      </div>
    </div>
  );
}
