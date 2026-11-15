'use client';

import React, { useMemo, useState } from 'react';
import styles from '../../app/admin/admin.module.css';
import { formatCurrency, formatDate } from '../../lib/utils';
import { ORDER_STATUSES } from '../../lib/constants';
import { summarize, isCountedOrder, toDateKey } from '../../lib/finance';
import QuickExpenseInput from './QuickExpenseInput';

// Tanggal lokal YYYY-MM-DD (pakai helper yang sama dengan halaman Keuangan)
const toLocalDateString = toDateKey;

function getTodayString() {
  return toLocalDateString(new Date());
}

// Simple sparkline-style mini bar chart component
function MiniBarChart({ data, color = '#059669', height = 60 }) {
  if (!data || data.length === 0) return null;
  const max = Math.max(...data.map((d) => d.value), 1);
  const barWidth = Math.max(8, Math.min(32, Math.floor(280 / data.length) - 4));

  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '3px', height, padding: '4px 0' }}>
      {data.map((d, i) => {
        const barH = Math.max(2, (d.value / max) * (height - 16));
        return (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
            <div
              title={`${d.label}: ${formatCurrency(d.value)}`}
              style={{
                width: barWidth,
                height: barH,
                background: d.isToday ? '#F59E0B' : color,
                borderRadius: '3px 3px 0 0',
                opacity: d.isToday ? 1 : 0.7,
                transition: 'height 0.3s ease',
              }}
            />
            <span style={{ fontSize: '0.55rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
              {d.shortLabel}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default function Dashboard({ orders, expenses }) {
  const today = getTodayString();

  // ===== STATS CALCULATION (rumus di src/lib/finance.js) =====
  const stats = useMemo(() => {
    const allOrders = orders || [];
    const allExpenses = expenses || [];
    const validOrders = allOrders.filter(isCountedOrder);

    // --- ALL TIME ---
    const all = summarize(allOrders, allExpenses);

    // --- TODAY ---
    const todaySum = summarize(
      allOrders.filter((o) => toLocalDateString(o.date) === today),
      allExpenses.filter((e) => toLocalDateString(e.date) === today)
    );

    // --- DAILY BREAKDOWN (last 7 days) ---
    const dailyData = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = toLocalDateString(d);
      const dayLabel = d.toLocaleDateString('id-ID', { weekday: 'short' });
      const dateLabel = d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });

      const dayOrders = validOrders.filter((o) => toLocalDateString(o.date) === dateStr);
      const dayExpenses = allExpenses.filter((e) => toLocalDateString(e.date) === dateStr);
      const daySum = summarize(dayOrders, dayExpenses);

      const productMap = {}; // { productKey: { name, emoji, size, qty, totalPrice } }
      dayOrders.forEach((o) => {
        if (Array.isArray(o.items)) {
          o.items.forEach((item) => {
            const key = `${item.name || 'Produk'}__${item.size || ''}`;
            if (!productMap[key]) {
              productMap[key] = {
                name: item.name || 'Produk',
                emoji: item.emoji || '📦',
                size: item.size || '',
                qty: 0,
                totalPrice: 0,
              };
            }
            productMap[key].qty += item.qty || 1;
            productMap[key].totalPrice += (item.price || 0) * (item.qty || 1);
          });
        }
      });

      const products = Object.values(productMap).sort((a, b) => b.qty - a.qty);

      dailyData.push({
        date: dateStr,
        label: dateLabel,
        shortLabel: dayLabel,
        revenue: daySum.revenue,
        expenses: daySum.totalExpenses,
        profit: daySum.netProfit,
        orderCount: daySum.orderCount,
        isToday: dateStr === today,
        products,
      });
    }

    return {
      // All time
      totalRevenue: all.revenue,
      totalPending: all.pendingRevenue,
      totalDiscount: all.discount,
      totalOrderCount: all.orderCount,
      adsExpense: all.adsExpense,
      totalExpenses: all.totalExpenses,
      netProfit: all.netProfit,
      margin: all.margin,
      aov: all.aov,
      roas: all.roas,
      cpa: all.cpa,
      // Today
      todayRevenue: todaySum.revenue,
      todayPending: todaySum.pendingRevenue,
      todayDiscount: todaySum.discount,
      todayOrderCount: todaySum.orderCount,
      todayExpenses: todaySum.totalExpenses,
      todayAdsExpense: todaySum.adsExpense,
      todayNetProfit: todaySum.netProfit,
      todayAov: todaySum.aov,
      todayRoas: todaySum.roas,
      todayCpa: todaySum.cpa,
      // Chart data
      dailyData,
    };
  }, [orders, expenses, today]);

  const recentOrders = (orders || []).slice(0, 8);

  // Order status count summary
  const statusCounts = useMemo(() => {
    const counts = {};
    Object.keys(ORDER_STATUSES).forEach((key) => { counts[key] = 0; });
    (orders || []).forEach((o) => { counts[o.status] = (counts[o.status] || 0) + 1; });
    return counts;
  }, [orders]);

  // Toggle between today / all-time view
  const [viewMode, setViewMode] = useState('today'); // 'today' | 'all'
  const [expandedDay, setExpandedDay] = useState(null); // date string of expanded row

  const isToday = viewMode === 'today';
  const displayRevenue = isToday ? stats.todayRevenue : stats.totalRevenue;
  const displayExpenses = isToday ? stats.todayExpenses : stats.totalExpenses;
  const displayNetProfit = isToday ? stats.todayNetProfit : stats.netProfit;
  const displayOrderCount = isToday ? stats.todayOrderCount : stats.totalOrderCount;
  const displayPending = isToday ? stats.todayPending : stats.totalPending;
  const displayDiscount = isToday ? stats.todayDiscount : stats.totalDiscount;
  const displayAds = isToday ? stats.todayAdsExpense : stats.adsExpense;
  const displayRoas = isToday ? stats.todayRoas : stats.roas;
  const displayAov = isToday ? stats.todayAov : stats.aov;
  const displayCpa = isToday ? stats.todayCpa : stats.cpa;

  // Card styles
  const metricCardStyle = {
    marginBottom: 0,
    position: 'relative',
    overflow: 'hidden',
  };

  const metricLabelStyle = {
    color: 'var(--text-secondary)',
    fontSize: '0.78rem',
    marginBottom: '6px',
    fontWeight: 600,
    letterSpacing: '0.01em',
  };

  const metricValueStyle = {
    fontSize: '1.35rem',
    fontWeight: 800,
    lineHeight: 1.2,
  };

  const metricSubStyle = {
    fontSize: '0.72rem',
    color: 'var(--text-muted)',
    marginTop: '6px',
  };

  return (
    <div>
      {/* Period Toggle */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginBottom: '18px',
        flexWrap: 'wrap',
      }}>
        <div style={{
          display: 'inline-flex',
          background: '#f1f5f9',
          borderRadius: '10px',
          padding: '3px',
          border: '1px solid var(--border)',
        }}>
          <button
            onClick={() => setViewMode('today')}
            style={{
              padding: '7px 18px',
              borderRadius: '8px',
              fontSize: '0.82rem',
              fontWeight: 700,
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              background: viewMode === 'today' ? '#059669' : 'transparent',
              color: viewMode === 'today' ? 'white' : '#64748b',
            }}
          >
            📅 Hari Ini
          </button>
          <button
            onClick={() => setViewMode('all')}
            style={{
              padding: '7px 18px',
              borderRadius: '8px',
              fontSize: '0.82rem',
              fontWeight: 700,
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              background: viewMode === 'all' ? '#059669' : 'transparent',
              color: viewMode === 'all' ? 'white' : '#64748b',
            }}
          >
            📊 Semua
          </button>
        </div>
        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
          {isToday
            ? new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
            : 'Seluruh periode data'}
        </span>
      </div>

      {/* 6 Key Performance Metric Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '14px',
          marginBottom: '24px',
        }}
      >
        {/* Omzet */}
        <div className={styles.card} style={metricCardStyle}>
          <div className={styles.cardBody}>
            <div style={metricLabelStyle}>
              📈 {isToday ? 'Omzet Hari Ini' : 'Total Omzet'}
            </div>
            <div style={{ ...metricValueStyle, color: 'var(--text-primary)' }}>
              {formatCurrency(displayRevenue)}
            </div>
            <div style={metricSubStyle}>
              {displayOrderCount} pesanan {isToday ? 'hari ini' : 'terdata'} (tanpa ongkir{displayDiscount > 0 ? `, sudah dipotong diskon ${formatCurrency(displayDiscount)}` : ''})
            </div>
            {displayPending > 0 && (
              <div style={{ ...metricSubStyle, color: '#D97706', marginTop: '2px' }}>
                ⏳ {formatCurrency(displayPending)} masih menunggu konfirmasi
              </div>
            )}
          </div>
        </div>


        {/* Total Pengeluaran */}
        <div className={styles.card} style={metricCardStyle}>
          <div className={styles.cardBody}>
            <div style={metricLabelStyle}>
              🎯 {isToday ? 'Pengeluaran Hari Ini' : 'Total Pengeluaran'}
            </div>
            <div style={{ ...metricValueStyle, color: '#DC2626' }}>
              {formatCurrency(displayExpenses)}
            </div>
            <div style={{ ...metricSubStyle, color: '#D97706' }}>
              Iklan CTWA: {formatCurrency(displayAds)}
            </div>
          </div>
        </div>

        {/* Profit Bersih = Omset - Pengeluaran */}
        <div className={styles.card} style={metricCardStyle}>
          <div className={styles.cardBody}>
            <div style={metricLabelStyle}>
              💰 {isToday ? 'Profit Bersih Hari Ini' : 'Total Profit Bersih'}
            </div>
            <div
              style={{
                ...metricValueStyle,
                color: displayNetProfit >= 0 ? '#16A34A' : '#DC2626',
              }}
            >
              {displayNetProfit < 0 ? '-' : ''}{formatCurrency(Math.abs(displayNetProfit))}
            </div>
            <div style={{ ...metricSubStyle, fontWeight: 600 }}>
              <span style={{ color: displayNetProfit >= 0 ? '#059669' : '#DC2626' }}>
                Omzet − Pengeluaran
              </span>
            </div>
          </div>
        </div>

        {/* ROAS */}
        <div className={styles.card} style={metricCardStyle}>
          <div className={styles.cardBody}>
            <div style={metricLabelStyle}>
              🎯 ROAS Iklan
            </div>
            <div style={{ ...metricValueStyle, color: '#3B82F6' }}>
              {displayRoas}x
            </div>
            <div style={metricSubStyle}>
              Omzet ÷ Biaya Iklan{displayCpa > 0 ? ` • ${formatCurrency(displayCpa)}/pesanan` : ''}
            </div>
          </div>
        </div>

        {/* AOV */}
        <div className={styles.card} style={metricCardStyle}>
          <div className={styles.cardBody}>
            <div style={metricLabelStyle}>
              📊 AOV (Avg Order)
            </div>
            <div style={{ ...metricValueStyle, color: '#8B5CF6' }}>
              {formatCurrency(displayAov)}
            </div>
            <div style={metricSubStyle}>
              Rata-rata per pesanan
            </div>
          </div>
        </div>
      </div>

      {/* Catat pengeluaran langsung dari dashboard */}
      <QuickExpenseInput compact />

      {/* Profit Formula Explanation Card */}
      <div className={styles.card} style={{ marginBottom: '24px', background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
        <div className={styles.cardBody} style={{ padding: '14px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap', fontSize: '0.82rem' }}>
            <span style={{ fontWeight: 700, color: '#166534' }}>💡 Rumus Profit Bersih:</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{
                background: '#dcfce7', padding: '4px 10px', borderRadius: '6px', fontWeight: 700, color: '#14532d',
              }}>
                {formatCurrency(displayRevenue)}
              </span>
              <span style={{ fontWeight: 800, color: '#64748b' }}>−</span>
              <span style={{
                background: '#fee2e2', padding: '4px 10px', borderRadius: '6px', fontWeight: 700, color: '#7f1d1d',
              }}>
                {formatCurrency(displayExpenses)}
              </span>
              <span style={{ fontWeight: 800, color: '#64748b' }}>=</span>
              <span style={{
                background: displayNetProfit >= 0 ? '#dcfce7' : '#fee2e2',
                padding: '4px 10px',
                borderRadius: '6px',
                fontWeight: 800,
                color: displayNetProfit >= 0 ? '#14532d' : '#7f1d1d',
              }}>
                {displayNetProfit < 0 ? '-' : ''}{formatCurrency(Math.abs(displayNetProfit))}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 7-Day Revenue Chart */}
      <div className={styles.card} style={{ marginBottom: '24px' }}>
        <div className={styles.cardHeader}>
          <h3>📊 Omzet & Detail Produk 7 Hari Terakhir</h3>
        </div>
        <div className={styles.cardBody}>
          <MiniBarChart
            data={stats.dailyData.map((d) => ({
              value: d.revenue,
              label: d.label,
              shortLabel: d.shortLabel,
              isToday: d.isToday,
            }))}
            color="#059669"
            height={80}
          />
          {/* Daily breakdown table */}
          <div style={{ marginTop: '16px', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border)' }}>
                  <th style={{ textAlign: 'left', padding: '6px 8px', color: '#64748b', fontWeight: 700 }}>Tanggal</th>
                  <th style={{ textAlign: 'right', padding: '6px 8px', color: '#64748b', fontWeight: 700 }}>Pesanan</th>
                  <th style={{ textAlign: 'right', padding: '6px 8px', color: '#64748b', fontWeight: 700 }}>Omzet</th>
                  <th style={{ textAlign: 'right', padding: '6px 8px', color: '#64748b', fontWeight: 700 }}>Pengeluaran</th>
                  <th style={{ textAlign: 'right', padding: '6px 8px', color: '#64748b', fontWeight: 700 }}>Profit</th>
                </tr>
              </thead>
              <tbody>
                {stats.dailyData.map((d) => {
                  const isExpanded = expandedDay === d.date;
                  const hasProducts = d.products && d.products.length > 0;
                  return (
                    <React.Fragment key={d.date}>
                      <tr
                        onClick={() => hasProducts && setExpandedDay(isExpanded ? null : d.date)}
                        style={{
                          borderBottom: isExpanded ? 'none' : '1px solid var(--border)',
                          background: d.isToday ? '#f0fdf4' : 'transparent',
                          cursor: hasProducts ? 'pointer' : 'default',
                          transition: 'background 0.15s ease',
                        }}
                        onMouseEnter={(e) => { if (hasProducts) e.currentTarget.style.background = d.isToday ? '#dcfce7' : '#f8fafc'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = d.isToday ? '#f0fdf4' : 'transparent'; }}
                      >
                        <td style={{ padding: '8px', fontWeight: d.isToday ? 700 : 500 }}>
                          <span style={{ marginRight: '6px', fontSize: '0.7rem', color: '#94a3b8', display: 'inline-block', width: '12px' }}>
                            {hasProducts ? (isExpanded ? '▼' : '▶') : ''}
                          </span>
                          {d.label} {d.isToday && <span style={{ fontSize: '0.68rem', background: '#059669', color: 'white', padding: '2px 6px', borderRadius: '4px', marginLeft: '4px' }}>Hari ini</span>}
                        </td>
                        <td style={{ textAlign: 'right', padding: '8px', fontWeight: 600 }}>
                          {d.orderCount}
                        </td>
                        <td style={{ textAlign: 'right', padding: '8px', fontWeight: 700, color: '#0f172a' }}>
                          {formatCurrency(d.revenue)}
                        </td>
                        <td style={{ textAlign: 'right', padding: '8px', color: '#DC2626', fontWeight: 600 }}>
                          {d.expenses > 0 ? formatCurrency(d.expenses) : '-'}
                        </td>
                        <td style={{
                          textAlign: 'right',
                          padding: '8px',
                          fontWeight: 700,
                          color: d.profit >= 0 ? '#16A34A' : '#DC2626',
                        }}>
                          {d.profit < 0 ? '-' : ''}{formatCurrency(Math.abs(d.profit))}
                        </td>
                      </tr>
                      {/* Expanded product detail row */}
                      {isExpanded && hasProducts && (
                        <tr>
                          <td colSpan="5" style={{ padding: '0 8px 12px 28px', background: d.isToday ? '#f0fdf4' : '#f8fafc', borderBottom: '1px solid var(--border)' }}>
                            <div style={{
                              display: 'grid',
                              gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                              gap: '8px',
                              paddingTop: '4px',
                            }}>
                              {d.products.map((p, idx) => (
                                <div
                                  key={idx}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px',
                                    padding: '8px 12px',
                                    background: '#ffffff',
                                    borderRadius: '8px',
                                    border: '1px solid var(--border)',
                                    boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                                  }}
                                >
                                  <span style={{ fontSize: '1.3rem' }}>{p.emoji}</span>
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontWeight: 700, fontSize: '0.78rem', color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                      {p.name}
                                    </div>
                                    {p.size && (
                                      <div style={{ fontSize: '0.68rem', color: '#64748b' }}>
                                        {p.size}
                                      </div>
                                    )}
                                  </div>
                                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                    <div style={{ fontWeight: 800, fontSize: '0.82rem', color: '#059669' }}>
                                      {p.qty}x
                                    </div>
                                    <div style={{ fontSize: '0.68rem', color: '#64748b' }}>
                                      {formatCurrency(p.totalPrice)}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Order Status Overview */}
      <div className={styles.card} style={{ marginBottom: '24px' }}>
        <div className={styles.cardHeader}>
          <h3>📊 Status Pesanan Ringkasan</h3>
        </div>
        <div className={styles.cardBody}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
            {Object.entries(ORDER_STATUSES).map(([key, data]) => (
              <div
                key={key}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 14px',
                  borderRadius: '8px',
                  background: data.color + '15',
                  border: `1px solid ${data.color}33`,
                  minWidth: '140px',
                }}
              >
                <span style={{ fontSize: '1.4rem', fontWeight: 800, color: data.color }}>
                  {statusCounts[key] || 0}
                </span>
                <span style={{ fontSize: '0.78rem', color: '#475569' }}>
                  {data.label.replace(/^[^\s]+\s/, '')}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Orders Table */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h3>📋 Pesanan CTWA Terbaru Masuk</h3>
        </div>
        <div className={styles.cardBody} style={{ padding: 0 }}>
          <div className={styles.tableResponsive}>
            <table className={styles.dataTable}>
              <thead>
                <tr>
                  <th>ID Pesanan</th>
                  <th>Customer</th>
                  <th>Nominal</th>
                  <th>Metode Bayar</th>
                  <th>Status</th>
                  <th>Tanggal</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                      Belum ada pesanan masuk. Pesanan dari form checkout CTWA akan otomatis muncul di sini.
                    </td>
                  </tr>
                ) : (
                  recentOrders.map((order) => (
                    <tr key={order.id}>
                      <td style={{ color: '#059669', fontWeight: 700 }}>#{order.id}</td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{order.customer}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{order.phone}</div>
                      </td>
                      <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                        {formatCurrency(order.total || order.subtotal || 0)}
                      </td>
                      <td>
                        <span style={{ fontSize: '0.8rem', textTransform: 'uppercase' }}>
                          {order.paymentMethod === 'qris'
                            ? '📱 QRIS'
                            : order.paymentMethod === 'transfer'
                            ? `🏦 Transfer (${order.paymentBank || 'BCA'})`
                            : '🤝 COD'}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`${styles.statusBadge} ${
                            styles[
                              'status' +
                                (order.status.charAt(0).toUpperCase() + order.status.slice(1))
                            ] || styles.statusPending
                          }`}
                        >
                          {ORDER_STATUSES[order.status]?.label || order.status}
                        </span>
                      </td>
                      <td>{formatDate(order.date)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
