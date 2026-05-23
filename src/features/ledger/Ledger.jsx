import React, { useState, useEffect } from 'react';
import styles from './Ledger.module.css';
import { DatabaseService } from '../../utils/database';

export function Ledger() {
  const [entries, setEntries] = useState([]);
  const [expenseForm, setExpenseForm] = useState({
    description: '',
    amount: '',
    category: 'Operativo'
  });

  const loadLedger = async () => {
    const data = await DatabaseService.getRecords('ledger');
    // Ordenar por fecha descendente
    data.sort((a, b) => new Date(b.date) - new Date(a.date));
    setEntries(data);
  };

  useEffect(() => {
    loadLedger();
  }, []);

  const openEntries = entries.filter(e => !e.closureId);
  const totalIncome = openEntries.filter(e => e.type === 'INCOME').reduce((acc, curr) => acc + curr.amount, 0);
  const totalExpense = openEntries.filter(e => e.type === 'EXPENSE').reduce((acc, curr) => acc + curr.amount, 0);
  const balance = totalIncome - totalExpense;

  const handleCloseRegister = async () => {
    if (openEntries.length === 0) {
      alert('La caja ya está cerrada o no hay movimientos nuevos.');
      return;
    }

    const fondoStr = window.prompt(`Cierre de Caja\nCaja Actual: $${balance.toFixed(2)}\n\n¿Cuánto dinero quedará en caja como fondo para mañana?`);
    if (fondoStr === null) return; // Cancelado

    const fondoCaja = parseFloat(fondoStr) || 0;
    const closureId = `CLOSURE-${Date.now()}`;

    // 1. Guardar el registro del cierre
    const closureRecord = {
      id: closureId,
      date: new Date().toISOString(),
      totalIncome,
      totalExpense,
      balance,
      fondoCaja
    };
    await DatabaseService.saveRecord('closures', closureRecord);

    // 2. Marcar todos los movimientos abiertos como cerrados
    for (const entry of openEntries) {
      const updatedEntry = { ...entry, closureId };
      await DatabaseService.saveRecord('ledger', updatedEntry);
    }

    // 3. Crear el fondo de caja inicial para la siguiente apertura
    if (fondoCaja > 0) {
      const initialFundEntry = {
        id: Date.now().toString(),
        type: 'INCOME',
        amount: fondoCaja,
        description: 'Fondo de Caja (Apertura)',
        date: new Date().toISOString()
      };
      await DatabaseService.saveRecord('ledger', initialFundEntry);
    }

    alert('✅ Caja cerrada exitosamente.');
    loadLedger();
  };

  const handleExpenseSubmit = async (e) => {
    e.preventDefault();
    if (!expenseForm.description || !expenseForm.amount) return;

    const expenseEntry = {
      id: Date.now().toString(),
      type: 'EXPENSE',
      category: expenseForm.category,
      amount: parseFloat(expenseForm.amount),
      description: `Egreso (${expenseForm.category}): ${expenseForm.description}`,
      date: new Date().toISOString()
    };

    await DatabaseService.saveRecord('ledger', expenseEntry);
    setExpenseForm({ description: '', amount: '', category: 'Operativo' });
    loadLedger();
  };

  return (
    <div className={styles.ledger}>
      <header className={styles.ledger__header} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 className="texto-dorado">Libro Diario y Caja</h2>
          <p className={styles.ledger__subtitle}>Movimientos y consolidación del día</p>
        </div>
        <button className={styles.ledger__submitBtn} onClick={handleCloseRegister} style={{ backgroundColor: 'var(--color-primary)' }}>
          🔒 Cerrar Caja del Día
        </button>
      </header>

      <section className={styles.ledger__summary}>
        <div className={styles.ledger__summaryCard}>
          <span>Ingresos Totales</span>
          <strong className={styles['ledger__text--success']}>${totalIncome.toFixed(2)}</strong>
        </div>
        <div className={styles.ledger__summaryCard}>
          <span>Egresos Totales</span>
          <strong className={styles['ledger__text--danger']}>${totalExpense.toFixed(2)}</strong>
        </div>
        <div className={`${styles.ledger__summaryCard} ${styles['ledger__summaryCard--main']}`}>
          <span>Caja Actual</span>
          <strong className={balance >= 0 ? styles['ledger__text--success'] : styles['ledger__text--danger']}>
            ${balance.toFixed(2)}
          </strong>
        </div>
      </section>

      <section className={styles.ledger__formSection}>
        <h3>Registrar Movimiento Manual</h3>
        <form className={styles.ledger__form} onSubmit={handleExpenseSubmit}>
          <div className={styles.ledger__formGroup}>
            <label>Tipo de Gasto</label>
            <select 
              className={styles.ledger__input}
              value={expenseForm.category}
              onChange={(e) => setExpenseForm({...expenseForm, category: e.target.value})}
              required
            >
              <option value="Operativo">Operativo (Suministros, Sueldos, Luz)</option>
              <option value="Inversión">Inversión (Muebles, Equipos)</option>
              <option value="Financiero">Financiero (Cuotas, Intereses)</option>
            </select>
          </div>
          <div className={styles.ledger__formGroup}>
            <label>Concepto</label>
            <input 
              type="text" 
              className={styles.ledger__input}
              value={expenseForm.description}
              onChange={(e) => setExpenseForm({...expenseForm, description: e.target.value})}
              placeholder="Descripción del movimiento"
              required 
            />
          </div>
          <div className={styles.ledger__formGroup}>
            <label>Monto ($)</label>
            <input 
              type="number" 
              className={styles.ledger__input}
              value={expenseForm.amount}
              onChange={(e) => setExpenseForm({...expenseForm, amount: e.target.value})}
              placeholder="0.00"
              step="0.01"
              required 
            />
          </div>
          <button type="submit" className={styles.ledger__submitBtn}>
            ➖ Registrar Gasto
          </button>
        </form>
      </section>

      <section className={styles.ledger__tableWrapper}>
        <table className={styles.ledger__table}>
          <thead>
            <tr>
              <th>Fecha y Hora</th>
              <th>Descripción</th>
              <th>Tipo</th>
              <th>Monto</th>
            </tr>
          </thead>
          <tbody>
            {entries.length === 0 ? (
              <tr>
                <td colSpan="4" className={styles.ledger__empty}>No hay movimientos registrados.</td>
              </tr>
            ) : (
              entries.map(e => (
                <tr key={e.id}>
                  <td>{new Date(e.date).toLocaleString('es-ES')}</td>
                  <td>{e.description}</td>
                  <td>
                    <span className={`${styles.ledger__badge} ${e.type === 'INCOME' ? styles['ledger__badge--income'] : styles['ledger__badge--expense']}`}>
                      {e.type === 'INCOME' ? 'Ingreso' : 'Egreso'}
                    </span>
                  </td>
                  <td>
                    <strong className={e.type === 'INCOME' ? styles['ledger__text--success'] : styles['ledger__text--danger']}>
                      {e.type === 'INCOME' ? '+' : '-'}${e.amount.toFixed(2)}
                    </strong>
                    {e.closureId && <span style={{ marginLeft: '8px', fontSize: '10px', color: 'gray' }}>🔒 Cerrado</span>}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
