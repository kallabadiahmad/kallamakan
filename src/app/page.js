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
} from 'lucide-react';
import ProductCard from '../components/ProductCard';
import CheckoutForm from '../components/CheckoutForm';
import OrderSummary from '../components/OrderSummary';
import CartDrawer from '../components/CartDrawer';
import MobileCartBar from '../components/MobileCartBar';
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

  const handleCheckoutSubmit = (e) => {
    if (e && e.preventDefault) e.preventDefault();

    if ((cartItems || []).length === 0) {
      addToast('Silakan pilih minimal 1 menu asinan di bawah terlebih dahulu.', 'error');
      const menuSection = document.getElementById('menu-section');
      if (menuSection) menuSection.scrollIntoView({ behavior: 'smooth' });
      return;
    }

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
      addToast('Format nomor tidak valid. Gunakan format 08xx atau 628xx.', 'error');
      return;
    }

    if (!formData.address.trim()) {
      addToast('Mohon masukkan Alamat Lengkap pengiriman.', 'error');
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
      items: [...cartItems],
      subtotal,
      totalHPP,
      grossProfit,
      shippingCost,
      shippingName: selectedShipping?.name || 'Kurir',
      discount,
      voucherCode: appliedVoucher?.code || null,
      total,
      paymentMethod: formData.paymentMethod,
      paymentBank: formData.paymentDetails?.bank || 'BCA',
      status: 'pending',
    };

    // Trigger celebration confetti
    try {
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#059669', '#10B981', '#F59E0B', '#3B82F6'],
      });
    } catch (err) {
      console.log('Confetti error', err);
    }

    // Save order to MongoDB & LocalStorage for cashflow tracking in admin
    saveOrder(orderRecord);

    // Generate WhatsApp message
    const waMessage = generateWhatsAppMessage({
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

    // Set created order for digital invoice modal
    setCreatedOrder(orderRecord);
    setIsSubmitting(false);

    // Open WhatsApp
    openWhatsApp(waMessage, settings?.whatsappNumber || CONFIG.WA_NUMBER);

    // Clear active cart & notify
    clearCart();
    addToast('Pesanan dicatat! Membuka WhatsApp untuk konfirmasi...', 'success');
  };

  const handleOpenWaFromInvoice = () => {
    if (!createdOrder) return;
    const waMessage = generateWhatsAppMessage({
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

    openWhatsApp(waMessage, settings?.whatsappNumber || CONFIG.WA_NUMBER);
  };

  const storeName = settings?.storeName || 'Kalla Makan';
  const cartTotalQty = (cartItems || []).reduce((sum, item) => sum + item.qty, 0);

  return (
    <div className={styles.pageWrapper}>
      {/* Toast Notifications */}
      <Toast toasts={toasts} removeToast={removeToast} />

      {/* Slide-over Cart Drawer */}
      <CartDrawer />

      {/* Mobile Floating Sticky Bar */}
      <MobileCartBar />

      {/* Digital Invoice Modal */}
      {createdOrder && (
        <InvoiceModal
          order={createdOrder}
          onClose={() => setCreatedOrder(null)}
          onOpenWa={handleOpenWaFromInvoice}
          storeSettings={settings}
        />
      )}

      {/* Clean Top Header */}
      <header className={styles.header}>
        <div className="container">
          <div className={styles.headerContent}>
            <div className={styles.brandRow}>
              <div className={styles.logoFrame}>
                <Image
                  src="/logo-kallamakan.png"
                  alt={storeName}
                  width={48}
                  height={48}
                  className={styles.logoImg}
                  priority
                />
              </div>
              <div className={styles.brandInfo}>
                <h1 className={styles.brandTitle}>{storeName}</h1>
                <div className={styles.badgeRow}>
                  <span className={styles.liveBadge}>
                    <span className={styles.liveDot}></span> Buka & Siap Kirim
                  </span>
                  <span className={styles.hoursBadge}>
                    <Clock size={12} /> {settings?.storeHours || '09:00 - 21:00'}
                  </span>
                </div>
              </div>
            </div>

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

      {/* Main Order & Checkout Flow */}
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
            <span className={styles.heroTag}>Pemesanan Online</span>
            <h2 className={styles.heroHeading}>Asinan Buah Segar Premium</h2>
            <p className={styles.heroSubheading}>
              Pilih menu asinan kiamboy atau pomegranate, tentukan porsi & alamat kirim, lalu konfirmasi pesanan langsung via WhatsApp.
            </p>
          </div>

          <div className={styles.checkoutGrid}>
            {/* Left Column: Product Selection & Customer Checkout Form */}
            <div className={styles.leftColumn}>
              {/* Step 1: Menu & Varian Selection */}
              <section className={styles.cardSection} id="menu-section">
                <div className={styles.sectionHeaderRow}>
                  <div className={styles.stepNum}>1</div>
                  <div>
                    <h3 className={styles.stepTitle}>Pilih Menu & Jumlah</h3>
                    <p className={styles.stepDesc}>Klik tombol pesan dan atur jumlah porsi yang Anda inginkan</p>
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

              {/* Step 2, 3, 4: Checkout Form (Address, Courier, Payment) */}
              <div id="checkout">
                <CheckoutForm
                  formData={formData}
                  setFormData={setFormData}
                  onSubmit={handleCheckoutSubmit}
                  disabled={(cartItems || []).length === 0}
                  onToast={addToast}
                />
              </div>
            </div>

            {/* Right Column: Sticky Order Summary & WhatsApp Action */}
            <div className={styles.rightColumn}>
              <OrderSummary
                onSubmit={handleCheckoutSubmit}
                disabled={(cartItems || []).length === 0}
                isSubmitting={isSubmitting}
              />
            </div>
          </div>
        </div>
      </main>

      {/* Simple Clean Footer */}
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
