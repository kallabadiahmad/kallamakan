'use client';

import React, { useState } from 'react';
import {
  Truck,
  Store,
  CreditCard,
  Building2,
  Banknote,
  Copy,
  Check,
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
  formData,
  setFormData,
  onSubmit,
  disabled,
  onToast,
}) {
  const {
    selectedShipping,
    setSelectedShipping,
    subtotal,
    discount,
    total,
  } = useCart();

  const [copiedBank, setCopiedBank] = useState('');

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

  return (
    <div className={styles.checkoutWrapper}>
      {/* LANGKAH 2: DATA PEMESAN & ALAMAT */}
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
          {/* Baris 1: Nama & WhatsApp */}
          <div className={styles.formRowTwo}>
            <div className={styles.inputGroup}>
              <label className={styles.fieldLabel}>
                <span>Nama Lengkap <strong className={styles.required}>*</strong></span>
              </label>
              <input
                type="text"
                name="name"
                placeholder="Nama lengkap Anda"
                value={formData.name}
                onChange={handleInputChange}
                required
                className={styles.inputField}
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
            </div>
          </div>

          {/* Baris 2: Alamat Pengiriman */}
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
            <span className={styles.fieldHint}>
              Pastikan alamat detail untuk kurir pengantaran
            </span>
          </div>

          {/* Baris 3: Catatan Khusus */}
          <div className={styles.inputGroup}>
            <label className={styles.fieldLabel}>
              <span>Catatan Khusus (Opsional)</span>
            </label>
            <textarea
              name="notes"
              rows="2"
              placeholder="Contoh: Jangan terlalu pedas, titip di satpam, minta sendok plastik, dll"
              value={formData.notes}
              onChange={handleInputChange}
              className={styles.textareaField}
            ></textarea>
          </div>
        </div>
      </div>


      {/* LANGKAH 3: PILIHAN PENGIRIMAN */}
      <div className={styles.cardSection}>
        <div className={styles.sectionTitleRow}>
          <div className={styles.sectionNumber}>3</div>
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

      {/* LANGKAH 4: METODE PEMBAYARAN */}
      <div className={styles.cardSection}>
        <div className={styles.sectionTitleRow}>
          <div className={styles.sectionNumber}>4</div>
          <div>
            <h3 className={styles.sectionTitle}>Metode Pembayaran</h3>
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

        {/* Transfer Bank Detail */}
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
              Bukti transfer dapat Anda kirimkan setelah menekan tombol WhatsApp di bawah.
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
