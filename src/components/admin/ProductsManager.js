'use client';

import React, { useState } from 'react';
import styles from '../../app/admin/admin.module.css';
import Modal from './Modal';
import { formatCurrency, generateId } from '../../lib/utils';
import { useToast } from '../../hooks/useToast';
import { useCart } from '../../context/CartContext';

export default function ProductsManager() {
  const { products, saveProduct, deleteProduct } = useCart();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const { addToast } = useToast();

  const [formData, setFormData] = useState({
    name: '',
    size: '',
    price: '',
    emoji: '🥒',
    theme: 'kiyamboy',
    active: true
  });

  const openModal = (product = null) => {
    if (product) {
      setEditingId(product.id);
      setFormData({ ...product });
    } else {
      setEditingId(null);
      setFormData({
        name: '',
        size: '',
        price: '',
        emoji: '🥒',
        theme: 'kiyamboy',
        active: true
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = (e) => {
    e.preventDefault();
    const newProduct = {
      ...formData,
      price: parseInt(formData.price),
      id: editingId || generateId('prod'),
      createdAt: editingId ? formData.createdAt : new Date().toISOString()
    };

    saveProduct(newProduct);
    if (editingId) {
      addToast('Produk berhasil diupdate', 'success');
    } else {
      addToast('Produk berhasil ditambahkan', 'success');
    }
    setIsModalOpen(false);
  };

  const toggleActive = (id) => {
    const p = (products || []).find((item) => item.id === id);
    if (p) {
      saveProduct({ ...p, active: !p.active });
      addToast('Status produk diubah');
    }
  };

  const handleDeleteProduct = (id) => {
    if (window.confirm('Yakin ingin menghapus produk ini?')) {
      deleteProduct(id);
      addToast('Produk dihapus', 'success');
    }
  };

  return (
    <div>
      <div className={styles.pageActions}>
        <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => openModal()}>
          <span style={{ fontSize: '1.2rem' }}>+</span> Tambah Produk
        </button>
      </div>

      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h3>📦 Daftar Produk</h3>
        </div>
        <div className={styles.cardBody} style={{ padding: 0 }}>
          <div className={styles.tableResponsive}>
            <table className={styles.dataTable}>
              <thead>
                <tr>
                  <th>No</th>
                  <th>Nama Produk</th>
                  <th>Ukuran</th>
                  <th>Harga</th>
                  <th>Status</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {(products || []).length === 0 ? (
                  <tr><td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Belum ada produk</td></tr>
                ) : (
                  (products || []).map((p, index) => (
                    <tr key={p.id}>
                      <td>{index + 1}</td>
                      <td style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '1.5rem' }}>{p.emoji || '🥒'}</span>
                        {p.name}
                      </td>
                      <td>{p.size || (p.variants && p.variants[0]?.size) || '-'}</td>
                      <td style={{ fontWeight: 700 }}>{formatCurrency(p.price || (p.variants && p.variants[0]?.price) || 0)}</td>
                      <td>
                        <span className={`${styles.statusBadge} ${p.active ? styles.statusActive : styles.statusInactive}`}>
                          {p.active ? 'Aktif' : 'Nonaktif'}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={() => toggleActive(p.id)} title="Toggle Status">
                            {p.active ? '🚫' : '✅'}
                          </button>
                          <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={() => openModal(p)} title="Edit">
                            ✏️
                          </button>
                          <button className={`${styles.btn} ${styles.btnDanger}`} onClick={() => handleDeleteProduct(p.id)} title="Hapus">
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

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? 'Edit Produk' : 'Tambah Produk'}>
        <form onSubmit={handleSave}>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Nama Produk</label>
            <input type="text" className={styles.formInput} required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Asinan Mangga" />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Ukuran (Contoh: 400ml, Reguler)</label>
            <input type="text" className={styles.formInput} required value={formData.size} onChange={e => setFormData({...formData, size: e.target.value})} placeholder="400ml" />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Harga (Rp)</label>
            <input type="number" className={styles.formInput} required value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} placeholder="35000" />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Emoji / Ikon</label>
            <input type="text" className={styles.formInput} required value={formData.emoji} onChange={e => setFormData({...formData, emoji: e.target.value})} placeholder="🥭" />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Tema Warna</label>
            <select className={styles.formInput} value={formData.theme} onChange={e => setFormData({...formData, theme: e.target.value})}>
              <option value="kiyamboy">Hijau (Kiyamboy)</option>
              <option value="pomegranite">Merah (Pomegranite)</option>
            </select>
          </div>
          <div className={styles.formGroup} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input type="checkbox" id="activeCheck" checked={formData.active} onChange={e => setFormData({...formData, active: e.target.checked})} />
            <label htmlFor="activeCheck" style={{ margin: 0 }} className={styles.formLabel}>Tampilkan Produk Ini (Aktif)</label>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
            <button type="button" className={`${styles.btn} ${styles.btnSecondary}`} onClick={() => setIsModalOpen(false)}>Batal</button>
            <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`}>Simpan Produk</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
