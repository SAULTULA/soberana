import React, { useState, useEffect } from 'react';
import styles from './Pos.module.css';
import { DatabaseService } from '../../utils/database';

export function Pos() {
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [cart, setCart] = useState([]);
  const [message, setMessage] = useState('');
  const [clients, setClients] = useState([]);
  const [paymentMode, setPaymentMode] = useState('cash'); 
  const [selectedClient, setSelectedClient] = useState('');

  // Estados de la Calculadora
  const [display, setDisplay] = useState('0');
  const [equation, setEquation] = useState('');

  const loadData = async () => {
    const productsData = await DatabaseService.getRecords('products');
    setProducts(productsData.filter(p => p.stock > 0));

    const clientsData = await DatabaseService.getRecords('clients');
    setClients(clientsData);
  };

  useEffect(() => {
    loadData();
  }, []);

  const productObj = products.find(p => p.id === selectedProduct);

  const handleAddToCart = (e) => {
    e.preventDefault();
    if (!productObj || quantity < 1) return;

    // Verificar stock disponible considerando lo que ya está en el carrito
    const inCart = cart.find(item => item.product.id === productObj.id);
    const inCartQty = inCart ? inCart.quantity : 0;
    
    if (quantity + inCartQty > productObj.stock) {
      setMessage(`❌ No hay suficiente stock. Disponible: ${productObj.stock - inCartQty}`);
      setTimeout(() => setMessage(''), 3000);
      return;
    }

    setCart(prev => {
      const existing = prev.find(item => item.product.id === productObj.id);
      if (existing) {
        return prev.map(item => 
          item.product.id === productObj.id 
            ? { ...item, quantity: item.quantity + quantity, subtotal: (item.quantity + quantity) * productObj.sellPrice }
            : item
        );
      } else {
        return [...prev, { product: productObj, quantity, subtotal: quantity * productObj.sellPrice }];
      }
    });

    setSelectedProduct('');
    setQuantity(1);
  };

  const handleAddCustomAmount = () => {
    const amount = parseFloat(display);
    if (amount <= 0) return;

    setCart(prev => {
      const existing = prev.find(item => item.product.id === 'varios');
      if (existing) {
        return prev.map(item => 
          item.product.id === 'varios' 
            ? { ...item, quantity: item.quantity + 1, subtotal: item.subtotal + amount }
            : item
        );
      } else {
        return [...prev, { 
          product: { id: 'varios', name: 'Varios (Fuera de stock)', sellPrice: amount }, 
          quantity: 1, 
          subtotal: amount 
        }];
      }
    });
    setMessage(`✅ Agregado "Varios" por $${amount.toFixed(2)}`);
    setDisplay('0');
    setEquation('');
    setTimeout(() => setMessage(''), 3000);
  };

  // Lógica de Calculadora
  const handleNumber = (num) => setDisplay(display === '0' ? num : display + num);
  const handleOperator = (op) => { setEquation(display + ' ' + op + ' '); setDisplay('0'); };
  const handleClear = () => { setDisplay('0'); setEquation(''); };
  const handleBackspace = () => setDisplay(display.length > 1 ? display.slice(0, -1) : '0');
  const handleEqual = () => {
    try {
      const sanitized = (equation + display).replace(/[^-()\d/*+.]/g, '');
      const calculate = new Function('return ' + (sanitized || '0'));
      setDisplay(String(calculate()));
      setEquation('');
    } catch (e) {
      setDisplay('Error');
    }
  };

  const handleRemoveFromCart = (productId) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
  };

  const cartTotal = cart.reduce((acc, curr) => acc + curr.subtotal, 0);

  const handleCheckout = async () => {
    if (cart.length === 0) return;

    try {
      const ticketId = `TKT-${Date.now()}`;
      
      // 1. Actualizar el stock de todos los productos (excepto Varios)
      for (const item of cart) {
        if (item.product.id === 'varios') continue; // No reducir stock de genéricos

        const productToUpdate = products.find(p => p.id === item.product.id);
        if (productToUpdate) {
          const updatedProduct = { ...productToUpdate, stock: productToUpdate.stock - item.quantity };
          await DatabaseService.saveRecord('products', updatedProduct);
        }
      }

      // 2. Crear el registro de la venta (Ticket)
      const saleEntry = {
        id: ticketId,
        items: cart,
        total: cartTotal,
        date: new Date().toISOString(),
        paymentMode,
        clientId: paymentMode === 'credit' ? selectedClient : null
      };
      await DatabaseService.saveRecord('sales', saleEntry);

      // 3. Lógica según método de pago
      if (paymentMode === 'credit') {
        const clientObj = clients.find(c => c.id === selectedClient);
        if (clientObj) {
          const newDebt = clientObj.debt + cartTotal;
          if (newDebt > 60000) {
            window.alert(`⚠️ AVISO: La deuda de ${clientObj.name} ahora es de $${newDebt.toFixed(2)}, superando el límite de $60,000.`);
          }
          const updatedClient = { ...clientObj, debt: newDebt };
          await DatabaseService.saveRecord('clients', updatedClient);
        }
      } else {
        // Registrar en el libro diario (Ledger) si es pago en efectivo
        const ledgerEntry = {
          id: Date.now().toString(),
          type: 'INCOME',
          amount: cartTotal,
          description: `Cobro de Ticket #${ticketId}`,
          date: new Date().toISOString(),
          linkedTicket: ticketId
        };
        await DatabaseService.saveRecord('ledger', ledgerEntry);
      }

      setMessage(`✅ Venta procesada exitosamente. Ticket: ${ticketId}`);
      setCart([]);
      setPaymentMode('cash');
      setSelectedClient('');
      loadData();
      setTimeout(() => setMessage(''), 4000);
    } catch (err) {
      setMessage('❌ Error procesando la venta.');
    }
  };

  return (
    <div className={styles.pos}>
      <header className={styles.pos__header}>
        <h2 className="texto-dorado">Punto de Venta</h2>
        <p className={styles.pos__subtitle}>Registradora todo-en-uno</p>
      </header>

      {message && <div className={styles.pos__alert}>{message}</div>}

      <div className={styles.pos__layout}>
        {/* Columna Izquierda: Ticket */}
        <section className={styles.pos__terminal}>
          <form className={styles.pos__form} onSubmit={handleAddToCart}>
            <div className={styles.pos__formGroup}>
              <label>Seleccionar Producto</label>
              <select 
                value={selectedProduct} 
                onChange={(e) => setSelectedProduct(e.target.value)}
                required
              >
                <option value="" disabled>-- Elige un producto --</option>
                {products.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} - ${p.sellPrice.toFixed(2)} (Stk: {p.stock})
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.pos__formGroup}>
              <label>Cantidad</label>
              <input 
                type="number" 
                min="1" 
                value={quantity} 
                onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                required 
              />
            </div>

            <button type="submit" className={styles.pos__addBtn} disabled={!selectedProduct}>
              ➕ Agregar
            </button>
          </form>

          {cart.length > 0 && (
            <div className={styles.pos__cartList}>
              {cart.map((item, idx) => (
                <div key={idx} className={styles.pos__cartItem}>
                  <div className={styles.pos__cartItemInfo}>
                    <span className={styles.pos__cartItemTitle}>{item.product.name} (x{item.quantity})</span>
                    <span className={styles.pos__cartItemPrice}>${item.product.sellPrice.toFixed(2)} c/u</span>
                  </div>
                  <strong>${item.subtotal.toFixed(2)}</strong>
                  <button type="button" className={styles.pos__removeBtn} onClick={() => handleRemoveFromCart(item.product.id)}>
                    ❌
                  </button>
                </div>
              ))}
              
              <div className={styles.pos__totalDisplay} style={{ marginTop: '16px' }}>
                <span>Total a Cobrar</span>
                <strong>${cartTotal.toFixed(2)}</strong>
              </div>

              <div className={styles.pos__paymentOptions} style={{ marginTop: '16px', display: 'flex', gap: '10px', flexDirection: 'column' }}>
                <div className={styles.pos__formGroup}>
                  <label>Método de Pago</label>
                  <select value={paymentMode} onChange={(e) => setPaymentMode(e.target.value)}>
                    <option value="cash">💵 Efectivo (Suma a Caja)</option>
                    <option value="credit">📝 Fiar a Cuenta (Crea Deuda)</option>
                  </select>
                </div>

                {paymentMode === 'credit' && (
                  <div className={styles.pos__formGroup}>
                    <label>Seleccionar Cliente</label>
                    <select value={selectedClient} onChange={(e) => setSelectedClient(e.target.value)} required>
                      <option value="" disabled>-- Elige un cliente --</option>
                      {clients.map(c => (
                        <option key={c.id} value={c.id}>{c.name} (Debe: ${c.debt.toFixed(2)})</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <button 
                type="button" 
                className={styles.pos__submitBtn} 
                onClick={handleCheckout} 
                style={{ width: '100%', marginTop: '16px' }}
                disabled={paymentMode === 'credit' && !selectedClient}
              >
                💳 Procesar Venta / Emitir Ticket
              </button>
            </div>
          )}
        </section>

        {/* Columna Derecha: Calculadora */}
        <aside className={styles.calc}>
          <div className={styles.calc__screen}>
            <div className={styles.calc__equation}>{equation}</div>
            <div className={styles.calc__display}>{display}</div>
          </div>

          <div className={styles.calc__keypad}>
            <button className={styles.calc__btnAction} onClick={handleClear}>C</button>
            <button className={styles.calc__btnAction} onClick={handleBackspace}>⌫</button>
            <button className={styles.calc__btnOp} onClick={() => handleOperator('/')}>÷</button>
            <button className={styles.calc__btnOp} onClick={() => handleOperator('*')}>×</button>

            <button className={styles.calc__btnNum} onClick={() => handleNumber('7')}>7</button>
            <button className={styles.calc__btnNum} onClick={() => handleNumber('8')}>8</button>
            <button className={styles.calc__btnNum} onClick={() => handleNumber('9')}>9</button>
            <button className={styles.calc__btnOp} onClick={() => handleOperator('-')}>−</button>

            <button className={styles.calc__btnNum} onClick={() => handleNumber('4')}>4</button>
            <button className={styles.calc__btnNum} onClick={() => handleNumber('5')}>5</button>
            <button className={styles.calc__btnNum} onClick={() => handleNumber('6')}>6</button>
            <button className={styles.calc__btnOp} onClick={() => handleOperator('+')}>+</button>

            <button className={styles.calc__btnNum} onClick={() => handleNumber('1')}>1</button>
            <button className={styles.calc__btnNum} onClick={() => handleNumber('2')}>2</button>
            <button className={styles.calc__btnNum} onClick={() => handleNumber('3')}>3</button>
            <button className={styles.calc__btnEqual} style={{ gridRow: 'span 2' }} onClick={handleEqual}>=</button>

            <button className={styles.calc__btnNum} style={{ gridColumn: 'span 2' }} onClick={() => handleNumber('0')}>0</button>
            <button className={styles.calc__btnNum} onClick={() => handleNumber('.')}>.</button>
          </div>

          <button className={styles.calc__addCartBtn} onClick={handleAddCustomAmount}>
            ➕ Agregar "Varios" al Ticket
          </button>
        </aside>
      </div>
    </div>
  );
}
