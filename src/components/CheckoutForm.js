'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import {
  Truck,
  Store,
  Building2,
  Banknote,
  Copy,
  Check,
  ArrowRight,
  ArrowLeft,
  MessageCircle,
  Tag,
  X,
  ShoppingBag,
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import { formatCurrency, copyToClipboard } from '../lib/utils';
import {
  SHIPPING_METHODS,
  PAYMENT_METHODS,
  BANK_ACCOUNTS,
} from '../lib/constants';
import styles from './CheckoutForm.module.css';

export default function CheckoutForm({
  currentStep,
  formData,
  setFormData,
  onBackToMenu,
  onNextToPayment,
  onBackToShipping,
  onSubmitOrder,
  isSubmitting,
  onToast,
}) {
  const {
    cartItems,
    selectedShipping,
    setSelectedShipping,
    subtotal,
    discount,
    appliedVoucher,
    applyVoucher,
    removeVoucher,
    total,
  } = useCart();

  const [copiedBank, setCopiedBank] = useState('');
  const [voucherCode, setVoucherCode] = useState('');
  const [voucherMsg, setVoucherMsg] = useState('');
  const [voucherSuccess, setVoucherSuccess] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleShippingSelect = (method) => {
    setSelectedShipping(method);
    setFormData((prev) => ({ ...prev, shippingMethod: method }));
  };

  const handlePaymentSelect = (methodId) => {
    setFormData((prev) => ({
      ...prev,
      paymentMethod: methodId,
    }));
  };

  const handleBankSelect = (bank) => {
    setFormData((prev) => ({
      ...prev,
      paymentDetails: { ...prev.paymentDetails, bank: bank.bank },
    }));
  };

  const handleCopyAccount = async (bankNumber, bankName) => {
    const success = await copyToClipboard(bankNumber.replace(/\s+/g, ''));
    if (success) {
      setCopiedBank(bankName);
      if (onToast) onToast(`Nomor rekening ${bankName} berhasil disalin!`, 'success');
      setTimeout(() => setCopiedBank(''), 2500);
    }
  };

  const handleApplyVoucher = () => {
    const result = applyVoucher(voucherCode);
    setVoucherMsg(result.message);
    setVoucherSuccess(result.success);
    if (result.success) setVoucherCode('');
    setTimeout(() => setVoucherMsg(''), 4000);
  };

  // ══════════════════════════════════════════════════
  // LANGKAH 2: DATA PEMESAN & PILIHAN PENGIRIMAN
  // ══════════════════════════════════════════════════
  if (currentStep === 2) {
    return (
      <div className={styles.checkoutWrapper}>
        {/* Card 1: Data Penerima */}
        <div className={styles.cardSection}>
          <div className={styles.sectionTitleRow}>
            <div className={styles.sectionNumber}>2</div>
            <div>
              <h3 className={styles.sectionTitle}>Data Pemesan & Alamat Kirim</h3>
              <p className={styles.sectionSubtitle}>
                Lengkapi data di bawah agar pesanan tiba dengan tepat dan cepat
              </p>
            </div>
          </div>

          <div className={styles.formContainer}>
            {/* Nama & WhatsApp */}
            <div className={styles.formRowTwo}>
              <div className={styles.inputGroup}>
                <label className={styles.fieldLabel}>
                  <span>Nama Lengkap <strong className={styles.required}>*</strong></span>
                </label>
                <input
                  type="text"
                  name="name"
                  placeholder="Contoh: Budi Santoso"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  className={styles.inputField}
                  autoFocus
                />
              </div>

              <div className={styles.inputGroup}>
                <label className={styles.fieldLabel}>
                  <span>Nomor WhatsApp <strong className={styles.required}>*</strong></span>
                </label>
                <input
                  type="tel"
                  name="phone"
                  placeholder="08xxxxxxxxxx"
                  value={formData.phone}
                  onChange={handleInputChange}
                  required
                  className={styles.inputField}
                />
                <span className={styles.fieldHint}>Format: 08xx atau 628xx</span>
              </div>
            </div>

            {/* Alamat Pengiriman */}
            <div className={styles.inputGroup}>
              <label className={styles.fieldLabel}>
                <span>Alamat Lengkap Pengiriman <strong className={styles.required}>*</strong></span>
              </label>
              <textarea
                name="address"
                rows="3"
                placeholder="Nama jalan, nomor rumah/kantor, RT/RW, kelurahan, kecamatan, serta patokan gedung"
                value={formData.address}
                onChange={handleInputChange}
                required
                className={styles.textareaField}
              ></textarea>
            </div>

            {/* Catatan Khusus */}
            <div className={styles.inputGroup}>
              <label className={styles.fieldLabel}>
                <span>Catatan Khusus (Opsional)</span>
              </label>
              <textarea
                name="notes"
                rows="2"
                placeholder="Contoh: Jangan terlalu pedas, titip di satpam, minta sendok, dll"
                value={formData.notes}
                onChange={handleInputChange}
                className={styles.textareaField}
              ></textarea>
            </div>
          </div>
        </div>

        {/* Card 2: Pilihan Pengiriman */}
        <div className={styles.cardSection}>
          <div className={styles.sectionTitleRow}>
            <div className={styles.sectionNumber}>🚚</div>
            <div>
              <h3 className={styles.sectionTitle}>Pilihan Pengiriman</h3>
              <p className={styles.sectionSubtitle}>
                Pilih metode pengantaran asinan segar ke lokasi Anda
              </p>
            </div>
          </div>

          <div className={styles.shippingGrid}>
            {SHIPPING_METHODS.map((method) => {
              const isSelected = selectedShipping?.id === method.id;
              const IconComponent = method.id === 'kurir' ? Truck : Store;

              return (
                <div
                  key={method.id}
                  onClick={() => handleShippingSelect(method)}
                  className={`${styles.shippingCard} ${
                    isSelected ? styles.shippingSelected : ''
                  }`}
                >
                  <div className={styles.shippingLeft}>
                    <div className={styles.radioCircle}>
                      {isSelected && <div className={styles.radioDot} />}
                    </div>
                    <div className={styles.methodIconWrapper}>
                      <IconComponent size={18} className={styles.methodIcon} />
                    </div>
                    <div className={styles.shippingInfo}>
                      <strong className={styles.shippingName}>{method.name}</strong>
                      <span className={styles.shippingDesc}>{method.description}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Navigation Actions for Step 2 */}
        <div className={styles.stepNavigationRow}>
          <button
            type="button"
            onClick={onBackToMenu}
            className={styles.btnSecondaryBack}
          >
            <ArrowLeft size={18} />
            <span>Kembali ke Menu</span>
          </button>

          <button
            type="button"
            onClick={onNextToPayment}
            className={styles.btnPrimaryNext}
          >
            <span>Lanjut ke Pembayaran</span>
            <ArrowRight size={18} />
          </button>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════
  // LANGKAH 3: PEMBAYARAN, REKENING, & RINGKASAN AKHIR
  // ══════════════════════════════════════════════════
  if (currentStep === 3) {
    return (
      <div className={styles.checkoutWrapper}>
        {/* Card 1: Metode Pembayaran */}
        <div className={styles.cardSection}>
          <div className={styles.sectionTitleRow}>
            <div className={styles.sectionNumber}>3</div>
            <div>
              <h3 className={styles.sectionTitle}>Pilih Metode Pembayaran</h3>
              <p className={styles.sectionSubtitle}>
                Pilih cara pembayaran yang paling nyaman untuk Anda
              </p>
            </div>
          </div>

          <div className={styles.paymentGrid}>
            {PAYMENT_METHODS.map((method) => {
              const isSelected = formData.paymentMethod === method.id;
              const IconComponent = method.id === 'transfer' ? Building2 : Banknote;

              return (
                <div
                  key={method.id}
                  onClick={() => handlePaymentSelect(method.id)}
                  className={`${styles.paymentCard} ${
                    isSelected ? styles.paymentSelected : ''
                  }`}
                >
                  <div className={styles.paymentCardHeader}>
                    <div className={styles.paymentIconTitle}>
                      <div className={styles.methodIconWrapper}>
                        <IconComponent size={17} className={styles.methodIcon} />
                      </div>
                      <strong className={styles.paymentName}>{method.name}</strong>
                    </div>
                    <div className={styles.radioCircle}>
                      {isSelected && <div className={styles.radioDot} />}
                    </div>
                  </div>
                  <span className={styles.paymentDesc}>{method.description}</span>
                </div>
              );
            })}
          </div>

          {/* Rekening Tujuan Transfer */}
          {formData.paymentMethod === 'transfer' && (
            <div className={styles.bankSection}>
              <div className={styles.bankSectionHeader}>
                <span>Pilih Rekening Tujuan Transfer:</span>
              </div>
              <div className={styles.bankList}>
                {BANK_ACCOUNTS.map((bank) => {
                  const isBankActive =
                    formData.paymentDetails?.bank?.toLowerCase() ===
                    bank.bank.toLowerCase();
                  const isCopied = copiedBank === bank.bank;

                  return (
                    <div
                      key={bank.bank}
                      onClick={() => handleBankSelect(bank)}
                      className={`${styles.bankCard} ${
                        isBankActive ? styles.bankSelected : ''
                      }`}
                    >
                      <div className={styles.bankInfo}>
                        <span
                          className={styles.bankTag}
                          style={{ background: bank.color }}
                        >
                          {bank.bank}
                        </span>
                        <div className={styles.bankNumbers}>
                          <span className={styles.bankAccount}>{bank.number}</span>
                          <span className={styles.bankHolder}>a.n {bank.holder}</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopyAccount(bank.number, bank.bank);
                        }}
                        className={styles.copyBtn}
                      >
                        {isCopied ? (
                          <>
                            <Check size={14} className={styles.copiedIcon} />
                            <span>Tersalin</span>
                          </>
                        ) : (
                          <>
                            <Copy size={14} />
                            <span>Salin No. Rek</span>
                          </>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
              <span className={styles.bankNote}>
                *Bukti transfer dapat Anda kirimkan setelah menekan tombol WhatsApp di bawah.
              </span>
            </div>
          )}
        </div>

        {/* Card 2: Ringkasan Pesanan & Voucher */}
        <div className={styles.cardSection}>
          <div className={styles.sectionTitleRow}>
            <div className={styles.sectionNumber}>📋</div>
            <div>
              <h3 className={styles.sectionTitle}>Ringkasan Pesanan Anda</h3>
              <p className={styles.sectionSubtitle}>
                Pengiriman: <strong>{formData.name}</strong> ({formData.phone}) • {selectedShipping?.name}
              </p>
            </div>
          </div>

          {/* Item List */}
          <div className={styles.orderItemsBox}>
            {(cartItems || []).map((item) => (
              <div key={item.id} className={styles.orderItemLine}>
                <div className={styles.orderItemDetails}>
                  <strong className={styles.orderItemName}>{item.name}</strong>
                  <span className={styles.orderItemMeta}>
                    {item.size} • {item.qty}x @ {formatCurrency(item.price)}
                  </span>
                </div>
                <span className={styles.orderItemSubtotal}>
                  {formatCurrency(item.price * item.qty)}
                </span>
              </div>
            ))}
          </div>

          {/* Voucher Input */}
          <div className={styles.voucherBox}>
            {!appliedVoucher ? (
              <div className={styles.voucherInputRow}>
                <Tag size={15} className={styles.voucherIcon} />
                <input
                  type="text"
                  placeholder="Masukkan kode promo / voucher"
                  value={voucherCode}
                  onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
                  className={styles.voucherInputField}
                  onKeyDown={(e) => e.key === 'Enter' && handleApplyVoucher()}
                />
                <button
                  type="button"
                  onClick={handleApplyVoucher}
                  className={styles.voucherApplyBtn}
                  disabled={!voucherCode.trim()}
                >
                  Pakai
                </button>
              </div>
            ) : (
              <div className={styles.voucherAppliedRow}>
                <span>🎟️ Voucher {appliedVoucher.code} ({formatCurrency(appliedVoucher.discount)})</span>
                <button
                  type="button"
                  onClick={removeVoucher}
                  className={styles.removeVoucherBtn}
                  title="Hapus voucher"
                >
                  <X size={12} />
                </button>
              </div>
            )}
            {voucherMsg && (
              <span className={`${styles.voucherMsg} ${voucherSuccess ? styles.voucherMsgSuccess : styles.voucherMsgError}`}>
                {voucherMsg}
              </span>
            )}
          </div>

          {/* Price Breakdown */}
          <div className={styles.priceBreakdownBox}>
            <div className={styles.priceLine}>
              <span>Subtotal Produk</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>

            <div className={styles.priceLine}>
              <span>Biaya Pengiriman ({selectedShipping?.name || 'Kurir'})</span>
              <span>{selectedShipping?.id === 'kurir' ? 'Dikonfirmasi via WA' : 'GRATIS'}</span>
            </div>

            {discount > 0 && (
              <div className={`${styles.priceLine} ${styles.discountLine}`}>
                <span>Diskon Promo ({appliedVoucher?.code})</span>
                <span>-{formatCurrency(discount)}</span>
              </div>
            )}

            <div className={styles.grandTotalLine}>
              <div>
                <strong>Total Pembayaran</strong>
                <span className={styles.grandTotalNote}>
                  {selectedShipping?.id === 'kurir' ? '(Belum termasuk ongkir kurir)' : ''}
                </span>
              </div>
              <strong className={styles.grandTotalAmount}>{formatCurrency(total)}</strong>
            </div>
          </div>
        </div>

        {/* Navigation & Submit CTA for Step 3 */}
        <div className={styles.stepNavigationRow}>
          <button
            type="button"
            onClick={onBackToShipping}
            className={styles.btnSecondaryBack}
          >
            <ArrowLeft size={18} />
            <span>Ubah Alamat / Kurir</span>
          </button>

          <button
            type="button"
            onClick={() => setShowConfirm(true)}
            disabled={isSubmitting}
            className={styles.btnConfirmWa}
          >
            <MessageCircle size={20} />
            <span>{isSubmitting ? 'Memproses Pesanan...' : `Pesan via WhatsApp (${formatCurrency(total)})`}</span>
          </button>
        </div>

        {/* Confirmation Modal */}
        {showConfirm && (
          <div className={styles.confirmOverlay} onClick={() => setShowConfirm(false)}>
            <div className={styles.confirmDialog} onClick={(e) => e.stopPropagation()}>
              <h4 className={styles.confirmTitle}>Konfirmasi Pesanan</h4>
              <p className={styles.confirmText}>
                Pesanan atas nama <strong>{formData.name}</strong> sebesar <strong>{formatCurrency(total)}</strong> akan dikirimkan ke WhatsApp Admin Kalla Makan untuk diproses.
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
                  onClick={() => {
                    setShowConfirm(false);
                    onSubmitOrder();
                  }}
                  className={styles.confirmBtnOk}
                >
                  <MessageCircle size={16} />
                  Ya, Kirim Sekarang
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return null;
}
