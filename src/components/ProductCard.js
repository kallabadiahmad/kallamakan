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
    <div className={styles.card}>
      {/* Product Image & Badge */}
      <div className={styles.imageWrapper}>
        {product.image ? (
          <Image
            src={product.image}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 100vw, 500px"
            className={styles.productImg}
            priority={product.id === 'prod_001' || product.id === 'prod_002'}
          />
        ) : (
          <div className={styles.emojiFallback}>
            <ShoppingBag size={36} />
          </div>
        )}

        {product.badge && (
          <div className={styles.badgeWrapper}>
            <span className={styles.badge}>{product.badge}</span>
          </div>
        )}
      </div>

      {/* Product Information */}
      <div className={styles.content}>
        <h3 className={styles.title}>{product.name}</h3>
        {product.description && (
          <p className={styles.description}>{product.description}</p>
        )}

        {/* Individual Variant Rows with Independent Quantity Controls */}
        <div className={styles.variantsList}>
          {variants.map((v) => {
            const vCartItemId = `${product.id}-${v.id || v.size}`;
            const vCartItem = cartItems.find((item) => item.id === vCartItemId);
            const vQty = vCartItem ? vCartItem.qty : 0;

            return (
              <div
                key={v.id}
                className={`${styles.variantRow} ${vQty > 0 ? styles.variantRowActive : ''}`}
              >
                <div className={styles.variantDetails}>
                  <span className={styles.variantSizeName}>{v.size}</span>
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
