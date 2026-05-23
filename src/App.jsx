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
import { Manual } from './features/manual/Manual';
import { DatabaseService } from './utils/database';
import './styles/global.css';

function App() {
  const [currentView, setCurrentView] = useState('dashboard');
  const [currentUser, setCurrentUser] = useState(null);
  const [globalConfig, setGlobalConfig] = useState({ businessName: 'Mi Negocio', theme: 'default' });

  useEffect(() => {
    // Cargar configuraciones al iniciar la app
    const loadConfig = async () => {
      const settingsData = await DatabaseService.getRecords('settings');
      const nameSetting = settingsData.find(s => s.key === 'businessName');
      const themeSetting = settingsData.find(s => s.key === 'theme');
      
      const theme = themeSetting ? themeSetting.value : 'default';
      const bName = nameSetting ? nameSetting.value : 'Soberana';
      
      setGlobalConfig({ businessName: bName, theme });
      
      // Aplicar tema
      document.documentElement.setAttribute('data-theme', theme);
    };
    loadConfig();
  }, []);

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
