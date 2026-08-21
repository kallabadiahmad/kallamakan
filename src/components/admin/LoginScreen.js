'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import styles from './LoginScreen.module.css';
import { useToast } from '../../hooks/useToast';
import { DEFAULT_PASSWORD, CONFIG } from '../../lib/constants';

export default function LoginScreen({ onLoginSuccess }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { addToast } = useToast();

  const handleLogin = (e) => {
    e.preventDefault();
    const storedPassword = localStorage.getItem(CONFIG.STORAGE_KEYS.password) || DEFAULT_PASSWORD;
    
    if (password === storedPassword) {
      localStorage.setItem(CONFIG.STORAGE_KEYS.session, 'active');
      addToast('Login berhasil', 'success');
      onLoginSuccess();
    } else {
      setError('Password salah!');
      setPassword('');
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
        <p className={styles.loginSubtitle}>Admin Panel</p>
        
        <form onSubmit={handleLogin} className={styles.loginForm}>
          <div className={styles.loginField}>
            <span className={styles.icon}>🔒</span>
            <input
              type="password"
              placeholder="Masukkan Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button type="submit" className={styles.loginBtn}>
            Masuk
          </button>
          {error && <p className={styles.loginHint}>{error}</p>}
        </form>
      </div>
    </div>
  );
}
