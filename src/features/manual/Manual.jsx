import React from 'react';
import styles from './Manual.module.css';

export function Manual() {
  return (
    <div className={styles.manual}>
      <header className={styles.manual__header}>
        <div className={styles.manual__headerText}>
          <h2 className="texto-dorado">Manual de Operaciones</h2>
          <p className={styles.manual__subtitle}>Documentación oficial y guías del sistema</p>
        </div>
      </header>

      <div className={styles.manual__content}>
        <iframe 
          src="/manual-usuario.html" 
          title="Manual de Usuario" 
          className={styles.manual__iframe}
        />
      </div>
    </div>
  );
}
