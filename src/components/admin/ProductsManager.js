'use client';

import React, { useState } from 'react';
import styles from '../../app/admin/admin.module.css';
import Modal from './Modal';
import { formatCurrency, generateId } from '../../lib/utils';
import { useToast } from '../../hooks/useToast';
import { useCart } from '../../context/CartContext';

const THEME_OPTIONS = [
  { value: 'kiamboy', label: 'Kuning Cerah (Asinan Kiamboy)' },
  { value: 'pomegranate', label: 'Merah Ruby (Asinan Pomegranate)' },
  { value: 'salad', label: 'Hijau Emerald (Salad Buah)' },
  { value: 'kuah', label: 'Oranye Cabai (Kuah Asinan)' },
];

const emptyVariant = () => ({ id: generateId('v'), size: '', price: '', hpp: '' });

const emptyForm = () => ({
  name: '',
  description: '',
  badge: '',
  emoji: '🥭',
  image: '',
  theme: 'kiamboy',
  category: '',
  active: true,
  variants: [emptyVariant()],
});

// Produk lama yang tersimpan dengan format price/size tunggal diubah ke format varian
function toVariants(product) {
  if (Array.isArray(product.variants) && product.variants.length > 0) {
    return product.variants.map((v) => ({
      id: v.id || generateId('v'),
      size: v.size || '',
      price: v.price ?? '',
      hpp: v.hpp ?? '',
    }));
  }
  return [{ id: 'default', size: product.size || 'Reguler', price: product.price ?? '', hpp: product.hpp ?? '' }];
}

function normalizeTheme(product) {
  const t = (product.theme || product.category || '').toLowerCase();
  if (t.includes('pomegran')) return 'pomegranate';
  if (t.includes('salad')) return 'salad';
  if (t.includes('kuah')) return 'kuah';
  return 'kiamboy';
}

