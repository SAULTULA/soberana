import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

// Conexión a la base de datos EXCLUSIVA de KSMLicencias
const KSM_URL = 'https://jnscgzsmyfaqnlovxhdh.supabase.co';
const KSM_KEY = 'sb_publishable_U6mWpXwGDIwGGGDvO7DoXA_aO1UiSKr';
const ksmSupabase = createClient(KSM_URL, KSM_KEY);

export function LicenseGuard({ children }) {
  const [status, setStatus] = useState('checking'); // checking, pending, approved
  const [hwid, setHwid] = useState('');

  useEffect(() => {
    // Si estamos en web (Vercel), no pedimos HWID, dejamos pasar (o si prefieres bloquear, coméntalo)
    if (!window.electronAPI) {
      setStatus('approved');
      return;
    }

    const checkLicense = async () => {
      try {
        const machineId = await window.electronAPI.getHWID();
        setHwid(machineId);

        // 1. Buscar si el HWID ya está en la tabla de licencias
        const { data, error } = await ksmSupabase
          .from('licencias')
          .select('*')
          .eq('hwid', machineId)
          .single();

        if (error && error.code === 'PGRST116') {
          // No existe: Lo insertamos para disparar el Webhook a Telegram
          await ksmSupabase.from('licencias').insert([{ hwid: machineId, status: 'pendiente' }]);
          setStatus('pending');
          listenForApproval(machineId);
        } else if (data) {
          if (data.status === 'aprobado' || data.status === 'activo' || data.status === 'approved') {
            setStatus('approved');
          } else {
            setStatus('pending');
            listenForApproval(machineId);
          }
        }
      } catch (err) {
        console.error('Error validando licencia:', err);
        setStatus('pending'); // Fallback seguro: bloquear si hay error
      }
    };

    checkLicense();
  }, []);

  const listenForApproval = (machineId) => {
    // Escuchar cambios en tiempo real en la tabla licencias para este HWID
    const channel = ksmSupabase
      .channel('licencias-cambios')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'licencias', filter: `hwid=eq.${machineId}` },
        (payload) => {
          const newStatus = payload.new.status;
          if (newStatus === 'aprobado' || newStatus === 'activo' || newStatus === 'approved') {
            setStatus('approved');
          }
        }
      )
      .subscribe();

    return () => ksmSupabase.removeChannel(channel);
  };

  if (status === 'checking') {
    return (
      <div style={{ display: 'flex', height: '100vh', justifyContent: 'center', alignItems: 'center', background: '#191b20', color: '#00e5ff' }}>
        <h2>Verificando Seguridad...</h2>
      </div>
    );
  }

  if (status === 'pending') {
    return (
      <div style={{ display: 'flex', height: '100vh', justifyContent: 'center', alignItems: 'center', background: '#191b20' }}>
        <div style={{ background: '#22252b', padding: '40px', borderRadius: '12px', textAlign: 'center', border: '1px solid #ef4444', maxWidth: '500px' }}>
          <h2 style={{ color: '#ef4444', marginBottom: '20px' }}>EQUIPO NO AUTORIZADO</h2>
          <p style={{ color: '#94a3b8', marginBottom: '20px' }}>
            Este dispositivo ha sido registrado pero aún no tiene una licencia activa. Se ha enviado una notificación automática a Soporte.
          </p>
          <div style={{ background: '#191b20', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
            <span style={{ color: '#00e5ff', fontSize: '12px' }}>TU CÓDIGO DE HARDWARE (HWID):</span><br/>
            <strong style={{ color: '#fff', fontSize: '18px', letterSpacing: '2px' }}>{hwid}</strong>
          </div>
          <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '25px' }}>
            Por favor, comunícate con el Administrador y envíale este código. Esta pantalla se desbloqueará automáticamente apenas se apruebe.
          </p>
          
          <a 
            href="https://wa.me/1166508379?text=Hola,%20necesito%20autorizar%20mi%20equipo%20en%20Soberana.%20Mi%20HWID%20es:%20" 
            target="_blank" 
            rel="noopener noreferrer"
            style={{
              display: 'inline-block',
              background: '#25D366',
              color: '#ffffff',
              padding: '10px 20px',
              borderRadius: '8px',
              textDecoration: 'none',
              fontWeight: 'bold',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            💬 Contactar a Soporte (WhatsApp)
          </a>
        </div>
      </div>
    );
  }

  // Si está approved, mostramos la app real
  return children;
}
