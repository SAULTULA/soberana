import React from 'react';
import styles from './Sidebar.module.css';

export function Sidebar({ currentView, setCurrentView, isOpen }) {
  const menuItems = [
    { id: 'dashboard', img: '/panel principal.png', fallback: 'Panel Principal' },
    { id: 'inventory', img: '/inventarioprecios.png', fallback: 'Inventario & Precios' },
    { id: 'pos', img: '/registroventa.png', fallback: 'Punto de Venta' },
    { id: 'ledger', img: '/librodiario.png', fallback: 'Libro Diario' },
    { id: 'sales', img: '/historial.png', fallback: 'Historial Tickets' },
    { id: 'crm', fallback: '👥 Clientes & CRM' },
    { id: 'settings', fallback: '⚙️ Configuración' }
  ];

  return (
    <aside className={`${styles.sidebar} ${isOpen ? styles['sidebar--open'] : ''}`}>
      <div className={styles.sidebar__brand}>
        <img src="/soberana.png" alt="Soberana Logo" className={styles.sidebar__logoImg} style={{ width: '100%', maxWidth: '90px', display: 'block', margin: '0 auto' }} />
        <div className="texto-dorado" style={{ fontSize: '1.1rem', letterSpacing: '0.08em', textAlign: 'center', margin: '10px 0' }}>Gestión de Local</div>
        <div className="divider-dorado" style={{ margin: '0.5rem 0' }}></div>
        <p className="texto-dorado-italic" style={{ textAlign: 'center', fontSize: '1.1rem' }}>KSM Servicios</p>
      </div>
      <nav className={styles.sidebar__nav}>
        {menuItems.map(item => (
          <button
            key={item.id}
            className={`${styles.sidebar__btn} ${currentView === item.id ? styles['sidebar__btn--active'] : ''}`}
            onClick={() => setCurrentView(item.id)}
          >
            {item.img ? (
              <img src={item.img} alt={item.fallback} className={styles.sidebar__btnImg} />
            ) : (
              <span className={styles['sidebar__btn-label']} style={{ color: 'var(--color-primary)' }}>{item.fallback}</span>
            )}
            <span className={`${styles.sidebar__tooltip} texto-dorado`}>{item.fallback}</span>
          </button>
        ))}
      </nav>
      <div className={styles.sidebar__footer}>
        <small>v1.0 - Modo Local</small>
      </div>
    </aside>
  );
}
