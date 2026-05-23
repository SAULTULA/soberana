import React, { useState, useEffect } from 'react';
import styles from './Inventory.module.css';
import { DatabaseService } from '../../utils/database';

export function Inventory({ currentUser }) {
  const [products, setProducts] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    purchasePrice: '',
    margin: '',
    stock: ''
  });

  const loadProducts = async () => {
    const data = await DatabaseService.getRecords('products');
    setProducts(data);
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const calculateSellPrice = (price, margin) => {
    const p = parseFloat(price) || 0;
    const m = parseFloat(margin) || 0;
    return p + (p * (m / 100));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleEdit = (product) => {
    setEditingId(product.id);
    setFormData({
      name: product.name,
      purchasePrice: product.purchasePrice,
      margin: product.margin,
      stock: product.stock
    });
    // Hacer scroll arriba para que vea el formulario
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setFormData({ name: '', purchasePrice: '', margin: '', stock: '' });
  };

  const handleAddStock = async (product) => {
    const amountStr = window.prompt(`¿Cuántas unidades adicionales de "${product.name}" ingresan?`);
    if (!amountStr) return;
    
    const amount = parseInt(amountStr);
    if (isNaN(amount) || amount <= 0) {
      alert('Por favor ingresa un número válido.');
      return;
    }

    const updatedProduct = { ...product, stock: product.stock + amount };
    await DatabaseService.saveRecord('products', updatedProduct);
    
    // Registrar el gasto/movimiento si lo deseas (Opcional, por ahora solo sumamos stock)
    // await DatabaseService.saveRecord('ledger', { ... });
    
    loadProducts();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.purchasePrice || !formData.margin) return;

    const sellPrice = calculateSellPrice(formData.purchasePrice, formData.margin);
    
    const productData = {
      id: editingId || Date.now().toString(),
      name: formData.name,
      purchasePrice: parseFloat(formData.purchasePrice),
      margin: parseFloat(formData.margin),
      sellPrice: sellPrice,
      stock: parseInt(formData.stock) || 0,
      createdAt: editingId ? undefined : new Date().toISOString()
    };

    const stockInput = parseInt(formData.stock) || 0;

    if (editingId) {
      // Si estamos editando, conservamos el createdAt original si es posible
      const existingProduct = products.find(p => p.id === editingId);
      if (existingProduct) {
        productData.createdAt = existingProduct.createdAt;
        
        // Bloqueo de resta de stock para vendedores
        if (currentUser?.role === 'SELLER' && stockInput < existingProduct.stock) {
          alert('Permiso denegado: Los vendedores no pueden restar stock manualmente. Solo pueden sumar. Para dar de baja mercadería, avisa al Administrador.');
          return;
        }
      }
    }

    productData.stock = stockInput;

    await DatabaseService.saveRecord('products', productData);
    
    handleCancelEdit();
    loadProducts();
  };

  return (
    <div className={styles.inventory}>
      <header className={styles.inventory__header}>
        <h2 className="texto-dorado">Gestión de Inventario y Precios</h2>
        <p className={styles.inventory__subtitle}>Carga de productos y cálculo de margen</p>
      </header>

      <section className={styles.inventory__formSection}>
        <form className={styles.inventory__form} onSubmit={handleSubmit}>
          <div className={styles.inventory__formGroup}>
            <label>Nombre del Producto</label>
            <input 
              type="text" 
              name="name" 
              value={formData.name} 
              onChange={handleChange} 
              placeholder="Ej: Auriculares M10" 
              required 
            />
          </div>
          <div className={styles.inventory__formGroup}>
            <label>Precio de Compra ($)</label>
            <input 
              type="number" 
              name="purchasePrice" 
              value={formData.purchasePrice} 
              onChange={handleChange} 
              placeholder="0.00" 
              step="0.01"
              required 
            />
          </div>
          <div className={styles.inventory__formGroup}>
            <label>Ganancia Esperada (%)</label>
            <input 
              type="number" 
              name="margin" 
              value={formData.margin} 
              onChange={handleChange} 
              placeholder="Ej: 30" 
              required 
            />
          </div>
          <div className={styles.inventory__formGroup}>
            <label>Stock Inicial</label>
            <input 
              type="number" 
              name="stock" 
              value={formData.stock} 
              onChange={handleChange} 
              placeholder="0" 
            />
          </div>
          
          <div className={styles.inventory__pricePreview}>
            <span>Precio de Venta Sugerido:</span>
            <strong>${calculateSellPrice(formData.purchasePrice, formData.margin).toFixed(2)}</strong>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
            <button type="submit" className={styles.inventory__submitBtn}>
              {editingId ? '🔄 Actualizar Producto' : '💾 Guardar Producto'}
            </button>
            {editingId && (
              <button type="button" className={styles.inventory__actionBtn} onClick={handleCancelEdit} style={{ padding: '12px 16px' }}>
                ❌ Cancelar
              </button>
            )}
          </div>
        </form>
      </section>

      <section className={styles.inventory__listSection}>
        <h3>Catálogo Actual</h3>
        <div className={styles.inventory__tableWrapper}>
          <table className={styles.inventory__table}>
            <thead>
              <tr>
                <th>Producto</th>
                <th>Costo</th>
                <th>Margen</th>
                <th>Precio Venta</th>
                <th>Stock</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {products.length === 0 ? (
                <tr>
                  <td colSpan="6" className={styles.inventory__empty}>No hay productos cargados.</td>
                </tr>
              ) : (
                products.map(p => (
                  <tr key={p.id}>
                    <td>{p.name}</td>
                    <td>${p.purchasePrice.toFixed(2)}</td>
                    <td>{p.margin}%</td>
                    <td><strong>${p.sellPrice.toFixed(2)}</strong></td>
                    <td>
                      <span className={`${styles.inventory__stockBadge} ${p.stock <= 3 ? styles['inventory__stockBadge--low'] : ''}`}>
                        {p.stock}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button className={styles.inventory__actionBtn} onClick={() => handleEdit(p)}>✏️ Editar</button>
                        <button className={styles.inventory__actionBtn} onClick={() => handleAddStock(p)}>+ Stock</button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
