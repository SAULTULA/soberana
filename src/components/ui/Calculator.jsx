import React, { useState } from 'react';
import styles from './Calculator.module.css';

export function Calculator({ onClose, onAddToCart }) {
  const [display, setDisplay] = useState('0');
  const [equation, setEquation] = useState('');
  
  const handleNumber = (num) => {
    setDisplay(display === '0' ? num : display + num);
  };

  const handleOperator = (op) => {
    setEquation(display + ' ' + op + ' ');
    setDisplay('0');
  };

  const handleEqual = () => {
    try {
      // Usamos eval de forma segura porque solo permitimos números y operadores
      // en un entorno controlado.
      const sanitized = (equation + display).replace(/[^-()\d/*+.]/g, '');
      const result = eval(sanitized);
      setDisplay(String(result));
      setEquation('');
    } catch (e) {
      setDisplay('Error');
    }
  };

  const handleClear = () => {
    setDisplay('0');
    setEquation('');
  };

  const handleBackspace = () => {
    setDisplay(display.length > 1 ? display.slice(0, -1) : '0');
  };

  const handleAddCart = () => {
    const value = parseFloat(display);
    if (value > 0 && onAddToCart) {
      onAddToCart(value);
      setDisplay('0');
      setEquation('');
    }
  };

  return (
    <div className={styles.calculatorOverlay}>
      <div className={styles.calculator}>
        <div className={styles.calculator__header}>
          <span>🧮 Caja Registradora</span>
          <button className={styles.calculator__closeBtn} onClick={onClose}>✖</button>
        </div>
        
        <div className={styles.calculator__screen}>
          <div className={styles.calculator__equation}>{equation}</div>
          <div className={styles.calculator__display}>{display}</div>
        </div>

        <div className={styles.calculator__keypad}>
          <button className={styles.calculator__btnAction} onClick={handleClear}>C</button>
          <button className={styles.calculator__btnAction} onClick={handleBackspace}>⌫</button>
          <button className={styles.calculator__btnOp} onClick={() => handleOperator('/')}>÷</button>
          <button className={styles.calculator__btnOp} onClick={() => handleOperator('*')}>×</button>

          <button className={styles.calculator__btnNum} onClick={() => handleNumber('7')}>7</button>
          <button className={styles.calculator__btnNum} onClick={() => handleNumber('8')}>8</button>
          <button className={styles.calculator__btnNum} onClick={() => handleNumber('9')}>9</button>
          <button className={styles.calculator__btnOp} onClick={() => handleOperator('-')}>−</button>

          <button className={styles.calculator__btnNum} onClick={() => handleNumber('4')}>4</button>
          <button className={styles.calculator__btnNum} onClick={() => handleNumber('5')}>5</button>
          <button className={styles.calculator__btnNum} onClick={() => handleNumber('6')}>6</button>
          <button className={styles.calculator__btnOp} onClick={() => handleOperator('+')}>+</button>

          <button className={styles.calculator__btnNum} onClick={() => handleNumber('1')}>1</button>
          <button className={styles.calculator__btnNum} onClick={() => handleNumber('2')}>2</button>
          <button className={styles.calculator__btnNum} onClick={() => handleNumber('3')}>3</button>
          <button className={styles.calculator__btnEqual} style={{ gridRow: 'span 2' }} onClick={handleEqual}>=</button>

          <button className={styles.calculator__btnNum} style={{ gridColumn: 'span 2' }} onClick={() => handleNumber('0')}>0</button>
          <button className={styles.calculator__btnNum} onClick={() => handleNumber('.')}>.</button>
        </div>

        {onAddToCart && (
          <button className={styles.calculator__addCartBtn} onClick={handleAddCart}>
            ➕ Agregar al Ticket
          </button>
        )}
      </div>
    </div>
  );
}
