'use client';

import React, { useState, useEffect } from 'react';
import styles from '../../app/admin/admin.module.css';
import { useToast } from '../../hooks/useToast';
import { CONFIG, DEFAULT_PASSWORD } from '../../lib/constants';
import { useCart } from '../../context/CartContext';

export default function SettingsPanel() {
  const { settings, saveSettings } = useCart();
  const { addToast } = useToast();
  const [storeData, setStoreData] = useState({
    storeName: CONFIG.STORE_NAME,
    tagline: CONFIG.STORE_TAGLINE,
    whatsappNumber: CONFIG.WA_NUMBER,
    storeHours: CONFIG.STORE_HOURS,
    storeLocation: CONFIG.STORE_LOCATION,
    isOpen: true,
    announcement: '',
  });

  useEffect(() => {
    if (settings) {
      setStoreData({
        storeName: settings.storeName || CONFIG.STORE_NAME,
        tagline: settings.tagline || CONFIG.STORE_TAGLINE,
        whatsappNumber: settings.whatsappNumber || CONFIG.WA_NUMBER,
        storeHours: settings.storeHours || CONFIG.STORE_HOURS,
        storeLocation: settings.storeLocation || CONFIG.STORE_LOCATION,
        isOpen: settings.isOpen !== false,
        announcement: settings.announcement || '',
      });
    }
  }, [settings]);

  const [passwords, setPasswords] = useState({
    old: '',
    new: '',
    confirm: '',
  });

  const handleSaveStore = () => {
    saveSettings(storeData);
    addToast('Pengaturan toko berhasil disimpan!', 'success');
  };

  const handleChangePassword = () => {
    const currentPass = localStorage.getItem(CONFIG.STORAGE_KEYS.password) || DEFAULT_PASSWORD;
    if (passwords.old !== currentPass) {
      addToast('Password lama salah!', 'error');
      return;
    }
    if (passwords.new !== passwords.confirm) {
      addToast('Konfirmasi password baru tidak cocok!', 'error');
      return;
    }
    if (passwords.new.length < 5) {
      addToast('Password baru minimal 5 karakter!', 'error');
      return;
    }
    localStorage.setItem(CONFIG.STORAGE_KEYS.password, passwords.new);
    addToast('Password admin berhasil diubah!', 'success');
    setPasswords({ old: '', new: '', confirm: '' });
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
      {/* Pengaturan Profil Toko */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h3>🏪 Profil Toko UMKM</h3>
        </div>
        <div className={styles.cardBody}>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Nama Toko</label>
            <input
              type="text"
              className={styles.formInput}
              value={storeData.storeName}
              onChange={(e) => setStoreData({ ...storeData, storeName: e.target.value })}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Tagline Toko</label>
            <input
              type="text"
              className={styles.formInput}
              value={storeData.tagline}
              onChange={(e) => setStoreData({ ...storeData, tagline: e.target.value })}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Nomor WhatsApp Admin (Penerima Order)</label>
            <input
              type="text"
              className={styles.formInput}
              value={storeData.whatsappNumber}
              onChange={(e) => setStoreData({ ...storeData, whatsappNumber: e.target.value })}
              placeholder="Contoh: 082227418224 atau 6282227418224"
            />
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
              Format nomor aktif dengan kode area (cth: 08xxx / 628xxx)
            </span>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Jam Operasional Toko</label>
            <input
              type="text"
              className={styles.formInput}
              value={storeData.storeHours}
              onChange={(e) => setStoreData({ ...storeData, storeHours: e.target.value })}
              placeholder="09:00 - 21:00 WIB"
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Lokasi / Dapur Outlet</label>
            <input
              type="text"
              className={styles.formInput}
              value={storeData.storeLocation}
              onChange={(e) => setStoreData({ ...storeData, storeLocation: e.target.value })}
              placeholder="Jakarta Barat, DKI Jakarta"
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Banner Pengumuman / Promo (Header)</label>
            <input
              type="text"
              className={styles.formInput}
              value={storeData.announcement}
              onChange={(e) => setStoreData({ ...storeData, announcement: e.target.value })}
              placeholder="🎉 Promo Diskon Rp 10rb dengan kode: HEMAT10K"
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.formLabel} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={storeData.isOpen}
                onChange={(e) => setStoreData({ ...storeData, isOpen: e.target.checked })}
                style={{ width: '18px', height: '18px' }}
              />
              <span>Toko Sedang Buka (Menerima Pesanan)</span>
            </label>
          </div>

          <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={handleSaveStore}>
            💾 Simpan Pengaturan Toko
          </button>
        </div>
      </div>

      {/* Keamanan & Password */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h3>🔐 Keamanan & Password Admin</h3>
        </div>
        <div className={styles.cardBody}>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Password Lama</label>
            <input
              type="password"
              className={styles.formInput}
              value={passwords.old}
              onChange={(e) => setPasswords({ ...passwords, old: e.target.value })}
            />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Password Baru</label>
            <input
              type="password"
              className={styles.formInput}
              value={passwords.new}
              onChange={(e) => setPasswords({ ...passwords, new: e.target.value })}
            />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Konfirmasi Password Baru</label>
            <input
              type="password"
              className={styles.formInput}
              value={passwords.confirm}
              onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
            />
          </div>
          <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={handleChangePassword}>
            🔑 Ubah Password Admin
          </button>
        </div>
      </div>
    </div>
  );
}
