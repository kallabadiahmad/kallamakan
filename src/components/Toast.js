import React from 'react';
import styles from './Toast.module.css';

export default function Toast({ toasts, removeToast }) {
  if (!toasts || toasts.length === 0) return null;

  return (
    <div className={styles.toastContainer}>
      {toasts.map((toast) => (
        <div key={toast.id} className={`${styles.toast} ${styles[toast.type] || styles.success}`}>
          <div className={styles.toastIcon}>
            {toast.type === 'error' ? '❌' : toast.type === 'warning' ? '⚠️' : '✅'}
          </div>
          <div className={styles.toastMessage}>{toast.message}</div>
          <button className={styles.toastClose} onClick={() => removeToast(toast.id)}>
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
