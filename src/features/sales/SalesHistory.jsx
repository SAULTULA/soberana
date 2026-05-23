import React, { useState, useEffect } from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import styles from './SalesHistory.module.css';
import { DatabaseService } from '../../utils/database';

export function SalesHistory({ currentUser }) {
  const [sales, setSales] = useState([]);
  const [businessName, setBusinessName] = useState('Mi Negocio');
  const [selectedTicket, setSelectedTicket] = useState(null);
  
  // Drawer & Gráficos state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [salesTrend, setSalesTrend] = useState([]);
  const [dailySales, setDailySales] = useState([]);
  const [expenseData, setExpenseData] = useState([]);
  const [topClients, setTopClients] = useState([]);

  const loadData = async () => {
    const salesData = await DatabaseService.getRecords('sales');
    // Ordenar descendente por fecha
    salesData.sort((a, b) => new Date(b.date) - new Date(a.date));
    setSales(salesData);

    const settingsData = await DatabaseService.getRecords('settings');
    const nameSetting = settingsData.find(s => s.key === 'businessName');
    if (nameSetting) {
      setBusinessName(nameSetting.value);
    }

    // Calcular Gráficos de Ventas
    const trendMap = {};
    salesData.forEach(sale => {
      const dateStr = new Date(sale.date).toLocaleDateString();
      trendMap[dateStr] = (trendMap[dateStr] || 0) + sale.total;
    });
    
    const formattedTrend = Object.keys(trendMap).map(date => ({
      date,
      ventas: trendMap[date]
    })).slice(-7); // últimos 7 días

    setSalesTrend(formattedTrend);
    setDailySales(formattedTrend);

    // Calcular Gráfico de Torta (Egresos)
    const ledgerData = await DatabaseService.getRecords('ledger');
    const expenses = ledgerData.filter(e => e.type === 'EXPENSE');
    const expenseMap = { 'Operativo': 0, 'Inversión': 0, 'Financiero': 0, 'Otros': 0 };
    
    expenses.forEach(e => {
      const cat = e.category || 'Otros';
      if (expenseMap[cat] !== undefined) {
        expenseMap[cat] += e.amount;
      } else {
        expenseMap['Otros'] += e.amount;
      }
    });

    const formattedExpenses = Object.keys(expenseMap)
      .filter(k => expenseMap[k] > 0)
      .map(name => ({ name, value: expenseMap[name] }));
    
    setExpenseData(formattedExpenses);

    // Calcular Top Clientes
    const clientsData = await DatabaseService.getRecords('clients');
    // Para simplificar, ranking basado en clientes (podría ser por ventas atadas a cliente)
    // Mostramos los 5 con mayor deuda activa como ejemplo de Top Clientes a cobrar
    const top = clientsData.sort((a, b) => b.debt - a.debt).slice(0, 5);
    setTopClients(top);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleVoidTicket = async (ticket) => {
    if (!window.confirm(`¿Estás seguro de anular el ticket ${ticket.id}? Esto devolverá el stock y registrará un egreso.`)) return;

    try {
      // 1. Devolver el stock
      const products = await DatabaseService.getRecords('products');
      for (const item of ticket.items) {
        const productToUpdate = products.find(p => p.id === item.product.id);
        if (productToUpdate) {
          const updatedProduct = { ...productToUpdate, stock: productToUpdate.stock + item.quantity };
          await DatabaseService.saveRecord('products', updatedProduct);
        }
      }

      // 2. Registrar egreso en Libro Diario por la devolución
      const ledgerEntry = {
        id: Date.now().toString(),
        type: 'EXPENSE',
        amount: ticket.total,
        description: `Anulación de Ticket #${ticket.id} (Por: ${currentUser?.name || 'Admin'})`,
        date: new Date().toISOString()
      };
      await DatabaseService.saveRecord('ledger', ledgerEntry);

      // 3. Eliminar (o marcar como anulado) el ticket
      // Mejor práctica: no eliminar el ticket, solo marcarlo como anulado para auditoría.
      // Pero como el código previo lo eliminaba, vamos a mantenerlo así por ahora para no romper
      // otras métricas, o lo editamos y le ponemos "total: 0". Para mantener tu lógica original:
      await DatabaseService.deleteRecord('sales', ticket.id);

      alert('✅ Ticket anulado correctamente.');
      setSelectedTicket(null);
      loadData();
    } catch (err) {
      alert('❌ Error anulando el ticket.');
    }
  };

  return (
    <div className={styles.history}>
      <header className={styles.history__header}>
        <h2 className="texto-dorado">Historial de Ventas y Comprobantes</h2>
        <div className="divider-dorado"></div>
        <p className={styles.history__subtitle}>Registro histórico de transacciones del negocio</p>
      </header>

      <div className={styles.history__content}>
        <section className={styles.history__listSection}>
          <table className={styles.history__table}>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>N° Ticket</th>
                <th>Total</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {sales.length === 0 ? (
                <tr>
                  <td colSpan="4" className={styles.history__empty}>No hay tickets registrados.</td>
                </tr>
              ) : (
                sales.map(sale => (
                  <tr key={sale.id}>
                    <td>{new Date(sale.date).toLocaleString('es-ES')}</td>
                    <td>{sale.id}</td>
                    <td><strong>${sale.total.toFixed(2)}</strong></td>
                    <td>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button className={styles.history__viewBtn} onClick={() => setSelectedTicket(sale)}>👁️ Ver</button>
                        <button className={styles.history__voidBtn} onClick={() => handleVoidTicket(sale)}>❌ Anular</button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </section>

        {selectedTicket && (
          <aside className={styles.history__ticketSection}>
            <div className={styles.ticket}>
              <div className={styles.ticket__header}>
                <h3>{businessName}</h3>
                <p>Ticket: {selectedTicket.id}</p>
                <p>{new Date(selectedTicket.date).toLocaleString('es-ES')}</p>
              </div>
              <div className={styles.ticket__body}>
                <div className={styles.ticket__rowHeader}>
                  <span>Cant</span>
                  <span>Producto</span>
                  <span>Subtotal</span>
                </div>
                {selectedTicket.items.map((item, idx) => (
                  <div key={idx} className={styles.ticket__row}>
                    <span>{item.quantity}</span>
                    <span>{item.product.name}</span>
                    <span>${item.subtotal.toFixed(2)}</span>
                  </div>
                ))}
              </div>
              <div className={styles.ticket__footer}>
                <span>TOTAL:</span>
                <strong>${selectedTicket.total.toFixed(2)}</strong>
              </div>
              <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '12px', fontStyle: 'italic' }}>
                ¡Gracias por su compra!
              </p>
            </div>
            <button className={styles.history__closeBtn} onClick={() => setSelectedTicket(null)}>
              Cerrar Ticket
            </button>
          </aside>
        )}
      </div>

      {/* Flap/Solapa para abrir los gráficos */}
      <div 
        className={`${styles.drawerFlap} ${isDrawerOpen ? styles.drawerFlapOpen : ''}`} 
        onClick={() => setIsDrawerOpen(!isDrawerOpen)}
      >
        <span>{isDrawerOpen ? '▶ Cerrar' : '◀ Estadísticas'}</span>
      </div>

      {/* Drawer Overlay (Opcional, para cerrar al hacer clic fuera) */}
      {isDrawerOpen && (
        <div className={styles.drawerOverlay} onClick={() => setIsDrawerOpen(false)} />
      )}

      {/* Panel Deslizante de Gráficos */}
      <div className={`${styles.drawerPanel} ${isDrawerOpen ? styles.drawerPanelOpen : ''}`}>
        <div className={styles.drawerHeader}>
          <h3 className="texto-dorado">Gráficos y Estadísticas</h3>
          <button className={styles.drawerCloseBtn} onClick={() => setIsDrawerOpen(false)}>✖</button>
        </div>
        <div className="divider-dorado"></div>
        
        <div className={styles.drawerBody}>
          {/* Definiciones SVG para Efectos de Cristal y Neón */}
          <svg style={{ height: 0, width: 0, position: 'absolute' }}>
            <defs>
              <linearGradient id="glassGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="rgba(255, 255, 255, 0.6)" />
                <stop offset="50%" stopColor="rgba(14, 165, 233, 0.4)" />
                <stop offset="100%" stopColor="rgba(14, 165, 233, 0.1)" />
              </linearGradient>
              <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>
          </svg>

          <div className={`${styles.chartBox} ${styles.chartBoxNeon}`}>
            <h4 style={{ color: 'var(--color-text-muted)', marginBottom: '1rem' }}>Comparativa Diaria (Barras 3D Cristal)</h4>
            <div style={{ width: '100%', height: 300 }}>
              {dailySales.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dailySales}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="date" stroke="#94a3b8" />
                    <YAxis stroke="#94a3b8" />
                    <Tooltip contentStyle={{ backgroundColor: 'rgba(30,41,59,0.8)', backdropFilter: 'blur(10px)', border: '1px solid var(--oro-claro)' }} />
                    <Bar dataKey="ventas" fill="url(#glassGradient)" filter="url(#glow)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p style={{textAlign: 'center', marginTop: '100px', color: '#94a3b8'}}>Aún no hay suficientes ventas.</p>
              )}
            </div>
          </div>

          <div className={`${styles.chartBox} ${styles.chartBoxNeon}`}>
            <h4 style={{ color: 'var(--color-text-muted)', marginBottom: '1rem' }}>Distribución de Egresos</h4>
            <div style={{ width: '100%', height: 300 }}>
              {expenseData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={expenseData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                      label={({name, percent}) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {expenseData.map((entry, index) => {
                        const colors = ['#b8860b', '#0ea5e9', '#ef4444', '#10b981'];
                        return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} filter="url(#glow)" />;
                      })}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: 'rgba(30,41,59,0.8)', backdropFilter: 'blur(10px)', border: '1px solid var(--oro-claro)' }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p style={{textAlign: 'center', marginTop: '100px', color: '#94a3b8'}}>No hay egresos registrados.</p>
              )}
            </div>
          </div>

          <div className={`${styles.chartBox} ${styles.chartBoxNeon}`}>
            <h4 style={{ color: 'var(--color-text-muted)', marginBottom: '1rem' }}>Top 5 Cuentas Corrientes (Deudores)</h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {topClients.length > 0 ? topClients.map((c, i) => (
                <li key={c.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                  <span><strong style={{color: 'var(--oro-claro)'}}>#{i+1}</strong> {c.name}</span>
                  <strong style={{color: '#ef4444'}}>${c.debt.toFixed(2)}</strong>
                </li>
              )) : (
                <p style={{textAlign: 'center', color: '#94a3b8'}}>No hay clientes con deuda.</p>
              )}
            </ul>
          </div>
        </div>
      </div>

    </div>
  );
}
