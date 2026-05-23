import React, { useState, useEffect } from 'react';
import styles from './Auth.module.css';

import { DatabaseService } from '../../utils/database';

export function Auth({ onLogin }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [users, setUsers] = useState([]);

  useEffect(() => {
    const loadUsers = async () => {
      let dbUsers = await DatabaseService.getRecords('users');
      if (dbUsers.length === 0) {
        // Create default admin
        const defaultAdmin = { id: 'admin-1', name: 'Administrador', pin: '1234', role: 'ADMIN' };
        await DatabaseService.saveRecord('users', defaultAdmin);
        dbUsers = [defaultAdmin];
      }
      setUsers(dbUsers);
    };
    loadUsers();
  }, []);

  const handleKeyPress = (digit) => {
    if (error) setError(false);
    if (pin.length < 4) {
      setPin(prev => prev + digit);
    }
  };

  const handleClear = () => {
    setPin('');
    setError(false);
  };

  const handleBackspace = () => {
    setPin(prev => prev.slice(0, -1));
    setError(false);
  };

  useEffect(() => {
    if (pin.length === 4) {
      const userFound = users.find(u => u.pin === pin);
      if (userFound) {
        onLogin(userFound);
      } else {
        setError(true);
        setTimeout(() => setPin(''), 500); // clear after short delay
      }
    }
  }, [pin, users, onLogin]);

  // Generate 4 circles for PIN visual feedback
  const renderDots = () => {
    const dots = [];
    for (let i = 0; i < 4; i++) {
      dots.push(
        <div 
          key={i} 
          className={`${styles.pinDot} ${i < pin.length ? styles.pinDotFilled : ''} ${error ? styles.pinDotError : ''}`}
        />
      );
    }
    return dots;
  };

  return (
    <div className={styles.authContainer}>
      <div className={styles.authPanel}>
        <div className={styles.authHeader}>
          <img src="/soberana.png" alt="Soberana" className={styles.authLogo} />
          <h2 className="texto-dorado" style={{ margin: '15px 0 5px 0' }}>Soberana</h2>
          <p className="texto-dorado-italic">Control de Acceso</p>
        </div>

        <div className={styles.pinDisplay}>
          {renderDots()}
        </div>
        {error && <p className={styles.errorMsg}>PIN Incorrecto</p>}

        <div className={styles.numpad}>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <button key={num} className={styles.numBtn} onClick={() => handleKeyPress(num.toString())}>
              {num}
            </button>
          ))}
          <button className={styles.actionBtn} onClick={handleClear}>C</button>
          <button className={styles.numBtn} onClick={() => handleKeyPress('0')}>0</button>
          <button className={styles.actionBtn} onClick={handleBackspace}>⌫</button>
        </div>
      </div>
    </div>
  );
}
