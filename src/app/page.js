'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import confetti from 'canvas-confetti';
import {
  ShoppingBag,
  Clock,
  Lock,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
} from 'lucide-react';
import ProductCard from '../components/ProductCard';
import CheckoutForm from '../components/CheckoutForm';
import CartDrawer from '../components/CartDrawer';
import InvoiceModal from '../components/InvoiceModal';
import Toast from '../components/Toast';
import { useCart } from '../context/CartContext';
import { useToast } from '../hooks/useToast';
import { generateWhatsAppMessage, openWhatsApp } from '../lib/whatsapp';
import { generateOrderId, formatCurrency } from '../lib/utils';
import { CONFIG } from '../lib/constants';
import styles from './page.module.css';

export default function Home() {
  const {
    cartItems,
    products,
    settings,
    clearCart,
    subtotal,
    totalHPP,
    grossProfit,
    selectedShipping,
    shippingCost,
    discount,
    appliedVoucher,
    total,
    setOrders,
    saveOrder,
    setIsCartOpen,
    isLoadingDb,
  } = useCart();

  const { toasts, addToast, removeToast } = useToast();
  const [createdOrder, setCreatedOrder] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [currentStep, setCurrentStep] = useState(1); // 1: Menu, 2: Pengiriman, 3: Pembayaran & Ringkasan

  useEffect(() => {
    setMounted(true);
  }, []);

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '',
    notes: '',
    shippingMethod: selectedShipping,
    paymentMethod: 'transfer',
    paymentDetails: { bank: 'DANA' },
  });

  const activeProducts = (products || []).filter((p) => p.active !== false);

  const cartTotalQty = (cartItems || []).reduce((acc, item) => acc + item.qty, 0);

  const scrollToContent = () => {
    const el = document.getElementById('checkout-flow');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Step 1 -> Step 2 transition
  const handleProceedToShipping = () => {
    if (cartTotalQty === 0) {
      addToast('Silakan pilih minimal 1 porsi asinan terlebih dahulu.', 'error');
      return;
    }
    setCurrentStep(2);
    scrollToContent();
  };

  // Step 2 -> Step 3 transition with validation
  const handleProceedToPayment = () => {
    if (!formData.name.trim()) {
      addToast('Mohon masukkan Nama Lengkap Anda.', 'error');
      return;
    }

    const phoneClean = formData.phone.replace(/[^0-9]/g, '');
    if (!phoneClean || phoneClean.length < 10 || phoneClean.length > 15) {
      addToast('Mohon masukkan Nomor WhatsApp aktif (10-15 digit, format 08xx atau 628xx).', 'error');
      return;
    }
    if (!phoneClean.startsWith('0') && !phoneClean.startsWith('62') && !phoneClean.startsWith('8')) {
      addToast('Format nomor WhatsApp tidak valid. Gunakan format 08xx atau 628xx.', 'error');
      return;
    }

    if (!formData.address.trim()) {
      addToast('Mohon masukkan Alamat Lengkap pengiriman.', 'error');
      return;
    }

    setCurrentStep(3);
    scrollToContent();
  };

  // Step 3 -> Submit Order via WhatsApp
  const handleCheckoutSubmit = (e) => {
    if (e && e.preventDefault) e.preventDefault();

    if ((cartItems || []).length === 0) {
      addToast('Keranjang belanja kosong. Silakan pilih menu asinan terlebih dahulu.', 'error');
      setCurrentStep(1);
      return;
    }

    setIsSubmitting(true);

    const orderId = generateOrderId();
    const orderRecord = {
      id: orderId,
      date: new Date().toISOString(),
      customer: formData.name,
      phone: formData.phone,
      address: formData.address,
      notes: formData.notes,
      shippingMethod: formData.shippingMethod?.id || selectedShipping?.id || 'kurir',
      shippingName: formData.shippingMethod?.name || selectedShipping?.name || 'Kurir Pengantaran',
      shippingCost: shippingCost || 0,
      paymentMethod: formData.paymentMethod,
      paymentBank: formData.paymentMethod === 'transfer' ? formData.paymentDetails?.bank || 'DANA' : '',
      items: cartItems.map((item) => ({
        id: item.id,
        productId: item.productId,
        name: item.name,
        size: item.size,
        price: item.price,
        hpp: item.hpp || 0,
        qty: item.qty,
      })),
      subtotal: subtotal,
      discount: discount,
      voucherCode: appliedVoucher?.code || '',
      total: total,
      totalHPP: totalHPP,
      grossProfit: grossProfit,
      status: 'pending',
    };

    // 1. Persist in MongoDB
    if (typeof saveOrder === 'function') {
      saveOrder(orderRecord);
    } else {
      setOrders((prev) => [orderRecord, ...(prev || [])]);
    }

    // 2. Trigger Celebration Confetti
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#059669', '#10B981', '#34D399', '#EA580C'],
      });
    } catch {
      // ignore
    }

    // 3. Open WhatsApp with order text
    const message = generateWhatsAppMessage({
      orderId,
      cartItems,
      formData,
      subtotal,
      shippingCost,
      discount,
      total,
      settings,
      voucher: appliedVoucher,
    });

    const storeWa = settings?.whatsappNumber || CONFIG.WA_NUMBER;
    openWhatsApp(message, storeWa);

    // 4. Show Invoice Modal
    setCreatedOrder(orderRecord);
    clearCart();
    setIsSubmitting(false);
  };

  const storeName = settings?.storeName || CONFIG.STORE_NAME;
  const storeHours = settings?.storeHours || CONFIG.STORE_HOURS;
  const storeLocation = settings?.storeLocation || CONFIG.STORE_LOCATION;

  return (
    <div className={styles.pageWrapper}>
      {/* Toast Notification Container */}
      <Toast toasts={toasts} removeToast={removeToast} />

      {/* Invoice Modal after Order Placed */}
      {createdOrder && (
        <InvoiceModal
          order={createdOrder}
          onClose={() => {
            setCreatedOrder(null);
            setCurrentStep(1);
          }}
          storeSettings={settings}
          onOpenWa={() => {
            const message = generateWhatsAppMessage({
              orderId: createdOrder.id,
              cartItems: createdOrder.items,
              formData: {
                name: createdOrder.customer,
                phone: createdOrder.phone,
                address: createdOrder.address,
                notes: createdOrder.notes,
                shippingMethod: { name: createdOrder.shippingName },
                paymentMethod: createdOrder.paymentMethod,
                paymentDetails: { bank: createdOrder.paymentBank },
              },
              subtotal: createdOrder.subtotal,
              shippingCost: createdOrder.shippingCost,
              discount: createdOrder.discount,
              total: createdOrder.total,
              settings,
              voucher: createdOrder.voucherCode ? { code: createdOrder.voucherCode } : null,
            });
            openWhatsApp(message, settings?.whatsappNumber || CONFIG.WA_NUMBER);
          }}
        />
      )}

      {/* Cart Drawer Modal */}
      <CartDrawer />

      {/* ─── Minimal Glass Header ─── */}
      <header className={styles.header}>
        <div className="container">
          <div className={styles.headerContent}>
            {/* Brand Logo & Name */}
            <div className={styles.brandWrapper}>
              <div className={styles.logoImageContainer}>
                <Image
                  src="/logo-kallamakan.png"
                  alt="Kalla Makan Logo"
                  width={38}
                  height={38}
                  className={styles.logoImg}
                  priority
                />
              </div>
              <div className={styles.brandText}>
                <h1 className={styles.storeTitle}>{storeName}</h1>
                <div className={styles.storeMetaRow}>
                  <span className={styles.statusDot}></span>
                  <span className={styles.metaItem}>Buka • {storeHours}</span>
                  <span className={styles.dotDivider}>•</span>
                  <span className={styles.metaLocation}>📍 {storeLocation}</span>
                </div>
              </div>
            </div>

            {/* Right Action: Cart Button & Admin Link */}
            <div className={styles.headerActions}>
              <button
                type="button"
                onClick={() => setIsCartOpen(true)}
                className={styles.cartHeaderBtn}
                title="Lihat Keranjang Belanja"
              >
                <ShoppingBag size={18} />
                <span className={styles.cartCount}>
                  {mounted ? cartTotalQty : 0}
                </span>
                <span className={styles.cartTotalText}>
                  {mounted ? formatCurrency(subtotal) : 'Rp 0'}
                </span>
              </button>

              <Link href="/admin" className={styles.adminIconLink} title="Portal Admin Toko">
                <Lock size={16} />
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* ─── Main Content Flow ─── */}
      <main className={styles.main}>
        <div className="container">
          {/* Store Closed Banner */}
          {mounted && settings?.isOpen === false && (
            <div className={styles.closedBanner}>
              <AlertTriangle size={18} />
              <div>
                <strong>Toko Sedang Tutup</strong>
                <span>Maaf, kami sedang tidak menerima pesanan untuk saat ini. Silakan coba lagi nanti.</span>
              </div>
            </div>
          )}

          {/* Loading Indicator */}
          {isLoadingDb && (
            <div className={styles.loadingBar}>
              <div className={styles.loadingBarInner} />
            </div>
          )}

          {/* Fresh Clean Storefront Hero */}
          <div className={styles.heroBanner}>
            <span className={styles.heroTag}>Pemesanan Cepat Online</span>
            <h2 className={styles.heroHeading}>Asinan Buah Segar Premium</h2>
            <p className={styles.heroSubheading}>
              Pesan asinan buah segar kuah kiamboy & delima merah spesial langsung antar ke lokasi Anda.
            </p>
          </div>

          {/* ─── 3-STEP PROGRESS STEPPER ─── */}
          <div className={styles.stepperWrapper} id="checkout-flow">
            <div className={styles.stepperTrack}>
              {/* Step 1 Button */}
              <button
                type="button"
                onClick={() => {
                  setCurrentStep(1);
                  scrollToContent();
                }}
                className={`${styles.stepBtn} ${currentStep === 1 ? styles.stepBtnActive : ''} ${currentStep > 1 ? styles.stepBtnDone : ''}`}
              >
                <span className={styles.stepBadge}>{currentStep > 1 ? '✓' : '1'}</span>
                <span className={styles.stepText}>1. Pilih Menu</span>
              </button>

              <div className={`${styles.stepConnector} ${currentStep > 1 ? styles.stepConnectorActive : ''}`} />

              {/* Step 2 Button */}
              <button
                type="button"
                onClick={() => {
                  if (cartTotalQty > 0) {
                    setCurrentStep(2);
                    scrollToContent();
                  }
                }}
                disabled={cartTotalQty === 0}
                className={`${styles.stepBtn} ${currentStep === 2 ? styles.stepBtnActive : ''} ${currentStep > 2 ? styles.stepBtnDone : ''}`}
              >
                <span className={styles.stepBadge}>{currentStep > 2 ? '✓' : '2'}</span>
                <span className={styles.stepText}>2. Pengiriman</span>
              </button>

              <div className={`${styles.stepConnector} ${currentStep > 2 ? styles.stepConnectorActive : ''}`} />

              {/* Step 3 Button */}
              <button
                type="button"
                onClick={() => {
                  if (formData.name && formData.phone && formData.address) {
                    setCurrentStep(3);
                    scrollToContent();
                  }
                }}
                disabled={!formData.name || !formData.phone || !formData.address}
                className={`${styles.stepBtn} ${currentStep === 3 ? styles.stepBtnActive : ''}`}
              >
                <span className={styles.stepBadge}>3</span>
                <span className={styles.stepText}>3. Pembayaran</span>
              </button>
            </div>
          </div>

          {/* ─── STEP 1: PILIH MENU ASINAN ─── */}
          {currentStep === 1 && (
            <div className={styles.stepContainer}>
              <section className={styles.cardSection}>
                <div className={styles.sectionHeaderRow}>
                  <div className={styles.stepNum}>1</div>
                  <div>
                    <h3 className={styles.stepTitle}>Pilih Menu & Porsi Asinan</h3>
                    <p className={styles.stepDesc}>Tentukan menu favorit Anda dan klik tombol <strong>+ Tambah</strong></p>
                  </div>
                </div>

                <div className={styles.productCardsList}>
                  {activeProducts.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      onAddToCartNotice={(msg) => addToast(msg, 'success')}
                    />
                  ))}
                </div>
              </section>

              {/* Bottom Sticky Action for Step 1 */}
              <div className={styles.step1ActionBar}>
                <div className={styles.step1SummaryInfo}>
                  <span className={styles.step1QtyBadge}>{cartTotalQty} Item Dipilih</span>
                  <div className={styles.step1PriceRow}>
                    <span className={styles.step1PriceLabel}>Subtotal:</span>
                    <strong className={styles.step1PriceVal}>{formatCurrency(subtotal)}</strong>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleProceedToShipping}
                  disabled={cartTotalQty === 0}
                  className={styles.btnStep1Proceed}
                >
                  <span>{cartTotalQty > 0 ? 'Lanjut ke Pengiriman' : 'Pilih Menu untuk Lanjut'}</span>
                  <ArrowRight size={18} />
                </button>
              </div>
            </div>
          )}

          {/* ─── STEP 2 & 3: CHECKOUT FORM COMPONENT ─── */}
          {(currentStep === 2 || currentStep === 3) && (
            <div className={styles.stepContainer}>
              <CheckoutForm
                currentStep={currentStep}
                formData={formData}
                setFormData={setFormData}
                onBackToMenu={() => {
                  setCurrentStep(1);
                  scrollToContent();
                }}
                onNextToPayment={handleProceedToPayment}
                onBackToShipping={() => {
                  setCurrentStep(2);
                  scrollToContent();
                }}
                onSubmitOrder={handleCheckoutSubmit}
                isSubmitting={isSubmitting}
                onToast={addToast}
              />
            </div>
          )}
        </div>
      </main>

      {/* ─── Simple Clean Footer ─── */}
      <footer className={styles.simpleFooter}>
        <div className="container">
          <div className={styles.footerContent}>
            <p>&copy; {new Date().getFullYear()} <strong>{storeName}</strong> • Asinan Buah Segar Premium</p>
            <div className={styles.footerLinks}>
              <Link href="/admin">Portal Admin / Pembukuan</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
