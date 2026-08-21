'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import styles from './Sidebar.module.css';

export default function Sidebar({ isOpen, onClose, activeTab, setActiveTab, onLogout }) {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'products', label: 'Produk', icon: '📦' },
    { id: 'orders', label: 'Order', icon: '📋' },
    { id: 'finance', label: 'Pembukuan', icon: '💰' },
    { id: 'settings', label: 'Pengaturan', icon: '⚙️' },
  ];

  return (
    <>
      <div className={`${styles.sidebarOverlay} ${isOpen ? styles.open : ''}`} onClick={onClose} />
      
      <aside className={`${styles.sidebar} ${isOpen ? styles.open : ''}`}>
        <div className={styles.sidebarHeader}>
          <Image 
            src="/logo-kallamakan.png" 
            alt="Kalla Makan Admin" 
            width={40} 
            height={40} 
            className={styles.sidebarLogoImg} 
          />
          <div className={styles.sidebarBrand}>
            <strong>Kalla Makan</strong>
            <span>Admin Panel</span>
          </div>
          <button className={styles.sidebarClose} onClick={onClose}>✕</button>
        </div>
        
        <nav className={styles.sidebarNav}>
          {navItems.map(item => (
            <button
              key={item.id}
              className={`${styles.navItem} ${activeTab === item.id ? styles.active : ''}`}
              onClick={() => {
                setActiveTab(item.id);
                onClose();
              }}
            >
              <span className={styles.navIcon}>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
        
        <div className={styles.sidebarFooter}>
          <Link href="/" className={`${styles.navItem} ${styles.navLinkStore}`} target="_blank">
            <span className={styles.navIcon}>🏪</span>
            <span>Lihat Toko</span>
          </Link>
          <button className={`${styles.navItem} ${styles.navLogout}`} onClick={onLogout}>
            <span className={styles.navIcon}>🚪</span>
            <span>Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
}
