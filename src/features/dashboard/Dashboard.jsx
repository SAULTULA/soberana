import React from 'react';
import styles from './Dashboard.module.css';

export function Dashboard({ setCurrentView, currentUser }) {
  let hubItems = [
    { id: 'inventory', img: '/inventarioprecios.png', fallback: 'Inventario & Precios' },
    { id: 'pos', img: '/registroventa.png', fallback: 'Registrar Venta' },
    { id: 'ledger', img: '/librodiario.png', fallback: 'Libro Diario' },
    { id: 'sales', img: '/historial.png', fallback: 'Historial Tickets' },
    { id: 'crm', img: '/cliente.png', fallback: 'Clientes & CRM' },
    { id: 'settings', img: '/config.png', fallback: 'Configuración' },
    { id: 'manual', img: '/manual.png', fallback: 'Manual de Uso' }
  ];

  if (currentUser?.role === 'SELLER') {
    hubItems = hubItems.filter(item => item.id !== 'settings');
  }

  return (
    <div className={styles.hub}>
      <header className={styles.hub__header}>
        <h2 className={`${styles.hub__title} texto-dorado-xl`}>Panel Principal</h2>
        <p className={styles.hub__subtitle}>Seleccione un módulo para operar</p>
      </header>

      <div className={styles.hub__grid}>
        {hubItems.map(item => (
          <button
            key={item.id}
            className={styles.hub__btn}
            onClick={() => setCurrentView(item.id)}
          >
            {item.img ? (
              <img src={item.img} alt={item.fallback} className={styles.hub__btnImg} />
            ) : (
              <span className={styles.hub__btnLabel}>{item.fallback}</span>
            )}
            <div className={styles.hub__tooltip}>
              <span className="texto-dorado">{item.fallback}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
