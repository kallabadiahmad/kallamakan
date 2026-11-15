'use client';

import React, { useState, useEffect } from 'react';
import styles from './admin.module.css';
import LoginScreen from '../../components/admin/LoginScreen';
import Sidebar from '../../components/admin/Sidebar';
import Dashboard from '../../components/admin/Dashboard';
import ProductsManager from '../../components/admin/ProductsManager';
import OrdersManager from '../../components/admin/OrdersManager';
import FinanceManager from '../../components/admin/FinanceManager';
import SettingsPanel from '../../components/admin/SettingsPanel';
import Toast from '../../components/Toast';
import { useToast } from '../../hooks/useToast';
import { CONFIG } from '../../lib/constants';
import { useCart } from '../../context/CartContext';

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const { toasts, addToast, removeToast } = useToast();
  const { orders, expenses, refreshAllData } = useCart();

  useEffect(() => {
    // Cek sesi ke server (cookie httpOnly yang ditandatangani)
    let cancelled = false;
    fetch('/api/auth/session', { cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        if (data?.authenticated) {
          setIsAuthenticated(true);
          refreshAllData();
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setIsCheckingSession(false);
      });

    // Bersihkan penanda login versi lama
    try {
      localStorage.removeItem(CONFIG.STORAGE_KEYS.session);
      localStorage.removeItem(CONFIG.STORAGE_KEYS.password);
    } catch {
      // abaikan
    }

    document.body.style.background = 'var(--bg-body)';
    return () => {
      cancelled = true;
      document.body.style.background = ''; // reset on unmount
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Kalau sesi habis saat sedang dipakai, kembali ke layar login
  useEffect(() => {
    if (!isAuthenticated) return undefined;
    const onUnauthorized = () => {
      setIsAuthenticated(false);
      addToast('Sesi admin habis, silakan login ulang', 'warning');
    };
    window.addEventListener('kalla:unauthorized', onUnauthorized, { once: true });
    return () => window.removeEventListener('kalla:unauthorized', onUnauthorized);
  }, [isAuthenticated, addToast]);

  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
    refreshAllData();
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // abaikan
    }
    setIsAuthenticated(false);
    addToast('Anda telah logout', 'warning');
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard orders={orders} expenses={expenses} />;
      case 'products':
        return <ProductsManager />;
      case 'orders':
        return <OrdersManager />;
      case 'finance':
        return <FinanceManager />;
      case 'settings':
        return <SettingsPanel />;
      default:
        return <Dashboard orders={orders} expenses={expenses} />;
    }
  };

  if (isCheckingSession) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
        Memeriksa sesi admin...
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <>
        <Toast toasts={toasts} removeToast={removeToast} />
        <LoginScreen onLoginSuccess={handleLoginSuccess} />
      </>
    );
  }

  const getPageTitle = () => {
    const titles = {
      dashboard: 'Dashboard',
      products: 'Manajemen Produk',
      orders: 'Manajemen Order',
      finance: 'Pembukuan & Keuangan',
      settings: 'Pengaturan Toko',
    };
    return titles[activeTab] || 'Dashboard';
  };

  return (
    <div className={styles.adminLayout}>
      <Toast toasts={toasts} removeToast={removeToast} />
      
      <Sidebar 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)} 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        onLogout={handleLogout} 
      />

      <main className={styles.mainContent}>
        <header className={styles.topbar}>
          <button 
            className={styles.topbarMenu} 
            onClick={() => setIsSidebarOpen(true)}
            aria-label="Toggle Menu"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
          </button>
          <h2 className={styles.topbarTitle}>{getPageTitle()}</h2>
          <div style={{ flex: 1 }}></div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', display: 'none' }} className="hidden md:block">
            {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
        </header>

        <div className={styles.pageContainer}>
          {renderContent()}
        </div>
      </main>
    </div>
  );
}
