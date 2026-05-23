import React from 'react';
import styles from './Layout.module.css';

export function Layout({ currentView, setCurrentView, onLogout, children }) {
  return (
    <div className={styles.layout}>
      {/* Top Navbar Minimalista */}
      <header className={styles.topbar}>
        <div className={styles.topbar__brand} onClick={() => setCurrentView('dashboard')} style={{cursor: 'pointer'}}>
          <img src="/soberana.png" alt="Soberana Logo" className={styles.topbar__logo} />
          <div className={styles.topbar__titleGroup}>
            <h1 className={`${styles.topbar__title} texto-dorado`}>Soberana</h1>
            <span className={`${styles.topbar__subtitle} texto-dorado-italic`}>Gestión de Local</span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {currentView !== 'dashboard' && (
            <button className={styles.topbar__homeBtn} onClick={() => setCurrentView('dashboard')}>
              🏠 Volver a Inicio
            </button>
          )}
          <button 
            onClick={onLogout}
            style={{
              background: 'transparent',
              border: '1px solid var(--color-danger)',
              color: 'var(--color-danger)',
              padding: '6px 12px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px'
            }}
          >
            👤 Cambiar Usuario
          </button>
        </div>
      </header>

      <main className={styles.layout__main}>
        <div className={styles.layout__content}>
          {children}
        </div>
      </main>
    </div>
  );
}
