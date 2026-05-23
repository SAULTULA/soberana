import React, { useState, useEffect } from 'react';
import styles from './Settings.module.css';
import { DatabaseService } from '../../utils/database';

export function Settings({ currentUser, onConfigChange }) {
  const [businessName, setBusinessName] = useState('');
  const [theme, setTheme] = useState('default');
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState('');

  // Staff Management State
  const [staff, setStaff] = useState([]);
  const [newStaff, setNewStaff] = useState({ name: '', lastName: '', pin: '' });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const settings = await DatabaseService.getRecords('settings');
    const nameSetting = settings.find(s => s.key === 'businessName');
    const themeSetting = settings.find(s => s.key === 'theme');
    
    if (nameSetting) setBusinessName(nameSetting.value);
    if (themeSetting) setTheme(themeSetting.value);
    
    // Load staff
    const usersData = await DatabaseService.getRecords('users');
    setStaff(usersData);
    
    setLoading(false);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaveStatus('Guardando...');

    // Save or update settings in IndexedDB
    await updateSetting('businessName', businessName);
    await updateSetting('theme', theme);

    // Update global state in App.jsx
    onConfigChange({ businessName, theme });

    setSaveStatus('¡Guardado!');
    setTimeout(() => setSaveStatus(''), 2000);
  };

  const updateSetting = async (key, value) => {
    const settings = await DatabaseService.getRecords('settings');
    const existing = settings.find(s => s.key === key);
    if (existing) {
      await DatabaseService.saveRecord('settings', { ...existing, value });
    } else {
      await DatabaseService.saveRecord('settings', { id: key, key, value });
    }
  };

  const handleThemeSelect = (selectedTheme) => {
    setTheme(selectedTheme);
  };

  const handleCreateStaff = async (e) => {
    e.preventDefault();
    if (newStaff.pin.length < 4) {
      alert('El PIN debe tener al menos 4 dígitos.');
      return;
    }
    const exists = staff.find(s => s.pin === newStaff.pin);
    if (exists) {
      alert('Ese PIN ya está en uso. Elige otro.');
      return;
    }
    const newUser = {
      id: `seller-${Date.now()}`,
      name: `${newStaff.name} ${newStaff.lastName}`.trim(),
      pin: newStaff.pin,
      role: 'SELLER'
    };
    await DatabaseService.saveRecord('users', newUser);
    setStaff([...staff, newUser]);
    setNewStaff({ name: '', lastName: '', pin: '' });
    alert('Vendedor creado exitosamente.');
  };

  const handleDeleteStaff = async (userId) => {
    if(!window.confirm('¿Seguro que quieres eliminar este perfil?')) return;
    await DatabaseService.deleteRecord('users', userId);
    setStaff(staff.filter(s => s.id !== userId));
  };

  if (loading) return <div className="texto-dorado">Cargando configuración...</div>;

  return (
    <div className={styles.settings}>
      <header className={styles.settings__header}>
        <h2 className="texto-dorado">Configuración del Sistema</h2>
        <div className="divider-dorado"></div>
        <p className="texto-dorado-italic">Personaliza tu punto de venta</p>
      </header>

      <form className={styles.settings__form} onSubmit={handleSave}>
        
        {/* Sección de Negocio */}
        <section className={styles.settings__section}>
          <h3 className={styles.settings__sectionTitle}>Perfil del Negocio</h3>
          <div className={styles.formGroup}>
            <label>Nombre del Local</label>
            <input 
              type="text" 
              value={businessName} 
              onChange={(e) => setBusinessName(e.target.value)} 
              placeholder="Ej: KSM Servicios"
              className={styles.inputField}
            />
          </div>
        </section>

        {/* Sección de Temas */}
        <section className={styles.settings__section}>
          <h3 className={styles.settings__sectionTitle}>Apariencia (Skins)</h3>
          <div className={styles.themeGallery}>
            
            <div 
              className={`${styles.themeCard} ${theme === 'default' ? styles.themeCardActive : ''}`}
              onClick={() => handleThemeSelect('default')}
            >
              <div className={`${styles.themePreview} ${styles.previewDefault}`}>
                <div className={styles.previewBox}></div>
              </div>
              <h4>Titán Dorado</h4>
              <p>Dark Neumorphism 3D</p>
            </div>

            <div 
              className={`${styles.themeCard} ${theme === 'neobrutalism' ? styles.themeCardActive : ''}`}
              onClick={() => handleThemeSelect('neobrutalism')}
            >
              <div className={`${styles.themePreview} ${styles.previewNeo}`}>
                <div className={styles.previewBox}></div>
              </div>
              <h4>Neo-Brutalism</h4>
              <p>Bordes gruesos y colores sólidos</p>
            </div>

            <div 
              className={`${styles.themeCard} ${theme === 'scifi' ? styles.themeCardActive : ''}`}
              onClick={() => handleThemeSelect('scifi')}
            >
              <div className={`${styles.themePreview} ${styles.previewScifi}`}>
                <div className={styles.previewBox}></div>
              </div>
              <h4>MilitariHUD</h4>
              <p>Radar táctico verde neón</p>
            </div>

          </div>
        </section>

        {/* Gestión de Personal (Solo ADMIN) */}
        {currentUser?.role === 'ADMIN' && (
          <section className={styles.settings__section}>
            <h3 className={styles.settings__sectionTitle}>Gestión de Personal</h3>
            <p style={{ color: 'var(--color-text-muted)', marginBottom: '15px' }}>Crea perfiles para tus cajeros/vendedores. No podrán acceder a esta configuración ni restar inventario manualmente.</p>
            
            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
              <input 
                type="text" 
                placeholder="Nombre" 
                className={styles.inputField} 
                style={{ flex: 1 }}
                value={newStaff.name}
                onChange={(e) => setNewStaff({...newStaff, name: e.target.value})}
              />
              <input 
                type="text" 
                placeholder="Apellido" 
                className={styles.inputField} 
                style={{ flex: 1 }}
                value={newStaff.lastName}
                onChange={(e) => setNewStaff({...newStaff, lastName: e.target.value})}
              />
              <input 
                type="number" 
                placeholder="PIN (ej: 4455)" 
                className={styles.inputField} 
                style={{ width: '120px' }}
                value={newStaff.pin}
                onChange={(e) => setNewStaff({...newStaff, pin: e.target.value})}
              />
              <button 
                type="button" 
                className={styles.saveBtn} 
                style={{ backgroundColor: 'var(--color-success)', width: 'auto' }}
                onClick={handleCreateStaff}
              >
                + Crear Vendedor
              </button>
            </div>

            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {staff.map(user => (
                <li key={user.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                  <span>
                    <strong style={{ color: user.role === 'ADMIN' ? 'var(--color-warning)' : 'var(--color-primary)' }}>[{user.role}]</strong> {user.name} 
                    <span style={{ color: 'var(--color-text-muted)', marginLeft: '10px' }}>(PIN: {user.pin})</span>
                  </span>
                  {user.role !== 'ADMIN' && (
                    <button type="button" onClick={() => handleDeleteStaff(user.id)} style={{ background: 'transparent', border: 'none', color: 'var(--color-danger)', cursor: 'pointer' }}>❌ Eliminar</button>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        <div className={styles.settings__actions}>
          <button type="submit" className={styles.saveBtn}>Guardar Cambios</button>
          {saveStatus && <span className={styles.saveStatus}>{saveStatus}</span>}
        </div>
      </form>
    </div>
  );
}
