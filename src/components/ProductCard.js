'use client';

import React from 'react';
import Image from 'next/image';
import { Plus, Minus, ShoppingBag, Sparkles } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { formatCurrency } from '../lib/utils';
import styles from './ProductCard.module.css';

export default function ProductCard({ product, onAddToCartNotice }) {
  const { cartItems, addToCart, updateQuantity } = useCart();

  const variants =
    product.variants && product.variants.length > 0
      ? product.variants
      : [{ id: 'default', size: product.size || 'Reguler', price: product.price, hpp: product.hpp }];

  // Find lowest price to display "Mulai dari Rp xx.xxx"
  const minPrice = Math.min(...variants.map((v) => v.price || 0));

  // Count total quantity in cart for this product
  const totalItemQty = (cartItems || [])
    .filter((item) => item.productId === product.id)
    .reduce((sum, item) => sum + item.qty, 0);

  return (
    <div className={`${styles.foodMenuItem} ${totalItemQty > 0 ? styles.foodMenuItemActive : ''}`}>
      {/* ─── Top Main Row (GoFood / GrabFood Item Layout) ─── */}
      <div className={styles.itemMainRow}>
        {/* Left Column: Details & Description */}
        <div className={styles.itemDetailsCol}>
          {product.badge && (
            <div className={styles.badgeWrapper}>
              <span className={styles.foodBadge}>
                <Sparkles size={11} className={styles.badgeIcon} />
                {product.badge}
              </span>
            </div>
          )}

          <h3 className={styles.foodTitle}>{product.name}</h3>

          {product.description && (
            <p className={styles.foodDescription}>{product.description}</p>
          )}

          <div className={styles.foodPriceBase}>
            <span className={styles.pricePrefix}>Mulai dari</span>
            <span className={styles.priceValue}>{formatCurrency(minPrice)}</span>
          </div>
        </div>

        {/* Right Column: Square Thumbnail Image */}
        <div className={styles.itemImageCol}>
          <div className={styles.imageBox}>
            {product.image ? (
              <Image
                src={product.image}
                alt={product.name}
                width={112}
                height={112}
                className={styles.foodImg}
                priority={product.id === 'prod_001' || product.id === 'prod_002'}
              />
            ) : (
              <div className={styles.emojiFallback}>
                <ShoppingBag size={32} />
              </div>
            )}
            {totalItemQty > 0 && (
              <span className={styles.totalBadgeQty}>
                {totalItemQty}x di keranjang
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ─── Bottom Section: Portion / Variant Selection (GoFood / GrabFood Style) ─── */}
      <div className={styles.variantSelectionSection}>
        <div className={styles.variantSectionHeader}>
          <span className={styles.variantSectionTitle}>Pilihan Porsi:</span>
        </div>

        <div className={styles.variantList}>
          {variants.map((v) => {
            const vCartItemId = `${product.id}-${v.id || v.size}`;
            const vCartItem = (cartItems || []).find((item) => item.id === vCartItemId);
            const vQty = vCartItem ? vCartItem.qty : 0;

            return (
              <div
                key={v.id || v.size}
                className={`${styles.variantOptionCard} ${vQty > 0 ? styles.variantOptionActive : ''}`}
              >
                <div className={styles.variantMeta}>
                  <div className={styles.variantNameRow}>
                    <span className={styles.variantBullet}>•</span>
                    <strong className={styles.variantSizeTitle}>{v.size}</strong>
                  </div>
                  <span className={styles.variantPriceText}>{formatCurrency(v.price)}</span>
                </div>

                <div className={styles.variantActionCol}>
                  {vQty === 0 ? (
                    <button
                      type="button"
                      onClick={() => {
                        addToCart(product, v);
                        if (onAddToCartNotice) {
                          onAddToCartNotice(`${product.name} (${v.size}) ditambahkan ke keranjang!`);
                        }
                      }}
                      className={styles.btnAddGojek}
                      aria-label={`Tambah ${product.name} ${v.size}`}
                    >
                      <Plus size={14} strokeWidth={2.5} />
                      <span>Tambah</span>
                    </button>
                  ) : (
                    <div className={styles.stepperGojek}>
                      <button
                        type="button"
                        onClick={() => updateQuantity(vCartItemId, vQty - 1)}
                        className={styles.stepperBtn}
                        aria-label="Kurangi porsi"
                      >
                        <Minus size={13} strokeWidth={2.5} />
                      </button>
                      <span className={styles.stepperQty}>{vQty}</span>
                      <button
                        type="button"
                        onClick={() => updateQuantity(vCartItemId, vQty + 1)}
                        className={styles.stepperBtn}
                        aria-label="Tambah porsi"
                      >
                        <Plus size={13} strokeWidth={2.5} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
