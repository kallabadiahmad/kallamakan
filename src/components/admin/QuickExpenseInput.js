'use client';

import React, { useMemo, useState } from 'react';
import styles from '../../app/admin/admin.module.css';
import { formatCurrency, formatDate, generateId } from '../../lib/utils';
import { EXPENSE_CATEGORIES } from '../../lib/constants';
import { parseExpenseText } from '../../lib/expenseParser';
import { useCart } from '../../context/CartContext';
import { useToast } from '../../hooks/useToast';

const PLACEHOLDER = `Ketik atau tempel catatan seperti biasa. Contoh:
14 November 2026
Pendapatan: 1.595.000
-toples 90.000
-boga kita 195.000
iklan fb 50rb
kemarin:
es batu 10rb`;

const CATEGORY_SHORT = {
  ads_ctwa: '📣 Iklan',
  bahan_baku: '🥭 Bahan Baku',
  alat_packaging: '📦 Packaging',
  operasional: '⚡ Operasional',
  lainnya: '🗂️ Lain-lain',
};

export const recapIdForDate = (date) => `REKAP-${String(date).replace(/-/g, '')}`;

/** Rekap pendapatan harian disimpan sebagai "pesanan" khusus (source: 'rekap') supaya masuk omzet */
export function buildRecapOrder(date, amount, note = '') {
  return {
    id: recapIdForDate(date),
    date: `${date}T12:00:00`,
    customer: 'Rekap Penjualan Harian',
    phone: '-',
    address: '',
    notes: note,
    items: [
      { id: 'rekap', productId: '', name: 'Penjualan harian (rekap catatan)', size: '', price: amount, hpp: 0, emoji: '📒', qty: 1 },
    ],
    subtotal: amount,
    totalHPP: 0,
    grossProfit: 0,
    shippingMethod: 'pickup',
    shippingName: 'Rekap',
    shippingCost: 0,
    discount: 0,
    voucherCode: null,
    total: amount,
    paymentMethod: 'transfer',
    paymentBank: '',
    status: 'completed',
    source: 'rekap',
  };
}

const inputSm = { padding: '6px 8px', fontSize: '0.84rem' };