export default function ProductsManager() {
  const { products, saveProduct, deleteProduct } = useCart();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState(emptyForm());
  const { addToast } = useToast();

  const openModal = (product = null) => {
    if (product) {
      setEditingId(product.id);
      setFormData({
        name: product.name || '',
        description: product.description || '',
        badge: product.badge || '',
        emoji: product.emoji || '',
        image: product.image || '',
        theme: normalizeTheme(product),
        category: product.category || '',
        active: product.active !== false,
        variants: toVariants(product),
      });
    } else {
      setEditingId(null);
      setFormData(emptyForm());
    }
    setIsModalOpen(true);
  };

  const updateField = (field, value) => setFormData((prev) => ({ ...prev, [field]: value }));

  const updateVariant = (index, field, value) => {
    setFormData((prev) => {
      const variants = [...prev.variants];
      variants[index] = { ...variants[index], [field]: value };
      return { ...prev, variants };
    });
  };

  const addVariant = () => setFormData((prev) => ({ ...prev, variants: [...prev.variants, emptyVariant()] }));

  const removeVariant = (index) =>
    setFormData((prev) => ({ ...prev, variants: prev.variants.filter((_, i) => i !== index) }));

  const handleSave = async (e) => {
    e.preventDefault();

    const variants = formData.variants
      .map((v) => ({
        id: v.id || generateId('v'),
        size: String(v.size || '').trim(),
        price: parseInt(String(v.price).replace(/\D/g, ''), 10) || 0,
        hpp: parseInt(String(v.hpp).replace(/\D/g, ''), 10) || 0,
      }))
      .filter((v) => v.size || v.price);

    if (variants.length === 0) {
      addToast('Isi minimal 1 ukuran dan harga', 'error');
      return;
    }
    if (variants.some((v) => !v.size || v.price <= 0)) {
      addToast('Setiap ukuran wajib punya nama ukuran dan harga lebih dari 0', 'error');
      return;
    }
    if (variants.some((v) => v.hpp > v.price)) {
      addToast('Modal (HPP) tidak boleh lebih besar dari harga jual', 'error');
      return;
    }

    const existing = (products || []).find((p) => p.id === editingId) || {};
    const product = {
      ...existing,
      id: editingId || generateId('prod'),
      name: formData.name.trim(),
      description: formData.description,
      badge: formData.badge,
      emoji: formData.emoji,
      image: formData.image.trim(),
      theme: formData.theme,
      category: formData.category || formData.theme,
      active: formData.active,
      variants,
    };
    // Field lama format tunggal tidak dipakai lagi
    delete product.price;
    delete product.size;
    delete product.hpp;

    setIsSaving(true);
    const result = await saveProduct(product);
    setIsSaving(false);

    if (result && !result.success) {
      addToast(`Gagal menyimpan: ${result.error}`, 'error');
      return;
    }
    addToast(editingId ? 'Produk & harga berhasil diupdate' : 'Produk berhasil ditambahkan', 'success');
    setIsModalOpen(false);
  };

  const toggleActive = async (id) => {
    const p = (products || []).find((item) => item.id === id);
    if (p) {
      const result = await saveProduct({ ...p, variants: toVariants(p), active: !p.active });
      if (result && !result.success) {
        addToast(`Gagal mengubah status: ${result.error}`, 'error');
      } else {
        addToast(p.active ? 'Produk disembunyikan dari menu' : 'Produk ditampilkan di menu');
      }
    }
  };

  const handleDeleteProduct = (id) => {
    if (window.confirm('Yakin ingin menghapus produk ini? (Kalau hanya ingin menyembunyikan sementara, pakai tombol 🚫)')) {
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
                  <th>Ukuran • Harga • Modal</th>
                  <th>Status</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {(products || []).length === 0 ? (
                  <tr><td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Belum ada produk</td></tr>
                ) : (
                  (products || []).map((p, index) => (
                    <tr key={p.id}>
                      <td>{index + 1}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '1.5rem' }}>{p.emoji || '🥒'}</span>
                          <div>
                            <div style={{ fontWeight: 700 }}>{p.name}</div>
                            {p.badge && <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{p.badge}</div>}
                          </div>
                        </div>
                      </td>
                      <td>
                        {toVariants(p).map((v) => (
                          <div key={v.id} style={{ fontSize: '0.82rem', whiteSpace: 'nowrap', marginBottom: '2px' }}>
                            {v.size}: <strong>{formatCurrency(v.price)}</strong>
                            <span style={{ color: 'var(--text-muted)' }}> • modal {formatCurrency(v.hpp || 0)}</span>
                          </div>
                        ))}
                      </td>
                      <td>
                        <span className={`${styles.statusBadge} ${p.active !== false ? styles.statusActive : styles.statusInactive}`}>
                          {p.active !== false ? 'Aktif' : 'Nonaktif'}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={() => toggleActive(p.id)} title="Tampilkan / sembunyikan">
                            {p.active !== false ? '🚫' : '✅'}
                          </button>
                          <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={() => openModal(p)} title="Edit produk & harga">
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

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? 'Edit Produk & Harga' : 'Tambah Produk'}>
        <form onSubmit={handleSave}>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Nama Produk</label>
            <input type="text" className={styles.formInput} required value={formData.name} onChange={(e) => updateField('name', e.target.value)} placeholder="Kuah Asinan" />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Deskripsi</label>
            <textarea className={styles.formInput} rows={3} value={formData.description} onChange={(e) => updateField('description', e.target.value)} placeholder="Ceritakan isi dan rasa produknya" />
          </div>

          {/* Ukuran & Harga */}
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Ukuran, Harga Jual & Modal (HPP)</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {formData.variants.map((v, i) => (
                <div key={v.id || i} style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr auto', gap: '6px', alignItems: 'center' }}>
                  <input type="text" className={styles.formInput} value={v.size} onChange={(e) => updateVariant(i, 'size', e.target.value)} placeholder="400ml (Porsi Pas)" aria-label="Ukuran" />
                  <input type="number" min="0" inputMode="numeric" className={styles.formInput} value={v.price} onChange={(e) => updateVariant(i, 'price', e.target.value)} placeholder="Harga jual" aria-label="Harga jual" />
                  <input type="number" min="0" inputMode="numeric" className={styles.formInput} value={v.hpp} onChange={(e) => updateVariant(i, 'hpp', e.target.value)} placeholder="Modal" aria-label="Modal / HPP" />
                  <button type="button" className={`${styles.btn} ${styles.btnDanger}`} onClick={() => removeVariant(i)} disabled={formData.variants.length <= 1} title="Hapus ukuran ini">✕</button>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                Modal (HPP) = biaya buah + kuah + cup per porsi. Dipakai untuk hitung laba kotor.
              </span>
              <button type="button" className={`${styles.btn} ${styles.btnSecondary}`} onClick={addVariant}>+ Tambah Ukuran</button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Emoji / Ikon</label>
              <input type="text" className={styles.formInput} value={formData.emoji} onChange={(e) => updateField('emoji', e.target.value)} placeholder="🥭" />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Label (opsional)</label>
              <input type="text" className={styles.formInput} value={formData.badge} onChange={(e) => updateField('badge', e.target.value)} placeholder="Best Seller" />
            </div>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Link Foto (opsional)</label>
            <input type="text" className={styles.formInput} value={formData.image} onChange={(e) => updateField('image', e.target.value)} placeholder="/images/asinan-kiyamboy.jpg" />
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Kosongkan kalau belum ada foto, nanti tampil emoji.</span>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Tema Warna</label>
            <select className={styles.formInput} value={formData.theme} onChange={(e) => updateField('theme', e.target.value)}>
              {THEME_OPTIONS.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          <div className={styles.formGroup} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input type="checkbox" id="activeCheck" checked={formData.active} onChange={(e) => updateField('active', e.target.checked)} />
            <label htmlFor="activeCheck" style={{ margin: 0 }} className={styles.formLabel}>Tampilkan Produk Ini (Aktif)</label>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
            <button type="button" className={`${styles.btn} ${styles.btnSecondary}`} onClick={() => setIsModalOpen(false)}>Batal</button>
            <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`} disabled={isSaving}>
              {isSaving ? 'Menyimpan...' : 'Simpan Produk'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
