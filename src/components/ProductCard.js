'use client';

import React from 'react';
import Image from 'next/image';
import { Plus, Minus, ShoppingBag } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { formatCurrency } from '../lib/utils';
import styles from './ProductCard.module.css';

export default function ProductCard({ product, onAddToCartNotice }) {
  const { cartItems, addToCart, updateQuantity } = useCart();

  const variants =
    product.variants && product.variants.length > 0
      ? product.variants
      : [{ id: 'default', size: product.size || 'Reguler', price: product.price, hpp: product.hpp }];

  return (
    <div className={styles.listItemCard}>
      {/* Top Main Section: Image + Title + Description */}
      <div className={styles.itemHeader}>
        {/* Product Thumbnail */}
        <div className={styles.imageWrapper}>
          {product.image ? (
            <Image
              src={product.image}
              alt={product.name}
              width={100}
              height={100}
              className={styles.productImg}
              priority={product.id === 'prod_001' || product.id === 'prod_002'}
            />
          ) : (
            <div className={styles.emojiFallback}>
              <ShoppingBag size={28} />
            </div>
          )}

          {product.badge && (
            <span className={styles.badge}>{product.badge}</span>
          )}
        </div>

        {/* Product Info */}
        <div className={styles.itemInfo}>
          <div className={styles.titleBadgeRow}>
            <h3 className={styles.title}>{product.name}</h3>
          </div>
          {product.description && (
            <p className={styles.description}>{product.description}</p>
          )}
        </div>
      </div>

      {/* Bottom Section: Portion / Variant List Options */}
      <div className={styles.variantsContainer}>
        <span className={styles.variantsLabel}>Pilih Porsi & Jumlah:</span>
        <div className={styles.variantsGrid}>
          {variants.map((v) => {
            const vCartItemId = `${product.id}-${v.id || v.size}`;
            const vCartItem = (cartItems || []).find((item) => item.id === vCartItemId);
            const vQty = vCartItem ? vCartItem.qty : 0;

            return (
              <div
                key={v.id}
                className={`${styles.variantRow} ${vQty > 0 ? styles.variantRowActive : ''}`}
              >
                <div className={styles.variantDetails}>
                  <strong className={styles.variantSizeName}>{v.size}</strong>
                  <span className={styles.variantPriceTag}>{formatCurrency(v.price)}</span>
                </div>

                <div className={styles.variantAction}>
                  {vQty === 0 ? (
                    <button
                      type="button"
                      onClick={() => {
                        addToCart(product, v);
                        if (onAddToCartNotice) {
                          onAddToCartNotice(`${product.name} (${v.size}) ditambahkan!`);
                        }
                      }}
                      className={styles.btnSmallAdd}
                      aria-label={`Tambah ${v.size}`}
                    >
                      <Plus size={14} />
                      <span>+ Pesan</span>
                    </button>
                  ) : (
                    <div className={styles.qtyControlSmall}>
                      <button
                        type="button"
                        onClick={() => updateQuantity(vCartItemId, vQty - 1)}
                        className={styles.qtyBtnSmall}
                        aria-label="Kurang"
                      >
                        <Minus size={13} />
                      </button>
                      <span className={styles.qtyValueSmall}>{vQty}</span>
                      <button
                        type="button"
                        onClick={() => updateQuantity(vCartItemId, vQty + 1)}
                        className={styles.qtyBtnSmall}
                        aria-label="Tambah"
                      >
                        <Plus size={13} />
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
