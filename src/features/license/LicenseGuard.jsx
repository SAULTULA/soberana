import React, { useState, useEffect } from 'react';

const SUPABASE_PROJECT_REF = 'jnscgzsmyfaqnlovxhdh';
const SUPABASE_ANON_KEY = 'sb_publishable_U6mWpXwGDIwGGGDvO7DoXA_aO1UiSKr';
const SUPABASE_EDGE_FUNCTION_URL = `https://${SUPABASE_PROJECT_REF}.supabase.co/functions/v1/verify-license`;
const APP_NAME = 'Soberana';

export function LicenseGuard({ children }) {
  const [status, setStatus] = useState('checking'); // checking, not_registered, pending, expired, approved, error
  const [hwid, setHwid] = useState('');
  const [message, setMessage] = useState('');
  const [clientName, setClientName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Si estamos en web (Vercel), no pedimos HWID, dejamos pasar
    if (!window.electronAPI) {
      setStatus('approved');
      return;
    }

    const initCheck = async () => {
      try {
        const machineId = await window.electronAPI.getHWID();
        setHwid(machineId);
        checkWithServer(machineId);
      } catch (err) {
        console.error('Error obteniendo HWID:', err);
        setStatus('error');
        setMessage('No se pudo obtener el identificador del dispositivo.');
      }
    };

    initCheck();
  }, []);

  const checkWithServer = async (machineId, name = null) => {
    try {
      const payload = { hwid: machineId, app_name: APP_NAME };
      if (name) payload.client_name = name;

      const response = await fetch(SUPABASE_EDGE_FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (data.authorized) {
        setStatus('approved');
      } else {
        setStatus(data.status || 'error');
        setMessage(data.message || 'Error desconocido.');
      }
    } catch (error) {
      console.error("[KSM License] Error crítico:", error);
      setStatus('error');
      setMessage('No se pudo conectar con el servidor de licencias.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitName = () => {
    if (clientName.trim().length > 0) {
      setIsSubmitting(true);
      checkWithServer(hwid, clientName);
    }
  };

  if (status === 'checking') {
    return (
      <div style={{ display: 'flex', height: '100vh', justifyContent: 'center', alignItems: 'center', background: '#0f1115', color: '#00e5ff', flexDirection: 'column' }}>
        <h2>Verificando Licencia...</h2>
        <p style={{ color: '#a1a5b0' }}>Iniciando conexión segura con KSM...</p>
      </div>
    );
  }

  if (status === 'not_registered') {
    return (
      <div style={{ display: 'flex', height: '100vh', justifyContent: 'center', alignItems: 'center', background: '#0f1115' }}>
        <div style={{ background: '#1a1d24', padding: '40px', borderRadius: '16px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.05)', maxWidth: '500px', width: '100%', boxShadow: '0 20px 40px rgba(0,0,0,0.4)' }}>
          <h1 style={{ color: '#6366f1', margin: '0 0 10px 0' }}>Registro Requerido</h1>
          <p style={{ color: '#a1a5b0', marginBottom: '25px' }}>Ingresa tu nombre para solicitar acceso a {APP_NAME}.</p>
          <input 
            type="text" 
            placeholder="Tu Nombre o Empresa" 
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            style={{ width: '100%', padding: '12px', marginBottom: '15px', background: '#0f1115', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white', fontSize: '16px', outline: 'none' }} 
          />
          <button 
            onClick={handleSubmitName}
            disabled={isSubmitting || clientName.trim() === ''}
            style={{ width: '100%', padding: '12px', background: isSubmitting ? '#4338ca' : '#6366f1', color: 'white', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: '600', cursor: isSubmitting ? 'not-allowed' : 'pointer' }}
          >
            {isSubmitting ? 'Enviando...' : 'Enviar Solicitud'}
          </button>
        </div>
      </div>
    );
  }

  if (status === 'pending' || status === 'blocked') {
    return (
      <div style={{ display: 'flex', height: '100vh', justifyContent: 'center', alignItems: 'center', background: '#0f1115' }}>
        <div style={{ background: '#1a1d24', padding: '40px', borderRadius: '16px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.05)', maxWidth: '500px', width: '100%', boxShadow: '0 20px 40px rgba(0,0,0,0.4)' }}>
          <h1 style={{ color: '#f59e0b', margin: '0 0 10px 0' }}>Acceso Restringido</h1>
          <p style={{ color: '#a1a5b0', marginBottom: '25px' }}>{message}</p>
          <div style={{ padding: '15px', background: '#0f1115', borderRadius: '8px', marginBottom: '20px', fontFamily: 'monospace', color: '#fff' }}>
            ID: {hwid}
          </div>
          <button 
            onClick={() => checkWithServer(hwid)}
            style={{ width: '100%', padding: '12px', background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '16px', cursor: 'pointer' }}
          >
            Refrescar Estado
          </button>
        </div>
      </div>
    );
  }

  if (status === 'expired') {
    return (
      <div style={{ display: 'flex', height: '100vh', justifyContent: 'center', alignItems: 'center', background: '#0f1115' }}>
        <div style={{ background: '#1a1d24', padding: '40px', borderRadius: '16px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.05)', maxWidth: '500px', width: '100%', boxShadow: '0 20px 40px rgba(0,0,0,0.4)' }}>
          <h1 style={{ color: '#ef4444', margin: '0 0 10px 0' }}>Licencia Expirada</h1>
          <p style={{ color: '#a1a5b0', marginBottom: '25px' }}>{message}</p>
          <button 
            onClick={() => checkWithServer(hwid)}
            style={{ width: '100%', padding: '12px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer' }}
          >
            Renovar Suscripción
          </button>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div style={{ display: 'flex', height: '100vh', justifyContent: 'center', alignItems: 'center', background: '#0f1115' }}>
        <div style={{ background: '#1a1d24', padding: '40px', borderRadius: '16px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.05)', maxWidth: '500px', width: '100%', boxShadow: '0 20px 40px rgba(0,0,0,0.4)' }}>
          <h1 style={{ color: '#ef4444', margin: '0 0 10px 0' }}>Error de Conexión</h1>
          <p style={{ color: '#a1a5b0', marginBottom: '25px' }}>{message}</p>
          <div style={{ padding: '15px', background: '#0f1115', borderRadius: '8px', fontFamily: 'monospace', fontSize: '12px', color: '#ef4444' }}>
            {hwid}
          </div>
          <button 
            onClick={() => window.location.reload()} 
            style={{ marginTop: '20px', color: '#6366f1', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  // Si está approved, mostramos la app real
  return children;
}
