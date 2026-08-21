import React from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, X } from 'lucide-react';
import styles from './Toast.module.css';

export default function Toast({ toasts, removeToast }) {
  if (!toasts || toasts.length === 0) return null;

  return (
    <div className={styles.toastContainer} role="region" aria-label="Notifikasi">
      {toasts.map((toast) => {
        const type = toast.type || 'success';
        return (
          <div
            key={toast.id}
            className={`${styles.toast} ${styles[type] || styles.success}`}
            role="alert"
          >
            <div className={styles.toastIcon}>
              {type === 'error' && <AlertCircle size={20} className={styles.iconError} />}
              {type === 'warning' && <AlertTriangle size={20} className={styles.iconWarning} />}
              {type === 'success' && <CheckCircle2 size={20} className={styles.iconSuccess} />}
            </div>
            <div className={styles.toastMessage}>{toast.message}</div>
            <button
              type="button"
              className={styles.toastClose}
              onClick={() => removeToast(toast.id)}
              aria-label="Tutup"
            >
              <X size={16} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
