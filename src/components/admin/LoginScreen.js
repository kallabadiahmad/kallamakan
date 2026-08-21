'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import styles from './LoginScreen.module.css';
import { useToast } from '../../hooks/useToast';
import { CONFIG } from '../../lib/constants';

export default function LoginScreen({ onLoginSuccess }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { addToast } = useToast();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      const data = await res.json();

      if (data.success) {
        localStorage.setItem(CONFIG.STORAGE_KEYS.session, 'active');
        addToast('Login berhasil! Selamat datang Admin Kalla Makan.', 'success');
        onLoginSuccess();
      } else {
        setError(data.error || 'Password salah!');
        setPassword('');
      }
    } catch (err) {
      console.error('Login error:', err);
      // Fallback local check
      if (password === '@Kalla123') {
        localStorage.setItem(CONFIG.STORAGE_KEYS.session, 'active');
        addToast('Login berhasil', 'success');
        onLoginSuccess();
      } else {
        setError('Password salah atau koneksi bermasalah!');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.loginScreen}>
      <div className={styles.loginCard}>
        <Image 
          src="/logo-kallamakan.png" 
          alt="Kalla Makan" 
          width={80} 
          height={80} 
          className={styles.loginLogoImg} 
        />
        <h1 className={styles.loginTitle}>Kalla Makan</h1>
        <p className={styles.loginSubtitle}>Admin Portal & Pembukuan</p>
        
        <form onSubmit={handleLogin} className={styles.loginForm}>
          <div className={styles.loginField}>
            <span className={styles.icon}>🔒</span>
            <input
              type="password"
              placeholder="Masukkan Password Admin"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoFocus
            />
          </div>
          <button type="submit" className={styles.loginBtn} disabled={isLoading}>
            {isLoading ? 'Memverifikasi...' : 'Masuk Admin'}
          </button>
          {error && <p className={styles.loginHint}>{error}</p>}
        </form>
      </div>
    </div>
  );
}