export default function QuickExpenseInput({ compact = false }) {
  const { saveExpense, saveOrder, orders } = useCart();
  const { addToast } = useToast();
  const [text, setText] = useState('');
  const [edits, setEdits] = useState({}); // { [key]: { title, amount, category, date, skip } }
  const [isSaving, setIsSaving] = useState(false);

  const parsed = useMemo(() => parseExpenseText(text), [text]);

  const rows = parsed.map((r) => {
    const e = edits[r.key] || {};
    const amount = e.amount !== undefined ? parseInt(String(e.amount).replace(/\D/g, ''), 10) || 0 : r.amount;
    return {
      ...r,
      title: e.title !== undefined ? e.title : r.title,
      category: e.category || r.category,
      date: e.date || r.date,
      amount,
      amountInput: e.amount !== undefined ? e.amount : r.amount ? String(r.amount) : '',
      warn: e.amount !== undefined ? false : r.warn,
      skip: !!e.skip,
    };
  });

  const incomeRows = rows.filter((r) => r.type === 'income');
  const expenseRows = rows.filter((r) => r.type !== 'income');

  const readyExpenses = expenseRows.filter((r) => !r.skip && r.amount > 0);
  const readyIncome = incomeRows.filter((r) => !r.skip && r.amount > 0);
  const expenseTotal = readyExpenses.reduce((s, r) => s + r.amount, 0);
  const missing = rows.filter((r) => !r.skip && r.amount <= 0).length;
  const warnCount = rows.filter((r) => !r.skip && r.warn).length;

  // Pendapatan per tanggal (kalau satu tanggal ditulis dua kali, dijumlah)
  const incomeByDate = {};
  readyIncome.forEach((r) => {
    incomeByDate[r.date] = (incomeByDate[r.date] || 0) + r.amount;
  });
  const incomeTotal = Object.values(incomeByDate).reduce((s, v) => s + v, 0);
  const existingRecap = (date) => (orders || []).find((o) => o.id === recapIdForDate(date));

  const setEdit = (key, field, value) =>
    setEdits((prev) => ({ ...prev, [key]: { ...(prev[key] || {}), [field]: value } }));

  const handleTextChange = (value) => {
    setText(value);
    if (!value.trim()) setEdits({});
  };

  const totalReady = readyExpenses.length + Object.keys(incomeByDate).length;

  const handleSave = async () => {
    if (totalReady === 0) {
      addToast('Belum ada nominal yang terbaca', 'error');
      return;
    }
    setIsSaving(true);
    let failed = 0;

    for (const [date, amount] of Object.entries(incomeByDate)) {
      const note = readyIncome.filter((r) => r.date === date).map((r) => r.raw).join(' | ');
      const res = await saveOrder(buildRecapOrder(date, amount, note));
      if (res && !res.success) failed++;
    }

    for (const r of readyExpenses) {
      const res = await saveExpense({
        id: generateId('exp'),
        date: r.date,
        category: r.category,
        desc: r.title,
        title: r.title || EXPENSE_CATEGORIES[r.category] || 'Pengeluaran',
        amount: r.amount,
        notes: r.raw,
      });
      if (res && !res.success) failed++;
    }
    setIsSaving(false);

    if (failed > 0) {
      addToast(`${failed} data gagal tersimpan. Cek koneksi lalu coba lagi.`, 'error');
      return;
    }
    const parts = [];
    if (Object.keys(incomeByDate).length) parts.push(`${Object.keys(incomeByDate).length} hari pendapatan`);
    if (readyExpenses.length) parts.push(`${readyExpenses.length} pengeluaran`);
    addToast(`✅ Tersimpan: ${parts.join(' & ')}`, 'success');
    setText('');
    setEdits({});
  };

  const rowBox = (r) => ({
    display: 'grid',
    gap: '6px',
    alignItems: 'center',
    padding: '8px',
    borderRadius: '8px',
    background: r.skip ? '#F8FAFC' : r.amount <= 0 ? '#FEF2F2' : r.warn ? '#FFFBEB' : '#FFFFFF',
    border: `1px solid ${r.skip ? '#E2E8F0' : r.amount <= 0 ? '#FECACA' : r.warn ? '#FDE68A' : '#E2E8F0'}`,
    opacity: r.skip ? 0.5 : 1,
  });

  const amountCell = (r) => (
    <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
      <input
        type="number"
        min="0"
        inputMode="numeric"
        className={styles.formInput}
        value={r.amountInput}
        onChange={(e) => setEdit(r.key, 'amount', e.target.value)}
        placeholder="Nominal?"
        aria-label="Jumlah"
        style={{ ...inputSm, fontWeight: 700 }}
      />
      {r.warn && r.amount > 0 && r.amount < 1000000 && (
        <button
          type="button"
          className={`${styles.btn} ${styles.btnSecondary}`}
          onClick={() => setEdit(r.key, 'amount', String(r.amount * 1000))}
          title={`Ubah jadi ${formatCurrency(r.amount * 1000)}`}
          style={{ padding: '6px 8px', fontSize: '0.72rem', whiteSpace: 'nowrap' }}
        >
          ×1000
        </button>
      )}
    </div>
  );

  const skipBtn = (r) => (
    <button
      type="button"
      className={`${styles.btn} ${styles.btnSecondary}`}
      onClick={() => setEdit(r.key, 'skip', !r.skip)}
      title={r.skip ? 'Masukkan lagi' : 'Jangan disimpan'}
      style={{ padding: '6px 10px' }}
    >
      {r.skip ? '↩︎' : '✕'}
    </button>
  );

  return (
    <div className={styles.card} style={{ marginBottom: '24px', border: '1.5px solid #FDE68A' }}>
      <div className={styles.cardHeader} style={{ background: '#FFFBEB' }}>
        <h3>✍️ Catat Cepat (Pendapatan & Pengeluaran)</h3>
        <span style={{ fontSize: '0.75rem', color: '#92400E' }}>Ketik / tempel catatan, web yang memilah</span>
      </div>
      <div className={styles.cardBody}>
        <textarea
          className={styles.formInput}
          rows={compact ? 4 : 6}
          value={text}
          onChange={(e) => handleTextChange(e.target.value)}
          placeholder={PLACEHOLDER}
          style={{ fontFamily: 'inherit', lineHeight: 1.5, resize: 'vertical' }}
        />
        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '6px' }}>
          Baris yang diawali &quot;Pendapatan&quot; / &quot;Omset&quot; = pemasukan hari itu. Baris lain = pengeluaran. Nominal: 50rb, 50k,
          50.000, 1,5jt. Tanggal: &quot;14 November 2026&quot;, &quot;kemarin&quot;, &quot;tgl 12&quot; (di baris sendiri = berlaku untuk baris
          di bawahnya). Baris &quot;Total: ...&quot; otomatis dilewati karena web menghitung sendiri.
        </div>

        {rows.length > 0 && (
          <div style={{ marginTop: '16px' }}>
            {incomeRows.length > 0 && (
              <>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, margin: '4px 0 8px', color: '#166534' }}>📒 Pendapatan harian</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px' }}>
                  {incomeRows.map((r) => {
                    const old = existingRecap(r.date);
                    return (
                      <div key={r.key} style={{ ...rowBox(r), gridTemplateColumns: 'minmax(120px, 1fr) minmax(150px, 1.2fr) auto' }}>
                        <input
                          type="date"
                          className={styles.formInput}
                          value={r.date}
                          onChange={(e) => setEdit(r.key, 'date', e.target.value)}
                          aria-label="Tanggal"
                          style={{ ...inputSm, fontSize: '0.8rem' }}
                        />
                        <div>
                          {amountCell(r)}
                          {old && !r.skip && (
                            <div style={{ fontSize: '0.7rem', color: '#B45309', marginTop: '3px' }}>
                              Menggantikan rekap {formatDate(r.date)} sebelumnya ({formatCurrency(old.total)})
                            </div>
                          )}
                        </div>
                        {skipBtn(r)}
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {expenseRows.length > 0 && (
              <>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, margin: '4px 0 8px', color: '#334155' }}>
                  💸 Pengeluaran (semua bisa diubah)
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {expenseRows.map((r) => (
                    <div
                      key={r.key}
                      style={{
                        ...rowBox(r),
                        gridTemplateColumns: 'minmax(120px, 1.6fr) minmax(120px, 1fr) minmax(95px, 0.8fr) minmax(120px, 0.9fr) auto',
                      }}
                    >
                      <input
                        type="text"
                        className={styles.formInput}
                        value={r.title}
                        onChange={(e) => setEdit(r.key, 'title', e.target.value)}
                        aria-label="Keterangan"
                        style={inputSm}
                      />
                      <select
                        className={styles.formInput}
                        value={r.category}
                        onChange={(e) => setEdit(r.key, 'category', e.target.value)}
                        aria-label="Kategori"
                        style={inputSm}
                      >
                        {Object.keys(EXPENSE_CATEGORIES).map((k) => (
                          <option key={k} value={k}>{CATEGORY_SHORT[k] || EXPENSE_CATEGORIES[k]}</option>
                        ))}
                      </select>
                      <input
                        type="date"
                        className={styles.formInput}
                        value={r.date}
                        onChange={(e) => setEdit(r.key, 'date', e.target.value)}
                        aria-label="Tanggal"
                        style={{ ...inputSm, fontSize: '0.8rem' }}
                      />
                      {amountCell(r)}
                      {skipBtn(r)}
                    </div>
                  ))}
                </div>
              </>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', marginTop: '14px', flexWrap: 'wrap' }}>
              <div style={{ fontSize: '0.82rem', color: '#334155', lineHeight: 1.6 }}>
                {incomeTotal > 0 && (
                  <span style={{ marginRight: '10px' }}>
                    Pendapatan <strong style={{ color: '#16A34A' }}>{formatCurrency(incomeTotal)}</strong>
                  </span>
                )}
                <span>
                  {readyExpenses.length} pengeluaran <strong style={{ color: '#DC2626' }}>{formatCurrency(expenseTotal)}</strong>
                </span>
                {incomeTotal > 0 && (
                  <span style={{ marginLeft: '10px' }}>
                    Bersih <strong>{incomeTotal - expenseTotal < 0 ? '-' : ''}{formatCurrency(incomeTotal - expenseTotal)}</strong>
                  </span>
                )}
                {missing > 0 && (
                  <div style={{ color: '#DC2626' }}>⚠️ {missing} baris belum ada nominalnya (isi atau klik ✕)</div>
                )}
                {warnCount > 0 && (
                  <div style={{ color: '#B45309' }}>⚠️ {warnCount} nominal kelihatan kurang nol, cek yang kuning (tombol ×1000)</div>
                )}
                {parsed.skipped?.length > 0 && (
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.74rem' }}>
                    Dilewati (tidak ada angka): {parsed.skipped.slice(0, 5).join(', ')}
                    {parsed.skipped.length > 5 ? ` +${parsed.skipped.length - 5} lagi` : ''}
                  </div>
                )}
              </div>
              <button
                type="button"
                className={`${styles.btn} ${styles.btnPrimary}`}
                onClick={handleSave}
                disabled={isSaving || totalReady === 0}
              >
                {isSaving ? 'Menyimpan...' : `💾 Simpan Semua`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
