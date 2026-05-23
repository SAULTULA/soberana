import React, { useState, useEffect } from 'react';
import { Layout } from './components/layout/Layout';
import { Dashboard } from './features/dashboard/Dashboard';
import { Inventory } from './features/inventory/Inventory';
import { Pos } from './features/pos/Pos';
import { Ledger } from './features/ledger/Ledger';
import { Settings } from './features/settings/Settings';
import { SalesHistory } from './features/sales/SalesHistory';
import { Crm } from './features/crm/Crm';
import { Auth } from './features/auth/Auth';
import { CloudLogin } from './features/auth/CloudLogin';
import { Manual } from './features/manual/Manual';
import { DatabaseService, supabase } from './utils/database';
import './styles/global.css';

function App() {
  const [currentView, setCurrentView] = useState('dashboard');
  const [currentUser, setCurrentUser] = useState(null);
  const [globalConfig, setGlobalConfig] = useState({ businessName: 'Mi Negocio', theme: 'default' });
  const [cloudSession, setCloudSession] = useState('checking');

  useEffect(() => {
    // 1. Verificar sesión Cloud (SaaS) - TANTO EN WEB COMO EN ESCRITORIO
    // Esto es crucial para que el .exe sepa a qué comercio (tenant_id) pertenece
    supabase.auth.getSession().then(({ data: { session } }) => {
      setCloudSession(session ? session : null);
    });
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setCloudSession(session ? session : null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    // 2. Cargar configuraciones al iniciar la app
    const loadConfig = async () => {
      const settingsData = await DatabaseService.getRecords('settings');
      const nameSetting = settingsData.find(s => s.key === 'businessName');
      const themeSetting = settingsData.find(s => s.key === 'theme');
      
      const theme = themeSetting ? themeSetting.value : 'default';
      const bName = nameSetting ? nameSetting.value : 'Soberana';
      
      setGlobalConfig({ businessName: bName, theme });
      
      document.documentElement.setAttribute('data-theme', theme);
    };
    if (cloudSession !== 'checking' && cloudSession !== null) {
      loadConfig();
      DatabaseService.subscribeToRealtime();
    }

    return () => {
      if (cloudSession !== 'checking' && cloudSession !== null) {
        DatabaseService.unsubscribeFromRealtime();
      }
    };
  }, [cloudSession]);

  const handleCloudLogin = async (session) => {
    setCloudSession(session);
    try {
      await DatabaseService.fetchCloudRecords();
    } catch (e) {
      console.error('Error restaurando backup en la nube:', e);
    }
  };

  if (cloudSession === 'checking') {
    return (
      <div className="loader-container">
        <div className="loader-content">
          <img src="./soberana.png" alt="Soberana ERP" className="loader-logo" />
          <div className="loader-spinner"></div>
          <p className="loader-text">CARGANDO SISTEMA</p>
        </div>
        <p className="loader-copyright">ksmservicios copyright@2026</p>
      </div>
    );
  }

  // Si estamos en web y no hay sesión, obligamos a loguearse como Administrador de Nube
  if (cloudSession === null) {
    return <CloudLogin onSessionReady={handleCloudLogin} />;
  }

  // Una vez con la nube autenticada (o bypass), pedimos el PIN local (Auth original)
  if (!currentUser) {
    return <Auth onLogin={setCurrentUser} />;
  }

  return (
    <Layout currentView={currentView} setCurrentView={setCurrentView} globalConfig={globalConfig} currentUser={currentUser} onLogout={() => setCurrentUser(null)}>
      {currentView === 'dashboard' && <Dashboard setCurrentView={setCurrentView} currentUser={currentUser} />}
      {currentView === 'inventory' && <Inventory currentUser={currentUser} />}
      {currentView === 'pos' && <Pos currentUser={currentUser} />}
      {currentView === 'ledger' && <Ledger currentUser={currentUser} />}
      {currentView === 'settings' && <Settings currentUser={currentUser} onConfigChange={(newConfig) => {
        setGlobalConfig(prev => ({...prev, ...newConfig}));
        if (newConfig.theme) document.documentElement.setAttribute('data-theme', newConfig.theme);
      }} />}
      {currentView === 'sales' && <SalesHistory currentUser={currentUser} />}
      {currentView === 'crm' && <Crm currentUser={currentUser} />}
      {currentView === 'manual' && <Manual />}
    </Layout>
  );
}

export default App;
