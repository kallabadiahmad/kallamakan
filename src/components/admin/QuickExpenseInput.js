'use client';

import React, { useMemo, useState } from 'react';
import styles from '../../app/admin/admin.module.css';
import { formatCurrency, generateId } from '../../lib/utils';
import { EXPENSE_CATEGORIES } from '../../lib/constants';
import { parseExpenseText } from '../../lib/expenseParser';
import { useCart } from '../../context/CartContext';
import { useToast } from '../../hooks/useToast';

const PLACEHOLDER = `Ketik saja seperti catatan biasa, satu baris satu belanjaan. Contoh:
iklan fb 50rb
mangga 2kg 40rb, bengkoang 15rb
cup 100pcs 35.000
kemarin:
es batu 10rb
gas 3kg 22rb`;

const CATEGORY_SHORT = {
  ads_ctwa: '📣 Iklan',
  bahan_baku: '🥭 Bahan Baku',
  alat_packaging: '📦 Packaging',
  operasional: '⚡ Operasional',
  lainnya: '🗂️ Lain-lain',
};

export default function QuickExpenseInput({ compact = false }) {
  const { saveExpense } = useCart();
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
      skip: !!e.skip,
    };
  });

  const ready = rows.filter((r) => !r.skip && r.amount > 0);
  const total = ready.reduce((s, r) => s + r.amount, 0);
  const missing = rows.filter((r) => !r.skip && r.amount <= 0).length;

  const setEdit = (key, field, value) =>
    setEdits((prev) => ({ ...prev, [key]: { ...(prev[key] || {}), [field]: value } }));

  const handleTextChange = (value) => {
    setText(value);
    if (!value.trim()) setEdits({});
  };

  const handleSave = async () => {
    if (ready.length === 0) {
      addToast('Belum ada pengeluaran dengan nominal yang terbaca', 'error');
      return;
    }
    setIsSaving(true);
    let failed = 0;
    for (const r of ready) {
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
      addToast(`${failed} pengeluaran gagal tersimpan. Cek koneksi lalu coba lagi.`, 'error');
      return;
    }
    addToast(`✅ ${ready.length} pengeluaran tersimpan (${formatCurrency(total)})`, 'success');
    setText('');
    setEdits({});
  };

  return (
    <div className={styles.card} style={{ marginBottom: '24px', border: '1.5px solid #FDE68A' }}>
      <div className={styles.cardHeader} style={{ background: '#FFFBEB' }}>
        <h3>✍️ Catat Pengeluaran Cepat</h3>
        <span style={{ fontSize: '0.75rem', color: '#92400E' }}>Ketik bebas, kategori dipilah otomatis</span>
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
          Nominal bisa ditulis 50rb, 50k, 50.000, Rp 50.000, atau 1,5jt. Tanggal: tulis &quot;kemarin&quot;, &quot;2 hari lalu&quot;,
          &quot;tgl 12&quot;, atau &quot;12/11&quot; (di baris sendiri = berlaku untuk baris di bawahnya). Tanpa tanggal = hari ini.
        </div>

        {rows.length > 0 && (
          <div style={{ marginTop: '16px' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, marginBottom: '8px', color: '#334155' }}>
              Cek dulu sebelum disimpan (semua bisa diubah):
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {rows.map((r) => (
                <div
                  key={r.key}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'minmax(120px, 1.6fr) minmax(120px, 1fr) minmax(95px, 0.8fr) minmax(110px, 0.8fr) auto',
                    gap: '6px',
                    alignItems: 'center',
                    padding: '8px',
                    borderRadius: '8px',
                    background: r.skip ? '#F8FAFC' : r.amount > 0 ? '#FFFFFF' : '#FEF2F2',
                    border: `1px solid ${r.skip ? '#E2E8F0' : r.amount > 0 ? '#E2E8F0' : '#FECACA'}`,
                    opacity: r.skip ? 0.5 : 1,
                  }}
                >
                  <input
                    type="text"
                    className={styles.formInput}
                    value={r.title}
                    onChange={(e) => setEdit(r.key, 'title', e.target.value)}
                    aria-label="Keterangan"
                    style={{ padding: '6px 8px', fontSize: '0.84rem' }}
                  />
                  <select
                    className={styles.formInput}
                    value={r.category}
                    onChange={(e) => setEdit(r.key, 'category', e.target.value)}
                    aria-label="Kategori"
                    style={{ padding: '6px 8px', fontSize: '0.84rem' }}
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
                    style={{ padding: '6px 8px', fontSize: '0.8rem' }}
                  />
                  <input
                    type="number"
                    min="0"
                    inputMode="numeric"
                    className={styles.formInput}
                    value={r.amountInput}
                    onChange={(e) => setEdit(r.key, 'amount', e.target.value)}
                    placeholder="Nominal?"
                    aria-label="Jumlah"
                    style={{ padding: '6px 8px', fontSize: '0.84rem', fontWeight: 700 }}
                  />
                  <button
                    type="button"
                    className={`${styles.btn} ${styles.btnSecondary}`}
                    onClick={() => setEdit(r.key, 'skip', !r.skip)}
                    title={r.skip ? 'Masukkan lagi' : 'Jangan disimpan'}
                    style={{ padding: '6px 10px' }}
                  >
                    {r.skip ? '↩︎' : '✕'}
                  </button>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', marginTop: '14px', flexWrap: 'wrap' }}>
              <div style={{ fontSize: '0.82rem', color: '#334155' }}>
                <strong>{ready.length}</strong> pengeluaran • Total <strong style={{ color: '#DC2626' }}>{formatCurrency(total)}</strong>
                {missing > 0 && (
                  <span style={{ color: '#DC2626', marginLeft: '8px' }}>
                    ⚠️ {missing} baris belum ada nominalnya (isi atau klik ✕)
                  </span>
                )}
              </div>
              <button
                type="button"
                className={`${styles.btn} ${styles.btnPrimary}`}
                onClick={handleSave}
                disabled={isSaving || ready.length === 0}
              >
                {isSaving ? 'Menyimpan...' : `💾 Simpan ${ready.length} Pengeluaran`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
