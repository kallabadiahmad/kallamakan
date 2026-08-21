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
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const { toasts, addToast, removeToast } = useToast();
  const { orders, expenses } = useCart();

  useEffect(() => {
    // Check if user is logged in
    const session = localStorage.getItem(CONFIG.STORAGE_KEYS.session);
    if (session === 'active') {
      setIsAuthenticated(true);
    }
    
    // Set custom font class for admin specifically
    document.body.style.background = 'var(--bg-body)';
    return () => {
      document.body.style.background = ''; // reset on unmount
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem(CONFIG.STORAGE_KEYS.session);
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

  if (!isAuthenticated) {
    return (
      <>
        <Toast toasts={toasts} removeToast={removeToast} />
        <LoginScreen onLoginSuccess={() => setIsAuthenticated(true)} />
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
