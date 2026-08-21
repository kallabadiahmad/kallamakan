'use client';

import React, { useState } from 'react';
import {
  CheckCircle2,
  X,
  MessageCircle,
  Copy,
  Check,
  Printer,
  ShoppingBag,
  MapPin,
  CreditCard,
} from 'lucide-react';
import { formatCurrency, copyToClipboard } from '../lib/utils';
import { BANK_ACCOUNTS } from '../lib/constants';
import styles from './InvoiceModal.module.css';

export default function InvoiceModal({ order, onClose, onOpenWa, storeSettings }) {
  const [copiedSummary, setCopiedSummary] = useState(false);
  const [copiedBank, setCopiedBank] = useState(false);

  if (!order) return null;

  const {
    id,
    date,
    customer,
    phone,
    address,
    notes,
    items,
    subtotal,
    shippingCost,
    shippingName,
    discount,
    voucherCode,
    total,
    paymentMethod,
    paymentBank,
  } = order;

  const handleCopySummary = async () => {
    let text = `*NOTA PESANAN #${id}*\n`;
    text += `Nama: ${customer} (${phone})\n`;
    text += `Alamat: ${address}\n`;
    text += `Metode Pembayaran: ${paymentMethod === 'transfer' ? `Transfer Bank (${paymentBank || 'BCA'})` : 'COD'}\n\n`;
    text += `*Rincian Menu:*\n`;
    items.forEach((item, idx) => {
      text += `${idx + 1}. ${item.name} (${item.size}) x${item.qty} = ${formatCurrency(
        item.price * item.qty
      )}\n`;
    });
    text += `\nSubtotal: ${formatCurrency(subtotal)}\n`;
    text += `Ongkir: ${shippingCost === 0 ? 'GRATIS' : formatCurrency(shippingCost)}\n`;
    if (discount > 0) text += `Diskon: -${formatCurrency(discount)}\n`;
    text += `*TOTAL BAYAR: ${formatCurrency(total)}*\n`;

    const success = await copyToClipboard(text);
    if (success) {
      setCopiedSummary(true);
      setTimeout(() => setCopiedSummary(false), 2500);
    }
  };

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  const chosenBank =
    BANK_ACCOUNTS.find(
      (b) => b.bank.toLowerCase() === (paymentBank || 'dana').toLowerCase()
    ) || BANK_ACCOUNTS[0];

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className={styles.closeBtn}
          aria-label="Tutup Nota"
        >
          <X size={20} />
        </button>

        {/* Printable Thermal/Digital Receipt Area */}
        <div id="thermalReceipt" className={styles.receiptContainer}>
          {/* Header */}
          <div className={styles.receiptHeader}>
            <div className={styles.successIconWrapper}>
              <CheckCircle2 size={44} className={styles.successIcon} />
            </div>
            <h2 className={styles.receiptTitle}>Pesanan Berhasil Dibuat!</h2>
            <p className={styles.receiptSubtitle}>
              Terima kasih telah berbelanja di{' '}
              <strong>{storeSettings?.storeName || 'Kalla Makan'}</strong>
            </p>
            <div className={styles.orderIdBadge}>ID Pesanan: #{id}</div>
          </div>

          {/* Customer Details */}
          <div className={styles.sectionBox}>
            <div className={styles.sectionHeaderSmall}>
              <MapPin size={14} />
              <span>Data Pengiriman</span>
            </div>
            <div className={styles.infoGrid}>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Nama:</span>
                <strong className={styles.infoVal}>{customer}</strong>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>No. WhatsApp:</span>
                <span className={styles.infoVal}>{phone}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Alamat:</span>
                <span className={styles.infoVal}>{address}</span>
              </div>
            </div>
          </div>

          {/* Items Breakdown */}
          <div className={styles.sectionBox}>
            <div className={styles.sectionHeaderSmall}>
              <ShoppingBag size={14} />
              <span>Rincian Item</span>
            </div>
            <div className={styles.itemsList}>
              {items.map((item, idx) => (
                <div key={idx} className={styles.receiptItem}>
                  <div className={styles.receiptItemName}>
                    <strong>{item.name}</strong>
                    <span>
                      {item.size} • {item.qty}x @ {formatCurrency(item.price)}
                    </span>
                  </div>
                  <strong className={styles.receiptItemPrice}>
                    {formatCurrency(item.price * item.qty)}
                  </strong>
                </div>
              ))}
            </div>

            <div className={styles.receiptCalc}>
              <div className={styles.calcLine}>
                <span>Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              <div className={styles.calcLine}>
                <span>Ongkir ({shippingName || 'Kurir'})</span>
                <span>
                  {shippingCost === 0 ? 'GRATIS' : formatCurrency(shippingCost)}
                </span>
              </div>
              {discount > 0 && (
                <div className={`${styles.calcLine} ${styles.discountLine}`}>
                  <span>Diskon Promo ({voucherCode})</span>
                  <span>-{formatCurrency(discount)}</span>
                </div>
              )}
              <div className={styles.totalLine}>
                <span>Total Pembayaran</span>
                <strong className={styles.totalAmount}>
                  {formatCurrency(total)}
                </strong>
              </div>
            </div>
          </div>

          {/* Payment Guidance */}
          <div className={styles.paymentGuidance}>
            <div className={styles.guidanceHeader}>
              <CreditCard size={15} />
              <span>Instruksi Pembayaran:</span>
            </div>

            {paymentMethod === 'transfer' ? (
              <div className={styles.bankInstruction}>
                <p>Silakan transfer tepat sebesar <strong>{formatCurrency(total)}</strong> ke:</p>
                <div className={styles.bankBox}>
                  <div className={styles.bankNameTag}>{chosenBank.bank}</div>
                  <div className={styles.bankDetailNumber}>
                    <span className={styles.accNumber}>{chosenBank.number}</span>
                    <span className={styles.accHolder}>a.n {chosenBank.holder}</span>
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      await copyToClipboard(chosenBank.number.replace(/\s+/g, ''));
                      setCopiedBank(true);
                      setTimeout(() => setCopiedBank(false), 2000);
                    }}
                    className={styles.copyAccBtn}
                  >
                    {copiedBank ? <Check size={14} /> : <Copy size={14} />}
                    <span>{copiedBank ? 'Tersalin' : 'Salin Rekening'}</span>
                  </button>
                </div>
                <span className={styles.noteTransfer}>
                  *Kirim bukti transfer ke WhatsApp admin untuk verifikasi cepat.
                </span>
              </div>
            ) : (
              <div className={styles.codInstruction}>
                <p>
                  Siapkan uang pas sebesar <strong>{formatCurrency(total)}</strong> saat pesanan tiba / saat diambil di outlet.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Modal Bottom Actions */}
        <div className={styles.modalActions}>
          <button
            type="button"
            onClick={onOpenWa}
            className={styles.btnPrimaryWa}
          >
            <MessageCircle size={20} />
            <span>Kirim / Buka WhatsApp</span>
          </button>

          <div className={styles.subActions}>
            <button
              type="button"
              onClick={handleCopySummary}
              className={styles.btnSubAction}
            >
              {copiedSummary ? <Check size={16} /> : <Copy size={16} />}
              <span>{copiedSummary ? 'Nota Tersalin!' : 'Salin Nota'}</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className={styles.btnSubAction}
            >
              <Printer size={16} />
              <span>Cetak / PDF</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
