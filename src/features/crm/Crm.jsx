import React, { useState, useEffect } from 'react';
import styles from './Crm.module.css';
import { DatabaseService } from '../../utils/database';

export function Crm({ currentUser }) {
  const [clients, setClients] = useState([]);
  const [form, setForm] = useState({ name: '', phone: '' });
  const [message, setMessage] = useState('');

  const loadClients = async () => {
    const data = await DatabaseService.getRecords('clients');
    setClients(data);
  };

  useEffect(() => {
    loadClients();
  }, []);

  const handleCreateClient = async (e) => {
    e.preventDefault();
    if (!form.name) return;

    try {
      const newClient = {
        id: `CLI-${Date.now()}`,
        name: form.name,
        phone: form.phone,
        debt: 0 // Inicia sin deuda
      };
      
      await DatabaseService.saveRecord('clients', newClient);
      setMessage(`✅ Cliente ${form.name} creado.`);
      setForm({ name: '', phone: '' });
      loadClients();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage('❌ Error creando cliente.');
    }
  };

  const handleRegisterPayment = async (client) => {
    const paymentStr = window.prompt(`Registrar Abono/Pago para ${client.name}\nDeuda actual: $${client.debt.toFixed(2)}\n\n¿Cuánto dinero está abonando ahora?`);
    if (paymentStr === null) return;
    
    const payment = parseFloat(paymentStr);
    if (isNaN(payment) || payment <= 0) {
      alert('Monto inválido.');
      return;
    }

    if (payment > client.debt) {
      if (!window.confirm(`El abono ($${payment}) es mayor que la deuda ($${client.debt}). ¿Deseas dejarle saldo a favor (deuda negativa)?`)) return;
    }

    try {
      // 1. Descontar deuda del cliente
      const updatedClient = { ...client, debt: client.debt - payment };
      await DatabaseService.saveRecord('clients', updatedClient);

      // 2. Registrar en Libro Diario (Ingreso de caja)
      const ledgerEntry = {
        id: Date.now().toString(),
        type: 'INCOME',
        amount: payment,
        description: `Cobro Cuenta Corriente: Abono de ${client.name} (Cobrado por: ${currentUser?.name || 'Admin'})`,
        date: new Date().toISOString()
      };
      await DatabaseService.saveRecord('ledger', ledgerEntry);

      setMessage(`✅ Abono de $${payment.toFixed(2)} registrado a ${client.name}.`);
      loadClients();
      setTimeout(() => setMessage(''), 4000);
    } catch (err) {
      alert('Error al registrar el pago.');
    }
  };

  return (
    <div className={styles.crm}>
      <header className={styles.crm__header}>
        <h2 className="texto-dorado">Cuentas Corrientes & CRM</h2>
        <div className="divider-dorado"></div>
        <p className={styles.crm__subtitle}>Gestiona tus clientes, fiados y cobranzas</p>
      </header>

      {message && <div className={styles.crm__alert}>{message}</div>}

      <div className={styles.crm__layout}>
        <section className={styles.crm__formSection}>
          <div className={styles.crm__card}>
            <h3>Nuevo Cliente</h3>
            <form className={styles.crm__form} onSubmit={handleCreateClient}>
              <div className={styles.crm__formGroup}>
                <label>Nombre y Apellido</label>
                <input 
                  type="text" 
                  value={form.name} 
                  onChange={(e) => setForm({...form, name: e.target.value})} 
                  placeholder="Ej: Juan Pérez" 
                  required 
                />
              </div>
              <div className={styles.crm__formGroup}>
                <label>Teléfono (opcional)</label>
                <input 
                  type="text" 
                  value={form.phone} 
                  onChange={(e) => setForm({...form, phone: e.target.value})} 
                  placeholder="Ej: 341 555 1234" 
                />
              </div>
              <button type="submit" className={styles.crm__submitBtn}>
                ➕ Agregar Cliente
              </button>
            </form>
          </div>
        </section>

        <section className={styles.crm__listSection}>
          <div className={styles.crm__card}>
            <h3>Cartera de Clientes</h3>
            <table className={styles.crm__table}>
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Teléfono</th>
                  <th>Deuda Activa</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {clients.length === 0 ? (
                  <tr>
                    <td colSpan="4" className={styles.crm__empty}>No hay clientes registrados aún.</td>
                  </tr>
                ) : (
                  clients.map(client => (
                    <tr key={client.id}>
                      <td><strong>{client.name}</strong></td>
                      <td>{client.phone || '-'}</td>
                      <td>
                        <span className={client.debt > 0 ? styles['crm__text--danger'] : styles['crm__text--success']}>
                          ${client.debt.toFixed(2)}
                        </span>
                      </td>
                      <td>
                        <button 
                          className={styles.crm__payBtn} 
                          onClick={() => handleRegisterPayment(client)}
                          disabled={client.debt <= 0}
                        >
                          💰 Recibir Pago
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
