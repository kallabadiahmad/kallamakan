'use client';

import React, { useMemo } from 'react';
import styles from '../../app/admin/admin.module.css';
import { formatCurrency, formatDate } from '../../lib/utils';
import { ORDER_STATUSES } from '../../lib/constants';

export default function Dashboard({ orders, expenses }) {
  const stats = useMemo(() => {
    const validOrders = (orders || []).filter((o) => o.status !== 'cancelled');

    let revenue = 0;
    let totalHPP = 0;
    let orderCount = validOrders.length;
    let totalExpenses = 0;
    let adsExpense = 0;

    validOrders.forEach((order) => {
      const orderAmount = order.subtotal || order.total || 0;
      revenue += orderAmount;

      // Accurate HPP: use stored totalHPP, then items hpp, last resort 50%
      if (order.totalHPP && order.totalHPP > 0) {
        totalHPP += order.totalHPP;
      } else if (Array.isArray(order.items)) {
        const itemsHPP = order.items.reduce((s, item) => s + ((item.hpp || 0) * (item.qty || 1)), 0);
        if (itemsHPP > 0) {
          totalHPP += itemsHPP;
        } else {
          totalHPP += Math.round(orderAmount * 0.5);
        }
      } else {
        totalHPP += Math.round(orderAmount * 0.5);
      }
    });

    (expenses || []).forEach((exp) => {
      const amt = Number(exp.amount || 0);
      totalExpenses += amt;
      if (exp.category === 'ads_ctwa') {
        adsExpense += amt;
      }
    });

    const grossProfit = Math.max(0, revenue - totalHPP);
    const netProfit = grossProfit - totalExpenses;
    const margin = revenue > 0 ? ((netProfit / revenue) * 100).toFixed(1) : 0;

    // AOV & ROAS
    const aov = orderCount > 0 ? Math.round(revenue / orderCount) : 0;
    const avgProfitPerOrder = orderCount > 0 ? Math.round(netProfit / orderCount) : 0;
    const roas = adsExpense > 0 ? (revenue / adsExpense).toFixed(2) : '∞';

    return {
      revenue,
      totalHPP,
      grossProfit,
      orderCount,
      adsExpense,
      totalExpenses,
      netProfit,
      margin,
      aov,
      avgProfitPerOrder,
      roas,
    };
  }, [orders, expenses]);

  const recentOrders = (orders || []).slice(0, 8);

  // Order status count summary
  const statusCounts = useMemo(() => {
    const counts = {};
    Object.keys(ORDER_STATUSES).forEach((key) => { counts[key] = 0; });
    (orders || []).forEach((o) => { counts[o.status] = (counts[o.status] || 0) + 1; });
    return counts;
  }, [orders]);

  return (
    <div>
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
        <div className={styles.card} style={{ marginBottom: 0 }}>
          <div className={styles.cardBody}>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', marginBottom: '4px' }}>
              📈 Total Omzet
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              {formatCurrency(stats.revenue)}
            </div>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              {stats.orderCount} pesanan terdata
            </div>
          </div>
        </div>

        {/* Laba Kotor */}
        <div className={styles.card} style={{ marginBottom: 0 }}>
          <div className={styles.cardBody}>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', marginBottom: '4px' }}>
              📦 Laba Kotor
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#059669' }}>
              {formatCurrency(stats.grossProfit)}
            </div>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              HPP: {formatCurrency(stats.totalHPP)}
            </div>
          </div>
        </div>

        {/* Biaya Iklan & Operasional */}
        <div className={styles.card} style={{ marginBottom: 0 }}>
          <div className={styles.cardBody}>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', marginBottom: '4px' }}>
              🎯 Total Pengeluaran
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#DC2626' }}>
              {formatCurrency(stats.totalExpenses)}
            </div>
            <div style={{ fontSize: '0.74rem', color: '#D97706', marginTop: '4px' }}>
              Iklan CTWA: {formatCurrency(stats.adsExpense)}
            </div>
          </div>
        </div>

        {/* Laba Bersih */}
        <div className={styles.card} style={{ marginBottom: 0 }}>
          <div className={styles.cardBody}>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', marginBottom: '4px' }}>
              💰 Laba Bersih
            </div>
            <div
              style={{
                fontSize: '1.4rem',
                fontWeight: 800,
                color: stats.netProfit >= 0 ? '#16A34A' : '#DC2626',
              }}
            >
              {formatCurrency(stats.netProfit)}
            </div>
            <div style={{ fontSize: '0.74rem', color: '#059669', marginTop: '4px', fontWeight: 700 }}>
              Margin: {stats.margin}%
            </div>
          </div>
        </div>

        {/* ROAS */}
        <div className={styles.card} style={{ marginBottom: 0 }}>
          <div className={styles.cardBody}>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', marginBottom: '4px' }}>
              🎯 ROAS Iklan
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#3B82F6' }}>
              {stats.roas}x
            </div>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              Revenue / Biaya Iklan
            </div>
          </div>
        </div>

        {/* AOV */}
        <div className={styles.card} style={{ marginBottom: 0 }}>
          <div className={styles.cardBody}>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', marginBottom: '4px' }}>
              📊 AOV (Avg Order)
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#8B5CF6' }}>
              {formatCurrency(stats.aov)}
            </div>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              Profit/order: {formatCurrency(stats.avgProfitPerOrder)}
            </div>
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
