'use client';

import React, { useState, useMemo } from 'react';
import styles from '../../app/admin/admin.module.css';
import Modal from './Modal';
import { formatCurrency, formatDate, generateId } from '../../lib/utils';
import { EXPENSE_CATEGORIES } from '../../lib/constants';
import { useToast } from '../../hooks/useToast';
import { useCart } from '../../context/CartContext';

export default function FinanceManager() {
  const { orders, expenses, saveExpense, deleteExpense: removeExpense } = useCart();
  const [period, setPeriod] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const { addToast } = useToast();

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    category: 'ads_ctwa',
    desc: '',
    amount: '',
  });

  // ─── Period filter ───
  const filterDataByPeriod = (data, dateField) => {
    const now = new Date();
    return (data || []).filter((item) => {
      if (!item || !item[dateField]) return false;
      const d = new Date(item[dateField]);
      if (period === 'today') return d.toDateString() === now.toDateString();
      if (period === 'week') {
        const pastWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
        return d >= pastWeek;
      }
      if (period === 'month') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      if (period === 'year') return d.getFullYear() === now.getFullYear();
      return true; // all
    });
  };

  const validOrders = (orders || []).filter((o) => o.status !== 'cancelled');
  const filteredOrders = filterDataByPeriod(validOrders, 'date');
  const filteredExpenses = filterDataByPeriod(expenses || [], 'date');

  // Search filter on expenses
  const searchedExpenses = filteredExpenses.filter((e) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const catLabel = (EXPENSE_CATEGORIES[e.category] || e.category || '').toLowerCase();
    const desc = (e.desc || '').toLowerCase();
    return catLabel.includes(q) || desc.includes(q);
  });

  // ─── Revenue & P&L Metrics ───
  const metrics = useMemo(() => {
    const totalRevenue = filteredOrders.reduce((sum, o) => sum + (o.subtotal || o.total || 0), 0);
    const totalHPP = filteredOrders.reduce((sum, o) => {
      if (o.totalHPP && o.totalHPP > 0) return sum + o.totalHPP;
      if (Array.isArray(o.items)) {
        const itemsHPP = o.items.reduce((s, item) => s + ((item.hpp || 0) * (item.qty || 1)), 0);
        if (itemsHPP > 0) return sum + itemsHPP;
      }
      return sum + Math.round((o.subtotal || o.total || 0) * 0.5);
    }, 0);
    const grossProfit = Math.max(0, totalRevenue - totalHPP);

    const expenseByCategory = {};
    Object.keys(EXPENSE_CATEGORIES).forEach((key) => {
      expenseByCategory[key] = 0;
    });
    filteredExpenses.forEach((e) => {
      const cat = e.category || 'lainnya';
      expenseByCategory[cat] = (expenseByCategory[cat] || 0) + Number(e.amount || 0);
    });

    const adsExpense = expenseByCategory['ads_ctwa'] || 0;
    const totalExpenses = Object.values(expenseByCategory).reduce((s, v) => s + v, 0);
    const operationalExpense = totalExpenses - adsExpense;

    const netProfit = grossProfit - totalExpenses;
    const profitMargin = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : '0.0';

    const orderCount = filteredOrders.length;
    const aov = orderCount > 0 ? Math.round(totalRevenue / orderCount) : 0;
    const avgProfitPerOrder = orderCount > 0 ? Math.round(netProfit / orderCount) : 0;
    const roas = adsExpense > 0 ? (totalRevenue / adsExpense).toFixed(2) : '∞';

    return {
      totalRevenue,
      totalHPP,
      grossProfit,
      adsExpense,
      operationalExpense,
      totalExpenses,
      netProfit,
      profitMargin,
      orderCount,
      aov,
      avgProfitPerOrder,
      roas,
      expenseByCategory,
    };
  }, [filteredOrders, filteredExpenses]);

  // ─── Expense CRUD ───
  const openAddModal = () => {
    setEditingExpense(null);
    setFormData({
      date: new Date().toISOString().split('T')[0],
      category: 'ads_ctwa',
      desc: '',
      amount: '',
    });
    setIsModalOpen(true);
  };

  const openEditModal = (expense) => {
    setEditingExpense(expense);
    setFormData({
      date: expense.date || new Date().toISOString().split('T')[0],
      category: expense.category || 'ads_ctwa',
      desc: expense.desc || '',
      amount: String(expense.amount || ''),
    });
    setIsModalOpen(true);
  };

  const handleSaveExpense = (e) => {
    e.preventDefault();
    if (!formData.amount || Number(formData.amount) <= 0) {
      addToast('Jumlah pengeluaran harus lebih dari 0', 'error');
      return;
    }

    const expensePayload = {
      id: editingExpense ? editingExpense.id : generateId('exp'),
      date: formData.date,
      category: formData.category,
      desc: formData.desc,
      title: formData.desc || EXPENSE_CATEGORIES[formData.category] || 'Pengeluaran',
      amount: parseInt(formData.amount, 10),
    };

    saveExpense(expensePayload);
    if (editingExpense) {
      addToast('Pengeluaran berhasil diperbarui', 'success');
    } else {
      addToast('Pengeluaran berhasil dicatat', 'success');
    }

    setIsModalOpen(false);
    setEditingExpense(null);
    setFormData({ date: new Date().toISOString().split('T')[0], category: 'ads_ctwa', desc: '', amount: '' });
  };

  const handleDeleteExpense = (id) => {
    if (window.confirm('Hapus catatan pengeluaran ini?')) {
      removeExpense(id);
      addToast('Pengeluaran dihapus', 'success');
    }
  };

  // ─── Export CSV ───
  const exportCSV = () => {
    let csv = 'Tanggal,Tipe,Kategori/Customer,Jumlah (Rp),Keterangan\n';
    filteredOrders.forEach((o) => {
      csv += `${formatDate(o.date)},Pemasukan Order,${o.customer},${o.total || o.subtotal},"${o.id} - ${o.paymentMethod}"\n`;
    });
    filteredExpenses.forEach((e) => {
      csv += `${formatDate(e.date)},Pengeluaran,${EXPENSE_CATEGORIES[e.category] || e.category},-${e.amount},"${e.desc || ''}"\n`;
    });

    csv += `\nLAPORAN LABA RUGI\n`;
    csv += `Omzet Penjualan,,${metrics.totalRevenue}\n`;
    csv += `HPP / Modal Buah,,${metrics.totalHPP}\n`;
    csv += `Laba Kotor,,${metrics.grossProfit}\n`;
    csv += `Total Pengeluaran,,${metrics.totalExpenses}\n`;
    csv += `Laba Bersih,,${metrics.netProfit}\n`;
    csv += `Profit Margin,,${metrics.profitMargin}%\n`;
    csv += `ROAS,,${metrics.roas}x\n`;

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Laporan_Keuangan_KallaMakan_${period}.csv`;
    link.click();
    addToast('Laporan keuangan berhasil diunduh ke CSV', 'success');
  };

  const categoryColors = {
    ads_ctwa: '#3B82F6',
    bahan_baku: '#F59E0B',
    alat_packaging: '#8B5CF6',
    operasional: '#EF4444',
    lainnya: '#6B7280',
  };

  return (
    <div>
      {/* Top Actions & Period Filter */}
      <div className={styles.pageActions}>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={openAddModal}>
            + Catat Pengeluaran
          </button>
          <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={exportCSV}>
            📥 Export CSV
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label className={styles.formLabel} style={{ marginBottom: 0 }}>
            Periode:
          </label>
          <select
            className={styles.formInput}
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            style={{ width: 'auto' }}
          >
            <option value="all">Semua Waktu</option>
            <option value="today">Hari Ini</option>
            <option value="week">7 Hari Terakhir</option>
            <option value="month">Bulan Ini</option>
            <option value="year">Tahun Ini</option>
          </select>
        </div>
      </div>

      {/* ═══ FINANCIAL SUMMARY CARDS ═══ */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '14px',
          marginBottom: '24px',
        }}
      >
        <div className={styles.card} style={{ marginBottom: 0 }}>
          <div className={styles.cardBody} style={{ padding: '16px' }}>
            <div style={{ color: '#64748B', fontSize: '0.78rem', marginBottom: '4px' }}>📈 Omzet Penjualan</div>
            <div style={{ fontSize: '1.3rem', fontWeight: 800 }}>{formatCurrency(metrics.totalRevenue)}</div>
            <div style={{ fontSize: '0.72rem', color: '#94A3B8', marginTop: '3px' }}>
              {metrics.orderCount} pesanan • AOV {formatCurrency(metrics.aov)}
            </div>
          </div>
        </div>

        <div className={styles.card} style={{ marginBottom: 0 }}>
          <div className={styles.cardBody} style={{ padding: '16px' }}>
            <div style={{ color: '#64748B', fontSize: '0.78rem', marginBottom: '4px' }}>📦 HPP / Modal Buah</div>
            <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#64748B' }}>{formatCurrency(metrics.totalHPP)}</div>
            <div style={{ fontSize: '0.72rem', color: '#94A3B8', marginTop: '3px' }}>
              Laba Kotor: {formatCurrency(metrics.grossProfit)}
            </div>
          </div>
        </div>

        <div className={styles.card} style={{ marginBottom: 0 }}>
          <div className={styles.cardBody} style={{ padding: '16px' }}>
            <div style={{ color: '#64748B', fontSize: '0.78rem', marginBottom: '4px' }}>📉 Total Pengeluaran</div>
            <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#DC2626' }}>{formatCurrency(metrics.totalExpenses)}</div>
            <div style={{ fontSize: '0.72rem', color: '#D97706', marginTop: '3px' }}>
              Iklan: {formatCurrency(metrics.adsExpense)} • Ops: {formatCurrency(metrics.operationalExpense)}
            </div>
          </div>
        </div>

        <div className={styles.card} style={{ marginBottom: 0 }}>
          <div className={styles.cardBody} style={{ padding: '16px' }}>
            <div style={{ color: '#64748B', fontSize: '0.78rem', marginBottom: '4px' }}>💰 Laba Bersih</div>
            <div style={{ fontSize: '1.3rem', fontWeight: 800, color: metrics.netProfit >= 0 ? '#16A34A' : '#DC2626' }}>
              {formatCurrency(metrics.netProfit)}
            </div>
            <div style={{ fontSize: '0.72rem', color: '#059669', marginTop: '3px', fontWeight: 700 }}>
              Margin: {metrics.profitMargin}%
            </div>
          </div>
        </div>

        <div className={styles.card} style={{ marginBottom: 0 }}>
          <div className={styles.cardBody} style={{ padding: '16px' }}>
            <div style={{ color: '#64748B', fontSize: '0.78rem', marginBottom: '4px' }}>🎯 ROAS (Iklan CTWA)</div>
            <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#3B82F6' }}>{metrics.roas}x</div>
            <div style={{ fontSize: '0.72rem', color: '#94A3B8', marginTop: '3px' }}>
              Revenue / Biaya Iklan
            </div>
          </div>
        </div>

        <div className={styles.card} style={{ marginBottom: 0 }}>
          <div className={styles.cardBody} style={{ padding: '16px' }}>
            <div style={{ color: '#64748B', fontSize: '0.78rem', marginBottom: '4px' }}>📊 Avg Profit/Order</div>
            <div style={{ fontSize: '1.3rem', fontWeight: 800, color: metrics.avgProfitPerOrder >= 0 ? '#059669' : '#DC2626' }}>
              {formatCurrency(metrics.avgProfitPerOrder)}
            </div>
            <div style={{ fontSize: '0.72rem', color: '#94A3B8', marginTop: '3px' }}>
              per pesanan setelah biaya
            </div>
          </div>
        </div>
      </div>

      {/* ═══ LAPORAN LABA RUGI (P&L STATEMENT) ═══ */}
      <div className={styles.card} style={{ marginBottom: '24px' }}>
        <div className={styles.cardHeader}>
          <h3>📑 Laporan Laba Rugi</h3>
          <span style={{ fontSize: '0.78rem', color: '#64748B' }}>
            {period === 'all' ? 'Semua Waktu' : period === 'today' ? 'Hari Ini' : period === 'week' ? '7 Hari Terakhir' : period === 'month' ? 'Bulan Ini' : 'Tahun Ini'}
          </span>
        </div>
        <div className={styles.cardBody} style={{ padding: '0' }}>
          <table className={styles.dataTable} style={{ whiteSpace: 'normal' }}>
            <tbody>
              <tr>
                <td style={{ fontWeight: 700, color: '#0F172A', paddingLeft: '20px' }}>📈 Pendapatan / Omzet Penjualan</td>
                <td style={{ textAlign: 'right', fontWeight: 700, color: '#16A34A', paddingRight: '20px' }}>
                  {formatCurrency(metrics.totalRevenue)}
                </td>
              </tr>
              <tr>
                <td style={{ color: '#64748B', paddingLeft: '36px' }}>(-) HPP / Modal Bahan Buah</td>
                <td style={{ textAlign: 'right', color: '#DC2626', paddingRight: '20px' }}>
                  ({formatCurrency(metrics.totalHPP)})
                </td>
              </tr>
              <tr style={{ background: '#F0FDF4' }}>
                <td style={{ fontWeight: 800, color: '#059669', paddingLeft: '20px', borderTop: '2px solid #BBF7D0' }}>
                  = Laba Kotor (Gross Profit)
                </td>
                <td style={{ textAlign: 'right', fontWeight: 800, color: '#059669', paddingRight: '20px', borderTop: '2px solid #BBF7D0' }}>
                  {formatCurrency(metrics.grossProfit)}
                </td>
              </tr>
              <tr>
                <td style={{ color: '#64748B', paddingLeft: '36px' }}>(-) Biaya Iklan CTWA (Meta/TikTok)</td>
                <td style={{ textAlign: 'right', color: '#DC2626', paddingRight: '20px' }}>
                  ({formatCurrency(metrics.adsExpense)})
                </td>
              </tr>
              {Object.entries(EXPENSE_CATEGORIES).filter(([key]) => key !== 'ads_ctwa').map(([key, label]) => (
                <tr key={key}>
                  <td style={{ color: '#94A3B8', paddingLeft: '52px', fontSize: '0.85rem' }}>
                    (-) {label}
                  </td>
                  <td style={{ textAlign: 'right', color: '#94A3B8', paddingRight: '20px', fontSize: '0.85rem' }}>
                    ({formatCurrency(metrics.expenseByCategory[key] || 0)})
                  </td>
                </tr>
              ))}
              <tr style={{ background: metrics.netProfit >= 0 ? '#F0FDF4' : '#FEF2F2' }}>
                <td style={{ fontWeight: 800, fontSize: '1.05rem', color: metrics.netProfit >= 0 ? '#16A34A' : '#DC2626', paddingLeft: '20px', borderTop: '3px double #CBD5E1' }}>
                  💰 LABA BERSIH (Net Profit)
                </td>
                <td style={{ textAlign: 'right', fontWeight: 800, fontSize: '1.05rem', color: metrics.netProfit >= 0 ? '#16A34A' : '#DC2626', paddingRight: '20px', borderTop: '3px double #CBD5E1' }}>
                  {formatCurrency(metrics.netProfit)}
                </td>
              </tr>
              <tr>
                <td style={{ color: '#64748B', paddingLeft: '20px', fontSize: '0.82rem' }}>Profit Margin</td>
                <td style={{ textAlign: 'right', paddingRight: '20px', fontWeight: 700, color: '#059669' }}>
                  {metrics.profitMargin}%
                </td>
              </tr>
              <tr>
                <td style={{ color: '#64748B', paddingLeft: '20px', fontSize: '0.82rem' }}>ROAS (Return on Ad Spend)</td>
                <td style={{ textAlign: 'right', paddingRight: '20px', fontWeight: 700, color: '#3B82F6' }}>
                  {metrics.roas}x
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ═══ BREAKDOWN PENGELUARAN PER KATEGORI ═══ */}
      <div className={styles.card} style={{ marginBottom: '24px' }}>
        <div className={styles.cardHeader}>
          <h3>📊 Breakdown Pengeluaran per Kategori</h3>
        </div>
        <div className={styles.cardBody}>
          {metrics.totalExpenses === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px', color: '#94A3B8' }}>
              Belum ada data pengeluaran untuk periode ini
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {Object.entries(EXPENSE_CATEGORIES).map(([key, label]) => {
                const amount = metrics.expenseByCategory[key] || 0;
                const percentage = metrics.totalExpenses > 0 ? ((amount / metrics.totalExpenses) * 100).toFixed(1) : 0;
                const color = categoryColors[key] || '#6B7280';

                return (
                  <div key={key}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.84rem' }}>
                      <span style={{ color: '#334155', fontWeight: 600 }}>{label}</span>
                      <span style={{ fontWeight: 700, color }}>
                        {formatCurrency(amount)} ({percentage}%)
                      </span>
                    </div>
                    <div style={{ background: '#F1F5F9', borderRadius: '6px', height: '10px', overflow: 'hidden' }}>
                      <div
                        style={{
                          width: `${percentage}%`,
                          height: '100%',
                          background: color,
                          borderRadius: '6px',
                          transition: 'width 0.5s ease',
                          minWidth: amount > 0 ? '4px' : '0',
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ═══ CASHFLOW TABLES ═══ */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '20px' }}>
        {/* Arus Kas Masuk */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h3>📥 Pemasukan Order Pembeli</h3>
          </div>
          <div className={styles.cardBody} style={{ padding: 0 }}>
            <div className={styles.tableResponsive}>
              <table className={styles.dataTable}>
                <thead>
                  <tr>
                    <th>Waktu / Order</th>
                    <th>Customer</th>
                    <th>Nominal</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.length === 0 ? (
                    <tr>
                      <td colSpan="3" style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                        Belum ada pemasukan order
                      </td>
                    </tr>
                  ) : (
                    filteredOrders.map((o) => (
                      <tr key={o.id}>
                        <td>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>#{o.id}</div>
                          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>{formatDate(o.date)}</div>
                        </td>
                        <td>
                          <div>{o.customer}</div>
                          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                            {o.paymentMethod?.toUpperCase()}
                          </div>
                        </td>
                        <td style={{ color: '#16A34A', fontWeight: 700 }}>
                          +{formatCurrency(o.total || o.subtotal || 0)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Arus Kas Keluar */}
        <div className={styles.card}>
          <div className={styles.cardHeader} style={{ flexWrap: 'wrap', gap: '10px' }}>
            <h3>📤 Pengeluaran & Biaya</h3>
            <input
              type="text"
              className={styles.formInput}
              placeholder="🔍 Cari pengeluaran..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: '200px', padding: '6px 12px', fontSize: '0.82rem' }}
            />
          </div>
          <div className={styles.cardBody} style={{ padding: 0 }}>
            <div className={styles.tableResponsive}>
              <table className={styles.dataTable}>
                <thead>
                  <tr>
                    <th>Tanggal</th>
                    <th>Kategori & Keterangan</th>
                    <th>Jumlah</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {searchedExpenses.length === 0 ? (
                    <tr>
                      <td colSpan="4" style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                        {searchQuery ? 'Tidak ditemukan pengeluaran yang cocok' : 'Belum ada data pengeluaran'}
                      </td>
                    </tr>
                  ) : (
                    searchedExpenses.map((e) => (
                      <tr key={e.id}>
                        <td>{formatDate(e.date)}</td>
                        <td>
                          <div style={{ fontWeight: 600, fontSize: '0.86rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span
                              style={{
                                display: 'inline-block',
                                width: '8px',
                                height: '8px',
                                borderRadius: '50%',
                                background: categoryColors[e.category] || '#6B7280',
                                flexShrink: 0,
                              }}
                            />
                            {EXPENSE_CATEGORIES[e.category] || e.category}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginLeft: '14px' }}>{e.desc}</div>
                        </td>
                        <td style={{ color: '#DC2626', fontWeight: 700 }}>-{formatCurrency(e.amount)}</td>
                        <td>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button
                              className={`${styles.btn} ${styles.btnSecondary}`}
                              style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                              onClick={() => openEditModal(e)}
                              title="Edit"
                            >
                              ✏️
                            </button>
                            <button
                              className={`${styles.btn} ${styles.btnDanger}`}
                              style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                              onClick={() => handleDeleteExpense(e.id)}
                              title="Hapus"
                            >
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ MODAL TAMBAH/EDIT PENGELUARAN ═══ */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingExpense(null); }}
        title={editingExpense ? 'Edit Pengeluaran' : 'Catat Pengeluaran Baru'}
      >
        <form onSubmit={handleSaveExpense}>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Tanggal Pengeluaran</label>
            <input
              type="date"
              className={styles.formInput}
              required
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Kategori Biaya</label>
            <select
              className={styles.formInput}
              required
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            >
              {Object.entries(EXPENSE_CATEGORIES).map(([val, label]) => (
                <option key={val} value={val}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Keterangan / Detail</label>
            <input
              type="text"
              className={styles.formInput}
              required
              value={formData.desc}
              onChange={(e) => setFormData({ ...formData, desc: e.target.value })}
              placeholder="Contoh: Topup Saldo Iklan Facebook Ads CTWA"
            />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Jumlah Biaya (Rp)</label>
            <input
              type="number"
              className={styles.formInput}
              required
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              placeholder="100000"
              min="1000"
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
            <button
              type="button"
              className={`${styles.btn} ${styles.btnSecondary}`}
              onClick={() => { setIsModalOpen(false); setEditingExpense(null); }}
            >
              Batal
            </button>
            <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`}>
              {editingExpense ? '💾 Update Pengeluaran' : '💾 Simpan Pengeluaran'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
